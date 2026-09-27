import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "../../seo/scripts/lib/cli.ts";
import { loadConfig } from "../../seo/scripts/lib/config.ts";
import { addDays } from "../../seo/scripts/lib/paths.ts";
import type { Candidates, Crawl, CrawlPage, GscPull, IndexStatus, IndexStatusUrl, RunManifest, VerifyVerdict } from "../../seo/scripts/lib/types.ts";
import {
  GENESIS,
  OUTCOMES_HEADING,
  activeHoldoutPaths,
  allocateQuotas,
  beforeMetrics,
  beforeWindowExpired,
  buildChangeEntries,
  calendarFullWeeks,
  canonicalJson,
  chainLine,
  changeId,
  cleanChangeType,
  compareToHoldout,
  crawlAgeBucket,
  crawlSnapshot,
  eventId,
  globalEventCovering,
  holdoutControls,
  holdoutProtection,
  holdoutStratum,
  main,
  materialize,
  outcomeUnits,
  outcomesSection,
  parseLedger,
  pathOf,
  planHoldout,
  planStatusEvents,
  recentlyTreated,
  replaceSection,
  resolveRef,
  runControls,
  scoreChange,
  scoreOutcomes,
  verifyChain,
} from "../../seo/scripts/ledger.ts";
import type { GlobalEvent, HoldoutEvent, LedgerChangeRecord, LedgerRecord, Materialized, ScoreContext, StatusEvent } from "../../seo/scripts/ledger.ts";

/**
 * seo/scripts/ledger.ts — the SEO loop's append-only, hash-chained ledger.
 * Pure functions are tested with inline fixtures; the CLI runs end to end in
 * a temp state dir (SEO_STATE_DIR / SEO_DATA_DIR / SEO_TODAY). No network.
 */

const cfg = loadConfig();

// ------------------------------------------------------------- fixtures

function change(over: Partial<LedgerChangeRecord> = {}): LedgerChangeRecord {
  return {
    kind: "change",
    id: over.id ?? changeId("100", "app/blog/x/page.tsx", "/blog/x"),
    run_id: "100",
    date: "2026-06-01",
    url: "/blog/x",
    file: "app/blog/x/page.tsx",
    tier: 1,
    change_type: "title-rewrite",
    skill: "seo-ctr",
    summary: "Rewrote the title",
    pr: null,
    status: "proposed",
    live_at: null,
    before: { clicks_28d: 1, impressions_28d: 50, position: 12, indexed: true, coverageState: "Submitted and indexed", lastCrawlTime: null, mainHash: null },
    holdout: ["/blog/h1", "/blog/h2"],
    scored_at: null,
    after: null,
    outcome: "pending",
    reverted: false,
    ...over,
  };
}

function status(over: Partial<StatusEvent> & { ref: string; status: StatusEvent["status"] }): StatusEvent {
  const event: StatusEvent = { kind: "status", id: "", date: "2026-06-03", ...over };
  event.id = eventId(event);
  return event;
}

function chain(records: LedgerRecord[]): string {
  let prev = GENESIS;
  return records
    .map((record) => {
      const line = chainLine(record, prev);
      prev = line.hash;
      return `${JSON.stringify(line)}\n`;
    })
    .join("");
}

const WEEKS = Array.from({ length: 16 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 3, 6 + i * 7)); // Mondays 2026-04-06 … 2026-07-20
  return d.toISOString().slice(0, 10);
});

type WeeklySpec = Record<string, (week: string) => number>;

/** A GSC pull whose weekly rows give each page `clicks(week)` clicks and 50 impressions per week. */
function gscPull(weekly: WeeklySpec = {}, over: Partial<GscPull> = {}): GscPull {
  const rows = Object.entries(weekly).flatMap(([page, clicks]) =>
    WEEKS.map((weekStart) => ({ page, weekStart, clicks: clicks(weekStart), impressions: 50, ctr: 0, position: 10 })),
  );
  return {
    generatedAt: "2026-07-29T00:00:00.000Z",
    site: "sc-domain:usetruecap.com",
    windows: { current: { startDate: "2026-06-29", endDate: "2026-07-26" }, prior: { startDate: "2026-06-01", endDate: "2026-06-28" } },
    totals: { current: { clicks: 0, impressions: 0, ctr: 0, position: 0 }, prior: { clicks: 0, impressions: 0, ctr: 0, position: 0 } },
    pages: { current: [], prior: [] },
    pageQueries: { current: [], prior: [] },
    weekly: { weeks: WEEKS, rows },
    weeklyTotals: [],
    ...over,
  };
}

function indexEntryFixture(p: string, over: Partial<IndexStatusUrl> = {}): IndexStatusUrl {
  return {
    url: `https://usetruecap.com${p}`,
    path: p,
    family: "blog-post",
    inspectedAt: "2026-05-20T00:00:00.000Z",
    source: "api",
    verdict: "PASS",
    coverageState: "Submitted and indexed",
    indexingState: null,
    robotsTxtState: null,
    pageFetchState: null,
    lastCrawlTime: "2026-05-10T00:00:00.000Z",
    googleCanonical: null,
    userCanonical: null,
    indexed: true,
    sitemap: [],
    referringUrls: [],
    firstSeenInSitemap: null,
    everIndexed: true,
    indexClass: "indexed",
    mainHashAtInspect: null,
    wordCount: null,
    uniqueRatio: null,
    thin: null,
    history: [],
    ...over,
  };
}

