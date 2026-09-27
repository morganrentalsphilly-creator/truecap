import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_DAILY_MAX,
  HISTORY_CAP,
  REINSPECT_AFTER_DAYS,
  applyInspection,
  blankEntry,
  classify,
  crawlHashes,
  insertSnapshot,
  isExcludedState,
  mergeSnapshot,
  mergeTelemetry,
  needsInspection,
  planInspections,
  prioritize,
  quotaFor,
  reconcileSitemap,
  runInspection,
  snapshotFromResult,
  snapshotsFromTelemetry,
  summarize,
  telemetryFileNames,
  toSitemapReport,
} from "../../seo/scripts/gsc-inspect.ts";
import type {
  GscClient,
  IndexStatusEntry,
  IndexStatusFile,
  InspectDeps,
  InspectOptions,
  PlannedInspection,
  TelemetryFile,
  TelemetryUrl,
} from "../../seo/scripts/gsc-inspect.ts";
import type { IndexStatusResult, InspectOutcome, SitemapEntry } from "../../seo/scripts/lib/gsc.ts";
import { readJson } from "../../seo/scripts/lib/io.ts";
import { statePaths } from "../../seo/scripts/lib/paths.ts";
import type { SitemapUrl } from "../../seo/scripts/lib/sitemap.ts";
import type { InspectionSnapshot } from "../../seo/scripts/lib/types.ts";

/**
 * Unit tests for seo/scripts/gsc-inspect.ts: the re-inspection rule, quota
 * accounting, indexClass, history, the telemetry seed and the sitemap
 * bookkeeping — plus whole runs against a fake GSC client and a temp
 * SEO_DATA_DIR. No network and no git: every I/O edge is injected.
 */

const SCRIPT = path.join(import.meta.dirname, "../../seo/scripts/gsc-inspect.ts");
const TODAY = "2026-09-28";
const u = (p: string): string => `https://usetruecap.com${p}`;
const sm = (p: string, lastmod: string | null = null): SitemapUrl => ({ url: u(p), path: p, lastmod });

const INDEXED: IndexStatusResult = {
  verdict: "PASS",
  coverageState: "Submitted and indexed",
  robotsTxtState: "ALLOWED",
  indexingState: "INDEXING_ALLOWED",
  pageFetchState: "SUCCESSFUL",
  lastCrawlTime: "2026-09-20T08:00:00Z",
  googleCanonical: u("/a"),
  userCanonical: u("/a"),
  sitemap: [u("/sitemap.xml")],
  referringUrls: [u("/blog")],
};
const CRAWLED_NOT_INDEXED: IndexStatusResult = {
  verdict: "NEUTRAL",
  coverageState: "Crawled - currently not indexed",
  lastCrawlTime: "2026-07-01T08:00:00Z",
};
const UNKNOWN_TO_GOOGLE: IndexStatusResult = { verdict: "NEUTRAL", coverageState: "URL is unknown to Google" };

const cachedAt = (url: string, inspectedAt: string, result: IndexStatusResult = INDEXED, hash: string | null = null): IndexStatusEntry =>
  mergeSnapshot(null, url, snapshotFromResult(result, inspectedAt), {
    sitemap: result.sitemap ?? [],
    referringUrls: result.referringUrls ?? [],
    mainHashAtInspect: hash,
  });

// ------------------------------------------------------------------------

describe("needsInspection", () => {
  const entry = { inspectedAt: "2026-09-20T10:00:00Z", mainHashAtInspect: "hash-1" };

  it("inspects anything never inspected", () => {
    expect(needsInspection(null, null, null, TODAY)).toBe("never");
    expect(needsInspection(undefined, null, null, TODAY)).toBe("never");
    expect(needsInspection(blankEntry(u("/a")), null, null, TODAY)).toBe("never");
    expect(needsInspection({ inspectedAt: "garbage", mainHashAtInspect: null }, null, null, TODAY)).toBe("never");
  });

  it("keeps a fresh, unchanged result", () => {
    expect(needsInspection(entry, "2026-09-01", "hash-1", TODAY)).toBeNull();
  });

  it("re-inspects when the sitemap lastmod is newer than the inspection", () => {
    expect(needsInspection(entry, "2026-09-21", "hash-1", TODAY)).toBe("lastmod");
    expect(needsInspection(entry, "2026-09-20T11:00:00Z", "hash-1", TODAY)).toBe("lastmod");
    // A date-only lastmod equal to the inspection day is midnight: not newer.
    expect(needsInspection(entry, "2026-09-20", "hash-1", TODAY)).toBeNull();
    expect(needsInspection(entry, "not a date", "hash-1", TODAY)).toBeNull();
  });

  it("re-inspects when the crawl's main-text hash moved, but treats an unknown hash as unchanged", () => {
    expect(needsInspection(entry, null, "hash-2", TODAY)).toBe("content");
    expect(needsInspection(entry, null, null, TODAY)).toBeNull();
    expect(needsInspection({ ...entry, mainHashAtInspect: null }, null, "hash-2", TODAY)).toBeNull();
  });

  it(`re-inspects only after more than ${REINSPECT_AFTER_DAYS} days`, () => {
    expect(needsInspection({ ...entry, inspectedAt: "2026-09-14T23:59:00Z" }, null, null, TODAY)).toBeNull();
    expect(needsInspection({ ...entry, inspectedAt: "2026-09-13T00:00:00Z" }, null, null, TODAY)).toBe("stale");
  });

  it("reports a change before staleness", () => {
    const old = { inspectedAt: "2026-08-01T00:00:00Z", mainHashAtInspect: "hash-1" };
    expect(needsInspection(old, "2026-09-01", "hash-1", TODAY)).toBe("lastmod");
    expect(needsInspection(old, null, "hash-2", TODAY)).toBe("content");
  });
});

