/**
 * seo/scripts/score.ts — the opportunity ranking that decides which pages the
 * weekly SEO run may touch. These tests pin the brief's formula, each reason's
 * threshold, the routing table, and the fences that keep the loop honest:
 * holdout pages get nothing, excluded pages never become edit candidates,
 * pages dropped from the index go to "Request indexing" instead of an edit,
 * and pages inside the 30-day cooldown score zero.
 *
 * No network: the pure functions get inline fixtures, and the one CLI run
 * uses --sitemap-file, --no-probe and tmp SEO_DATA_DIR / SEO_STATE_DIR.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  INDEX_DISCOUNT,
  REASON_PRIORITY,
  REDIRECT_PROBE_CAP,
  REQUEST_INDEXING_MAX,
  ROUTED_SKILLS,
  activeHoldouts,
  aggregatePageMetrics,
  aggregateQueries,
  buildCandidates,
  contentTokens,
  cooldownUntil,
  crawlProfile,
  crawledNotIndexedTrend,
  decayOf,
  findCannibalization,
  findGapClusters,
  isDecaying,
  isLowCtr,
  isStrikingDistance,
  jaccard,
  knownStatuses,
  lastTouches,
  lowCtrPValue,
  marketFactsPaths,
  materializeChanges,
  needsCitations,
  normalizePath,
  opportunity,
  persistence,
  pruneEligibility,
  qualitySkill,
  redirectProbeTargets,
  redirectedWithImpressions,
  requestIndexingList,
  routeHits,
  targetPosition,
  tokenCoverage,
  weeklyByPage,
} from "../../seo/scripts/score.ts";
import type { Hit, ScoreInputs, Stats } from "../../seo/scripts/score.ts";
import { loadConfig } from "../../seo/scripts/lib/config.ts";
import { addDays } from "../../seo/scripts/lib/paths.ts";
import { expectedCtr } from "../../seo/scripts/lib/stats.ts";
import type {
  Crawl,
  CrawlPage,
  GscPull,
  IndexStatus,
  IndexStatusUrl,
  InspectionSnapshot,
  LedgerLine,
  PageQueryMetric,
  WeeklyPageMetric,
} from "../../seo/scripts/lib/types.ts";

const cfg = loadConfig();
const TODAY = "2026-09-28";
const BASE = "https://usetruecap.com";
const REPO = path.resolve(__dirname, "..", "..");
const SCRIPT = path.join(REPO, "seo", "scripts", "score.ts");

// ---------------------------------------------------------------- fixtures

/** `n` Monday week starts, oldest first, the last being `lastMonday`. */
function mondays(lastMonday: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(lastMonday, -7 * (n - 1 - i)));
}
const WEEKS = mondays("2026-09-14", 16);

function stats(clicks: number, impressions: number, position: number | null): Stats {
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position };
}

function snap(inspectedAt: string, overrides: Partial<InspectionSnapshot> = {}): InspectionSnapshot {
  return {
    inspectedAt,
    source: "api",
    verdict: "NEUTRAL",
    coverageState: "Crawled - currently not indexed",
    indexingState: "INDEXING_ALLOWED",
    robotsTxtState: "ALLOWED",
    pageFetchState: "SUCCESSFUL",
    lastCrawlTime: "2026-06-10T00:00:00Z",
    googleCanonical: null,
    userCanonical: null,
    indexed: false,
    ...overrides,
  };
}

function entry(pagePath: string, overrides: Partial<IndexStatusUrl> = {}): IndexStatusUrl {
  const base = snap("2026-09-21T10:00:00Z", { verdict: "PASS", coverageState: "Submitted and indexed", indexed: true });
  return {
    ...base,
    url: `${BASE}${pagePath}`,
    path: pagePath,
    family: "other",
    sitemap: [`${BASE}/sitemap.xml`],
    referringUrls: [],
    firstSeenInSitemap: "2026-05-01",
    everIndexed: base.indexed === true,
    indexClass: "indexed",
    mainHashAtInspect: null,
    wordCount: 900,
    uniqueRatio: 0.8,
    thin: false,
    history: [],
    ...overrides,
  };
}

function page(pagePath: string, overrides: Partial<CrawlPage> = {}): CrawlPage {
  return {
    url: `${BASE}${pagePath}`,
    path: pagePath,
    family: "other",
    status: 200,
    finalUrl: null,
    title: "A page",
    metaDescription: "desc",
    h1: ["A page"],
    canonical: `${BASE}${pagePath}`,
    canonicalIsSelf: true,
    robots: null,
    noindex: false,
    jsonLdTypes: [],
    jsonLdParseErrors: 0,
    datePublished: "2026-03-01",
    dateModified: "2026-05-01",
    visibleUpdatedDate: null,
    wordCount: 900,
    mainHash: "h",
    uniqueRatio: 0.8,
    thin: false,
    outboundInternal: 5,
    outboundExternal: 2,
    inboundContextual: 3,
    inboundTotal: 10,
    depth: 2,
    textFile: "pages/x.txt",
    ...overrides,
  };
}

function crawlOf(pages: CrawlPage[], orphans: string[] = [], extra: Partial<Crawl["issues"]> = {}): Crawl {
  return {
    generatedAt: `${TODAY}T08:00:00Z`,
    base: BASE,
    sitemapCount: pages.length,
    pages,
    linkGraph: { ran: true, reason: null, edges: [], orphans },
    issues: {
      duplicateTitles: [],
      duplicateDescriptions: [],
      missingTitles: [],
      missingDescriptions: [],
      orphans,
      deeperThan3: [],
      brokenInternalLinks: [],
      nonSelfCanonical: [],
      noindexInSitemap: [],
      non200: [],
      ...extra,
    },
    healthcheckFindings: [],
  };
}

function gscOf(parts: {
  pages?: Array<{ page: string; clicks: number; impressions: number; position: number }>;
  prior?: Array<{ page: string; clicks: number; impressions: number; position: number }>;
  queries?: Array<{ page: string; query: string; clicks: number; impressions: number; position: number }>;
  weekly?: Array<{ page: string; weekStart: string; clicks: number; impressions: number; position: number }>;
  weeks?: string[];
}): GscPull {
  const withCtr = <T extends { clicks: number; impressions: number }>(r: T): T & { ctr: number } => ({ ...r, ctr: r.impressions ? r.clicks / r.impressions : 0 });
  const zero = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  return {
    generatedAt: `${TODAY}T07:00:00Z`,
    site: "sc-domain:usetruecap.com",
    windows: { current: { startDate: "2026-08-28", endDate: "2026-09-25" }, prior: { startDate: "2026-07-31", endDate: "2026-08-27" } },
    totals: { current: zero, prior: zero },
    pages: { current: (parts.pages ?? []).map(withCtr), prior: (parts.prior ?? []).map(withCtr) },
    pageQueries: { current: (parts.queries ?? []).map(withCtr) as PageQueryMetric[], prior: [] },
    weekly: { weeks: parts.weeks ?? WEEKS, rows: (parts.weekly ?? []).map(withCtr) as WeeklyPageMetric[] },
    weeklyTotals: [],
  };
}

function indexOf(entries: IndexStatusUrl[]): IndexStatus {
  return {
    generatedAt: `${TODAY}T07:30:00Z`,
    site: "sc-domain:usetruecap.com",
    sitemapReport: [],
    quota: { day: TODAY, used: 0 },
    summary: { total: entries.length, indexed: 0, byClass: { indexed: 0, never_crawled: 0, crawled_not_indexed: 0, dropped_after_indexed: 0, excluded: 0, unknown: 0 }, byFamily: {} },
    urls: Object.fromEntries(entries.map((e) => [e.url, e])),
  };
}

