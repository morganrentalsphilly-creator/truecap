/**
 * Bing Webmaster Tools pull: query stats, page stats and inbound-link counts.
 * Writes seo/data/bing-<date>.json = {generatedAt, queries, pages, linkCounts}.
 *
 * DORMANT until the founder adds BING_WEBMASTER_API_KEY. Without it the script
 * logs "dormant: needs BING_WEBMASTER_API_KEY" and exits 0 WITHOUT writing, so
 * a consumer sees "no bing file" and never an empty one that looks like data.
 *
 * Why it exists: Search Console has no backlink API. Bing's GetLinkCounts is
 * the only free, programmatic answer to "which of our pages have inbound
 * links", and seo-prune reads `linkCounts` as KNOWN BACKLINKS (a page that has
 * any is never pruned). That makes a partial pull dangerous: a missing or
 * truncated link map would read as "no backlinks" and let a prune through. So
 * the pull is all or nothing. Any failed call, and a link map with more pages
 * than --max-link-pages (default 50), throws, exits 1 and writes nothing.
 * Paging never trusts a default: when a response omits TotalPages the pull
 * keeps requesting pages until one comes back empty, under the same cap.
 * Even a complete map is a floor, not a census: Bing counts only the links it
 * has crawled.
 *
 * The key travels as the `apikey` query parameter (the JSON API has no header
 * auth). It is registered with io.ts so no artifact can carry it, it is never
 * logged, and it is scrubbed from error text. Only rows on this site's host
 * (www and http variants fold into the apex path) are kept. Positions are
 * passed through as Bing reports them, with -1 ("no data") as null. Do not
 * compare them with GSC positions without checking the scale.
 *
 * BingPull is declared here because lib/types.ts has no Bing artifact yet.
 */

import path from "node:path";
import type { Args } from "./lib/cli.ts";
import { check, flagNumber, log, runMain } from "./lib/cli.ts";
import { loadConfig } from "./lib/config.ts";
import { registerSecret, writeJson } from "./lib/io.ts";
import { datedDataPath } from "./lib/paths.ts";
import { toPath } from "./lib/sitemap.ts";

const BING_API = "https://ssl.bing.com/webmaster/api.svc/json";
const CALL_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_LINK_PAGES = 50;

export type BingStat = {
  /** YYYY-MM-DD in the offset Bing reports (its /Date(ms±hhmm)/ format), or null when unreadable. */
  date: string | null;
  clicks: number;
  impressions: number;
  avgClickPosition: number | null;
  avgImpressionPosition: number | null;
};
export type BingQueryRow = BingStat & { query: string };
export type BingPageRow = BingStat & { path: string };
/** seo/data/bing-<date>.json */
export type BingPull = { generatedAt: string; queries: BingQueryRow[]; pages: BingPageRow[]; linkCounts: Record<string, number> };

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null && !Array.isArray(value);
const count = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0);
const position = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null);

/** WCF JSON wraps every answer in {"d": …}; accept both shapes. */
function unwrap(json: unknown): unknown {
  return isRecord(json) && "d" in json ? json.d : json;
}

/**
 * Bing's "/Date(1316156400000-0700)/" → "2011-09-16". The number is UTC epoch
 * milliseconds; the offset says which calendar day Bing meant, so apply it.
 * Plain ISO dates pass through. Anything else → null.
 */