describe("prioritize and quota", () => {
  const p = (path: string, reason: PlannedInspection["reason"], inspectedAt: string): PlannedInspection => ({
    url: u(path),
    path,
    reason,
    inspectedAt,
  });

  it("orders never → changed → stale, oldest inspection first, then path", () => {
    const ordered = prioritize([
      p("/stale-new", "stale", "2026-09-01T00:00:00Z"),
      p("/stale-old", "stale", "2026-08-01T00:00:00Z"),
      p("/content", "content", "2026-09-20T00:00:00Z"),
      p("/lastmod", "lastmod", "2026-09-10T00:00:00Z"),
      p("/never-b", "never", ""),
      p("/never-a", "never", ""),
    ]);
    expect(ordered.map((x) => x.path)).toEqual(["/never-a", "/never-b", "/lastmod", "/content", "/stale-old", "/stale-new"]);
  });

  it("resets the counter on a new UTC day and carries it within the same day", () => {
    expect(quotaFor(null, TODAY, DEFAULT_DAILY_MAX)).toEqual({ quota: { day: TODAY, used: 0 }, budget: DEFAULT_DAILY_MAX });
    expect(quotaFor({ day: "2026-09-27", used: 1500 }, TODAY, 1500)).toEqual({ quota: { day: TODAY, used: 0 }, budget: 1500 });
    expect(quotaFor({ day: TODAY, used: 1200 }, TODAY, 1500)).toEqual({ quota: { day: TODAY, used: 1200 }, budget: 300 });
    expect(quotaFor({ day: TODAY, used: 1700 }, TODAY, 1500).budget).toBe(0);
  });

  it("planInspections takes the highest-priority URLs within the budget and defers the rest", () => {
    const entries: Record<string, IndexStatusEntry> = {
      [u("/old")]: cachedAt(u("/old"), "2026-08-01T00:00:00Z"),
      [u("/fresh")]: cachedAt(u("/fresh"), "2026-09-25T00:00:00Z", INDEXED, "h-fresh"),
      [u("/edited")]: cachedAt(u("/edited"), "2026-09-25T00:00:00Z", INDEXED, "h-before"),
    };
    const sitemap = [sm("/old"), sm("/fresh"), sm("/edited"), sm("/new"), sm("/new")];
    const hashes = new Map([["/edited", "h-after"], ["/fresh", "h-fresh"]]);
    const plan = planInspections(sitemap, entries, (_e, path) => hashes.get(path) ?? null, TODAY, 2);
    expect(plan.due.map((x) => `${x.path}:${x.reason}`)).toEqual(["/new:never", "/edited:content", "/old:stale"]);
    expect(plan.selected.map((x) => x.path)).toEqual(["/new", "/edited"]);
    expect(plan.deferred.map((x) => x.path)).toEqual(["/old"]);
    expect(planInspections(sitemap, entries, () => null, TODAY, 0).selected).toEqual([]);
  });
});

// ------------------------------------------------------------------------