const chain = { prev_hash: "GENESIS", hash: "x" };

function changeLine(overrides: Record<string, unknown>): LedgerLine {
  return {
    kind: "change",
    id: "c1",
    run_id: "r1",
    date: "2026-09-01",
    url: `${BASE}/blog/x`,
    file: "app/blog/x/page.tsx",
    tier: 1,
    change_type: "title",
    skill: "seo-ctr",
    summary: "s",
    pr: null,
    status: "proposed",
    live_at: null,
    before: { clicks_28d: 0, impressions_28d: 0, position: null, indexed: true, coverageState: null, lastCrawlTime: null, mainHash: null },
    holdout: [],
    scored_at: null,
    after: null,
    outcome: "pending",
    reverted: false,
    ...chain,
    ...overrides,
  } as LedgerLine;
}

function statusLine(ref: string, status: "proposed" | "live" | "void" | "reverted", date: string, extra: Record<string, unknown> = {}): LedgerLine {
  return { kind: "status", id: `s-${ref}-${date}`, date, ref, status, ...extra, ...chain } as LedgerLine;
}

function holdoutLine(urls: string[], until: string): LedgerLine {
  return { kind: "holdout", id: `h-${until}`, run_id: "r0", date: "2026-09-01", urls, until, salt: "holdout-2026-09-01", ...chain } as LedgerLine;
}

function inputs(overrides: Partial<ScoreInputs>): ScoreInputs {
  return {
    generatedAt: `${TODAY}T09:00:00.000Z`,
    today: TODAY,
    gsc: null,
    indexStatus: null,
    crawl: null,
    ledger: [],
    sitemapPaths: [],
    redirectStatus: new Map(),
    marketFacts: new Set(),
    knownBacklinks: null,
    ...overrides,
  };
}

// ------------------------------------------------------------- opportunity

describe("opportunity (the brief's formula)", () => {
  it("is impressions × the CTR gain five positions up", () => {
    expect(targetPosition(12)).toBe(7);
    expect(targetPosition(4)).toBe(1);
    const value = opportunity({ impressions28d: 300, actualCtr: 0.005, position: 12, recencyDiscount: 1, indexDiscount: 1 });
    expect(value).toBeCloseTo(300 * (expectedCtr(7) - 0.005), 10);
  });

  it("applies the recency and index discounts multiplicatively", () => {
    const full = opportunity({ impressions28d: 300, actualCtr: 0.005, position: 12, recencyDiscount: 1, indexDiscount: 1 });
    expect(opportunity({ impressions28d: 300, actualCtr: 0.005, position: 12, recencyDiscount: 0, indexDiscount: 1 })).toBe(0);
    expect(opportunity({ impressions28d: 300, actualCtr: 0.005, position: 12, recencyDiscount: 1, indexDiscount: INDEX_DISCOUNT.crawled_not_indexed })).toBeCloseTo(full * 0.5, 10);
  });

  it("uses the spec's index discounts", () => {
    expect(INDEX_DISCOUNT.indexed).toBe(1);
    expect(INDEX_DISCOUNT.crawled_not_indexed).toBe(0.5);
    expect(INDEX_DISCOUNT.dropped_after_indexed).toBe(0.6);
    expect(INDEX_DISCOUNT.never_crawled).toBe(0.2);
  });

  it("never goes negative and is 0 without a position or impressions", () => {
    expect(opportunity({ impressions28d: 100, actualCtr: 0.9, position: 2, recencyDiscount: 1, indexDiscount: 1 })).toBe(0);
    expect(opportunity({ impressions28d: 100, actualCtr: 0, position: null, recencyDiscount: 1, indexDiscount: 1 })).toBe(0);
    expect(opportunity({ impressions28d: 0, actualCtr: 0, position: 9, recencyDiscount: 1, indexDiscount: 1 })).toBe(0);
  });

  it("honours an explicit target (LOW_CTR scores the gap at the current position)", () => {
    expect(opportunity({ impressions28d: 200, actualCtr: 0, position: 8, target: 8, recencyDiscount: 1, indexDiscount: 1 })).toBeCloseTo(200 * expectedCtr(8), 10);
  });
});

describe("page metrics", () => {
  it("merges duplicate paths, weights position by impressions and normalises URLs", () => {
    const merged = aggregatePageMetrics([
      { page: "/blog/a/", clicks: 1, impressions: 100, position: 10 },
      { page: `${BASE}/blog/a`, clicks: 3, impressions: 300, position: 6 },
    ]);
    const a = merged.get("/blog/a");
    expect(a).toBeDefined();
    expect(a?.clicks).toBe(4);
    expect(a?.impressions).toBe(400);
    expect(a?.position).toBeCloseTo(7, 10);
    expect(a?.ctr).toBeCloseTo(0.01, 10);
  });

  it("normalizePath handles URLs, trailing slashes and the root", () => {
    expect(normalizePath(`${BASE}/blog/x/?utm=1`)).toBe("/blog/x");
    expect(normalizePath("/blog/x/")).toBe("/blog/x");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath(`${BASE}/`)).toBe("/");
  });
});

// ------------------------------------------------------------ GSC reasons

describe("STRIKING_DISTANCE and persistence", () => {
  const sd = cfg.thresholds.strikingDistance;
  const weeklyBar = (sd.minImpressions28d * 7) / 28;

  it("counts weeks at the weekly-scaled impression bar inside the position band, over the last N weeks only", () => {
    const rows = [
      ...WEEKS.slice(-6, -3).map((weekStart) => ({ page: "/blog/a", weekStart, clicks: 0, impressions: weeklyBar, position: 9 })),
      { page: "/blog/a", weekStart: WEEKS.at(-3) as string, clicks: 0, impressions: weeklyBar - 1, position: 9 },
      { page: "/blog/a", weekStart: WEEKS.at(-2) as string, clicks: 0, impressions: 90, position: sd.positionMax + 1 },
      // Outside the last 6 weeks: must not count.
      ...WEEKS.slice(0, 8).map((weekStart) => ({ page: "/blog/a", weekStart, clicks: 0, impressions: 90, position: 9 })),
    ];
    const result = persistence(weeklyByPage(rows).get("/blog/a"), WEEKS, cfg);
    expect(result).toEqual({ qualifying: 3, of: cfg.thresholds.persistence.ofLastWeeks });
  });

  it("needs the 28-day bar, the band and persistence together", () => {
    const m = stats(1, sd.minImpressions28d, 12);
    expect(isStrikingDistance(m, { qualifying: 3 }, cfg)).toBe(true);
    expect(isStrikingDistance(m, { qualifying: 2 }, cfg)).toBe(false);
    expect(isStrikingDistance(stats(1, sd.minImpressions28d - 1, 12), { qualifying: 6 }, cfg)).toBe(false);
    expect(isStrikingDistance(stats(1, 500, sd.positionMin - 0.1), { qualifying: 6 }, cfg)).toBe(false);
    expect(isStrikingDistance(stats(1, 500, sd.positionMax + 0.1), { qualifying: 6 }, cfg)).toBe(false);
    expect(isStrikingDistance(undefined, { qualifying: 6 }, cfg)).toBe(false);
  });

  it("fails closed with no weekly data", () => {
    expect(persistence(undefined, [], cfg)).toEqual({ qualifying: 0, of: 0 });
  });
});

