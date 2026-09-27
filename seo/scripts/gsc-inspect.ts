/**
 * gsc-inspect — URL Inspection for every sitemap URL, cached as run state.
 *
 * Writes seo/data/index-status.json (`IndexStatus` in lib/types.ts): per URL,
 * whether Google has it indexed, why not, the canonical Google chose, the last
 * crawl, a capped snapshot history and a derived `indexClass`; plus the
 * sitemaps.list report and a summary. The file is RUN STATE: it lives on the
 * seo-state branch and is overlaid into place before each run, so the cache and
 * the daily quota counter survive between runs.
 *
 * Load-bearing constraints:
 *   - Quota. URL Inspection allows 2,000 calls a day per property. This script
 *     stops at `--max` (default 1,500) per UTC day, counted in `quota` across
 *     same-day re-runs, which leaves 500 for the legacy scoreboard's Monday
 *     sweep until that workflow is retired. A 429 after retries is a
 *     reportable state (the rest are recorded as skipped), not a crash.
 *   - Cache. A URL is re-inspected only when it was never inspected, its
 *     sitemap lastmod is newer than the last inspection, its rendered-main hash
 *     (from the latest crawl) differs from the hash at that inspection, or the
 *     inspection is more than 14 days old — in that priority order when the
 *     quota is short, oldest first within each group.
 *   - A 403 is never a data point. `inspect()` (lib/gsc.ts → the scoreboard)
 *     hard-stops on it: a Restricted-permission service account would
 *     otherwise read as "0% indexed", which is also what a real deindexing
 *     looks like.
 *   - Nothing is lost. A failed inspection keeps the previous snapshot; URLs
 *     that leave the sitemap stay in the cache with `removedFromSitemap`
 *     (local extension); fields crawl.ts merges in (wordCount, uniqueRatio,
 *     thin, mainHash) are carried through untouched. `mainHashAtInspect` is
 *     owned here.
 *   - `--seed-from-telemetry` replays the legacy scoreboard's weekly snapshots
 *     from the `origin/seo/telemetry` branch into the history (zero quota),
 *     reading them with `git` via execFileSync, never a shell string.
 *
 * Flags: --dry-run (list what would be inspected; no API calls, no writes),
 * --max N, --seed-from-telemetry, --no-inspect (seed and sitemap bookkeeping
 * only; no API calls), --site <property>.
 */

import { execFileSync } from "node:child_process";
import { isCrawledNotIndexed } from "../../scripts/seo/gsc-scoreboard.mjs";
import { check, flagNumber, flagString, hasFlag, log, runMain } from "./lib/cli.ts";
import type { Args } from "./lib/cli.ts";
import { loadConfig } from "./lib/config.ts";
import { familyOf } from "./lib/family.ts";
import { gscSession, inspect, isIndexed, listSitemaps } from "./lib/gsc.ts";
import type { IndexStatusResult, InspectOutcome, SitemapEntry } from "./lib/gsc.ts";
import { readJsonIfExists, writeJson } from "./lib/io.ts";
import { daysBetween, latestDataFile, REPO_ROOT, repoRelative, statePaths, today } from "./lib/paths.ts";
import { fetchSitemap, toPath } from "./lib/sitemap.ts";
import type { SitemapUrl } from "./lib/sitemap.ts";
import type { Crawl, IndexClass, IndexStatus, IndexStatusUrl, InspectionSnapshot } from "./lib/types.ts";

/** The brief: re-inspect anything last inspected more than 14 days ago. */
export const REINSPECT_AFTER_DAYS = 14;
/** Snapshots kept per URL (half a year of weekly runs). */
export const HISTORY_CAP = 26;
/** Default daily cap; leaves 500 of Google's 2,000 for the legacy scoreboard sweep. */
export const DEFAULT_DAILY_MAX = 1500;
/** Google's URL Inspection quota per property per day. `--max` may not exceed it. */
export const GOOGLE_DAILY_QUOTA = 2000;
/** Parallel inspections; the scoreboard's global limiter keeps the rate under 600/min regardless. */
const CONCURRENCY = 5;
const TELEMETRY_REF = "origin/seo/telemetry";
const TELEMETRY_DIR = "docs/seo/telemetry/";
const MAX_RECORDED_ERRORS = 50;

// ------------------------------------------------------------------ types

/** IndexStatusUrl plus the local extension fields this script and crawl.ts keep. */
export type IndexStatusEntry = IndexStatusUrl & {
  /** Date the URL left the live sitemap; null while it is listed. */
  removedFromSitemap?: string | null;
  /** Written by crawl.ts: the rendered-main hash at the latest crawl. */
  mainHash?: string | null;
};

export type InspectReason = "never" | "lastmod" | "content" | "stale";
export type PlannedInspection = { url: string; path: string; reason: InspectReason; inspectedAt: string };
export type SkipWhy = "daily-cap" | "quota-exhausted" | "no-inspect";

