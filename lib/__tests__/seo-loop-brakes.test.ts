import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "../../seo/scripts/lib/cli.ts";
import { loadConfig } from "../../seo/scripts/lib/config.ts";
import type { Crawl, CrawlPage, GscPull, Halt, IndexStatus, IndexStatusUrl, InspectionSnapshot } from "../../seo/scripts/lib/types.ts";
import {
  NOINDEX_FILE,
  baselineSnapshot,
  chooseReference,
  evaluateBrakes,
  evaluateDemotedChangeTypes,
  evaluateGscPageLosses,
  evaluateIndexDrops,
  evaluatePageRegression,
  evaluateSiteWide,
  isHalted,
  isPruneChange,
  main,
  nextHalt,
  ownerChangeSince,
  revertRequests,
  selectAttributable,
  stopState,
} from "../../seo/scripts/brakes.ts";
import type { BrakesInputs, BrakesReport } from "../../seo/scripts/brakes.ts";
import { GENESIS, chainLine, eventId } from "../../seo/scripts/ledger.ts";
import type { CrawlSnapshot, GlobalEvent, LedgerChangeRecord, LedgerRecord, StatusEvent } from "../../seo/scripts/ledger.ts";

/**
 * seo/scripts/brakes.ts — the loop's stop conditions. Every evaluator is pure
 * and tested with inline fixtures; the CLI runs in a temp state dir
 * (SEO_STATE_DIR / SEO_DATA_DIR / SEO_TODAY). No network, and brakes never
 * runs git: the only side effects are brakes-<date>.json and halt.json.
 */

const cfg = loadConfig();
const LIVE = "2026-06-03T15:00:00.000Z"; // a Wednesday

// ------------------------------------------------------------- fixtures

function change(over: Partial<LedgerChangeRecord> = {}): LedgerChangeRecord {
  return {
    kind: "change",
    id: "c-x",
    run_id: "100",
    date: "2026-06-01",
    url: "/blog/x",
    file: "app/blog/x/page.tsx",
    tier: 1,
    change_type: "title-rewrite",
    skill: "seo-ctr",
    summary: "s",
    pr: 12,
    status: "live",
    live_at: LIVE,
    before: { clicks_28d: 0, impressions_28d: 0, position: null, indexed: true, coverageState: null, lastCrawlTime: null, mainHash: null },
    holdout: ["/blog/h1", "/blog/h2"],
    scored_at: null,
    after: null,
    outcome: "pending",
    reverted: false,
    ...over,
  };
}

function snap(over: Partial<CrawlSnapshot> = {}): CrawlSnapshot {
  return {
    crawledAt: "2026-06-01T09:00:00.000Z",
    status: 200,
    noindex: false,
    canonicalIsSelf: true,
    jsonLdTypes: ["Article", "BreadcrumbList"],
    brokenTargets: [],
    linkTargets: ["/blog/old-link"],
    ...over,
  };
}

function crawlPage(p: string, over: Partial<CrawlPage> = {}): CrawlPage {
  return {
    url: `https://usetruecap.com${p}`,
    path: p,
    family: "blog-post",
    status: 200,
    finalUrl: null,
    title: "T",
    metaDescription: "D",
    h1: ["H"],
    canonical: `https://usetruecap.com${p}`,
    canonicalIsSelf: true,
    robots: null,
    noindex: false,
    jsonLdTypes: ["Article", "BreadcrumbList"],
    jsonLdParseErrors: 0,
    datePublished: null,
    dateModified: null,
    visibleUpdatedDate: null,
    wordCount: 900,
    mainHash: "h",
    uniqueRatio: null,
    thin: false,
    outboundInternal: 1,
    outboundExternal: 0,
    inboundContextual: 1,
    inboundTotal: 1,
    depth: 1,
    textFile: "pages/x.txt",
    ...over,
  };
}

function crawl(generatedAt: string, pages: CrawlPage[], over: Partial<Crawl> = {}): Crawl {
  return {
    generatedAt,
    base: "https://usetruecap.com",
    sitemapCount: pages.length,
    pages,
    linkGraph: { ran: true, reason: null, edges: [], orphans: [] },
    issues: {
      duplicateTitles: [],
      duplicateDescriptions: [],
      missingTitles: [],
      missingDescriptions: [],
      orphans: [],
      deeperThan3: [],
      brokenInternalLinks: [],
      nonSelfCanonical: [],
      noindexInSitemap: [],
      non200: [],
    },
    healthcheckFindings: [],
    ...over,
  };
}

const WEEKS = Array.from({ length: 16 }, (_, i) => new Date(Date.UTC(2026, 3, 6 + i * 7)).toISOString().slice(0, 10));
const beforeLive = (week: string): boolean => week < "2026-06-03";

/**
 * Weekly rows: each page gets clicks(week) clicks and `impressions` impressions
 * per week, for the complete weeks up to `lastWeek` (what GSC has final data
 * for on the evaluation date). `totals` are the last weeks' site clicks.
 */
function gsc(weekly: Record<string, (week: string) => number>, opts: { impressions?: number; totals?: number[]; lastWeek?: string } = {}): GscPull {
  const { impressions = 50, totals = [], lastWeek = WEEKS[WEEKS.length - 1] } = opts;
  const weeks = WEEKS.filter((w) => w <= lastWeek);
  return {
    generatedAt: "2026-06-29T00:00:00.000Z",
    site: "sc-domain:usetruecap.com",
    windows: { current: { startDate: "2026-05-29", endDate: "2026-06-25" }, prior: { startDate: "2026-05-01", endDate: "2026-05-28" } },
    totals: { current: { clicks: 0, impressions: 0, ctr: 0, position: 0 }, prior: { clicks: 0, impressions: 0, ctr: 0, position: 0 } },
    pages: { current: [], prior: [] },
    pageQueries: { current: [], prior: [] },
    weekly: {
      weeks,
      rows: Object.entries(weekly).flatMap(([page, clicks]) => weeks.map((weekStart) => ({ page, weekStart, clicks: clicks(weekStart), impressions, ctr: 0, position: 9 }))),
    },
    weeklyTotals: totals.map((clicks, i) => ({ weekStart: weeks[weeks.length - totals.length + i], clicks, impressions: 1000, ctr: 0, position: 30 })),
  };
}

function inspection(inspectedAt: string, indexed: boolean, coverageState: string): InspectionSnapshot {
  return { inspectedAt, source: "api", verdict: indexed ? "PASS" : "NEUTRAL", coverageState, indexingState: null, robotsTxtState: null, pageFetchState: null, lastCrawlTime: null, googleCanonical: null, userCanonical: null, indexed };
}

