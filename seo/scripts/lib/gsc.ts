/**
 * Google Search Console client for the SEO loop.
 *
 * Reuses the dependency-free, unit-tested auth and inspection code in
 * scripts/seo/gsc-scoreboard.mjs (RS256 JWT signed with node:crypto, the
 * Restricted-permission tripwire, the 600/min inspection rate limiter) rather
 * than building a third JWT path. Adds what the scoreboard lacks:
 * multi-dimension Search Analytics (page+query, date+page) and sitemaps.list.
 *
 * Credentials: GSC_SERVICE_ACCOUNT_JSON (the CI secret) or
 * GSC_SERVICE_ACCOUNT_FILE (a path, for local runs; `~` is expanded). The key
 * and the access token are registered with io.ts so no artifact can carry them.
 */

import { readFileSync } from "node:fs";
import os from "node:os";
import {
  getAccessToken,
  inspectUrl as scoreboardInspectUrl,
  isIndexed as scoreboardIsIndexed,
  loadServiceAccount,
} from "../../../scripts/seo/gsc-scoreboard.mjs";
import { addDays, today } from "./paths.ts";
import { registerSecret } from "./io.ts";

const SEARCH_ANALYTICS_URL = (site: string): string =>
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
const SITEMAPS_URL = (site: string): string =>
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps`;
const ROW_LIMIT = 25_000;

/** GSC finalises Search Analytics on a ~3-day lag; windows end 3 days ago. */
export const DATA_LAG_DAYS = 3;

export type GscSession = { token: string; clientEmail: string };

export function readServiceAccountRaw(): string {
  const inline = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (inline && inline.trim()) return inline;
  const file = process.env.GSC_SERVICE_ACCOUNT_FILE;
  if (file && file.trim()) {
    const expanded = file.startsWith("~/") ? `${os.homedir()}${file.slice(1)}` : file;
    return readFileSync(expanded, "utf8");
  }
  throw new Error(
    "no GSC credentials: set GSC_SERVICE_ACCOUNT_JSON (CI secret) or GSC_SERVICE_ACCOUNT_FILE " +
      "(local path, e.g. ~/.config/truecap/gsc-service-account.json)",
  );
}

export async function gscSession(): Promise<GscSession> {
  const raw = readServiceAccountRaw();
  const account = loadServiceAccount(raw) as { client_email: string; private_key: string };
  registerSecret(account.private_key);
  const token = (await getAccessToken(account)) as string;
  registerSecret(token);
  return { token, clientEmail: account.client_email };
}

export type DateWindow = { startDate: string; endDate: string };

/**
 * A `days`-long window ending DATA_LAG_DAYS before `anchor`, shifted back by
 * `offsetDays`. window(28) = current 28 days; window(28, 28) = the 28 before.
 */
export function gscWindow(days: number, offsetDays = 0, anchor: string = today()): DateWindow {
  const endDate = addDays(anchor, -(DATA_LAG_DAYS + offsetDays));
  const startDate = addDays(endDate, -(days - 1));
  return { startDate, endDate };
}

export type AnalyticsRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type AnalyticsRequest = DateWindow & {
  dimensions: Array<"page" | "query" | "date" | "device" | "country">;
  dimensionFilterGroups?: unknown[];
};

type GoogleJson = { rows?: Array<Partial<AnalyticsRow>>; error?: string | { message?: string } } | null;

async function postJson(url: string, token: string, body: unknown): Promise<{ status: number; json: GoogleJson; text: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json: GoogleJson = null;
  try {
    json = text ? (JSON.parse(text) as GoogleJson) : null;
  } catch {
    /* keep text for the message */
  }
  return { status: response.status, json, text };
}

function errorMessage(result: { status: number; json: GoogleJson; text: string }): string {
  const err = result.json?.error;
  if (typeof err === "string") return err;
  if (err?.message) return String(err.message);
  return `HTTP ${result.status}: ${result.text.slice(0, 200)}`;
}

/** Paged searchAnalytics/query. Stops on a short page, as the API signals. */
export async function searchAnalytics(session: GscSession, site: string, request: AnalyticsRequest): Promise<AnalyticsRow[]> {
  const rows: AnalyticsRow[] = [];
  for (let startRow = 0; ; startRow += ROW_LIMIT) {
    const result = await postJson(SEARCH_ANALYTICS_URL(site), session.token, {
      ...request,
      type: "web",
      dataState: "final",
      rowLimit: ROW_LIMIT,
      startRow,
    });
    if (result.status !== 200) throw new Error(`searchAnalytics ${request.dimensions.join("+") || "totals"} failed: ${errorMessage(result)}`);
    const page = result.json?.rows ?? [];
    for (const r of page) {
      rows.push({
        keys: r.keys ?? [],
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      });
    }
    if (page.length < ROW_LIMIT) break;
  }
  return rows;
}

export type IndexStatusResult = {
  verdict?: string;
  coverageState?: string;
  robotsTxtState?: string;
  indexingState?: string;
  pageFetchState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
  crawledAs?: string;
  sitemap?: string[];
  referringUrls?: string[];
};

export type InspectOutcome =
  | { ok: true; indexStatus: IndexStatusResult | null }
  | { ok: false; quotaExhausted?: boolean; message: string };

/** One URL Inspection call through the scoreboard's rate limiter + tripwire. */
export async function inspect(session: GscSession, site: string, url: string): Promise<InspectOutcome> {
  return (await scoreboardInspectUrl(url, site, session.token)) as InspectOutcome;
}

export function isIndexed(indexStatus: IndexStatusResult | null | undefined): boolean {
  return Boolean(scoreboardIsIndexed(indexStatus ?? null));
}

export type SitemapEntry = {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  warnings?: string;
  errors?: string;
  contents?: Array<{ type?: string; submitted?: string; indexed?: string }>;
};

/** sitemaps.list — is the sitemap submitted, and when did Google last read it? */
export async function listSitemaps(session: GscSession, site: string): Promise<SitemapEntry[]> {
  const response = await fetch(SITEMAPS_URL(site), { headers: { authorization: `Bearer ${session.token}` } });
  const text = await response.text();
  if (!response.ok) throw new Error(`sitemaps.list failed: HTTP ${response.status}: ${text.slice(0, 200)}`);
  const json = text ? JSON.parse(text) : {};
  return (json.sitemap ?? []) as SitemapEntry[];
}