/** What this run did (local extension of IndexStatus; report.ts may read it). */
export type InspectRun = {
  date: string;
  mode: "inspect" | "no-inspect";
  due: number;
  planned: number;
  inspected: number;
  errors: Array<{ path: string; message: string }>;
  quotaExhausted: boolean;
  skipped: Array<{ path: string; reason: InspectReason; why: SkipWhy }>;
  seededSnapshots: number;
  sitemapReportError: string | null;
};

export type IndexStatusFile = Omit<IndexStatus, "urls"> & { urls: Record<string, IndexStatusEntry>; run?: InspectRun };

type ClassifyInput = Pick<
  InspectionSnapshot,
  "inspectedAt" | "indexed" | "lastCrawlTime" | "coverageState" | "indexingState" | "googleCanonical" | "userCanonical"
> & { everIndexed: boolean };

// ------------------------------------------------------------ re-inspection

const RANK: Record<InspectReason, number> = { never: 0, lastmod: 1, content: 1, stale: 2 };

function parsedTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/**
 * Why `entry` must be inspected again, or null when its cached result stands.
 *   never   — not in the cache, or never successfully inspected
 *   lastmod — the sitemap lastmod is newer than the last inspection
 *   content — the crawl's current main-text hash differs from the hash at that inspection
 *   stale   — last inspected more than REINSPECT_AFTER_DAYS ago
 * A null `currentMainHash` or `mainHashAtInspect` means "unknown", never "changed".
 */
export function needsInspection(
  entry: Pick<IndexStatusUrl, "inspectedAt" | "mainHashAtInspect"> | null | undefined,
  sitemapLastmod: string | null,
  currentMainHash: string | null,
  todayDate: string,
): InspectReason | null {
  const inspectedAt = parsedTime(entry?.inspectedAt);
  if (!entry || inspectedAt === null) return "never";
  const lastmod = parsedTime(sitemapLastmod);
  if (lastmod !== null && lastmod > inspectedAt) return "lastmod";
  if (currentMainHash && entry.mainHashAtInspect && currentMainHash !== entry.mainHashAtInspect) return "content";
  if (daysBetween(entry.inspectedAt, todayDate) > REINSPECT_AFTER_DAYS) return "stale";
  return null;
}

/** Due URLs in priority order: never inspected → changed → oldest; oldest inspection first within a group. */
export function prioritize(due: PlannedInspection[]): PlannedInspection[] {
  return [...due].sort(
    (a, b) =>
      RANK[a.reason] - RANK[b.reason] ||
      (parsedTime(a.inspectedAt) ?? 0) - (parsedTime(b.inspectedAt) ?? 0) ||
      a.path.localeCompare(b.path),
  );
}

/** The day's quota counter, reset on a new UTC day, and what is left under `max`. */
export function quotaFor(
  previous: { day: string; used: number } | null | undefined,
  todayDate: string,
  max: number,
): { quota: { day: string; used: number }; budget: number } {
  const used = previous && previous.day === todayDate && Number.isFinite(previous.used) ? Math.max(0, previous.used) : 0;
  return { quota: { day: todayDate, used }, budget: Math.max(0, max - used) };
}

/** Split the sitemap into what this run inspects (within `budget`) and what it defers. */
export function planInspections(
  sitemap: SitemapUrl[],
  entries: Record<string, IndexStatusEntry>,
  currentHash: (entry: IndexStatusEntry | null, path: string) => string | null,
  todayDate: string,
  budget: number,
): { due: PlannedInspection[]; selected: PlannedInspection[]; deferred: PlannedInspection[] } {
  const due: PlannedInspection[] = [];
  const seen = new Set<string>();
  for (const item of sitemap) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    const entry = entries[item.url] ?? null;
    const reason = needsInspection(entry, item.lastmod, currentHash(entry, item.path), todayDate);
    if (reason) due.push({ url: item.url, path: item.path, reason, inspectedAt: entry?.inspectedAt ?? "" });
  }
  const ordered = prioritize(due);
  const take = Math.max(0, Math.floor(budget));
  return { due: ordered, selected: ordered.slice(0, take), deferred: ordered.slice(take) };
}

// ---------------------------------------------------------- classification

const EXCLUDED_COVERAGE = /noindex|redirect|canonical|duplicate|alternate page/i;
const BLOCKING_INDEXING_STATES = new Set(["BLOCKED_BY_META_TAG", "BLOCKED_BY_HTTP_HEADER"]);

function canonicalKey(url: string): string {
  try {
    return `${new URL(url).origin}${toPath(url)}`;
  } catch {
    return url;
  }
}

/** Google is honouring a directive to keep the URL out: noindex, a redirect, or another canonical. */
export function isExcludedState(snapshot: Pick<InspectionSnapshot, "coverageState" | "indexingState" | "googleCanonical" | "userCanonical">): boolean {
  if (snapshot.coverageState && EXCLUDED_COVERAGE.test(snapshot.coverageState)) return true;
  if (snapshot.indexingState && BLOCKING_INDEXING_STATES.has(snapshot.indexingState)) return true;
  if (snapshot.googleCanonical && snapshot.userCanonical && canonicalKey(snapshot.googleCanonical) !== canonicalKey(snapshot.userCanonical)) {
    return true;
  }
  return false;
}

