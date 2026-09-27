import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DIGEST_LIST_CAP,
  DIGEST_MAX_CHARS,
  DIGEST_REQUEST_INDEXING,
  REDACTED,
  SIGNUPS_LINE,
  buildReport,
  capLength,
  changesThisRun,
  comparison,
  dispositions,
  indexedAsOf,
  main,
  materializeLedger,
  nextCandidates,
  oneLine,
  parseCritic,
  parseFrontmatter,
  parseMode,
  parsePlan,
  parseRunSummary,
  pickPreviousReport,
  redact,
  redactDocument,
  renderFrontmatter,
  renderReport,
  sanitizeForGithub,
  topCandidates,
  versus,
  type ReportFrontmatter,
  type ReportInput,
} from "../../seo/scripts/report.ts";
import { buildPlan, type CriticVerdict } from "../../seo/scripts/publish-plan.ts";
import { parseArgs } from "../../seo/scripts/lib/cli.ts";
import { assertPublishable } from "../../seo/scripts/lib/io.ts";
import { loadConfig } from "../../seo/scripts/lib/config.ts";
import type {
  Brakes,
  Candidate,
  Candidates,
  GscPull,
  IndexStatus,
  IndexStatusUrl,
  InspectionSnapshot,
  LedgerChange,
  LedgerEvent,
  RunManifest,
  VerifyVerdict,
} from "../../seo/scripts/lib/types.ts";

/**
 * seo/scripts/report.ts: the weekly report and the digest comment.
 *
 * The sanitizer tests matter most. The report is published on a public
 * branch and posted as an issue comment, and much of its text comes from the
 * model's manifest, the critic and GSC. A regression there lets that text
 * @-mention people, cross-reference or close issues, or embed a tracking
 * image in a public comment. The sign-ups tests pin the founder's decision
 * that counts never appear (the line is fixed text).
 */

const ZWSP = String.fromCharCode(0x200b);
const config = loadConfig();

// -------------------------------------------------------------- fixtures

const snapshot = (inspectedAt: string, indexed: boolean | null, coverageState = indexed ? "Submitted and indexed" : "Crawled - currently not indexed"): InspectionSnapshot => ({
  inspectedAt,
  source: "api",
  verdict: indexed ? "PASS" : "NEUTRAL",
  coverageState,
  indexingState: null,
  robotsTxtState: null,
  pageFetchState: null,
  lastCrawlTime: null,
  googleCanonical: null,
  userCanonical: null,
  indexed,
});

const statusUrl = (p: string, current: InspectionSnapshot, history: InspectionSnapshot[] = [], extra: Record<string, unknown> = {}): IndexStatusUrl =>
  ({
    ...current,
    url: `https://usetruecap.com${p}`,
    path: p,
    family: "blog-post",
    sitemap: [],
    referringUrls: [],
    firstSeenInSitemap: "2026-06-01",
    everIndexed: false,
    indexClass: current.indexed ? "indexed" : "crawled_not_indexed",
    mainHashAtInspect: null,
    wordCount: null,
    uniqueRatio: null,
    thin: null,
    history,
    ...extra,
  }) as IndexStatusUrl;

const statusOf = (entries: IndexStatusUrl[]): IndexStatus =>
  ({
    generatedAt: "2026-09-28T08:00:00Z",
    site: "sc-domain:usetruecap.com",
    sitemapReport: [],
    quota: { day: "2026-09-28", used: 0 },
    summary: { total: entries.length, indexed: 0, byClass: {}, byFamily: {} },
    urls: Object.fromEntries(entries.map((e) => [e.url, e])),
  }) as unknown as IndexStatus;

const metric = (clicks: number, impressions: number) => ({ clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: 20 });
const gscOf = (current: [number, number], prior: [number, number] = [10, 1000]): GscPull =>
  ({
    generatedAt: "2026-09-28T08:00:00Z",
    site: "sc-domain:usetruecap.com",
    windows: { current: { startDate: "2026-08-29", endDate: "2026-09-25" }, prior: { startDate: "2026-08-01", endDate: "2026-08-28" } },
    totals: { current: metric(...current), prior: metric(...prior) },
    pages: { current: [], prior: [] },
    pageQueries: { current: [], prior: [] },
    weekly: { weeks: [], rows: [] },
    weeklyTotals: [],
  }) as GscPull;

const candidate = (p: string, opportunity: number, extra: Partial<Candidate> = {}): Candidate => ({
  path: p,
  family: "blog-post",
  reasons: [{ reason: "STRIKING_DISTANCE", detail: "pos 12" }],
  skill: "seo-striking-distance",
  opportunity,
  metrics: { clicks28d: 1, impressions28d: 200, ctr28d: 0.005, position28d: 12.4 },
  indexClass: "indexed",
  editableSource: null,
  cooldownUntil: null,
  topQueries: [],
  ...extra,
});

const candidatesOf = (extra: Partial<Candidates> = {}): Candidates => ({
  generatedAt: "2026-09-28T08:00:00Z",
  profile: { crawlStalled: false, unknownUrls: 0, crawledNotIndexedTrend: [] },
  candidates: [],
  gapClusters: [],
  dormant: [],
  requestIndexing: [],
  ...extra,
});

const brakesOf = (extra: Partial<Brakes> = {}): Brakes => ({
  generatedAt: "2026-09-28T08:00:00Z",
  pageRegressions: [],
  indexDrops: [],
  gscPageLosses: [],
  siteWide: { triggered: false, applied: false, priorWeekClicks: 6, latestWeekClicks: 6, dropShare: 0, note: "" },
  demotedChangeTypes: [],
  ...extra,
});

const change = (id: string, runId: string, url: string, extra: Partial<LedgerChange> = {}): LedgerChange => ({
  kind: "change",
  id,
  run_id: runId,
  date: "2026-09-28",
  url,
  file: `app/blog${url.slice(5)}/page.tsx`,
  tier: 1,
  change_type: "add-citations",
  skill: "seo-citations",
  summary: "summary",
  pr: null,
  status: "proposed",
  live_at: null,
  before: { clicks_28d: 0, impressions_28d: 0, position: null, indexed: true, coverageState: null, lastCrawlTime: null, mainHash: null },
  holdout: [],
  scored_at: null,
  after: null,
  outcome: "pending",
  reverted: false,
  ...extra,
});

const manifestOf = (extra: Partial<RunManifest> = {}): RunManifest => ({ runId: "run-1", changes: [], skipped: [], issues: [], ...extra });

const verdictOf = (files: Array<{ path: string; tier: 0 | 1 | 2 }>, extra: Partial<VerifyVerdict> = {}): VerifyVerdict => ({
  ok: true,
  patchSha256: "0".repeat(64),
  tier: Math.max(0, ...files.map((f) => f.tier)) as 0 | 1 | 2,
  files: files.map((f) => ({ path: f.path, status: "M", tier: f.tier, url: null, addedLines: 1, removedLines: 1 })),
  declaredUrls: [],
  violations: [],
  caps: { files: files.length, lines: 2 * files.length, pages: files.length, newArticles: 0, noindex: 0 },
  ...extra,
});

const FM: ReportFrontmatter = { clicks28d: 20, impressions28d: 2800, indexed: 3, generatedAt: "2026-09-21T09:41:00.000Z" };

function inputOf(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    today: "2026-09-28",
    generatedAt: "2026-09-28T09:41:00.000Z",
    label: "2026-W40",
    base: config.site.base,
    caps: config.caps,
    gapArticlesWhileCrawlStalled: config.gates.gapArticlesWhileCrawlStalled,
    mode: "review",
    runId: "run-1",
    pr: null,
    gsc: gscOf([24, 3033], [19, 2900]),
    indexStatus: statusOf([
      statusUrl("/blog/a", snapshot("2026-09-27T08:00:00Z", true), [snapshot("2026-09-13T08:00:00Z", true)]),
      statusUrl("/blog/b", snapshot("2026-09-27T08:00:00Z", false), [snapshot("2026-09-13T08:00:00Z", true)]),
      statusUrl("/blog/c", snapshot("2026-09-27T08:00:00Z", true), [snapshot("2026-09-13T08:00:00Z", false)]),
    ]),
    candidates: candidatesOf({ candidates: [candidate("/blog/a", 3.2)] }),
    brakes: brakesOf(),
    halt: { halted: false, since: null, reason: null, id: null, clearWithAck: null },
    haltAck: null,
    ledger: materializeLedger([]),
    manifest: null,
    verdict: null,
    critic: null,
    runCost: null,
    previous: null,
    inputs: [],
    ...overrides,
  };
}

