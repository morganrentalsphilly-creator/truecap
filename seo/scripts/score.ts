/**
 * Opportunity scoring: which sitemap URLs are worth an edit this week, why,
 * and which skill should make it. Writes seo/data/candidates-<date>.json.
 *
 * The brief's formula, per URL:
 *   impressions28d × max(0, expectedCtr(max(1, position − 5)) − actualCtr)
 *     × recency discount (0 inside the page-touch cooldown, else 1)
 *     × index discount (indexed 1.0, dropped 0.6, crawled-not-indexed 0.5,
 *       never crawled 0.2)
 * The unit is "extra clicks per 28 days", so reasons can be compared: LOW_CTR
 * uses the CTR gap at the CURRENT position (a snippet fix does not move rank),
 * DECAYING uses the clicks lost per 28 days, and QUERY_GAP uses the cluster's
 * own impressions. Every other reason carries the page's base opportunity.
 * Routing picks the routable reason with the highest opportunity; ties (the
 * common case while traffic is tiny) fall to REASON_PRIORITY.
 *
 * Load-bearing rules, each deliberate:
 *   - The live sitemap is the URL universe. GSC pages outside it only ever
 *     earn REDIRECTED_WITH_IMPRESSIONS (report-only: a redirect is an owner fix).
 *   - A page in an ACTIVE holdout gets nothing — not a candidate, not a
 *     report-only row, not a request-indexing slot. A control that is treated
 *     (even by a manual "Request indexing") stops being a control.
 *   - isExcludedFromOptimization() paths get no GSC reasons and never become
 *     edit candidates (legal, billing, analyzer and hub pages are owner-only).
 *     Their structural findings are reported, and hubs still lead the
 *     never-crawled request-indexing queue.
 *   - dropped_after_indexed is a veto: "no edit". Those drops are stale crawls
 *     that a fresh crawl restores, so the page goes to requestIndexing and an
 *     edit would only confound the recovery.
 *   - Nothing here can prove a negative from missing data. No weekly rows → no
 *     STRIKING_DISTANCE (persistence unproven). No dateModified → not
 *     prune-eligible. No index-status file → the crawl counts as stalled, so
 *     gap articles stay capped. A crawl record that did not answer 200 (crawl
 *     writes empty links and a null title for those) → no NEEDS_CITATIONS, and
 *     a query whose landing page has no answered record is never a gap.
 *   - A gap cluster whose impressions already land at position ≤ 20 routes
 *     striking-distance even when that page may not be edited: a new article
 *     would compete with it, treating a holdout control by proxy or
 *     cannibalizing an owner-only page. It then stays report-only.
 *   - Candidate.skill is always a real skill, so rows no skill should act on
 *     (only CANNIBALIZATION / REDIRECTED / excluded / excluded-class reasons)
 *     go to `reportOnly`, a local extension of the Candidates type.
 *
 * Network: the live sitemap (unless --sitemap-file) and at most 50 HEAD probes
 * of GSC paths outside the sitemap, against the production host only
 * (--no-probe skips them). Everything else reads files the data job wrote.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isCrawledNotIndexed } from "../../scripts/seo/gsc-scoreboard.mjs";
import type { Args } from "./lib/cli.ts";
import { check, flagString, hasFlag, log, runMain } from "./lib/cli.ts";
import type { SeoConfig } from "./lib/config.ts";
import { loadConfig } from "./lib/config.ts";
import type { Family } from "./lib/family.ts";
import { editableSourceFor, familyOf, isBrandQuery, isExcludedFromOptimization } from "./lib/family.ts";
import { readJsonIfExists, readJsonl, writeJson } from "./lib/io.ts";
import { REPO_ROOT, addDays, datedDataPath, daysBetween, latestDataFile, repoRelative, statePaths, today } from "./lib/paths.ts";
import { fetchSitemap, parseSitemap, toPath } from "./lib/sitemap.ts";
import { binomialCdf, expectedCtr } from "./lib/stats.ts";
import type {
  Candidate,
  Candidates,
  Crawl,
  CrawlPage,
  GapCluster,
  GscPull,
  IndexClass,
  IndexStatus,
  IndexStatusUrl,
  InspectionSnapshot,
  LedgerChange,
  LedgerLine,
  PageQueryMetric,
  Reason,
  Skill,
} from "./lib/types.ts";

// ------------------------------------------------------------- constants
// Values the spec fixes inline (not tunables, so not in seo/config.json).

/** Striking distance aims "about half a page" up. */
const TARGET_POSITION_GAIN = 5;
/** Spec values for the four classes it names; excluded/unknown are local calls. */
export const INDEX_DISCOUNT: Record<IndexClass, number> = {
  indexed: 1,
  dropped_after_indexed: 0.6,
  crawled_not_indexed: 0.5,
  never_crawled: 0.2,
  // Google was told not to index it, or chose another canonical: an edit rarely changes that.
  excluded: 0.2,
  // Inspected but unclassifiable (e.g. soft 404): neither good nor bad news.
  unknown: 0.5,
};
const DECAY_WEEKS = 8;
const CANNIBALIZATION_MIN_IMPRESSIONS = 20;
const GAP_TITLE_COVERAGE = 0.5;
const GAP_CLUSTER_JACCARD = 0.5;
export const REDIRECT_PROBE_CAP = 50;
export const REQUEST_INDEXING_MAX = 45;
const TOP_QUERIES = 5;
const TREND_WEEKS = 8;
const PROBE_TIMEOUT_MS = 15_000;

/** Tie-break when two reasons carry the same opportunity: demand first, then indexation, then structure. */
export const REASON_PRIORITY: Reason[] = [
  "STRIKING_DISTANCE",
  "LOW_CTR",
  "DECAYING",
  "QUERY_GAP",
  "NOT_INDEXED",
  "ORPHAN",
  "THIN",
  "NEEDS_CITATIONS",
  "MARKET_ENRICH",
  "CANNIBALIZATION",
  "REDIRECTED_WITH_IMPRESSIONS",
];

/** Skills score.ts routes to. seo-data-study runs on its own monthly gate, so it is never "dormant" here. */
export const ROUTED_SKILLS: Skill[] = [
  "seo-striking-distance",
  "seo-ctr",
  "seo-refresh",
  "seo-citations",
  "seo-internal-links",
  "seo-market-enrich",
  "seo-prune",
  "seo-gap-article",
];

const MARKET_FACTS_FILE = "content/seo/market-facts.json";

// ------------------------------------------------------------ local types

export type Stats = { clicks: number; impressions: number; ctr: number; position: number | null };

/** One reason as scored internally; Candidate.reasons keeps only {reason, detail}. */
export type Hit = { reason: Reason; detail: string; opportunity: number; skill: Skill | null };

/** Local extension (see header): findings no skill should act on. */
export type ReportOnlyEntry = {
  path: string;
  family: Family;
  reasons: Candidate["reasons"];
  indexClass: IndexClass;
  metrics: Candidate["metrics"];
  why: string;
};
export type ScoreOutput = Candidates & { reportOnly: ReportOnlyEntry[] };

/**
 * TODO(types): CrawlPage carries only the outbound external COUNT. crawl.ts
 * writes `externalHosts` and `fetchError` as local extensions (its
 * CrawlPageRecord); read them when present until lib/types.ts declares them.
 */
export type CrawlPageWithHosts = CrawlPage & { externalHosts?: string[]; fetchError?: string | null; marketData?: "thin" | "enriched" | null };

/**
 * Tag on a MARKET_ENRICH reason whose page crawled as market-data thin
 * (crawl.ts `marketData`, lib/markets/thin.ts): no SAFMR ZIP rows and no
 * market-facts entry. The seo-market-enrich skill takes tagged pages first.
 * A signal only: nothing is noindexed on it.
 */
export const MARKET_DATA_THIN_TAG = "market-data-thin";

/** The fields that say whether a crawl record describes a page that actually answered. */
export type CrawlAnswer = Pick<CrawlPage, "status"> & { fetchError?: string | null };

export type ProbeResult = { status: number | null; location: string | null };

export type ScoreInputs = {
  generatedAt: string;
  today: string;
  gsc: GscPull | null;
  indexStatus: IndexStatus | null;
  crawl: Crawl | null;
  ledger: LedgerLine[];
  sitemapPaths: string[];
  /** HTTP status of GSC paths outside the sitemap (crawl-derived plus probes). */
  redirectStatus: Map<string, ProbeResult>;
  /** Paths that have a market-facts entry; null when the file does not exist yet. */
  marketFacts: Set<string> | null;
  /** Bing "known backlinks" per path; null when bing-pull is dormant. */
  knownBacklinks: Record<string, number> | null;
  /**
   * Editable source files that already fail verify-static's whole-file fence
   * (see `preexistingFenceFailure`). An edit to one would sink the whole run's
   * patch, so their pages are reported, not routed, until an owner PR cleans
   * them up. Optional: absent means "not checked".
   */
  fencedSources?: Set<string>;
};

/**
 * Cheap, dependency-free stand-in for verify-static's whole-file check, run in
 * the data job (which installs no packages). Since F4 verify-static refuses a
 * raw-HTML sink anywhere in a content module: any `dangerouslySetInnerHTML=`
 * and any `<script>` (JSON-LD goes through `<JsonLd data={…} />`), so either
 * one in an editable source means every edit to it would be refused. F4
 * converted the six legacy comparison posts that injected prose that way, and
 * no editable source on disk trips this today
 * (lib/__tests__/seo-loop-score.test.ts checks the corpus against
 * verify-static's real rules); it stays as the guard for the next one.
 */