describe("classify", () => {
  const at = "2026-09-20T10:00:00Z";
  const base = {
    inspectedAt: at,
    indexed: false as boolean | null,
    lastCrawlTime: at as string | null,
    coverageState: null as string | null,
    indexingState: null as string | null,
    googleCanonical: null as string | null,
    userCanonical: null as string | null,
    everIndexed: false,
  };

  // Precedence: indexed → excluded → dropped_after_indexed → never_crawled → crawled_not_indexed → unknown.

  it("indexed wins whenever the latest snapshot is indexed", () => {
    expect(classify({ ...base, indexed: true, lastCrawlTime: null })).toBe("indexed");
    expect(classify({ ...base, indexed: true, googleCanonical: u("/other"), userCanonical: u("/a") })).toBe("indexed");
  });

  const EXCLUDED_STATES = [
    "Excluded by ‘noindex’ tag",
    "Page with redirect",
    "Alternate page with proper canonical tag",
    "Duplicate, Google chose different canonical than user",
    "Duplicate without user-selected canonical",
  ];

  it("excluded for noindex, redirect and canonical-elsewhere states", () => {
    for (const coverageState of EXCLUDED_STATES) {
      expect(classify({ ...base, coverageState }), coverageState).toBe("excluded");
    }
    expect(classify({ ...base, indexingState: "BLOCKED_BY_HTTP_HEADER" })).toBe("excluded");
    expect(classify({ ...base, googleCanonical: u("/other"), userCanonical: u("/a") })).toBe("excluded");
    expect(isExcludedState({ coverageState: null, indexingState: null, googleCanonical: u("/a/"), userCanonical: u("/a") })).toBe(false);
  });

  it("excluded comes straight after indexed: a once-indexed URL, or one with no crawl time, is still excluded", () => {
    for (const coverageState of EXCLUDED_STATES) {
      expect(classify({ ...base, coverageState, everIndexed: true }), `${coverageState} (once indexed)`).toBe("excluded");
      expect(classify({ ...base, coverageState, lastCrawlTime: null }), `${coverageState} (no crawl time)`).toBe("excluded");
    }
    expect(classify({ ...base, indexingState: "BLOCKED_BY_META_TAG", everIndexed: true })).toBe("excluded");
    expect(classify({ ...base, googleCanonical: u("/other"), userCanonical: u("/a"), everIndexed: true })).toBe("excluded");
  });

  it("a once-indexed URL now showing 'Duplicate, Google chose different canonical than user' is excluded, not dropped", () => {
    // score.ts sends dropped_after_indexed to requestIndexing; asking Google to index a URL it
    // deliberately folds into another canonical cannot help.
    const duplicate: IndexStatusResult = {
      verdict: "NEUTRAL",
      coverageState: "Duplicate, Google chose different canonical than user",
      lastCrawlTime: "2026-09-25T08:00:00Z",
      googleCanonical: u("/b"),
      userCanonical: u("/a"),
    };
    const entry = mergeSnapshot(cachedAt(u("/a"), "2026-08-17T00:00:00Z", INDEXED), u("/a"), snapshotFromResult(duplicate, "2026-09-28T00:00:00Z"));
    expect(entry.everIndexed).toBe(true);
    expect(entry.indexClass).toBe("excluded");
    expect(classify({ ...base, coverageState: duplicate.coverageState ?? null, everIndexed: true })).toBe("excluded");
  });

  it("dropped_after_indexed for a once-indexed URL, even when Google's latest answer has no crawl time", () => {
    expect(classify({ ...base, coverageState: "Crawled - currently not indexed", everIndexed: true })).toBe("dropped_after_indexed");
    expect(classify({ ...base, lastCrawlTime: null, coverageState: "URL is unknown to Google", everIndexed: true })).toBe("dropped_after_indexed");
    expect(classify({ ...base, lastCrawlTime: null, coverageState: "Discovered - currently not indexed", everIndexed: true })).toBe("dropped_after_indexed");
  });

  it("never_crawled when Google has no crawl time for a URL that was never indexed", () => {
    expect(classify({ ...base, lastCrawlTime: null, coverageState: "URL is unknown to Google" })).toBe("never_crawled");
    expect(classify({ ...base, lastCrawlTime: null, coverageState: "Discovered - currently not indexed" })).toBe("never_crawled");
  });

  it("crawled_not_indexed only for a crawled page that was never indexed", () => {
    expect(classify({ ...base, coverageState: "Crawled - currently not indexed" })).toBe("crawled_not_indexed");
    expect(classify({ ...base, coverageState: "Crawled – currently not indexed" })).toBe("crawled_not_indexed");
  });

  it("unknown for anything else, and for a URL with no inspection result", () => {
    expect(classify({ ...base, coverageState: "Soft 404" })).toBe("unknown");
    expect(classify({ ...base, indexed: null })).toBe("unknown");
    expect(classify({ ...base, inspectedAt: "", lastCrawlTime: null })).toBe("unknown");
  });
});

describe("snapshots and history", () => {
  it("snapshotFromResult maps the API fields and derives indexed from the verdict", () => {
    const snap = snapshotFromResult(INDEXED, "2026-09-28T09:00:00Z");
    expect(snap).toEqual({
      inspectedAt: "2026-09-28T09:00:00Z",
      source: "api",
      verdict: "PASS",
      coverageState: "Submitted and indexed",
      indexingState: "INDEXING_ALLOWED",
      robotsTxtState: "ALLOWED",
      pageFetchState: "SUCCESSFUL",
      lastCrawlTime: "2026-09-20T08:00:00Z",
      googleCanonical: u("/a"),
      userCanonical: u("/a"),
      indexed: true,
    });
    expect(snapshotFromResult(CRAWLED_NOT_INDEXED, "x").indexed).toBe(false);
    expect(snapshotFromResult(null, "x").indexed).toBeNull();
  });

  it("insertSnapshot keeps time order, replaces an identical snapshot and caps the history", () => {
    const snap = (day: number, source: InspectionSnapshot["source"] = "api"): InspectionSnapshot =>
      snapshotFromResult(INDEXED, new Date(Date.UTC(2026, 0, day)).toISOString(), source);
    let history: InspectionSnapshot[] = [];
    history = insertSnapshot(history, snap(10));
    history = insertSnapshot(history, snap(3, "telemetry-seed"));
    history = insertSnapshot(history, snap(10));
    expect(history.map((s) => s.inspectedAt.slice(0, 10))).toEqual(["2026-01-03", "2026-01-10"]);
    for (let d = 11; d < 11 + HISTORY_CAP + 5; d += 1) history = insertSnapshot(history, snap(d));
    expect(history).toHaveLength(HISTORY_CAP);
    expect(history.at(-1)?.inspectedAt.slice(0, 10)).toBe("2026-02-10"); // day 41 of January
  });

  it("mergeSnapshot: an older seed never overwrites a newer API state, and everIndexed is sticky", () => {
    let entry = cachedAt(u("/a"), "2026-09-20T10:00:00Z", CRAWLED_NOT_INDEXED, "h1");
    entry = mergeSnapshot(entry, u("/a"), { ...snapshotFromResult(INDEXED, "2026-08-17T00:00:00Z"), source: "telemetry-seed" });
    expect(entry.history).toHaveLength(2);
    expect(entry.inspectedAt).toBe("2026-09-20T10:00:00Z");
    expect(entry.coverageState).toBe("Crawled - currently not indexed");
    expect(entry.mainHashAtInspect).toBe("h1");
    expect(entry.everIndexed).toBe(true);
    expect(entry.indexClass).toBe("dropped_after_indexed");

    // Pushing the indexed snapshot out of the capped history does not forget it.
    for (let i = 0; i < HISTORY_CAP; i += 1) {
      entry = mergeSnapshot(entry, u("/a"), snapshotFromResult(CRAWLED_NOT_INDEXED, new Date(Date.UTC(2026, 9, 1 + i)).toISOString()));
    }
    expect(entry.history.some((s) => s.indexed)).toBe(false);
    expect(entry.everIndexed).toBe(true);
  });

  it("mergeSnapshot carries fields other scripts own (crawl.ts) through untouched", () => {
    const entry: IndexStatusEntry = { ...cachedAt(u("/a"), "2026-09-01T00:00:00Z"), wordCount: 812, uniqueRatio: 0.61, thin: false, mainHash: "crawl-hash" };
    const next = mergeSnapshot(entry, u("/a"), snapshotFromResult(INDEXED, "2026-09-28T00:00:00Z"), {
      sitemap: [],
      referringUrls: [],
      mainHashAtInspect: "crawl-hash",
    });
    expect(next).toMatchObject({ wordCount: 812, uniqueRatio: 0.61, thin: false, mainHash: "crawl-hash", mainHashAtInspect: "crawl-hash" });
  });

  it("applyInspection records sitemap/referrers/hash on success and leaves the entry alone on failure", () => {
    const entry = cachedAt(u("/a"), "2026-09-01T00:00:00Z", CRAWLED_NOT_INDEXED);
    const failed: InspectOutcome = { ok: false, message: "HTTP 500: backend" };
    expect(applyInspection(entry, u("/a"), failed, "2026-09-28T00:00:00Z", "h")).toBe(entry);
    expect(applyInspection(null, u("/a"), failed, "2026-09-28T00:00:00Z", "h")).toBeNull();
    const ok = applyInspection(entry, u("/a"), { ok: true, indexStatus: INDEXED }, "2026-09-28T00:00:00Z", "h2");
    expect(ok).toMatchObject({
      indexed: true,
      indexClass: "indexed",
      sitemap: [u("/sitemap.xml")],
      referringUrls: [u("/blog")],
      mainHashAtInspect: "h2",
      everIndexed: true,
    });
    expect(ok?.history).toHaveLength(2);
  });
});