function indexStatus(entries: IndexStatusUrl[]): IndexStatus {
  return {
    generatedAt: "2026-05-20T00:00:00.000Z",
    site: "sc-domain:usetruecap.com",
    sitemapReport: [],
    quota: { day: "2026-05-20", used: 0 },
    summary: { total: entries.length, indexed: 0, byClass: {} as IndexStatus["summary"]["byClass"], byFamily: {} },
    urls: Object.fromEntries(entries.map((e) => [e.url, e])),
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
    jsonLdTypes: ["BreadcrumbList", "Article"],
    jsonLdParseErrors: 0,
    datePublished: null,
    dateModified: null,
    visibleUpdatedDate: null,
    wordCount: 900,
    mainHash: `hash-of-${p}`,
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

function crawl(pages: CrawlPage[], over: Partial<Crawl> = {}): Crawl {
  return {
    generatedAt: "2026-05-25T00:00:00.000Z",
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

function verdict(files: VerifyVerdict["files"], over: Partial<VerifyVerdict> = {}): VerifyVerdict {
  return {
    ok: true,
    patchSha256: "0".repeat(64),
    tier: Math.max(0, ...files.map((f) => f.tier)) as 0 | 1 | 2,
    files,
    declaredUrls: files.map((f) => f.url).filter((u): u is string => u !== null),
    violations: [],
    caps: { files: files.length, lines: 10, pages: files.length, newArticles: 0, noindex: 0 },
    ...over,
  };
}

function manifest(changes: RunManifest["changes"]): RunManifest {
  return { runId: "100", changes, skipped: [], issues: [] };
}

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

// ---------------------------------------------------------- canonical JSON

describe("canonicalJson", () => {
  it("sorts keys recursively, keeps array order and drops undefined like JSON.stringify", () => {
    expect(canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: undefined } })).toBe('{"a":{"d":[3,{"y":2,"z":1}]},"b":1}');
    expect(canonicalJson([undefined, Number.NaN, Infinity])).toBe("[null,null,null]");
  });

  it("orders integer-like keys lexically, unlike plain JSON.stringify", () => {
    expect(canonicalJson({ "9": "a", "10": "b" })).toBe('{"10":"b","9":"a"}');
  });

  it("gives the same text for the same record in any key order and after a JSON round trip", () => {
    const a = { kind: "status", id: "x", note: "n", pr: undefined, date: "2026-06-01" };
    const b = JSON.parse(JSON.stringify({ date: "2026-06-01", note: "n", id: "x", kind: "status" }));
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });
});

// ------------------------------------------------------------- hash chain

describe("hash chain", () => {
  const c1 = change();
  const s1 = status({ ref: c1.id, status: "live", live_at: "2026-06-03T10:00:00.000Z" });
  const s2 = status({ ref: c1.id, status: "reverted", date: "2026-06-20" });

  it("hashes sha256(prev_hash + canonical JSON of the record without its chain fields)", () => {
    const line = chainLine(c1, GENESIS);
    expect(line.prev_hash).toBe(GENESIS);
    expect(line.hash).toBe(sha256(GENESIS + canonicalJson(c1)));
    const next = chainLine(s1, line.hash);
    expect(next.hash).toBe(sha256(line.hash + canonicalJson(s1)));
  });

  it("ignores stale chain fields on the input record", () => {
    const stale = { ...c1, prev_hash: "bogus", hash: "bogus" } as unknown as LedgerChangeRecord;
    expect(chainLine(stale, GENESIS).hash).toBe(chainLine(c1, GENESIS).hash);
  });

  it("verifies a fresh chain and reports its head", () => {
    const text = chain([c1, s1, s2]);
    const result = verifyChain(text);
    expect(result).toMatchObject({ ok: true, lines: 3, errors: [] });
    expect(result.head).toBe(parseLedger(text)[2].hash);
    expect(verifyChain("")).toEqual({ ok: true, lines: 0, head: GENESIS, errors: [] });
  });

  it("still verifies when a line is re-serialized with a different key order", () => {
    const [l1, l2] = chain([c1, s1]).trim().split("\n");
    const reordered = JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(l2)).reverse()));
    expect(verifyChain(`${l1}\n${reordered}\n`).ok).toBe(true);
  });

  it("fails on an edited, removed, reordered or inserted line", () => {
    const text = chain([c1, s1, s2]);
    const lines = text.trim().split("\n");
    expect(verifyChain(text.replace("Rewrote the title", "Rewrote the H1")).errors.join()).toMatch(/line 1: hash mismatch/);
    expect(verifyChain(`${lines[0]}\n${lines[2]}\n`).errors.join()).toMatch(/line 2: prev_hash/);
    expect(verifyChain(`${lines[1]}\n${lines[0]}\n${lines[2]}\n`).ok).toBe(false);
    const forged = JSON.stringify(chainLine(status({ ref: c1.id, status: "void" }), JSON.parse(lines[0]).hash));
    expect(verifyChain(`${lines[0]}\n${forged}\n${lines[1]}\n${lines[2]}\n`).ok).toBe(false);
  });

  it("fails on blank lines, a missing trailing newline, unknown kinds and duplicate change ids", () => {
    const text = chain([c1, s1]);
    expect(verifyChain(text.replace("\n", "\n\n")).errors.join()).toMatch(/blank/);
    expect(verifyChain(text.slice(0, -1)).errors.join()).toMatch(/newline/);
    expect(verifyChain(chain([{ ...s1, kind: "mystery" } as unknown as LedgerRecord])).errors.join()).toMatch(/unknown kind/);
    expect(verifyChain(chain([c1, c1])).errors.join()).toMatch(/duplicate change id/);
    expect(verifyChain(`${text}not json\n`).errors.join()).toMatch(/not valid JSON/);
  });

  it("--previous: accepts an append-only extension and rejects any change to earlier bytes", () => {
    const old = chain([c1, s1]);
    const extended = chain([c1, s1, s2]);
    expect(verifyChain(extended, old).ok).toBe(true);
    expect(verifyChain(old, old).ok).toBe(true);
    expect(verifyChain(old, extended).errors.join()).toMatch(/append-only/);
    // A fully re-hashed rewrite passes on its own; only the prefix proof catches it.
    const rewritten = chain([change({ summary: "something else" }), s1, s2]);
    expect(verifyChain(rewritten).ok).toBe(true);
    expect(verifyChain(rewritten, old).ok).toBe(false);
    expect(verifyChain(Buffer.from(extended), Buffer.from(old)).ok).toBe(true);
  });
});

// ------------------------------------------------------------ materialize

describe("materialize", () => {
  it("applies status events in order: live_at, PR, reverted, and a scored outcome", () => {
    const c1 = change();
    const note = JSON.stringify({ type: "score", scored_at: "2026-08-01T00:00:00.000Z", outcome: "win", ratio: 5, after: { clicks_28d: 9 }, before_window: {}, weeks: {}, controls: 2 });
    const lines = parseLedger(
      chain([
        c1,
        status({ ref: c1.id, status: "proposed", pr: 42 }),
        status({ ref: c1.id, status: "live", live_at: "2026-06-03T10:00:00.000Z" }),
        status({ ref: c1.id, status: "live", note }),
      ]),
    );
    const m = materialize(lines);
    expect(m.changes).toHaveLength(1);
    expect(m.changes[0]).toMatchObject({ pr: 42, status: "live", live_at: "2026-06-03T10:00:00.000Z", outcome: "win", scored_at: "2026-08-01T00:00:00.000Z" });
    expect(m.changes[0].after).toEqual({ clicks_28d: 9 });
    expect(m.changes[0]).not.toHaveProperty("hash");
    expect(lines[0]).not.toHaveProperty("status", "live"); // the input is not mutated
  });

  it("resolves pr:N refs, keeps `reverted` once set, ignores unknown refs and free-text notes", () => {
    const a = change({ pr: 7 });
    const b = change({ id: changeId("100", "app/blog/y/page.tsx", "/blog/y"), url: "/blog/y", file: "app/blog/y/page.tsx", pr: 7 });
    const m = materialize([
      a,
      b,
      status({ ref: "pr:7", status: "reverted" }),
      status({ ref: a.id, status: "live", note: "not json" }),
      status({ ref: "nope", status: "void" }),
    ]);
    expect(m.changes.map((c) => [c.status, c.reverted, c.outcome])).toEqual([
      ["live", true, "pending"],
      ["reverted", true, "pending"],
    ]);
  });

  it("collects holdout and global events", () => {
    const h: HoldoutEvent = { kind: "holdout", id: "h", run_id: "100", date: "2026-06-01", urls: ["/blog/h1"], until: "2026-07-27", salt: "holdout-2026-06-01" };
    const g: GlobalEvent = { kind: "global_event", id: "g", date: "2026-06-01", description: "F3 citations", urls: ["/blog/x"], pr: 9, exclude_until: "2026-07-27" };
    const m = materialize([h, g]);
    expect(m.holdouts).toEqual([h]);
    expect(m.globals).toEqual([g]);
  });
});

describe("resolveRef", () => {
  const a = change({ pr: 5 });
  const b = change({ id: "ab".repeat(20), run_id: "200", pr: 6 });
  const c = change({ id: "ac".repeat(20), run_id: "200", pr: 6 });

  it("matches an exact id, a unique prefix, pr:N and run:ID", () => {
    expect(resolveRef(a.id, [a, b, c])).toEqual([a]);
    expect(resolveRef("abababab", [a, b, c])).toEqual([b]);
    expect(resolveRef("pr:6", [a, b, c])).toEqual([b, c]);
    expect(resolveRef("run:200", [a, b, c])).toEqual([b, c]);
    expect(resolveRef("nope", [a, b, c])).toEqual([]);
    expect(resolveRef("abab", [a, b, c])).toEqual([]); // prefixes shorter than 8 never match
  });

  it("refuses an ambiguous prefix", () => {
    const d = change({ id: `${"ab".repeat(4)}ff${"0".repeat(30)}` });
    expect(() => resolveRef("abababab", [b, d])).toThrow(/ambiguous/);
  });
});

describe("activeHoldoutPaths", () => {
  it("unions holdouts whose `until` has not passed, as paths", () => {
    const events: HoldoutEvent[] = [
      { kind: "holdout", id: "1", run_id: "1", date: "2026-05-01", urls: ["/blog/old"], until: "2026-06-01", salt: "s" },
      { kind: "holdout", id: "2", run_id: "2", date: "2026-05-20", urls: ["https://usetruecap.com/blog/a/", "/blog/b"], until: "2026-07-15", salt: "s" },
    ];
    expect(activeHoldoutPaths(events, "2026-06-01")).toEqual(["/blog/a", "/blog/b", "/blog/old"]);
    expect(activeHoldoutPaths(events, "2026-06-02")).toEqual(["/blog/a", "/blog/b"]);
    expect(activeHoldoutPaths(events, "2026-05-19")).toEqual(["/blog/old"]);
  });
});