function indexStatus(p: string, history: InspectionSnapshot[]): IndexStatus {
  const latest = history[history.length - 1];
  const entry: IndexStatusUrl = {
    ...latest,
    url: `https://usetruecap.com${p}`,
    path: p,
    family: "blog-post",
    sitemap: [],
    referringUrls: [],
    firstSeenInSitemap: null,
    everIndexed: history.some((h) => h.indexed),
    indexClass: latest.indexed ? "indexed" : "dropped_after_indexed",
    mainHashAtInspect: null,
    wordCount: null,
    uniqueRatio: null,
    thin: null,
    history: history.slice(0, -1),
  };
  return {
    generatedAt: latest.inspectedAt,
    site: "sc-domain:usetruecap.com",
    sitemapReport: [],
    quota: { day: "2026-06-20", used: 0 },
    summary: { total: 1, indexed: 0, byClass: {} as IndexStatus["summary"]["byClass"], byFamily: {} },
    urls: { [entry.url]: entry },
  };
}

// -------------------------------------------------------------- halting

describe("isHalted", () => {
  it("halts until the founder's ack matches the halt id", () => {
    const halt: Halt = { halted: true, since: "2026-06-16T00:00:00.000Z", reason: "r", id: "wow-2026-06-08", clearWithAck: "wow-2026-06-08" };
    expect(isHalted(halt, "")).toBe(true);
    expect(isHalted(halt, null)).toBe(true);
    expect(isHalted(halt, "wow-2026-06-01")).toBe(true);
    expect(isHalted(halt, "wow-2026-06-08")).toBe(false);
    expect(isHalted(halt, "  wow-2026-06-08\n")).toBe(false);
  });

  it("is not halted without a halted:true file, and a halt without an ack id cannot be acked", () => {
    expect(isHalted(null, "x")).toBe(false);
    expect(isHalted({ halted: false }, "")).toBe(false);
    expect(isHalted({}, "")).toBe(false);
    expect(isHalted({ halted: true, clearWithAck: null }, "anything")).toBe(true);
  });
});

describe("evaluateSiteWide", () => {
  it("applies a drop above dropShare once the prior week has enough clicks", () => {
    const { siteWide, latestWeekStart } = evaluateSiteWide(gsc({}, { totals: [60, 100, 70] }), cfg);
    expect(siteWide).toMatchObject({ triggered: true, applied: true, priorWeekClicks: 100, latestWeekClicks: 70, dropShare: 0.3 });
    expect(siteWide.note).toMatch(/stops making changes/);
    expect(latestWeekStart).toBe(WEEKS[15]);
  });

  it("is report-only below the volume floor, and quiet within the brake", () => {
    const small = evaluateSiteWide(gsc({}, { totals: [7, 3] }), cfg).siteWide;
    expect(small).toMatchObject({ triggered: true, applied: false, dropShare: 0.5714 });
    expect(small.note).toMatch(/below the volume floor.*report-only/);
    const exact = evaluateSiteWide(gsc({}, { totals: [100, 80] }), cfg).siteWide;
    expect(exact).toMatchObject({ triggered: false, applied: false, dropShare: 0.2 }); // exactly 20% is not "more than"
    expect(evaluateSiteWide(gsc({}, { totals: [50, 90] }), cfg).siteWide).toMatchObject({ triggered: false, dropShare: -0.8 });
  });

  it("compares the latest two weeks whatever order the pull lists them in", () => {
    const pull = gsc({}, { totals: [100, 70] });
    pull.weeklyTotals.reverse();
    expect(evaluateSiteWide(pull, cfg).siteWide).toMatchObject({ priorWeekClicks: 100, latestWeekClicks: 70 });
  });

  it("says why it did not run", () => {
    expect(evaluateSiteWide(null, cfg).siteWide).toMatchObject({ triggered: false, applied: false, dropShare: null, note: expect.stringMatching(/no GSC pull/) });
    expect(evaluateSiteWide(gsc({}, { totals: [100] }), cfg).siteWide.note).toMatch(/fewer than two/);
    expect(evaluateSiteWide(gsc({}, { totals: [0, 0] }), cfg).siteWide).toMatchObject({ triggered: false, dropShare: null });
  });
});

describe("nextHalt", () => {
  const applied = evaluateSiteWide(gsc({}, { totals: [100, 70] }), cfg);
  const week = applied.latestWeekStart;

  it("writes a halt whose ack id is the triggering week", () => {
    expect(nextHalt(null, applied.siteWide, week, "2026-07-27T00:00:00.000Z", null)).toEqual({
      halted: true,
      since: "2026-07-27T00:00:00.000Z",
      reason: `${applied.siteWide.note}.`,
      id: `wow-${week}`,
      clearWithAck: `wow-${week}`,
    });
  });

  it("leaves halt.json alone when the brake did not apply or the same week already halted", () => {
    const report = evaluateSiteWide(gsc({}, { totals: [7, 3] }), cfg);
    expect(nextHalt(null, report.siteWide, report.latestWeekStart, "now", null)).toBeNull();
    const halt = nextHalt(null, applied.siteWide, week, "now", null);
    expect(nextHalt(halt, applied.siteWide, week, "later", null)).toBeNull();
    expect(nextHalt(halt, applied.siteWide, week, "later", halt?.id ?? null)).toBeNull(); // an acked week stays cleared
  });

  it("carries a still-open earlier halt into the new one, and starts fresh after an ack", () => {
    const old: Halt = { halted: true, since: "2026-07-01T00:00:00.000Z", reason: "older drop", id: "wow-2026-06-22", clearWithAck: "wow-2026-06-22" };
    const carried = nextHalt(old, applied.siteWide, week, "2026-07-27T00:00:00.000Z", null);
    expect(carried).toMatchObject({ since: "2026-07-01T00:00:00.000Z", id: `wow-${week}` });
    expect(carried?.reason).toMatch(/Still open from wow-2026-06-22: older drop/);
    const fresh = nextHalt(old, applied.siteWide, week, "2026-07-27T00:00:00.000Z", "wow-2026-06-22");
    expect(fresh).toMatchObject({ since: "2026-07-27T00:00:00.000Z" });
    expect(fresh?.reason).not.toMatch(/Still open/);
  });
});

// ------------------------------------------------------ page regressions

