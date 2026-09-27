/**
 * Per-URL baseline of the site's search state, taken before the foundation
 * PRs (label F0) and again after them (label F10), so the loop's later effect
 * can be measured against a fixed starting point.
 *
 * Writes:
 *   - seo/data/baseline-<date>.json: one row per sitemap URL {path, family,
 *     indexClass, coverageState, lastCrawlTime, everIndexed, wordCount,
 *     mainHash, thin, impressions28d, clicks28d, position} plus a summary;
 *   - a `## Baseline <date> (<label>)` section in seo/lessons.md: indexed
 *     count (total and by family), not-indexed reasons, index classes,
 *     orphans, duplicate titles, template vitals and the known debt at
 *     baseline.
 *
 * Load-bearing constraints:
 *   - It reads existing artifacts only (the latest crawl, index-status.json,
 *     the latest gsc and psi pulls) and never calls an API. Run gsc-inspect,
 *     crawl, gsc-pull and psi first. A missing input is named in the output
 *     rather than guessed at.
 *   - lessons.md is shared: ledger.ts owns `## Outcomes by change type` and
 *     the founder may add sections by hand. Only the section for this label is
 *     replaced (whatever its date); every other section is kept byte for byte,
 *     so F0 and F10 sit side by side.
 *   - The URL universe is the sitemap: crawl pages plus index-status URLs not
 *     marked `removedFromSitemap`. A partial crawl (`--limit`) is flagged in
 *     the summary because its counts would understate the site.
 *   - Both files are published on the public seo-state branch. They hold
 *     paths, metrics and page titles only.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Args } from "./lib/cli.ts";
import { check, flagString, hasFlag, log, runMain } from "./lib/cli.ts";
import { loadConfig } from "./lib/config.ts";
import { familyOf, type Family } from "./lib/family.ts";
import { readJsonIfExists, writeJson, writeText } from "./lib/io.ts";
import { datedDataPath, latestDataFile, statePaths, today } from "./lib/paths.ts";
import { toPath } from "./lib/sitemap.ts";
import type { Crawl, GscPull, IndexClass, IndexStatus, IndexStatusUrl, Psi } from "./lib/types.ts";

export const BASELINE_LABELS = ["F0", "F10"] as const;
export type BaselineLabel = (typeof BASELINE_LABELS)[number];

const INDEX_CLASSES: IndexClass[] = ["indexed", "crawled_not_indexed", "dropped_after_indexed", "never_crawled", "excluded", "unknown"];
const NOT_INSPECTED = "not_inspected";
const LESSONS_TITLE = "# SEO loop lessons";
const DUPLICATE_TITLES_SHOWN = 10;
const ORPHANS_SHOWN = 50;

type IndexStatusUrlExt = IndexStatusUrl & { removedFromSitemap?: string | null; mainHash?: string | null };

export type BaselineRow = {
  path: string;
  family: Family;
  indexClass: IndexClass | null;
  coverageState: string | null;
  lastCrawlTime: string | null;
  everIndexed: boolean | null;
  wordCount: number | null;
  mainHash: string | null;
  thin: boolean | null;
  impressions28d: number;
  clicks28d: number;
  position: number | null;
};

export type TemplateVital = {
  template: string;
  path: string;
  ok: boolean;
  error: string | null;
  performanceScore: number | null;
  lcpMs: number | null;
  clsLab: number | null;
  tbtMs: number | null;
  fieldInpMs: number | null;
};

export type BaselineSummary = {
  total: number;
  indexed: number;
  indexedByFamily: Record<string, { total: number; indexed: number }>;
  notIndexedReasons: Array<{ coverageState: string; count: number }>;
  indexClassCounts: Record<string, number>;
  thin: number;
  orphans: { known: boolean; count: number; paths: string[] };
  duplicateTitles: { count: number; pages: number; top: Array<{ title: string; paths: string[] }> };
  templateVitals: TemplateVital[];
  search: { clicks28d: number; impressions28d: number; startDate: string | null; endDate: string | null } | null;
  crawl: { pages: number; sitemapCount: number; partial: boolean; linkGraphRan: boolean; issues: Record<string, number> } | null;
  knownDebt: string[];
};

/** seo/data/baseline-<date>.json. Declared here until lib/types.ts carries it. */
export type Baseline = {
  generatedAt: string;
  date: string;
  label: BaselineLabel;
  sources: { crawl: string | null; indexStatus: string | null; gsc: string | null; psi: string | null };
  missing: string[];
  urls: BaselineRow[];
  summary: BaselineSummary;
};

const finiteOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const byName = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function parseLabel(value: string | null): BaselineLabel {
  const match = BASELINE_LABELS.find((label) => label === value);
  if (!match) throw new Error(`--label is required and must be one of ${BASELINE_LABELS.join(", ")}${value ? ` (got "${value}")` : ""}`);
  return match;
}

// --------------------------------------------------------------- rows

type Traffic = { clicks: number; impressions: number; position: number | null };

/**
 * gsc page rows → per-path traffic. Rows are site paths already; a full URL
 * is accepted when it is on the site's host. Duplicate rows for one path are
 * summed, with position weighted by impressions.
 */
export function trafficByPath(gsc: GscPull | null, base: string): Map<string, Traffic> {
  const host = new URL(base).host;
  const sums = new Map<string, { clicks: number; impressions: number; weighted: number }>();
  for (const row of gsc?.pages?.current ?? []) {
    let p: string | null = null;
    if (typeof row.page === "string" && row.page.startsWith("/")) p = row.page;
    else {
      try {
        p = new URL(row.page).host === host ? toPath(row.page) : null;
      } catch {
        p = null;
      }
    }
    if (!p) continue;
    const impressions = finiteOrNull(row.impressions) ?? 0;
    const prev = sums.get(p) ?? { clicks: 0, impressions: 0, weighted: 0 };
    sums.set(p, {
      clicks: prev.clicks + (finiteOrNull(row.clicks) ?? 0),
      impressions: prev.impressions + impressions,
      weighted: prev.weighted + (finiteOrNull(row.position) ?? 0) * impressions,
    });
  }
  const out = new Map<string, Traffic>();
  for (const [p, s] of sums) {
    out.set(p, { clicks: s.clicks, impressions: s.impressions, position: s.impressions > 0 ? Number((s.weighted / s.impressions).toFixed(1)) : null });
  }
  return out;
}

/** One row per sitemap URL, sorted by path. Crawl fields win over the copies merged into index-status. */
export function buildRows(crawl: Crawl | null, indexStatus: IndexStatus | null, gsc: GscPull | null, base: string): BaselineRow[] {
  const pages = new Map((crawl?.pages ?? []).map((page) => [page.path, page]));
  const inspected = new Map<string, IndexStatusUrlExt>();
  for (const [url, raw] of Object.entries(indexStatus?.urls ?? {})) {
    const entry = raw as IndexStatusUrlExt;
    if (!entry || typeof entry !== "object" || entry.removedFromSitemap) continue;
    inspected.set(typeof entry.path === "string" ? entry.path : toPath(url), entry);
  }
  const traffic = trafficByPath(gsc, base);
  const paths = [...new Set([...pages.keys(), ...inspected.keys()])].sort(byName);
  return paths.map((p) => {
    const page = pages.get(p) ?? null;
    const entry = inspected.get(p) ?? null;
    const t = traffic.get(p);
    return {
      path: p,
      family: familyOf(p),
      indexClass: entry?.indexClass ?? null,
      coverageState: entry?.coverageState ?? null,
      lastCrawlTime: entry?.lastCrawlTime ?? null,
      everIndexed: typeof entry?.everIndexed === "boolean" ? entry.everIndexed : null,
      wordCount: page ? page.wordCount : (entry?.wordCount ?? null),
      mainHash: page ? page.mainHash : (entry?.mainHash ?? null),
      thin: page ? page.thin : (entry?.thin ?? null),
      impressions28d: t?.impressions ?? 0,
      clicks28d: t?.clicks ?? 0,
      position: t?.position ?? null,
    };
  });
}