describe("LOW_CTR", () => {
  it("fires when the binomial lower tail is below p and impressions clear the floor", () => {
    const bad = stats(0, 400, 3);
    expect(lowCtrPValue(bad)).toBeLessThan(cfg.thresholds.lowCtr.binomialP);
    expect(isLowCtr(bad, cfg)).toBe(true);
  });

  it("does not fire at the curve's CTR", () => {
    const fine = stats(Math.round(400 * expectedCtr(3)), 400, 3);
    expect(isLowCtr(fine, cfg)).toBe(false);
  });

  it("does not fire below the impression floor even when p is tiny", () => {
    const floor = cfg.thresholds.lowCtr.minImpressions28d;
    expect(isLowCtr(stats(0, floor - 1, 1), cfg)).toBe(false);
    expect(lowCtrPValue(stats(0, 0, 3))).toBeNull();
    expect(lowCtrPValue(stats(0, 10, null))).toBeNull();
  });
});

describe("DECAYING", () => {
  const rows = (prior: number, last: number) =>
    WEEKS.map((weekStart, i) => ({ page: "/blog/d", weekStart, clicks: i < 8 ? prior / 8 : last / 8, impressions: 100, position: 5 }));

  it("compares the last 8 weeks with the prior 8", () => {
    const decay = decayOf(weeklyByPage(rows(80, 40)).get("/blog/d"), WEEKS);
    expect(decay).toEqual({ last: 40, prior: 80, change: -0.5 });
    expect(isDecaying(decay, cfg)).toBe(true);
  });

  it("needs the baseline and the drop share", () => {
    const min = cfg.thresholds.refresh.minBaselineClicks8w;
    expect(isDecaying(decayOf(weeklyByPage(rows(min - 8, 0)).get("/blog/d"), WEEKS), cfg)).toBe(false);
    expect(isDecaying(decayOf(weeklyByPage(rows(80, 64)).get("/blog/d"), WEEKS), cfg)).toBe(false);
    expect(isDecaying(decayOf(weeklyByPage(rows(80, 56)).get("/blog/d"), WEEKS), cfg)).toBe(true);
  });

  it("refuses an unequal split (fewer than 16 weeks)", () => {
    expect(decayOf(weeklyByPage(rows(80, 0)).get("/blog/d"), WEEKS.slice(1))).toBeNull();
  });
});

describe("CANNIBALIZATION", () => {
  it("flags every page with ≥20 impressions on a shared non-brand query", () => {
    const shared = findCannibalization([
      { page: "/blog/a", query: "Cap Rate  Formula", clicks: 0, impressions: 25, ctr: 0, position: 8 },
      { page: "/blog/b", query: "cap rate formula", clicks: 0, impressions: 20, ctr: 0, position: 12 },
      { page: "/blog/c", query: "cap rate formula", clicks: 0, impressions: 19, ctr: 0, position: 30 },
      { page: "/", query: "truecap calculator", clicks: 9, impressions: 400, ctr: 0, position: 1 },
      { page: "/blog/a", query: "truecap calculator", clicks: 0, impressions: 40, ctr: 0, position: 3 },
    ]);
    expect([...shared.keys()].sort()).toEqual(["/blog/a", "/blog/b"]);
    expect(shared.get("/blog/a")?.[0].query).toBe("cap rate formula");
  });

  it("ignores a query only one page ranks for", () => {
    expect(findCannibalization([{ page: "/blog/a", query: "x y", clicks: 0, impressions: 500, ctr: 0, position: 3 }]).size).toBe(0);
  });
});

// -------------------------------------------------------------- redirects

describe("REDIRECTED_WITH_IMPRESSIONS", () => {
  const pages = aggregatePageMetrics([
    { page: "/old-dscr", clicks: 2, impressions: 120, position: 9 },
    { page: "/gone", clicks: 0, impressions: 40, position: 20 },
    { page: "/blog/live", clicks: 0, impressions: 90, position: 7 },
    { page: "/nobody", clicks: 0, impressions: 0, position: 0 },
  ]);
  const sitemap = new Set(["/blog/live"]);

  it("probes only unknown, out-of-sitemap paths with impressions, most impressions first, capped", () => {
    const known = new Map([["/gone", { status: 404, location: null }]]);
    expect(redirectProbeTargets(pages, sitemap, known)).toEqual(["/old-dscr"]);
    const many = aggregatePageMetrics(Array.from({ length: REDIRECT_PROBE_CAP + 10 }, (_, i) => ({ page: `/p${i}`, clicks: 0, impressions: i + 1, position: 9 })));
    const targets = redirectProbeTargets(many, new Set(), new Map());
    expect(targets).toHaveLength(REDIRECT_PROBE_CAP);
    expect(targets[0]).toBe(`/p${REDIRECT_PROBE_CAP + 9}`);
  });

  it("keeps only 3xx statuses", () => {
    const statuses = new Map([
      ["/old-dscr", { status: 308, location: "/blog/dscr" }],
      ["/gone", { status: 404, location: null }],
    ]);
    expect(redirectedWithImpressions(pages, sitemap, statuses)).toEqual([{ path: "/old-dscr", status: 308, location: "/blog/dscr", impressions: 120, clicks: 2 }]);
  });

  it("reads statuses the crawl already has", () => {
    const crawl = crawlOf([page("/blog/moved", { status: 301, finalUrl: `${BASE}/blog/new` })], [], {
      brokenInternalLinks: [{ from: "/blog/a", target: "/old-tool", status: 308 }],
    });
    const known = knownStatuses(crawl);
    expect(known.get("/blog/moved")).toEqual({ status: 301, location: "/blog/new" });
    expect(known.get("/old-tool")).toEqual({ status: 308, location: null });
    expect(knownStatuses(null).size).toBe(0);
  });
});

// ----------------------------------------------------------- query gaps

