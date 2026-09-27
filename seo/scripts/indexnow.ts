/**
 * IndexNow ping for the URLs a loop run changed.
 *
 * Who hears it: IndexNow reaches Bing, Yandex and the other protocol partners
 * (Seznam, Naver, Yep), plus whatever retrieves from Bing's index. GOOGLE
 * IGNORES INDEXNOW. This script never contacts Google in any form: no sitemap
 * ping, and no Indexing API, which accepts JobPosting/BroadcastEvent pages only
 * and whose misuse costs API access. The Google lever is "Request indexing" in
 * Search Console, which the weekly digest lists for the founder. No API can do
 * that.
 *
 * Load-bearing constraints:
 *   - Only live-sitemap URLs are ever submitted. The input comes from a run
 *     (paths or full URLs, some of them model-proposed), so each entry is
 *     normalized to https://usetruecap.com<path>, deduped, and intersected
 *     with the live sitemap. Everything else is logged and dropped. Submitting
 *     redirected, noindexed or unchanged URLs is how a host teaches the
 *     engines to ignore its pings.
 *   - The key is the single public/<32-hex>.txt file. IndexNow keys are public
 *     by design (the engines fetch that file to prove host ownership), so it is
 *     not a secret. The file's content must equal its name. The LIVE copy must
 *     answer 200 with that content before anything is POSTed: a key file that
 *     is missing in production turns every submission into a 403 that reads
 *     like a transient failure, for months.
 *   - At most 10,000 URLs per POST (the protocol limit). 200 and 202 are
 *     success. Anything else stops the run and exits 1, so the run shows red.
 *
 * For the loop this replaces the telemetry-diff mode of
 * scripts/seo/indexnow.mjs: a run knows exactly which URLs it changed, so it
 * passes them in (--urls a,b,c or --from-file <json array | newline list>).
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Args } from "./lib/cli.ts";
import { check, flagString, hasFlag, log, runMain } from "./lib/cli.ts";
import { loadConfig } from "./lib/config.ts";
import { REPO_ROOT } from "./lib/paths.ts";
import { fetchSitemap, toPath } from "./lib/sitemap.ts";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
/** Protocol limit per request, not a tunable. */
export const MAX_URLS_PER_BATCH = 10_000;
const KEY_FILE_RE = /^[0-9a-f]{32}\.txt$/;
const KEY_CHECK_TIMEOUT_MS = 20_000;
const SUBMIT_TIMEOUT_MS = 60_000;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export type Normalized = { urls: string[]; notInSitemap: string[]; invalid: string[] };
export type IndexNowPayload = { host: string; key: string; keyLocation: string; urlList: string[] };
export type BatchResult = { size: number; status: number | null; ok: boolean; detail: string };

/**
 * A path ("/blog/x") or an http(s) URL on the site's host (or its www
 * variant) → the site path, with the query, hash and trailing slash dropped.
 * Anything else (other hosts, credentials, protocol-relative, bare words) → null.
 */
function toSitePath(value: string, origin: URL): string | null {
  let parsed: URL;
  try {
    if (value.startsWith("/") && !value.startsWith("//")) parsed = new URL(value, origin);
    else if (/^https?:\/\//i.test(value)) parsed = new URL(value);
    else return null;
  } catch {
    return null;
  }
  if (parsed.username || parsed.password) return null;
  const host = parsed.host.toLowerCase();
  if (host !== origin.host && host !== `www.${origin.host}`) return null;
  return toPath(`${origin.origin}${parsed.pathname}`);
}

/**
 * Normalize, dedupe (first occurrence wins) and intersect with the sitemap.
 * `urls` is what may be submitted; the other two lists exist to be logged.
 */
export function normalizeUrls(input: string[], sitemapPaths: Iterable<string>, base: string = loadConfig().site.base): Normalized {
  const origin = new URL(base);
  const inSitemap = new Set(sitemapPaths);
  const seen = new Set<string>();
  const out: Normalized = { urls: [], notInSitemap: [], invalid: [] };
  for (const raw of input) {
    const value = raw.trim();
    if (!value) continue;
    const sitePath = toSitePath(value, origin);
    if (sitePath === null) {
      out.invalid.push(value);
      continue;
    }
    if (seen.has(sitePath)) continue;
    seen.add(sitePath);
    if (inSitemap.has(sitePath)) out.urls.push(`${origin.origin}${sitePath}`);
    else out.notInSitemap.push(sitePath);
  }
  return out;
}

/** --from-file contents: a JSON array of strings, or one entry per line (# comments allowed). */
export function parseUrlList(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error("--from-file looks like JSON but does not parse");
    }
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
      throw new Error("--from-file JSON must be an array of strings (paths or URLs)");
    }
    return parsed;
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