export function fencedSourcesOnDisk(sitemapPaths: string[]): Set<string> {
  const fenced = new Set<string>();
  for (const p of sitemapPaths) {
    const source = editableSourceFor(p);
    if (!source) continue;
    const file = path.join(REPO_ROOT, source);
    if (existsSync(file) && preexistingFenceFailure(readFileSync(file, "utf8"))) fenced.add(source);
  }
  return fenced;
}

export function preexistingFenceFailure(source: string): boolean {
  return /\bdangerouslySetInnerHTML\s*=|<script\b/.test(source);
}

// --------------------------------------------------------------- helpers

const round = (value: number, places = 4): number => {
  const f = 10 ** places;
  return Math.round(value * f) / f;
};

/** Paths everywhere; ledger/holdout `url` fields may be full URLs. */
export function normalizePath(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return toPath(trimmed);
  if (trimmed.length > 1) return trimmed.replace(/\/+$/, "") || "/";
  return trimmed || "/";
}

/**
 * Did the crawl get a real page back? Non-200 records (3xx, 4xx, 5xx, status 0
 * on a network error) carry placeholder content, not observations.
 */
export function crawlAnswered(page: CrawlAnswer | undefined): boolean {
  return page !== undefined && page.status === 200 && (page.fetchError === undefined || page.fetchError === null);
}

const pct = (share: number): string => `${Math.round(share * 100)}%`;
const fmtPos = (position: number | null): string => (position === null ? "n/a" : position.toFixed(1));
const day = (value: string | null | undefined): string | null => (value ? value.slice(0, 10) : null);

function weekStartOf(value: string): string | null {
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d.toISOString().slice(0, 10);
}

type Acc = { clicks: number; impressions: number; weighted: number; positionSum: number; rows: number };

function accumulate(map: Map<string, Acc>, key: string, row: { clicks: number; impressions: number; position: number }): void {
  const acc = map.get(key) ?? { clicks: 0, impressions: 0, weighted: 0, positionSum: 0, rows: 0 };
  acc.clicks += row.clicks || 0;
  acc.impressions += row.impressions || 0;
  acc.weighted += (row.position || 0) * (row.impressions || 0);
  acc.positionSum += row.position || 0;
  acc.rows += 1;
  map.set(key, acc);
}

function finish(acc: Acc): Stats {
  const position = acc.impressions > 0 ? acc.weighted / acc.impressions : acc.rows ? acc.positionSum / acc.rows : null;
  return {
    clicks: acc.clicks,
    impressions: acc.impressions,
    ctr: acc.impressions > 0 ? acc.clicks / acc.impressions : 0,
    position: position !== null && position > 0 ? position : null,
  };
}

/** Page-level 28-day metrics keyed by path; duplicate rows are summed, position impression-weighted. */
export function aggregatePageMetrics(rows: Array<{ page: string; clicks: number; impressions: number; position: number }>): Map<string, Stats> {
  const acc = new Map<string, Acc>();
  for (const row of rows) accumulate(acc, normalizePath(row.page), row);
  return new Map([...acc].map(([key, value]) => [key, finish(value)]));
}

/** path → weekStart → metric. */
export function weeklyByPage(rows: Array<{ page: string; weekStart: string; clicks: number; impressions: number; position: number }>): Map<string, Map<string, Stats>> {
  const acc = new Map<string, Map<string, Acc>>();
  for (const row of rows) {
    const key = normalizePath(row.page);
    const weeks = acc.get(key) ?? new Map<string, Acc>();
    accumulate(weeks, row.weekStart, row);
    acc.set(key, weeks);
  }
  return new Map([...acc].map(([key, weeks]) => [key, new Map([...weeks].map(([w, a]) => [w, finish(a)]))]));
}

// ------------------------------------------------------------ opportunity

export function targetPosition(position: number): number {
  return Math.max(1, position - TARGET_POSITION_GAIN);
}

/**
 * The brief's opportunity: impressions × the CTR the page would gain at
 * `target` (default: five positions up), times the recency and index discounts.
 */
export function opportunity(input: {
  impressions28d: number;
  actualCtr: number;
  position: number | null;
  recencyDiscount: number;
  indexDiscount: number;
  target?: number;
}): number {
  if (input.position === null || !(input.impressions28d > 0)) return 0;
  const target = input.target ?? targetPosition(input.position);
  const gain = Math.max(0, expectedCtr(target) - input.actualCtr);
  return input.impressions28d * gain * input.recencyDiscount * input.indexDiscount;
}

// ------------------------------------------------------------ GSC reasons

/** Weeks in which the page met the striking-distance bar, scaled to one week (7/28 of the impression bar). */
export function persistence(weeks: Map<string, Stats> | undefined, allWeeks: string[], cfg: SeoConfig): { qualifying: number; of: number } {
  const { minImpressions28d, positionMin, positionMax } = cfg.thresholds.strikingDistance;
  const window = [...new Set(allWeeks)].sort().slice(-cfg.thresholds.persistence.ofLastWeeks);
  const weeklyBar = (minImpressions28d * 7) / 28;
  let qualifying = 0;
  for (const week of window) {
    const m = weeks?.get(week);
    if (m && m.impressions >= weeklyBar && m.position !== null && m.position >= positionMin && m.position <= positionMax) qualifying += 1;
  }
  return { qualifying, of: window.length };
}

export function isStrikingDistance(m: Stats | undefined, persisted: { qualifying: number }, cfg: SeoConfig): boolean {
  const { minImpressions28d, positionMin, positionMax } = cfg.thresholds.strikingDistance;
  if (!m || m.position === null) return false;
  return (
    m.impressions >= minImpressions28d &&
    m.position >= positionMin &&
    m.position <= positionMax &&
    persisted.qualifying >= cfg.thresholds.persistence.minWeeksQualifying
  );
}

/** P(clicks ≤ observed) if the page earned the curve's CTR at its position; null when untestable. */
export function lowCtrPValue(m: Stats | undefined): number | null {
  if (!m || m.position === null || m.impressions <= 0) return null;
  return binomialCdf(Math.round(m.clicks), Math.round(m.impressions), expectedCtr(m.position));
}

export function isLowCtr(m: Stats | undefined, cfg: SeoConfig): boolean {
  const p = lowCtrPValue(m);
  return p !== null && m !== undefined && m.impressions >= cfg.thresholds.lowCtr.minImpressions28d && p < cfg.thresholds.lowCtr.binomialP;
}

export type Decay = { last: number; prior: number; change: number | null };

/** Clicks over the last 8 weeks vs the 8 before; null unless all 16 weeks exist (an unequal split is not a comparison). */
export function decayOf(weeks: Map<string, Stats> | undefined, allWeeks: string[]): Decay | null {
  const sorted = [...new Set(allWeeks)].sort();
  if (sorted.length < DECAY_WEEKS * 2) return null;
  const sum = (list: string[]): number => list.reduce((total, week) => total + (weeks?.get(week)?.clicks ?? 0), 0);
  const last = sum(sorted.slice(-DECAY_WEEKS));
  const prior = sum(sorted.slice(-DECAY_WEEKS * 2, -DECAY_WEEKS));
  return { last, prior, change: prior > 0 ? last / prior - 1 : null };
}

export function isDecaying(decay: Decay | null, cfg: SeoConfig): boolean {
  const { minBaselineClicks8w, clickDropShare } = cfg.thresholds.refresh;
  return decay !== null && decay.change !== null && decay.prior >= minBaselineClicks8w && -decay.change >= clickDropShare;
}

export type SharedQuery = { query: string; pages: Array<{ page: string; impressions: number }> };

/** Non-brand queries where two or more pages each earn ≥20 impressions; keyed by each page involved. */
export function findCannibalization(rows: PageQueryMetric[], minImpressions = CANNIBALIZATION_MIN_IMPRESSIONS): Map<string, SharedQuery[]> {
  const byQuery = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const query = normalizeQuery(row.query);
    if (!query || isBrandQuery(query)) continue;
    const pages = byQuery.get(query) ?? new Map<string, number>();
    const page = normalizePath(row.page);
    pages.set(page, (pages.get(page) ?? 0) + (row.impressions || 0));
    byQuery.set(query, pages);
  }
  const out = new Map<string, SharedQuery[]>();
  for (const [query, pages] of [...byQuery].sort(([a], [b]) => a.localeCompare(b))) {
    const strong = [...pages]
      .filter(([, impressions]) => impressions >= minImpressions)
      .map(([page, impressions]) => ({ page, impressions }))
      .sort((a, b) => b.impressions - a.impressions || a.page.localeCompare(b.page));
    if (strong.length < 2) continue;
    for (const { page } of strong) {
      const list = out.get(page) ?? [];
      list.push({ query, pages: strong });
      out.set(page, list);
    }
  }
  return out;
}

function cannibalizationDetail(page: string, shared: SharedQuery[]): string {
  const ranked = [...shared].sort((a, b) => sumImpr(b) - sumImpr(a) || a.query.localeCompare(b.query));
  const parts = ranked.slice(0, 3).map((s) => {
    const others = s.pages.filter((p) => p.page !== page).map((p) => `${p.page} ${p.impressions}`);
    return `"${s.query}" (also ${others.join(", ")} impr)`;
  });
  const more = ranked.length > 3 ? `; +${ranked.length - 3} more` : "";
  return `${ranked.length} ${ranked.length === 1 ? "query" : "queries"} shared with other pages: ${parts.join("; ")}${more}`;
}