describe("gap clusters", () => {
  type Landing = { title: string | null; h1: string[]; status: number; fetchError?: string | null };
  const crawlByPath = new Map<string, Landing>([
    ["/blog/cap-rate", { title: "Cap Rate Explained", h1: ["What is a cap rate?"], status: 200 }],
    ["/blog/dscr-basics", { title: "DSCR basics", h1: ["DSCR basics"], status: 200 }],
  ]);
  const sitemapPaths = ["/blog/cap-rate", "/blog/dscr-basics", "/tools/rent-estimator"];
  const q = (query: string, pagePath: string, impressions: number, position: number, clicks = 0) => ({ page: pagePath, query, clicks, impressions, position, ctr: 0 });

  it("tokenises with stopwords and plural folding", () => {
    expect(contentTokens("What are the DSCR loans requirements?")).toEqual(["dscr", "loan", "requirement"]);
    expect(contentTokens("rental properties taxes")).toEqual(["rental", "property", "tax"]);
    expect(tokenCoverage(["dscr", "loan"], ["dscr"])).toBe(0.5);
    expect(jaccard(["a", "b", "c"], ["a", "b", "c", "d"])).toBe(0.75);
  });

  it("finds uncovered queries, clusters them, and routes by intent and rank", () => {
    const queries = aggregateQueries([
      q("dscr loan requirements", "/blog/dscr-basics", 70, 9),
      q("dscr loan requirements 2026", "/blog/dscr-basics", 55, 11),
      q("dscr calculator free", "/blog/dscr-basics", 90, 30),
      q("cap rate explained", "/blog/cap-rate", 400, 4), // covered by the landing title
      q("rent estimator", "/blog/cap-rate", 80, 40), // covered by a sitemap path
      q("truecap reviews", "/blog/cap-rate", 300, 2), // brand
      q("section 8 inspection checklist", "/blog/cap-rate", 49, 25), // below the floor
      q("house hacking fha rules", "/blog/cap-rate", 60, 45),
    ]);
    const { clusters, pageShare, considered } = findGapClusters({ queries, crawlByPath, sitemapPaths, editable: () => true, cfg });
    expect(considered).toBe(6);
    const byKey = new Map(clusters.map((c) => [c.key, c]));
    expect([...byKey.keys()].sort()).toEqual(["dscr-calculator-free", "dscr-loan-requirements", "house-hacking-fha-rules"]);

    const dscr = byKey.get("dscr-loan-requirements");
    expect(dscr?.queries.map((x) => x.query)).toEqual(["dscr loan requirements", "dscr loan requirements 2026"]);
    expect(dscr?.impressions).toBe(125);
    expect(dscr?.intent).toBe("informational");
    expect(dscr?.nearestPage).toBe("/blog/dscr-basics");
    expect(dscr?.route).toBe("striking-distance");

    expect(byKey.get("dscr-calculator-free")?.intent).toBe("calculator");
    expect(byKey.get("dscr-calculator-free")?.route).toBe("tier2-issue");
    expect(byKey.get("house-hacking-fha-rules")?.route).toBe("gap-article");

    const share = pageShare.get("/blog/dscr-basics");
    expect(share?.impressions).toBe(125);
    expect(share?.keys).toEqual(["dscr-loan-requirements"]);
    expect(clusters[0].impressions).toBeGreaterThanOrEqual(clusters[clusters.length - 1].impressions);
  });

  it("routes striking-distance, never a new article, when a page that may not be edited already ranks ≤20", () => {
    const queries = aggregateQueries([q("dscr loan requirements", "/blog/dscr-basics", 70, 9)]);
    const { clusters, pageShare } = findGapClusters({ queries, crawlByPath, sitemapPaths, editable: () => false, cfg });
    expect(clusters.map((c) => [c.key, c.route, c.nearestPage])).toEqual([["dscr-loan-requirements", "striking-distance", "/blog/dscr-basics"]]);
    // The page gets no QUERY_GAP share: the cluster is report-only.
    expect(pageShare.size).toBe(0);
  });

  it("still routes a gap article when the nearest page ranks below the striking-distance band", () => {
    const queries = aggregateQueries([q("house hacking fha rules", "/blog/cap-rate", 60, cfg.thresholds.strikingDistance.positionMax + 1)]);
    const { clusters } = findGapClusters({ queries, crawlByPath, sitemapPaths, editable: () => false, cfg });
    expect(clusters.map((c) => c.route)).toEqual(["gap-article"]);
  });

  it("never calls a query a gap when its landing page was not crawled successfully", () => {
    const withFailures = new Map<string, Landing>([
      ...crawlByPath,
      ["/blog/down", { title: null, h1: [], status: 503 }],
      ["/blog/moved", { title: null, h1: [], status: 308 }],
      ["/blog/timeout", { title: null, h1: [], status: 0, fetchError: "no answer within 20s" }],
    ]);
    const queries = aggregateQueries([
      q("house hacking fha rules", "/blog/down", 60, 45),
      q("brrrr refinance timeline", "/blog/moved", 60, 45),
      q("seller financing contract", "/blog/timeout", 60, 45),
      q("section eight voucher amount", "/blog/not-crawled", 60, 45),
    ]);
    const result = findGapClusters({ queries, crawlByPath: withFailures, sitemapPaths, editable: () => true, cfg });
    expect(result.clusters).toEqual([]);
    expect(result.considered).toBe(4);
    expect(result.unverified).toBe(4);
  });
});

// ----------------------------------------------------------------- ledger

describe("ledger: cooldowns and holdouts", () => {
  it("applies status events by id and by pr:N, in file order", () => {
    const lines = [
      changeLine({ id: "a", url: `${BASE}/blog/a`, date: "2026-09-01" }),
      changeLine({ id: "b", url: "/blog/b", date: "2026-09-01", pr: 7 }),
      changeLine({ id: "c", url: "/blog/c", date: "2026-09-02", pr: 7 }),
      statusLine("a", "live", "2026-09-03", { live_at: "2026-09-03T12:00:00Z", pr: 5 }),
      statusLine("pr:7", "void", "2026-09-04"),
      statusLine("missing", "live", "2026-09-04"),
    ];
    const changes = materializeChanges(lines);
    const byId = new Map(changes.map((c) => [c.id, c]));
    expect(byId.get("a")?.status).toBe("live");
    expect(byId.get("a")?.live_at).toBe("2026-09-03T12:00:00Z");
    expect(byId.get("a")?.pr).toBe(5);
    expect(byId.get("b")?.status).toBe("void");
    expect(byId.get("c")?.status).toBe("void");
  });

  it("dates the last touch from live_at, the proposal date, or the revert; void never counts", () => {
    const changes = materializeChanges([
      changeLine({ id: "live", url: "/blog/live", date: "2026-08-01" }),
      statusLine("live", "live", "2026-08-20", { live_at: "2026-08-20T00:00:00Z" }),
      changeLine({ id: "prop", url: "/blog/prop", date: "2026-09-10" }),
      changeLine({ id: "void", url: "/blog/void", date: "2026-09-20" }),
      statusLine("void", "void", "2026-09-21"),
      changeLine({ id: "rev", url: "/blog/rev", date: "2026-08-01" }),
      statusLine("rev", "live", "2026-08-05", { live_at: "2026-08-05T00:00:00Z" }),
      statusLine("rev", "reverted", "2026-09-15"),
      changeLine({ id: "old", url: "/blog/live", date: "2026-07-01" }),
    ]);
    const touches = lastTouches(changes);
    expect(touches.get("/blog/live")).toBe("2026-08-20");
    expect(touches.get("/blog/prop")).toBe("2026-09-10");
    expect(touches.get("/blog/rev")).toBe("2026-09-15");
    expect(touches.has("/blog/void")).toBe(false);
  });

  it("cools a page for pageTouchCooldownDays after its last touch", () => {
    const days = cfg.caps.pageTouchCooldownDays;
    const touched = addDays(TODAY, -(days - 1));
    expect(cooldownUntil(touched, TODAY, days)).toBe(addDays(touched, days));
    expect(cooldownUntil(addDays(TODAY, -days), TODAY, days)).toBeNull();
    expect(cooldownUntil(null, TODAY, days)).toBeNull();
  });

  it("keeps a holdout active through its `until` date", () => {
    const lines = [holdoutLine([`${BASE}/blog/a`, "/blog/b/"], TODAY), holdoutLine(["/blog/expired"], addDays(TODAY, -1))];
    expect([...activeHoldouts(lines, TODAY)].sort()).toEqual(["/blog/a", "/blog/b"]);
  });
});

// ---------------------------------------------------------------- prune

