import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  BASELINE_LABELS,
  baselineHeading,
  buildBaseline,
  buildRows,
  main,
  parseDebt,
  parseLabel,
  renderLessonsSection,
  summarize,
  templateVitals,
  trafficByPath,
  upsertBaselineSection,
  type Baseline,
  type BaselineInputs,
} from "../../seo/scripts/baseline.ts";
import { parseArgs } from "../../seo/scripts/lib/cli.ts";
import { familyOf } from "../../seo/scripts/lib/family.ts";
import type { Crawl, CrawlPage, GscPull, IndexStatus, IndexStatusUrl, Psi, PsiResult } from "../../seo/scripts/lib/types.ts";

/**
 * seo/scripts/baseline.ts: the F0/F10 per-URL baseline and its lessons.md
 * section.
 *
 * The lessons.md tests matter most. The file is shared with ledger.ts (its
 * "Outcomes by change type" section) and with anything the founder writes by
 * hand. A regression in section replacement would silently rewrite or drop
 * that text, or let F10 overwrite F0 and lose the pre-foundation numbers the
 * whole plan is measured against.
 */

const BASE = "https://usetruecap.com";

// -------------------------------------------------------------- fixtures

const page = (p: string, extra: Partial<CrawlPage> = {}): CrawlPage => ({
  url: `${BASE}${p}`,
  path: p,
  family: familyOf(p),
  status: 200,
  finalUrl: null,
  title: `Title of ${p}`,
  metaDescription: "d",
  h1: ["h"],
  canonical: `${BASE}${p}`,
  canonicalIsSelf: true,
  robots: null,
  noindex: false,
  jsonLdTypes: [],
  jsonLdParseErrors: 0,
  datePublished: null,
  dateModified: null,
  visibleUpdatedDate: null,
  wordCount: 1200,
  mainHash: `hash-${p}`,
  uniqueRatio: 0.8,
  thin: false,
  outboundInternal: 3,
  outboundExternal: 0,
  inboundContextual: 2,
  inboundTotal: 5,
  depth: 1,
  textFile: `pages/${p.length}.txt`,
  ...extra,
});

const crawlOf = (pages: CrawlPage[], extra: Partial<Crawl> = {}, issues: Partial<Crawl["issues"]> = {}): Crawl => ({
  generatedAt: "2026-09-27T00:00:00Z",
  base: BASE,
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
    ...issues,
  },
  healthcheckFindings: [],
  ...extra,
});

const entry = (p: string, indexClass: IndexStatusUrl["indexClass"], extra: Record<string, unknown> = {}): IndexStatusUrl =>
  ({
    inspectedAt: "2026-09-27T08:00:00Z",
    source: "api",
    verdict: null,
    coverageState: indexClass === "indexed" ? "Submitted and indexed" : indexClass === "never_crawled" ? "URL is unknown to Google" : "Crawled - currently not indexed",
    indexingState: null,
    robotsTxtState: null,
    pageFetchState: null,
    lastCrawlTime: indexClass === "never_crawled" ? null : "2026-09-01T00:00:00Z",
    googleCanonical: null,
    userCanonical: null,
    indexed: indexClass === "indexed",
    url: `${BASE}${p}`,
    path: p,
    family: familyOf(p),
    sitemap: [],
    referringUrls: [],
    firstSeenInSitemap: "2026-06-01",
    everIndexed: indexClass === "indexed",
    indexClass,
    mainHashAtInspect: null,
    wordCount: null,
    uniqueRatio: null,
    thin: null,
    history: [],
    ...extra,
  }) as IndexStatusUrl;

const statusOf = (entries: IndexStatusUrl[]): IndexStatus =>
  ({ generatedAt: "2026-09-27T08:00:00Z", site: "sc-domain:usetruecap.com", sitemapReport: [], quota: { day: "2026-09-27", used: 0 }, summary: {}, urls: Object.fromEntries(entries.map((e) => [e.url, e])) }) as unknown as IndexStatus;