/**
 * indexClass. The first match wins:
 *   indexed → excluded → dropped_after_indexed → never_crawled → crawled_not_indexed → unknown.
 * The spec lists the classes without a precedence, and this order is load-bearing:
 *   - excluded comes straight after indexed. A noindex, a redirect or another
 *     canonical is Google honouring a directive, and requesting indexing cannot
 *     change it. score.ts sends dropped_after_indexed to requestIndexing with
 *     "no edit", so a once-indexed page that Google has since folded into
 *     another canonical must not land there.
 *   - dropped_after_indexed comes before never_crawled. A URL whose history
 *     shows it indexed was crawled, so "never crawled" would be false even when
 *     Google's latest answer carries no crawl time.
 *   - What is left for crawled_not_indexed is crawled and never indexed, as the
 *     spec defines it.
 * A URL with no successful inspection (or a result with no indexStatus) is unknown.
 */
export function classify(entry: ClassifyInput): IndexClass {
  if (parsedTime(entry.inspectedAt) === null || entry.indexed === null) return "unknown";
  if (entry.indexed) return "indexed";
  if (isExcludedState(entry)) return "excluded";
  if (entry.everIndexed) return "dropped_after_indexed";
  if (!entry.lastCrawlTime) return "never_crawled";
  if (isCrawledNotIndexed(entry.coverageState)) return "crawled_not_indexed";
  return "unknown";
}

// --------------------------------------------------------------- snapshots

export function snapshotFromResult(
  result: IndexStatusResult | null,
  inspectedAt: string,
  source: InspectionSnapshot["source"] = "api",
): InspectionSnapshot {
  return {
    inspectedAt,
    source,
    verdict: result?.verdict ?? null,
    coverageState: result?.coverageState ?? null,
    indexingState: result?.indexingState ?? null,
    robotsTxtState: result?.robotsTxtState ?? null,
    pageFetchState: result?.pageFetchState ?? null,
    lastCrawlTime: result?.lastCrawlTime ?? null,
    googleCanonical: result?.googleCanonical ?? null,
    userCanonical: result?.userCanonical ?? null,
    indexed: result ? isIndexed(result) : null,
  };
}

const snapshotFields = (s: InspectionSnapshot): InspectionSnapshot => ({
  inspectedAt: s.inspectedAt,
  source: s.source,
  verdict: s.verdict,
  coverageState: s.coverageState,
  indexingState: s.indexingState,
  robotsTxtState: s.robotsTxtState,
  pageFetchState: s.pageFetchState,
  lastCrawlTime: s.lastCrawlTime,
  googleCanonical: s.googleCanonical,
  userCanonical: s.userCanonical,
  indexed: s.indexed,
});

/**
 * A cache entry for a sitemap URL that has never been inspected. The snapshot
 * fields are empty (`inspectedAt: ""`, `indexed: null`) and it classifies as
 * unknown until an inspection or a telemetry seed lands.
 */
export function blankEntry(url: string): IndexStatusEntry {
  const path = toPath(url);
  return {
    ...snapshotFields({
      inspectedAt: "",
      source: "api",
      verdict: null,
      coverageState: null,
      indexingState: null,
      robotsTxtState: null,
      pageFetchState: null,
      lastCrawlTime: null,
      googleCanonical: null,
      userCanonical: null,
      indexed: null,
    }),
    url,
    path,
    family: familyOf(path),
    sitemap: [],
    referringUrls: [],
    firstSeenInSitemap: null,
    everIndexed: false,
    indexClass: "unknown",
    mainHashAtInspect: null,
    wordCount: null,
    uniqueRatio: null,
    thin: null,
    history: [],
    removedFromSitemap: null,
  };
}

/** Insert in time order; the same (inspectedAt, source) replaces rather than duplicates; keep the newest HISTORY_CAP. */
export function insertSnapshot(history: InspectionSnapshot[], snapshot: InspectionSnapshot): InspectionSnapshot[] {
  const next = history.filter((s) => !(s.inspectedAt === snapshot.inspectedAt && s.source === snapshot.source));
  next.push(snapshotFields(snapshot));
  next.sort((a, b) => (parsedTime(a.inspectedAt) ?? 0) - (parsedTime(b.inspectedAt) ?? 0) || a.source.localeCompare(b.source));
  return next.slice(-HISTORY_CAP);
}

export type SnapshotExtras = { sitemap: string[]; referringUrls: string[]; mainHashAtInspect: string | null };

/**
 * Fold one snapshot into an entry. The newest snapshot in history becomes the
 * entry's top-level state (an older telemetry seed never overwrites a newer
 * API result). `extras` come only with an API inspection.
 */