// ------------------------------------------------------------------------

const telemetry = (generatedAt: string, urls: TelemetryUrl[]): TelemetryFile => ({
  generatedAt,
  inspection: { urls },
});

describe("telemetry seed", () => {
  it("telemetryFileNames keeps only dated snapshots, sorted", () => {
    const listing = [
      "docs/seo/telemetry/2026-08-24.json",
      "docs/seo/telemetry/README.md",
      "docs/seo/telemetry/latest.json",
      "docs/seo/telemetry/2026-08-17.json",
      "",
    ].join("\n");
    expect(telemetryFileNames(listing)).toEqual(["2026-08-17.json", "2026-08-24.json"]);
  });

  it("snapshotsFromTelemetry lists every URL but seeds only inspected ones", () => {
    const parsed = snapshotsFromTelemetry(
      telemetry("2026-08-17T14:27:45.682Z", [
        { url: u("/a"), inspected: true, indexed: true, verdict: "PASS", coverageState: "Submitted and indexed", lastCrawlTime: "2026-08-10T00:00:00Z" },
        { url: u("/b"), inspected: false, indexed: null, verdict: null, coverageState: null },
        { url: u("/c"), verdict: "NEUTRAL", coverageState: "URL is unknown to Google" },
      ]),
    );
    expect(parsed?.date).toBe("2026-08-17");
    expect(parsed?.listed).toEqual([u("/a"), u("/b"), u("/c")]);
    expect(parsed?.snapshots.map((s) => [s.url, s.snapshot.indexed, s.snapshot.source, s.snapshot.inspectedAt])).toEqual([
      [u("/a"), true, "telemetry-seed", "2026-08-17T14:27:45.682Z"],
      [u("/c"), false, "telemetry-seed", "2026-08-17T14:27:45.682Z"],
    ]);
    expect(snapshotsFromTelemetry({ inspection: { urls: [] } })).toBeNull();
  });

  it("mergeTelemetry builds history, sets firstSeenInSitemap to the earliest snapshot, and is idempotent", () => {
    const files = [
      telemetry("2026-08-24T12:00:00Z", [
        { url: u("/a"), inspected: true, indexed: false, verdict: "NEUTRAL", coverageState: "Crawled - currently not indexed", lastCrawlTime: "2026-07-01T00:00:00Z" },
        { url: u("/b"), inspected: true, indexed: true, verdict: "PASS", coverageState: "Submitted and indexed", lastCrawlTime: "2026-08-20T00:00:00Z" },
      ]),
      telemetry("2026-08-17T12:00:00Z", [
        { url: u("/a"), inspected: true, indexed: true, verdict: "PASS", coverageState: "Submitted and indexed", lastCrawlTime: "2026-07-01T00:00:00Z" },
      ]),
    ];
    const once = mergeTelemetry({}, files);
    expect(once.files).toBe(2);
    expect(once.snapshots).toBe(3);
    const a = once.entries[u("/a")];
    expect(a.history.map((s) => s.inspectedAt)).toEqual(["2026-08-17T12:00:00Z", "2026-08-24T12:00:00Z"]);
    expect(a.firstSeenInSitemap).toBe("2026-08-17");
    expect(a.everIndexed).toBe(true);
    expect(a.indexClass).toBe("dropped_after_indexed");
    expect(once.entries[u("/b")].firstSeenInSitemap).toBe("2026-08-24");

    const twice = mergeTelemetry(once.entries, files);
    expect(twice.entries[u("/a")].history).toHaveLength(2);
    expect(twice.entries).toEqual(once.entries);
  });

  it("an earlier seed moves firstSeenInSitemap back but never overwrites a newer API result", () => {
    const entries = { [u("/a")]: { ...cachedAt(u("/a"), "2026-09-28T09:00:00Z"), firstSeenInSitemap: "2026-09-28" } };
    const seeded = mergeTelemetry(entries, [
      telemetry("2026-08-17T12:00:00Z", [{ url: u("/a/"), inspected: true, indexed: false, verdict: "NEUTRAL", coverageState: "URL is unknown to Google" }]),
    ]);
    expect(Object.keys(seeded.entries)).toEqual([u("/a")]); // matched by path, no forked entry
    expect(seeded.entries[u("/a")].firstSeenInSitemap).toBe("2026-08-17");
    expect(seeded.entries[u("/a")].indexClass).toBe("indexed");
  });
});

