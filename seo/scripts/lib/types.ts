/**
 * Data contracts between the SEO loop's scripts. Every artifact under
 * seo/data/ and seo/ledger.jsonl has its shape declared here, once.
 * Producers and consumers import these types; nothing re-declares them.
 *
 * All dates are UTC. `date` fields are YYYY-MM-DD; `at` fields are ISO-8601.
 * All `page`/`path` fields are site-relative paths ("/blog/x"), never full URLs,
 * except where a field is explicitly named `url`.
 */

import type { Family } from "./family.ts";

// ---------------------------------------------------------------- gsc-pull
export type Metric = { clicks: number; impressions: number; ctr: number; position: number };
export type PageMetric = Metric & { page: string };
export type PageQueryMetric = Metric & { page: string; query: string };
export type WeeklyPageMetric = Metric & { page: string; weekStart: string };

/** seo/data/gsc-<date>.json */
export type GscPull = {
  generatedAt: string;
  site: string;
  windows: { current: { startDate: string; endDate: string }; prior: { startDate: string; endDate: string } };
  totals: { current: Metric; prior: Metric };
  /** Page-dimension pull: includes anonymized-query traffic, so these are the page totals. */
  pages: { current: PageMetric[]; prior: PageMetric[] };
  /** page+query pull: excludes anonymized queries; sums are lower than `pages`. */
  pageQueries: { current: PageQueryMetric[]; prior: PageQueryMetric[] };
  /** Last 16 complete ISO weeks by page (Monday weekStart), from a date+page pull. */
  weekly: { weeks: string[]; rows: WeeklyPageMetric[] };
  /** Site totals per week for the same 16 weeks (week-over-week brake). */
  weeklyTotals: Array<Metric & { weekStart: string }>;
};

// ------------------------------------------------------------- gsc-inspect
export type InspectionSnapshot = {
  inspectedAt: string;
  source: "api" | "telemetry-seed";
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  robotsTxtState: string | null;
  pageFetchState: string | null;
  lastCrawlTime: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  indexed: boolean | null;
};

export type IndexStatusUrl = InspectionSnapshot & {
  url: string;
  path: string;
  family: Family;
  sitemap: string[];
  referringUrls: string[];
  firstSeenInSitemap: string | null;
  /** True if ANY snapshot in history was indexed. */
  everIndexed: boolean;
  /** "never_crawled" | "crawled_not_indexed" | "dropped_after_indexed" | "indexed" | "excluded" | "unknown" */
  indexClass: IndexClass;
  /** Crawl fields merged by crawl.ts (null until a crawl has run). */
  mainHashAtInspect: string | null;
  wordCount: number | null;
  uniqueRatio: number | null;
  thin: boolean | null;
  /** Oldest → newest, capped at 26 snapshots. */
  history: InspectionSnapshot[];
};

export type IndexClass = "indexed" | "never_crawled" | "crawled_not_indexed" | "dropped_after_indexed" | "excluded" | "unknown";

/** seo/data/index-status.json — RUN STATE (persisted on seo-state). */
export type IndexStatus = {
  generatedAt: string;
  site: string;
  sitemapReport: Array<{ path: string; lastSubmitted: string | null; lastDownloaded: string | null; isPending: boolean | null; submitted: number | null; indexed: number | null }>;
  quota: { day: string; used: number };
  summary: { total: number; indexed: number; byClass: Record<IndexClass, number>; byFamily: Record<string, { total: number; indexed: number }> };
  urls: Record<string, IndexStatusUrl>;
};

// ------------------------------------------------------------------ crawl
export type CrawlPage = {
  url: string;
  path: string;
  family: Family;
  status: number;
  finalUrl: string | null;
  title: string | null;
  metaDescription: string | null;
  h1: string[];
  canonical: string | null;
  canonicalIsSelf: boolean | null;
  robots: string | null;
  noindex: boolean;
  jsonLdTypes: string[];
  jsonLdParseErrors: number;
  datePublished: string | null;
  dateModified: string | null;
  visibleUpdatedDate: string | null;
  wordCount: number;
  mainHash: string;
  uniqueRatio: number | null;
  thin: boolean;
  outboundInternal: number;
  outboundExternal: number;
  inboundContextual: number;
  inboundTotal: number;
  depth: number | null;
  /** Relative to dataDir(): pages/<sha1-of-path>.txt holds the main text for similarity. */
  textFile: string;
};