describe("pathOf and cleanChangeType", () => {
  it("normalizes URLs and paths to site paths", () => {
    expect(pathOf("https://usetruecap.com/blog/x/")).toBe("/blog/x");
    expect(pathOf("https://usetruecap.com/")).toBe("/");
    expect(pathOf("/blog/x/?utm=1#top")).toBe("/blog/x");
    expect(pathOf("/")).toBe("/");
  });

  it("turns a model-written change type into a stable slug", () => {
    expect(cleanChangeType("Title Rewrite")).toBe("title-rewrite");
    expect(cleanChangeType("prune/noindex")).toBe("prune-noindex");
    expect(cleanChangeType("  ")).toBe("unspecified");
    expect(cleanChangeType("x".repeat(100))).toHaveLength(64);
  });
});

// --------------------------------------------------------- append-changes

describe("buildChangeEntries", () => {
  const gsc = gscPull({}, { pages: { current: [{ page: "/blog/x", clicks: 3, impressions: 240, ctr: 0.0125, position: 11.4 }], prior: [] } });
  const idx = indexStatus([indexEntryFixture("/blog/x", { indexed: true, coverageState: "Submitted and indexed", lastCrawlTime: "2026-05-01T00:00:00.000Z" })]);
  const cr = crawl([crawlPage("/blog/x"), crawlPage("/blog/y")], {
    linkGraph: { ran: true, reason: null, edges: [{ from: "/blog/x", target: "/blog/y", anchor: "y", placement: "contextual" }], orphans: [] },
  });
  const base = {
    runId: "100",
    date: "2026-06-01",
    pr: null,
    include: null,
    holdout: ["https://usetruecap.com/blog/h2", "/blog/h1"],
    metrics: { gsc, indexStatus: idx, crawl: cr },
    existingIds: new Set<string>(),
  };
  const pageFile = { path: "app/blog/x/page.tsx", status: "M" as const, tier: 1 as const, url: "/blog/x", addedLines: 3, removedLines: 1 };
  const declared = { path: "/blog/x", file: "app/blog/x/page.tsx", skill: "seo-ctr" as const, changeType: "Title Rewrite", summary: "New title" };

  it("records one proposed change per accepted page, with tier, before-metrics and holdout from trusted inputs", () => {
    const forged = { ...declared, tier: 0, before: { clicks_28d: 999 } } as unknown as RunManifest["changes"][number];
    const { entries, skipped } = buildChangeEntries({ ...base, manifest: manifest([forged]), verdict: verdict([pageFile]) });
    expect(skipped).toEqual([]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: "change",
      id: createHash("sha1").update("100\napp/blog/x/page.tsx\n/blog/x").digest("hex"),
      run_id: "100",
      url: "/blog/x",
      tier: 1,
      change_type: "title-rewrite",
      skill: "seo-ctr",
      status: "proposed",
      live_at: null,
      outcome: "pending",
      reverted: false,
      holdout: ["/blog/h1", "/blog/h2"],
      before: { clicks_28d: 3, impressions_28d: 240, position: 11.4, indexed: true, coverageState: "Submitted and indexed", lastCrawlTime: "2026-05-01T00:00:00.000Z", mainHash: "hash-of-/blog/x" },
    });
    expect(entries[0].before_crawl).toMatchObject({ status: 200, noindex: false, canonicalIsSelf: true, jsonLdTypes: ["Article", "BreadcrumbList"], brokenTargets: [], linkTargets: ["/blog/y"] });
  });

  it("uses the verdict's derived URL when the manifest names a different page for the file", () => {
    const { entries, skipped } = buildChangeEntries({ ...base, manifest: manifest([{ ...declared, path: "/pricing" }]), verdict: verdict([pageFile]) });
    expect(entries.map((e) => e.url)).toEqual(["/blog/x"]);
    expect(skipped[0].reason).toMatch(/manifest path ignored/);
  });

  it("records shared files once per declared page, only for pages in the verdict's declared URLs", () => {
    const dataset = { path: "content/seo/market-facts.json", status: "M" as const, tier: 1 as const, url: null, addedLines: 8, removedLines: 0 };
    const changes = [
      { path: "/markets/austin", file: "content/seo/market-facts.json", skill: "seo-market-enrich" as const, changeType: "market-enrich", summary: "a" },
      { path: "/markets/boise", file: "content/seo/market-facts.json", skill: "seo-market-enrich" as const, changeType: "market-enrich", summary: "b" },
      { path: "/markets/sneaky", file: "content/seo/market-facts.json", skill: "seo-market-enrich" as const, changeType: "market-enrich", summary: "c" },
    ];
    const { entries, skipped } = buildChangeEntries({ ...base, manifest: manifest(changes), verdict: verdict([dataset], { declaredUrls: ["/markets/austin", "https://usetruecap.com/markets/boise"] }) });
    expect(entries.map((e) => e.url)).toEqual(["/markets/austin", "/markets/boise"]);
    expect(new Set(entries.map((e) => e.id)).size).toBe(2);
    expect(skipped).toEqual([{ file: "content/seo/market-facts.json", path: "/markets/sneaky", reason: "not among the verdict's declared URLs" }]);
  });

  it("records only files the publish plan kept, and ignores manifest changes the verdict never accepted", () => {
    const other = { ...pageFile, path: "app/blog/y/page.tsx", url: "/blog/y" };
    const changes = [declared, { ...declared, path: "/blog/y", file: "app/blog/y/page.tsx" }, { ...declared, path: "/blog/z", file: "app/blog/z/page.tsx" }];
    const { entries, skipped } = buildChangeEntries({ ...base, include: new Set(["app/blog/x/page.tsx"]), manifest: manifest(changes), verdict: verdict([pageFile, other]) });
    expect(entries.map((e) => e.file)).toEqual(["app/blog/x/page.tsx"]);
    expect(skipped[0]).toMatchObject({ file: "app/blog/y/page.tsx", reason: expect.stringMatching(/publish plan/) });
  });

  it("is idempotent: an id already in the ledger is skipped", () => {
    const first = buildChangeEntries({ ...base, manifest: manifest([declared]), verdict: verdict([pageFile]) });
    const again = buildChangeEntries({ ...base, existingIds: new Set(first.entries.map((e) => e.id)), manifest: manifest([declared]), verdict: verdict([pageFile]) });
    expect(again.entries).toEqual([]);
    expect(again.skipped[0].reason).toBe("already recorded");
  });

  it("refuses a failed verdict, an undeclared accepted file and an unknown skill", () => {
    expect(() => buildChangeEntries({ ...base, manifest: manifest([declared]), verdict: verdict([pageFile], { ok: false, violations: [{ rule: "x", path: null, detail: "y" }] }) })).toThrow(/not ok/);
    expect(() => buildChangeEntries({ ...base, manifest: manifest([]), verdict: verdict([pageFile]) })).toThrow(/declares no change/);
    const badSkill = { ...declared, skill: "seo-anything" } as unknown as RunManifest["changes"][number];
    expect(() => buildChangeEntries({ ...base, manifest: manifest([badSkill]), verdict: verdict([pageFile]) })).toThrow(/unknown skill/);
  });

  it("cleans model-written summaries: one line, bounded, never a credential or local path", () => {
    const messy = { ...declared, summary: `line one\nline\ttwo ${"x".repeat(400)}` };
    const [entry] = buildChangeEntries({ ...base, manifest: manifest([messy]), verdict: verdict([pageFile]) }).entries;
    expect(entry.summary).not.toMatch(/[\n\t]/);
    expect(entry.summary.length).toBeLessThanOrEqual(300);
    const leaky = { ...declared, summary: ["see", "", "Users", "someone", "notes.md"].join("/") };
    expect(buildChangeEntries({ ...base, manifest: manifest([leaky]), verdict: verdict([pageFile]) }).entries[0].summary).toMatch(/withheld/);
  });

  it("beforeMetrics reads zero traffic and null state for an unknown page", () => {
    expect(beforeMetrics("/blog/new", { gsc, indexStatus: idx, crawl: cr })).toEqual({ clicks_28d: 0, impressions_28d: 0, position: null, indexed: null, coverageState: null, lastCrawlTime: null, mainHash: null });
  });
});