const sumImpr = (s: SharedQuery): number => s.pages.reduce((total, p) => total + p.impressions, 0);

// ------------------------------------------------------ redirects (report-only)

/** Statuses the crawl already knows: sitemap pages it fetched and link targets it checked. */
export function knownStatuses(crawl: Crawl | null): Map<string, ProbeResult> {
  const out = new Map<string, ProbeResult>();
  if (!crawl) return out;
  for (const link of crawl.issues?.brokenInternalLinks ?? []) {
    out.set(normalizePath(link.target), { status: link.status, location: null });
  }
  for (const page of crawl.pages ?? []) {
    const location = page.finalUrl ? toPath(page.finalUrl) : null;
    out.set(normalizePath(page.path), { status: page.status, location: location && location !== page.path ? location : null });
  }
  return out;
}

/** GSC paths with impressions, outside the sitemap, whose status is still unknown — most impressions first, capped. */
export function redirectProbeTargets(pages: Map<string, Stats>, sitemap: Set<string>, known: Map<string, ProbeResult>, cap = REDIRECT_PROBE_CAP): string[] {
  return [...pages]
    .filter(([p, m]) => m.impressions > 0 && !sitemap.has(p) && !known.has(p) && p.startsWith("/"))
    .sort(([a, x], [b, y]) => y.impressions - x.impressions || a.localeCompare(b))
    .slice(0, cap)
    .map(([p]) => p);
}

export type RedirectHit = { path: string; status: number; location: string | null; impressions: number; clicks: number };

export function redirectedWithImpressions(pages: Map<string, Stats>, sitemap: Set<string>, statuses: Map<string, ProbeResult>): RedirectHit[] {
  const out: RedirectHit[] = [];
  for (const [p, m] of pages) {
    if (m.impressions <= 0 || sitemap.has(p)) continue;
    const s = statuses.get(p);
    if (!s || s.status === null || s.status < 300 || s.status > 399) continue;
    out.push({ path: p, status: s.status, location: s.location, impressions: m.impressions, clicks: m.clicks });
  }
  return out.sort((a, b) => b.impressions - a.impressions || a.path.localeCompare(b.path));
}

// ------------------------------------------------------------- query gaps

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "for", "to", "in", "on", "at", "by", "with", "from", "is", "are", "was", "be",
  "how", "what", "why", "when", "where", "which", "who", "do", "does", "can", "should", "my", "your", "you", "it",
  "its", "me", "this", "that", "if", "vs", "about",
]);

function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && /(?:xes|ches|shes|sses)$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !/(?:ss|us|is)$/.test(token)) return token.slice(0, -1);
  return token;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Lowercase words of ≥2 chars, stopwords dropped, plurals folded. */
export function contentTokens(text: string): string[] {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (raw.length < 2 || STOPWORDS.has(raw)) continue;
    out.add(stem(raw));
  }
  return [...out];
}

/** Share of `query` tokens that appear in `target`. */
export function tokenCoverage(query: string[], target: Iterable<string>): number {
  if (!query.length) return 0;
  const have = new Set(target);
  return query.filter((t) => have.has(t)).length / query.length;
}

export function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter += 1;
  const union = setA.size + setB.size - inter;
  return union ? inter / union : 0;
}

export type QueryAgg = {
  query: string;
  impressions: number;
  clicks: number;
  landingPage: string | null;
  pages: Array<{ page: string; impressions: number; clicks: number; position: number | null }>;
};

/** page+query rows → one row per query with its pages; landing page = most impressions. */
export function aggregateQueries(rows: PageQueryMetric[]): QueryAgg[] {
  const byQuery = new Map<string, Map<string, Acc>>();
  for (const row of rows) {
    const query = normalizeQuery(row.query);
    if (!query) continue;
    const pages = byQuery.get(query) ?? new Map<string, Acc>();
    accumulate(pages, normalizePath(row.page), row);
    byQuery.set(query, pages);
  }
  const out: QueryAgg[] = [];
  for (const [query, pageAcc] of byQuery) {
    const pages = [...pageAcc]
      .map(([page, acc]) => {
        const s = finish(acc);
        return { page, impressions: s.impressions, clicks: s.clicks, position: s.position };
      })
      .sort((a, b) => b.impressions - a.impressions || a.page.localeCompare(b.page));
    out.push({
      query,
      impressions: pages.reduce((t, p) => t + p.impressions, 0),
      clicks: pages.reduce((t, p) => t + p.clicks, 0),
      landingPage: pages[0]?.page ?? null,
      pages,
    });
  }
  return out.sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query));
}

export type GapInput = {
  queries: QueryAgg[];
  crawlByPath: Map<string, Pick<CrawlPage, "title" | "h1"> & CrawlAnswer>;
  sitemapPaths: string[];
  /** May the cluster attach to this page as QUERY_GAP (in sitemap, not excluded, not withheld)? Routing ignores it. */
  editable: (path: string) => boolean;
  cfg: SeoConfig;
};

export type GapResult = {
  clusters: GapCluster[];
  considered: number;
  /** Considered queries skipped because the crawl has no answered record of their landing page. */
  unverified: number;
  pageShare: Map<string, { impressions: number; clicks: number; position: number | null; keys: string[] }>;
};

/**
 * Queries with enough demand that neither their landing page's title/H1 nor
 * any sitemap path covers, clustered by shared content tokens. A landing page
 * the crawl did not fetch successfully has an unknown title, so its queries
 * are left out rather than called gaps.
 */
export function findGapClusters(input: GapInput): GapResult {
  const { cfg } = input;
  const minImpressions = cfg.thresholds.gapArticle.minQueryImpressions28d;
  const positionMax = cfg.thresholds.strikingDistance.positionMax;
  const calculator = new RegExp(cfg.gates.calculatorIntentPattern, "i");
  const pathTokens = input.sitemapPaths.map((p) => contentTokens(p.replace(/[/-]+/g, " ")));
  const considered = input.queries.filter((q) => q.impressions >= minImpressions && !isBrandQuery(q.query));
  const gaps: Array<{ agg: QueryAgg; tokens: string[] }> = [];
  let unverified = 0;
  for (const agg of considered) {
    const tokens = contentTokens(agg.query);
    if (!tokens.length) continue;
    const landing = agg.landingPage ? input.crawlByPath.get(agg.landingPage) : undefined;
    if (!landing || !crawlAnswered(landing)) {
      unverified += 1;
      continue;
    }
    const landingTokens = contentTokens(`${landing.title ?? ""} ${(landing.h1 ?? []).join(" ")}`);
    if (tokenCoverage(tokens, landingTokens) >= GAP_TITLE_COVERAGE) continue;
    if (pathTokens.some((pt) => tokenCoverage(tokens, pt) === 1)) continue;
    gaps.push({ agg, tokens });
  }

  // Single-linkage clustering over Jaccard ≥ 0.5 (union-find; input order is deterministic).
  const parent = gaps.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < gaps.length; i += 1) {
    for (let j = i + 1; j < gaps.length; j += 1) {
      if (jaccard(gaps[i].tokens, gaps[j].tokens) >= GAP_CLUSTER_JACCARD) parent[find(j)] = find(i);
    }
  }
  const groups = new Map<number, typeof gaps>();
  gaps.forEach((gap, i) => {
    const root = find(i);
    const members = groups.get(root);
    if (members) members.push(gap);
    else groups.set(root, [gap]);
  });

  const clusters: GapCluster[] = [];
  const pageShare: GapResult["pageShare"] = new Map();
  for (const members of groups.values()) {
    members.sort((a, b) => b.agg.impressions - a.agg.impressions || a.agg.query.localeCompare(b.agg.query));
    const key = members[0].agg.query.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
    const perPage = new Map<string, Acc>();
    for (const m of members) for (const p of m.agg.pages) accumulate(perPage, p.page, { clicks: p.clicks, impressions: p.impressions, position: p.position ?? 0 });
    const nearest = [...perPage].map(([page, acc]) => ({ page, ...finish(acc) })).sort((a, b) => b.impressions - a.impressions || a.page.localeCompare(b.page))[0] ?? null;
    const intent: GapCluster["intent"] = members.some((m) => calculator.test(m.agg.query)) ? "calculator" : "informational";
    let route: GapCluster["route"] = "gap-article";
    if (intent === "calculator") route = "tier2-issue";
    else if (nearest && nearest.position !== null && nearest.position <= positionMax) {
      // Demand already lands on a ranking page: improve it, never add a competitor (see header).
      route = "striking-distance";
      if (input.editable(nearest.page)) {
        const share = pageShare.get(nearest.page) ?? { impressions: 0, clicks: 0, position: null, keys: [] };
        const weighted = (share.position ?? 0) * share.impressions + nearest.position * nearest.impressions;
        share.impressions += nearest.impressions;
        share.clicks += nearest.clicks;
        share.position = share.impressions > 0 ? weighted / share.impressions : nearest.position;
        share.keys.push(key);
        pageShare.set(nearest.page, share);
      }
    }
    clusters.push({
      key,
      queries: members.map((m) => ({ query: m.agg.query, impressions: m.agg.impressions, landingPage: m.agg.landingPage })),
      impressions: members.reduce((t, m) => t + m.agg.impressions, 0),
      intent,
      nearestPage: nearest?.page ?? null,
      route,
    });
  }
  clusters.sort((a, b) => b.impressions - a.impressions || a.key.localeCompare(b.key));
  return { clusters, considered: considered.length, unverified, pageShare };
}