describe("sitemap bookkeeping, summary and reports", () => {
  it("reconcileSitemap adds new URLs, keeps removed ones with a date, and un-removes a returning URL", () => {
    const start = {
      [u("/kept")]: { ...cachedAt(u("/kept"), "2026-09-20T00:00:00Z"), firstSeenInSitemap: "2026-08-17" },
      [u("/gone")]: { ...cachedAt(u("/gone"), "2026-09-20T00:00:00Z"), firstSeenInSitemap: "2026-08-17" },
    };
    const day1 = reconcileSitemap(start, [sm("/kept"), sm("/new")], "2026-09-28");
    expect(day1[u("/kept")]).toMatchObject({ firstSeenInSitemap: "2026-08-17", removedFromSitemap: null });
    expect(day1[u("/new")]).toMatchObject({ firstSeenInSitemap: "2026-09-28", removedFromSitemap: null, indexClass: "unknown", family: "other" });
    expect(day1[u("/gone")]).toMatchObject({ removedFromSitemap: "2026-09-28", indexClass: "indexed" });
    expect(day1[u("/gone")].history).toHaveLength(1);

    const day2 = reconcileSitemap(day1, [sm("/kept")], "2026-10-05");
    expect(day2[u("/gone")].removedFromSitemap).toBe("2026-09-28");
    expect(day2[u("/new")].removedFromSitemap).toBe("2026-10-05");
    expect(day2[u("/new")].firstSeenInSitemap).toBe("2026-09-28");

    const day3 = reconcileSitemap(day2, [sm("/kept"), sm("/gone")], "2026-10-12");
    expect(day3[u("/gone")].removedFromSitemap).toBeNull();
    expect(day3[u("/gone")].firstSeenInSitemap).toBe("2026-08-17");
  });

  it("reconcileSitemap re-keys an entry whose URL spelling changed but whose path did not", () => {
    const start = { [u("/a/")]: { ...cachedAt(u("/a/"), "2026-09-20T00:00:00Z"), firstSeenInSitemap: "2026-08-17" } };
    const out = reconcileSitemap(start, [sm("/a")], TODAY);
    expect(Object.keys(out)).toEqual([u("/a")]);
    expect(out[u("/a")]).toMatchObject({ url: u("/a"), path: "/a", firstSeenInSitemap: "2026-08-17" });
    expect(out[u("/a")].history).toHaveLength(1);
  });

  it("summarize counts only URLs in the sitemap, with every class present", () => {
    const entries = reconcileSitemap(
      {
        [u("/blog/x")]: cachedAt(u("/blog/x"), "2026-09-20T00:00:00Z"),
        [u("/blog/y")]: cachedAt(u("/blog/y"), "2026-09-20T00:00:00Z", CRAWLED_NOT_INDEXED),
        [u("/markets/z")]: cachedAt(u("/markets/z"), "2026-09-20T00:00:00Z", UNKNOWN_TO_GOOGLE),
        [u("/removed")]: cachedAt(u("/removed"), "2026-09-20T00:00:00Z"),
      },
      [sm("/blog/x"), sm("/blog/y"), sm("/markets/z"), sm("/new")],
      TODAY,
    );
    const summary = summarize(entries, [u("/blog/x"), u("/blog/y"), u("/markets/z"), u("/new")]);
    expect(summary).toEqual({
      total: 4,
      indexed: 1,
      byClass: { indexed: 1, never_crawled: 1, crawled_not_indexed: 1, dropped_after_indexed: 0, excluded: 0, unknown: 1 },
      byFamily: { "blog-post": { total: 2, indexed: 1 }, "market-city": { total: 1, indexed: 0 }, other: { total: 1, indexed: 0 } },
    });
  });

  it("toSitemapReport sums the contents counts and nulls what Google did not send", () => {
    const report = toSitemapReport([
      {
        path: u("/sitemap.xml"),
        lastSubmitted: "2026-09-01T00:00:00Z",
        lastDownloaded: "2026-09-27T00:00:00Z",
        isPending: false,
        contents: [
          { type: "web", submitted: "381", indexed: "0" },
          { type: "image", submitted: "10" },
        ],
      },
      { path: u("/old-sitemap.xml") } as SitemapEntry,
    ]);
    expect(report).toEqual([
      { path: u("/sitemap.xml"), lastSubmitted: "2026-09-01T00:00:00Z", lastDownloaded: "2026-09-27T00:00:00Z", isPending: false, submitted: 391, indexed: 0 },
      { path: u("/old-sitemap.xml"), lastSubmitted: null, lastDownloaded: null, isPending: null, submitted: null, indexed: null },
    ]);
  });

  it("crawlHashes maps path → mainHash and tolerates a missing crawl", () => {
    expect(crawlHashes(null).size).toBe(0);
    const map = crawlHashes({ pages: [{ path: "/a", mainHash: "h" }, { path: "/b", mainHash: "" }] as never });
    expect([...map.entries()]).toEqual([["/a", "h"]]);
  });
});