describe("crawlSnapshot", () => {
  it("captures status, robots, canonical, schema and link facts for a page", () => {
    const cr = crawl([crawlPage("/blog/x", { jsonLdTypes: ["FAQPage", "Article"] })], {
      linkGraph: {
        ran: true,
        reason: null,
        edges: [
          { from: "/blog/x", target: "/blog/b", anchor: "b", placement: "contextual" },
          { from: "/blog/x", target: "/blog/a", anchor: "a", placement: "contextual" },
        ],
        orphans: [],
      },
      issues: { ...crawl([]).issues, brokenInternalLinks: [{ from: "/blog/x", target: "/blog/a", status: 404 }] },
    });
    expect(crawlSnapshot(cr, "/blog/x")).toEqual({
      crawledAt: "2026-05-25T00:00:00.000Z",
      status: 200,
      noindex: false,
      canonicalIsSelf: true,
      jsonLdTypes: ["Article", "FAQPage"],
      brokenTargets: ["/blog/a"],
      linkTargets: ["/blog/a", "/blog/b"],
    });
    expect(crawlSnapshot(cr, "/blog/missing")).toBeNull();
    expect(crawlSnapshot(null, "/blog/x")).toBeNull();
  });

  it("has no link facts when the crawl ran without a link graph", () => {
    const snap = crawlSnapshot(crawl([crawlPage("/blog/x")], { linkGraph: { ran: false, reason: "--limit", edges: [], orphans: [] } }), "/blog/x");
    expect(snap?.brokenTargets).toBeNull();
    expect(snap?.linkTargets).toBeNull();
  });
});

// ---------------------------------------------------------------- holdout

describe("holdout allocation", () => {
  it("allocates ceil(share × N) seats in proportion, not ceil per stratum", () => {
    const five = allocateQuotas(new Map(["a", "b", "c", "d", "e"].map((k) => [k, 1])), 0.2, "s");
    expect([...five.values()].reduce((x, y) => x + y, 0)).toBe(1);
    const mixed = allocateQuotas(new Map([["big", 10], ["mid", 5], ["one", 1]]), 0.2, "s");
    expect(mixed.get("big")).toBe(2);
    expect(mixed.get("mid")).toBe(1);
    expect([...mixed.values()].reduce((x, y) => x + y, 0)).toBe(Math.ceil(0.2 * 16));
    expect([...allocateQuotas(new Map([["a", 15]]), 0.2, "s").values()]).toEqual([3]); // 0.2 × 15 is 3.0000000000000004 in floating point
    expect([...allocateQuotas(new Map([["a", 4]]), 0, "s").values()]).toEqual([0]);
  });

  it("is deterministic for a salt", () => {
    const sizes = new Map(["a", "b", "c", "d", "e", "f", "g"].map((k) => [k, 1]));
    expect(allocateQuotas(sizes, 0.2, "holdout-2026-06-01")).toEqual(allocateQuotas(sizes, 0.2, "holdout-2026-06-01"));
  });

  it("buckets crawl age by the config thresholds", () => {
    const buckets = cfg.holdout.crawlAgeBucketsDays;
    expect(crawlAgeBucket(null, "2026-06-01", buckets)).toBe("never");
    expect(crawlAgeBucket("2026-05-20T08:00:00Z", "2026-06-01", buckets)).toBe("<30d");
    expect(crawlAgeBucket("2026-04-01", "2026-06-01", buckets)).toBe("<90d");
    expect(crawlAgeBucket("2026-01-01", "2026-06-01", buckets)).toBe(">=90d");
  });

  it("strata are family × crawl age", () => {
    const idx = indexStatus([indexEntryFixture("/blog/x", { lastCrawlTime: "2026-05-25T00:00:00.000Z" })]);
    const stratum = holdoutStratum(idx, "2026-06-01", cfg.holdout.crawlAgeBucketsDays);
    expect(stratum("/blog/x")).toBe("blog-post|<30d");
    expect(stratum("/markets/austin")).toBe("market-city|never");
  });
});

describe("holdout protection", () => {
  const candidates = {
    candidates: [
      { path: "/blog/busy-by-candidate", metrics: { impressions28d: 140 }, topQueries: [] },
      { path: "/blog/nonbrand-by-candidate", metrics: { impressions28d: 5 }, topQueries: [{ query: "rental cash flow", clicks: 1, impressions: 3, position: 9 }] },
    ],
  } as unknown as Candidates;
  const gsc = gscPull({}, {
    pages: { current: [{ page: "/blog/busy", clicks: 0, impressions: 100, ctr: 0, position: 20 }], prior: [] },
    pageQueries: {
      current: [
        { page: "/blog/nonbrand", query: "dscr loan calculator", clicks: 1, impressions: 9, ctr: 0.1, position: 8 },
        { page: "/blog/brand", query: "truecap app", clicks: 3, impressions: 9, ctr: 0.3, position: 1 },
      ],
      prior: [],
    },
  });
  const protect = holdoutProtection(gsc, candidates, cfg);

  it("never withholds pages with ≥100 impressions or any non-brand click", () => {
    expect(protect("/blog/busy")).toMatch(/100 impressions/);
    expect(protect("/blog/busy-by-candidate")).toMatch(/140 impressions/);
    expect(protect("/blog/nonbrand")).toMatch(/non-brand click/);
    expect(protect("/blog/nonbrand-by-candidate")).toMatch(/non-brand click/);
    expect(protect("/blog/brand")).toBeNull();
    expect(protect("/blog/quiet")).toBeNull();
  });
});

describe("planHoldout", () => {
  const paths = Array.from({ length: 20 }, (_, i) => `/blog/p${String(i).padStart(2, "0")}`);
  const input = {
    candidatePaths: [...paths, "/blog/busy", "/blog/held", "/blog", "https://usetruecap.com/blog/p00"],
    salt: "holdout-2026-06-01",
    share: cfg.holdout.share,
    stratumOf: (p: string) => (Number(p.slice(-2)) % 2 ? "blog-post|<30d" : "blog-post|never"),
    protectReason: (p: string) => (p === "/blog/busy" ? "traffic" : null),
    active: new Set(["/blog/held"]),
    isExcluded: (p: string) => p === "/blog",
  };

  it("draws 20% per stratum, skipping protected, excluded and already-withheld pages", () => {
    const plan = planHoldout(input);
    expect(plan.drawn).toHaveLength(4);
    expect(plan.strata).toEqual([
      { stratum: "blog-post|<30d", pool: 10, quota: 2 },
      { stratum: "blog-post|never", pool: 10, quota: 2 },
    ]);
    expect(plan.drawn.every((p) => paths.includes(p))).toBe(true);
    expect(plan.protected).toEqual([{ path: "/blog/busy", why: "traffic" }]);
    expect(plan.alreadyWithheld).toEqual(["/blog/held"]);
    expect(plan.excluded).toEqual(["/blog"]);
  });

  it("is reproducible for the same salt and changes with the salt", () => {
    expect(planHoldout(input).drawn).toEqual(planHoldout(input).drawn);
    const draws = new Set(["a", "b", "c", "d", "e"].map((s) => planHoldout({ ...input, salt: s }).drawn.join()));
    expect(draws.size).toBeGreaterThan(1);
  });

  it("counts pages already withheld toward the share and draws only the shortfall", () => {
    // 16 eligible + 4 already withheld: 20% of 20 is 4, so nothing new is drawn.
    const eligible = paths.slice(0, 16);
    const active = new Set(["/blog/w1", "/blog/w2", "/blog/w3", "/blog/w4"]);
    const full = planHoldout({ ...input, candidatePaths: eligible, active });
    expect(full).toMatchObject({ drawn: [], activeBefore: 4, target: 4 });
    // 2 already withheld: target 4 (20% of 18, rounded up), so 2 more are drawn, spread over the strata.
    const topUp = planHoldout({ ...input, candidatePaths: eligible, active: new Set(["/blog/w1", "/blog/w2"]) });
    expect(topUp).toMatchObject({ activeBefore: 2, target: 4 });
    expect(topUp.drawn).toHaveLength(2);
    expect(topUp.strata.map((s) => s.quota)).toEqual([1, 1]);
  });

  it("keeps the withheld share at or below config.holdout.share across overlapping weekly runs", () => {
    // score.ts hides withheld pages from the candidates, so each week offers only the pages not withheld.
    const pool = Array.from({ length: 100 }, (_, i) => `/blog/p${String(i).padStart(3, "0")}`);
    const events: HoldoutEvent[] = [];
    const shares: number[] = [];
    for (let week = 0; week < 20; week += 1) {
      const date = addDays("2026-06-01", week * 7);
      const active = new Set(activeHoldoutPaths(events, date));
      const plan = planHoldout({
        candidatePaths: pool.filter((p) => !active.has(p)),
        salt: `holdout-${date}`,
        share: cfg.holdout.share,
        stratumOf: (p) => (Number(p.slice(-3)) % 3 ? "blog-post|<30d" : "blog-post|never"),
        protectReason: () => null,
        active,
        isExcluded: () => false,
      });
      events.push({ kind: "holdout", id: String(week), run_id: String(week), date, urls: plan.drawn, until: addDays(date, cfg.holdout.weeks * 7), salt: `holdout-${date}` });
      shares.push(activeHoldoutPaths(events, date).length / pool.length);
    }
    expect(Math.max(...shares)).toBeLessThanOrEqual(cfg.holdout.share);
    // …and the control group never runs dry: when a cohort expires, the next run tops the share back up.
    expect(Math.min(...shares)).toBeCloseTo(cfg.holdout.share);
  });

  it("allocateQuotas can place an exact number of seats in proportion", () => {
    const sizes = new Map([["big", 12], ["small", 4]]);
    expect(allocateQuotas(sizes, 0.2, "s", 4)).toEqual(new Map([["big", 3], ["small", 1]]));
    expect(allocateQuotas(sizes, 0.2, "s", 0)).toEqual(new Map([["big", 0], ["small", 0]]));
    expect([...allocateQuotas(sizes, 0.2, "s", 99).values()]).toEqual([12, 4]);
  });
});