const h2 = (md: string): string[] => md.split("\n").filter((line) => /^## /.test(line));
const lineWith = (md: string, needle: string): string => md.split("\n").find((line) => line.includes(needle)) ?? "";

const REPORT_SECTIONS = [
  "## Headline",
  "## Changes this run",
  "## Skipped and why",
  "## Brakes",
  "## Holdout this run",
  "## Next week's top 10 candidates",
  "## Dormant skills",
  "## Request indexing (manual, in Search Console)",
];

// ------------------------------------------------------------- sanitizer

describe("sanitizeForGithub", () => {
  it("neutralizes issue and PR references in every form GitHub links", () => {
    const out = sanitizeForGithub("See #123, (#45), owner/repo#6 and GH-7 or gh-8.");
    expect(out).not.toMatch(/#\d/);
    expect(out).not.toMatch(/gh-\d/i);
    // The reader still sees the same characters: only a zero-width space is inserted.
    expect(out.split(ZWSP).join("")).toBe("See #123, (#45), owner/repo#6 and GH-7 or gh-8.");
  });

  it("neutralizes @mentions, including team mentions", () => {
    const out = sanitizeForGithub("cc @octocat and @some-org/some-team");
    expect(out).not.toMatch(/@[A-Za-z0-9]/);
    expect(out).toContain(`@${ZWSP}octocat`);
    expect(sanitizeForGithub("a @ b")).toBe("a @ b");
  });

  it.each(["fix", "fixes", "fixed", "close", "closes", "closed", "resolve", "resolves", "resolved"])(
    "breaks the closing keyword %s before an issue reference or URL",
    (keyword) => {
      const upper = keyword.toUpperCase();
      for (const text of [`${keyword} #12`, `${upper}: #12`, `${keyword} https://github.com/o/r/issues/12`, `${keyword} o/r#12`, `${keyword} GH-12`]) {
        const out = sanitizeForGithub(text);
        expect(out, text).not.toMatch(new RegExp(`\\b${keyword}\\b`, "i"));
        expect(out.split(ZWSP).join(""), text).toBe(text);
      }
    },
  );

  it("leaves a closing keyword alone when no reference follows", () => {
    expect(sanitizeForGithub("We fixed the title and closed the gap.")).toBe("We fixed the title and closed the gap.");
    expect(sanitizeForGithub("prefix https://x.test")).toBe("prefix https://x.test");
  });

  it("strips raw HTML tags, and a split tag cannot reassemble", () => {
    const out = sanitizeForGithub('a <img src=x onerror="alert(1)"> b <details open><summary>s</summary></details> c <scr<script>ipt>alert(1)</script>');
    expect(out).not.toMatch(/<[A-Za-z/!?]/);
    expect(out).toContain("alert(1)");
    // Removed, not merely escaped: the reassembled "<script>" is stripped on a later pass.
    expect(out).not.toContain("script");
  });

  it("escapes an unfinished tag so it cannot open an HTML block", () => {
    const out = sanitizeForGithub("line\n<script\nmore");
    expect(out).toBe("line\n&lt;script\nmore");
  });

  it("strips HTML comments, including a forged frontmatter below the first line", () => {
    const forged = `${renderFrontmatter(FM)}`;
    const out = sanitizeForGithub(`# Title\n${forged}\nvisible <!-- hidden\nacross lines --> end`);
    expect(out).not.toContain("hidden");
    expect(out).not.toContain("seo-report");
    expect(out).toContain("visible  end");
  });

  it("shows an unterminated comment as text instead of hiding the rest of the page", () => {
    const out = sanitizeForGithub("before <!-- never closed\nafter");
    expect(out).toContain("&lt;!-- never closed");
    expect(out).toContain("after");
  });

  it("strips inline and reference images but keeps ordinary links", () => {
    const out = sanitizeForGithub("a ![pixel](https://t.test/p.gif) b ![ref][img] c [docs](https://usetruecap.com/methodology)");
    expect(out).not.toContain("![");
    expect(out).not.toContain("p.gif");
    expect(out).toContain("[docs](https://usetruecap.com/methodology)");
  });

  it("keeps a valid frontmatter on the first line verbatim, and only that one", () => {
    const doc = `${renderFrontmatter(FM)}\n# Report\n`;
    expect(sanitizeForGithub(doc)).toBe(doc);
    const extraKey = `<!-- seo-report {"clicks28d":1,"impressions28d":1,"indexed":1,"generatedAt":"2026-09-21T09:41:00.000Z","x":1} -->\n# R`;
    expect(sanitizeForGithub(extraKey)).toBe("\n# R");
    const stringValue = `<!-- seo-report {"clicks28d":"1","impressions28d":1,"indexed":1,"generatedAt":"2026-09-21T09:41:00.000Z"} -->\n# R`;
    expect(sanitizeForGithub(stringValue)).toBe("\n# R");
  });

  it("leaves ordinary report markdown untouched", () => {
    const md = "## Headline\n\n| URL | Pos. |\n|---|---:|\n| `/blog/a` | 12.4 |\n\n- position < 20 and ≥ 100 impressions → striking distance\n- a\\|b\n";
    expect(sanitizeForGithub(md)).toBe(md);
  });

  it("is idempotent", () => {
    const nasty = [
      `${renderFrontmatter(FM)}`,
      "fixes #1 closes o/r#2 resolved: https://github.com/o/r/issues/3 GH-4 @user <b>x</b> <scr<i>ipt> ![p](u) <!-- c --> <!-- open",
      "| cell \\| more | <script",
    ].join("\n");
    const once = sanitizeForGithub(nasty);
    expect(sanitizeForGithub(once)).toBe(once);
  });
});

// ------------------------------------------------ frontmatter, previous

describe("frontmatter", () => {
  it("round-trips, including null values", () => {
    const fm: ReportFrontmatter = { clicks28d: null, impressions28d: 3033, indexed: null, generatedAt: "2026-09-28T09:41:00Z" };
    const text = `${renderFrontmatter(fm)}\n# Report`;
    expect(text.split("\n")[0]).toMatch(/^<!-- seo-report \{.*\} -->$/);
    expect(parseFrontmatter(text)).toEqual(fm);
  });

  it("is null when absent, not on the first line, or malformed", () => {
    expect(parseFrontmatter("# Report")).toBeNull();
    expect(parseFrontmatter(`\n${renderFrontmatter(FM)}`)).toBeNull();
    expect(parseFrontmatter("<!-- seo-report {not json} -->")).toBeNull();
    expect(parseFrontmatter('<!-- seo-report {"clicks28d":1,"impressions28d":1,"indexed":1,"generatedAt":"yesterday"} -->')).toBeNull();
  });
});

describe("pickPreviousReport", () => {
  it("takes the newest week strictly before the current one", () => {
    expect(pickPreviousReport(["2026-W37.md", "2026-W39.md", "2026-W38.md", "2026-W40.md", "README.md", "2026-W38.md.tmp"], "2026-W40")).toBe("2026-W39.md");
  });

  it("does not compare a re-run with itself, and crosses a year boundary", () => {
    expect(pickPreviousReport(["2026-W40.md"], "2026-W40")).toBeNull();
    expect(pickPreviousReport(["2025-W52.md", "2025-W51.md"], "2026-W01")).toBe("2025-W52.md");
  });
});

// ---------------------------------------------------------- indexedAsOf

describe("indexedAsOf", () => {
  it("counts each URL's newest inspection on or before the date", () => {
    const status = inputOf().indexStatus;
    expect(indexedAsOf(status, "2026-09-28")).toEqual({ asOf: "2026-09-28", indexed: 2, total: 3, known: 3 });
    // A week earlier only the 09-13 snapshots existed: a and b indexed, c not.
    expect(indexedAsOf(status, "2026-09-21")).toEqual({ asOf: "2026-09-21", indexed: 2, total: 3, known: 3 });
  });

  it("counts the population in the sitemap on that date", () => {
    const status = statusOf([
      statusUrl("/blog/old", snapshot("2026-09-13T08:00:00Z", true)),
      statusUrl("/blog/new", snapshot("2026-09-27T08:00:00Z", true), [], { firstSeenInSitemap: "2026-09-25" }),
      statusUrl("/blog/gone", snapshot("2026-09-13T08:00:00Z", true), [], { removedFromSitemap: "2026-09-24" }),
    ]);
    expect(indexedAsOf(status, "2026-09-28")).toMatchObject({ indexed: 2, total: 2 });
    expect(indexedAsOf(status, "2026-09-21")).toMatchObject({ indexed: 2, total: 2, known: 2 });
  });

  it("is null when nothing had been inspected by then, or there is no index-status", () => {
    const status = statusOf([statusUrl("/blog/a", snapshot("2026-09-27T08:00:00Z", true))]);
    expect(indexedAsOf(status, "2026-09-21")).toBeNull();
    expect(indexedAsOf(null, "2026-09-21")).toBeNull();
  });
});

// --------------------------------------------------------------- ledger

describe("materializeLedger", () => {
  const status = (ref: string, s: LedgerChange["status"], extra: Record<string, unknown> = {}): LedgerEvent =>
    ({ kind: "status", id: `s-${ref}-${s}`, date: "2026-09-29", ref, status: s, ...extra }) as LedgerEvent;

  it("applies status events by change id, latest wins", () => {
    const { changes } = materializeLedger([
      change("c1", "run-1", "/blog/a"),
      status("c1", "live", { pr: 57, live_at: "2026-09-29T10:00:00Z" }),
      status("c1", "reverted"),
    ]);
    expect(changes[0]).toMatchObject({ status: "reverted", pr: 57, live_at: "2026-09-29T10:00:00Z", reverted: true });
  });

  it("applies a pr:N reference to every change in that PR", () => {
    const { changes } = materializeLedger([
      change("c1", "run-1", "/blog/a", { pr: 57 }),
      change("c2", "run-1", "/blog/b", { pr: 57 }),
      change("c3", "run-1", "/blog/c", { pr: 58 }),
      status("pr:57", "live", { live_at: "2026-09-30T00:00:00Z" }),
    ]);
    expect(changes.map((c) => c.status)).toEqual(["live", "live", "proposed"]);
  });

  it("never lets a duplicate change line replace the original, and ignores unknown refs", () => {
    const { changes } = materializeLedger([change("c1", "run-1", "/blog/a"), change("c1", "run-9", "/blog/zzz"), status("nope", "live")]);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ run_id: "run-1", url: "/blog/a", status: "proposed" });
  });

  it("reads the outcome score-outcomes stores as JSON in a note", () => {
    const after = { clicks_28d: 9, impressions_28d: 400, position: 8, indexed: true, coverageState: null, lastCrawlTime: null, mainHash: null, holdout_ratio: 1.1, clicks_ratio: 4.5 };
    const { changes } = materializeLedger([
      change("c1", "run-1", "/blog/a", { status: "live" }),
      status("c1", "live", { note: JSON.stringify({ outcome: "win", after }) }),
      change("c2", "run-1", "/blog/b", { status: "live" }),
      status("c2", "live", { note: "manual note, not JSON" }),
    ]);
    expect(changes[0]).toMatchObject({ outcome: "win", scored_at: "2026-09-29", after });
    expect(changes[1]).toMatchObject({ outcome: "pending", after: null });
  });

  it("collects holdout events in ledger order", () => {
    const holdout = (id: string, runId: string): LedgerEvent => ({ kind: "holdout", id, run_id: runId, date: "2026-09-28", urls: ["/blog/x"], until: "2026-11-23", salt: "s" });
    expect(materializeLedger([holdout("h1", "run-0"), change("c1", "run-1", "/blog/a"), holdout("h2", "run-1")]).holdouts.map((h) => h.id)).toEqual(["h1", "h2"]);
  });
});