/** A key file's content matches its key. One trailing newline is tolerated (editors add it). */
export function keyContentMatches(content: string, key: string): boolean {
  return content.replace(/\r?\n$/, "") === key;
}

/** The single public/<32-hex>.txt key file. Zero, several, or a content mismatch → throws. */
export function discoverKey(publicDir: string): { key: string; fileName: string } {
  const names = readdirSync(publicDir).filter((name) => KEY_FILE_RE.test(name)).sort();
  if (names.length === 0) throw new Error("no IndexNow key file in public/: expected exactly one <32 lowercase hex>.txt");
  if (names.length > 1) throw new Error(`${names.length} IndexNow key files in public/ (${names.join(", ")}): expected exactly one`);
  const fileName = names[0];
  const key = fileName.slice(0, -".txt".length);
  if (!keyContentMatches(readFileSync(path.join(publicDir, fileName), "utf8"), key)) {
    throw new Error(`public/${fileName} must contain exactly its own name (${key}); it does not, so IndexNow would answer 403`);
  }
  return { key, fileName };
}

export function keyLocationFor(base: string, key: string): string {
  return `${new URL(base).origin}/${key}.txt`;
}

/** The live key file must answer 200 (no redirect) with exactly the key. Throws otherwise. */
export async function verifyLiveKey(keyLocation: string, key: string, fetchImpl: FetchLike, userAgent: string): Promise<void> {
  let response: Response;
  try {
    response = await fetchImpl(keyLocation, {
      redirect: "manual",
      headers: { "user-agent": userAgent },
      signal: AbortSignal.timeout(KEY_CHECK_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(`could not fetch the live key file ${keyLocation}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (response.status !== 200) {
    throw new Error(`live key file ${keyLocation} answered HTTP ${response.status}, so every submission would 403; deploy public/${key}.txt first`);
  }
  const served = await response.text();
  if (!keyContentMatches(served, key)) {
    throw new Error(`live key file ${keyLocation} serves "${served.slice(0, 40)}", not the key in public/; they must be identical`);
  }
}

export function toBatches<T>(items: T[], size: number = MAX_URLS_PER_BATCH): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error(`batch size must be a positive integer, got ${size}`);
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

export function buildPayloads(base: string, key: string, urls: string[]): IndexNowPayload[] {
  const host = new URL(base).host;
  const keyLocation = keyLocationFor(base, key);
  return toBatches(urls).map((urlList) => ({ host, key, keyLocation, urlList }));
}

/**
 * POST each batch. Stops at the first rejected batch: a 403 or 422 on batch 1
 * will repeat on batch 2, and hammering the endpoint gets the host throttled.
 */
export async function submitBatches(payloads: IndexNowPayload[], fetchImpl: FetchLike, userAgent: string): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  for (const payload of payloads) {
    let status: number | null = null;
    let detail = "";
    try {
      const response = await fetchImpl(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8", "user-agent": userAgent },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
      });
      status = response.status;
      detail = (await response.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 200);
    } catch (error) {
      detail = `network: ${error instanceof Error ? error.message : String(error)}`;
    }
    // 200 = accepted; 202 = accepted, key validation pending. 400/403/422/429 are real failures.
    const ok = status === 200 || status === 202;
    results.push({ size: payload.urlList.length, status, ok, detail });
    if (!ok) break;
  }
  return results;
}

function readInput(args: Args): string[] {
  const inline = flagString(args, "urls");
  const file = flagString(args, "from-file");
  if (inline === null && file === null) throw new Error("pass --urls a,b,c or --from-file <path> (JSON array or one path/URL per line)");
  const entries: string[] = [];
  if (inline !== null) entries.push(...inline.split(","));
  if (file !== null) entries.push(...parseUrlList(readFileSync(path.resolve(file), "utf8")));
  return entries.map((entry) => entry.trim()).filter(Boolean);
}

export async function main(args: Args): Promise<number> {
  const config = loadConfig();
  const dryRun = hasFlag(args, "dry-run");
  const input = readInput(args);

  // Local key check first: a misconfigured repo should fail even on a quiet run.
  const { key, fileName } = discoverKey(path.join(REPO_ROOT, "public"));
  log(`indexnow: key file public/${fileName}`);

  const summary = { dryRun, submitted: 0, urls: [] as string[], notInSitemap: [] as string[], invalid: [] as string[], batches: [] as BatchResult[] };
  if (!input.length) {
    log("indexnow: the input list is empty; nothing to submit");
    console.log(JSON.stringify(summary, null, 2));
    return 0;
  }

  const sitemap = await fetchSitemap(config.site.base);
  const normalized = normalizeUrls(input, sitemap.map((entry) => entry.path), config.site.base);
  for (const value of normalized.invalid) log(`indexnow: dropped, not a path or URL on this site: ${value}`);
  for (const value of normalized.notInSitemap) log(`indexnow: dropped, not in the live sitemap (never submitted): ${value}`);
  Object.assign(summary, { urls: normalized.urls, notInSitemap: normalized.notInSitemap, invalid: normalized.invalid });

  if (!normalized.urls.length) {
    log("indexnow: no input URL is in the live sitemap; nothing to submit");
    console.log(JSON.stringify(summary, null, 2));
    return 0;
  }

  const keyLocation = keyLocationFor(config.site.base, key);
  await verifyLiveKey(keyLocation, key, fetch, config.site.userAgent);
  log(`indexnow: live key file OK at ${keyLocation}`);

  const payloads = buildPayloads(config.site.base, key, normalized.urls);
  log(`indexnow: ${normalized.urls.length} URL(s) in ${payloads.length} batch(es) → ${INDEXNOW_ENDPOINT} (Bing, Yandex and partners; Google ignores IndexNow)`);
  if (dryRun) {
    for (const url of normalized.urls) log(`  ${url}`);
    log("indexnow: --dry-run, nothing was sent");
    console.log(JSON.stringify(summary, null, 2));
    return 0;
  }

  const results = await submitBatches(payloads, fetch, config.site.userAgent);
  summary.batches = results;
  summary.submitted = results.filter((r) => r.ok).reduce((sum, r) => sum + r.size, 0);
  for (const r of results) log(`indexnow: batch of ${r.size} → ${r.status ?? "no response"}${r.detail ? ` ${r.detail}` : ""}`);
  console.log(JSON.stringify(summary, null, 2));

  const allAccepted = results.length === payloads.length && results.every((r) => r.ok);
  if (!allAccepted) log("indexnow: IndexNow rejected a batch; later batches were not sent");
  return allAccepted ? 0 : 1;
}

function selfTest(): void {
  const base = "https://usetruecap.com";
  const sitemap = ["/", "/blog/a", "/markets/x"];
  const n = normalizeUrls(
    ["/blog/a", "https://usetruecap.com/blog/a/", "http://www.usetruecap.com/markets/x?utm=1#top", "/blog/gone", "https://evil.example/blog/a", "blog/a", "https://usetruecap.com"],
    sitemap,
    base,
  );
  check(n.urls.join(" ") === `${base}/blog/a ${base}/markets/x ${base}/`, "normalizes, dedupes, keeps input order of first sight");
  check(n.notInSitemap.join() === "/blog/gone", "non-sitemap paths are held back");
  check(n.invalid.length === 2, "foreign hosts and bare words are invalid");

  check(parseUrlList('["/a","/b"]').length === 2, "JSON array input");
  check(parseUrlList("/a\n# note\n\n/b\n").join() === "/a,/b", "newline input skips comments and blanks");
  check(keyContentMatches("abc\n", "abc") && !keyContentMatches("abc ", "abc"), "key content: one trailing newline only");

  const batches = toBatches(Array.from({ length: 20_001 }, (_, i) => i));
  check(batches.length === 3 && batches[0].length === MAX_URLS_PER_BATCH && batches[2].length === 1, "batches ≤10,000");

  const [payload] = buildPayloads(base, "0".repeat(32), [`${base}/blog/a`]);
  check(payload.host === "usetruecap.com" && payload.keyLocation === `${base}/${"0".repeat(32)}.txt`, "payload host and keyLocation");
  check(new URL(INDEXNOW_ENDPOINT).host === "api.indexnow.org", "the endpoint is IndexNow, never Google");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["dry-run", "from-file", "urls"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