// ------------------------------------------------------------ summary

export function templateVitals(psi: Psi | null): TemplateVital[] {
  return (psi?.results ?? []).map((r) => ({
    template: r.template,
    path: toPath(r.url),
    ok: r.ok,
    error: r.error,
    performanceScore: r.performanceScore,
    lcpMs: r.lcpMs,
    clsLab: r.clsLab,
    tbtMs: r.tbtMs,
    // Field INP only. psi.ts keeps origin-level data out of `field`, and so does this.
    fieldInpMs: r.field?.inpMs ?? null,
  }));
}

export function summarize(rows: BaselineRow[], crawl: Crawl | null, gsc: GscPull | null, psi: Psi | null, knownDebt: string[]): BaselineSummary {
  const indexedByFamily: Record<string, { total: number; indexed: number }> = {};
  const indexClassCounts: Record<string, number> = Object.fromEntries([...INDEX_CLASSES, NOT_INSPECTED].map((c) => [c, 0]));
  const reasons = new Map<string, number>();
  let indexed = 0;
  for (const row of rows) {
    const family = (indexedByFamily[row.family] ??= { total: 0, indexed: 0 });
    family.total += 1;
    indexClassCounts[row.indexClass ?? NOT_INSPECTED] = (indexClassCounts[row.indexClass ?? NOT_INSPECTED] ?? 0) + 1;
    if (row.indexClass === "indexed") {
      family.indexed += 1;
      indexed += 1;
      continue;
    }
    const reason = row.indexClass === null ? "(not inspected)" : (row.coverageState ?? "(no coverage state)");
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  }

  const duplicates = [...(crawl?.issues?.duplicateTitles ?? [])].sort((a, b) => b.paths.length - a.paths.length || byName(a.title, b.title));
  const issues = crawl?.issues;
  const orphansKnown = Boolean(crawl?.linkGraph?.ran);
  return {
    total: rows.length,
    indexed,
    indexedByFamily: Object.fromEntries(Object.entries(indexedByFamily).sort((a, b) => byName(a[0], b[0]))),
    notIndexedReasons: [...reasons].map(([coverageState, count]) => ({ coverageState, count })).sort((a, b) => b.count - a.count || byName(a.coverageState, b.coverageState)),
    indexClassCounts,
    thin: rows.filter((row) => row.thin === true).length,
    orphans: orphansKnown ? { known: true, count: issues?.orphans?.length ?? 0, paths: [...(issues?.orphans ?? [])].sort(byName) } : { known: false, count: 0, paths: [] },
    duplicateTitles: {
      count: duplicates.length,
      pages: duplicates.reduce((sum, d) => sum + d.paths.length, 0),
      top: duplicates.slice(0, DUPLICATE_TITLES_SHOWN).map((d) => ({ title: d.title, paths: [...d.paths].sort(byName) })),
    },
    templateVitals: templateVitals(psi),
    search: gsc?.totals?.current
      ? {
          clicks28d: finiteOrNull(gsc.totals.current.clicks) ?? 0,
          impressions28d: finiteOrNull(gsc.totals.current.impressions) ?? 0,
          startDate: gsc.windows?.current?.startDate ?? null,
          endDate: gsc.windows?.current?.endDate ?? null,
        }
      : null,
    crawl: crawl
      ? {
          pages: crawl.pages?.length ?? 0,
          sitemapCount: crawl.sitemapCount ?? 0,
          partial: (crawl.pages?.length ?? 0) < (crawl.sitemapCount ?? 0),
          linkGraphRan: Boolean(crawl.linkGraph?.ran),
          issues: {
            missingTitles: issues?.missingTitles?.length ?? 0,
            missingDescriptions: issues?.missingDescriptions?.length ?? 0,
            duplicateDescriptions: issues?.duplicateDescriptions?.length ?? 0,
            deeperThan3: issues?.deeperThan3?.length ?? 0,
            brokenInternalLinks: issues?.brokenInternalLinks?.length ?? 0,
            nonSelfCanonical: issues?.nonSelfCanonical?.length ?? 0,
            noindexInSitemap: issues?.noindexInSitemap?.length ?? 0,
            non200: issues?.non200?.length ?? 0,
          },
        }
      : null,
    knownDebt,
  };
}