describe("evaluatePageRegression", () => {
  const checks = (now: CrawlSnapshot | null, ref: CrawlSnapshot | null, over: Partial<LedgerChangeRecord> = {}, full = true): string[] =>
    evaluatePageRegression(change(over), now, ref, full).map((r) => r.check);

  it("flags each deterministic regression with the revert action and the PR", () => {
    const [status] = evaluatePageRegression(change(), snap({ status: 404 }), snap(), true);
    expect(status).toEqual({ ledgerId: "c-x", path: "/blog/x", pr: 12, check: "status", detail: expect.stringMatching(/HTTP 404/), action: "revert" });
    expect(checks(snap({ noindex: true }), snap())).toEqual(["noindex"]);
    expect(checks(snap({ canonicalIsSelf: false }), snap())).toEqual(["canonical"]);
    expect(checks(snap({ jsonLdTypes: ["Article"] }), snap())).toEqual(["jsonld"]);
    expect(checks(null, snap())).toEqual(["sitemap"]);
  });

  it("counts only broken links the change added, not an old link whose target broke later", () => {
    const [flag] = evaluatePageRegression(change(), snap({ brokenTargets: ["/blog/old-link", "/blog/typo"] }), snap(), true);
    expect(flag).toMatchObject({ check: "broken-links", detail: "new broken internal link(s): /blog/typo" });
    expect(checks(snap({ brokenTargets: ["/blog/old-link"] }), snap())).toEqual([]);
    expect(checks(snap({ brokenTargets: ["/blog/a"] }), snap({ brokenTargets: ["/blog/a"] }))).toEqual([]);
    expect(checks(snap({ brokenTargets: ["/blog/new"] }), snap({ brokenTargets: null }))).toEqual([]);
  });

  it("does not fire a check whose before-value is unknown, or on a pre-existing non-200", () => {
    expect(checks(snap({ noindex: true, canonicalIsSelf: false, jsonLdTypes: [] }), null)).toEqual([]);
    // The status check is the one exception: a new article has no before-record, and "not found after the change" needs none.
    expect(checks(snap({ status: 404 }), null)).toEqual(["status"]);
    expect(checks(snap({ status: 404 }), snap({ status: null }))).toEqual(["status"]);
    expect(checks(snap({ status: 404 }), snap({ status: 0 }))).toEqual(["status"]); // an unanswered before-crawl is not a before-failure
    expect(checks(snap({ status: 404 }), snap({ status: 404 }))).toEqual([]);
    expect(checks(snap({ status: 503 }), snap({ status: 500 }))).toEqual([]);
    expect(checks(null, null)).toEqual([]);
    expect(checks(null, snap(), {}, false)).toEqual([]); // a sampled crawl proves nothing about absence
  });

  it("never reverts on a status that proves nothing about the page: no answer, 429, or a single 5xx", () => {
    const notes: string[] = [];
    expect(evaluatePageRegression(change(), snap({ status: 0 }), snap(), true, { notes })).toEqual([]);
    expect(notes).toEqual(["/blog/x: no conclusive HTTP answer (status 0); recheck next crawl"]);
    // The reviewer's exact call: no options at all, and still no revert.
    expect(evaluatePageRegression(change(), snap({ status: 0 }), snap(), true)).toEqual([]);
    expect(evaluatePageRegression(change(), snap({ status: 0 }), null, true)).toEqual([]);
    expect(evaluatePageRegression(change(), snap({ status: 429 }), snap(), true)).toEqual([]);
    expect(evaluatePageRegression(change(), snap({ status: null }), snap(), true)).toEqual([]);
    const five: string[] = [];
    expect(evaluatePageRegression(change(), snap({ status: 503 }), snap(), true, { notes: five })).toEqual([]);
    expect(five).toEqual([expect.stringMatching(/^\/blog\/x: HTTP 503 in this crawl only; recheck next crawl/)]);
    // A page that did not answer is not judged on its (empty) robots/canonical/schema either.
    expect(checks(snap({ status: 0, noindex: true, canonicalIsSelf: false, jsonLdTypes: [] }), snap())).toEqual([]);
  });

  it("reverts a 5xx seen in two consecutive crawls, and a 3xx or 4xx at once", () => {
    const [twice] = evaluatePageRegression(change(), snap({ status: 503 }), snap(), true, { previous: snap({ crawledAt: "2026-06-10T09:00:00.000Z", status: 500 }) });
    expect(twice).toMatchObject({ check: "status", action: "revert", detail: expect.stringMatching(/HTTP 503, and returned HTTP 500 in the crawl of 2026-06-10 too/) });
    expect(evaluatePageRegression(change(), snap({ status: 503 }), snap(), true, { previous: snap({ status: 200 }) })).toEqual([]);
    expect(evaluatePageRegression(change(), snap({ status: 503 }), snap(), true, { previous: snap({ status: 0 }) })).toEqual([]);
    expect(checks(snap({ status: 301 }), snap())).toEqual(["status"]);
    expect(checks(snap({ status: 410 }), snap())).toEqual(["status"]);
  });

  it("stops at a non-200: a 404 is one regression, not five", () => {
    expect(checks(snap({ status: 404, noindex: true, jsonLdTypes: [] }), snap())).toEqual(["status"]);
  });

  it("exempts noindex and sitemap removal only for a prune change to noindex.json", () => {
    const prune = { change_type: "prune-noindex", file: NOINDEX_FILE };
    expect(isPruneChange(prune)).toBe(true);
    expect(checks(snap({ noindex: true }), snap(), prune)).toEqual([]);
    expect(checks(null, snap(), prune)).toEqual([]);
    // A model that labels a page-code change "prune" does not get the exemption.
    expect(isPruneChange({ change_type: "prune", file: "app/blog/x/page.tsx" })).toBe(false);
    expect(checks(snap({ noindex: true }), snap(), { change_type: "prune" })).toEqual(["noindex"]);
  });
});

describe("chooseReference", () => {
  const baseline = snap({ crawledAt: "2026-01-01T00:00:00.000Z", status: null, noindex: null });

  it("prefers the newer of the crawl-file and ledger snapshots taken before live_at", () => {
    const file = snap({ crawledAt: "2026-06-01T09:00:00.000Z" });
    const ledger = snap({ crawledAt: "2026-05-28T00:00:00.000Z" });
    expect(chooseReference(LIVE, file, ledger, baseline)).toBe(file);
    expect(chooseReference(LIVE, snap({ crawledAt: "2026-05-01T00:00:00.000Z" }), ledger, baseline)).toBe(ledger);
  });

  it("never uses a snapshot taken after live_at, and falls back to the baseline", () => {
    const after = snap({ crawledAt: "2026-06-03T16:00:00.000Z" });
    expect(chooseReference(LIVE, after, null, baseline)).toBe(baseline);
    expect(chooseReference(LIVE, null, null, null)).toBeNull();
  });
});