// ----------------------------------------------------------------- ledger

export type MaterializedChange = LedgerChange & { statusDate: string | null };

/** Change records with their status events applied in file order (ref = change id or "pr:N"). */
export function materializeChanges(lines: LedgerLine[]): MaterializedChange[] {
  const changes = new Map<string, MaterializedChange>();
  for (const line of lines) {
    if (line.kind === "change") {
      if (!changes.has(line.id)) changes.set(line.id, { ...(line as LedgerChange), statusDate: null });
      continue;
    }
    if (line.kind !== "status") continue;
    const prRef = /^pr:(\d+)$/.exec(line.ref);
    const targets = prRef ? [...changes.values()].filter((c) => c.pr === Number(prRef[1])) : [changes.get(line.ref)].filter((c): c is MaterializedChange => Boolean(c));
    for (const change of targets) {
      change.status = line.status;
      change.statusDate = line.date;
      if (line.live_at !== undefined) change.live_at = line.live_at;
      if (line.pr !== undefined) change.pr = line.pr;
    }
  }
  return [...changes.values()];
}

/** Paths withheld by a holdout event whose `until` has not passed. */
export function activeHoldouts(lines: LedgerLine[], todayDate: string): Set<string> {
  const out = new Set<string>();
  for (const line of lines) {
    if (line.kind === "holdout" && line.until.slice(0, 10) >= todayDate) for (const url of line.urls) out.add(normalizePath(url));
  }
  return out;
}

/**
 * The last time each page was touched: live_at for live changes, the proposal
 * date while proposed, the revert date for reverted ones. Void changes never shipped.
 */
export function lastTouches(changes: MaterializedChange[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const change of changes) {
    let touched: string | null = null;
    if (change.status === "proposed") touched = day(change.date);
    else if (change.status === "live") touched = day(change.live_at) ?? day(change.date);
    else if (change.status === "reverted") {
      touched = [day(change.statusDate), day(change.live_at), day(change.date)].filter((d): d is string => Boolean(d)).sort().pop() ?? null;
    }
    if (!touched) continue;
    const key = normalizePath(change.url);
    const prev = out.get(key);
    if (!prev || touched > prev) out.set(key, touched);
  }
  return out;
}

/** The date the cooldown ends, or null when the page is free to edit today. */
export function cooldownUntil(lastTouch: string | null | undefined, todayDate: string, cooldownDays: number): string | null {
  if (!lastTouch) return null;
  const until = addDays(lastTouch.slice(0, 10), cooldownDays);
  return todayDate < until ? until : null;
}

// ---------------------------------------------------------- index status

function snapshotOf(entry: IndexStatusUrl): InspectionSnapshot | null {
  if (!entry.inspectedAt) return null;
  return {
    inspectedAt: entry.inspectedAt,
    source: entry.source,
    verdict: entry.verdict,
    coverageState: entry.coverageState,
    indexingState: entry.indexingState,
    robotsTxtState: entry.robotsTxtState,
    pageFetchState: entry.pageFetchState,
    lastCrawlTime: entry.lastCrawlTime,
    googleCanonical: entry.googleCanonical,
    userCanonical: entry.userCanonical,
    indexed: entry.indexed,
  };
}

/** History plus the current snapshot, de-duplicated, oldest first. */
export function snapshotsOf(entry: IndexStatusUrl): InspectionSnapshot[] {
  const seen = new Map<string, InspectionSnapshot>();
  const current = snapshotOf(entry);
  for (const snap of [...(entry.history ?? []), ...(current ? [current] : [])]) {
    if (snap?.inspectedAt) seen.set(`${snap.inspectedAt}|${snap.source}`, snap);
  }
  return [...seen.values()].sort((a, b) => (a.inspectedAt < b.inspectedAt ? -1 : a.inspectedAt > b.inspectedAt ? 1 : 0));
}

export type PruneCheck = { eligible: boolean; failed: string[] };

/**
 * seo-prune eligibility for a crawled-not-indexed page. ALL must hold; the
 * failures are returned so the dormant line can name the closest miss.
 */
export function pruneEligibility(input: {
  entry: IndexStatusUrl;
  page: CrawlPage | undefined;
  impressions28d: number;
  todayDate: string;
  cfg: SeoConfig;
  knownBacklinks: number | null;
}): PruneCheck {
  const { entry, page, cfg } = input;
  const prune = cfg.thresholds.prune;
  const failed: string[] = [];
  const snapshots = snapshotsOf(entry);
  if (entry.indexClass !== "crawled_not_indexed") failed.push(`class is ${entry.indexClass}`);
  if (entry.everIndexed || snapshots.some((s) => s.indexed === true)) failed.push("was indexed in an earlier inspection");
  const state = (entry.coverageState ?? "").trim().toLowerCase();
  const same = state ? snapshots.filter((s) => (s.coverageState ?? "").trim().toLowerCase() === state) : [];
  const span = same.length >= 2 ? daysBetween(same[0].inspectedAt, same[same.length - 1].inspectedAt) : 0;
  if (same.length < prune.minConfirmingInspections || span < prune.minDaysBetweenInspections) {
    failed.push(`same state on ${same.length} inspection(s) over ${span} days (needs ${prune.minConfirmingInspections} over ${prune.minDaysBetweenInspections}+)`);
  }
  const crawled = entry.lastCrawlTime ? Date.parse(entry.lastCrawlTime) : Number.NaN;
  const modified = page?.dateModified ? Date.parse(page.dateModified) : Number.NaN;
  if (Number.isNaN(modified)) failed.push("no dateModified to compare the last crawl with");
  else if (Number.isNaN(crawled) || crawled <= modified) failed.push("last crawl is not after the last change");
  if (input.impressions28d >= prune.maxImpressions28d) failed.push(`${input.impressions28d} impressions (needs < ${prune.maxImpressions28d})`);
  if (!(page?.thin ?? entry.thin ?? false)) failed.push("not thin");
  const inSitemapDays = entry.firstSeenInSitemap ? daysBetween(entry.firstSeenInSitemap, input.todayDate) : null;
  if (inSitemapDays === null || inSitemapDays < prune.minDaysInSitemap) failed.push(`${inSitemapDays ?? "unknown"} days in the sitemap (needs ${prune.minDaysInSitemap})`);
  if (input.knownBacklinks !== null && input.knownBacklinks > 0) failed.push(`${input.knownBacklinks} known backlinks`);
  return { eligible: failed.length === 0, failed };
}

/**
 * Crawled-not-indexed count per week (latest snapshot per URL as of each week,
 * carried forward), for the weeks that have any inspection, oldest first.
 */
export function crawledNotIndexedTrend(entries: IndexStatusUrl[], maxWeeks = TREND_WEEKS): number[] {
  const perUrl = entries.map((entry) => snapshotsOf(entry).map((s) => ({ week: weekStartOf(s.inspectedAt), cni: s.indexed !== true && isCrawledNotIndexed(s.coverageState) })));
  const weeks = [...new Set(perUrl.flatMap((snaps) => snaps.map((s) => s.week)).filter((w): w is string => w !== null))].sort().slice(-maxWeeks);
  return weeks.map((week) =>
    perUrl.reduce((count, snaps) => {
      const asOf = snaps.filter((s) => s.week !== null && s.week <= week).pop();
      return count + (asOf?.cni ? 1 : 0);
    }, 0),
  );
}

export function crawlProfile(indexStatus: IndexStatus | null, sitemap: Set<string>, cfg: SeoConfig): Candidates["profile"] {
  if (!indexStatus) return { crawlStalled: true, unknownUrls: 0, crawledNotIndexedTrend: [] };
  const entries = Object.values(indexStatus.urls ?? {}).filter((e) => !sitemap.size || sitemap.has(normalizePath(e.path)));
  const unknownUrls = entries.filter((e) => e.indexClass === "never_crawled").length;
  const trend = crawledNotIndexedTrend(entries);
  const steps = Math.max(1, cfg.gates.crawlStall.crawledNotIndexedRisingWeeks);
  let rising = trend.length > steps;
  for (let i = trend.length - steps; rising && i < trend.length; i += 1) if (!(trend[i] > trend[i - 1])) rising = false;
  return { crawlStalled: unknownUrls >= cfg.gates.crawlStall.minUnknownUrls || rising, unknownUrls, crawledNotIndexedTrend: trend };
}

// ------------------------------------------------------ structural reasons

/** A blog post without a primary-source link. Only an answered crawl record can show that; a failed fetch shows nothing. */
export function needsCitations(page: CrawlPageWithHosts, primarySourceDomains: string[]): boolean {
  if (page.family !== "blog-post" || !crawlAnswered(page)) return false;
  if (Array.isArray(page.externalHosts)) {
    const primary = page.externalHosts.filter((host) => primarySourceDomains.some((d) => host === d || host.endsWith(`.${d}`)));
    return primary.length < 1;
  }
  return page.outboundExternal === 0;
}

/**
 * Paths with a market-facts entry. The file's shape is owned by F8 and does
 * not exist yet, so accept an array of {path|slug|url} or an object keyed by
 * path or slug (optionally under `markets`); `_`-prefixed keys are metadata.
 */