const gscOf = (rows: Array<{ page: string; clicks: number; impressions: number; position: number }>): GscPull =>
  ({
    generatedAt: "2026-09-27T00:00:00Z",
    site: "sc-domain:usetruecap.com",
    windows: { current: { startDate: "2026-08-28", endDate: "2026-09-24" }, prior: { startDate: "2026-07-31", endDate: "2026-08-27" } },
    totals: { current: { clicks: 24, impressions: 3033, ctr: 0.008, position: 30.7 }, prior: { clicks: 19, impressions: 2900, ctr: 0, position: 0 } },
    pages: { current: rows.map((r) => ({ ...r, ctr: 0 })), prior: [] },
    pageQueries: { current: [], prior: [] },
    weekly: { weeks: [], rows: [] },
    weeklyTotals: [],
  }) as GscPull;

const psiResult = (template: string, p: string, extra: Partial<PsiResult> = {}): PsiResult => ({
  template,
  url: `${BASE}${p}`,
  ok: true,
  error: null,
  performanceScore: 87,
  lcpMs: 2413,
  clsLab: 0.012,
  tbtMs: 180,
  field: null,
  ...extra,
});
const psiOf = (results: PsiResult[]): Psi => ({ generatedAt: "2026-09-27T00:00:00Z", strategy: "mobile", keyed: false, results });

const SITE_CRAWL = crawlOf(
  [page("/"), page("/blog/a"), page("/markets/x", { wordCount: 300, thin: true }), page("/glossary/noi", { wordCount: 420, thin: true })],
  {},
  {
    orphans: ["/glossary/noi"],
    duplicateTitles: [
      { title: "Rental | TrueCap", paths: ["/markets/x", "/blog/a"] },
      { title: "Big | TrueCap", paths: ["/c", "/b", "/a"] },
    ],
  },
);
const SITE_STATUS = statusOf([
  entry("/", "indexed"),
  entry("/blog/a", "indexed"),
  entry("/markets/x", "crawled_not_indexed"),
  entry("/glossary/noi", "never_crawled"),
  entry("/blog/gone", "indexed", { removedFromSitemap: "2026-09-20" }),
]);
const SITE_GSC = gscOf([{ page: "/blog/a", clicks: 2, impressions: 274, position: 12.4 }]);
const SITE_PSI = psiOf([psiResult("home", "/"), psiResult("blog-post", "/blog/a", { ok: false, error: "quota", performanceScore: null, lcpMs: null, clsLab: null, tbtMs: null })]);

const inputsOf = (extra: Partial<BaselineInputs> = {}): BaselineInputs => ({
  date: "2026-09-27",
  label: "F0",
  generatedAt: "2026-09-27T18:00:00.000Z",
  base: BASE,
  crawl: SITE_CRAWL,
  indexStatus: SITE_STATUS,
  gsc: SITE_GSC,
  psi: SITE_PSI,
  sources: { crawl: "2026-09-27", indexStatus: "2026-09-27", gsc: "2026-09-27", psi: "2026-09-27" },
  knownDebt: [],
  ...extra,
});

// ------------------------------------------------------------------ label

describe("parseLabel", () => {
  it("accepts exactly F0 and F10", () => {
    expect(BASELINE_LABELS).toEqual(["F0", "F10"]);
    expect(parseLabel("F0")).toBe("F0");
    expect(parseLabel("F10")).toBe("F10");
  });

  it("refuses a missing or unknown label, so F10 can never be written as F0 by default", () => {
    expect(() => parseLabel(null)).toThrow(/--label is required and must be one of F0, F10/);
    expect(() => parseLabel("f0")).toThrow(/got "f0"/);
    expect(() => parseLabel("F1")).toThrow();
  });
});

// ------------------------------------------------------------------- rows