describe("baselineSnapshot", () => {
  it("reads a baseline row loosely: only fields it actually has", () => {
    const baseline = { generatedAt: "2026-09-27T00:00:00.000Z", urls: [{ path: "/blog/x", indexClass: "indexed", wordCount: 800, mainHash: "h" }] };
    expect(baselineSnapshot(baseline, "/blog/x")).toEqual({ crawledAt: "2026-09-27T00:00:00.000Z", status: null, noindex: null, canonicalIsSelf: null, jsonLdTypes: null, brokenTargets: null, linkTargets: null });
    expect(baselineSnapshot({ pages: [{ path: "https://usetruecap.com/blog/y", status: 200, noindex: false }] }, "/blog/y")).toMatchObject({ status: 200, noindex: false });
    expect(baselineSnapshot(baseline, "/blog/missing")).toBeNull();
    expect(baselineSnapshot(null, "/blog/x")).toBeNull();
    expect(baselineSnapshot("nonsense", "/blog/x")).toBeNull();
  });
});

// ------------------------------------------------------------ index drops

describe("evaluateIndexDrops", () => {
  const history = (latestIndexed: boolean): InspectionSnapshot[] => [
    inspection("2026-05-10T00:00:00.000Z", true, "Submitted and indexed"),
    inspection("2026-06-01T00:00:00.000Z", true, "Submitted and indexed"),
    inspection("2026-06-20T00:00:00.000Z", latestIndexed, latestIndexed ? "Submitted and indexed" : "Crawled - currently not indexed"),
  ];

  it("files a tier-2 issue (never a revert) when a page indexed before live_at is not indexed after", () => {
    expect(evaluateIndexDrops([change()], indexStatus("/blog/x", history(false)))).toEqual([
      { ledgerId: "c-x", path: "/blog/x", detail: expect.stringMatching(/indexed on 2026-06-01, not indexed on 2026-06-20 \(Crawled - currently not indexed\)/), action: "tier2-issue" },
    ]);
  });

  it("ignores pages still indexed, pages never indexed before live_at, prune changes and non-live changes", () => {
    expect(evaluateIndexDrops([change()], indexStatus("/blog/x", history(true)))).toEqual([]);
    const neverBefore = [inspection("2026-06-01T00:00:00.000Z", false, "Discovered - currently not indexed"), inspection("2026-06-20T00:00:00.000Z", false, "Crawled - currently not indexed")];
    expect(evaluateIndexDrops([change()], indexStatus("/blog/x", neverBefore))).toEqual([]);
    expect(evaluateIndexDrops([change({ change_type: "prune-noindex", file: NOINDEX_FILE })], indexStatus("/blog/x", history(false)))).toEqual([]);
    expect(evaluateIndexDrops([change({ status: "proposed", live_at: null })], indexStatus("/blog/x", history(false)))).toEqual([]);
    expect(evaluateIndexDrops([change()], null)).toEqual([]);
  });

  it("needs an inspection after live_at to call it a drop", () => {
    const stale = [inspection("2026-05-10T00:00:00.000Z", true, "Submitted and indexed"), inspection("2026-06-02T00:00:00.000Z", false, "Crawled - currently not indexed")];
    expect(evaluateIndexDrops([change()], indexStatus("/blog/x", stale))).toEqual([]);
  });
});

// ------------------------------------------------------ GSC page losses

describe("evaluateGscPageLosses", () => {
  // On 2026-06-29 GSC has final data through the week of 06-15 (the 06-22 week ends inside the 3-day lag).
  const JUNE_15 = "2026-06-15";
  const steadyHoldout = { "/blog/h1": () => 5, "/blog/h2": () => 5 };

  it("reverts a page that lost more than lossShareVsHoldout of its clicks against its holdout", () => {
    const pull = gsc({ ...steadyHoldout, "/blog/x": (w) => (beforeLive(w) ? 10 : 4) }, { lastWeek: JUNE_15 });
    const { losses, notes } = evaluateGscPageLosses([change()], pull, cfg, "2026-06-29");
    expect(notes).toEqual([]);
    // Two complete weeks after live (06-08, 06-15) vs the two before (05-18, 05-25): (8+1)/(20+1) ÷ 1.
    expect(losses).toEqual([{ ledgerId: "c-x", path: "/blog/x", lossShare: Number((1 - 9 / 21).toFixed(4)), impressions: 200, action: "revert" }]);
  });

  it("does not revert when the holdout fell just as much", () => {
    const pull = gsc({ "/blog/h1": (w) => (beforeLive(w) ? 10 : 4), "/blog/h2": (w) => (beforeLive(w) ? 10 : 4), "/blog/x": (w) => (beforeLive(w) ? 10 : 4) }, { lastWeek: JUNE_15 });
    expect(evaluateGscPageLosses([change()], pull, cfg, "2026-06-29").losses).toEqual([]);
  });

  it("needs minDaysLive, minImpressions and a usable holdout", () => {
    const dropping = { ...steadyHoldout, "/blog/x": (w: string) => (beforeLive(w) ? 10 : 0) };
    expect(evaluateGscPageLosses([change()], gsc(dropping, { lastWeek: JUNE_15 }), cfg, "2026-06-16").losses).toEqual([]); // 13 days live
    expect(evaluateGscPageLosses([change()], gsc(dropping, { impressions: 20, lastWeek: JUNE_15 }), cfg, "2026-06-29").losses).toEqual([]); // 80 impressions in the window
    const alone = evaluateGscPageLosses([change({ holdout: [] })], gsc(dropping, { lastWeek: JUNE_15 }), cfg, "2026-06-29");
    expect(alone.losses).toEqual([]);
    expect(alone.notes).toEqual(["/blog/x: click-loss brake skipped (no usable holdout page)"]);
    expect(evaluateGscPageLosses([change()], null, cfg, "2026-06-29").notes[0]).toMatch(/did not run/);
  });

  it("skips prune changes and changes that are not live", () => {
    const dropping = gsc({ ...steadyHoldout, "/blog/x": (w) => (beforeLive(w) ? 10 : 0) }, { lastWeek: JUNE_15 });
    expect(evaluateGscPageLosses([change({ change_type: "prune-noindex", file: NOINDEX_FILE })], dropping, cfg, "2026-06-29").losses).toEqual([]);
    expect(evaluateGscPageLosses([change({ status: "reverted" })], dropping, cfg, "2026-06-29").losses).toEqual([]);
  });
});

// ------------------------------------------------------- demoted types