export function mergeSnapshot(
  entry: IndexStatusEntry | null,
  url: string,
  snapshot: InspectionSnapshot,
  extras?: SnapshotExtras,
): IndexStatusEntry {
  const base = entry ?? blankEntry(url);
  const history = insertSnapshot(base.history ?? [], snapshot);
  const latest = history[history.length - 1];
  const next: IndexStatusEntry = {
    ...base,
    ...snapshotFields(latest),
    sitemap: extras ? extras.sitemap : base.sitemap,
    referringUrls: extras ? extras.referringUrls : base.referringUrls,
    mainHashAtInspect: extras ? extras.mainHashAtInspect : base.mainHashAtInspect,
    everIndexed: Boolean(base.everIndexed) || history.some((s) => s.indexed === true),
    history,
  };
  next.indexClass = classify(next);
  return next;
}

/** Apply one API outcome. A failed call leaves the entry unchanged (the caller records the error). */
export function applyInspection(
  entry: IndexStatusEntry | null,
  url: string,
  outcome: InspectOutcome,
  inspectedAt: string,
  mainHashAtInspect: string | null,
): IndexStatusEntry | null {
  if (!outcome.ok) return entry;
  const result = outcome.indexStatus;
  return mergeSnapshot(entry, url, snapshotFromResult(result, inspectedAt, "api"), {
    sitemap: [...(result?.sitemap ?? [])],
    referringUrls: [...(result?.referringUrls ?? [])],
    mainHashAtInspect,
  });
}

// ------------------------------------------------------- telemetry seeding

export type TelemetryUrl = {
  url?: string;
  inspected?: boolean;
  indexed?: boolean | null;
  verdict?: string | null;
  coverageState?: string | null;
  robotsTxtState?: string | null;
  indexingState?: string | null;
  pageFetchState?: string | null;
  lastCrawlTime?: string | null;
  googleCanonical?: string | null;
  userCanonical?: string | null;
};
export type TelemetryFile = { generatedAt?: string; inspection?: { urls?: TelemetryUrl[] } };

/** Dated snapshot names from `git ls-tree --name-only` output (latest.json and README are not snapshots). */
export function telemetryFileNames(listing: string): string[] {
  const names = new Set<string>();
  for (const line of listing.split("\n")) {
    const name = line.trim().split("/").pop() ?? "";
    if (/^\d{4}-\d{2}-\d{2}\.json$/.test(name)) names.add(name);
  }
  return [...names].sort();
}

/**
 * One scoreboard snapshot → the URLs it listed (all were in the sitemap that
 * day) and a seed snapshot for each URL it actually inspected.
 */
export function snapshotsFromTelemetry(file: TelemetryFile): {
  date: string;
  listed: string[];
  snapshots: Array<{ url: string; snapshot: InspectionSnapshot }>;
} | null {
  const generatedAt = file.generatedAt;
  if (!generatedAt || parsedTime(generatedAt) === null) return null;
  const listed: string[] = [];
  const snapshots: Array<{ url: string; snapshot: InspectionSnapshot }> = [];
  for (const row of file.inspection?.urls ?? []) {
    if (!row?.url) continue;
    listed.push(row.url);
    const hasResult = row.inspected !== false && Boolean(row.verdict || row.coverageState);
    if (!hasResult) continue;
    snapshots.push({
      url: row.url,
      snapshot: {
        inspectedAt: generatedAt,
        source: "telemetry-seed",
        verdict: row.verdict ?? null,
        coverageState: row.coverageState ?? null,
        indexingState: row.indexingState ?? null,
        robotsTxtState: row.robotsTxtState ?? null,
        pageFetchState: row.pageFetchState ?? null,
        lastCrawlTime: row.lastCrawlTime ?? null,
        googleCanonical: row.googleCanonical ?? null,
        userCanonical: row.userCanonical ?? null,
        indexed: typeof row.indexed === "boolean" ? row.indexed : row.verdict === "PASS",
      },
    });
  }
  return { date: generatedAt.slice(0, 10), listed, snapshots };
}

/** Existing cache key for `url` (matched by path, so a trailing-slash change does not fork an entry). */
function keyFor(entries: Record<string, IndexStatusEntry>, pathIndex: Map<string, string>, url: string): string {
  if (entries[url]) return url;
  return pathIndex.get(toPath(url)) ?? url;
}

function earliest(a: string | null, b: string): string {
  return a && a <= b ? a : b;
}