export type BaselineInputs = {
  date: string;
  label: BaselineLabel;
  generatedAt: string;
  base: string;
  crawl: Crawl | null;
  indexStatus: IndexStatus | null;
  gsc: GscPull | null;
  psi: Psi | null;
  sources: Baseline["sources"];
  knownDebt: string[];
};

export function buildBaseline(input: BaselineInputs): Baseline {
  const rows = buildRows(input.crawl, input.indexStatus, input.gsc, input.base);
  const missing = [
    ...(input.crawl ? [] : ["crawl"]),
    ...(input.indexStatus ? [] : ["index-status"]),
    ...(input.gsc ? [] : ["gsc"]),
    ...(input.psi ? [] : ["psi"]),
  ];
  return {
    generatedAt: input.generatedAt,
    date: input.date,
    label: input.label,
    sources: input.sources,
    missing,
    urls: rows,
    summary: summarize(rows, input.crawl, input.gsc, input.psi, input.knownDebt),
  };
}

// -------------------------------------------------------- known debt

/**
 * `--debt <file.md>` → one string per item. Bullets, numbered items and plain
 * lines each become one item. A heading on the first line is the file's title
 * and is dropped; later headings become bold group labels. Nothing in the
 * file can open a heading of its own inside lessons.md.
 */
export function parseDebt(md: string): string[] {
  const items: string[] = [];
  let first = true;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^[-*_]{3,}$/.test(line)) continue;
    const heading = /^#{1,6}\s+(.*)$/.exec(line)?.[1].trim();
    if (heading !== undefined) {
      if (!first && heading) items.push(`**${heading}**`);
      first = false;
      continue;
    }
    first = false;
    const text = line
      .replace(/^(?:[-*+]|\d+[.)])\s+/, "")
      .replace(/^\[[ xX]\]\s+/, "")
      .replace(/^#{1,6}\s+/, "")
      .trim();
    if (text) items.push(text);
  }
  return items;
}

// ------------------------------------------------------------ lessons

const cellText = (value: unknown): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\|/g, "\\|");
const int = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const pct = (part: number, whole: number): string => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "n/a");
const orDash = (value: number | null, render: (v: number) => string = String): string => (value === null ? "—" : render(value));
const plural = (n: number, noun: string): string => `${int(n)} ${noun}${n === 1 ? "" : "s"}`;

export function baselineHeading(date: string, label: BaselineLabel): string {
  return `## Baseline ${date} (${label})`;
}