describe("evaluateDemotedChangeTypes", () => {
  // One entry per page: distinct pages are distinct decisions.
  const scored = (type: string, wins: number, losses: number, neutral = 0): LedgerChangeRecord[] =>
    [...Array(wins).fill("win"), ...Array(losses).fill("loss"), ...Array(neutral).fill("neutral")].map((outcome, i) =>
      change({ id: `${type}-${i}`, url: `/blog/${type}-${i}`, change_type: type, outcome }),
    );

  it("demotes a type whose loss rate exceeds maxLossRate over at least minScoredNonNeutral win/loss outcomes", () => {
    expect(evaluateDemotedChangeTypes([...scored("ctr-title", 5, 5, 20), ...scored("links", 9, 1)], cfg)).toEqual([{ changeType: "ctr-title", lossRate: 0.5, scored: 10 }]);
  });

  it("ignores neutral outcomes, needs enough scored entries and a rate strictly above the limit", () => {
    expect(evaluateDemotedChangeTypes(scored("few", 0, 9, 50), cfg)).toEqual([]);
    expect(evaluateDemotedChangeTypes(scored("edge", 6, 4), cfg)).toEqual([]); // exactly 40%
    expect(evaluateDemotedChangeTypes(scored("pending", 0, 0).concat(change({ change_type: "pending" })), cfg)).toEqual([]);
  });

  it("counts a run's sibling entries for one page and change type once: four losing articles are 4 losses, not 12", () => {
    // Each new article is three entries (page, OG image, registry) with the same run, URL, type and outcome.
    const article = (slug: string, run: string): LedgerChangeRecord[] =>
      ["page.tsx", "opengraph-image.tsx", "lib/blog-posts.ts"].map((file) =>
        change({ id: `${run}-${slug}-${file}`, run_id: run, url: `/blog/${slug}`, file, change_type: "new-article", outcome: "loss" }),
      );
    const four = ["a", "b", "c", "d"].flatMap((slug, i) => article(slug, String(200 + i)));
    expect(four).toHaveLength(12);
    expect(evaluateDemotedChangeTypes(four, cfg)).toEqual([]);
    // Ten real decisions still demote, with scored = 10 (not 30).
    const ten = Array.from({ length: 10 }, (_, i) => article(`p${i}`, String(300 + i))).flat();
    expect(evaluateDemotedChangeTypes(ten, cfg)).toEqual([{ changeType: "new-article", lossRate: 1, scored: 10 }]);
    // The same page changed again in a later run is a separate decision.
    expect(evaluateDemotedChangeTypes(Array.from({ length: 10 }, (_, i) => article("same", String(400 + i))).flat(), cfg)).toEqual([{ changeType: "new-article", lossRate: 1, scored: 10 }]);
  });
});

// ---------------------------------------------------------- evaluateBrakes