describe("seo-prune eligibility", () => {
  const prune = cfg.thresholds.prune;
  const eligibleEntry = (): IndexStatusUrl =>
    entry("/blog/p", {
      indexClass: "crawled_not_indexed",
      verdict: "NEUTRAL",
      coverageState: "Crawled - currently not indexed",
      indexed: false,
      everIndexed: false,
      lastCrawlTime: "2026-09-01T00:00:00Z",
      inspectedAt: "2026-09-21T00:00:00Z",
      firstSeenInSitemap: addDays(TODAY, -(prune.minDaysInSitemap + 5)),
      history: [snap("2026-09-01T00:00:00Z", { lastCrawlTime: "2026-08-20T00:00:00Z" })],
    });
  const thinPage = (): CrawlPage => page("/blog/p", { thin: true, dateModified: "2026-08-01" });
  const run = (e: IndexStatusUrl, p: CrawlPage | undefined, impressions = 0, backlinks: number | null = null) =>
    pruneEligibility({ entry: e, page: p, impressions28d: impressions, todayDate: TODAY, cfg, knownBacklinks: backlinks });

  it("passes when every condition holds", () => {
    expect(run(eligibleEntry(), thinPage())).toEqual({ eligible: true, failed: [] });
  });

  it("fails a page that was ever indexed", () => {
    const e = eligibleEntry();
    e.history = [snap("2026-08-01T00:00:00Z", { indexed: true, verdict: "PASS", coverageState: "Submitted and indexed" }), ...e.history];
    expect(run(e, thinPage()).eligible).toBe(false);
  });

  it("needs the same state on two inspections at least 14 days apart", () => {
    const e = eligibleEntry();
    e.history = [snap("2026-09-15T00:00:00Z")];
    const result = run(e, thinPage());
    expect(result.eligible).toBe(false);
    expect(result.failed.join(" ")).toMatch(/same state/);
  });

  it("needs a crawl after the last significant change, and a dateModified to compare", () => {
    expect(run(eligibleEntry(), page("/blog/p", { thin: true, dateModified: "2026-09-10" })).eligible).toBe(false);
    expect(run(eligibleEntry(), page("/blog/p", { thin: true, dateModified: null })).failed.join(" ")).toMatch(/dateModified/);
  });

  it("needs fewer than maxImpressions28d, thin content, enough sitemap age and no known backlinks", () => {
    expect(run(eligibleEntry(), thinPage(), prune.maxImpressions28d).eligible).toBe(false);
    expect(run(eligibleEntry(), page("/blog/p", { thin: false, dateModified: "2026-08-01" })).failed).toContain("not thin");
    const young = eligibleEntry();
    young.firstSeenInSitemap = addDays(TODAY, -10);
    expect(run(young, thinPage()).eligible).toBe(false);
    expect(run(eligibleEntry(), thinPage(), 0, 3).failed).toContain("3 known backlinks");
    expect(run(eligibleEntry(), thinPage(), 0, 0).eligible).toBe(true);
  });
});

// ------------------------------------------------------------ crawl stall

describe("crawl stall profile", () => {
  const cni = (p: string, inspections: string[]): IndexStatusUrl =>
    entry(p, {
      indexClass: "crawled_not_indexed",
      indexed: false,
      verdict: "NEUTRAL",
      coverageState: "Crawled - currently not indexed",
      inspectedAt: inspections[inspections.length - 1],
      history: inspections.slice(0, -1).map((at) => snap(at)),
    });

  it("carries each URL's latest state forward, week by week", () => {
    const trend = crawledNotIndexedTrend([
      cni("/a", ["2026-09-01T00:00:00Z", "2026-09-15T00:00:00Z"]),
      cni("/b", ["2026-09-15T00:00:00Z"]),
      entry("/c", { inspectedAt: "2026-09-08T00:00:00Z" }),
    ]);
    expect(trend).toEqual([1, 1, 2]);
  });

  it("is stalled when the crawled-not-indexed count rose in the last step", () => {
    const status = indexOf([cni("/a", ["2026-09-01T00:00:00Z", "2026-09-15T00:00:00Z"]), cni("/b", ["2026-09-15T00:00:00Z"])]);
    const profile = crawlProfile(status, new Set(["/a", "/b"]), cfg);
    expect(profile.crawledNotIndexedTrend).toEqual([1, 2]);
    expect(profile.crawlStalled).toBe(true);
  });

  it("is stalled when enough sitemap URLs were never crawled", () => {
    const n = cfg.gates.crawlStall.minUnknownUrls;
    const never = Array.from({ length: n }, (_, i) => entry(`/n${i}`, { indexClass: "never_crawled", indexed: false, lastCrawlTime: null }));
    const profile = crawlProfile(indexOf(never), new Set(never.map((e) => e.path)), cfg);
    expect(profile.unknownUrls).toBe(n);
    expect(profile.crawlStalled).toBe(true);
    const fewer = crawlProfile(indexOf(never.slice(1)), new Set(never.map((e) => e.path)), cfg);
    expect(fewer.crawlStalled).toBe(false);
  });

  it("only counts URLs that are in the sitemap", () => {
    const n = cfg.gates.crawlStall.minUnknownUrls;
    const never = Array.from({ length: n }, (_, i) => entry(`/n${i}`, { indexClass: "never_crawled", indexed: false, lastCrawlTime: null }));
    expect(crawlProfile(indexOf(never), new Set(["/n0"]), cfg).unknownUrls).toBe(1);
  });

  it("fails closed to stalled when there is no index-status file", () => {
    expect(crawlProfile(null, new Set(), cfg)).toEqual({ crawlStalled: true, unknownUrls: 0, crawledNotIndexedTrend: [] });
  });
});

// ---------------------------------------------------- structural helpers

describe("structural reasons and routing helpers", () => {
  it("NEEDS_CITATIONS falls back to the external-link count until the crawl records hosts", () => {
    const domains = cfg.primarySourceDomains;
    expect(needsCitations(page("/blog/a", { family: "blog-post", outboundExternal: 0 }), domains)).toBe(true);
    expect(needsCitations(page("/blog/a", { family: "blog-post", outboundExternal: 1 }), domains)).toBe(false);
    expect(needsCitations(page("/vs/a", { family: "vs", outboundExternal: 0 }), domains)).toBe(false);
    const withHosts = (hosts: string[]) => ({ ...page("/blog/a", { family: "blog-post", outboundExternal: hosts.length }), externalHosts: hosts });
    expect(needsCitations(withHosts(["www.example.com"]), domains)).toBe(true);
    expect(needsCitations(withHosts(["www.irs.gov"]), domains)).toBe(false);
    expect(needsCitations(withHosts(["notirs.gov"]), domains)).toBe(true);
  });

  it("NEEDS_CITATIONS never fires on a crawl record that did not answer 200", () => {
    const domains = cfg.primarySourceDomains;
    // The shape crawl.ts writes for a non-200 answer: empty links, no title.
    const record = (status: number, fetchError: string | null) => ({
      ...page("/blog/x", { family: "blog-post", status, title: null, h1: [], outboundExternal: 0, dateModified: null }),
      externalHosts: [],
      fetchError,
    });
    expect(needsCitations(record(503, null), domains)).toBe(false);
    expect(needsCitations(record(404, null), domains)).toBe(false);
    expect(needsCitations(record(308, null), domains)).toBe(false);
    expect(needsCitations(record(0, "no answer within 20s"), domains)).toBe(false);
    expect(needsCitations(record(200, "reset mid-body"), domains)).toBe(false);
    // Control: the same empty links on a page that did answer are a real finding.
    expect(needsCitations(record(200, null), domains)).toBe(true);
  });

  it("reads market-facts keys from the shapes F8 might choose", () => {
    expect([...marketFactsPaths({ _readme: "x", "austin-tx": { rent: 1 }, "/markets/boise-id": {} })].sort()).toEqual(["/markets/austin-tx", "/markets/boise-id"]);
    expect([...marketFactsPaths([{ slug: "austin-tx" }, { path: "/markets/boise-id" }, { url: `${BASE}/markets/reno-nv` }])].sort()).toEqual([
      "/markets/austin-tx",
      "/markets/boise-id",
      "/markets/reno-nv",
    ]);
    expect([...marketFactsPaths({ markets: ["austin-tx"] })]).toEqual(["/markets/austin-tx"]);
    expect(marketFactsPaths(null).size).toBe(0);
  });

  it("routes thin content by family", () => {
    expect(qualitySkill("market-city")).toBe("seo-market-enrich");
    expect(qualitySkill("state")).toBe("seo-market-enrich");
    expect(qualitySkill("blog-post")).toBe("seo-citations");
    expect(qualitySkill("glossary-term")).toBe("seo-citations");
  });

  it("routes by the highest-opportunity routable reason, ties by priority", () => {
    const hit = (reason: Hit["reason"], value: number, skill: Hit["skill"]): Hit => ({ reason, detail: "", opportunity: value, skill });
    expect(routeHits([hit("ORPHAN", 1, "seo-internal-links"), hit("DECAYING", 3, "seo-refresh")])?.reason).toBe("DECAYING");
    expect(routeHits([hit("THIN", 0, "seo-citations"), hit("NOT_INDEXED", 0, "seo-internal-links")])?.reason).toBe("NOT_INDEXED");
    expect(routeHits([hit("CANNIBALIZATION", 9, null), hit("THIN", 0, "seo-citations")])?.reason).toBe("THIN");
    expect(routeHits([hit("CANNIBALIZATION", 9, null)])).toBeNull();
    expect(REASON_PRIORITY).toHaveLength(11);
  });
});