/** The lessons.md section for one baseline. */
export function renderLessonsSection(baseline: Baseline): string {
  const s = baseline.summary;
  const src = baseline.sources;
  const from = [
    `crawl ${src.crawl ?? "missing"}`,
    `index-status ${src.indexStatus ?? "missing"}`,
    `gsc ${src.gsc ?? "missing"}`,
    `psi ${src.psi ?? "missing"}`,
  ].join(", ");
  const out: string[] = [
    baselineHeading(baseline.date, baseline.label),
    "",
    `Recorded by \`seo/scripts/baseline.ts\` from existing artifacts (${from}). Per-URL rows: \`seo/data/baseline-${baseline.date}.json\`.`,
    "",
    `- Indexed: ${int(s.indexed)} of ${int(s.total)} sitemap URLs (${pct(s.indexed, s.total)})`,
  ];
  if (s.search) {
    const window = s.search.startDate && s.search.endDate ? ` (${s.search.startDate} to ${s.search.endDate})` : "";
    out.push(`- Search, 28 days${window}: ${int(s.search.clicks28d)} clicks, ${int(s.search.impressions28d)} impressions`);
  }
  out.push(`- Orphans: ${s.orphans.known ? int(s.orphans.count) : "unknown (the crawl's link graph did not run)"}`);
  out.push(`- Duplicate titles: ${plural(s.duplicateTitles.count, "group")} covering ${plural(s.duplicateTitles.pages, "page")}`);
  out.push(`- Thin pages: ${int(s.thin)}`);
  if (s.crawl?.partial) out.push(`- **Partial crawl:** ${int(s.crawl.pages)} of ${int(s.crawl.sitemapCount)} sitemap URLs were fetched, so crawl counts understate the site.`);
  if (baseline.missing.length) out.push(`- **Missing inputs:** ${baseline.missing.join(", ")}`);

  out.push("", "### Indexed by family", "", "| Family | Indexed | Total |", "|---|---:|---:|");
  for (const [family, counts] of Object.entries(s.indexedByFamily)) out.push(`| ${family} | ${int(counts.indexed)} | ${int(counts.total)} |`);

  out.push("", "### Not-indexed reasons", "");
  if (!s.notIndexedReasons.length) out.push("Every URL is indexed.");
  else {
    out.push("| Coverage state | URLs |", "|---|---:|");
    for (const r of s.notIndexedReasons) out.push(`| ${cellText(r.coverageState)} | ${int(r.count)} |`);
  }

  out.push("", "### Index classes", "", "| Class | URLs |", "|---|---:|");
  for (const [indexClass, count] of Object.entries(s.indexClassCounts)) if (count > 0) out.push(`| ${indexClass} | ${int(count)} |`);

  out.push("", "### Orphans", "");
  if (!s.orphans.known) out.push("Unknown: the crawl's link graph did not run.");
  else if (!s.orphans.paths.length) out.push("None.");
  else {
    for (const p of s.orphans.paths.slice(0, ORPHANS_SHOWN)) out.push(`- \`${cellText(p)}\``);
    if (s.orphans.paths.length > ORPHANS_SHOWN) out.push(`- …and ${s.orphans.paths.length - ORPHANS_SHOWN} more (see the baseline JSON)`);
  }

  out.push("", `### Duplicate titles (top ${DUPLICATE_TITLES_SHOWN})`, "");
  if (!s.duplicateTitles.top.length) out.push(baseline.sources.crawl ? "None." : "Unknown: no crawl.");
  else {
    out.push("| Title | Pages |", "|---|---|");
    for (const d of s.duplicateTitles.top) out.push(`| ${cellText(d.title)} | ${d.paths.map((p) => `\`${cellText(p)}\``).join(", ")} |`);
  }

  out.push("", "### Template vitals (PSI mobile)", "");
  if (!s.templateVitals.length) out.push("No psi-YYYY-MM-DD.json was found.");
  else {
    out.push(
      "LCP, CLS and TBT are one lab run; INP exists only as field data, which most pages at this traffic do not have.",
      "",
      "| Template | Page | Score | LCP | CLS | TBT | Field INP |",
      "|---|---|---:|---:|---:|---:|---:|",
    );
    for (const v of s.templateVitals) {
      if (!v.ok) {
        out.push(`| ${cellText(v.template)} | \`${cellText(v.path)}\` | failed (${cellText(v.error ?? "unknown")}) | — | — | — | — |`);
        continue;
      }
      out.push(
        `| ${cellText(v.template)} | \`${cellText(v.path)}\` | ${orDash(v.performanceScore)} | ${orDash(v.lcpMs, (n) => `${int(n)} ms`)} | ${orDash(v.clsLab)} | ${orDash(v.tbtMs, (n) => `${int(n)} ms`)} | ${orDash(v.fieldInpMs, (n) => `${int(n)} ms`)} |`,
      );
    }
  }

  if (s.knownDebt.length) {
    out.push("", "### Known debt at baseline", "");
    for (const item of s.knownDebt) out.push(`- ${item.replace(/\s+/g, " ")}`);
  }
  return `${out.join("\n")}\n`;
}

function labelHeadingRe(label: BaselineLabel): RegExp {
  return new RegExp(`^## Baseline \\d{4}-\\d{2}-\\d{2} \\(${label}\\)\\s*$`);
}