describe("evaluateBrakes", () => {
  const nowCrawl = crawl("2026-06-20T09:00:00.000Z", [crawlPage("/blog/x", { noindex: true })]);
  const inputs = (over: Partial<BrakesInputs> = {}): BrakesInputs => ({
    changes: [change({ before_crawl: snap({ crawledAt: "2026-05-28T00:00:00.000Z" }) })],
    globals: [],
    crawlNow: nowCrawl,
    crawlBefore: () => null,
    baseline: null,
    indexStatus: null,
    gsc: null,
    cfg,
    date: "2026-06-29",
    generatedAt: "2026-06-29T00:00:00.000Z",
    ...over,
  });

  it("uses the ledger's before_crawl when no crawl file predates live_at", () => {
    const { report } = evaluateBrakes(inputs());
    expect(report.pageRegressions).toEqual([expect.objectContaining({ path: "/blog/x", check: "noindex", action: "revert" })]);
    expect(report.notes).toEqual(expect.arrayContaining([expect.stringMatching(/no GSC pull/)]));
  });

  it("uses the crawl file just before live_at when it is newer than the ledger snapshot", () => {
    const fileCrawl = crawl("2026-06-02T09:00:00.000Z", [crawlPage("/blog/x", { noindex: true })]);
    const { report } = evaluateBrakes(inputs({ crawlBefore: () => fileCrawl }));
    expect(report.pageRegressions).toEqual([]); // it was already noindex before this change
  });

  it("does not judge a change the latest crawl has not seen yet", () => {
    const { report } = evaluateBrakes(inputs({ crawlNow: crawl("2026-06-03T10:00:00.000Z", [crawlPage("/blog/x", { noindex: true })]) }));
    expect(report.pageRegressions).toEqual([]);
    expect(report.notes).toEqual(expect.arrayContaining(["/blog/x: the latest crawl predates live_at; regressions not checked yet"]));
    expect(evaluateBrakes(inputs({ crawlNow: null })).report.notes).toEqual(expect.arrayContaining(["no crawl: page regressions were not checked"]));
  });

  it("produces every Brakes field", () => {
    const { report } = evaluateBrakes(inputs({ gsc: gsc({}, { totals: [100, 70] }) }));
    expect(Object.keys(report).sort()).toEqual(["demotedChangeTypes", "generatedAt", "gscPageLosses", "indexDrops", "notes", "pageRegressions", "revertRequests", "siteWide"]);
    expect(report.siteWide.applied).toBe(true);
    expect(report.revertRequests).toEqual([{ pr: 12, ledgerIds: ["c-x"], paths: ["/blog/x"], checks: ["noindex"] }]);
  });

  describe("a later change on the same page takes the blame", () => {
    // June: a title rewrite goes live. August: a prune adds the same page to noindex.json.
    const june = change({ id: "a-june", before_crawl: snap({ crawledAt: "2026-05-28T00:00:00.000Z" }) });
    const august = change({
      id: "b-august",
      run_id: "200",
      date: "2026-08-03",
      file: NOINDEX_FILE,
      change_type: "prune-noindex",
      skill: "seo-prune",
      pr: 40,
      live_at: "2026-08-05T12:00:00.000Z",
      before_crawl: snap({ crawledAt: "2026-08-03T00:00:00.000Z" }),
    });
    const olderNote = /^\/blog\/x: change a-june \(PR #12\) is not judged: the newer change b-august \(PR #40\) went live on this page on 2026-08-05$/;

    it("does not revert the older change when the page is later pruned (gone from the sitemap, or noindex)", () => {
      const gone = crawl("2026-09-07T09:00:00.000Z", [crawlPage("/blog/other")]);
      expect(evaluateBrakes(inputs({ changes: [june], crawlNow: gone })).report.pageRegressions).toEqual([expect.objectContaining({ ledgerId: "a-june", check: "sitemap" })]);
      const { report } = evaluateBrakes(inputs({ changes: [june, august], crawlNow: gone, date: "2026-09-07" }));
      expect(report.pageRegressions).toEqual([]);
      expect(report.revertRequests).toEqual([]);
      expect(report.notes).toEqual(expect.arrayContaining([expect.stringMatching(olderNote)]));
      const listed = crawl("2026-09-07T09:00:00.000Z", [crawlPage("/blog/x", { noindex: true })]);
      expect(evaluateBrakes(inputs({ changes: [june], crawlNow: listed })).report.pageRegressions).toEqual([expect.objectContaining({ ledgerId: "a-june", check: "noindex" })]);
      expect(evaluateBrakes(inputs({ changes: [june, august], crawlNow: listed })).report.pageRegressions).toEqual([]);
    });

    it("applies the same rule to index drops and click losses", () => {
      const dropped = indexStatus("/blog/x", [
        inspection("2026-05-10T00:00:00.000Z", true, "Submitted and indexed"),
        inspection("2026-06-01T00:00:00.000Z", true, "Submitted and indexed"),
        inspection("2026-08-20T00:00:00.000Z", false, "Excluded by 'noindex' tag"),
      ]);
      expect(evaluateIndexDrops([june], dropped)).toEqual([expect.objectContaining({ ledgerId: "a-june" })]);
      expect(evaluateIndexDrops([june, august], dropped)).toEqual([]);
      const falling = gsc({ "/blog/h1": () => 5, "/blog/h2": () => 5, "/blog/x": (w) => (beforeLive(w) ? 10 : 4) });
      expect(evaluateGscPageLosses([june], falling, cfg, "2026-09-07").losses).toEqual([expect.objectContaining({ ledgerId: "a-june" })]);
      expect(evaluateGscPageLosses([june, august], falling, cfg, "2026-09-07").losses).toEqual([]);
      const { report } = evaluateBrakes(inputs({ changes: [june, august], crawlNow: null, indexStatus: dropped, gsc: falling, date: "2026-09-07" }));
      expect(report.indexDrops).toEqual([]);
      expect(report.gscPageLosses).toEqual([]);
    });

    it("judges only the newest change, and treats one deploy's sibling entries as one", () => {
      const { judged, notes } = selectAttributable([june, august], []);
      expect(judged.map((c) => c.id)).toEqual(["b-august"]);
      expect(notes).toEqual([expect.stringMatching(olderNote)]);
      // A new article's page, OG image and registry entries share run, PR and live_at: one judged, no note.
      const siblings = ["page.tsx", "opengraph-image.tsx", "lib/blog-posts.ts"].map((file) => change({ id: `s-${file}`, file }));
      const one = selectAttributable(siblings, []);
      expect(one.judged).toHaveLength(1);
      expect(one.notes).toEqual([]);
      // A tie on live_at goes to the prune change, so the page keeps its noindex exemption.
      const tie = selectAttributable([change({ id: "a" }), change({ id: "z", file: NOINDEX_FILE, change_type: "prune-noindex" })], []);
      expect(tie.judged.map((c) => c.id)).toEqual(["z"]);
      // Changes that are not live, and other pages, are untouched.
      const other = change({ id: "y", url: "/blog/y" });
      expect(selectAttributable([june, other, change({ id: "p", status: "proposed", live_at: null })], []).judged.map((c) => c.id)).toEqual(["a-june", "y"]);
      // Once the newer change is reverted, the older one is what the page shows again.
      expect(selectAttributable([june, { ...august, status: "reverted" }], []).judged.map((c) => c.id)).toEqual(["a-june"]);
      // Several older changes on one page: one note per page, not one per change per run.
      const july = change({ id: "a-july", pr: 20, live_at: "2026-07-06T10:00:00.000Z" });
      expect(selectAttributable([june, july, august], []).notes).toEqual([
        "/blog/x: changes a-july (PR #20), a-june (PR #12) are not judged: the newer change b-august (PR #40) went live on this page on 2026-08-05",
      ]);
    });
  });

  describe("owner changes (global events)", () => {
    // The founder ships a blog template that drops FAQPage everywhere and records it with `ledger.ts global-event`.
    const template: GlobalEvent = { kind: "global_event", id: "g-template-0001", date: "2026-06-20", description: "blog template drops FAQPage", urls: ["*"], pr: 77, exclude_until: "2026-08-15" };
    const withFaq = change({ before_crawl: snap({ crawledAt: "2026-05-28T00:00:00.000Z", jsonLdTypes: ["Article", "FAQPage"] }) });
    const afterTemplate = crawl("2026-06-27T09:00:00.000Z", [crawlPage("/blog/x", { jsonLdTypes: ["Article"] })]);

    it("does not blame a loop change for a page an owner change touched after it was proposed", () => {
      expect(evaluateBrakes(inputs({ changes: [withFaq], crawlNow: afterTemplate })).report.pageRegressions).toEqual([expect.objectContaining({ check: "jsonld" })]);
      const { report } = evaluateBrakes(inputs({ changes: [withFaq], globals: [template], crawlNow: afterTemplate }));
      expect(report.pageRegressions).toEqual([]);
      expect(report.notes).toEqual(expect.arrayContaining([expect.stringMatching(/^\/blog\/x: change c-x \(PR #12\) is not judged: owner change g-template-0 of 2026-06-20 \(blog template drops FAQPage\)/)]));
      expect(ownerChangeSince(withFaq, [template])).toBe(template);
    });

    it("counts only events covering the page (or '*') dated on or after the day the change was proposed", () => {
      const judged = (globals: GlobalEvent[]): number => evaluateBrakes(inputs({ changes: [withFaq], globals, crawlNow: afterTemplate })).report.pageRegressions.length;
      expect(judged([{ ...template, urls: ["/blog/y"] }])).toBe(1);
      expect(judged([{ ...template, date: "2026-05-30" }])).toBe(1); // before the change was proposed (2026-06-01): already in its before-state
      expect(judged([{ ...template, date: "2026-06-01", urls: ["/blog/x"] }])).toBe(0);
    });

    it("also holds back click losses and index drops", () => {
      const falling = gsc({ "/blog/h1": () => 5, "/blog/h2": () => 5, "/blog/x": (w) => (beforeLive(w) ? 10 : 4) });
      expect(evaluateGscPageLosses([change()], falling, cfg, "2026-07-27", [template]).losses).toEqual([]);
      const dropped = indexStatus("/blog/x", [inspection("2026-06-01T00:00:00.000Z", true, "Submitted and indexed"), inspection("2026-06-25T00:00:00.000Z", false, "Crawled - currently not indexed")]);
      expect(evaluateIndexDrops([change()], dropped)).toHaveLength(1);
      expect(evaluateIndexDrops([change()], dropped, [template])).toEqual([]);
    });
  });

  describe("an inconclusive HTTP status", () => {
    it("stays a note when this crawl alone saw it, and reverts a 5xx the previous post-live crawl saw too", () => {
      const down = (at: string, status: number): Crawl => crawl(at, [crawlPage("/blog/x", { status })]);
      const onDisk = (files: Crawl[]) => (t: string): Crawl | null =>
        files.filter((c) => Date.parse(c.generatedAt) <= Date.parse(t)).sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt))[0] ?? null;
      const once = evaluateBrakes(inputs({ crawlNow: down("2026-06-27T09:00:00.000Z", 503) }));
      expect(once.report.pageRegressions).toEqual([]);
      expect(once.report.notes).toEqual(expect.arrayContaining([expect.stringMatching(/^\/blog\/x: HTTP 503 in this crawl only; recheck next crawl/)]));
      const twice = evaluateBrakes(inputs({ crawlNow: down("2026-06-27T09:00:00.000Z", 503), crawlBefore: onDisk([down("2026-06-20T09:00:00.000Z", 500)]) }));
      expect(twice.report.pageRegressions).toEqual([expect.objectContaining({ check: "status", detail: expect.stringMatching(/returned HTTP 500 in the crawl of 2026-06-20 too/) })]);
      // A 5xx in a crawl from before live_at says nothing about the change (here the ledger snapshot is the newer reference).
      const stale = evaluateBrakes(inputs({ crawlNow: down("2026-06-27T09:00:00.000Z", 503), crawlBefore: onDisk([down("2026-05-20T09:00:00.000Z", 500)]) }));
      expect(stale.report.pageRegressions).toEqual([]);
      const unanswered = evaluateBrakes(inputs({ crawlNow: down("2026-06-27T09:00:00.000Z", 0), crawlBefore: onDisk([down("2026-06-20T09:00:00.000Z", 0)]) }));
      expect(unanswered.report.pageRegressions).toEqual([]);
      expect(unanswered.report.notes).toEqual(expect.arrayContaining(["/blog/x: no conclusive HTTP answer (status 0); recheck next crawl"]));
    });
  });
});

describe("revertRequests", () => {
  it("folds page regressions and click losses into one request per PR, and notes a change without a PR", () => {
    const changes = [change({ id: "c1", pr: 7 }), change({ id: "c2", url: "/blog/y", pr: 7 }), change({ id: "c3", url: "/blog/z", pr: null })];
    const { requests, notes } = revertRequests(
      {
        pageRegressions: [
          { ledgerId: "c1", path: "/blog/x", pr: 7, check: "noindex", detail: "d", action: "revert" },
          { ledgerId: "c3", path: "/blog/z", pr: null, check: "status", detail: "d", action: "revert" },
        ],
        gscPageLosses: [{ ledgerId: "c2", path: "/blog/y", lossShare: 0.6, impressions: 300, action: "revert" }],
      },
      changes,
    );
    expect(requests).toEqual([{ pr: 7, ledgerIds: ["c1", "c2"], paths: ["/blog/x", "/blog/y"], checks: ["click-loss", "noindex"] }]);
    expect(notes).toEqual(["/blog/z: status asks for a revert, but change c3 has no PR attached; revert it by hand"]);
  });
});

// -------------------------------------------------------------------- CLI

describe("brakes CLI (temp state dir)", () => {
  const saved = { state: process.env.SEO_STATE_DIR, data: process.env.SEO_DATA_DIR, today: process.env.SEO_TODAY, ack: process.env.SEO_HALT_ACK };
  let dir: string;
  let dataDir: string;
  let stdout: string[];

  const run = async (...argv: string[]): Promise<{ code: number; out: string }> => {
    stdout = [];
    const code = await main(parseArgs(argv));
    return { code, out: stdout.join("\n") };
  };
  const writeData = (name: string, value: unknown): void => writeFileSync(path.join(dataDir, name), JSON.stringify(value));
  const writeLedger = (records: LedgerRecord[]): void => {
    let prev = GENESIS;
    const text = records
      .map((record) => {
        const line = chainLine(record, prev);
        prev = line.hash;
        return `${JSON.stringify(line)}\n`;
      })
      .join("");
    writeFileSync(path.join(dir, "ledger.jsonl"), text);
  };

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "seo-brakes-"));
    dataDir = path.join(dir, "data");
    mkdirSync(dataDir, { recursive: true });
    process.env.SEO_STATE_DIR = dir;
    process.env.SEO_DATA_DIR = dataDir;
    process.env.SEO_TODAY = "2026-07-27";
    delete process.env.SEO_HALT_ACK;
    vi.spyOn(console, "log").mockImplementation((...parts: unknown[]) => {
      stdout.push(parts.map(String).join(" "));
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const [key, value] of [["SEO_STATE_DIR", saved.state], ["SEO_DATA_DIR", saved.data], ["SEO_TODAY", saved.today], ["SEO_HALT_ACK", saved.ack]] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes brakes-<date>.json and a halt, compares against the crawl just before live_at, and never re-halts the same week", async () => {
    const live: StatusEvent = { kind: "status", id: "", date: "2026-06-03", ref: "c-x", status: "live", live_at: LIVE };
    live.id = eventId(live);
    writeLedger([change({ status: "proposed", live_at: null }), live]);
    // The crawl dated on live day ran AFTER the deploy and already shows the regression; the one before it does not.
    writeData("crawl-2026-06-01.json", crawl("2026-06-01T09:00:00.000Z", [crawlPage("/blog/x")]));
    writeData("crawl-2026-06-03.json", crawl("2026-06-03T20:00:00.000Z", [crawlPage("/blog/x", { canonicalIsSelf: false })]));
    writeData("crawl-2026-07-27.json", crawl("2026-07-27T08:00:00.000Z", [crawlPage("/blog/x", { canonicalIsSelf: false })]));
    writeData("gsc-2026-07-27.json", gsc({}, { totals: [120, 80] }));

    const first = await run();
    expect(first.code).toBe(0);
    const written = JSON.parse(readFileSync(path.join(dataDir, "brakes-2026-07-27.json"), "utf8")) as BrakesReport;
    expect(JSON.parse(first.out)).toEqual(written);
    expect(written.pageRegressions).toEqual([expect.objectContaining({ ledgerId: "c-x", check: "canonical", pr: 12 })]);
    expect(written.siteWide).toMatchObject({ applied: true, priorWeekClicks: 120, latestWeekClicks: 80 });
    expect(written.inputs).toEqual({ ledgerLines: 2, liveChanges: 1, crawl: "crawl-2026-07-27.json", gsc: "gsc-2026-07-27.json", indexStatus: false, baseline: null });
    const halt = JSON.parse(readFileSync(path.join(dataDir, "halt.json"), "utf8")) as Halt;
    expect(halt).toMatchObject({ halted: true, id: `wow-${WEEKS[15]}`, clearWithAck: `wow-${WEEKS[15]}`, since: "2026-07-27T00:00:00.000Z" });

    const haltBytes = readFileSync(path.join(dataDir, "halt.json"), "utf8");
    process.env.SEO_TODAY = "2026-07-28";
    await run();
    expect(readFileSync(path.join(dataDir, "halt.json"), "utf8")).toBe(haltBytes);

    expect((await run("is-halted")).out).toBe("true");
    expect((await run("is-halted", "--ack", halt.id as string)).out).toBe("false");
    process.env.SEO_HALT_ACK = halt.id as string;
    expect((await run("is-halted")).out).toBe("false");
  });

  it("reads owner changes from the ledger: a page an owner change touched since is not reverted", async () => {
    const live: StatusEvent = { kind: "status", id: "", date: "2026-06-03", ref: "c-x", status: "live", live_at: LIVE };
    live.id = eventId(live);
    const owner: GlobalEvent = { kind: "global_event", id: "", date: "2026-06-20", description: "canonical tags moved to the layout", urls: ["*"], pr: 77, exclude_until: "2026-08-15" };
    owner.id = eventId(owner);
    writeLedger([change({ status: "proposed", live_at: null }), live, owner]);
    writeData("crawl-2026-06-01.json", crawl("2026-06-01T09:00:00.000Z", [crawlPage("/blog/x")]));
    writeData("crawl-2026-07-27.json", crawl("2026-07-27T08:00:00.000Z", [crawlPage("/blog/x", { canonicalIsSelf: false })]));
    await run();
    const written = JSON.parse(readFileSync(path.join(dataDir, "brakes-2026-07-27.json"), "utf8")) as BrakesReport;
    expect(written.pageRegressions).toEqual([]);
    expect(written.revertRequests).toEqual([]);
    expect(written.notes).toEqual(expect.arrayContaining([expect.stringMatching(/^\/blog\/x: change c-x \(PR #12\) is not judged: owner change/)]));
  });

  it("--dry-run writes nothing", async () => {
    writeData("gsc-2026-07-27.json", gsc({}, { totals: [120, 80] }));
    const { code, out } = await run("--dry-run");
    expect(code).toBe(0);
    expect(JSON.parse(out)).toMatchObject({ siteWide: { applied: true } });
    expect(existsSync(path.join(dataDir, "brakes-2026-07-27.json"))).toBe(false);
    expect(existsSync(path.join(dataDir, "halt.json"))).toBe(false);
  });

  it("is-halted reads a given file and fails closed on an unreadable one", async () => {
    const file = path.join(dir, "gate-halt.json");
    writeFileSync(file, '{"halted":false}');
    expect((await run("is-halted", "--halt", file, "--ack", "")).out).toBe("false");
    writeFileSync(file, '{"halted":true,"id":"wow-x","clearWithAck":"wow-x"}');
    expect((await run("is-halted", "--halt", file, "--ack", "")).out).toBe("true");
    writeFileSync(file, '{"halted":tr');
    expect((await run("is-halted", "--halt", file)).out).toBe("true");
    expect((await run("is-halted", "--halt", path.join(dir, "absent.json"))).out).toBe("false");
  });

  it("rejects unknown commands", async () => {
    expect((await run("revert")).code).toBe(1);
  });

  describe("stop-check: THIS run's brake decision for the model and merge jobs", () => {
    const stopCheck = async (...argv: string[]): Promise<Record<string, string>> => {
      const written: string[] = [];
      const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
        written.push(String(chunk));
        return true;
      });
      try {
        expect((await run("stop-check", ...argv)).code).toBe(0);
      } finally {
        spy.mockRestore();
      }
      return Object.fromEntries(written.join("").trim().split("\n").map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]));
    };

    it("halts the week the site-wide brake first fires, which the gate (last run's halt.json) cannot see", async () => {
      writeData("gsc-2026-07-27.json", gsc({}, { totals: [120, 80] }));
      // The gate ran before the brakes: last run left no halt.
      expect((await run("is-halted")).out).toBe("false");
      await run();
      const state = await stopCheck("--ack", "");
      expect(state.halted).toBe("true");
      expect(state.reason).toMatch(/^halted by the site-wide brake \(wow-/);
      const halt = JSON.parse(readFileSync(path.join(dataDir, "halt.json"), "utf8")) as Halt;
      expect((await stopCheck("--ack", halt.id as string)).halted).toBe("false");
    });

    it("halts when this run's brakes ask for a revert", async () => {
      writeData("brakes-2026-07-27.json", { revertRequests: [{ pr: 12, ledgerIds: ["c-x"], paths: ["/blog/x"], checks: ["canonical"] }] });
      expect(await stopCheck()).toEqual({ halted: "true", reverts: "1", reason: "the brakes asked to revert PR 12 this run" });
    });

    it("goes when nothing fired, and fails closed without this run's brakes file or with an unreadable halt", async () => {
      writeData("brakes-2026-07-27.json", { revertRequests: [] });
      expect(await stopCheck()).toEqual({ halted: "false", reverts: "0", reason: "ok" });
      writeFileSync(path.join(dataDir, "halt.json"), '{"halted":tr');
      expect((await stopCheck()).halted).toBe("true");
      rmSync(path.join(dataDir, "halt.json"));
      rmSync(path.join(dataDir, "brakes-2026-07-27.json"));
      writeData("brakes-2026-07-01.json", { revertRequests: [] }); // an old file is not this run's
      expect(await stopCheck()).toMatchObject({ halted: "true", reason: expect.stringContaining("the brakes did not run") });
    });
  });
});

describe("stopState", () => {
  it("is go only with a readable brakes file, no revert request and no un-acked halt", () => {
    expect(stopState(null, null, { revertRequests: [] })).toEqual({ halted: false, reverts: 0, reason: "ok" });
    expect(stopState({ halted: true, id: "wow-1", clearWithAck: "wow-1" }, "wow-1", { revertRequests: [] }).halted).toBe(false);
    expect(stopState({ halted: true, id: "wow-1", clearWithAck: "wow-1" }, "", { revertRequests: [] }).halted).toBe(true);
    expect(stopState(null, null, { revertRequests: [{ pr: 3, ledgerIds: [], paths: [], checks: [] }] })).toMatchObject({ halted: true, reverts: 1 });
    expect(stopState(null, null, {}).halted).toBe(true);
    expect(stopState(null, null, "unreadable").halted).toBe(true);
    expect(stopState("unreadable", null, { revertRequests: [] }).halted).toBe(true);
  });
});