// ------------------------------------------------------------------------

type FakeClient = GscClient & { calls: string[] };

function fakeClient(respond: (url: string, n: number) => InspectOutcome, sitemaps: () => Promise<SitemapEntry[]> = async () => []): FakeClient {
  const calls: string[] = [];
  return {
    calls,
    inspect: async (url) => {
      calls.push(url);
      return respond(url, calls.length);
    },
    listSitemaps: sitemaps,
  };
}

describe("runInspection (fake GSC, temp SEO_DATA_DIR)", () => {
  let dir: string;
  let previousDataDir: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "seo-gsc-inspect-"));
    previousDataDir = process.env.SEO_DATA_DIR;
    process.env.SEO_DATA_DIR = dir;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (previousDataDir === undefined) delete process.env.SEO_DATA_DIR;
    else process.env.SEO_DATA_DIR = previousDataDir;
    rmSync(dir, { recursive: true, force: true });
  });

  const options = (over: Partial<InspectOptions> = {}): InspectOptions => ({
    site: "sc-domain:usetruecap.com",
    todayDate: TODAY,
    max: DEFAULT_DAILY_MAX,
    dryRun: false,
    noInspect: false,
    seed: false,
    ...over,
  });
  /** `day` sets the fake clock, so inspectedAt agrees with the run's todayDate. */
  const deps = (sitemap: SitemapUrl[], client: GscClient | null, telemetryFiles: TelemetryFile[] = [], day: string = TODAY): InspectDeps & { connects: number } => {
    let clock = Date.parse(`${day}T09:41:00Z`);
    const d = {
      connects: 0,
      fetchSitemap: async () => sitemap,
      readTelemetry: () => telemetryFiles,
      connect: async () => {
        d.connects += 1;
        if (!client) throw new Error("connect must not be called");
        return client;
      },
      now: () => new Date((clock += 1000)).toISOString(),
    };
    return d;
  };
  const written = (): IndexStatusFile => readJson<IndexStatusFile>(statePaths.indexStatus());

  it("a first run inspects every sitemap URL, writes the cache, and counts the quota", async () => {
    const results: Record<string, IndexStatusResult> = { [u("/a")]: INDEXED, [u("/b")]: CRAWLED_NOT_INDEXED, [u("/c")]: UNKNOWN_TO_GOOGLE };
    const client = fakeClient((url) => ({ ok: true, indexStatus: results[url] }), async () => [
      { path: u("/sitemap.xml"), lastDownloaded: "2026-09-27T00:00:00Z", contents: [{ type: "web", submitted: "3" }] },
    ]);
    const result = await runInspection(options(), deps([sm("/a"), sm("/b"), sm("/c")], client));
    expect(result.exitCode).toBe(0);
    expect(client.calls.sort()).toEqual([u("/a"), u("/b"), u("/c")]);

    const status = written();
    expect(status.quota).toEqual({ day: TODAY, used: 3 });
    expect(status.summary.total).toBe(3);
    expect(status.summary.byClass).toMatchObject({ indexed: 1, crawled_not_indexed: 1, never_crawled: 1 });
    expect(status.sitemapReport[0]).toMatchObject({ submitted: 3, lastDownloaded: "2026-09-27T00:00:00Z" });
    expect(status.urls[u("/a")]).toMatchObject({ path: "/a", family: "other", source: "api", firstSeenInSitemap: TODAY, sitemap: [u("/sitemap.xml")] });
    expect(status.run).toMatchObject({ mode: "inspect", due: 3, planned: 3, inspected: 3, quotaExhausted: false, skipped: [] });
    expect(Object.keys(status.urls)).toEqual([u("/a"), u("/b"), u("/c")]);
  });

  it("a same-day re-run finds nothing due, spends nothing, and keeps the counter", async () => {
    const client = fakeClient(() => ({ ok: true, indexStatus: INDEXED }));
    await runInspection(options(), deps([sm("/a"), sm("/b")], client));
    const again = fakeClient(() => ({ ok: true, indexStatus: INDEXED }));
    await runInspection(options(), deps([sm("/a"), sm("/b")], again));
    expect(again.calls).toEqual([]);
    expect(written().quota).toEqual({ day: TODAY, used: 2 });
    expect(written().urls[u("/a")].history).toHaveLength(1);
  });

  it("stops at --max for the day and records the rest as skipped by the daily cap", async () => {
    const client = fakeClient(() => ({ ok: true, indexStatus: INDEXED }));
    await runInspection(options({ max: 2 }), deps([sm("/a"), sm("/b"), sm("/c")], client));
    expect(client.calls).toHaveLength(2);
    expect(written().quota.used).toBe(2);
    expect(written().run?.skipped).toEqual([{ path: "/c", reason: "never", why: "daily-cap" }]);
    expect(written().urls[u("/c")].indexClass).toBe("unknown");

    const next = fakeClient(() => ({ ok: true, indexStatus: INDEXED }));
    await runInspection(options({ max: 2 }), deps([sm("/a"), sm("/b"), sm("/c")], next));
    expect(next.calls).toEqual([]); // the day's cap is already spent
  });

  it("stops on quotaExhausted, records the rest as skipped, and still exits 0", async () => {
    const sitemap = Array.from({ length: 20 }, (_, i) => sm(`/p${String(i).padStart(2, "0")}`));
    const client = fakeClient((_url, n) => (n <= 2 ? { ok: true, indexStatus: INDEXED } : { ok: false, quotaExhausted: true, message: "Quota exceeded" }));
    const result = await runInspection(options(), deps(sitemap, client));
    expect(result.exitCode).toBe(0);
    const status = written();
    expect(status.run?.quotaExhausted).toBe(true);
    expect(status.run?.inspected).toBe(2);
    expect(status.quota.used).toBe(2);
    expect(status.run?.skipped).toHaveLength(18);
    expect(status.run?.skipped.every((s) => s.why === "quota-exhausted")).toBe(true);
    expect(client.calls.length).toBeLessThan(sitemap.length); // stopped scheduling once exhausted
  });

  it("keeps the previous state when inspections fail, and exits 1 when every one failed", async () => {
    const first = fakeClient(() => ({ ok: true, indexStatus: INDEXED }));
    await runInspection(options({ todayDate: "2026-09-01" }), deps([sm("/a")], first, [], "2026-09-01"));
    const failing = fakeClient(() => ({ ok: false, message: "HTTP 500: backend error" }));
    const result = await runInspection(options(), deps([sm("/a")], failing));
    expect(failing.calls).toEqual([u("/a")]);
    expect(result.exitCode).toBe(1);
    const status = written();
    expect(status.urls[u("/a")]).toMatchObject({ indexClass: "indexed", history: [expect.objectContaining({ verdict: "PASS" })] });
    expect(status.run?.errors).toEqual([{ path: "/a", message: "HTTP 500: backend error" }]);
  });

  it("a thrown inspect error is recorded like a failed call", async () => {
    const client = fakeClient((url) => {
      if (url === u("/b")) throw new Error("socket hang up");
      return { ok: true, indexStatus: INDEXED };
    });
    const result = await runInspection(options(), deps([sm("/a"), sm("/b")], client));
    expect(result.exitCode).toBe(0);
    expect(written().run?.errors).toEqual([{ path: "/b", message: "socket hang up" }]);
  });

  it("re-inspects a page whose crawl hash changed since its last inspection", async () => {
    const first = fakeClient(() => ({ ok: true, indexStatus: INDEXED }));
    writeFileSync(path.join(dir, "crawl-2026-09-21.json"), JSON.stringify({ pages: [{ path: "/a", mainHash: "h1" }, { path: "/b", mainHash: "h1" }] }));
    await runInspection(options({ todayDate: "2026-09-21" }), deps([sm("/a"), sm("/b")], first, [], "2026-09-21"));
    expect(written().urls[u("/a")].mainHashAtInspect).toBe("h1");

    writeFileSync(path.join(dir, "crawl-2026-09-28.json"), JSON.stringify({ pages: [{ path: "/a", mainHash: "h2" }, { path: "/b", mainHash: "h1" }] }));
    const second = fakeClient(() => ({ ok: true, indexStatus: INDEXED }));
    await runInspection(options(), deps([sm("/a"), sm("/b")], second));
    expect(second.calls).toEqual([u("/a")]);
    expect(written().urls[u("/a")].mainHashAtInspect).toBe("h2");
    expect(written().urls[u("/b")].mainHashAtInspect).toBe("h1");
  });

  it("carries crawl-merged fields and removed URLs through a run", async () => {
    const first = fakeClient(() => ({ ok: true, indexStatus: INDEXED }));
    await runInspection(options({ todayDate: "2026-09-01" }), deps([sm("/a"), sm("/gone")], first, [], "2026-09-01"));
    const status = written();
    status.urls[u("/a")] = { ...status.urls[u("/a")], wordCount: 900, uniqueRatio: 0.5, thin: false, mainHash: "m" };
    writeFileSync(statePaths.indexStatus(), JSON.stringify(status));

    const second = fakeClient(() => ({ ok: true, indexStatus: INDEXED }));
    await runInspection(options(), deps([sm("/a")], second));
    expect(second.calls).toEqual([u("/a")]); // 27 days old → stale
    const after = written();
    expect(after.urls[u("/a")]).toMatchObject({ wordCount: 900, uniqueRatio: 0.5, thin: false, mainHash: "m", mainHashAtInspect: "m" });
    expect(after.urls[u("/gone")]).toMatchObject({ removedFromSitemap: TODAY, indexClass: "indexed" });
    expect(after.summary.total).toBe(1);
  });

  it("a page indexed last run and folded into another canonical this run is written as excluded, not dropped", async () => {
    const first = fakeClient(() => ({ ok: true, indexStatus: INDEXED }));
    await runInspection(options({ todayDate: "2026-09-01" }), deps([sm("/a")], first, [], "2026-09-01"));
    expect(written().urls[u("/a")].indexClass).toBe("indexed");

    const duplicate: IndexStatusResult = {
      verdict: "NEUTRAL",
      coverageState: "Duplicate, Google chose different canonical than user",
      lastCrawlTime: "2026-09-25T08:00:00Z",
      googleCanonical: u("/b"),
      userCanonical: u("/a"),
    };
    const second = fakeClient(() => ({ ok: true, indexStatus: duplicate }));
    await runInspection(options(), deps([sm("/a")], second));
    expect(second.calls).toEqual([u("/a")]); // 27 days old → stale
    const after = written();
    expect(after.urls[u("/a")]).toMatchObject({ everIndexed: true, indexClass: "excluded" });
    expect(after.summary.byClass).toMatchObject({ excluded: 1, dropped_after_indexed: 0 });
  });

  it("keeps the previous sitemap report when sitemaps.list fails, and says so", async () => {
    const first = fakeClient(() => ({ ok: true, indexStatus: INDEXED }), async () => [{ path: u("/sitemap.xml"), contents: [{ submitted: "1" }] }]);
    await runInspection(options({ todayDate: "2026-09-01" }), deps([sm("/a")], first, [], "2026-09-01"));
    const broken = fakeClient(
      () => ({ ok: true, indexStatus: INDEXED }),
      async () => {
        throw new Error("sitemaps.list failed: HTTP 503");
      },
    );
    await runInspection(options(), deps([sm("/a")], broken));
    expect(written().sitemapReport).toEqual([{ path: u("/sitemap.xml"), lastSubmitted: null, lastDownloaded: null, isPending: null, submitted: 1, indexed: null }]);
    expect(written().run?.sitemapReportError).toMatch(/HTTP 503/);
  });

  it("--dry-run plans without connecting and writes nothing", async () => {
    const d = deps([sm("/a"), sm("/b")], null);
    const result = await runInspection(options({ dryRun: true, max: 1 }), d);
    expect(d.connects).toBe(0);
    expect(existsSync(statePaths.indexStatus())).toBe(false);
    expect(result.plan).toMatchObject({
      dryRun: true,
      budget: 1,
      wouldInspect: [{ path: "/a", reason: "never" }],
      deferred: [{ path: "/b", reason: "never" }],
    });
  });

  it("--no-inspect --seed-from-telemetry merges history without connecting or spending quota", async () => {
    const files = [
      telemetry("2026-09-21T19:07:21.494Z", [
        { url: u("/a"), inspected: true, indexed: true, verdict: "PASS", coverageState: "Submitted and indexed", lastCrawlTime: "2026-09-21T09:00:00Z" },
        { url: u("/old"), inspected: true, indexed: true, verdict: "PASS", coverageState: "Submitted and indexed", lastCrawlTime: "2026-09-01T09:00:00Z" },
      ]),
    ];
    const d = deps([sm("/a"), sm("/b")], null, files);
    const result = await runInspection(options({ noInspect: true, seed: true }), d);
    expect(result.exitCode).toBe(0);
    expect(d.connects).toBe(0);
    const status = written();
    expect(status.quota).toEqual({ day: TODAY, used: 0 });
    expect(status.urls[u("/a")]).toMatchObject({ source: "telemetry-seed", indexClass: "indexed", firstSeenInSitemap: "2026-09-21" });
    expect(status.urls[u("/old")]).toMatchObject({ removedFromSitemap: TODAY, firstSeenInSitemap: "2026-09-21" });
    expect(status.urls[u("/b")]).toMatchObject({ indexClass: "unknown", firstSeenInSitemap: TODAY });
    expect(status.run).toMatchObject({ mode: "no-inspect", seededSnapshots: 2, skipped: [{ path: "/b", reason: "never", why: "no-inspect" }] });
    expect(status.summary).toMatchObject({ total: 2, indexed: 1 });
  });

  it("a seeded cache spends no quota on URLs the telemetry already covers", async () => {
    const files = [
      telemetry("2026-09-21T19:07:21.494Z", [
        { url: u("/a"), inspected: true, indexed: true, verdict: "PASS", coverageState: "Submitted and indexed", lastCrawlTime: "2026-09-21T09:00:00Z" },
      ]),
    ];
    const client = fakeClient(() => ({ ok: true, indexStatus: INDEXED }));
    await runInspection(options({ seed: true }), deps([sm("/a"), sm("/b")], client, files));
    expect(client.calls).toEqual([u("/b")]);
    expect(written().urls[u("/a")].history.map((s) => s.source)).toEqual(["telemetry-seed"]);
  });
});