// ---------------------------------------------------- critic, run summary

describe("parseCritic", () => {
  it("reads the critic's {verdicts} output and keeps the verdict string exactly as written", () => {
    expect(parseCritic({ verdicts: [{ file: "app/blog/a/page.tsx", verdict: "reject", reasons: ["a", "b"] }] })).toEqual([
      { file: "app/blog/a/page.tsx", verdict: "reject", reason: "a; b" },
    ]);
  });

  it("reads no other shape, because publish-plan reads none", () => {
    const entry = { file: "app/blog/a/page.tsx", verdict: "APPROVE", reasons: [] };
    expect(parseCritic([entry])).toEqual([]);
    expect(parseCritic({ files: [entry] })).toEqual([]);
    expect(parseCritic({ "app/blog/a/page.tsx": { verdict: "APPROVE", reasons: [] } })).toEqual([]);
  });

  it("keeps an entry without a verdict (it still blocks), drops one without a file, and never throws on garbage", () => {
    expect(parseCritic({ verdicts: [{ file: "x" }, { verdict: "APPROVE" }, null, 3] })).toEqual([{ file: "x", verdict: null, reason: "" }]);
    expect(parseCritic("APPROVE")).toEqual([]);
    expect(parseCritic(null)).toEqual([]);
    expect(parseCritic({ verdicts: "APPROVE" })).toEqual([]);
  });
});

describe("parseRunSummary", () => {
  it("keeps turns, cost and the NAMES of denied tools, never their input", () => {
    const secretish = "cat ~/.config/some-credentials.json";
    const [row] = parseRunSummary({
      num_turns: 45,
      total_cost_usd: 2.134,
      permission_denials: [{ tool_name: "Bash", tool_input: { command: secretish } }, { tool_name: "Bash" }, { tool_name: "WebFetch" }, { tool_name: "<b>x</b>" }],
    });
    expect(row).toEqual({ job: "run", turns: 45, costUsd: 2.134, denials: 4, deniedTools: { Bash: 2, WebFetch: 1, other: 1 } });
    expect(JSON.stringify(row)).not.toContain("credentials");
  });

  it("reads one row per job", () => {
    const rows = parseRunSummary({ model: { turns: 40, costUsd: 2 }, critic: { turns: 10, cost_usd: 0.5, denials: 0 }, note: "ignored" });
    expect(rows.map((r) => [r.job, r.turns, r.costUsd, r.denials])).toEqual([
      ["model", 40, 2, null],
      ["critic", 10, 0.5, 0],
    ]);
  });

  it("is empty for a non-object", () => {
    expect(parseRunSummary([1, 2])).toEqual([]);
    expect(parseRunSummary(null)).toEqual([]);
  });
});

// ------------------------------------------------- dispositions, changes

describe("dispositions", () => {
  const manifest = manifestOf({
    changes: [
      { path: "/blog/a", file: "app/blog/a/page.tsx", skill: "seo-ctr", changeType: "title", summary: "" },
      { path: "/blog/b", file: "app/blog/b/page.tsx", skill: "seo-citations", changeType: "citations", summary: "" },
      { path: "/blog/c", file: "app/blog/c/page.tsx", skill: "seo-citations", changeType: "citations", summary: "" },
    ],
  });
  const verdict = verdictOf([
    { path: "app/blog/a/page.tsx", tier: 0 },
    { path: "app/blog/b/page.tsx", tier: 1 },
  ]);

  it("takes the tier from verify-static and drops files it did not accept", () => {
    const out = dispositions(manifest, verdict, parseCritic({ verdicts: [{ file: "app/blog/b/page.tsx", verdict: "APPROVE", reasons: [] }] }));
    expect(out.map((d) => [d.path, d.tier, d.accepted])).toEqual([
      ["/blog/a", 0, true],
      ["/blog/b", 1, true],
      ["/blog/c", null, false],
    ]);
    expect(out[2].reason).toBe("not in the verified patch");
  });

  it("drops a tier-1 file the critic did not APPROVE, but never a tier-0 file", () => {
    const out = dispositions(manifest, verdict, parseCritic({ verdicts: [{ file: "app/blog/b/page.tsx", verdict: "REJECT", reasons: ["vendor source for a tax fact"] }] }));
    expect(out[0].accepted).toBe(true);
    expect(out[1]).toMatchObject({ accepted: false, reason: "critic REJECT: vendor source for a tax fact" });
    const silent = dispositions(manifest, verdict, []);
    expect(silent[1]).toMatchObject({ accepted: false, reason: "no critic verdict for a tier-1 file" });
  });

  it("drops a tier-1 file when there is no critic file at all, as publish does", () => {
    const out = dispositions(manifest, verdict, null);
    expect(out[0]).toMatchObject({ tier: 0, accepted: true });
    expect(out[1]).toMatchObject({ tier: 1, accepted: false, reason: "no critic verdict for a tier-1 file" });
  });

  it("publishes a tier-2 file even when the critic rejects it or is absent (the critic is advisory there)", () => {
    const research = manifestOf({ changes: [{ path: "/research/x", file: "app/research/x/page.tsx", skill: "seo-citations", changeType: "rewrite", summary: "" }] });
    const tier2 = verdictOf([{ path: "app/research/x/page.tsx", tier: 2 }]);
    const rejected = dispositions(research, tier2, parseCritic({ verdicts: [{ file: "app/research/x/page.tsx", verdict: "REJECT", reasons: ["weak source"] }] }));
    expect(rejected[0]).toMatchObject({ tier: 2, accepted: true, reason: null });
    expect(dispositions(research, tier2, null)[0]).toMatchObject({ tier: 2, accepted: true });
  });

  it("needs the exact string APPROVE, in the entry for the exact file, and takes the last entry for a file", () => {
    const b = "app/blog/b/page.tsx";
    const decide = (verdicts: unknown[]) => dispositions(manifest, verdict, parseCritic({ verdicts }))[1];
    expect(decide([{ file: b, verdict: "approve", reasons: [] }])).toMatchObject({
      accepted: false,
      reason: 'critic said "approve", and a tier-1 file needs exactly APPROVE',
    });
    expect(decide([{ file: b, verdict: " APPROVE", reasons: [] }]).accepted).toBe(false);
    expect(decide([{ file: b, reasons: ["no verdict given"] }])).toMatchObject({
      accepted: false,
      reason: "critic gave no verdict, and a tier-1 file needs exactly APPROVE: no verdict given",
    });
    // An entry naming the page's URL instead of its file matches nothing, in publish or here.
    expect(decide([{ file: "/blog/b", verdict: "APPROVE", reasons: [] }])).toMatchObject({ accepted: false, reason: "no critic verdict for a tier-1 file" });
    expect(decide([{ file: "x", path: "/blog/b", url: "/blog/b", verdict: "APPROVE", reasons: [] }]).accepted).toBe(false);
    expect(decide([{ file: b, verdict: "APPROVE", reasons: [] }, { file: b, verdict: "REJECT", reasons: ["second look"] }])).toMatchObject({
      accepted: false,
      reason: "critic REJECT: second look",
    });
    expect(decide([{ file: b, verdict: "REJECT", reasons: [] }, { file: b, verdict: "APPROVE", reasons: [] }]).accepted).toBe(true);
  });

  it("agrees with publish-plan's buildPlan on every tier and critic shape", () => {
    const files = ["app/blog/t0/page.tsx", "app/blog/t1/page.tsx", "app/research/t2/page.tsx"];
    const tiers: Array<0 | 1 | 2> = [0, 1, 2];
    const plainVerdict = verdictOf(files.map((f, i) => ({ path: f, tier: tiers[i] })));
    const plainManifest = manifestOf({ changes: files.map((f) => ({ path: `/${f}`, file: f, skill: "seo-ctr", changeType: "title", summary: "" })) });
    const entry = (file: string, v: string) => ({ file, verdict: v, reasons: ["r"] });
    const critics: Array<{ verdicts: Array<{ file: string; verdict: string; reasons: string[] }> } | null> = [
      null,
      { verdicts: [] },
      { verdicts: files.map((f) => entry(f, "APPROVE")) },
      { verdicts: files.map((f) => entry(f, "REJECT")) },
      { verdicts: files.map((f) => entry(f, "approve")) },
      { verdicts: files.map((f) => entry(`/${f}`, "APPROVE")) },
      { verdicts: files.flatMap((f) => [entry(f, "APPROVE"), entry(f, "REJECT")]) },
      { verdicts: files.flatMap((f) => [entry(f, "REJECT"), entry(f, "APPROVE")]) },
    ];
    for (const critic of critics) {
      const plan = buildPlan("run-1", plainVerdict, critic as CriticVerdict | null);
      const decided = dispositions(plainManifest, plainVerdict, critic === null ? null : parseCritic(critic));
      expect(
        decided.map((d) => [d.file, d.accepted]),
        JSON.stringify(critic),
      ).toEqual(files.map((f) => [f, plan.include.includes(f)]));
    }
  });

  it("accepts nothing without a verdict or when the verdict failed", () => {
    expect(dispositions(manifest, null, null).every((d) => !d.accepted && d.reason === "no verify-static verdict for this run")).toBe(true);
    const failed = dispositions(manifest, { ...verdict, ok: false, violations: [{ rule: "import", path: "x", detail: "y" }] }, null);
    expect(failed.every((d) => !d.accepted && d.reason === "verify-static failed the patch (1 violation(s))")).toBe(true);
  });
});