describe("request-indexing list", () => {
  const dropped = (p: string) => entry(p, { indexClass: "dropped_after_indexed", indexed: false, everIndexed: true, lastCrawlTime: "2026-06-20T00:00:00Z" });
  const never = (p: string, first = "2026-08-31") => entry(p, { indexClass: "never_crawled", indexed: false, lastCrawlTime: null, firstSeenInSitemap: first });

  it("puts drops with impressions first, then never-crawled hubs, then the rest", () => {
    const list = requestIndexingList({
      entries: [
        never("/glossary/x", "2026-08-01"),
        dropped("/blog/quiet"),
        never("/glossary"),
        dropped("/blog/busy"),
        dropped("/blog/busier"),
        entry("/blog/cni", { indexClass: "crawled_not_indexed", indexed: false, lastCrawlTime: "2026-06-01T00:00:00Z" }),
        entry("/blog/fine"),
        entry("/blog/excluded", { indexClass: "excluded", indexed: false }),
        never("/blog/held"),
      ],
      current: new Map([["/blog/busy", stats(0, 5, 20)]]),
      prior: new Map([
        ["/blog/busy", stats(0, 10, 12)],
        ["/blog/busier", stats(1, 40, 9)],
      ]),
      skip: new Set(["/blog/held"]),
    });
    expect(list.map((x) => x.path)).toEqual(["/blog/busier", "/blog/busy", "/glossary", "/glossary/x", "/blog/quiet", "/blog/cni"]);
    expect(list[1].why).toMatch(/15 impressions/);
    expect(list[2].why).toMatch(/hub/);
  });

  it("is capped", () => {
    const many = Array.from({ length: REQUEST_INDEXING_MAX + 5 }, (_, i) => never(`/blog/n${String(i).padStart(3, "0")}`));
    expect(requestIndexingList({ entries: many, current: new Map(), prior: new Map(), skip: new Set() })).toHaveLength(REQUEST_INDEXING_MAX);
  });
});

// ------------------------------------------------------------ end to end

function scenario(): ScoreInputs {
  const sd = cfg.thresholds.strikingDistance;
  const weeklyBar = (sd.minImpressions28d * 7) / 28;
  const persistentWeeks = WEEKS.slice(-4);
  const weeklyRows = (p: string) => persistentWeeks.map((weekStart) => ({ page: p, weekStart, clicks: 0, impressions: weeklyBar + 5, position: 11 }));
  const blogPaths = ["/blog/striking", "/blog/cooling", "/blog/held", "/blog/dropped", "/blog/never", "/blog/prune", "/blog/cni-links", "/blog/uncited", "/blog/fine"];
  const sitemapPaths = [...blogPaths, "/markets/austin-tx", "/markets/boise-id", "/markets", "/pricing"];
  const cniState = { indexClass: "crawled_not_indexed" as const, indexed: false, verdict: "NEUTRAL", coverageState: "Crawled - currently not indexed", everIndexed: false };
  return inputs({
    sitemapPaths,
    gsc: gscOf({
      pages: [
        { page: "/blog/striking", clicks: 1, impressions: 300, position: 11.5 },
        { page: "/blog/cooling", clicks: 1, impressions: 300, position: 11.5 },
        { page: "/blog/held", clicks: 0, impressions: 300, position: 11.5 },
        { page: "/pricing", clicks: 1, impressions: 300, position: 11.5 },
        { page: "/old-dscr", clicks: 2, impressions: 120, position: 9 },
        { page: "/blog/fine", clicks: 20, impressions: 200, position: 3 },
      ],
      prior: [{ page: "/blog/dropped", clicks: 1, impressions: 40, position: 14 }],
      queries: [
        { page: "/blog/striking", query: "cap rate formula", clicks: 0, impressions: 25, position: 11 },
        { page: "/blog/cooling", query: "cap rate formula", clicks: 0, impressions: 22, position: 13 },
        { page: "/blog/striking", query: "dscr loan requirements", clicks: 0, impressions: 70, position: 9 },
        { page: "/blog/fine", query: "dscr calculator free", clicks: 0, impressions: 90, position: 30 },
        { page: "/blog/fine", query: "truecap", clicks: 20, impressions: 100, position: 1 },
      ],
      weekly: [...weeklyRows("/blog/striking"), ...weeklyRows("/blog/cooling"), ...weeklyRows("/blog/held"), ...weeklyRows("/pricing")],
    }),
    indexStatus: indexOf([
      ...["/blog/striking", "/blog/cooling", "/blog/uncited", "/blog/fine", "/markets/austin-tx", "/markets/boise-id", "/pricing"].map((p) => entry(p)),
      entry("/blog/held", { indexClass: "never_crawled", indexed: false, lastCrawlTime: null }),
      entry("/blog/dropped", { indexClass: "dropped_after_indexed", indexed: false, everIndexed: true, verdict: "NEUTRAL", coverageState: "Crawled - currently not indexed" }),
      entry("/blog/never", { indexClass: "never_crawled", indexed: false, lastCrawlTime: null, coverageState: "URL is unknown to Google" }),
      entry("/markets", { indexClass: "never_crawled", indexed: false, lastCrawlTime: null }),
      entry("/blog/prune", {
        ...cniState,
        lastCrawlTime: "2026-09-01T00:00:00Z",
        inspectedAt: "2026-09-21T00:00:00Z",
        firstSeenInSitemap: "2026-05-01",
        history: [snap("2026-09-01T00:00:00Z")],
      }),
      entry("/blog/cni-links", { ...cniState, lastCrawlTime: "2026-06-01T00:00:00Z", inspectedAt: "2026-09-21T00:00:00Z" }),
    ]),
    crawl: crawlOf(
      [
        ...["/blog/striking", "/blog/cooling", "/blog/held", "/blog/never", "/blog/cni-links", "/blog/fine"].map((p) => page(p, { family: "blog-post", title: "Cap rate formula" })),
        page("/blog/dropped", { family: "blog-post", thin: true }),
        page("/blog/prune", { family: "blog-post", thin: true, dateModified: "2026-08-01" }),
        page("/blog/uncited", { family: "blog-post", outboundExternal: 0 }),
        page("/markets/austin-tx", { family: "market-city" }),
        page("/markets/boise-id", { family: "market-city" }),
        page("/markets", { family: "hub" }),
        page("/pricing", { thin: true, wordCount: 200 }),
      ],
      ["/blog/never"],
    ),
    ledger: [
      changeLine({ id: "cool", url: `${BASE}/blog/cooling`, date: addDays(TODAY, -12) }),
      statusLine("cool", "live", addDays(TODAY, -10), { live_at: `${addDays(TODAY, -10)}T00:00:00Z` }),
      holdoutLine([`${BASE}/blog/held`], addDays(TODAY, 30)),
    ],
    redirectStatus: new Map([["/old-dscr", { status: 308, location: "/blog/dscr" }]]),
    marketFacts: new Set(["/markets/austin-tx"]),
  });
}