export function marketFactsPaths(json: unknown): Set<string> {
  const out = new Set<string>();
  const add = (raw: unknown): void => {
    if (typeof raw !== "string" || !raw.trim()) return;
    const value = raw.trim();
    if (/^https?:\/\//i.test(value) || value.startsWith("/")) out.add(normalizePath(value));
    else out.add(`/markets/${value.replace(/^\/+|\/+$/g, "")}`);
  };
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) {
        if (typeof item === "string") add(item);
        else if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          add(record.path ?? record.slug ?? record.url);
        }
      }
      return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.markets && typeof record.markets === "object") return visit(record.markets);
    for (const [key, value] of Object.entries(record)) {
      if (!key.startsWith("_") && value && typeof value === "object") add(key);
    }
  };
  visit(json);
  return out;
}

export function qualitySkill(family: Family): Skill {
  return family === "market-city" || family === "market-strategy" || family === "state" ? "seo-market-enrich" : "seo-citations";
}

/** Pick the routable reason with the highest opportunity; ties go to REASON_PRIORITY. */
export function routeHits(hits: Hit[]): Hit | null {
  const routable = hits.filter((h) => h.skill !== null);
  if (!routable.length) return null;
  return [...routable].sort((a, b) => b.opportunity - a.opportunity || REASON_PRIORITY.indexOf(a.reason) - REASON_PRIORITY.indexOf(b.reason))[0];
}

// ------------------------------------------------------------------ build

type Ctx = {
  cfg: SeoConfig;
  today: string;
  sitemap: Set<string>;
  pages: Map<string, Stats>;
  priorPages: Map<string, Stats>;
  queriesByPage: Map<string, PageQueryMetric[]>;
  weekly: Map<string, Map<string, Stats>>;
  weeks: string[];
  index: Map<string, IndexStatusUrl>;
  crawl: Map<string, CrawlPageWithHosts>;
  hasCrawl: boolean;
  orphans: Set<string> | null;
  cannibal: Map<string, SharedQuery[]>;
  gapShare: GapResult["pageShare"];
  marketFacts: Set<string> | null;
  knownBacklinks: Record<string, number> | null;
  holdouts: Set<string>;
  touches: Map<string, string>;
};

type PageResult = {
  hits: Hit[];
  veto: string | null;
  cooldown: string | null;
  indexClass: IndexClass;
  prune: PruneCheck | null;
};

function evaluatePage(ctx: Ctx, pagePath: string): PageResult {
  const { cfg } = ctx;
  const family = familyOf(pagePath);
  const excluded = isExcludedFromOptimization(pagePath);
  const m = ctx.pages.get(pagePath);
  const entry = ctx.index.get(pagePath);
  const page = ctx.crawl.get(pagePath);
  const indexClass: IndexClass = entry?.indexClass ?? "unknown";
  const cooldown = cooldownUntil(ctx.touches.get(pagePath), ctx.today, cfg.caps.pageTouchCooldownDays);
  const recencyDiscount = cooldown ? 0 : 1;
  const indexDiscount = INDEX_DISCOUNT[indexClass] ?? INDEX_DISCOUNT.unknown;
  const discounts = { recencyDiscount, indexDiscount };
  const base = opportunity({ impressions28d: m?.impressions ?? 0, actualCtr: m?.ctr ?? 0, position: m?.position ?? null, ...discounts });
  const hits: Hit[] = [];
  let veto: string | null = null;
  let prune: PruneCheck | null = null;

  if (!excluded && m) {
    const persisted = persistence(ctx.weekly.get(pagePath), ctx.weeks, cfg);
    if (isStrikingDistance(m, persisted, cfg)) {
      hits.push({
        reason: "STRIKING_DISTANCE",
        detail: `position ${fmtPos(m.position)} with ${m.impressions} impressions in 28 days; qualified ${persisted.qualifying} of the last ${persisted.of} weeks`,
        opportunity: base,
        skill: "seo-striking-distance",
      });
    }
    if (isLowCtr(m, cfg)) {
      const expected = expectedCtr(m.position ?? 0);
      hits.push({
        reason: "LOW_CTR",
        detail: `CTR ${pct(m.ctr)} at position ${fmtPos(m.position)} vs ~${(expected * 100).toFixed(1)}% on the curve (${m.clicks} clicks on ${m.impressions} impressions, p=${(lowCtrPValue(m) ?? 1).toFixed(3)})`,
        opportunity: opportunity({ impressions28d: m.impressions, actualCtr: m.ctr, position: m.position, target: m.position ?? undefined, ...discounts }),
        skill: "seo-ctr",
      });
    }
  }
  if (!excluded) {
    const decay = decayOf(ctx.weekly.get(pagePath), ctx.weeks);
    if (decay && isDecaying(decay, cfg)) {
      hits.push({
        reason: "DECAYING",
        detail: `clicks ${decay.prior} → ${decay.last} over the last 8 weeks vs the prior 8 (${pct(decay.change ?? 0)})`,
        opportunity: ((decay.prior - decay.last) / 2) * recencyDiscount * indexDiscount,
        skill: "seo-refresh",
      });
    }
    const shared = ctx.cannibal.get(pagePath);
    if (shared?.length) hits.push({ reason: "CANNIBALIZATION", detail: cannibalizationDetail(pagePath, shared), opportunity: base, skill: null });
    const gap = ctx.gapShare.get(pagePath);
    if (gap) {
      hits.push({
        reason: "QUERY_GAP",
        detail: `gap cluster${gap.keys.length === 1 ? "" : "s"} ${gap.keys.map((k) => `"${k}"`).join(", ")}: ${gap.impressions} impressions land here at position ${fmtPos(gap.position)} for queries its title/H1 do not cover`,
        opportunity: opportunity({ impressions28d: gap.impressions, actualCtr: gap.impressions ? gap.clicks / gap.impressions : 0, position: gap.position, ...discounts }),
        skill: "seo-striking-distance",
      });
    }
  }

  if (entry && indexClass !== "indexed") {
    let skill: Skill | null = null;
    let routeNote = "";
    if (indexClass === "crawled_not_indexed") {
      prune = pruneEligibility({ entry, page, impressions28d: m?.impressions ?? 0, todayDate: ctx.today, cfg, knownBacklinks: ctx.knownBacklinks ? (ctx.knownBacklinks[pagePath] ?? 0) : null });
      if (prune.eligible) {
        skill = "seo-prune";
        routeNote = "prune-eligible";
      } else {
        const quality = Boolean(page?.thin ?? entry.thin) || (page !== undefined && needsCitations(page, cfg.primarySourceDomains));
        skill = quality ? qualitySkill(family) : "seo-internal-links";
        routeNote = `not prune-eligible (${prune.failed.slice(0, 2).join("; ")})`;
      }
    } else if (indexClass === "never_crawled") {
      skill = "seo-internal-links";
      routeNote = "needs links from recently crawled pages";
    } else if (indexClass === "dropped_after_indexed") {
      veto = "dropped out of the index after being indexed: request indexing, no edit";
      routeNote = "request indexing, no edit";
    } else {
      routeNote = indexClass === "excluded" ? "excluded by Google (noindex, redirect or another canonical)" : "state not classifiable";
    }
    hits.push({
      reason: "NOT_INDEXED",
      detail: `${indexClass} ("${entry.coverageState ?? "no coverage state"}"), last crawl ${day(entry.lastCrawlTime) ?? "never"}; ${routeNote}`,
      opportunity: base,
      skill,
    });
  }

  if (ctx.hasCrawl) {
    const thin = page ? page.thin : entry?.thin === true;
    if (thin) {
      hits.push({
        reason: "THIN",
        detail: `${page?.wordCount ?? entry?.wordCount ?? "?"} words, unique ratio ${page?.uniqueRatio ?? entry?.uniqueRatio ?? "n/a"} (needs ≥${cfg.thresholds.prune.minWords} words and ≥${cfg.thresholds.prune.minUniqueRatio})`,
        opportunity: base,
        skill: qualitySkill(family),
      });
    }
    if (ctx.orphans?.has(pagePath)) {
      hits.push({ reason: "ORPHAN", detail: `no internal inbound link (${page?.inboundTotal ?? 0} total, ${page?.inboundContextual ?? 0} contextual)`, opportunity: base, skill: "seo-internal-links" });
    }
    if (page && needsCitations(page, cfg.primarySourceDomains)) {
      hits.push({ reason: "NEEDS_CITATIONS", detail: `blog post with no outbound link to a primary-source domain (${page.outboundExternal} external links)`, opportunity: base, skill: "seo-citations" });
    }
  }
  if (family === "market-city" && !ctx.marketFacts?.has(pagePath)) {
    const thinTag = page?.marketData === "thin" ? `; tag: ${MARKET_DATA_THIN_TAG} (no SAFMR ZIP rows, no market-facts entry)` : "";
    hits.push({ reason: "MARKET_ENRICH", detail: `no ${MARKET_FACTS_FILE} entry${ctx.marketFacts ? "" : " (file not created yet)"}${thinTag}`, opportunity: base, skill: "seo-market-enrich" });
  }

  hits.sort((a, b) => REASON_PRIORITY.indexOf(a.reason) - REASON_PRIORITY.indexOf(b.reason));
  return { hits, veto, cooldown, indexClass, prune };
}

function metricsOf(m: Stats | undefined): Candidate["metrics"] {
  return {
    clicks28d: m?.clicks ?? 0,
    impressions28d: m?.impressions ?? 0,
    ctr28d: round(m?.ctr ?? 0),
    position28d: m?.position === null || m?.position === undefined ? null : round(m.position, 2),
  };
}