describe("dispositions from the publish plan (--plan)", () => {
  const manifest = manifestOf({
    changes: [
      { path: "/blog/70-percent-rule-house-flipping", file: "app/blog/70-percent-rule-house-flipping/page.tsx", skill: "seo-citations", changeType: "citations", summary: "" },
      { path: "/blog/a", file: "app/blog/a/page.tsx", skill: "seo-ctr", changeType: "title-meta", summary: "" },
    ],
  });
  const verdict = verdictOf([
    { path: "app/blog/70-percent-rule-house-flipping/page.tsx", tier: 1 },
    { path: "app/blog/a/page.tsx", tier: 0 },
  ]);

  it("takes what shipped from the plan, so an approved tier-1 file is never reported as 'no critic verdict'", () => {
    const plan = parsePlan({ include: ["app/blog/70-percent-rule-house-flipping/page.tsx", "app/blog/a/page.tsx"], dropped: [] });
    const out = dispositions(manifest, verdict, null, plan);
    expect(out.map((d) => [d.path, d.accepted, d.reason])).toEqual([
      ["/blog/70-percent-rule-house-flipping", true, null],
      ["/blog/a", true, null],
    ]);
  });

  it("gives the plan's reason for a dropped file (the critic's words, or the page group it went with)", () => {
    const plan = parsePlan({
      include: [],
      dropped: [
        { file: "app/blog/70-percent-rule-house-flipping/page.tsx", reason: "critic REJECT: Pub 544 does not say dealers pay ordinary income on flips" },
        { file: "app/blog/a/page.tsx", reason: "held back: the new article /blog/n was dropped, and this run's pages were verified with it present" },
      ],
    });
    const out = dispositions(manifest, verdict, null, plan);
    expect(out[0]).toMatchObject({ accepted: false, reason: "critic REJECT: Pub 544 does not say dealers pay ordinary income on flips" });
    expect(out[1]).toMatchObject({ accepted: false, reason: expect.stringMatching(/^held back: the new article/) });
  });

  it("without a plan, decides with publish-plan's own buildPlan, page groups included", () => {
    const groupVerdict: VerifyVerdict = {
      ...verdictOf([]),
      files: [
        { path: "app/blog/n/page.tsx", status: "A", tier: 1, url: "/blog/n", urls: ["/blog/n"], addedLines: 80, removedLines: 0 },
        { path: "app/blog/a/page.tsx", status: "M", tier: 0, url: "/blog/a", urls: ["/blog/a"], addedLines: 1, removedLines: 1 },
      ],
    };
    const m = manifestOf({ changes: [{ path: "/blog/n", file: "app/blog/n/page.tsx", skill: "seo-gap-article", changeType: "new-article", summary: "", newArticle: true }, { path: "/blog/a", file: "app/blog/a/page.tsx", skill: "seo-ctr", changeType: "title-meta", summary: "" }] });
    const out = dispositions(m, groupVerdict, parseCritic({ verdicts: [{ file: "app/blog/n/page.tsx", verdict: "REJECT", reasons: ["thin"] }] }));
    expect(out[0]).toMatchObject({ accepted: false, reason: "critic REJECT: thin" });
    expect(out[1]).toMatchObject({ accepted: false, reason: expect.stringMatching(/^held back: the new article \/blog\/n was dropped/) });
  });

  it("ignores a --plan that is not a publish plan", () => {
    expect(parsePlan({ include: "x" })).toBeNull();
    expect(parsePlan(null)).toBeNull();
    expect(parsePlan({ include: ["a"], dropped: [{ file: "b" }] })).toEqual({ include: ["a"], dropped: [{ file: "b", reason: "dropped by the publish plan" }] });
  });
});

describe("next week's candidates", () => {
  it("leaves out pages in an active holdout and pages the loop touched inside the cooldown (this run's included)", () => {
    const ledger = materializeLedger([
      change("c1", "run-1", "/blog/changed-now", { date: "2026-09-28" }),
      change("c2", "run-0", "/blog/live-last-month", { status: "live", live_at: "2026-09-10T10:00:00Z", date: "2026-09-01" }),
      change("c3", "run-0", "/blog/live-long-ago", { status: "live", live_at: "2026-07-01T10:00:00Z", date: "2026-06-25" }),
      { kind: "holdout", id: "h", run_id: "run-1", date: "2026-09-28", urls: ["/blog/held"], until: "2026-11-23", salt: "s" },
      { kind: "holdout", id: "h0", run_id: "run-0", date: "2026-06-01", urls: ["/blog/held-before"], until: "2026-07-27", salt: "s" },
    ]);
    const list = ["/blog/changed-now", "/blog/held", "/blog/live-last-month", "/blog/live-long-ago", "/blog/held-before", "/blog/free"].map((p, i) => candidate(p, 10 - i));
    const input = inputOf({ ledger, candidates: candidatesOf({ candidates: list }) });
    const next = nextCandidates(input);
    expect(next.top.map((c) => c.path)).toEqual(["/blog/live-long-ago", "/blog/held-before", "/blog/free"]);
    expect(next).toMatchObject({ heldOut: 1, cooling: 2 });
    const { report } = buildReport(input);
    const section = report.slice(report.indexOf("## Next week's"), report.indexOf("## Dormant skills"));
    expect(section).toContain("Left out: 1 ranked page is withheld as holdout controls, and 2 were changed by the loop within 30 days.");
    expect(section).toContain("| 1 | `/blog/live-long-ago` |");
    expect(section).not.toContain("`/blog/held`");
    expect(section).not.toContain("`/blog/changed-now`");
  });
});

describe("changesThisRun", () => {
  const ledger = materializeLedger([change("c1", "run-1", "/blog/a", { tier: 0 }), change("c2", "run-0", "/blog/old", { pr: 50 }), change("c3", "run-1", "/blog/b", { pr: 60 })]);

  it("lists only this run's ledger entries, filling a missing PR from --pr", () => {
    const out = changesThisRun(ledger, "run-1", [], 61);
    expect(out.source).toBe("ledger");
    expect(out.rows.map((r) => [r.path, r.tier, r.pr])).toEqual([
      ["/blog/a", 0, 61],
      ["/blog/b", 1, 60],
    ]);
  });

  it("falls back to the accepted manifest changes when the ledger has none", () => {
    const decided = dispositions(
      manifestOf({ changes: [{ path: "/blog/z", file: "app/blog/z/page.tsx", skill: "seo-ctr", changeType: "title", summary: "" }] }),
      verdictOf([{ path: "app/blog/z/page.tsx", tier: 0 }]),
      null,
    );
    expect(changesThisRun(ledger, "run-2", decided, null)).toEqual({ source: "manifest", rows: [{ path: "/blog/z", tier: 0, changeType: "title", skill: "seo-ctr", pr: null }] });
  });

  it("attributes nothing without a run id", () => {
    expect(changesThisRun(ledger, null, [], null)).toEqual({ source: "none", rows: [] });
  });
});