describe("buildCandidates end to end", () => {
  const out = buildCandidates(scenario(), cfg);
  const byPath = new Map(out.candidates.map((c) => [c.path, c]));
  const reportOnly = new Map(out.reportOnly.map((r) => [r.path, r]));

  it("routes each page to the skill the spec's table names", () => {
    expect(byPath.get("/blog/striking")?.skill).toBe("seo-striking-distance");
    expect(byPath.get("/blog/never")?.skill).toBe("seo-internal-links");
    expect(byPath.get("/blog/prune")?.skill).toBe("seo-prune");
    expect(byPath.get("/blog/cni-links")?.skill).toBe("seo-internal-links");
    expect(byPath.get("/blog/uncited")?.skill).toBe("seo-citations");
    expect(byPath.get("/markets/boise-id")?.skill).toBe("seo-market-enrich");
  });

  it("gives a striking-distance page every reason it earns, in priority order", () => {
    const reasons = byPath.get("/blog/striking")?.reasons.map((r) => r.reason);
    expect(reasons).toEqual(["STRIKING_DISTANCE", "LOW_CTR", "QUERY_GAP", "CANNIBALIZATION"]);
    const c = byPath.get("/blog/striking");
    expect(c?.opportunity).toBeCloseTo(300 * (expectedCtr(6.5) - 1 / 300), 4);
    expect(c?.metrics).toEqual({ clicks28d: 1, impressions28d: 300, ctr28d: 0.0033, position28d: 11.5 });
    expect(c?.editableSource).toBe("app/blog/striking/page.tsx");
    expect(c?.cooldownUntil).toBeNull();
    expect(c?.topQueries[0]).toEqual({ query: "dscr loan requirements", impressions: 70, clicks: 0, position: 9 });
  });

  it("keeps a page in cooldown listed but scored zero, below pages a run may edit", () => {
    const cooling = byPath.get("/blog/cooling");
    expect(cooling?.opportunity).toBe(0);
    expect(cooling?.cooldownUntil).toBe(addDays(addDays(TODAY, -10), cfg.caps.pageTouchCooldownDays));
    const zeroTier = out.candidates.filter((c) => c.opportunity === 0);
    expect(zeroTier[zeroTier.length - 1].path).toBe("/blog/cooling");
  });

  it("gives a holdout page nothing at all", () => {
    const everywhere = [...out.candidates.map((c) => c.path), ...out.reportOnly.map((r) => r.path), ...out.requestIndexing.map((r) => r.path)];
    expect(everywhere).not.toContain("/blog/held");
  });

  it("never makes an excluded page a candidate or gives it GSC reasons", () => {
    expect(byPath.has("/pricing")).toBe(false);
    expect(byPath.has("/markets")).toBe(false);
    const pricing = reportOnly.get("/pricing");
    expect(pricing?.reasons.map((r) => r.reason)).toEqual(["THIN"]);
    expect(pricing?.why).toMatch(/excluded/);
  });

  it("vetoes edits on a page that dropped out of the index and queues it for Request indexing", () => {
    expect(byPath.has("/blog/dropped")).toBe(false);
    expect(reportOnly.get("/blog/dropped")?.why).toMatch(/request indexing, no edit/);
    expect(out.requestIndexing[0].path).toBe("/blog/dropped");
  });

  it("orders request indexing: drops with impressions, never-crawled hubs, never-crawled, the rest; skips prune candidates", () => {
    expect(out.requestIndexing.map((r) => r.path)).toEqual(["/blog/dropped", "/markets", "/blog/never", "/blog/cni-links"]);
  });

  it("reports a redirected GSC page outside the sitemap without routing it", () => {
    const redirected = reportOnly.get("/old-dscr");
    expect(redirected?.reasons[0].reason).toBe("REDIRECTED_WITH_IMPRESSIONS");
    expect(redirected?.reasons[0].detail).toMatch(/308 redirect to \/blog\/dscr/);
  });

  it("adds ORPHAN from the link graph and MARKET_ENRICH only where facts are missing", () => {
    expect(byPath.get("/blog/never")?.reasons.map((r) => r.reason)).toEqual(["NOT_INDEXED", "ORPHAN"]);
    expect(byPath.has("/markets/austin-tx")).toBe(false);
  });

  it("builds gap clusters and the stall profile", () => {
    expect(out.gapClusters.map((c) => [c.key, c.route])).toEqual([
      ["dscr-calculator-free", "tier2-issue"],
      ["dscr-loan-requirements", "striking-distance"],
    ]);
    expect(out.profile.crawlStalled).toBe(true);
    // Week of 08-31: /blog/prune. Week of 09-21: /blog/prune, /blog/cni-links and /blog/dropped
    // (a drop sits in Google's "Crawled - currently not indexed" bucket too).
    expect(out.profile.crawledNotIndexedTrend).toEqual([1, 3]);
  });

  it("lists dormant skills with what they need and the nearest miss", () => {
    const dormant = new Map(out.dormant.map((d) => [d.skill, d]));
    expect(dormant.has("seo-striking-distance")).toBe(false);
    expect(dormant.has("seo-data-study" as never)).toBe(false);
    // Both copies qualify for LOW_CTR (p≈0.04) but out-score it on striking distance; the tie goes to the path.
    expect(dormant.get("seo-ctr")?.current).toMatch(/^0 pages; best is \/blog\/cooling: 1 clicks on 300 impr at pos 11\.5 \(p=0\.04\); routed to seo-striking-distance$/);
    expect(dormant.get("seo-refresh")?.current).toMatch(/0 pages/);
    expect(dormant.get("seo-gap-article")?.current).toMatch(/^crawl stalled/);
    for (const d of out.dormant) expect(ROUTED_SKILLS).toContain(d.skill);
  });

  it("sorts by opportunity, then reason count, then path", () => {
    for (let i = 1; i < out.candidates.length; i += 1) {
      const [a, b] = [out.candidates[i - 1], out.candidates[i]];
      expect(a.opportunity).toBeGreaterThanOrEqual(b.opportunity);
      if (a.opportunity === b.opportunity && (a.cooldownUntil === null) === (b.cooldownUntil === null)) {
        expect(a.reasons.length > b.reasons.length || (a.reasons.length === b.reasons.length && a.path < b.path)).toBe(true);
      }
    }
  });

  it("is deterministic and plain JSON", () => {
    const again = buildCandidates(scenario(), cfg);
    expect(again).toEqual(out);
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
    for (const c of out.candidates) {
      expect(c.reasons.length).toBeGreaterThan(0);
      expect(ROUTED_SKILLS).toContain(c.skill);
    }
  });
});

describe("buildCandidates with a crawl fetch that failed", () => {
  const failed = crawlOf([
    { ...page("/blog/x", { family: "blog-post", status: 503, title: null, h1: [], outboundExternal: 0, dateModified: null, mainHash: "" }), externalHosts: [], fetchError: null } as CrawlPage,
  ]);

  it("does not route a blog post that returned 503 to seo-citations", () => {
    const out = buildCandidates(inputs({ sitemapPaths: ["/blog/x"], crawl: failed }), cfg);
    expect(out.candidates).toEqual([]);
    expect(out.reportOnly).toEqual([]);
  });

  it("does not count the failed fetch as a quality failure on the crawled-not-indexed path", () => {
    const cni = entry("/blog/x", {
      indexClass: "crawled_not_indexed",
      indexed: false,
      everIndexed: false,
      verdict: "NEUTRAL",
      coverageState: "Crawled - currently not indexed",
      lastCrawlTime: "2026-09-01T00:00:00Z",
    });
    const out = buildCandidates(inputs({ sitemapPaths: ["/blog/x"], crawl: failed, indexStatus: indexOf([cni]) }), cfg);
    expect(out.candidates.map((c) => [c.path, c.skill, c.reasons.map((r) => r.reason)])).toEqual([["/blog/x", "seo-internal-links", ["NOT_INDEXED"]]]);
  });
});