describe("trafficByPath", () => {
  it("sums duplicate rows for a path and weights position by impressions", () => {
    const traffic = trafficByPath(
      gscOf([
        { page: "/blog/a", clicks: 1, impressions: 100, position: 10 },
        { page: `${BASE}/blog/a/`, clicks: 2, impressions: 300, position: 14 },
      ]),
      BASE,
    );
    expect(traffic.get("/blog/a")).toEqual({ clicks: 3, impressions: 400, position: 13 });
  });

  it("drops other hosts and unparseable pages, and gives no position without impressions", () => {
    const traffic = trafficByPath(
      gscOf([
        { page: "https://www.usetruecap.com/blog/b", clicks: 5, impressions: 50, position: 3 },
        { page: "https://truecap-preview.vercel.app/blog/c", clicks: 5, impressions: 50, position: 3 },
        { page: "not a url", clicks: 1, impressions: 1, position: 1 },
        { page: "/blog/zero", clicks: 0, impressions: 0, position: 0 },
      ]),
      BASE,
    );
    expect([...traffic.keys()]).toEqual(["/blog/zero"]);
    expect(traffic.get("/blog/zero")?.position).toBeNull();
    expect(trafficByPath(null, BASE).size).toBe(0);
  });
});

describe("buildRows", () => {
  it("has one row per sitemap URL with exactly the brief's fields, sorted by path", () => {
    const rows = buildRows(SITE_CRAWL, SITE_STATUS, SITE_GSC, BASE);
    expect(rows.map((r) => r.path)).toEqual(["/", "/blog/a", "/glossary/noi", "/markets/x"]);
    expect(Object.keys(rows[0]).sort()).toEqual(
      ["path", "family", "indexClass", "coverageState", "lastCrawlTime", "everIndexed", "wordCount", "mainHash", "thin", "impressions28d", "clicks28d", "position"].sort(),
    );
    expect(rows[1]).toEqual({
      path: "/blog/a",
      family: "blog-post",
      indexClass: "indexed",
      coverageState: "Submitted and indexed",
      lastCrawlTime: "2026-09-01T00:00:00Z",
      everIndexed: true,
      wordCount: 1200,
      mainHash: "hash-/blog/a",
      thin: false,
      impressions28d: 274,
      clicks28d: 2,
      position: 12.4,
    });
  });

  it("leaves out URLs removed from the sitemap", () => {
    expect(buildRows(SITE_CRAWL, SITE_STATUS, null, BASE).some((r) => r.path === "/blog/gone")).toBe(false);
  });

  it("takes crawl fields first and falls back to the copies merged into index-status", () => {
    const status = statusOf([entry("/blog/uncrawled", "indexed", { wordCount: 640, thin: true, mainHash: "merged-hash" })]);
    const [row] = buildRows(crawlOf([]), status, null, BASE);
    expect(row).toMatchObject({ path: "/blog/uncrawled", wordCount: 640, thin: true, mainHash: "merged-hash", impressions28d: 0, clicks28d: 0, position: null });
    const crawled = buildRows(crawlOf([page("/blog/uncrawled", { wordCount: 900 })]), status, null, BASE)[0];
    expect(crawled).toMatchObject({ wordCount: 900, thin: false, mainHash: "hash-/blog/uncrawled" });
  });

  it("marks a crawled URL with no inspection as not inspected, never as a class it was not given", () => {
    const [row] = buildRows(crawlOf([page("/blog/new")]), statusOf([]), null, BASE);
    expect(row).toMatchObject({ indexClass: null, coverageState: null, lastCrawlTime: null, everIndexed: null });
  });
});

// ---------------------------------------------------------------- summary