describe("topCandidates", () => {
  it("orders by opportunity, then reason count, then path, and keeps 10", () => {
    const two = [
      { reason: "LOW_CTR" as const, detail: "" },
      { reason: "THIN" as const, detail: "" },
    ];
    const list = [candidate("/b", 5), candidate("/a", 5), candidate("/c", 5, { reasons: two }), ...Array.from({ length: 12 }, (_, i) => candidate(`/z${i}`, 1))];
    const top = topCandidates(candidatesOf({ candidates: list }));
    expect(top).toHaveLength(10);
    expect(top.slice(0, 3).map((c) => c.path)).toEqual(["/c", "/a", "/b"]);
    expect(topCandidates(null)).toEqual([]);
  });
});

describe("number wording", () => {
  it("states the basis, the absolute change and the percentage", () => {
    expect(versus(24, 21, "last report 2026-W39")).toBe("24 (last report 2026-W39: 21; +3, +14%)");
    expect(versus(3033, 3100, "prior 28 days")).toBe("3,033 (prior 28 days: 3,100; -67, -2%)");
    expect(versus(5, 5, "x")).toBe("5 (x: 5; no change)");
    expect(versus(5, 0, "x")).toBe("5 (x: 0; +5)");
    expect(versus(null, 5, "x")).toBe("unavailable");
    expect(comparison(5, null, "x")).toBe("");
  });

  it("flattens untrusted text to one line", () => {
    expect(oneLine("a\n\n## b\tc", 50)).toBe("a ## b c");
    expect(oneLine("x".repeat(30), 10)).toBe(`${"x".repeat(9)}…`);
  });
});

// -------------------------------------------------------------- redaction

// Built at run time: the identity sweep forbids these paths and token shapes in source.
const RUNNER_HOME = ["", "home", "runner"].join("/");
const MAC_HOME = ["", "Users", "someone"].join("/");
const FAKE_TOKEN = ["gh", "p_", "A".repeat(36)].join("");
const KEY_FIELD = ['"private', '_key"'].join("");
const publishes = (md: string): boolean => {
  try {
    assertPublishable(md, "test");
    return true;
  } catch {
    return false;
  }
};

describe("redaction", () => {
  it("keeps only what follows the account directory of a local path", () => {
    expect(oneLine(`could not read ${RUNNER_HOME}/work/x/y/app/page.tsx`)).toBe("could not read ~/work/x/y/app/page.tsx");
    expect(oneLine(`cwd ${MAC_HOME}`)).toBe("cwd ~");
    expect(redact(`'${MAC_HOME}/a' and ${RUNNER_HOME}/b`)).toBe("'~/a' and ~/b");
    expect(redact("/blog/home-equity and /glossary/noi")).toBe("/blog/home-equity and /glossary/noi");
  });

  it("replaces a credential-shaped cell whole", () => {
    expect(oneLine(`token ${FAKE_TOKEN} leaked`)).toBe(REDACTED);
    expect(publishes(oneLine(`token ${FAKE_TOKEN}`))).toBe(true);
  });

  it("catches a path that sanitizing joins together, and a credential two cells form", () => {
    const split = `- could not read ${RUNNER_HOME.replace("home", "ho<b></b>me")}/work/x`;
    expect(oneLine(split)).toBe(split);
    expect(redactDocument(sanitizeForGithub(split))).toBe("- could not read ~/work/x");
    expect(redactDocument(`# t\n- ${KEY_FIELD}: x\n| \`a\` | ${KEY_FIELD}: b |\nok`)).toBe(`# t\n${REDACTED}\n| ${REDACTED} |\nok`);
  });

  it("makes both outputs publishable whatever the manifest, critic, verdict or candidates say", () => {
    const planted = `read ${RUNNER_HOME}/work/r/r/app/x.tsx with ${FAKE_TOKEN} from ${MAC_HOME}/.config`;
    const manifest = manifestOf({
      changes: [{ path: "/blog/b", file: "app/blog/b/page.tsx", skill: "seo-citations", changeType: "citations", summary: planted }],
      skipped: [{ path: `${RUNNER_HOME}/work/p`, skill: null, reason: planted }],
      issues: [{ title: planted, body: planted, tier: 2 }],
    });
    const verdict = verdictOf([{ path: "app/blog/b/page.tsx", tier: 1 }], {
      violations: [
        { rule: KEY_FIELD, path: null, detail: "joined" },
        { rule: "links", path: `${MAC_HOME}/x`, detail: planted },
      ],
    });
    const critic = parseCritic({ verdicts: [{ file: "app/blog/b/page.tsx", verdict: "REJECT", reasons: [planted] }] });
    const candidates = candidatesOf({
      dormant: [{ skill: "seo-ctr", needs: planted, current: `${RUNNER_HOME.replace("home", "ho<i></i>me")}/work/q` }],
      requestIndexing: [{ path: "/x", why: planted }],
    });
    const runCost = parseRunSummary({ model: { turns: 1, permission_denials: [{ tool_name: FAKE_TOKEN }] } });
    const halt = { halted: true, since: "2026-09-28", reason: planted, id: "h-1", clearWithAck: "h-1" };
    const { report, digest } = buildReport(inputOf({ manifest, verdict, critic, candidates, runCost, halt }));
    for (const md of [report, digest]) {
      expect(publishes(md)).toBe(true);
      expect(md).not.toContain("runner/");
      expect(md).not.toContain("someone");
      expect(md).toContain("~/work/q");
      expect(sanitizeForGithub(md)).toBe(md);
    }
    expect(report).toContain(`- \`~/work/p\`: ${REDACTED}`);
    // The rule and its detail were harmless apart; the joined line is replaced.
    expect(report.split("\n")).toContain(REDACTED);
    expect(parseFrontmatter(report)).not.toBeNull();
  });
});

// ------------------------------------------------------------ buildReport