describe("gsc-inspect CLI", () => {
  it("--self-test passes under plain node", () => {
    const result = spawnSync(process.execPath, [SCRIPT, "--self-test"], { encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("self-test ok gsc-inspect.ts");
  });

  it("refuses a --max above Google's daily quota before touching the network", () => {
    const result = spawnSync(process.execPath, [SCRIPT, "--max", "5000"], { encoding: "utf8", env: { ...process.env, GSC_SERVICE_ACCOUNT_JSON: "", GSC_SERVICE_ACCOUNT_FILE: "" } });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/--max must be an integer from 0 to 2000/);
  });
});

describe("telemetry seed removal dates", () => {
  it("dates a URL's removal to the first snapshot that no longer lists it", async () => {
    const { mergeTelemetry } = await import("../../seo/scripts/gsc-inspect.ts");
    const row = (url: string) => ({ url, inspected: true, indexed: true, verdict: "PASS", coverageState: "Submitted and indexed" });
    const files = [
      { generatedAt: "2026-08-31T12:00:00Z", inspection: { urls: [row("https://usetruecap.com/a"), row("https://usetruecap.com/gone")] } },
      { generatedAt: "2026-09-07T12:00:00Z", inspection: { urls: [row("https://usetruecap.com/a")] } },
      { generatedAt: "2026-09-14T12:00:00Z", inspection: { urls: [row("https://usetruecap.com/a")] } },
    ];
    const { entries } = mergeTelemetry({}, files);
    expect(entries["https://usetruecap.com/gone"].removedFromSitemap).toBe("2026-09-07");
    expect(entries["https://usetruecap.com/a"].removedFromSitemap ?? null).toBeNull();
  });
});