describe("runControls", () => {
  const h = (run: string, date: string, urls: string[], until: string): HoldoutEvent => ({ kind: "holdout", id: run, run_id: run, date, urls, until, salt: "s" });

  it("is the run's own draw plus every page still withheld on the date", () => {
    const events = [h("100", "2026-06-01", ["/blog/a", "https://usetruecap.com/blog/b"], "2026-07-27"), h("101", "2026-06-08", [], "2026-08-03"), h("90", "2026-04-01", ["/blog/old"], "2026-05-27")];
    expect(runControls(events, "101", "2026-06-08")).toEqual(["/blog/a", "/blog/b"]);
    expect(runControls(events, "100", "2026-06-01")).toEqual(["/blog/a", "/blog/b"]);
    expect(runControls(events, "102", "2026-08-10")).toEqual([]);
  });
});

// ------------------------------------------------------ outcome windows

describe("weekly windows", () => {
  it("lists the complete Monday–Sunday weeks inside a window", () => {
    expect(calendarFullWeeks("2026-05-06", "2026-06-02")).toEqual(["2026-05-11", "2026-05-18", "2026-05-25"]);
    expect(calendarFullWeeks("2026-06-01", "2026-06-28")).toEqual(["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22"]);
    expect(calendarFullWeeks("2026-06-02", "2026-06-07")).toEqual([]);
  });
});

const LIVE = "2026-06-03T15:00:00.000Z"; // a Wednesday: 3 complete weeks on each side
const beforeLive = (week: string): boolean => week < "2026-06-03";

function liveChange(over: Partial<LedgerChangeRecord> = {}): LedgerChangeRecord {
  return change({ status: "live", live_at: LIVE, pr: 12, ...over });
}

function ctx(gsc: GscPull, over: Partial<ScoreContext> = {}): ScoreContext {
  return {
    gsc,
    today: "2026-07-29",
    cfg,
    now: "2026-07-29T00:00:00.000Z",
    current: () => ({ indexed: true, coverageState: "Submitted and indexed", lastCrawlTime: null, mainHash: "h" }),
    ...over,
  };
}

function only(c: LedgerChangeRecord, extra: Partial<Materialized> = {}): Materialized {
  return { changes: [c], holdouts: [], globals: [], ...extra };
}

describe("compareToHoldout", () => {
  it("compares the same number of complete weeks on each side, against the mean holdout ratio", () => {
    const gsc = gscPull({
      "/blog/x": (w) => (beforeLive(w) ? 2 : 20),
      "/blog/h1": () => 5,
      "/blog/h2": (w) => (beforeLive(w) ? 3 : 6),
    });
    const cmp = compareToHoldout(liveChange(), gsc, [liveChange()], { requireCompleteWindows: true });
    if ("error" in cmp) throw new Error(cmp.error);
    expect(cmp.beforeWeeks).toEqual(["2026-05-11", "2026-05-18", "2026-05-25"]);
    expect(cmp.afterWeeks).toEqual(["2026-06-08", "2026-06-15", "2026-06-22"]);
    expect(cmp.url.before).toEqual({ clicks: 6, impressions: 150, position: 10 });
    expect(cmp.url.after.clicks).toBe(60);
    expect(cmp.clicksRatio).toBeCloseTo(61 / 7);
    expect(cmp.holdoutRatio).toBeCloseTo(((15 + 1) / (15 + 1) + (18 + 1) / (9 + 1)) / 2);
    expect(cmp.ratio).toBeCloseTo(61 / 7 / cmp.holdoutRatio!);
  });

  it("drops controls that had their own change go live inside the window, and the page itself", () => {
    const self = liveChange({ holdout: ["/blog/x", "/blog/h1", "/blog/h2"] });
    const treated = liveChange({ id: "other", url: "/blog/h2", live_at: "2026-06-20T00:00:00.000Z" });
    expect(holdoutControls(self, [self, treated])).toEqual(["/blog/h1"]);
    expect(holdoutControls(self, [self, { ...treated, live_at: "2026-09-01T00:00:00.000Z" }])).toEqual(["/blog/h1", "/blog/h2"]);
  });

  it("reports missing weekly coverage instead of comparing partial windows", () => {
    const gsc = gscPull({ "/blog/x": () => 1 }, {});
    gsc.weekly.weeks = WEEKS.filter((w) => w !== "2026-06-15");
    const strict = compareToHoldout(liveChange(), gsc, [], { requireCompleteWindows: true });
    expect(strict).toEqual({ error: expect.stringMatching(/does not cover/) });
    const lenient = compareToHoldout(liveChange(), gsc, [], { requireCompleteWindows: false });
    expect("error" in lenient ? null : lenient.afterWeeks).toEqual(["2026-06-08", "2026-06-22"]);
  });
});

describe("scoreChange", () => {
  const steady = { "/blog/h1": () => 5, "/blog/h2": () => 5 };

  it("labels a gain beyond the placebo band a win and a matching fall a loss", () => {
    const win = scoreChange(liveChange(), only(liveChange()), ctx(gscPull({ ...steady, "/blog/x": (w) => (beforeLive(w) ? 1 : 20) })));
    expect(win).toMatchObject({ note: { type: "score", outcome: "win", controls: 2, after: { clicks_28d: 60, impressions_28d: 150, holdout_ratio: 1, indexed: true } } });
    const loss = scoreChange(liveChange(), only(liveChange()), ctx(gscPull({ ...steady, "/blog/x": (w) => (beforeLive(w) ? 20 : 1) })));
    expect(loss).toMatchObject({ note: { outcome: "loss" } });
  });

  it("labels anything inside the band neutral, and a change without usable controls neutral with a null ratio", () => {
    const small = scoreChange(liveChange(), only(liveChange()), ctx(gscPull({ ...steady, "/blog/x": (w) => (beforeLive(w) ? 4 : 8) })));
    expect(small).toMatchObject({ note: { outcome: "neutral" } });
    const alone = liveChange({ holdout: [] });
    expect(scoreChange(alone, only(alone), ctx(gscPull({ "/blog/x": (w) => (beforeLive(w) ? 1 : 50) })))).toMatchObject({ note: { outcome: "neutral", ratio: null, controls: 0 } });
  });

  it("leaves a change pending when it is too young, not live, already scored or excluded", () => {
    const gsc = gscPull(steady);
    expect(scoreChange(liveChange(), only(liveChange()), ctx(gsc, { today: "2026-07-28" }))).toEqual({ skip: expect.stringMatching(/55 of the 56 days/) });
    expect(scoreChange(change(), only(change()), ctx(gsc))).toEqual({ skip: "status is proposed" });
    expect(scoreChange(liveChange({ outcome: "win" }), only(liveChange()), ctx(gsc))).toEqual({ skip: "already scored (win)" });
    const g: GlobalEvent = { kind: "global_event", id: "g".repeat(40), date: "2026-06-10", description: "F3 citations batch", urls: ["/blog/x"], pr: 3, exclude_until: "2026-08-05" };
    expect(scoreChange(liveChange(), only(liveChange(), { globals: [g] }), ctx(gsc))).toEqual({ skip: expect.stringMatching(/excluded by global event/) });
  });
});