function groupByPage(rows: PageQueryMetric[]): Map<string, PageQueryMetric[]> {
  const out = new Map<string, PageQueryMetric[]>();
  for (const row of rows) {
    const key = normalizePath(row.page);
    const list = out.get(key);
    if (list) list.push(row);
    else out.set(key, [row]);
  }
  return out;
}

function topQueriesOf(rows: PageQueryMetric[] | undefined, pagePath: string): Candidate["topQueries"] {
  return aggregateQueries((rows ?? []).filter((r) => normalizePath(r.page) === pagePath))
    .slice(0, TOP_QUERIES)
    .map((q) => ({ query: q.query, impressions: q.impressions, clicks: q.clicks, position: round(q.pages[0]?.position ?? 0, 1) }));
}

/** Priority list for manual "Request indexing": drops with impressions, then never-crawled (hubs first), then the rest. */
export function requestIndexingList(input: {
  entries: IndexStatusUrl[];
  current: Map<string, Stats>;
  prior: Map<string, Stats>;
  skip: Set<string>;
  max?: number;
}): Array<{ path: string; why: string }> {
  const impr56 = (p: string): number => (input.current.get(p)?.impressions ?? 0) + (input.prior.get(p)?.impressions ?? 0);
  const entries = input.entries.map((e) => ({ e, p: normalizePath(e.path) })).filter(({ p }) => !input.skip.has(p));
  const hubRank = (p: string): number => {
    const f = familyOf(p);
    return f === "hub" || f === "home" ? 0 : f === "blog-topic" ? 1 : 2;
  };
  const byPath = (a: { p: string }, b: { p: string }): number => a.p.localeCompare(b.p);
  const dropped = entries.filter(({ e }) => e.indexClass === "dropped_after_indexed");
  const withImpr = dropped.filter(({ p }) => impr56(p) > 0).sort((a, b) => impr56(b.p) - impr56(a.p) || byPath(a, b));
  const never = entries
    .filter(({ e }) => e.indexClass === "never_crawled")
    .sort((a, b) => hubRank(a.p) - hubRank(b.p) || (a.e.firstSeenInSitemap ?? "9999").localeCompare(b.e.firstSeenInSitemap ?? "9999") || byPath(a, b));
  const droppedQuiet = dropped.filter(({ p }) => impr56(p) === 0).sort(byPath);
  const cni = entries
    .filter(({ e }) => e.indexClass === "crawled_not_indexed")
    .sort((a, b) => (a.e.lastCrawlTime ?? "9999").localeCompare(b.e.lastCrawlTime ?? "9999") || byPath(a, b));
  const unknown = entries.filter(({ e }) => e.indexClass === "unknown").sort(byPath);

  const out: Array<{ path: string; why: string }> = [];
  const lastCrawl = (e: IndexStatusUrl): string => day(e.lastCrawlTime) ?? "never";
  for (const { e, p } of withImpr) out.push({ path: p, why: `dropped out of the index after being indexed; ${impr56(p)} impressions in the last 56 days; last crawl ${lastCrawl(e)}` });
  for (const { e, p } of never) out.push({ path: p, why: `never crawled${hubRank(p) === 0 ? " (hub)" : ""}; in the sitemap since ${e.firstSeenInSitemap ?? "unknown"}` });
  for (const { e, p } of droppedQuiet) out.push({ path: p, why: `dropped out of the index after being indexed; last crawl ${lastCrawl(e)}` });
  for (const { e, p } of cni) out.push({ path: p, why: `crawled ${lastCrawl(e)} but not indexed; a fresh crawl may clear it` });
  for (const { e, p } of unknown) out.push({ path: p, why: `not indexed ("${e.coverageState ?? "unknown state"}")` });
  return out.slice(0, input.max ?? REQUEST_INDEXING_MAX);
}

type DormantInput = {
  ctx: Ctx;
  counts: Map<Skill, number>;
  gap: GapResult;
  profile: Candidates["profile"];
  eligible: (p: string) => boolean;
  pruneChecks: Array<{ path: string; check: PruneCheck }>;
  /** Where each candidate was routed, so a near-miss that did qualify says where it went. */
  routedTo: Map<string, Skill>;
};

function dormantSkills(input: DormantInput): Candidates["dormant"] {
  const { ctx, counts, gap, profile, eligible, pruneChecks, routedTo } = input;
  const { cfg } = ctx;
  const sd = cfg.thresholds.strikingDistance;
  const per = cfg.thresholds.persistence;
  const eligiblePages = [...ctx.pages].filter(([p, m]) => eligible(p) && m.position !== null);
  const byImpr = (list: Array<[string, Stats]>): Array<[string, Stats]> => [...list].sort(([a, x], [b, y]) => y.impressions - x.impressions || a.localeCompare(b));
  const noGsc = "0 pages; no page-level GSC data this run";
  const routed = (p: string): string => (routedTo.has(p) ? `; routed to ${routedTo.get(p)}` : "");
  const out: Candidates["dormant"] = [];
  const add = (skill: Skill, needs: string, current: () => string): void => {
    if ((counts.get(skill) ?? 0) === 0) out.push({ skill, needs, current: current() });
  };

  add("seo-striking-distance", `pages at pos ${sd.positionMin}-${sd.positionMax} with ≥${sd.minImpressions28d} impr in 28d qualifying ${per.minWeeksQualifying} of ${per.ofLastWeeks} weeks`, () => {
    const inBand = eligiblePages.filter(([, m]) => (m.position ?? 0) >= sd.positionMin && (m.position ?? 0) <= sd.positionMax);
    const best = byImpr(inBand.length ? inBand : eligiblePages)[0];
    if (!best) return noGsc;
    const persisted = persistence(ctx.weekly.get(best[0]), ctx.weeks, cfg);
    return `0 pages; best is ${best[0]} with ${best[1].impressions} impr at pos ${fmtPos(best[1].position)} (qualified ${persisted.qualifying} of ${persisted.of} weeks)${routed(best[0])}`;
  });
  add("seo-ctr", `pages with ≥${cfg.thresholds.lowCtr.minImpressions28d} impr in 28d whose CTR is below the curve (binomial p < ${cfg.thresholds.lowCtr.binomialP})`, () => {
    // Closest miss: lowest p among pages above the impression floor, else the most-seen page.
    const floor = cfg.thresholds.lowCtr.minImpressions28d;
    const ranked = byImpr(eligiblePages)
      .map(([p, m]) => ({ p, m, pValue: lowCtrPValue(m) ?? 1 }))
      .sort((a, b) => Number(b.m.impressions >= floor) - Number(a.m.impressions >= floor) || a.pValue - b.pValue);
    const best = ranked[0];
    if (!best) return noGsc;
    return `0 pages; best is ${best.p}: ${best.m.clicks} clicks on ${best.m.impressions} impr at pos ${fmtPos(best.m.position)} (p=${best.pValue.toFixed(2)})${routed(best.p)}`;
  });
  add("seo-refresh", `pages whose clicks fell ≥${pct(cfg.thresholds.refresh.clickDropShare)} over the last 8 weeks vs the prior 8, from ≥${cfg.thresholds.refresh.minBaselineClicks8w} baseline clicks`, () => {
    const weeks = new Set(ctx.weeks).size;
    if (weeks < DECAY_WEEKS * 2) return `0 pages; only ${weeks} of ${DECAY_WEEKS * 2} weeks of weekly data`;
    const best = [...ctx.weekly.keys()]
      .filter(eligible)
      .map((p) => ({ p, d: decayOf(ctx.weekly.get(p), ctx.weeks) }))
      .filter((x): x is { p: string; d: Decay } => x.d !== null && x.d.prior > 0)
      .sort((a, b) => b.d.prior - a.d.prior || a.p.localeCompare(b.p))[0];
    return best ? `0 pages; largest 8-week baseline is ${best.p} with ${best.d.prior} clicks (${pct(best.d.change ?? 0)})${routed(best.p)}` : "0 pages; no page had clicks in the prior 8 weeks";
  });
  const crawlPages = [...ctx.crawl.values()].filter((p) => eligible(normalizePath(p.path)));
  const noCrawl = "0 pages; no crawl file this run";
  add("seo-citations", "thin pages, blog posts without a primary-source link, or crawled-not-indexed pages that need quality work", () =>
    ctx.hasCrawl
      ? `0 pages; ${crawlPages.filter((p) => p.thin).length} eligible thin pages, ${crawlPages.filter((p) => needsCitations(p, cfg.primarySourceDomains)).length} blog posts without a primary-source link`
      : noCrawl,
  );
  add("seo-internal-links", "orphan pages, never-crawled sitemap URLs, or crawled-not-indexed pages that are not thin", () => {
    const never = [...ctx.index.values()].filter((e) => e.indexClass === "never_crawled" && eligible(normalizePath(e.path))).length;
    const orphans = ctx.orphans ? `${[...ctx.orphans].filter(eligible).length} orphans` : "orphans unknown (link graph did not run)";
    return `0 pages; ${orphans}, ${never} never-crawled URLs`;
  });
  add("seo-market-enrich", `market-city pages without a ${MARKET_FACTS_FILE} entry, or thin market/state pages`, () => {
    const markets = [...ctx.sitemap].filter((p) => familyOf(p) === "market-city");
    const covered = markets.filter((p) => ctx.marketFacts?.has(p)).length;
    return `0 pages; ${covered} of ${markets.length} market pages have a facts entry`;
  });
  const prune = cfg.thresholds.prune;
  add(
    "seo-prune",
    `crawled-not-indexed pages never indexed, same state on ≥${prune.minConfirmingInspections} inspections ${prune.minDaysBetweenInspections}+ days apart, crawled after their last change, <${prune.maxImpressions28d} impr in 28d, thin, ${prune.minDaysInSitemap}+ days in the sitemap`,
    () => {
      if (!pruneChecks.length) return "0 pages; no crawled-not-indexed URLs";
      const closest = [...pruneChecks].sort((a, b) => a.check.failed.length - b.check.failed.length || a.path.localeCompare(b.path))[0];
      return `0 pages; ${pruneChecks.length} crawled-not-indexed; closest ${closest.path} fails: ${closest.check.failed.join("; ")}`;
    },
  );
  const gapArticles = gap.clusters.filter((c) => c.route === "gap-article");
  const minQ = cfg.thresholds.gapArticle.minQueryImpressions28d;
  if (profile.crawlStalled) {
    out.push({
      skill: "seo-gap-article",
      needs: `query clusters with ≥${minQ} impr no page covers, and Google's crawl moving again (capped at ${cfg.gates.gapArticlesWhileCrawlStalled} while stalled)`,
      current: `crawl stalled: ${profile.unknownUrls} never-crawled URLs, crawled-not-indexed trend ${profile.crawledNotIndexedTrend.join("→") || "unknown"}; ${gapArticles.length} gap-article clusters waiting`,
    });
  } else if (!gapArticles.length) {
    out.push({
      skill: "seo-gap-article",
      needs: `query clusters with ≥${minQ} impr that no landing title/H1 or sitemap path covers`,
      current: `0 clusters; ${gap.considered} non-brand queries reached ${minQ} impr${gap.unverified ? ` (${gap.unverified} unjudged: landing page not crawled successfully)` : ""} and ${gap.clusters.length} uncovered clusters routed elsewhere`,
    });
  }
  return out.sort((a, b) => ROUTED_SKILLS.indexOf(a.skill) - ROUTED_SKILLS.indexOf(b.skill));
}