describe("summarize", () => {
  const baseline = buildBaseline(inputsOf());
  const s = baseline.summary;

  it("counts indexed URLs in total and by family", () => {
    expect([s.indexed, s.total]).toEqual([2, 4]);
    expect(s.indexedByFamily).toEqual({
      "blog-post": { total: 1, indexed: 1 },
      "glossary-term": { total: 1, indexed: 0 },
      home: { total: 1, indexed: 1 },
      "market-city": { total: 1, indexed: 0 },
    });
  });

  it("lists not-indexed reasons by coverage state, most first", () => {
    const rows = [
      ...buildRows(SITE_CRAWL, SITE_STATUS, null, BASE),
      ...buildRows(crawlOf([page("/blog/new")]), statusOf([entry("/blog/z", "crawled_not_indexed")]), null, BASE),
    ];
    expect(summarize(rows, null, null, null, []).notIndexedReasons).toEqual([
      { coverageState: "Crawled - currently not indexed", count: 2 },
      { coverageState: "(not inspected)", count: 1 },
      { coverageState: "URL is unknown to Google", count: 1 },
    ]);
  });

  it("counts every index class, including URLs never inspected", () => {
    expect(s.indexClassCounts).toEqual({ indexed: 2, crawled_not_indexed: 1, dropped_after_indexed: 0, never_crawled: 1, excluded: 0, unknown: 0, not_inspected: 0 });
    expect(s.thin).toBe(2);
  });

  it("reports orphans, and says unknown when the link graph did not run", () => {
    expect(s.orphans).toEqual({ known: true, count: 1, paths: ["/glossary/noi"] });
    const noGraph = crawlOf([page("/")], { linkGraph: { ran: false, reason: "limit", edges: [], orphans: [] } }, { orphans: [] });
    expect(summarize([], noGraph, null, null, []).orphans).toEqual({ known: false, count: 0, paths: [] });
  });

  it("ranks duplicate titles by group size and keeps the top 10", () => {
    expect(s.duplicateTitles).toEqual({
      count: 2,
      pages: 5,
      top: [
        { title: "Big | TrueCap", paths: ["/a", "/b", "/c"] },
        { title: "Rental | TrueCap", paths: ["/blog/a", "/markets/x"] },
      ],
    });
    const many = crawlOf([], {}, { duplicateTitles: Array.from({ length: 14 }, (_, i) => ({ title: `T${String(i).padStart(2, "0")}`, paths: ["/a", "/b"] })) });
    const dup = summarize([], many, null, null, []).duplicateTitles;
    expect(dup.count).toBe(14);
    expect(dup.top.map((d) => d.title)).toEqual(["T00", "T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T09"]);
  });

  it("takes field INP only, never the origin's", () => {
    const vitals = templateVitals(
      psiOf([
        psiResult("home", "/", { field: { lcpMs: 2000, inpMs: 190, cls: 0.05, category: "FAST" } }),
        { ...psiResult("vs", "/vs/x"), originField: { lcpMs: 1, inpMs: 999, cls: 0, category: "FAST" } } as PsiResult,
      ]),
    );
    expect(vitals.map((v) => [v.template, v.path, v.fieldInpMs])).toEqual([
      ["home", "/", 190],
      ["vs", "/vs/x", null],
    ]);
  });

  it("records search totals and crawl coverage, and flags a partial crawl", () => {
    expect(s.search).toEqual({ clicks28d: 24, impressions28d: 3033, startDate: "2026-08-28", endDate: "2026-09-24" });
    expect(s.crawl).toMatchObject({ pages: 4, sitemapCount: 4, partial: false, linkGraphRan: true });
    const partial = summarize([], crawlOf([page("/")], { sitemapCount: 381 }), null, null, []);
    expect(partial.crawl?.partial).toBe(true);
    expect(summarize([], null, null, null, []).search).toBeNull();
  });

  it("names the missing inputs", () => {
    expect(buildBaseline(inputsOf({ psi: null, gsc: null })).missing).toEqual(["gsc", "psi"]);
    expect(baseline.missing).toEqual([]);
  });
});

// --------------------------------------------------------------- rendering