/** seo/data/crawl-<date>.json */
export type Crawl = {
  generatedAt: string;
  base: string;
  sitemapCount: number;
  pages: CrawlPage[];
  linkGraph: {
    ran: boolean;
    reason: string | null;
    edges: Array<{ from: string; target: string; anchor: string; placement: string }>;
    orphans: string[];
  };
  issues: {
    duplicateTitles: Array<{ title: string; paths: string[] }>;
    duplicateDescriptions: Array<{ description: string; paths: string[] }>;
    missingTitles: string[];
    missingDescriptions: string[];
    orphans: string[];
    deeperThan3: Array<{ path: string; depth: number | null }>;
    brokenInternalLinks: Array<{ from: string; target: string; status: number | null }>;
    nonSelfCanonical: string[];
    noindexInSitemap: string[];
    non200: Array<{ path: string; status: number }>;
  };
  /** Findings from scripts/seo/healthcheck.mjs (ops tripwires, schema requirements). */
  healthcheckFindings: Array<{ severity: string; check: string; detail?: string; path?: string }>;
};

// -------------------------------------------------------------------- psi
export type PsiResult = {
  template: string;
  url: string;
  ok: boolean;
  error: string | null;
  performanceScore: number | null;
  lcpMs: number | null;
  clsLab: number | null;
  tbtMs: number | null;
  field: { lcpMs: number | null; inpMs: number | null; cls: number | null; category: string | null } | null;
};
/** seo/data/psi-<date>.json */
export type Psi = { generatedAt: string; strategy: "mobile"; keyed: boolean; results: PsiResult[] };

// ------------------------------------------------------------------ score
export type Reason =
  | "STRIKING_DISTANCE"
  | "LOW_CTR"
  | "DECAYING"
  | "NOT_INDEXED"
  | "THIN"
  | "ORPHAN"
  | "CANNIBALIZATION"
  | "REDIRECTED_WITH_IMPRESSIONS"
  | "QUERY_GAP"
  | "NEEDS_CITATIONS"
  | "MARKET_ENRICH";

export type Skill =
  | "seo-striking-distance"
  | "seo-ctr"
  | "seo-refresh"
  | "seo-citations"
  | "seo-internal-links"
  | "seo-market-enrich"
  | "seo-gap-article"
  | "seo-prune"
  | "seo-data-study";

export type Candidate = {
  path: string;
  family: Family;
  reasons: Array<{ reason: Reason; detail: string }>;
  skill: Skill;
  opportunity: number;
  metrics: { clicks28d: number; impressions28d: number; ctr28d: number; position28d: number | null };
  indexClass: IndexClass;
  editableSource: string | null;
  cooldownUntil: string | null;
  topQueries: Array<{ query: string; impressions: number; clicks: number; position: number }>;
};

export type GapCluster = {
  key: string;
  queries: Array<{ query: string; impressions: number; landingPage: string | null }>;
  impressions: number;
  intent: "informational" | "calculator";
  nearestPage: string | null;
  route: "gap-article" | "striking-distance" | "tier2-issue";
};

/** seo/data/candidates-<date>.json */
export type Candidates = {
  generatedAt: string;
  profile: { crawlStalled: boolean; unknownUrls: number; crawledNotIndexedTrend: number[] };
  candidates: Candidate[];
  gapClusters: GapCluster[];
  dormant: Array<{ skill: Skill; needs: string; current: string }>;
  requestIndexing: Array<{ path: string; why: string }>;
};