/** The whole scoring pass, pure: inputs in, candidates-<date>.json out. */
export function buildCandidates(inputs: ScoreInputs, cfg: SeoConfig = loadConfig()): ScoreOutput {
  const sitemap = new Set(inputs.sitemapPaths.map(normalizePath));
  const ledgerChanges = materializeChanges(inputs.ledger);
  const holdouts = activeHoldouts(inputs.ledger, inputs.today);
  const index = new Map<string, IndexStatusUrl>();
  for (const [url, entry] of Object.entries(inputs.indexStatus?.urls ?? {})) index.set(normalizePath(entry.path ?? url), entry);
  const crawl = new Map<string, CrawlPageWithHosts>();
  for (const page of inputs.crawl?.pages ?? []) crawl.set(normalizePath(page.path), page);
  const linkGraphRan = Boolean(inputs.crawl?.linkGraph?.ran);
  const pages = aggregatePageMetrics(inputs.gsc?.pages.current ?? []);
  const queryRows = inputs.gsc?.pageQueries.current ?? [];
  const editable = (p: string): boolean => sitemap.has(p) && !isExcludedFromOptimization(p) && !holdouts.has(p);

  const gap: GapResult = inputs.crawl
    ? findGapClusters({ queries: aggregateQueries(queryRows), crawlByPath: crawl, sitemapPaths: [...sitemap], editable, cfg })
    : { clusters: [], considered: 0, unverified: 0, pageShare: new Map() };

  const ctx: Ctx = {
    cfg,
    today: inputs.today,
    sitemap,
    pages,
    priorPages: aggregatePageMetrics(inputs.gsc?.pages.prior ?? []),
    queriesByPage: groupByPage(queryRows),
    weekly: weeklyByPage(inputs.gsc?.weekly.rows ?? []),
    weeks: inputs.gsc?.weekly.weeks ?? [],
    index,
    crawl,
    hasCrawl: Boolean(inputs.crawl),
    orphans: linkGraphRan ? new Set([...(inputs.crawl?.issues.orphans ?? []), ...(inputs.crawl?.linkGraph.orphans ?? [])].map(normalizePath)) : null,
    cannibal: findCannibalization(queryRows),
    gapShare: gap.pageShare,
    marketFacts: inputs.marketFacts,
    knownBacklinks: inputs.knownBacklinks,
    holdouts,
    touches: lastTouches(ledgerChanges),
  };

  const candidates: Candidate[] = [];
  const reportOnly: ReportOnlyEntry[] = [];
  const pruneChecks: Array<{ path: string; check: PruneCheck }> = [];
  const pruneEligible = new Set<string>();
  for (const pagePath of [...sitemap].sort()) {
    if (holdouts.has(pagePath)) continue;
    const result = evaluatePage(ctx, pagePath);
    if (result.prune && !isExcludedFromOptimization(pagePath)) {
      pruneChecks.push({ path: pagePath, check: result.prune });
      if (result.prune.eligible) pruneEligible.add(pagePath);
    }
    if (!result.hits.length) continue;
    const family = familyOf(pagePath);
    const reasons = result.hits.map(({ reason, detail }) => ({ reason, detail }));
    const metrics = metricsOf(pages.get(pagePath));
    const source = editableSourceFor(pagePath);
    const fenced = source !== null && inputs.fencedSources?.has(source) === true;
    const routed = result.veto || fenced || isExcludedFromOptimization(pagePath) ? null : routeHits(result.hits);
    if (!routed?.skill) {
      const why =
        result.veto ??
        (fenced
          ? "its source injects HTML (dangerouslySetInnerHTML or a <script>), which verify-static rejects on any edit; convert it to JSX (JSON-LD: <JsonLd>) in an owner PR first"
          : isExcludedFromOptimization(pagePath)
            ? "excluded from optimization (owner-only surface)"
            : "no skill acts on these reasons; an owner decision");
      reportOnly.push({ path: pagePath, family, reasons, indexClass: result.indexClass, metrics, why });
      continue;
    }
    candidates.push({
      path: pagePath,
      family,
      reasons,
      skill: routed.skill,
      opportunity: round(routed.opportunity),
      metrics,
      indexClass: result.indexClass,
      editableSource: source,
      cooldownUntil: result.cooldown,
      topQueries: topQueriesOf(ctx.queriesByPage.get(pagePath), pagePath),
    });
  }

  for (const hit of redirectedWithImpressions(pages, sitemap, inputs.redirectStatus)) {
    if (holdouts.has(hit.path) || isExcludedFromOptimization(hit.path)) continue;
    reportOnly.push({
      path: hit.path,
      family: familyOf(hit.path),
      reasons: [{ reason: "REDIRECTED_WITH_IMPRESSIONS", detail: `${hit.impressions} impressions and ${hit.clicks} clicks in 28 days on a ${hit.status} redirect${hit.location ? ` to ${hit.location}` : ""}` }],
      indexClass: index.get(hit.path)?.indexClass ?? "unknown",
      metrics: metricsOf(pages.get(hit.path)),
      why: "not in the sitemap and redirects: consolidate or retarget in an owner PR",
    });
  }

  // Opportunity first; within a tie, pages still in cooldown sink below pages a run may edit today.
  candidates.sort(
    (a, b) =>
      b.opportunity - a.opportunity ||
      Number(a.cooldownUntil !== null) - Number(b.cooldownUntil !== null) ||
      b.reasons.length - a.reasons.length ||
      a.path.localeCompare(b.path),
  );
  reportOnly.sort((a, b) => b.metrics.impressions28d - a.metrics.impressions28d || a.path.localeCompare(b.path));

  const profile = crawlProfile(inputs.indexStatus, sitemap, cfg);
  const counts = new Map<Skill, number>();
  for (const c of candidates) counts.set(c.skill, (counts.get(c.skill) ?? 0) + 1);
  const routedTo = new Map(candidates.map((c) => [c.path, c.skill]));
  const dormant = dormantSkills({ ctx, counts, gap, profile, eligible: editable, pruneChecks, routedTo });
  const requestIndexing = requestIndexingList({
    entries: [...index.values()].filter((e) => sitemap.has(normalizePath(e.path))),
    current: pages,
    prior: ctx.priorPages,
    skip: new Set([...holdouts, ...pruneEligible]),
  });

  return { generatedAt: inputs.generatedAt, profile, candidates, gapClusters: gap.clusters, dormant, requestIndexing, reportOnly };
}

// ------------------------------------------------------------------- I/O

function assertProductionHost(base: string): URL {
  const url = new URL(base);
  const host = url.hostname.toLowerCase();
  if (host !== "usetruecap.com" && host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]") {
    throw new Error(`refusing to probe ${host}: only usetruecap.com or loopback`);
  }
  return url;
}