/** Replay telemetry snapshots into the cache. Idempotent: re-seeding the same files adds nothing. */
export function mergeTelemetry(
  entries: Record<string, IndexStatusEntry>,
  files: TelemetryFile[],
): { entries: Record<string, IndexStatusEntry>; snapshots: number; files: number } {
  const out: Record<string, IndexStatusEntry> = { ...entries };
  const pathIndex = new Map(Object.values(out).map((e) => [e.path, e.url]));
  const parsed = files
    .map(snapshotsFromTelemetry)
    .filter((f): f is NonNullable<ReturnType<typeof snapshotsFromTelemetry>> => f !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  let snapshots = 0;
  const lastListed = new Map<string, string>();
  for (const file of parsed) {
    for (const url of file.listed) {
      const key = keyFor(out, pathIndex, url);
      const entry = out[key] ?? blankEntry(key);
      out[key] = { ...entry, firstSeenInSitemap: earliest(entry.firstSeenInSitemap, file.date) };
      pathIndex.set(out[key].path, key);
      lastListed.set(key, file.date);
    }
    for (const { url, snapshot } of file.snapshots) {
      const key = keyFor(out, pathIndex, url);
      out[key] = mergeSnapshot(out[key] ?? null, key, snapshot);
      snapshots += 1;
    }
  }
  // A URL the history stops listing left the sitemap on the first snapshot
  // that no longer lists it. Recording that date (not the date this seed ran)
  // is what keeps week-over-week indexed counts comparing like with like.
  const dates = parsed.map((f) => f.date);
  for (const [key, last] of lastListed) {
    const removal = dates.find((d) => d > last);
    if (removal && out[key] && !out[key].removedFromSitemap) out[key] = { ...out[key], removedFromSitemap: removal };
  }
  return { entries: out, snapshots, files: parsed.length };
}

/** Read the dated scoreboard snapshots from the telemetry branch (local git only; no fetch). */
export function readTelemetryFromGit(): TelemetryFile[] {
  let listing: string;
  try {
    listing = execFileSync("git", ["ls-tree", "--name-only", TELEMETRY_REF, TELEMETRY_DIR], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`cannot list ${TELEMETRY_REF}:${TELEMETRY_DIR} — fetch it first: git fetch origin seo/telemetry`);
  }
  const names = telemetryFileNames(listing);
  if (!names.length) throw new Error(`${TELEMETRY_REF}:${TELEMETRY_DIR} has no dated snapshots`);
  return names.map((name) => {
    const text = execFileSync("git", ["show", `${TELEMETRY_REF}:${TELEMETRY_DIR}${name}`], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    try {
      return JSON.parse(text) as TelemetryFile;
    } catch {
      throw new Error(`${TELEMETRY_REF}:${TELEMETRY_DIR}${name} is not valid JSON`);
    }
  });
}

// ------------------------------------------------------ sitemap bookkeeping

/**
 * Make the cache agree with the live sitemap: every listed URL has an entry
 * (with `firstSeenInSitemap` set the first time it is seen), a URL that
 * returns is un-removed, and cached URLs no longer listed get
 * `removedFromSitemap` (first day noticed) but are kept with their history.
 * An entry whose URL spelling changed but whose path did not is re-keyed.
 */
export function reconcileSitemap(
  entries: Record<string, IndexStatusEntry>,
  sitemap: SitemapUrl[],
  todayDate: string,
): Record<string, IndexStatusEntry> {
  const out: Record<string, IndexStatusEntry> = { ...entries };
  const listed = new Set(sitemap.map((s) => s.url));
  for (const item of sitemap) {
    if (!out[item.url]) {
      const oldKey = Object.keys(out).find((k) => out[k].path === item.path && !listed.has(k));
      if (oldKey) {
        out[item.url] = { ...out[oldKey], url: item.url };
        delete out[oldKey];
      }
    }
    const entry = out[item.url] ?? blankEntry(item.url);
    const path = toPath(item.url);
    out[item.url] = {
      ...entry,
      path,
      family: familyOf(path),
      firstSeenInSitemap: entry.firstSeenInSitemap ?? todayDate,
      removedFromSitemap: null,
    };
  }
  for (const [key, entry] of Object.entries(out)) {
    if (!listed.has(key)) out[key] = { ...entry, removedFromSitemap: entry.removedFromSitemap ?? todayDate };
  }
  return out;
}

// ----------------------------------------------------------------- summary

const ALL_CLASSES: IndexClass[] = ["indexed", "never_crawled", "crawled_not_indexed", "dropped_after_indexed", "excluded", "unknown"];

/** Totals over the URLs currently in the sitemap (removed URLs are history, not inventory). */
export function summarize(entries: Record<string, IndexStatusEntry>, sitemapUrls: Iterable<string>): IndexStatus["summary"] {
  const byClass = Object.fromEntries(ALL_CLASSES.map((c) => [c, 0])) as Record<IndexClass, number>;
  const byFamily: Record<string, { total: number; indexed: number }> = {};
  let total = 0;
  let indexed = 0;
  for (const url of new Set(sitemapUrls)) {
    const entry = entries[url];
    if (!entry) continue;
    total += 1;
    const isIn = entry.indexClass === "indexed";
    if (isIn) indexed += 1;
    byClass[entry.indexClass] += 1;
    const family = (byFamily[entry.family] ??= { total: 0, indexed: 0 });
    family.total += 1;
    if (isIn) family.indexed += 1;
  }
  return { total, indexed, byClass, byFamily };
}

function sumContents(entry: SitemapEntry, key: "submitted" | "indexed"): number | null {
  const values = (entry.contents ?? [])
    .map((c) => c[key])
    .filter((v): v is string => v !== undefined && v !== null && String(v).trim() !== "")
    .map(Number)
    .filter(Number.isFinite);
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}

/** sitemaps.list → the IndexStatus report rows. */
export function toSitemapReport(entries: SitemapEntry[]): IndexStatus["sitemapReport"] {
  return entries.map((e) => ({
    path: e.path,
    lastSubmitted: e.lastSubmitted ?? null,
    lastDownloaded: e.lastDownloaded ?? null,
    isPending: typeof e.isPending === "boolean" ? e.isPending : null,
    submitted: sumContents(e, "submitted"),
    indexed: sumContents(e, "indexed"),
  }));
}

/** Current main-text hash per path from a crawl file. */
export function crawlHashes(crawl: Pick<Crawl, "pages"> | null): Map<string, string> {
  const out = new Map<string, string>();
  for (const page of crawl?.pages ?? []) if (page?.path && page.mainHash) out.set(page.path, page.mainHash);
  return out;
}

function sortedByPath(entries: Record<string, IndexStatusEntry>): Record<string, IndexStatusEntry> {
  const keys = Object.keys(entries).sort((a, b) => entries[a].path.localeCompare(entries[b].path) || a.localeCompare(b));
  return Object.fromEntries(keys.map((k) => [k, entries[k]]));
}

// ---------------------------------------------------------------- the run

export type InspectOptions = {
  site: string;
  todayDate: string;
  max: number;
  dryRun: boolean;
  noInspect: boolean;
  seed: boolean;
};

export type GscClient = {
  inspect: (url: string) => Promise<InspectOutcome>;
  listSitemaps: () => Promise<SitemapEntry[]>;
};

/** Everything that touches the network or git, injectable so the tests run offline. */
export type InspectDeps = {
  fetchSitemap: () => Promise<SitemapUrl[]>;
  readTelemetry: () => TelemetryFile[];
  connect: () => Promise<GscClient>;
  now: () => string;
};

export type DryRunPlan = {
  dryRun: true;
  site: string;
  today: string;
  sitemapUrls: number;
  quota: { day: string; used: number };
  budget: number;
  seededSnapshots: number;
  wouldInspect: Array<{ path: string; reason: InspectReason }>;
  deferred: Array<{ path: string; reason: InspectReason }>;
};

export type InspectResult = { status: IndexStatusFile | null; plan: DryRunPlan | null; exitCode: number };

function emptyStatus(site: string, todayDate: string): IndexStatusFile {
  return {
    generatedAt: "",
    site,
    sitemapReport: [],
    quota: { day: todayDate, used: 0 },
    summary: summarize({}, []),
    urls: {},
  };
}

/**
 * The whole run against injected I/O. Reads the cache (statePaths.indexStatus)
 * and the latest crawl from disk; writes the cache back unless --dry-run.
 */
export async function runInspection(options: InspectOptions, deps: InspectDeps): Promise<InspectResult> {
  const { todayDate } = options;
  const sitemap = await deps.fetchSitemap();
  const cache = readJsonIfExists<IndexStatusFile>(statePaths.indexStatus()) ?? emptyStatus(options.site, todayDate);
  const hashes = crawlHashes(readJsonIfExists<Crawl>(latestDataFile("crawl", todayDate)));
  const currentHash = (entry: IndexStatusEntry | null, path: string): string | null => hashes.get(path) ?? entry?.mainHash ?? null;

  let entries: Record<string, IndexStatusEntry> = { ...(cache.urls ?? {}) };
  let seededSnapshots = 0;
  if (options.seed) {
    const seeded = mergeTelemetry(entries, deps.readTelemetry());
    entries = seeded.entries;
    seededSnapshots = seeded.snapshots;
    log(`gsc-inspect: seeded ${seeded.snapshots} snapshot(s) from ${seeded.files} telemetry file(s)`);
  }
  entries = reconcileSitemap(entries, sitemap, todayDate);

  const { quota, budget } = quotaFor(cache.quota, todayDate, options.max);
  const plan = planInspections(sitemap, entries, currentHash, todayDate, options.noInspect ? 0 : budget);
  log(
    `gsc-inspect: ${sitemap.length} sitemap URLs, ${plan.due.length} due, ` +
      `quota ${quota.used}/${options.max} used today, inspecting ${options.noInspect ? 0 : plan.selected.length}`,
  );

  if (options.dryRun) {
    const brief = (p: PlannedInspection) => ({ path: p.path, reason: p.reason });
    return {
      status: null,
      exitCode: 0,
      plan: {
        dryRun: true,
        site: options.site,
        today: todayDate,
        sitemapUrls: sitemap.length,
        quota,
        budget,
        seededSnapshots,
        wouldInspect: plan.selected.map(brief),
        deferred: plan.deferred.map(brief),
      },
    };
  }

  const run: InspectRun = {
    date: todayDate,
    mode: options.noInspect ? "no-inspect" : "inspect",
    due: plan.due.length,
    planned: plan.selected.length,
    inspected: 0,
    errors: [],
    quotaExhausted: false,
    skipped: plan.deferred.map((p) => ({ path: p.path, reason: p.reason, why: (options.noInspect ? "no-inspect" : "daily-cap") as SkipWhy })),
    seededSnapshots,
    sitemapReportError: null,
  };
  let sitemapReport = cache.sitemapReport ?? [];

  if (!options.noInspect) {
    const client = await deps.connect();
    const attempted = new Set<string>();
    let cursor = 0;
    let errorCount = 0;
    const worker = async (): Promise<void> => {
      while (!run.quotaExhausted && cursor < plan.selected.length) {
        const item = plan.selected[cursor];
        cursor += 1;
        let outcome: InspectOutcome;
        try {
          outcome = await client.inspect(item.url);
        } catch (error) {
          outcome = { ok: false, message: error instanceof Error ? error.message : String(error) };
        }
        if (!outcome.ok && outcome.quotaExhausted) {
          run.quotaExhausted = true;
          log(`gsc-inspect: URL Inspection quota exhausted (${outcome.message}); stopping`);
          return;
        }
        attempted.add(item.url);
        quota.used += 1;
        if (outcome.ok) {
          const updated = applyInspection(entries[item.url] ?? null, item.url, outcome, deps.now(), currentHash(entries[item.url] ?? null, item.path));
          if (updated) entries[item.url] = updated;
          run.inspected += 1;
        } else {
          errorCount += 1;
          if (run.errors.length < MAX_RECORDED_ERRORS) run.errors.push({ path: item.path, message: outcome.message.slice(0, 300) });
        }
        const done = run.inspected + errorCount;
        if (done % 50 === 0) log(`gsc-inspect: …${done}/${plan.selected.length}`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, plan.selected.length) }, worker));
    if (run.quotaExhausted) {
      const notReached = plan.selected.filter((p) => !attempted.has(p.url));
      run.skipped = [...notReached.map((p) => ({ path: p.path, reason: p.reason, why: "quota-exhausted" as SkipWhy })), ...run.skipped];
    }
    if (errorCount) log(`gsc-inspect: ${errorCount} inspection(s) failed; their previous state is kept`);

    try {
      sitemapReport = toSitemapReport(await client.listSitemaps());
    } catch (error) {
      run.sitemapReportError = (error instanceof Error ? error.message : String(error)).slice(0, 300);
      log(`gsc-inspect: sitemaps.list failed, keeping the previous report: ${run.sitemapReportError}`);
    }
  }

  // Re-derive every class: classify() may have changed since an entry was written.
  for (const [key, entry] of Object.entries(entries)) entries[key] = { ...entry, indexClass: classify(entry) };

  const status: IndexStatusFile = {
    generatedAt: deps.now(),
    site: options.site,
    sitemapReport,
    quota,
    summary: summarize(entries, sitemap.map((s) => s.url)),
    urls: sortedByPath(entries),
    run,
  };
  writeJson(statePaths.indexStatus(), status);
  log(`gsc-inspect: wrote ${repoRelative(statePaths.indexStatus())} (${status.summary.indexed}/${status.summary.total} indexed)`);

  const totalFailure = !options.noInspect && plan.selected.length > 0 && run.inspected === 0 && run.errors.length > 0;
  return { status, plan: null, exitCode: totalFailure ? 1 : 0 };
}

async function main(args: Args): Promise<number> {
  const config = loadConfig();
  const site = flagString(args, "site", config.site.gscProperty);
  const max = flagNumber(args, "max", DEFAULT_DAILY_MAX);
  if (!Number.isInteger(max) || max < 0 || max > GOOGLE_DAILY_QUOTA) {
    throw new Error(`--max must be an integer from 0 to ${GOOGLE_DAILY_QUOTA}, got ${max}`);
  }
  const result = await runInspection(
    {
      site,
      todayDate: today(),
      max,
      dryRun: hasFlag(args, "dry-run"),
      noInspect: hasFlag(args, "no-inspect"),
      seed: hasFlag(args, "seed-from-telemetry"),
    },
    {
      fetchSitemap: () => fetchSitemap(config.site.base),
      readTelemetry: readTelemetryFromGit,
      connect: async () => {
        const session = await gscSession();
        return { inspect: (url) => inspect(session, site, url), listSitemaps: () => listSitemaps(session, site) };
      },
      now: () => new Date().toISOString(),
    },
  );
  if (result.plan) {
    console.log(JSON.stringify(result.plan, null, 2));
  } else if (result.status) {
    const run = result.status.run;
    console.log(
      JSON.stringify({
        total: result.status.summary.total,
        indexed: result.status.summary.indexed,
        byClass: result.status.summary.byClass,
        inspected: run?.inspected ?? 0,
        errors: run?.errors.length ?? 0,
        skipped: run?.skipped.length ?? 0,
        quotaExhausted: run?.quotaExhausted ?? false,
        quota: result.status.quota,
      }),
    );
  }
  return result.exitCode;
}

// -------------------------------------------------------------- self-test

function selfTest(): void {
  const day = "2026-09-28";
  check(needsInspection(null, null, null, day) === "never", "uncached → never");
  const cached = { inspectedAt: "2026-09-20T10:00:00Z", mainHashAtInspect: "h1" };
  check(needsInspection(cached, null, "h1", day) === null, "fresh, unchanged → skip");
  check(needsInspection(cached, "2026-09-21", "h1", day) === "lastmod", "newer lastmod → lastmod");
  check(needsInspection(cached, "2026-09-20", "h1", day) === null, "same-day date-only lastmod is not newer");
  check(needsInspection(cached, null, "h2", day) === "content", "hash moved → content");
  check(needsInspection({ ...cached, mainHashAtInspect: null }, null, "h2", day) === null, "unknown hash is not a change");
  check(needsInspection({ inspectedAt: "2026-09-14T10:00:00Z", mainHashAtInspect: null }, null, null, day) === null, "exactly 14 days is not stale");
  check(needsInspection({ inspectedAt: "2026-09-13T10:00:00Z", mainHashAtInspect: null }, null, null, day) === "stale", "15 days → stale");

  const at = "2026-09-20T10:00:00Z";
  const base = { inspectedAt: at, googleCanonical: null, userCanonical: null, indexingState: null, everIndexed: false };
  check(classify({ ...base, indexed: true, lastCrawlTime: at, coverageState: "Submitted and indexed" }) === "indexed", "indexed");
  check(classify({ ...base, indexed: false, lastCrawlTime: null, coverageState: "URL is unknown to Google" }) === "never_crawled", "never_crawled");
  check(classify({ ...base, indexed: false, lastCrawlTime: at, coverageState: "Crawled - currently not indexed", everIndexed: true }) === "dropped_after_indexed", "dropped");
  check(classify({ ...base, indexed: false, lastCrawlTime: at, coverageState: "Crawled – currently not indexed" }) === "crawled_not_indexed", "crawled_not_indexed (en dash)");
  check(classify({ ...base, indexed: false, lastCrawlTime: at, coverageState: "Excluded by ‘noindex’ tag" }) === "excluded", "noindex → excluded");
  check(
    classify({ ...base, indexed: false, lastCrawlTime: at, coverageState: "Duplicate, Google chose different canonical than user", everIndexed: true }) === "excluded",
    "once-indexed, now another canonical → excluded, not dropped (requesting indexing cannot help)",
  );
  check(classify({ ...base, indexed: false, lastCrawlTime: null, coverageState: "Excluded by ‘noindex’ tag" }) === "excluded", "noindex with no crawl time → excluded");
  check(
    classify({ ...base, indexed: false, lastCrawlTime: null, coverageState: "URL is unknown to Google", everIndexed: true }) === "dropped_after_indexed",
    "once-indexed with no crawl time → dropped, never 'never crawled'",
  );
  check(classify({ ...base, indexed: false, lastCrawlTime: at, coverageState: "Soft 404" }) === "unknown", "other → unknown");
  check(classify({ ...base, inspectedAt: "", indexed: null, lastCrawlTime: null, coverageState: null }) === "unknown", "never inspected → unknown");

  let entry: IndexStatusEntry | null = null;
  for (let i = 0; i < HISTORY_CAP + 4; i += 1) {
    const when = new Date(Date.UTC(2026, 0, 1 + i * 7)).toISOString();
    entry = mergeSnapshot(entry, "https://example.test/a", snapshotFromResult({ verdict: i === 0 ? "PASS" : "NEUTRAL", lastCrawlTime: when }, when));
  }
  check(entry !== null && entry.history.length === HISTORY_CAP, "history capped");
  check(entry !== null && entry.everIndexed && entry.indexClass === "dropped_after_indexed", "everIndexed survives the cap");

  const { quota, budget } = quotaFor({ day: "2026-09-27", used: 1400 }, day, DEFAULT_DAILY_MAX);
  check(quota.used === 0 && budget === DEFAULT_DAILY_MAX, "quota resets on a new day");
  check(quotaFor({ day, used: 1400 }, day, DEFAULT_DAILY_MAX).budget === 100, "same-day quota carries over");

  const sitemap = [
    { url: "https://example.test/new", path: "/new", lastmod: null },
    { url: "https://example.test/old", path: "/old", lastmod: null },
  ];
  const planned = planInspections(sitemap, { "https://example.test/old": { ...blankEntry("https://example.test/old"), inspectedAt: "2026-08-01T00:00:00Z" } }, () => null, day, 1);
  check(planned.selected.length === 1 && planned.selected[0].path === "/new" && planned.deferred[0].reason === "stale", "never-inspected first");

  check(telemetryFileNames("docs/seo/telemetry/2026-08-17.json\ndocs/seo/telemetry/latest.json\ndocs/seo/telemetry/README.md").join() === "2026-08-17.json", "dated files only");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["dry-run", "max", "no-inspect", "seed-from-telemetry", "site"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
