#!/usr/bin/env node
/**
 * Link + image checker for the audit crawl.
 *
 *   node audit/check-links.mjs artifacts/audit/<run>/<role> [--base http://127.0.0.1:3100]
 *
 * Reads pages.jsonl, dedupes every internal link, external link and image
 * source, fetches each once and writes links.json next to it. Internal links
 * are fetched against --base (following redirects, recording the chain);
 * external links are fetched with a browser-like UA and a timeout, and hosts
 * that answer 403/429/999 to bots are recorded as "unverifiable" rather than
 * broken. Images record status, content-type and byte size.
 */
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node audit/check-links.mjs <artifacts dir> [--base url]");
  process.exit(2);
}
const baseArgIndex = process.argv.indexOf("--base");
const BASE = (baseArgIndex > 0 ? process.argv[baseArgIndex + 1] : "http://127.0.0.1:3100").replace(/\/$/, "");
const SITE_ORIGINS = new Set([BASE, "https://usetruecap.com", "https://www.usetruecap.com"]);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 TrueCapAudit/1.0";

const pages = fs
  .readFileSync(path.join(dir, "pages.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const internal = new Map(); // url -> Set(sources)
const external = new Map();
const images = new Map();
const add = (map, key, source) => {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(source);
};

for (const p of pages) {
  const source = `${p.path}@${p.width}`;
  for (const l of p.links ?? []) {
    let u;
    try {
      u = new URL(l.href);
    } catch {
      continue;
    }
    if (["mailto:", "tel:", "javascript:", "sms:"].includes(u.protocol)) continue;
    u.hash = "";
    if (SITE_ORIGINS.has(u.origin)) {
      add(internal, u.pathname + u.search, source);
    } else {
      add(external, u.toString(), source);
    }
  }
  for (const img of p.images ?? []) {
    if (!img.src) continue;
    try {
      const u = new URL(img.src);
      if (u.protocol === "data:") continue;
      add(images, SITE_ORIGINS.has(u.origin) ? u.pathname + u.search : u.toString(), source);
    } catch {
      /* ignore */
    }
  }
}

async function fetchWithTimeout(url, opts = {}, ms = 20_000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctl.signal, headers: { "user-agent": UA, accept: "*/*", ...(opts.headers ?? {}) } });
  } finally {
    clearTimeout(t);
  }
}

async function checkInternal(pathname) {
  const chain = [];
  let url = BASE + pathname;
  for (let hop = 0; hop < 6; hop += 1) {
    let res;
    try {
      res = await fetchWithTimeout(url, { redirect: "manual" });
    } catch (e) {
      return { path: pathname, status: null, error: String(e), chain };
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      const loc = new URL(res.headers.get("location"), url).toString();
      chain.push({ url: url.replace(BASE, ""), status: res.status, to: loc.replace(BASE, "") });
      url = loc;
      if (!url.startsWith(BASE)) return { path: pathname, status: res.status, chain, external: url };
      continue;
    }
    return { path: pathname, status: res.status, finalPath: url.replace(BASE, ""), chain, contentType: res.headers.get("content-type") };
  }
  return { path: pathname, status: null, error: "too many redirects", chain };
}

async function checkExternal(url) {
  try {
    let res = await fetchWithTimeout(url, { method: "HEAD", redirect: "follow" }, 15_000);
    if (res.status === 405 || res.status === 404 || res.status >= 500) {
      res = await fetchWithTimeout(url, { method: "GET", redirect: "follow" }, 20_000);
    }
    const unverifiable = [401, 403, 429, 999].includes(res.status);
    return { url, status: res.status, unverifiable, finalUrl: res.url };
  } catch (e) {
    return { url, status: null, error: String(e).slice(0, 200) };
  }
}

async function checkImage(key) {
  const url = key.startsWith("/") ? BASE + key : key;
  try {
    const res = await fetchWithTimeout(url, { redirect: "follow" }, 20_000);
    const buf = await res.arrayBuffer();
    return { key, status: res.status, bytes: buf.byteLength, contentType: res.headers.get("content-type") };
  } catch (e) {
    return { key, status: null, error: String(e).slice(0, 200) };
  }
}

async function pool(items, worker, size) {
  const results = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await worker(items[idx]);
      }
    }),
  );
  return results;
}

const internalKeys = [...internal.keys()].sort();
const externalKeys = [...external.keys()].sort();
const imageKeys = [...images.keys()].sort();
console.log(`internal ${internalKeys.length} · external ${externalKeys.length} · images ${imageKeys.length}`);

const internalResults = await pool(internalKeys, checkInternal, 8);
const externalResults = await pool(externalKeys, checkExternal, 4);
const imageResults = await pool(imageKeys, checkImage, 8);

const report = {
  base: BASE,
  checkedAt: new Date().toISOString(),
  internal: internalResults.map((r) => ({ ...r, sources: [...internal.get(r.path)].slice(0, 5), sourceCount: internal.get(r.path).size })),
  external: externalResults.map((r) => ({ ...r, sources: [...external.get(r.url)].slice(0, 5), sourceCount: external.get(r.url).size })),
  images: imageResults.map((r) => ({ ...r, sources: [...images.get(r.key)].slice(0, 5), sourceCount: images.get(r.key).size })),
};
fs.writeFileSync(path.join(dir, "links.json"), JSON.stringify(report, null, 2));

const brokenInternal = report.internal.filter((r) => r.status === null || r.status >= 400);
const brokenExternal = report.external.filter((r) => r.status === null || (r.status >= 400 && !r.unverifiable));
const unverifiable = report.external.filter((r) => r.unverifiable);
const brokenImages = report.images.filter((r) => r.status === null || r.status >= 400);
const bigImages = report.images.filter((r) => (r.bytes ?? 0) > 300 * 1024);
console.log(`broken internal: ${brokenInternal.length}`);
for (const r of brokenInternal) console.log(`  ${r.status ?? "ERR"} ${r.path}  ← ${r.sources[0]} (+${r.sourceCount - 1})`);
console.log(`broken external: ${brokenExternal.length} (unverifiable bot-blocked: ${unverifiable.length})`);
for (const r of brokenExternal) console.log(`  ${r.status ?? "ERR"} ${r.url}  ← ${r.sources[0]}`);
console.log(`broken images: ${brokenImages.length}; images > 300 KB: ${bigImages.length}`);
for (const r of bigImages) console.log(`  ${Math.round(r.bytes / 1024)} KB ${r.key}`);