/** HEAD (GET on 405/501) with redirects NOT followed, so a 3xx is recorded as-is. */
async function probe(base: URL, pagePath: string, userAgent: string): Promise<ProbeResult> {
  const url = new URL(base.href);
  url.pathname = pagePath;
  if (url.origin !== base.origin) return { status: null, location: null };
  for (const method of ["HEAD", "GET"]) {
    try {
      const response = await fetch(url, { method, redirect: "manual", headers: { "user-agent": userAgent }, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
      if (method === "HEAD" && (response.status === 405 || response.status === 501)) continue;
      await response.body?.cancel().catch(() => undefined);
      const location = response.headers.get("location");
      let target: string | null = null;
      if (location) {
        const resolved = new URL(location, url);
        target = resolved.origin === base.origin ? toPath(resolved.href) : resolved.href;
      }
      return { status: response.status, location: target };
    } catch {
      return { status: null, location: null };
    }
  }
  return { status: null, location: null };
}

async function loadSitemapPaths(args: Args, base: string): Promise<string[]> {
  const file = flagString(args, "sitemap-file");
  if (file) {
    const text = readFileSync(path.resolve(file), "utf8").trim();
    if (text.startsWith("[")) {
      const list: unknown = JSON.parse(text);
      if (!Array.isArray(list) || !list.every((item) => typeof item === "string")) throw new Error("--sitemap-file JSON must be an array of paths or URLs");
      return list.map(normalizePath);
    }
    const urls = parseSitemap(text);
    if (!urls.length) throw new Error("--sitemap-file contains zero <url> entries");
    return urls.map((u) => u.path);
  }
  return (await fetchSitemap(base)).map((u) => u.path);
}

async function main(args: Args): Promise<number> {
  const cfg = loadConfig();
  const todayDate = today();
  const gscFile = latestDataFile("gsc", todayDate);
  const crawlFile = latestDataFile("crawl", todayDate);
  const gsc = readJsonIfExists<GscPull>(gscFile);
  const indexStatus = readJsonIfExists<IndexStatus>(statePaths.indexStatus());
  const crawl = readJsonIfExists<Crawl>(crawlFile);
  if (!gsc && !indexStatus && !crawl) throw new Error("no inputs: run gsc-pull, gsc-inspect and crawl first");
  if (!gsc) log("warning: no gsc-<date>.json; GSC reasons (striking distance, CTR, decay, cannibalization, gaps) are skipped");
  if (!indexStatus) log("warning: no index-status.json; NOT_INDEXED is skipped and the crawl counts as stalled");
  if (!crawl) log("warning: no crawl-<date>.json; THIN, ORPHAN, NEEDS_CITATIONS and gap clusters are skipped");
  const ledger = readJsonl<LedgerLine>(statePaths.ledger());

  const sitemapPaths = await loadSitemapPaths(args, cfg.site.base);
  const sitemap = new Set(sitemapPaths);
  const marketFactsJson = readJsonIfExists<unknown>(path.join(REPO_ROOT, MARKET_FACTS_FILE));
  const bing = readJsonIfExists<{ linkCounts?: Record<string, number> }>(latestDataFile("bing", todayDate));

  const redirectStatus = knownStatuses(crawl);
  const targets = redirectProbeTargets(aggregatePageMetrics(gsc?.pages.current ?? []), sitemap, redirectStatus);
  if (targets.length && hasFlag(args, "no-probe")) log(`--no-probe: ${targets.length} GSC paths outside the sitemap left unprobed`);
  else if (targets.length) {
    const base = assertProductionHost(cfg.site.base);
    log(`probing ${targets.length} GSC paths outside the sitemap (HEAD, redirects not followed)`);
    for (const target of targets) redirectStatus.set(target, await probe(base, target, cfg.site.userAgent));
  }

  const result = buildCandidates(
    {
      generatedAt: new Date().toISOString(),
      today: todayDate,
      gsc,
      indexStatus,
      crawl,
      ledger,
      sitemapPaths,
      redirectStatus,
      marketFacts: marketFactsJson === null ? null : marketFactsPaths(marketFactsJson),
      knownBacklinks: bing?.linkCounts ?? null,
      fencedSources: fencedSourcesOnDisk(sitemapPaths),
    },
    cfg,
  );
  const out = flagString(args, "out") ?? datedDataPath("candidates", todayDate);
  writeJson(out, result);

  const bySkill: Record<string, number> = {};
  for (const c of result.candidates) bySkill[c.skill] = (bySkill[c.skill] ?? 0) + 1;
  console.log(
    JSON.stringify({
      file: repoRelative(out),
      candidates: result.candidates.length,
      bySkill,
      reportOnly: result.reportOnly.length,
      gapClusters: result.gapClusters.length,
      requestIndexing: result.requestIndexing.length,
      crawlStalled: result.profile.crawlStalled,
      dormant: result.dormant.map((d) => d.skill),
    }),
  );
  return 0;
}

// -------------------------------------------------------------- self-test

function selfTest(): void {
  const cfg = loadConfig();
  const T = "2026-09-28";
  check(targetPosition(12) === 7 && targetPosition(3) === 1, "targetPosition moves five places, floored at 1");
  const opp = opportunity({ impressions28d: 200, actualCtr: 0.01, position: 12, recencyDiscount: 1, indexDiscount: 1 });
  check(Math.abs(opp - 200 * (expectedCtr(7) - 0.01)) < 1e-9, "opportunity follows the brief's formula");
  check(opportunity({ impressions28d: 200, actualCtr: 0.01, position: 12, recencyDiscount: 0, indexDiscount: 1 }) === 0, "cooldown zeroes opportunity");

  const weeks = ["2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14"];
  const weekly = weeklyByPage(weeks.slice(0, 3).map((weekStart) => ({ page: "/blog/a", weekStart, clicks: 0, impressions: 30, position: 9 })));
  check(persistence(weekly.get("/blog/a"), weeks, cfg).qualifying === 3, "three qualifying weeks counted");
  check(decayOf(undefined, weeks) === null, "decay needs 16 weeks");

  const cannibal = findCannibalization([
    { page: "/blog/a", query: "dscr loan", clicks: 0, impressions: 25, ctr: 0, position: 9 },
    { page: "/blog/b", query: "dscr loan", clicks: 0, impressions: 21, ctr: 0, position: 14 },
    { page: "/blog/c", query: "dscr loan", clicks: 0, impressions: 5, ctr: 0, position: 30 },
  ]);
  check(cannibal.has("/blog/a") && cannibal.has("/blog/b") && !cannibal.has("/blog/c"), "cannibalization needs ≥20 impressions per page");

  const holdoutLine = { kind: "holdout", id: "h", run_id: "r", date: "2026-09-01", urls: ["https://usetruecap.com/blog/held"], until: "2026-10-27", salt: "s", prev_hash: "GENESIS", hash: "x" } as LedgerLine;
  check(activeHoldouts([holdoutLine], T).has("/blog/held"), "holdout urls normalise to paths");
  check(cooldownUntil("2026-09-10", T, 30) === "2026-10-10" && cooldownUntil("2026-08-01", T, 30) === null, "cooldown window");

  const blogRecord = (status: number): CrawlPageWithHosts => ({
    url: "https://usetruecap.com/blog/x", path: "/blog/x", family: "blog-post", status, finalUrl: null, title: null, metaDescription: null, h1: [],
    canonical: null, canonicalIsSelf: null, robots: null, noindex: false, jsonLdTypes: [], jsonLdParseErrors: 0, datePublished: null, dateModified: null,
    visibleUpdatedDate: null, wordCount: 0, mainHash: "", uniqueRatio: null, thin: false, outboundInternal: 0, outboundExternal: 0,
    inboundContextual: 0, inboundTotal: 0, depth: null, textFile: "pages/x.txt", externalHosts: [], fetchError: null,
  });
  check(!needsCitations(blogRecord(503), cfg.primarySourceDomains) && needsCitations(blogRecord(200), cfg.primarySourceDomains), "a failed fetch is not a page without citations");

  const gapQuery = aggregateQueries([{ page: "/blog/held", query: "dscr loan rules", clicks: 0, impressions: 80, ctr: 0, position: 4 }]);
  const gapFor = (status: number): GapResult =>
    findGapClusters({ queries: gapQuery, crawlByPath: new Map([["/blog/held", { title: "Cap rate", h1: [], status }]]), sitemapPaths: ["/blog/held"], editable: () => false, cfg });
  const ranking = gapFor(200);
  check(ranking.clusters[0]?.route === "striking-distance" && ranking.pageShare.size === 0, "a ranking page that may not be edited blocks a gap article without taking a QUERY_GAP");
  check(gapFor(503).clusters.length === 0 && gapFor(503).unverified === 1, "a landing page that failed to fetch is not a gap");

  const facts = marketFactsPaths({ _readme: "x", "philadelphia-pa": { rent: 1 }, "/markets/austin-tx": {} });
  check(facts.has("/markets/philadelphia-pa") && facts.has("/markets/austin-tx") && facts.size === 2, "market-facts keys");

  const out = buildCandidates(
    {
      generatedAt: "2026-09-28T00:00:00.000Z",
      today: T,
      gsc: null,
      indexStatus: null,
      crawl: null,
      ledger: [holdoutLine],
      sitemapPaths: ["/markets/austin-tx", "/markets/boise-id", "/blog/held"],
      redirectStatus: new Map(),
      marketFacts: facts,
      knownBacklinks: null,
    },
    cfg,
  );
  check(out.candidates.length === 1 && out.candidates[0].path === "/markets/boise-id", "only the uncovered market page is a candidate");
  check(out.candidates[0].skill === "seo-market-enrich", "MARKET_ENRICH routes to seo-market-enrich");
  check(out.profile.crawlStalled, "missing index status fails closed to stalled");
  check(!out.candidates.some((c) => c.path === "/blog/held"), "holdout pages are never candidates");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["no-probe", "out", "sitemap-file"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