describe("renderLessonsSection", () => {
  const section = renderLessonsSection(buildBaseline(inputsOf({ knownDebt: ["20 URLs never crawled", "**Content**", "OG images shadowed on 129 routes"] })));

  it("opens with the dated, labelled heading and states the headline numbers", () => {
    expect(section.split("\n")[0]).toBe("## Baseline 2026-09-27 (F0)");
    expect(baselineHeading("2026-12-01", "F10")).toBe("## Baseline 2026-12-01 (F10)");
    expect(section).toContain("- Indexed: 2 of 4 sitemap URLs (50.0%)");
    expect(section).toContain("- Search, 28 days (2026-08-28 to 2026-09-24): 24 clicks, 3,033 impressions");
    expect(section).toContain("- Duplicate titles: 2 groups covering 5 pages");
    expect(section).toContain("Per-URL rows: `seo/data/baseline-2026-09-27.json`.");
  });

  it("has one level-2 heading, so it is one section of lessons.md", () => {
    expect(section.split("\n").filter((line) => /^##(?!#)\s/.test(line))).toEqual(["## Baseline 2026-09-27 (F0)"]);
  });

  it("renders the tables the brief lists", () => {
    expect(section).toContain("| market-city | 0 | 1 |");
    expect(section).toContain("| Crawled - currently not indexed | 1 |");
    expect(section).toContain("| never_crawled | 1 |");
    expect(section).toContain("- `/glossary/noi`");
    expect(section).toContain("| Rental \\| TrueCap | `/blog/a`, `/markets/x` |");
    expect(section).toContain("| home | `/` | 87 | 2,413 ms | 0.012 | 180 ms | — |");
    expect(section).toContain("| blog-post | `/blog/a` | failed (quota) | — | — | — | — |");
  });

  it("lists the known debt only when some was given", () => {
    expect(section).toContain("### Known debt at baseline\n\n- 20 URLs never crawled\n- **Content**\n- OG images shadowed on 129 routes");
    expect(renderLessonsSection(buildBaseline(inputsOf()))).not.toContain("Known debt");
  });

  it("says what is missing instead of printing zeros", () => {
    const thin = renderLessonsSection(buildBaseline(inputsOf({ crawl: crawlOf([page("/")], { sitemapCount: 381, linkGraph: { ran: false, reason: "limit", edges: [], orphans: [] } }), psi: null })));
    expect(thin).toContain("- **Partial crawl:** 1 of 381 sitemap URLs were fetched");
    expect(thin).toContain("- **Missing inputs:** psi");
    expect(thin).toContain("- Orphans: unknown (the crawl's link graph did not run)");
    expect(thin).toContain("No psi-YYYY-MM-DD.json was found.");
    // Nothing the section prints would be swallowed as an HTML tag when GitHub renders it.
    expect(thin).not.toMatch(/<[A-Za-z]/);
  });
});

describe("parseDebt", () => {
  it("turns bullets, numbered items and plain lines into items and drops the title heading", () => {
    expect(parseDebt("# Known debt\n\n- a\n* b\n+ c\n1. d\n2) e\n- [ ] f\nplain\n---\n## Later\n- g\n")).toEqual(["a", "b", "c", "d", "e", "f", "plain", "**Later**", "g"]);
  });

  it("never passes a heading through", () => {
    for (const item of parseDebt("## a\n### b\n- # c")) expect(item).not.toMatch(/^#/);
  });
});

// ----------------------------------------------------------------- upsert

describe("upsertBaselineSection", () => {
  const F0_NEW = "## Baseline 2026-09-27 (F0)\n\nnew F0\n\n### Sub\n\nrows\n";
  const OTHER = [
    "# SEO loop lessons",
    "",
    "Intro kept as written.  ",
    "",
    "## Outcomes by change type",
    "",
    "| type | wins |",
    "|---|---|",
    "| title | 2 |",
    "",
  ].join("\n");

  it("creates the file with a title when lessons.md is empty", () => {
    expect(upsertBaselineSection("", "F0", F0_NEW)).toBe(`# SEO loop lessons\n\n${F0_NEW}`);
  });

  it("appends when the label has no section, keeping everything before it byte for byte", () => {
    const out = upsertBaselineSection(OTHER, "F0", F0_NEW);
    expect(out.startsWith(OTHER.replace(/\s+$/, ""))).toBe(true);
    expect(out.endsWith(`\n\n${F0_NEW}`)).toBe(true);
  });

  it("replaces this label's section in place, whatever its date, and nothing else", () => {
    const before = `${OTHER}\n## Baseline 2026-09-01 (F0)\n\nold F0\n\n### Old sub\n\nold rows\n\n## Notes by hand\n\nkeep me\n`;
    const out = upsertBaselineSection(before, "F0", F0_NEW);
    expect(out).toBe(`${OTHER}\n${F0_NEW}\n## Notes by hand\n\nkeep me\n`);
    expect(out).not.toContain("old");
  });

  it("keeps F0 when writing F10, so both coexist", () => {
    const withF0 = upsertBaselineSection(OTHER, "F0", F0_NEW);
    const both = upsertBaselineSection(withF0, "F10", "## Baseline 2026-12-01 (F10)\n\nF10 body\n");
    expect(both).toContain(F0_NEW);
    expect(both).toContain("## Baseline 2026-12-01 (F10)\n\nF10 body\n");
    const f10Again = upsertBaselineSection(both, "F10", "## Baseline 2026-12-02 (F10)\n\nF10 v2\n");
    expect(f10Again).toContain(F0_NEW);
    expect(f10Again).not.toContain("F10 body");
  });

  it("is a no-op when re-run with the same section", () => {
    const once = upsertBaselineSection(OTHER, "F0", F0_NEW);
    expect(upsertBaselineSection(once, "F0", F0_NEW)).toBe(once);
  });

  it("collapses a duplicated section for the label into one", () => {
    const dup = `${OTHER}\n## Baseline 2026-09-01 (F0)\n\nfirst\n\n## Keep\n\nk\n\n## Baseline 2026-09-02 (F0)\n\nsecond\n`;
    const out = upsertBaselineSection(dup, "F0", F0_NEW);
    expect(out.match(/\(F0\)/g)).toHaveLength(1);
    expect(out).toContain("## Keep\n\nk\n");
    expect(out).not.toMatch(/first|second/);
  });

  it("ignores heading-like lines inside fenced code", () => {
    const fenced = `${OTHER}\n## Notes\n\n\`\`\`\n## Baseline 2026-09-01 (F0)\n\`\`\`\n`;
    const out = upsertBaselineSection(fenced, "F0", F0_NEW);
    expect(out.startsWith(fenced.replace(/\s+$/, ""))).toBe(true);
    expect(out.endsWith(`\n\n${F0_NEW}`)).toBe(true);
  });

  it("does not match another label or a heading that only looks similar", () => {
    const text = `${OTHER}\n## Baseline 2026-09-01 (F10)\n\nf10\n\n## Baseline notes (F0)\n\nprose\n`;
    const out = upsertBaselineSection(text, "F0", F0_NEW);
    expect(out).toContain("## Baseline 2026-09-01 (F10)\n\nf10\n");
    expect(out).toContain("## Baseline notes (F0)\n\nprose\n");
    expect(out.endsWith(`\n\n${F0_NEW}`)).toBe(true);
  });
});

// ------------------------------------------------------------------- main

describe("main (disk, no network)", () => {
  let dir: string;
  const saved = { state: process.env.SEO_STATE_DIR, data: process.env.SEO_DATA_DIR, today: process.env.SEO_TODAY };
  let stdout: string[];

  const put = (rel: string, value: unknown): string => {
    const file = path.join(dir, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value));
    return file;
  };
  const seed = (): void => {
    put("data/crawl-2026-09-27.json", SITE_CRAWL);
    put("data/crawl-2026-09-20.json", crawlOf([page("/stale")]));
    put("data/index-status.json", SITE_STATUS);
    put("data/gsc-2026-09-27.json", SITE_GSC);
    put("data/psi-2026-09-27.json", SITE_PSI);
  };
  const lessons = (): string => readFileSync(path.join(dir, "lessons.md"), "utf8");

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "seo-baseline-"));
    process.env.SEO_STATE_DIR = dir;
    process.env.SEO_DATA_DIR = path.join(dir, "data");
    process.env.SEO_TODAY = "2026-09-27";
    stdout = [];
    vi.spyOn(console, "log").mockImplementation((...parts: unknown[]) => {
      stdout.push(parts.join(" "));
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
    for (const [key, value] of [
      ["SEO_STATE_DIR", saved.state],
      ["SEO_DATA_DIR", saved.data],
      ["SEO_TODAY", saved.today],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("writes baseline-<date>.json from the latest artifacts and the F0 section of lessons.md", async () => {
    seed();
    const debt = put("in/debt.md", "# Known debt\n- 20 URLs never crawled\n");
    expect(await main(parseArgs(["--label", "F0", "--debt", debt]))).toBe(0);
    const baseline = JSON.parse(readFileSync(path.join(dir, "data", "baseline-2026-09-27.json"), "utf8")) as Baseline;
    expect(baseline).toMatchObject({ date: "2026-09-27", label: "F0", missing: [], sources: { crawl: "2026-09-27", indexStatus: "2026-09-27", gsc: "2026-09-27", psi: "2026-09-27" } });
    expect(baseline.urls.map((r) => r.path)).toEqual(["/", "/blog/a", "/glossary/noi", "/markets/x"]);
    expect(baseline.summary.knownDebt).toEqual(["20 URLs never crawled"]);
    expect(lessons()).toContain("## Baseline 2026-09-27 (F0)");
    expect(lessons()).toContain("- 20 URLs never crawled");
  });

  it("keeps ledger.ts's section and the F0 baseline when F10 is written later", async () => {
    seed();
    put("lessons.md", "# SEO loop lessons\n\n## Outcomes by change type\n\n| title | 2 wins |\n");
    await main(parseArgs(["--label", "F0"]));
    const afterF0 = lessons();
    process.env.SEO_TODAY = "2026-12-01";
    await main(parseArgs(["--label", "F10"]));
    const out = lessons();
    expect(out.startsWith(afterF0.replace(/\s+$/, ""))).toBe(true);
    expect(out).toContain("## Outcomes by change type\n\n| title | 2 wins |\n");
    expect(out).toContain("## Baseline 2026-09-27 (F0)");
    expect(out).toContain("## Baseline 2026-12-01 (F10)");
    expect(existsSync(path.join(dir, "data", "baseline-2026-12-01.json"))).toBe(true);
  });

  it("re-running a label replaces its section instead of adding another", async () => {
    seed();
    await main(parseArgs(["--label", "F0"]));
    const first = lessons();
    await main(parseArgs(["--label", "F0"]));
    expect(lessons()).toBe(first);
    expect(lessons().match(/\(F0\)/g)).toHaveLength(1);
  });

  it("works from index-status alone and names what is missing", async () => {
    put("data/index-status.json", SITE_STATUS);
    await main(parseArgs(["--label", "F0"]));
    const baseline = JSON.parse(readFileSync(path.join(dir, "data", "baseline-2026-09-27.json"), "utf8")) as Baseline;
    expect(baseline.missing).toEqual(["crawl", "gsc", "psi"]);
    expect(lessons()).toContain("- **Missing inputs:** crawl, gsc, psi");
  });

  it("refuses to run without a label, without any input, or with a missing --debt file", async () => {
    await expect(main(parseArgs([]))).rejects.toThrow(/--label is required/);
    await expect(main(parseArgs(["--label", "F0"]))).rejects.toThrow(/nothing to baseline/);
    seed();
    await expect(main(parseArgs(["--label", "F0", "--debt", path.join(dir, "nope.md")]))).rejects.toThrow(/does not exist/);
    expect(existsSync(path.join(dir, "lessons.md"))).toBe(false);
  });

  it("--dry-run prints the summary and the section and writes nothing", async () => {
    seed();
    await main(parseArgs(["--label", "F0", "--dry-run"]));
    expect(existsSync(path.join(dir, "lessons.md"))).toBe(false);
    expect(readdirSync(path.join(dir, "data")).some((name) => name.startsWith("baseline-"))).toBe(false);
    expect(stdout.join("\n")).toContain("## Baseline 2026-09-27 (F0)");
  });
});