describe("gap routing around pages a run may not edit", () => {
  const rankingAt4 = (landing: string) =>
    gscOf({
      pages: [{ page: landing, clicks: 0, impressions: 80, position: 4 }],
      queries: [{ page: landing, query: "dscr loan rules", clicks: 0, impressions: 80, position: 4 }],
    });

  it("never proposes a gap article for a query a holdout page already ranks for", () => {
    const out = buildCandidates(
      inputs({
        sitemapPaths: ["/blog/held"],
        gsc: rankingAt4("/blog/held"),
        crawl: crawlOf([page("/blog/held", { family: "blog-post", title: "Cap rate formula", h1: ["Cap rate formula"] })]),
        ledger: [holdoutLine([`${BASE}/blog/held`], addDays(TODAY, 30))],
      }),
      cfg,
    );
    expect(out.gapClusters.map((c) => [c.key, c.route, c.nearestPage])).toEqual([["dscr-loan-rules", "striking-distance", "/blog/held"]]);
    expect(out.candidates).toEqual([]);
    expect(out.dormant.find((d) => d.skill === "seo-gap-article")?.current).toMatch(/; 0 gap-article clusters waiting$/);
  });

  it("never proposes a gap article that would compete with an excluded page", () => {
    const out = buildCandidates(
      inputs({
        sitemapPaths: ["/"],
        gsc: rankingAt4("/"),
        crawl: crawlOf([page("/", { family: "home", title: "Rental property calculator", h1: ["Analyze the deal"] })]),
      }),
      cfg,
    );
    expect(out.gapClusters.map((c) => [c.key, c.route, c.nearestPage])).toEqual([["dscr-loan-rules", "striking-distance", "/"]]);
    expect(out.candidates).toEqual([]);
  });
});

describe("buildCandidates with missing inputs", () => {
  it("still scores structural reasons without GSC data", () => {
    const out = buildCandidates(inputs({ sitemapPaths: ["/markets/austin-tx"], marketFacts: null }), cfg);
    expect(out.candidates.map((c) => [c.path, c.skill])).toEqual([["/markets/austin-tx", "seo-market-enrich"]]);
    expect(out.candidates[0].reasons[0].detail).toMatch(/file not created yet/);
    expect(out.gapClusters).toEqual([]);
    expect(out.profile.crawlStalled).toBe(true);
  });
});

// -------------------------------------------------------------------- CLI

describe("score.ts CLI (no network: --sitemap-file, --no-probe)", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "seo-score-"));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  const run = (dataDir: string, stateDir: string, extra: string[] = []) =>
    execFileSync(process.execPath, [SCRIPT, "--sitemap-file", path.join(tmp, "sitemap.json"), "--no-probe", ...extra], {
      cwd: REPO,
      env: { ...process.env, SEO_TODAY: TODAY, SEO_DATA_DIR: dataDir, SEO_STATE_DIR: stateDir },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

  it("writes candidates-<date>.json from the data dir and ledger", () => {
    const s = scenario();
    const dataDir = path.join(tmp, "data");
    const stateDir = path.join(tmp, "state");
    mkdirSync(dataDir, { recursive: true });
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(path.join(tmp, "sitemap.json"), JSON.stringify(s.sitemapPaths));
    writeFileSync(path.join(dataDir, `gsc-${TODAY}.json`), JSON.stringify(s.gsc));
    writeFileSync(path.join(dataDir, `crawl-${TODAY}.json`), JSON.stringify(s.crawl));
    writeFileSync(path.join(dataDir, "index-status.json"), JSON.stringify(s.indexStatus));
    writeFileSync(path.join(stateDir, "ledger.jsonl"), s.ledger.map((l) => JSON.stringify(l)).join("\n") + "\n");

    const stdout = run(dataDir, stateDir);
    const summary = JSON.parse(stdout.trim().split("\n").pop() as string) as { candidates: number; crawlStalled: boolean };
    const file = path.join(dataDir, `candidates-${TODAY}.json`);
    expect(existsSync(file)).toBe(true);
    const written = JSON.parse(readFileSync(file, "utf8")) as ReturnType<typeof buildCandidates>;
    expect(summary.candidates).toBe(written.candidates.length);
    expect(summary.crawlStalled).toBe(true);
    const paths = written.candidates.map((c) => c.path);
    expect(paths).toContain("/blog/striking");
    expect(paths).not.toContain("/blog/held");
    expect(written.requestIndexing[0].path).toBe("/blog/dropped");
  });

  it("exits 1 when no input artifact exists", () => {
    const empty = path.join(tmp, "empty");
    mkdirSync(empty, { recursive: true });
    let code = 0;
    let stderr = "";
    try {
      run(empty, empty);
    } catch (error) {
      const failure = error as { status: number; stderr: string };
      code = failure.status;
      stderr = failure.stderr;
    }
    expect(code).toBe(1);
    expect(stderr).toMatch(/no inputs/);
  });
});

describe("pre-existing fence failures", () => {
  it("flags prose injected with dangerouslySetInnerHTML but not JSON-LD scripts", async () => {
    const { preexistingFenceFailure } = await import("../../seo/scripts/score.ts");
    const jsonLd = `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />`;
    const prose = `<p dangerouslySetInnerHTML={{ __html: "<strong>x</strong>" }} />`;
    expect(preexistingFenceFailure(jsonLd)).toBe(false);
    expect(preexistingFenceFailure(`${jsonLd}\n${prose}`)).toBe(true);
    expect(preexistingFenceFailure("no html injection here")).toBe(false);
  });
});

describe("market-data thin tag (F8, lib/markets/thin.ts)", () => {
  it("tags MARKET_ENRICH on a page that crawled as data-market-data=thin, and only there", async () => {
    const { MARKET_DATA_THIN_TAG } = await import("../../seo/scripts/score.ts");
    const market = (p: string, marketData: "thin" | "enriched" | null) =>
      ({ ...page(p, { family: "market-city" }), marketData }) as CrawlPage;
    const out = buildCandidates(
      {
        generatedAt: `${TODAY}T08:00:00.000Z`,
        today: TODAY,
        gsc: null,
        indexStatus: null,
        crawl: crawlOf([market("/markets/boise", "thin"), market("/markets/columbus", "enriched"), market("/markets/reno", null)]),
        ledger: [],
        sitemapPaths: ["/markets/boise", "/markets/columbus", "/markets/reno"],
        redirectStatus: new Map(),
        marketFacts: new Set<string>(),
        knownBacklinks: null,
      },
      cfg,
    );
    const detail = (p: string) => out.candidates.find((c) => c.path === p)?.reasons.find((r) => r.reason === "MARKET_ENRICH")?.detail ?? "";
    expect(MARKET_DATA_THIN_TAG).toBe("market-data-thin");
    expect(detail("/markets/boise")).toContain(`tag: ${MARKET_DATA_THIN_TAG}`);
    expect(detail("/markets/columbus")).not.toContain(MARKET_DATA_THIN_TAG);
    expect(detail("/markets/reno")).not.toContain(MARKET_DATA_THIN_TAG);
    // A signal, never an index rule: every page stays a MARKET_ENRICH candidate for seo-market-enrich.
    for (const p of ["/markets/boise", "/markets/columbus", "/markets/reno"]) {
      expect(out.candidates.find((c) => c.path === p)?.skill).toBe("seo-market-enrich");
    }
  });
});