describe("globalEventCovering", () => {
  const g = (over: Partial<GlobalEvent>): GlobalEvent => ({ kind: "global_event", id: "g", date: "2026-06-01", description: "d", urls: ["/blog/x"], pr: null, exclude_until: "2026-07-27", ...over });

  it("covers a change that went live inside the exclusion span, or whose after-window it lands in", () => {
    expect(globalEventCovering(liveChange(), [g({})])).not.toBeNull();
    expect(globalEventCovering(liveChange(), [g({ date: "2026-06-25", exclude_until: "2026-08-20" })])).not.toBeNull();
    expect(globalEventCovering(liveChange(), [g({ urls: ["*"] })])).not.toBeNull();
  });

  it("does not cover other pages, earlier spans or events after the after-window", () => {
    expect(globalEventCovering(liveChange(), [g({ urls: ["/blog/y"] })])).toBeNull();
    expect(globalEventCovering(liveChange(), [g({ date: "2026-04-01", exclude_until: "2026-06-02" })])).toBeNull();
    expect(globalEventCovering(liveChange(), [g({ date: "2026-07-02", exclude_until: "2026-08-27" })])).toBeNull();
  });
});

describe("scoreOutcomes", () => {
  it("emits one scoring status event per scorable change and materializes to its outcome", () => {
    const a = liveChange();
    const b = liveChange({ id: "young", live_at: "2026-07-20T00:00:00.000Z" });
    const m = only(a, { changes: [a, b] });
    const run = scoreOutcomes(m, ctx(gscPull({ "/blog/h1": () => 5, "/blog/h2": () => 5, "/blog/x": (w) => (beforeLive(w) ? 1 : 20) })));
    expect(run.scored).toEqual([expect.objectContaining({ id: a.id, outcome: "win", controls: 2 })]);
    expect(run.skipped).toEqual([expect.objectContaining({ id: "young" })]);
    expect(run.events).toHaveLength(1);
    expect(run.events[0]).toMatchObject({ kind: "status", ref: a.id, status: "live", date: "2026-07-29" });
    expect(materialize([a, ...run.events]).changes[0]).toMatchObject({ outcome: "win", scored_at: "2026-07-29T00:00:00.000Z" });
  });
});

describe("expired outcomes (the before-window left the 16-week GSC pull)", () => {
  const steady = { "/blog/h1": () => 5, "/blog/h2": () => 5, "/blog/x": () => 5 };
  /** The pull a later run sees: its oldest week is past the change's first before-week (2026-05-11). */
  const aged = (): GscPull => {
    const gsc = gscPull(steady);
    gsc.weekly.weeks = WEEKS.filter((w) => w >= "2026-05-18");
    gsc.weekly.rows = gsc.weekly.rows.filter((r) => r.weekStart >= "2026-05-18");
    return gsc;
  };

  it("names a change whose before-window can never come back, and only that", () => {
    expect(beforeWindowExpired(liveChange(), gscPull(steady))).toBeNull();
    expect(beforeWindowExpired(liveChange(), aged())).toMatch(/^expired: the 28 days before 2026-06-03 \(from week 2026-05-11\) are no longer in the GSC weekly pull \(from week 2026-05-18\)$/);
    expect(beforeWindowExpired(liveChange({ live_at: null }), aged())).toBeNull();
  });

  it("is recorded once as a terminal outcome instead of re-skipped as 'not scorable yet' every run", () => {
    const c = liveChange();
    const first = scoreOutcomes(only(c), ctx(aged(), { today: "2027-01-10", now: "2027-01-10T00:00:00.000Z" }));
    expect(first.scored).toEqual([]);
    expect(first.skipped).toEqual([]);
    expect(first.expired).toEqual([{ id: c.id, path: "/blog/x", change_type: "title-rewrite", reason: expect.stringMatching(/^expired: /) }]);
    expect(first.events).toHaveLength(1);
    const after = materialize([c, ...first.events]);
    expect(after.changes[0]).toMatchObject({ outcome: "neutral", expired: expect.stringMatching(/^expired: /), scored_at: "2027-01-10T00:00:00.000Z" });
    // Nothing is left pending for the next run.
    expect(scoreOutcomes(after, ctx(aged(), { today: "2027-01-17" })).events).toEqual([]);
  });

  it("counts expired changes apart from neutral results in lessons.md, and never toward the change-type brake", () => {
    const c = liveChange();
    const run = scoreOutcomes(only(c), ctx(aged(), { today: "2027-01-10" }));
    const section = outcomesSection(materialize([c, ...run.events]).changes, cfg, "2027-01-10");
    expect(section).not.toContain("| title-rewrite |");
    expect(section).toContain("Expired, never scored (their before-window left the GSC weekly pull before a run could score them): title-rewrite 1.");
    expect(outcomeUnits(materialize([c, ...run.events]).changes)[0]).toMatchObject({ outcome: "neutral", expired: true });
  });
});

describe("recentlyTreated (holdout controls must be untreated)", () => {
  it("keeps pages with a proposed change, or one live or reverted inside the settling window, out of a holdout draw", () => {
    const settle = cfg.outcomes.minAgeDays + 28;
    const treated = recentlyTreated(
      [
        change({ id: "p", url: "/blog/proposed", status: "proposed" }),
        change({ id: "l", url: "/blog/recent", status: "live", live_at: "2026-09-28T10:00:00Z" }),
        change({ id: "o", url: "/blog/settled", status: "live", live_at: "2026-08-01T10:00:00Z" }),
        change({ id: "r", url: "/blog/reverted", status: "reverted", live_at: "2026-10-20T10:00:00Z", reverted: true }),
        change({ id: "v", url: "/blog/void", status: "void" }),
      ],
      "2026-11-27",
      settle,
    );
    expect([...treated.keys()].sort()).toEqual(["/blog/proposed", "/blog/recent", "/blog/reverted"]);
    expect(treated.get("/blog/recent")).toBe(`a loop change went live 60 day(s) ago (under ${settle}): not an untreated control`);
  });
});

describe("planStatusEvents", () => {
  const opts = { status: "live" as const, liveAt: null, pr: null, date: "2026-06-03", now: "2026-06-03T12:00:00.000Z" };

  it("sets live_at from --live-at or now, and leaves a change already in that state alone", () => {
    const { events, unchanged } = planStatusEvents([change(), liveChange({ id: "already" })], opts);
    expect(events).toEqual([expect.objectContaining({ ref: change().id, status: "live", live_at: "2026-06-03T12:00:00.000Z" })]);
    expect(events[0]).not.toHaveProperty("pr");
    expect(unchanged).toEqual(["already"]);
    expect(planStatusEvents([change()], { ...opts, liveAt: "2026-06-02T09:00:00.000Z" }).events[0].live_at).toBe("2026-06-02T09:00:00.000Z");
  });

  it("attaches a PR to a change already live without moving its live_at", () => {
    const { events } = planStatusEvents([liveChange({ pr: null })], { ...opts, pr: 88 });
    expect(events[0]).toMatchObject({ pr: 88, live_at: LIVE });
  });
});

// ------------------------------------------------------------- lessons