/** Line indexes of level-2 headings, ignoring lines inside fenced code blocks. */
function level2Headings(lines: string[]): number[] {
  const out: number[] = [];
  let fence: string | null = null;
  lines.forEach((line, i) => {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1] ?? null;
    if (marker) {
      if (fence === null) fence = marker[0];
      else if (marker[0] === fence) fence = null;
      return;
    }
    if (fence === null && /^##(?!#)\s/.test(line)) out.push(i);
  });
  return out;
}

/**
 * Put `section` in place of this label's baseline section, whatever date it
 * carries; append it when there is none. A second section with the same
 * label is dropped (one baseline per label). Everything else is kept
 * verbatim.
 */
export function upsertBaselineSection(lessons: string, label: BaselineLabel, section: string): string {
  const body = section.replace(/\s+$/, "");
  if (!lessons.trim()) return `${LESSONS_TITLE}\n\n${body}\n`;
  const lines = lessons.split("\n");
  const headings = level2Headings(lines);
  const mine = labelHeadingRe(label);
  const ranges = headings
    .map((start, k) => ({ start, end: headings[k + 1] ?? lines.length }))
    .filter((range) => mine.test(lines[range.start]));
  if (!ranges.length) return `${lessons.replace(/\s+$/, "")}\n\n${body}\n`;

  const out: string[] = [];
  let cursor = 0;
  ranges.forEach((range, k) => {
    out.push(...lines.slice(cursor, range.start));
    if (k === 0) {
      out.push(...body.split("\n"));
      if (range.end < lines.length) out.push("");
    }
    cursor = range.end;
  });
  out.push(...lines.slice(cursor));
  const joined = out.join("\n");
  return joined.endsWith("\n") ? joined : `${joined}\n`;
}

// --------------------------------------------------------------- main

function dateOf(file: string | null): string | null {
  return file ? (/(\d{4}-\d{2}-\d{2})\.json$/.exec(file)?.[1] ?? null) : null;
}

export async function main(args: Args): Promise<number> {
  const label = parseLabel(flagString(args, "label"));
  const config = loadConfig();
  const date = today();

  const crawlFile = latestDataFile("crawl");
  const gscFile = latestDataFile("gsc");
  const psiFile = latestDataFile("psi");
  const crawl = readJsonIfExists<Crawl>(crawlFile);
  const indexStatus = readJsonIfExists<IndexStatus>(statePaths.indexStatus());
  const gsc = readJsonIfExists<GscPull>(gscFile);
  const psi = readJsonIfExists<Psi>(psiFile);
  if (!crawl && !indexStatus) {
    throw new Error("nothing to baseline: there is no crawl-YYYY-MM-DD.json and no index-status.json. Run crawl.ts and gsc-inspect.ts first.");
  }

  const debtFile = flagString(args, "debt");
  if (debtFile && !existsSync(debtFile)) throw new Error(`--debt ${path.basename(debtFile)} does not exist`);
  const knownDebt = debtFile ? parseDebt(readFileSync(debtFile, "utf8")) : [];

  const baseline = buildBaseline({
    date,
    label,
    generatedAt: new Date().toISOString(),
    base: config.site.base,
    crawl,
    indexStatus,
    gsc,
    psi,
    sources: {
      crawl: dateOf(crawlFile),
      indexStatus: typeof indexStatus?.generatedAt === "string" ? indexStatus.generatedAt.slice(0, 10) : null,
      gsc: dateOf(gscFile),
      psi: dateOf(psiFile),
    },
    knownDebt,
  });
  for (const name of baseline.missing) log(`baseline: no ${name} input; its fields are null in the baseline`);
  if (baseline.summary.crawl?.partial) log(`baseline: the crawl covered ${baseline.summary.crawl.pages} of ${baseline.summary.crawl.sitemapCount} sitemap URLs`);

  const section = renderLessonsSection(baseline);
  if (hasFlag(args, "dry-run")) {
    console.log(JSON.stringify(baseline.summary, null, 2));
    console.log(section);
    return 0;
  }

  const jsonFile = datedDataPath("baseline", date);
  writeJson(jsonFile, baseline);
  const lessonsFile = statePaths.lessons();
  const current = existsSync(lessonsFile) ? readFileSync(lessonsFile, "utf8") : "";
  writeText(lessonsFile, upsertBaselineSection(current, label, section));
  const s = baseline.summary;
  log(`baseline ${label}: ${s.indexed}/${s.total} indexed; wrote ${path.basename(jsonFile)} and the ${label} section of ${path.basename(lessonsFile)}`);
  return 0;
}