// ------------------------------------------------------------ run manifest
/** seo/data/run-manifest.json — written by the MODEL. Treated as untrusted input. */
export type RunManifest = {
  runId: string;
  changes: Array<{ path: string; file: string; skill: Skill; changeType: string; summary: string; newArticle?: boolean; noindex?: boolean }>;
  skipped: Array<{ path: string; skill: Skill | null; reason: string }>;
  issues: Array<{ title: string; body: string; tier: 2 }>;
};

// ----------------------------------------------------------------- ledger
export type LedgerBefore = { clicks_28d: number; impressions_28d: number; position: number | null; indexed: boolean | null; coverageState: string | null; lastCrawlTime: string | null; mainHash: string | null };

export type LedgerChange = {
  kind: "change";
  id: string;
  run_id: string;
  date: string;
  url: string;
  file: string;
  tier: 0 | 1 | 2;
  change_type: string;
  skill: Skill;
  summary: string;
  pr: number | null;
  status: "proposed" | "live" | "void" | "reverted";
  live_at: string | null;
  before: LedgerBefore;
  holdout: string[];
  scored_at: string | null;
  after: (LedgerBefore & { holdout_ratio: number | null; clicks_ratio: number | null }) | null;
  outcome: "pending" | "win" | "loss" | "neutral";
  reverted: boolean;
};

export type LedgerEvent =
  | { kind: "holdout"; id: string; run_id: string; date: string; urls: string[]; until: string; salt: string }
  | { kind: "global_event"; id: string; date: string; description: string; urls: string[]; pr: number | null; exclude_until: string }
  | { kind: "status"; id: string; date: string; ref: string; status: LedgerChange["status"]; pr?: number | null; live_at?: string | null; note?: string };

/** Every line in seo/ledger.jsonl: the record plus its hash-chain fields. */
export type LedgerLine = (LedgerChange | LedgerEvent) & { prev_hash: string; hash: string };

// ----------------------------------------------------------------- brakes
/** seo/data/brakes-<date>.json */
export type Brakes = {
  generatedAt: string;
  pageRegressions: Array<{ ledgerId: string; path: string; pr: number | null; check: string; detail: string; action: "revert" }>;
  indexDrops: Array<{ ledgerId: string; path: string; detail: string; action: "tier2-issue" }>;
  gscPageLosses: Array<{ ledgerId: string; path: string; lossShare: number; impressions: number; action: "revert" }>;
  siteWide: { triggered: boolean; applied: boolean; priorWeekClicks: number; latestWeekClicks: number; dropShare: number | null; note: string };
  demotedChangeTypes: Array<{ changeType: string; lossRate: number; scored: number }>;
};

/** seo/data/halt.json — written only by deterministic jobs; cleared by the owner. */
export type Halt = { halted: boolean; since: string | null; reason: string | null; id: string | null; clearWithAck: string | null };

// ----------------------------------------------------------- verify-static
export type VerifyFile = {
  path: string;
  status: "A" | "M" | "D" | "R" | "T";
  tier: 0 | 1 | 2;
  /** The page this file renders (lib/family.ts pageUrlForFile), or null for a shared file. */
  url: string | null;
  addedLines: number;
  removedLines: number;
  /**
   * Every page this file changes: `url` for a page or OG file; for a shared
   * file (dataset, registry, noindex.json) the manifest paths verify-static
   * validated plus the noindex additions it found. Absent in verdicts written
   * before this field existed; readers fall back to `url`.
   */
  urls?: string[];
  /** Why the tier is what it is (e.g. "demoted change type title-meta"), when verify-static raised it. */
  tierReason?: string;
};
export type Violation = { rule: string; path: string | null; detail: string };
/** Output of verify-static.ts — the ONLY source of tier truth for publish/merge. */
export type VerifyVerdict = {
  ok: boolean;
  patchSha256: string;
  tier: 0 | 1 | 2;
  files: VerifyFile[];
  declaredUrls: string[];
  violations: Violation[];
  caps: { files: number; lines: number; pages: number; newArticles: number; noindex: number };
  /** Pages content/seo/noindex.json newly noindexes (they are meant to leave the index: never a post-deploy regression). */
  noindexAdded?: string[];
};