describe("lessons.md", () => {
  it("renders win/loss/neutral counts and a loss rate over wins and losses only", () => {
    const section = outcomesSection(
      [
        liveChange({ id: "1", url: "/blog/a1", outcome: "win" }),
        liveChange({ id: "2", url: "/blog/a2", outcome: "loss" }),
        liveChange({ id: "3", url: "/blog/a3", outcome: "loss" }),
        liveChange({ id: "4", url: "/blog/a4", outcome: "neutral" }),
        liveChange({ id: "5", url: "/blog/a5" }),
        liveChange({ id: "6", change_type: "internal-link", status: "reverted", reverted: true }),
        change({ id: "7", change_type: "never-live" }),
        change({ id: "8", change_type: "voided", status: "void" }),
      ],
      cfg,
      "2026-07-29",
    );
    expect(section.startsWith(`${OUTCOMES_HEADING}\n\nUpdated 2026-07-29`)).toBe(true);
    expect(section).toContain("| internal-link | 0 | 0 | 0 | 0 | 1 | — |");
    expect(section).toContain("| title-rewrite | 1 | 2 | 1 | 1 | 0 | 67% |");
    expect(section).not.toMatch(/never-live|voided/);
    expect(outcomesSection([], cfg, "2026-07-29")).toContain("No change has gone live yet.");
  });

  it("outcomeUnits groups entries by run, page and change type", () => {
    const units = outcomeUnits([
      liveChange({ id: "p", file: "app/blog/x/page.tsx", change_type: "new-article", outcome: "loss" }),
      liveChange({ id: "o", file: "app/blog/x/opengraph-image.tsx", url: "https://usetruecap.com/blog/x/", change_type: "new-article", outcome: "loss" }),
      liveChange({ id: "r", file: "lib/blog-posts.ts", change_type: "new-article", outcome: "loss", status: "reverted", reverted: true }),
      liveChange({ id: "l", file: "lib/blog-posts.ts", change_type: "internal-link" }),
    ]);
    expect(units).toEqual([
      { run_id: "100", path: "/blog/x", change_type: "new-article", ids: ["p", "o", "r"], outcome: "loss", live: true, reverted: true, expired: false },
      { run_id: "100", path: "/blog/x", change_type: "internal-link", ids: ["l"], outcome: "pending", live: true, reverted: false, expired: false },
    ]);
  });

  it("counts a new article's three file entries as one outcome, and a revert of any of them as the article's", () => {
    const article = ["app/blog/x/page.tsx", "app/blog/x/opengraph-image.tsx", "lib/blog-posts.ts"].map((file) =>
      liveChange({ id: `n-${file}`, file, change_type: "new-article", outcome: "loss" }),
    );
    expect(outcomesSection(article, cfg, "2026-07-29")).toContain("| new-article | 0 | 1 | 0 | 0 | 0 | 100% |");
    const oneReverted = article.map((c, i) => (i === 2 ? { ...c, status: "reverted" as const, reverted: true } : c));
    expect(outcomesSection(oneReverted, cfg, "2026-07-29")).toContain("| new-article | 0 | 1 | 0 | 0 | 1 | 100% |");
    // The same page in another run is another decision.
    expect(outcomesSection([...article, liveChange({ id: "later", run_id: "101", change_type: "new-article", outcome: "win" })], cfg, "2026-07-29")).toContain("| new-article | 1 | 1 | 0 | 0 | 0 | 50% |");
  });

  it("replaces only its own section and keeps every other byte", () => {
    const doc = "# Lessons\n\n## Baseline 2026-09-27 (F0)\n\n- 329 indexed\n\n## Outcomes by change type\n\nold table\n\n### detail\n\nold detail\n\n## Baseline 2026-11-01 (F10)\n\n- later\n";
    const out = replaceSection(doc, OUTCOMES_HEADING, `${OUTCOMES_HEADING}\n\nnew table\n\n`);
    expect(out).toBe("# Lessons\n\n## Baseline 2026-09-27 (F0)\n\n- 329 indexed\n\n## Outcomes by change type\n\nnew table\n\n## Baseline 2026-11-01 (F10)\n\n- later\n");
  });

  it("appends the section when it is missing, and ignores a heading inside a code fence", () => {
    expect(replaceSection("# Lessons\n\n## Baseline\n\nx\n", OUTCOMES_HEADING, `${OUTCOMES_HEADING}\n\nt`)).toBe(`# Lessons\n\n## Baseline\n\nx\n\n${OUTCOMES_HEADING}\n\nt\n`);
    expect(replaceSection("", OUTCOMES_HEADING, `${OUTCOMES_HEADING}\n\nt`)).toBe(`${OUTCOMES_HEADING}\n\nt\n`);
    const fenced = `# L\n\n\`\`\`\n${OUTCOMES_HEADING}\n\`\`\`\n\n${OUTCOMES_HEADING}\n\nold\n`;
    expect(replaceSection(fenced, OUTCOMES_HEADING, `${OUTCOMES_HEADING}\n\nnew`)).toBe(`# L\n\n\`\`\`\n${OUTCOMES_HEADING}\n\`\`\`\n\n${OUTCOMES_HEADING}\n\nnew\n`);
  });
});

// -------------------------------------------------------------------- CLI