describe("buildReport", () => {
  it("writes the brief's sections in order in both outputs, and Run cost only when given", () => {
    const { report, digest } = buildReport(inputOf());
    expect(h2(report)).toEqual(REPORT_SECTIONS);
    expect(h2(digest)).toEqual(REPORT_SECTIONS);
    const withCost = buildReport(inputOf({ runCost: parseRunSummary({ num_turns: 3, total_cost_usd: 0.4 }) }));
    expect(h2(withCost.report)).toEqual([...REPORT_SECTIONS, "## Run cost"]);
    expect(withCost.report).toContain("| run | 3 | $0.40 | — |");
  });

  it("always prints the fixed sign-ups line and never a sign-up number", () => {
    const { report, digest } = buildReport(inputOf());
    for (const md of [report, digest]) {
      expect(lineWith(md, "sign-ups")).toBe(`- ${SIGNUPS_LINE}`);
      expect(md.match(/sign-ups/gi)).toHaveLength(1);
    }
    expect(SIGNUPS_LINE).toBe("Organic sign-ups: tracked privately — see /admin/seo");
  });

  it("starts the report with its frontmatter; the digest has none", () => {
    const { report, digest, frontmatter } = buildReport(inputOf());
    expect(frontmatter).toEqual({ clicks28d: 24, impressions28d: 3033, indexed: 2, generatedAt: "2026-09-28T09:41:00.000Z" });
    expect(parseFrontmatter(report)).toEqual(frontmatter);
    expect(report.startsWith("<!-- seo-report ")).toBe(true);
    expect(digest).not.toContain("<!--");
    expect(digest.startsWith("# SEO weekly digest 2026-W40")).toBe(true);
    expect(digest).toContain("Full report: `seo/reports/2026-W40.md` on the `seo-state` branch.");
  });

  it("compares clicks and impressions with the previous report when there is one", () => {
    const { report } = buildReport(inputOf({ previous: { label: "2026-W39", frontmatter: FM } }));
    expect(lineWith(report, "Clicks (28 days)")).toBe("- Clicks (28 days): 24 (last report 2026-W39: 20; +4, +20%)");
    expect(lineWith(report, "Impressions (28 days)")).toBe("- Impressions (28 days): 3,033 (last report 2026-W39: 2,800; +233, +8%)");
  });

  it("falls back to GSC's prior 28 days, per metric", () => {
    const { report } = buildReport(inputOf());
    expect(lineWith(report, "Clicks (28 days)")).toBe("- Clicks (28 days): 24 (prior 28 days: 19; +5, +26%)");
    const partial = buildReport(inputOf({ previous: { label: "2026-W39", frontmatter: { ...FM, clicks28d: null } } })).report;
    expect(lineWith(partial, "Clicks (28 days)")).toContain("prior 28 days: 19");
    expect(lineWith(partial, "Impressions (28 days)")).toContain("last report 2026-W39: 2,800");
  });

  it("compares the indexed count with the inspection history a week back", () => {
    const { report } = buildReport(inputOf());
    expect(lineWith(report, "Indexed:")).toBe("- Indexed: 2 of 3 sitemap URLs (on 2026-09-21: 2; no change)");
    const noHistory = inputOf({ indexStatus: statusOf([statusUrl("/blog/a", snapshot("2026-09-27T08:00:00Z", true))]) });
    expect(lineWith(buildReport(noHistory).report, "Indexed:")).toBe("- Indexed: 1 of 1 sitemap URLs (no inspection history from a week ago)");
    const withPrevious = buildReport({ ...noHistory, previous: { label: "2026-W39", frontmatter: FM } }).report;
    expect(lineWith(withPrevious, "Indexed:")).toBe("- Indexed: 1 of 1 sitemap URLs (last report 2026-W39: 3; -2, -67%)");
  });

  it("names missing and stale inputs instead of failing", () => {
    const { report } = buildReport(
      inputOf({
        gsc: null,
        indexStatus: null,
        candidates: null,
        brakes: null,
        halt: null,
        inputs: [
          { name: "gsc", date: null, problem: null },
          { name: "brakes", date: "2026-09-21", problem: null },
          { name: "manifest", date: null, problem: "unreadable (not valid JSON)" },
        ],
      }),
    );
    expect(report).toContain("Data: gsc missing · brakes 2026-09-21 (7 days old) · manifest unreadable (not valid JSON)");
    expect(lineWith(report, "Clicks (28 days)")).toBe("- Clicks (28 days): unavailable");
    expect(lineWith(report, "Indexed:")).toBe("- Indexed: unavailable (no index-status.json)");
    expect(report).toContain("brake state for this run is unknown");
    expect(report).toContain("No candidates-YYYY-MM-DD.json was found.");
    expect(parseFrontmatter(report)).toMatchObject({ clicks28d: null, impressions28d: null, indexed: null });
  });

  it("lists this run's changes from the ledger with tier, type, skill and PR", () => {
    const ledger = materializeLedger([change("c1", "run-1", "/blog/a", { tier: 0, change_type: "title-rewrite", skill: "seo-ctr" }), change("c2", "run-0", "/blog/old")]);
    const { report } = buildReport(inputOf({ ledger, pr: 131 }));
    expect(report).toContain("| URL | Tier | Type | Skill | PR |");
    expect(report).toContain(`| \`/blog/a\` | T0 | title-rewrite | seo-ctr | #${ZWSP}131 |`);
    expect(report).not.toContain("/blog/old");
  });

  it("explains every skip: the model's reasons, verify-static, the critic and deferred issues", () => {
    const manifest = manifestOf({
      changes: [
        { path: "/blog/a", file: "app/blog/a/page.tsx", skill: "seo-ctr", changeType: "title", summary: "" },
        { path: "/blog/b", file: "app/blog/b/page.tsx", skill: "seo-citations", changeType: "citations", summary: "" },
      ],
      skipped: [{ path: "/vs/x", skill: "seo-ctr", reason: "page cap hit" }],
      issues: [{ title: "Consolidate the DSCR guides", body: "", tier: 2 }],
    });
    const verdict = verdictOf(
      [
        { path: "app/blog/a/page.tsx", tier: 0 },
        { path: "app/blog/b/page.tsx", tier: 1 },
      ],
      { caps: { files: 40, lines: 12, pages: 2, newArticles: 0, noindex: 0 } },
    );
    const critic = parseCritic({ verdicts: [{ file: "app/blog/b/page.tsx", verdict: "REJECT", reasons: ["unsourced claim"] }] });
    const { report } = buildReport(inputOf({ manifest, verdict, critic, candidates: candidatesOf({ profile: { crawlStalled: true, unknownUrls: 20, crawledNotIndexedTrend: [22, 25] } }) }));
    expect(report).toContain("- `/vs/x` (seo-ctr): page cap hit");
    expect(report).toContain("- `/blog/b` (seo-citations): critic REJECT: unsourced claim");
    expect(report).toContain("- Deferred to a tier-2 issue: Consolidate the DSCR guides");
    expect(report).toContain("Caps used: files 40/40 (cap reached) · lines 12/4,000 · pages 2/25 · new articles (crawl stalled) 0/0 (cap reached) · noindex 0");
    // The manifest fallback lists only the accepted change.
    expect(report).toContain("Not in the ledger yet");
    expect(lineWith(report, "| `/blog/a` |")).toContain("| T0 |");
    expect(lineWith(report, "| `/blog/b` |")).toBe("");
  });

  it("prints verify-static violations under Skipped", () => {
    const verdict = verdictOf([], { ok: false, violations: [{ rule: "import-allow", path: "app/blog/a/page.tsx", detail: "@/lib/supabase/admin is not allowed" }] });
    const { report } = buildReport(inputOf({ manifest: manifestOf(), verdict }));
    expect(report).toContain("verify-static violations (1):");
    // "@/" is an import alias, not a mention, so it is left as written.
    expect(report).toContain("- import-allow `app/blog/a/page.tsx`: @/lib/supabase/admin is not allowed");
  });

  it("shows the halt, its clearing variable and an acknowledgment", () => {
    const halt = { halted: true, since: "2026-09-28", reason: "site clicks fell 35% week over week", id: "halt-2026-09-28", clearWithAck: "halt-2026-09-28" };
    const { report } = buildReport(inputOf({ halt }));
    expect(report).toContain("> **The loop is halted** since 2026-09-28: site clicks fell 35% week over week.");
    expect(report).toContain("sets the repo variable `SEO_HALT_ACK` to `halt-2026-09-28`");
    expect(report).toContain("- Halt: **halted** since 2026-09-28 (`halt-2026-09-28`)");
    const acked = buildReport(inputOf({ halt, haltAck: "halt-2026-09-28" })).report;
    expect(acked).toContain("is acknowledged** (SEO_HALT_ACK matches)");
    expect(acked).toContain("Acknowledged by SEO_HALT_ACK.");
  });

  it("reports every brake", () => {
    const brakes = brakesOf({
      pageRegressions: [{ ledgerId: "c1", path: "/blog/a", pr: 57, check: "noindex", detail: "the page became noindex", action: "revert" }],
      indexDrops: [{ ledgerId: "c2", path: "/blog/b", detail: "indexed → crawled, not indexed", action: "tier2-issue" }],
      gscPageLosses: [{ ledgerId: "c3", path: "/blog/c", lossShare: 0.32, impressions: 140, action: "revert" }],
      siteWide: { triggered: true, applied: false, priorWeekClicks: 7, latestWeekClicks: 5, dropShare: 0.29, note: "below volume floor; report-only" },
      demotedChangeTypes: [{ changeType: "title-rewrite", lossRate: 0.45, scored: 11 }],
    });
    const { report } = buildReport(inputOf({ brakes }));
    expect(report).toContain(`  - \`/blog/a\` (#${ZWSP}57): noindex, the page became noindex. Action: revert.`);
    expect(report).toContain("  - `/blog/b`: indexed → crawled, not indexed. Action: tier-2 issue.");
    expect(report).toContain("  - `/blog/c`: 32% fewer clicks than its holdout on 140 impressions. Action: revert.");
    expect(report).toContain("- Site-wide, week over week: 5 clicks in the latest week vs 7 the week before (-29%); triggered, not applied (below volume floor; report-only).");
    expect(report).toContain("- Demoted change types (treated as tier 2): title-rewrite (loss rate 45% over 11 scored)");
  });

  it("lists this run's holdout; the digest caps the list", () => {
    const urls = Array.from({ length: DIGEST_LIST_CAP + 5 }, (_, i) => `/blog/h${String(i).padStart(2, "0")}`);
    const ledger = materializeLedger([
      { kind: "holdout", id: "h0", run_id: "run-0", date: "2026-09-21", urls: ["/blog/older"], until: "2026-11-16", salt: "s" },
      { kind: "holdout", id: "h1", run_id: "run-1", date: "2026-09-28", urls, until: "2026-11-23", salt: "s" },
    ]);
    const { report, digest } = buildReport(inputOf({ ledger }));
    expect(report).toContain(`${urls.length} pages are withheld until 2026-11-23.`);
    expect(report).toContain("`/blog/h24`");
    expect(digest).not.toContain("`/blog/h24`");
    expect(digest).toContain("- …and 5 more pages (full list in the report)");
    expect(report).toContain(`Active holdouts across all runs: ${urls.length + 1} pages.`);
  });

  it("shows the top 10 candidates in a table", () => {
    const list = Array.from({ length: 14 }, (_, i) => candidate(`/blog/c${i}`, 14 - i));
    const { report } = buildReport(inputOf({ candidates: candidatesOf({ candidates: list }) }));
    expect(report).toContain("| 1 | `/blog/c0` | seo-striking-distance | STRIKING_DISTANCE | 14.0 | 200 | 12.4 |");
    expect(report).toContain("| 10 | `/blog/c9` |");
    expect(report).not.toContain("`/blog/c10`");
  });

  it("prints dormant skills and the crawl-stall gate", () => {
    const candidates = candidatesOf({
      profile: { crawlStalled: true, unknownUrls: 20, crawledNotIndexedTrend: [18, 25] },
      dormant: [{ skill: "seo-ctr", needs: "pages below the CTR curve at p<0.05", current: "0 pages; best is /blog/x at p=0.21" }],
    });
    const { report } = buildReport(inputOf({ candidates }));
    expect(report).toContain("Google's crawl is stalled: 20 sitemap URLs have never been crawled; crawled-not-indexed trend 18 → 25.");
    expect(report).toContain("- seo-ctr: needs pages below the CTR curve at p<0.05; current: 0 pages; best is /blog/x at p=0.21");
  });

  it("puts the top 15 URLs to request indexing in the digest and all of them in the report", () => {
    const requestIndexing = Array.from({ length: 20 }, (_, i) => ({ path: `/glossary/t${i}`, why: `why ${i}` }));
    const { report, digest } = buildReport(inputOf({ candidates: candidatesOf({ requestIndexing }) }));
    expect(report).toContain("1. `https://usetruecap.com/glossary/t0`: why 0");
    expect(report).toContain("20. `https://usetruecap.com/glossary/t19`: why 19");
    expect(digest).toContain(`${DIGEST_REQUEST_INDEXING}. \`https://usetruecap.com/glossary/t14\``);
    expect(digest).not.toContain("glossary/t15`");
    expect(digest).toContain("…and 5 more in the full report.");
  });

  it("neutralizes planted text from the manifest, the critic and GSC in both outputs", () => {
    const planted = "fixes #1 cc @victim <img src=x onerror=alert(1)> ![p](https://t.test/p.gif) | fake | cell |\n## Fake section";
    const manifest = manifestOf({
      changes: [{ path: "/blog/b", file: "app/blog/b/page.tsx", skill: "seo-citations", changeType: planted, summary: planted }],
      skipped: [{ path: planted, skill: null, reason: planted }],
      issues: [{ title: planted, body: planted, tier: 2 }],
    });
    const verdict = verdictOf([{ path: "app/blog/b/page.tsx", tier: 1 }]);
    const critic = parseCritic({ verdicts: [{ file: "app/blog/b/page.tsx", verdict: "REJECT", reasons: [planted] }] });
    const candidates = candidatesOf({
      candidates: [candidate("/blog/q", 1, { reasons: [{ reason: "CANNIBALIZATION", detail: planted }] })],
      dormant: [{ skill: "seo-ctr", needs: planted, current: planted }],
      requestIndexing: [{ path: "/x", why: planted }],
    });
    const ledger = materializeLedger([change("c1", "run-1", "/blog/q", { change_type: planted })]);
    const { report, digest } = buildReport(inputOf({ manifest, verdict, critic, candidates, ledger, runId: "run-1" }));
    for (const md of [report, digest]) {
      expect(md).not.toMatch(/@victim/);
      expect(md).not.toMatch(/#\d/);
      expect(md).not.toMatch(/\bfixes\b/i);
      expect(md).not.toMatch(/<[A-Za-z]/);
      expect(md).not.toContain("![");
      expect(md.split("\n").filter((line) => line.startsWith("## Fake"))).toEqual([]);
      expect(md).not.toMatch(/[^\\]\| fake \|/);
      expect(sanitizeForGithub(md)).toBe(md);
    }
  });

  it("never lets the sanitizer alter the report's own wording", () => {
    // Benign inputs that reach every branch. If a fixed string contained markup
    // (a "<date>" placeholder, say), sanitizing would silently change it.
    const halt = { halted: true, since: "2026-09-28", reason: "site clicks fell", id: "h-1", clearWithAck: "h-1" };
    const everything = inputOf({
      halt,
      brakes: brakesOf({
        pageRegressions: [{ ledgerId: "c1", path: "/blog/a", pr: null, check: "status", detail: "now 404", action: "revert" }],
        indexDrops: [{ ledgerId: "c2", path: "/blog/b", detail: "dropped", action: "tier2-issue" }],
        gscPageLosses: [{ ledgerId: "c3", path: "/blog/c", lossShare: 0.3, impressions: 120, action: "revert" }],
        siteWide: { triggered: true, applied: true, priorWeekClicks: 80, latestWeekClicks: 50, dropShare: 0.375, note: "applied" },
        demotedChangeTypes: [{ changeType: "title", lossRate: 0.5, scored: 10 }],
      }),
      manifest: manifestOf({
        changes: [{ path: "/blog/a", file: "app/blog/a/page.tsx", skill: "seo-ctr", changeType: "title", summary: "" }],
        skipped: [{ path: "/vs/x", skill: null, reason: "cap" }],
        issues: [{ title: "Consolidate", body: "", tier: 2 }],
      }),
      verdict: verdictOf([{ path: "app/blog/b/page.tsx", tier: 1 }], { violations: [{ rule: "links", path: null, detail: "external link" }] }),
      critic: [],
      ledger: materializeLedger([{ kind: "holdout", id: "h", run_id: "run-1", date: "2026-09-28", urls: ["/blog/h"], until: "2026-11-23", salt: "s" }]),
      candidates: candidatesOf({
        profile: { crawlStalled: true, unknownUrls: 20, crawledNotIndexedTrend: [1, 2] },
        dormant: [{ skill: "seo-ctr", needs: "n", current: "c" }],
        requestIndexing: [{ path: "/x", why: "w" }],
      }),
      runCost: parseRunSummary({ model: { turns: 1, costUsd: 1, permission_denials: [{ tool_name: "Bash" }] }, critic: { turns: 1 } }),
      inputs: [{ name: "gsc", date: "2026-09-21", problem: null }],
    });
    const nothing = inputOf({ gsc: null, indexStatus: null, candidates: null, brakes: null, halt: null, runId: null, inputs: [{ name: "gsc", date: null, problem: "missing" }] });
    for (const input of [everything, nothing, inputOf({ haltAck: "h-1", halt })]) {
      for (const variant of ["report", "digest"] as const) {
        const md = renderReport(input, variant);
        expect(sanitizeForGithub(md)).toBe(md);
      }
    }
  });

  it("keeps the digest within a GitHub comment even for huge inputs", () => {
    const long = "x".repeat(250);
    const manifest = manifestOf({ skipped: Array.from({ length: 5_000 }, (_, i) => ({ path: `/p${i}`, skill: null, reason: long })) });
    const candidates = candidatesOf({ dormant: Array.from({ length: 3_000 }, () => ({ skill: "seo-ctr" as const, needs: long, current: long })) });
    const { report, digest } = buildReport(inputOf({ manifest, candidates }));
    expect(digest.length).toBeLessThanOrEqual(DIGEST_MAX_CHARS);
    expect(digest).toContain("…truncated to fit a GitHub comment.");
    expect(report.length).toBeGreaterThan(DIGEST_MAX_CHARS);
    expect(report).toContain("`/p4999`");
  });
});

describe("capLength", () => {
  it("leaves short text alone and cuts long text at a line boundary", () => {
    expect(capLength("short\n", 100, "2026-W40")).toBe("short\n");
    const text = Array.from({ length: 1_000 }, (_, i) => `line ${i}`).join("\n");
    const cut = capLength(text, 2_000, "2026-W40");
    expect(cut.length).toBeLessThanOrEqual(2_000);
    const kept = cut.split("\n\n…truncated")[0].split("\n");
    expect(kept[kept.length - 1]).toMatch(/^line \d+$/);
    expect(cut).toContain("Full report: `seo/reports/2026-W40.md`");
  });
});

// ------------------------------------------------------------------ main

describe("main (disk, no network)", () => {
  let dir: string;
  const saved = { state: process.env.SEO_STATE_DIR, data: process.env.SEO_DATA_DIR, today: process.env.SEO_TODAY, mode: process.env.SEO_MODE, ack: process.env.SEO_HALT_ACK };
  let stdout: string[];

  const put = (rel: string, value: unknown): string => {
    const file = path.join(dir, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value));
    return file;
  };

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "seo-report-"));
    process.env.SEO_STATE_DIR = dir;
    process.env.SEO_DATA_DIR = path.join(dir, "data");
    process.env.SEO_TODAY = "2026-09-28";
    delete process.env.SEO_MODE;
    delete process.env.SEO_HALT_ACK;
    stdout = [];
    vi.spyOn(console, "log").mockImplementation((...parts: unknown[]) => {
      stdout.push(parts.join(" "));
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore("SEO_STATE_DIR", saved.state);
    restore("SEO_DATA_DIR", saved.data);
    restore("SEO_TODAY", saved.today);
    restore("SEO_MODE", saved.mode);
    restore("SEO_HALT_ACK", saved.ack);
  });

  const seed = (): void => {
    put("data/gsc-2026-09-28.json", gscOf([24, 3033], [19, 2900]));
    put("data/candidates-2026-09-28.json", candidatesOf({ candidates: [candidate("/blog/a", 3.2)], requestIndexing: [{ path: "/glossary/noi", why: "dropped" }] }));
    put("data/brakes-2026-09-21.json", brakesOf());
    put("data/index-status.json", inputOf().indexStatus);
    put("data/halt.json", { halted: false, since: null, reason: null, id: null, clearWithAck: null });
    put("ledger.jsonl", `${JSON.stringify(change("c1", "run-1", "/blog/a", { tier: 0 }))}\n`);
  };

  it("writes reports/<year>-W<week>.md and data/digest-<date>.md", async () => {
    seed();
    const manifest = put("in/manifest.json", manifestOf({ runId: "run-1" }));
    const code = await main(parseArgs(["--manifest", manifest, "--run-id", "run-1", "--pr", "131", "--mode", "auto"]));
    expect(code).toBe(0);
    const report = readFileSync(path.join(dir, "reports", "2026-W40.md"), "utf8");
    const digest = readFileSync(path.join(dir, "data", "digest-2026-09-28.md"), "utf8");
    expect(parseFrontmatter(report)).toMatchObject({ clicks28d: 24, impressions28d: 3033, indexed: 2 });
    expect(report).toContain("Run `run-1` · mode auto · 2026-09-28 · PR #");
    expect(report).toContain("brakes 2026-09-21 (7 days old)");
    expect(report).toContain("| `/blog/a` | T0 | add-citations | seo-citations |");
    expect(digest).toContain(SIGNUPS_LINE);
    expect(JSON.parse(stdout[stdout.length - 1])).toMatchObject({ report: "2026-W40.md", digest: "digest-2026-09-28.md" });
  });

  it("diffs against last week's report frontmatter", async () => {
    seed();
    put("reports/2026-W39.md", `${renderFrontmatter(FM)}\n# SEO weekly report 2026-W39\n`);
    await main(parseArgs([]));
    const report = readFileSync(path.join(dir, "reports", "2026-W40.md"), "utf8");
    expect(lineWith(report, "Clicks (28 days)")).toBe("- Clicks (28 days): 24 (last report 2026-W39: 20; +4, +20%)");
  });

  it("still writes a report when every input is missing or broken", async () => {
    put("ledger.jsonl", "{not json\n");
    const code = await main(parseArgs(["--manifest", path.join(dir, "absent.json"), "--critic", put("in/critic.json", "{oops")]));
    expect(code).toBe(0);
    const report = readFileSync(path.join(dir, "reports", "2026-W40.md"), "utf8");
    expect(report).toContain("gsc missing");
    expect(report).toContain("ledger unreadable");
    expect(report).toContain("manifest missing");
    expect(report).toContain("critic unreadable (not valid JSON)");
    expect(h2(report)).toEqual(REPORT_SECTIONS);
  });

  it("redacts a runner path in a manifest skip reason instead of failing the write", async () => {
    seed();
    const runnerPath = `${RUNNER_HOME}/work/x/y`;
    const manifest = put("in/manifest.json", manifestOf({ skipped: [{ path: "/blog/z", skill: "seo-ctr", reason: `could not read ${runnerPath}/app/blog/z/page.tsx` }] }));
    const code = await main(parseArgs(["--manifest", manifest]));
    expect(code).toBe(0);
    for (const file of [path.join(dir, "reports", "2026-W40.md"), path.join(dir, "data", "digest-2026-09-28.md")]) {
      const text = readFileSync(file, "utf8");
      expect(text).toContain("- `/blog/z` (seo-ctr): could not read ~/work/x/y/app/blog/z/page.tsx");
      expect(text).not.toContain(runnerPath);
    }
  });

  it("reads SEO_MODE and SEO_HALT_ACK from the environment", async () => {
    seed();
    put("data/halt.json", { halted: true, since: "2026-09-28", reason: "site-wide drop", id: "h-1", clearWithAck: "h-1" });
    process.env.SEO_MODE = "auto";
    process.env.SEO_HALT_ACK = "h-1";
    await main(parseArgs([]));
    const report = readFileSync(path.join(dir, "reports", "2026-W40.md"), "utf8");
    expect(report).toContain("mode auto");
    expect(report).toContain("is acknowledged** (SEO_HALT_ACK matches)");
  });

  it("--dry-run prints the digest and writes nothing", async () => {
    seed();
    await main(parseArgs(["--dry-run"]));
    expect(existsSync(path.join(dir, "reports"))).toBe(false);
    expect(readdirSync(path.join(dir, "data")).some((name) => name.startsWith("digest-"))).toBe(false);
    expect(stdout.join("\n")).toContain("# SEO weekly digest 2026-W40");
  });

  it("takes the run id from --run-id or SEO_RUN_ID, never from the model's manifest", async () => {
    seed();
    put("ledger.jsonl", [
      JSON.stringify(change("c1", "555", "/blog/a", { tier: 0, change_type: "title-meta" })),
      JSON.stringify({ kind: "holdout", id: "h", run_id: "555", date: "2026-09-28", urls: ["/blog/h1"], until: "2026-11-23", salt: "s" }),
      "",
    ].join("\n"));
    const blank = put("in/blank.json", manifestOf({ runId: "" }));
    const lying = put("in/lying.json", manifestOf({ runId: "run-0" }));
    const body = path.join(dir, "body.md");

    // Hermetic: seo-weekly.yml sets SEO_RUN_ID for the whole workflow, so the
    // loop's own verify-build ran this test with the variable already set.
    const inherited = process.env.SEO_RUN_ID;
    delete process.env.SEO_RUN_ID;
    try {
      await main(parseArgs(["--pr-body", body, "--manifest", blank]));
      expect(readFileSync(body, "utf8")).toContain("No run id was given, so no changes are attributed to this run.");
    } finally {
      if (inherited !== undefined) process.env.SEO_RUN_ID = inherited;
    }

    const outer = process.env.SEO_RUN_ID;
    process.env.SEO_RUN_ID = "555";
    try {
      await main(parseArgs(["--pr-body", body, "--manifest", lying]));
      const fromEnv = readFileSync(body, "utf8");
      expect(fromEnv).toContain("Run `555`");
      expect(fromEnv).toContain("| `/blog/a` | T0 | title-meta |");
      expect(fromEnv).toContain("1 pages are withheld until 2026-11-23");
    } finally {
      if (outer === undefined) delete process.env.SEO_RUN_ID;
      else process.env.SEO_RUN_ID = outer;
    }
    await main(parseArgs(["--pr-body", body, "--manifest", lying, "--run-id", "555"]));
    expect(readFileSync(body, "utf8")).toContain("Run `555`");
  });

  it("builds the PR body from --plan even without --critic (the publish job's call)", async () => {
    seed();
    const manifest = put("in/manifest.json", manifestOf({ changes: [{ path: "/blog/b", file: "app/blog/b/page.tsx", skill: "seo-citations", changeType: "citations", summary: "" }] }));
    const verdict = put("in/verdict.json", verdictOf([{ path: "app/blog/b/page.tsx", tier: 1 }]));
    const body = path.join(dir, "body.md");
    const approved = put("in/plan-ok.json", { runId: "run-1", include: ["app/blog/b/page.tsx"], urls: ["/blog/b"], lastmodUrls: ["/blog/b"], tier: 1, dropped: [], critic: [], title: "t" });
    await main(parseArgs(["--pr-body", body, "--run-id", "run-9", "--manifest", manifest, "--verdict", verdict, "--plan", approved]));
    const ok = readFileSync(body, "utf8");
    expect(ok).not.toContain("no critic verdict");
    expect(ok).toContain("Nothing skipped.");
    const rejected = put("in/plan-no.json", { runId: "run-1", include: [], urls: [], lastmodUrls: [], tier: 0, dropped: [{ file: "app/blog/b/page.tsx", reason: "critic REJECT: Pub 544 does not say that" }], critic: [], title: "t" });
    await main(parseArgs(["--pr-body", body, "--run-id", "run-9", "--manifest", manifest, "--verdict", verdict, "--plan", rejected]));
    expect(readFileSync(body, "utf8")).toContain("- `/blog/b` (seo-citations): critic REJECT: Pub 544 does not say that");
  });

  it("says so at the top when the data job failed", async () => {
    await main(parseArgs(["--run-id", "run-1", "--data-result", "failure"]));
    const report = readFileSync(path.join(dir, "reports", "2026-W40.md"), "utf8");
    expect(report).toContain("> **The data job did not succeed (failure).** Nothing was measured this run");
    seed();
    await main(parseArgs(["--run-id", "run-1", "--data-result", "success"]));
    expect(readFileSync(path.join(dir, "reports", "2026-W40.md"), "utf8")).not.toContain("The data job did not succeed");
  });

  it("rejects a bad --mode or --pr", async () => {
    await expect(main(parseArgs(["--mode", "yolo"]))).rejects.toThrow(/--mode must be review or auto/);
    await expect(main(parseArgs(["--pr", "0"]))).rejects.toThrow(/--pr must be a positive integer/);
    expect(() => parseMode("auto")).not.toThrow();
  });
});
