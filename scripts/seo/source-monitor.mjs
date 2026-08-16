#!/usr/bin/env node
/** Periodically verifies authoritative sources and propagates material-change review flags. */

import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(readFileSync(path.join(ROOT, "config/seo-sources.json"), "utf8"));
const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const has = (name) => args.includes(`--${name}`);
const OUT = path.resolve(ROOT, flag("out", "artifacts/seo/source-health.json"));
const FORCE = has("force");
const now = new Date();
const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalise(body) {
  // Prefer the document's primary content so consent banners, rotating
  // navigation, analytics payloads, and unrelated footers do not create noisy
  // evidence-change alerts. Fall back to the full response for documents that
  // do not expose a <main> landmark (including many PDFs/text responses).
  const primary = body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? body;
  return primary
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const digest = (body) => createHash("sha256").update(normalise(body)).digest("hex");

async function rest(pathname, init = {}) {
  if (!supabaseUrl || !serviceKey) return null;
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase REST ${response.status}: ${(await response.text()).slice(0, 400)}`);
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

async function existingSources() {
  const rows = await rest("seo_sources?select=source_id,fetched_at,content_hash,source_status");
  return new Map((rows ?? []).map((row) => [row.source_id, row]));
}

function isDue(source, prior) {
  if (FORCE || !prior?.fetched_at) return true;
  const fetched = new Date(prior.fetched_at).getTime();
  return !Number.isFinite(fetched) || now.getTime() - fetched >= source.refreshIntervalDays * 86_400_000;
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(source.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "TrueCap-Source-Monitor/1.0 (+https://usetruecap.com/methodology)" },
    });
    const body = await response.text();
    return { ok: response.ok, status: response.status, finalUrl: response.url, hash: response.ok ? digest(body) : null };
  } finally {
    clearTimeout(timeout);
  }
}

async function persistSource(source, prior, check) {
  if (!supabaseUrl || !serviceKey) return;
  const changed = Boolean(prior?.content_hash && check.hash && prior.content_hash !== check.hash);
  const failed = !check.ok;
  const row = {
    source_id: source.id,
    authoritative_url: source.url,
    source_organization: source.organization,
    source_category: source.category,
    fetched_at: now.toISOString(),
    content_hash: check.hash ?? prior?.content_hash ?? null,
    previous_content_hash: changed ? prior.content_hash : null,
    refresh_interval_days: source.refreshIntervalDays,
    authority_level: source.authorityLevel,
    affected_content: source.affectedPaths,
    extracted_facts: source.expectedFacts,
    source_status: failed ? "FAILED" : changed ? "CHANGED" : "HEALTHY",
    last_http_status: check.status ?? null,
    last_error: failed ? `HTTP ${check.status ?? "fetch error"}` : null,
    change_summary: changed
      ? `Normalized source checksum changed on ${now.toISOString()}; affected content requires evidence review.`
      : null,
    updated_at: now.toISOString(),
  };
  await rest("seo_sources?on_conflict=source_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([row]),
  });
  if (changed) {
    for (const page of source.affectedPaths) {
      await rest(`seo_pages?path=eq.${encodeURIComponent(page)}`, {
        method: "PATCH",
        headers: { prefer: "return=minimal" },
        body: JSON.stringify({ status: "STALE_REVIEW_REQUIRED", updated_at: now.toISOString() }),
      });
    }
  }
}

const report = {
  generatedAt: now.toISOString(),
  persisted: Boolean(supabaseUrl && serviceKey),
  checked: [],
  changed: [],
  failed: [],
  skippedNotDue: [],
};

try {
  const existing = await existingSources();
  for (const source of manifest) {
    const prior = existing.get(source.id);
    if (!isDue(source, prior)) {
      report.skippedNotDue.push(source.id);
      continue;
    }
    try {
      const check = await fetchSource(source);
      const changed = Boolean(prior?.content_hash && check.hash && prior.content_hash !== check.hash);
      const item = { id: source.id, status: check.status, ok: check.ok, changed, affectedPaths: source.affectedPaths };
      report.checked.push(item);
      if (changed) report.changed.push(item);
      if (!check.ok) report.failed.push(item);
      await persistSource(source, prior, check);
    } catch (error) {
      const item = { id: source.id, status: null, ok: false, changed: false, error: error.message, affectedPaths: source.affectedPaths };
      report.checked.push(item);
      report.failed.push(item);
      await persistSource(source, prior, { ok: false, status: null, hash: null });
    }
  }
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (report.failed.length && process.env.SEO_HALT_ON_SOURCE_FAILURE !== "false") process.exitCode = 1;
} catch (error) {
  report.fatal = error instanceof Error ? error.message : String(error);
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