describe("ledger CLI (temp state dir)", () => {
  const saved = { state: process.env.SEO_STATE_DIR, data: process.env.SEO_DATA_DIR, today: process.env.SEO_TODAY };
  let dir: string;
  let dataDir: string;
  let stdout: string[];

  const run = async (...argv: string[]): Promise<{ code: number; json: unknown }> => {
    stdout = [];
    const code = await main(parseArgs(argv));
    const text = stdout.join("\n");
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { code, json };
  };
  const ledgerText = (): string => readFileSync(path.join(dir, "ledger.jsonl"), "utf8");
  const writeData = (name: string, value: unknown): void => writeFileSync(path.join(dataDir, name), JSON.stringify(value));

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "seo-ledger-"));
    dataDir = path.join(dir, "data");
    mkdirSync(dataDir, { recursive: true });
    process.env.SEO_STATE_DIR = dir;
    process.env.SEO_DATA_DIR = dataDir;
    process.env.SEO_TODAY = "2026-06-01";
    stdout = [];
    vi.spyOn(console, "log").mockImplementation((...parts: unknown[]) => {
      stdout.push(parts.map(String).join(" "));
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const [key, value] of [["SEO_STATE_DIR", saved.state], ["SEO_DATA_DIR", saved.data], ["SEO_TODAY", saved.today]] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("runs a change through holdout → append → attach-pr → live → score-outcomes, with an intact chain", async () => {
    const pages = ["/blog/x", ...Array.from({ length: 10 }, (_, i) => `/blog/c${i}`)];
    writeData("candidates-2026-06-01.json", { generatedAt: "", profile: {}, candidates: pages.map((p) => ({ path: p, metrics: { impressions28d: 1 }, topQueries: [] })), gapClusters: [], dormant: [], requestIndexing: [] });
    writeData("gsc-2026-06-01.json", gscPull({}, { pages: { current: [{ page: "/blog/x", clicks: 2, impressions: 80, ctr: 0.025, position: 14 }], prior: [] } }));
    writeData("crawl-2026-06-01.json", crawl(pages.map((p) => crawlPage(p))));
    writeData("index-status.json", indexStatus([indexEntryFixture("/blog/x")]));

    const holdout = await run("holdout", "--run-id", "100", "--out", path.join(dataDir, "active-holdout.json"));
    expect(holdout.code).toBe(0);
    const withheld = (holdout.json as { withheld: string[] }).withheld;
    expect(withheld.length).toBeGreaterThanOrEqual(2);
    expect(JSON.parse(readFileSync(path.join(dataDir, "active-holdout.json"), "utf8"))).toEqual(withheld);
    expect((await run("holdout", "--run-id", "100")).json).toMatchObject({ withheld }); // not redrawn

    const target = pages.find((p) => !withheld.includes(p)) as string;
    const file = `app/blog${target.slice(5)}/page.tsx`;
    writeData("manifest.json", manifest([{ path: target, file, skill: "seo-internal-links", changeType: "internal-link", summary: "Linked from the hub" }]));
    writeData("verdict.json", verdict([{ path: file, status: "M", tier: 0, url: target, addedLines: 1, removedLines: 0 }]));
    writeData("plan.json", { include: [file] });
    const appendArgs = ["append-changes", "--manifest", path.join(dataDir, "manifest.json"), "--verdict", path.join(dataDir, "verdict.json"), "--plan", path.join(dataDir, "plan.json"), "--run-id", "100"];
    expect((await run(...appendArgs)).json).toMatchObject({ appended: [{ url: target, tier: 0, change_type: "internal-link" }] });
    const afterAppend = ledgerText();
    expect((await run(...appendArgs)).json).toMatchObject({ appended: [], skipped: [{ reason: "already recorded" }] });
    expect(ledgerText()).toBe(afterAppend);

    expect((await run("attach-pr", "--run-id", "100", "--pr", "31")).json).toMatchObject({ pr: 31, attached: [expect.any(String)] });
    expect((await run("set-status", "--ref", "pr:31", "--status", "live", "--live-at", LIVE)).code).toBe(0);
    expect((await run("set-status", "--ref", "pr:31", "--status", "live")).json).toMatchObject({ appended: [] });

    const query = (await run("query", "--status", "live")).json as LedgerChangeRecord[];
    expect(query).toHaveLength(1);
    expect(query[0]).toMatchObject({ url: target, pr: 31, status: "live", live_at: LIVE, holdout: withheld });
    expect(query[0]).not.toHaveProperty("before_crawl");
    expect(((await run("query", "--full")).json as LedgerChangeRecord[])[0].before_crawl).toMatchObject({ status: 200 });
    expect((await run("active-holdouts")).json).toEqual(withheld);

    const beforeScoring = ledgerText();
    writeFileSync(path.join(dir, "lessons.md"), "# SEO loop lessons\n\n## Baseline 2026-06-01 (F0)\n\nkept verbatim\n");
    process.env.SEO_TODAY = "2026-07-29";
    const clicks: WeeklySpec = Object.fromEntries(withheld.map((p) => [p, () => 4]));
    clicks[target] = (w) => (beforeLive(w) ? 1 : 25);
    writeData("gsc-2026-07-29.json", gscPull(clicks));
    expect((await run("score-outcomes", "--dry-run")).json).toMatchObject({ scored: [{ outcome: "win" }] });
    expect(ledgerText()).toBe(beforeScoring);
    const scored = await run("score-outcomes");
    expect(scored.json).toMatchObject({ scored: [{ path: target, outcome: "win" }], skipped: [] });
    expect((await run("score-outcomes")).json).toMatchObject({ scored: [] }); // idempotent
    const lessons = readFileSync(path.join(dir, "lessons.md"), "utf8");
    expect(lessons).toContain("## Baseline 2026-06-01 (F0)\n\nkept verbatim\n");
    expect(lessons).toContain("| internal-link | 1 | 0 | 0 | 0 | 0 | 0% |");

    writeFileSync(path.join(dir, "previous.jsonl"), beforeScoring);
    expect((await run("verify-chain", "--previous", path.join(dir, "previous.jsonl"))).json).toMatchObject({ ok: true, errors: [] });
    writeFileSync(path.join(dir, "ledger.jsonl"), ledgerText().replace("Linked from the hub", "Linked from nowhere"));
    const broken = await run("verify-chain");
    expect(broken.code).toBe(1);
    expect(broken.json).toMatchObject({ ok: false });
    await expect(run("set-status", "--ref", "pr:31", "--status", "void")).rejects.toThrow(/broken ledger/);
  });

  it("tops the holdout up rather than drawing 20% again, and gives a run without a draw of its own the active controls", async () => {
    const pages = Array.from({ length: 11 }, (_, i) => `/blog/c${String(i).padStart(2, "0")}`);
    const candidates = (paths: string[]): unknown => ({ generatedAt: "", profile: {}, candidates: paths.map((p) => ({ path: p, metrics: { impressions28d: 1 }, topQueries: [] })), gapClusters: [], dormant: [], requestIndexing: [] });
    writeData("candidates-2026-06-01.json", candidates(pages));
    writeData("gsc-2026-06-01.json", gscPull());
    const first = (await run("holdout", "--run-id", "100")).json as { withheld: string[] };
    expect(first.withheld).toHaveLength(3); // ceil(20% of 11)

    // A week later score.ts no longer offers the withheld pages; the share is already met, so nothing new is drawn.
    process.env.SEO_TODAY = "2026-06-08";
    writeData("candidates-2026-06-08.json", candidates(pages.filter((p) => !first.withheld.includes(p))));
    const second = await run("holdout", "--run-id", "101");
    expect(second.json).toMatchObject({ withheld: [], active: first.withheld, target: 3, activeBefore: 3 });

    const target = pages.find((p) => !first.withheld.includes(p)) as string;
    const file = `app/blog${target.slice(5)}/page.tsx`;
    writeData("manifest.json", manifest([{ path: target, file, skill: "seo-ctr", changeType: "title-rewrite", summary: "New title" }]));
    writeData("verdict.json", verdict([{ path: file, status: "M", tier: 0, url: target, addedLines: 1, removedLines: 1 }]));
    await run("append-changes", "--manifest", path.join(dataDir, "manifest.json"), "--verdict", path.join(dataDir, "verdict.json"), "--run-id", "101");
    const recorded = (await run("query", "--run-id", "101")).json as LedgerChangeRecord[];
    expect(recorded).toHaveLength(1);
    expect(recorded[0].holdout).toEqual(first.withheld);
  });

  it("never draws a page the loop changed recently into a new holdout", async () => {
    writeData("candidates-2026-06-01.json", { generatedAt: "", profile: {}, candidates: [{ path: "/blog/x", metrics: { impressions28d: 1 }, topQueries: [] }], gapClusters: [], dormant: [], requestIndexing: [] });
    writeData("gsc-2026-06-01.json", gscPull());
    // /blog/x went live 60 days ago: still settling, so not a clean control.
    const recent = change({ id: "c-recent", date: "2026-03-30", status: "proposed" });
    writeFileSync(path.join(dir, "ledger.jsonl"), chain([recent, status({ ref: "c-recent", status: "live", live_at: "2026-04-02T12:00:00.000Z", date: "2026-04-02" })]));
    const held = (await run("holdout", "--run-id", "200")).json as { withheld: string[]; protected: Array<{ path: string; why: string }> };
    expect(held.withheld).toEqual([]);
    expect(held.protected).toEqual([{ path: "/blog/x", why: expect.stringMatching(/^a loop change went live 60 day\(s\) ago/) }]);
  });

  it("draws a page again once its change has settled", async () => {
    writeData("candidates-2026-06-01.json", { generatedAt: "", profile: {}, candidates: [{ path: "/blog/x", metrics: { impressions28d: 1 }, topQueries: [] }], gapClusters: [], dormant: [], requestIndexing: [] });
    writeData("gsc-2026-06-01.json", gscPull());
    const old = change({ id: "c-old", date: "2026-01-02", status: "proposed" });
    writeFileSync(path.join(dir, "ledger.jsonl"), chain([old, status({ ref: "c-old", status: "live", live_at: "2026-01-05T12:00:00.000Z", date: "2026-01-05" })]));
    expect(((await run("holdout", "--run-id", "201")).json as { withheld: string[] }).withheld).toEqual(["/blog/x"]);
  });

  it("records a global event once and validates its URLs", async () => {
    const args = ["global-event", "--description", "F3 citations batch 1", "--urls", "/blog/a,https://usetruecap.com/blog/b/", "--pr", "57"];
    const first = await run(...args);
    expect(first.json).toMatchObject({ kind: "global_event", urls: ["/blog/a", "/blog/b"], pr: 57, exclude_until: "2026-07-27" });
    await run(...args);
    expect(ledgerText().trim().split("\n")).toHaveLength(1);
    await expect(run("global-event", "--description", "x", "--urls", "https://example.com/a")).rejects.toThrow(/not on usetruecap.com/);
    expect((await run("global-event", "--description", "template change", "--urls", "*", "--exclude-days", "28")).json).toMatchObject({ urls: ["*"], exclude_until: "2026-06-29" });
  });

  it("fails loudly on bad input and unknown commands", async () => {
    expect((await run("nonsense")).code).toBe(1);
    await expect(run("set-status", "--ref", "x", "--status", "live")).rejects.toThrow(/matches no change/);
    await expect(run("set-status", "--ref", "x", "--status", "merged")).rejects.toThrow(/--status must be/);
    await expect(run("holdout", "--run-id", "bad id!")).rejects.toThrow(/--run-id/);
    await expect(run("append-changes", "--run-id", "1", "--manifest", "m", "--verdict", "v")).rejects.toThrow();
    expect(existsSync(path.join(dir, "ledger.jsonl"))).toBe(false);
    expect((await run("verify-chain")).json).toMatchObject({ ok: true, lines: 0 });
  });
});