export function parseBingDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = /^\/Date\((-?\d+)([+-])?(\d{2})?(\d{2})?\)\/$/.exec(value.trim());
  if (m) {
    const offsetMinutes = m[2] ? (m[2] === "-" ? -1 : 1) * (Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0)) : 0;
    const date = new Date(Number(m[1]) + offsetMinutes * 60_000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

/** A URL on this site's host (apex or www, http or https) → its path; anything else → null. */
export function sitePathOf(url: unknown, base: string): string | null {
  if (typeof url !== "string") return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  const host = new URL(base).host;
  if (!/^https?:$/.test(parsed.protocol)) return null;
  if (parsed.host !== host && parsed.host !== `www.${host}`) return null;
  return toPath(`https://${host}${parsed.pathname}`);
}

function statOf(row: JsonRecord): BingStat {
  return {
    date: parseBingDate(row.Date),
    clicks: count(row.Clicks),
    impressions: count(row.Impressions),
    avgClickPosition: position(row.AvgClickPosition),
    avgImpressionPosition: position(row.AvgImpressionPosition),
  };
}

function rowsOf(json: unknown): JsonRecord[] {
  const body = unwrap(json);
  return Array.isArray(body) ? body.filter(isRecord) : [];
}

/** GetQueryStats → one row per (query, date). */
export function parseQueryStats(json: unknown): BingQueryRow[] {
  return rowsOf(json)
    .filter((row) => typeof row.Query === "string" && row.Query.trim())
    .map((row) => ({ query: String(row.Query).trim(), ...statOf(row) }));
}

/** GetPageStats (its `Query` field holds the page URL) → one row per (path, date) on this site. */
export function parsePageStats(json: unknown, base: string = loadConfig().site.base): { rows: BingPageRow[]; foreign: number } {
  const rows: BingPageRow[] = [];
  let foreign = 0;
  for (const row of rowsOf(json)) {
    const sitePath = sitePathOf(row.Query, base);
    if (sitePath === null) foreign += 1;
    else rows.push({ path: sitePath, ...statOf(row) });
  }
  return { rows, foreign };
}

/** The link rows of one GetLinkCounts response ({d:{Links}}, {Links} or a bare array); [] when unreadable. */
function linksOf(response: unknown): unknown[] {
  const body = unwrap(response);
  return isRecord(body) && Array.isArray(body.Links) ? body.Links : Array.isArray(body) ? body : [];
}

/**
 * GetLinkCounts response(s) → {path: inbound link count} for this site only.
 * Accepts one response or the array of every page's response. Counts for URL
 * variants of the same path (http/https, www, trailing slash) are summed:
 * each is a distinct set of links. Keys are sorted for stable diffs.
 */
export function parseLinkCounts(json: unknown, base: string = loadConfig().site.base): Record<string, number> {
  const responses = Array.isArray(json) ? json : [json];
  const totals = new Map<string, number>();
  for (const response of responses) {
    for (const link of linksOf(response)) {
      if (!isRecord(link)) continue;
      const sitePath = sitePathOf(link.Url, base);
      const n = count(link.Count);
      if (sitePath === null || n === 0) continue;
      totals.set(sitePath, (totals.get(sitePath) ?? 0) + Math.round(n));
    }
  }
  return Object.fromEntries([...totals.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** GetLinkCounts' TotalPages, or null when the response does not say. */
export function linkCountTotalPages(json: unknown): number | null {
  const body = unwrap(json);
  const total = isRecord(body) ? body.TotalPages : null;
  return typeof total === "number" && Number.isInteger(total) && total >= 0 ? total : null;
}

export function redact(text: string, secret: string): string {
  return secret ? text.split(secret).join("[redacted]") : text;
}

/** Bing's error body is {"ErrorCode": n, "Message": "…"}; fall back to the raw text. */
function bingError(text: string): string {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (isRecord(parsed) && (parsed.Message || parsed.ErrorCode !== undefined)) return `ErrorCode ${String(parsed.ErrorCode ?? "?")}: ${String(parsed.Message ?? "")}`;
  } catch {
    /* not JSON: use the text */
  }
  return text.replace(/\s+/g, " ").trim();
}

export type PullOptions = { base: string; userAgent: string; maxLinkPages: number };

/**
 * The three API calls, all or nothing. Every failure throws with the key
 * scrubbed, so the caller writes no file. GetLinkCounts pages are 0-based.
 */
export async function pullBing(key: string, fetchImpl: FetchLike, options: PullOptions): Promise<BingPull> {
  const siteUrl = `${new URL(options.base).origin}/`;

  const call = async (method: string, extra: Record<string, string> = {}): Promise<unknown> => {
    const params = new URLSearchParams({ siteUrl, ...extra, apikey: key });
    let response: Response;
    try {
      response = await fetchImpl(`${BING_API}/${method}?${params.toString()}`, {
        headers: { accept: "application/json", "user-agent": options.userAgent },
        signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
      });
    } catch (error) {
      throw new Error(`${method} failed: ${redact(error instanceof Error ? error.message : String(error), key).slice(0, 200)}`);
    }
    const text = await response.text().catch(() => "");
    if (!response.ok) throw new Error(`${method} failed: HTTP ${response.status}: ${redact(bingError(text), key).slice(0, 200)}`);
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error(`${method} returned a body that is not JSON`);
    }
  };

  const queries = parseQueryStats(await call("GetQueryStats"));
  const pageStats = parsePageStats(await call("GetPageStats"), options.base);
  if (pageStats.foreign) log(`bing-pull: dropped ${pageStats.foreign} page-stat row(s) for other hosts`);

  // Stop at the reported TotalPages or at the first empty page. A response
  // without TotalPages must not end the loop, or the map would be cut short.
  const linkResponses: unknown[] = [];
  for (let page = 0; ; page += 1) {
    if (page >= options.maxLinkPages) {
      throw new Error(
        `GetLinkCounts did not report TotalPages and still returned links on page ${page - 1}, the last allowed by --max-link-pages ${options.maxLinkPages}; refusing to write a partial backlink map`,
      );
    }
    const json = await call("GetLinkCounts", { page: String(page) });
    linkResponses.push(json);
    const totalPages = linkCountTotalPages(json);
    if (totalPages !== null && totalPages > options.maxLinkPages) {
      throw new Error(`GetLinkCounts reports ${totalPages} pages, more than --max-link-pages ${options.maxLinkPages}; refusing to write a partial backlink map`);
    }
    if (linksOf(json).length === 0) break;
    if (totalPages !== null && page + 1 >= totalPages) break;
  }

  return { generatedAt: new Date().toISOString(), queries, pages: pageStats.rows, linkCounts: parseLinkCounts(linkResponses, options.base) };
}

export async function main(args: Args): Promise<number> {
  const key = process.env.BING_WEBMASTER_API_KEY?.trim();
  if (!key) {
    log("dormant: needs BING_WEBMASTER_API_KEY");
    return 0;
  }
  registerSecret(key);

  const config = loadConfig();
  const maxLinkPages = flagNumber(args, "max-link-pages", DEFAULT_MAX_LINK_PAGES);
  if (!Number.isInteger(maxLinkPages) || maxLinkPages < 1) throw new Error("--max-link-pages must be a positive integer");

  const pull = await pullBing(key, fetch, { base: config.site.base, userAgent: config.site.userAgent, maxLinkPages });
  const file = datedDataPath("bing");
  writeJson(file, pull);
  const linked = Object.keys(pull.linkCounts).length;
  log(`bing-pull: ${pull.queries.length} query rows, ${pull.pages.length} page rows, ${linked} page(s) with known inbound links; wrote ${path.basename(file)}`);
  return 0;
}

async function selfTest(): Promise<void> {
  const base = "https://usetruecap.com";
  check(parseBingDate("/Date(1316156400000-0700)/") === "2011-09-16", "WCF date with a negative offset");
  check(parseBingDate("/Date(1316102400000+0800)/") === "2011-09-16", "WCF date with a positive offset");
  check(parseBingDate("garbage") === null, "unreadable date → null");

  const links = parseLinkCounts(
    [
      { d: { Links: [{ Url: "https://usetruecap.com/blog/a", Count: 3 }, { Url: "http://www.usetruecap.com/blog/a/", Count: 2 }, { Url: "https://other.example/x", Count: 9 }], TotalPages: 2 } },
      { d: { Links: [{ Url: "https://usetruecap.com/", Count: 1 }, { Url: "https://usetruecap.com/zero", Count: 0 }], TotalPages: 2 } },
    ],
    base,
  );
  check(JSON.stringify(links) === JSON.stringify({ "/": 1, "/blog/a": 5 }), "link counts: variants summed, other hosts and zeros dropped, keys sorted");
  check(linkCountTotalPages({ d: { Links: [], TotalPages: 4 } }) === 4, "TotalPages read through the d wrapper");

  const q = parseQueryStats({ d: [{ Query: "dscr calculator", Clicks: 1, Impressions: 20, AvgClickPosition: -1, AvgImpressionPosition: 12, Date: "/Date(1316156400000-0700)/" }] });
  check(q.length === 1 && q[0].avgClickPosition === null && q[0].avgImpressionPosition === 12 && q[0].date === "2011-09-16", "query stats parse; -1 position → null");

  const p = parsePageStats({ d: [{ Query: "https://usetruecap.com/markets/x", Impressions: 5 }, { Query: "https://elsewhere.example/", Impressions: 5 }] }, base);
  check(p.rows.length === 1 && p.rows[0].path === "/markets/x" && p.foreign === 1, "page stats keep this host only");
  check(!redact(`apikey=${"k".repeat(32)}`, "k".repeat(32)).includes("k".repeat(32)), "the key is scrubbed");

  // No TotalPages anywhere: pages 0 and 1 carry links, page 2 is empty. An in-memory stub, no network.
  const requested: string[] = [];
  const stub: FetchLike = async (url) => {
    const u = new URL(url);
    const page = Number(u.searchParams.get("page") ?? "0");
    if (u.pathname.endsWith("/GetLinkCounts")) requested.push(String(page));
    const body = u.pathname.endsWith("/GetLinkCounts") ? { d: { Links: page < 2 ? [{ Url: `${base}/p${page}`, Count: 1 }] : [] } } : { d: [] };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const pulled = await pullBing("k".repeat(32), stub, { base, userAgent: "self-test", maxLinkPages: 50 });
  check(requested.join(",") === "0,1,2" && JSON.stringify(pulled.linkCounts) === JSON.stringify({ "/p0": 1, "/p1": 1 }), "missing TotalPages pages on until an empty page");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["max-link-pages"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