function selfTest(): void {
  const base = "https://usetruecap.com";
  const gsc = {
    totals: { current: { clicks: 3, impressions: 150, ctr: 0.02, position: 12 }, prior: { clicks: 0, impressions: 0, ctr: 0, position: 0 } },
    pages: {
      current: [
        { page: "/blog/a", clicks: 1, impressions: 100, ctr: 0.01, position: 10 },
        { page: "https://usetruecap.com/blog/a/", clicks: 1, impressions: 50, ctr: 0.02, position: 16 },
        { page: "https://www.usetruecap.com/blog/b", clicks: 9, impressions: 900, ctr: 0.01, position: 3 },
      ],
      prior: [],
    },
  } as unknown as GscPull;
  const traffic = trafficByPath(gsc, base);
  check(traffic.get("/blog/a")?.impressions === 150 && traffic.get("/blog/a")?.position === 12, "rows for one path sum; position is impression-weighted");
  check(!traffic.has("/blog/b"), "another host is not this site's traffic");

  const status = {
    generatedAt: "2026-09-27T00:00:00Z",
    urls: {
      [`${base}/blog/a`]: { path: "/blog/a", indexClass: "indexed", coverageState: "Submitted and indexed", everIndexed: true, lastCrawlTime: "2026-09-01T00:00:00Z", wordCount: 900, thin: false },
      [`${base}/blog/c`]: { path: "/blog/c", indexClass: "crawled_not_indexed", coverageState: "Crawled - currently not indexed", everIndexed: false, lastCrawlTime: "2026-07-01T00:00:00Z" },
      [`${base}/gone`]: { path: "/gone", indexClass: "indexed", removedFromSitemap: "2026-09-20" },
    },
  } as unknown as IndexStatus;
  const rows = buildRows(null, status, gsc, base);
  check(rows.map((r) => r.path).join(",") === "/blog/a,/blog/c", "removed URLs are outside the universe; rows sort by path");
  check(rows[0].impressions28d === 150 && rows[1].position === null, "traffic joins by path; no impressions means no position");

  const summary = summarize(rows, null, gsc, null, []);
  check(summary.indexed === 1 && summary.total === 2, "indexed count");
  check(summary.notIndexedReasons[0]?.coverageState === "Crawled - currently not indexed", "not-indexed reasons count coverage states");
  check(!summary.orphans.known, "without a crawl the orphans are unknown, not zero");

  const lessons = "# L\n\n## Outcomes by change type\n\nkept\n\n## Baseline 2026-09-01 (F0)\n\nold\n\n## Notes\n\n```\n## not a heading\n```\n";
  const next = upsertBaselineSection(lessons, "F0", "## Baseline 2026-09-27 (F0)\n\nnew\n");
  check(next.includes("new") && !next.includes("old"), "the label's section is replaced whatever its date");
  check(next.includes("## Outcomes by change type\n\nkept\n\n") && next.includes("## Notes\n\n```\n## not a heading\n```\n"), "other sections are verbatim");
  const both = upsertBaselineSection(next, "F10", "## Baseline 2026-12-01 (F10)\n\nlater\n");
  check(both.includes("(F0)") && both.includes("(F10)"), "F0 and F10 coexist");
  check(upsertBaselineSection(both, "F10", "## Baseline 2026-12-01 (F10)\n\nlater\n") === both, "re-running is a no-op");
  check(parseDebt("# Debt\n- a\n* b\n## Later\n1. c\n---\n").join("|") === "a|b|**Later**|c", "debt lines become items; no heading survives");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["debt", "dry-run", "label"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
