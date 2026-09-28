/**
 * lastmod.ts — the honest last-modified map, content/seo/lastmod.json.
 *
 * Google uses <lastmod> only when it is "consistently and verifiably
 * accurate" and means the last SIGNIFICANT change to the page's main content,
 * structured data or links. So a date moves only when that content moved.
 * The map is a flat, key-sorted { "<site path>": "YYYY-MM-DD" } object read by
 * lib/seo/lastmod.ts (sitemap, feed, JSON-LD dateModified, post MODIFIED_AT).
 *
 *   · `bump` (publish job): sets the date for the URLs a published loop
 *     change edited (the plan's `lastmodUrls`: an OG image is not the page's
 *     main content). The model never writes dates; this deterministic step
 *     does, from the publish plan.
 *   · `seed` (owner, F2): builds the map from git history. For every sitemap
 *     URL the date is the committer date (in UTC) of the NEWEST commit that
 *     changed that URL's content signature (lib/content-signature.ts: visible
 *     text and data, never classNames, imports, whitespace or the dates
 *     themselves), walking history newest to oldest and skipping the
 *     presentation-only sweeps in seo/config.json `sweepCommits`. When every
 *     change was a skipped sweep, the commit that introduced the content is
 *     used. Never a deploy date, never today. A blog post's date is clamped up
 *     to its registry publishedAt. It refuses to run in a shallow clone, or
 *     when a listed sweep is not in HEAD's history: the F-series lands on main
 *     rebased, so a sweep listed under its branch SHA would skip nothing
 *     (the error names the landed copy when it can find it).
 *
 * What counts as a URL's content (SOURCES below):
 *   · blog posts, /vs pages, tools, core pages: their own page.tsx; the thin
 *     shells add their own content components ("/", /why-truecap, /analyze),
 *     and /blog adds lib/blog-posts.ts (the registry lived in its page.tsx
 *     until F2, and the list of posts is that page's content);
 *   · glossary terms, states, markets, blog topics: that ONE entry in the
 *     family's data file(s), located by slug in each historical version, and
 *     only the fields the template renders. Templates never count.
 *   · HUD/SAFMR data vintages (`year`) are not lastmod: they belong in the
 *     visible "Data as of" line. A changed rent value is a data change.
 *
 *   node seo/scripts/lastmod.ts bump --plan publish-plan.json --date 2026-10-05
 *   node seo/scripts/lastmod.ts seed [--sitemap sitemap.xml] [--report report.md]
 *
 * `seed` reads the live sitemap when --sitemap is omitted, writes the map with
 * writeJson (sorted keys), and --report writes a markdown summary (histogram,
 * clamps, fallbacks, the named corpus-wide sweeps it chose, with evidence)
 * plus <report>.json with every URL's chosen commit.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { flagString, requireFlag, runMain, check, log } from "./lib/cli.ts";
import type { Args } from "./lib/cli.ts";
import { loadConfig, matchesAny } from "./lib/config.ts";
import { derivedPagesForFile } from "./lib/family.ts";
import type * as ContentSignature from "./lib/content-signature.ts";
import type { EntryFields } from "./lib/content-signature.ts";

/**
 * content-signature.ts parses TypeScript with the `typescript` package, which
 * only `seed` (and the self-test) needs. The publish job installs no packages
 * — it runs `bump`, which is pure — so a static import made every publish
 * fail with ERR_MODULE_NOT_FOUND (second live run, 2026-09-28). Loaded on
 * demand instead.
 */
let signatures: typeof ContentSignature | null = null;
async function loadSignatures(): Promise<void> {
  signatures ??= await import("./lib/content-signature.ts");
}
function signatureLib(): typeof ContentSignature {
  if (!signatures) throw new Error("content signatures are not loaded (call loadSignatures first)");
  return signatures;
}

import { readJson, writeJson, writeText } from "./lib/io.ts";
import { REPO_ROOT, today } from "./lib/paths.ts";
import { fetchSitemap, parseSitemap } from "./lib/sitemap.ts";

export const LASTMOD_FILE = path.join(REPO_ROOT, "content", "seo", "lastmod.json");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type LastmodMap = Record<string, string>;

export function sortMap(map: LastmodMap): LastmodMap {
  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => (a < b ? -1 : 1)));
}

export function bumpMap(map: LastmodMap, urls: string[], date: string): LastmodMap {
  if (!DATE_RE.test(date)) throw new Error(`bad date ${date}`);
  const next: LastmodMap = { ...map };
  for (const url of urls) {
    if (!url.startsWith("/")) throw new Error(`lastmod keys are site paths, got ${url}`);
    // Never move a date backwards: a re-run of an older plan must not undo a newer change.
    if (!next[url] || next[url] < date) next[url] = date;
  }
  return sortMap(next);
}

/**
 * The pages a plan moves the date of: `lastmodUrls` (main content changed;
 * an OG-image-only change is not a significant change), or `urls` from a
 * plan written before that field existed.
 */
export function bumpUrls(plan: { urls?: unknown; lastmodUrls?: unknown }): string[] {
  const list = Array.isArray(plan.lastmodUrls) ? plan.lastmodUrls : Array.isArray(plan.urls) ? plan.urls : null;
  if (list === null) throw new Error("the publish plan has no lastmodUrls or urls list");
  return list.filter((u): u is string => typeof u === "string");
}

// ------------------------------------------------------------------ sources

export type SourceSpec =
  | { file: string; kind: "file" }
  | { file: string; kind: "decls"; names: readonly string[] }
  | ({ file: string; kind: "entry"; container: string; slug: string } & EntryFields)
  /** One entry of a JSON dataset (F8's content/seo/*-facts.json): the value at `path`, minus `omit` keys at any depth. */
  | { file: string; kind: "json"; path: readonly string[]; omit?: readonly string[] };

const LANDING_SECTIONS = "components/marketing/landing-sections.tsx";

/** The landing-section components app/page.tsx renders (the homepage is a composition shell). */
const HOME_SECTIONS = ["ProblemBlock", "HowTrueCapWorks", "PdfProUpsell", "DataSourcesSection", "BuiltByInvestor", "SocialProof", "HomepageFaq", "FinalCta"];

/** Pages whose content is more than their own page.tsx. Every other core page, hub and tool is page.tsx only. */
const CORE_SOURCES: Record<string, SourceSpec[]> = {
  "/": [
    { file: "app/page.tsx", kind: "file" },
    { file: "components/marketing/marketing-hero.tsx", kind: "file" },
    { file: LANDING_SECTIONS, kind: "decls", names: HOME_SECTIONS },
  ],
  "/why-truecap": [
    { file: "app/why-truecap/page.tsx", kind: "file" },
    { file: LANDING_SECTIONS, kind: "decls", names: ["VsCompetitors", "HomepageFaq"] },
  ],
  "/analyze": [
    { file: "app/analyze/page.tsx", kind: "file" },
    { file: "components/marketing/analyze-page-content.tsx", kind: "file" },
  ],
  "/blog": [
    { file: "app/blog/page.tsx", kind: "file" },
    { file: "lib/blog-posts.ts", kind: "file" },
  ],
  // "Who builds this" renders AUTHOR_BIO (F1): a bio edit changes /about's main
  // content. On posts and /vs pages the same bio is boilerplate and moves no date.
  "/about": [
    { file: "app/about/page.tsx", kind: "file" },
    { file: "lib/author.ts", kind: "decls", names: ["AUTHOR_BIO"] },
  ],
};

/**
 * Fields app/glossary/[slug]/page.tsx renders (postUrl/also are not rendered).
 * Since F9 the page also renders `toolUrl` as a link, but only while that
 * calculator is released; the field stays out on purpose, because b0509fb
 * removed seven unreleased toolUrls when nothing rendered them and counting
 * the field would re-date those pages to it. A toolUrl edit is a link change
 * the publish step dates by the rendered <main> hash.
 */
const GLOSSARY_FIELDS = ["term", "slug", "category", "definition", "benchmark", "formula", "example", "howToCheck", "whyItMatters", "related"];
/**
 * Fields app/states/[slug]/page.tsx renders from lib/states.ts. Since F8 the
 * pitch, tier, landlord lean and tax rate never render; the page's facts come
 * from content/seo/state-facts.json, a JSON dataset the seed does not read
 * (the publish step dates its changes by the rendered <main> hash).
 */
const STATE_FIELDS = ["slug", "name", "abbr"];
/** Fields app/markets/[city]/page.tsx renders; blurb, ranges, angle and neighborhoods are not rendered. */
const MARKET_CITY_FIELDS = ["slug", "name", "stateCode", "stateName", "relatedPosts"];

/** The source files and entries that make up a URL's content, or null when the URL is unknown. */
export function sourcesFor(urlPath: string, fileExists: (file: string) => boolean): SourceSpec[] | null {
  const core = CORE_SOURCES[urlPath];
  if (core) return core;
  let m = /^\/blog\/topics\/([^/]+)$/.exec(urlPath);
  if (m) return [{ file: "lib/blog-topics.ts", kind: "entry", container: "BLOG_TOPICS", slug: m[1] }];
  m = /^\/glossary\/([^/]+)$/.exec(urlPath);
  if (m) return [{ file: "lib/glossary.ts", kind: "entry", container: "GLOSSARY", slug: m[1], fields: GLOSSARY_FIELDS }];
  m = /^\/states\/([^/]+)$/.exec(urlPath);
  // F8: a state page renders its sourced facts from content/seo/state-facts.json.
  if (m) {
    return [
      { file: "lib/states.ts", kind: "entry", container: "STATES", slug: m[1], fields: STATE_FIELDS },
      { file: "content/seo/state-facts.json", kind: "json", path: ["states", m[1]], omit: ["retrievedAt"] },
    ];
  }
  m = /^\/markets\/([^/]+)$/.exec(urlPath);
  if (m) {
    // A market page is its HUD data (F8: the FMR area record too; the day a
    // row was fetched is not content) plus its city entry, or, for a bespoke
    // metro, its own page.tsx wrapper.
    const hud: SourceSpec[] = [
      { file: "lib/markets/hud-rents.ts", kind: "entry", container: "HUD_RENTS", slug: m[1], omit: ["year", "retrievedAt"] },
      { file: "lib/markets/hud-fmr-areas.ts", kind: "entry", container: "HUD_FMR_AREAS", slug: m[1], omit: ["year"] },
      { file: "lib/markets/safmr-rents.ts", kind: "entry", container: "SAFMR_RENTS", slug: m[1], omit: ["year"] },
      // The loop's seo-market-enrich facts for this city (F8).
      { file: "content/seo/market-facts.json", kind: "json", path: ["markets", m[1]], omit: ["retrievedAt"] },
    ];
    if (fileExists(`app/markets/${m[1]}/page.tsx`)) return [{ file: `app/markets/${m[1]}/page.tsx`, kind: "file" }, ...hud];
    return [{ file: "lib/markets/cities.ts", kind: "entry", container: "MARKET_CITIES", slug: m[1], fields: MARKET_CITY_FIELDS }, ...hud];
  }
  const page = urlPath === "/" ? "app/page.tsx" : `app${urlPath}/page.tsx`;
  if (fileExists(page)) return [{ file: page, kind: "file" }];
  return null;
}

// ------------------------------------------------------------------ git walk

type FileChange = { sha: string; date: string; oldBlob: string | null; newBlob: string | null };
type Touched = { spec: SourceSpec; oldBlob: string | null; newBlob: string | null };
type Change = { sha: string; date: string; before: string[]; after: string[]; touched: Touched[] };

const ZERO_SHA = /^0+$/;

class History {
  private readonly logs = new Map<string, FileChange[]>();
  private readonly blobs = new Map<string, string>();
  private readonly parts = new Map<string, string[] | Map<string, string>>();
  private readonly subjects = new Map<string, string>();
  private readonly trailers = new Map<string, boolean>();
  private order: Map<string, number> | null = null;
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  git(args: string[]): string {
    return execFileSync("git", args, { cwd: this.root, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 512 * 1024 * 1024 }).toString("utf8");
  }

  private orderMap(): Map<string, number> {
    if (!this.order) {
      const list = this.git(["rev-list", "--topo-order", "HEAD"]).split("\n").filter(Boolean);
      this.order = new Map(list.map((s, i) => [s, i]));
    }
    return this.order;
  }

  /** Newest-first topological position of every commit reachable from HEAD. */
  position(sha: string): number {
    const at = this.orderMap().get(sha);
    if (at === undefined) throw new Error(`commit ${sha.slice(0, 9)} is not reachable from HEAD`);
    return at;
  }

  /** Every commit reachable from HEAD (full SHAs). */
  reachable(): string[] {
    return [...this.orderMap().keys()];
  }

  /** True in a shallow clone: its history, and so every date a seed would take from it, is incomplete. */
  isShallow(): boolean {
    return this.git(["rev-parse", "--is-shallow-repository"]).trim() === "true";
  }

  /**
   * Commits in HEAD's history with the same author timestamp and subject as
   * `sha` — the copy a rebase or cherry-pick landed — when `sha` itself still
   * exists in this clone (e.g. on its branch). Empty when it does not.
   */
  /** True when the commit's message carries the `Lastmod-Sweep: true` trailer (see hasSweepTrailer). */
  sweepTrailer(sha: string): boolean {
    let cached = this.trailers.get(sha);
    if (cached === undefined) {
      cached = hasSweepTrailer(this.git(["log", "-1", "--format=%B", `${sha}^{commit}`]));
      this.trailers.set(sha, cached);
    }
    return cached;
  }

  landedCopies(sha: string): string[] {
    let identity: string;
    try {
      identity = this.git(["log", "-1", "--format=%at%x00%s", `${sha}^{commit}`]).trim();
    } catch {
      return [];
    }
    return this.git(["log", "--format=%H%x00%at%x00%s", "HEAD"])
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("\u0000"))
      .filter(([, at, subject]) => `${at}\u0000${subject}` === identity)
      .map(([full]) => full);
  }

  /** Every commit that changed `file`, with the blob before and after (merges without a diff are skipped). */
  fileLog(file: string): FileChange[] {
    const cached = this.logs.get(file);
    if (cached) return cached;
    // %ct, read in UTC: %cs is the day in the committer's OWN zone, and
    // GitHub's rebase-merge commits in a US zone, so a merge at 01:50 UTC on
    // the 28th read as the 27th — while the publish job dates in UTC.
    const out = this.git(["log", "--no-renames", "--format=%x01%H %ct", "--raw", "--no-abbrev", "--", file]);
    const changes: FileChange[] = [];
    for (const chunk of out.split("\u0001")) {
      const lines = chunk.split("\n").filter(Boolean);
      if (!lines.length) continue;
      const [sha, epoch] = lines[0].split(" ");
      const date = utcDay(Number(epoch));
      for (const line of lines.slice(1)) {
        if (!line.startsWith(":")) continue;
        const [meta, changedPath] = line.split("\t");
        if (changedPath !== file) continue;
        const fields = meta.split(" ");
        const oldBlob = fields[2];
        const newBlob = fields[3];
        changes.push({ sha, date, oldBlob: ZERO_SHA.test(oldBlob) ? null : oldBlob, newBlob: ZERO_SHA.test(newBlob) ? null : newBlob });
      }
    }
    this.logs.set(file, changes);
    return changes;
  }

  blob(sha: string): string {
    const cached = this.blobs.get(sha);
    if (cached !== undefined) return cached;
    const text = this.git(["cat-file", "blob", sha]);
    this.blobs.set(sha, text);
    return text;
  }

  subject(sha: string): string {
    const cached = this.subjects.get(sha);
    if (cached !== undefined) return cached;
    const text = this.git(["log", "-1", "--format=%s", sha]).trim();
    this.subjects.set(sha, text);
    return text;
  }

  /** The signature parts one source contributes at one blob. */
  partsFor(spec: SourceSpec, blobSha: string | null): string[] {
    if (blobSha === null) return [];
    if (spec.kind === "json") return jsonEntryParts(this.blob(blobSha), spec.path, spec.omit);
    if (spec.kind === "entry") {
      const key = `${blobSha}|entry|${spec.container}|${(spec.fields ?? []).join(",")}|${(spec.omit ?? []).join(",")}`;
      let map = this.parts.get(key) as Map<string, string> | undefined;
      if (!map) {
        map = signatureLib().entrySignatures(spec.file, this.blob(blobSha), spec.container, { fields: spec.fields, omit: spec.omit });
        this.parts.set(key, map);
      }
      const sig = map.get(spec.slug);
      return sig === undefined ? [] : [`entry:${sig}`];
    }
    const key = `${blobSha}|${spec.kind}|${spec.kind === "decls" ? spec.names.join(",") : ""}`;
    let list = this.parts.get(key) as string[] | undefined;
    if (!list) {
      list = signatureLib().statementSignatures(spec.file, this.blob(blobSha), spec.kind === "decls" ? spec.names : undefined);
      this.parts.set(key, list);
    }
    return list;
  }

  /** Readable content tokens one source contributes at one blob (evidence only; not cached). */
  tokensFor(spec: SourceSpec, blobSha: string | null): string[] {
    if (blobSha === null) return [];
    if (spec.kind === "json") return jsonEntryParts(this.blob(blobSha), spec.path, spec.omit);
    if (spec.kind === "entry") {
      return signatureLib().entryTokens(spec.file, this.blob(blobSha), spec.container, { fields: spec.fields, omit: spec.omit }).get(spec.slug) ?? [];
    }
    return signatureLib().statementTokens(spec.file, this.blob(blobSha), spec.kind === "decls" ? spec.names : undefined).flat();
  }

  /** Evidence for one change: the content tokens it removed and added. */
  evidenceFor(change: Change): string {
    const before = change.touched.flatMap((t) => this.tokensFor(t.spec, t.oldBlob));
    const after = change.touched.flatMap((t) => this.tokensFor(t.spec, t.newBlob));
    return evidence(before, after);
  }

  /** Every commit that changed the combined signature of `specs`, newest first. */
  changes(specs: SourceSpec[]): Change[] {
    const byCommit = new Map<string, { date: string; touched: Array<{ spec: SourceSpec; change: FileChange }> }>();
    for (const spec of specs) {
      for (const change of this.fileLog(spec.file)) {
        const entry = byCommit.get(change.sha) ?? { date: change.date, touched: [] };
        entry.touched.push({ spec, change });
        byCommit.set(change.sha, entry);
      }
    }
    const ordered = [...byCommit.entries()].sort(([a], [b]) => this.position(a) - this.position(b));
    const out: Change[] = [];
    for (const [sha, { date, touched }] of ordered) {
      const before = touched.flatMap(({ spec, change }) => this.partsFor(spec, change.oldBlob)).sort();
      const after = touched.flatMap(({ spec, change }) => this.partsFor(spec, change.newBlob)).sort();
      if (digest(before) !== digest(after)) {
        out.push({ sha, date, before, after, touched: touched.map(({ spec, change }) => ({ spec, oldBlob: change.oldBlob, newBlob: change.newBlob })) });
      }
    }
    return out;
  }
}

/**
 * A JSON dataset entry as signature parts: the value at `path`, keys sorted,
 * `omit` keys dropped at any depth (a retrieval day is not content). Empty
 * when the file does not parse or the entry is absent.
 */
export function jsonEntryParts(text: string, path: readonly string[], omit: readonly string[] = []): string[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return [];
  }
  for (const key of path) value = value !== null && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
  if (value === undefined) return [];
  const drop = new Set(omit);
  const canonical = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canonical);
    if (v !== null && typeof v === "object") {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .filter((k) => !drop.has(k))
          .sort()
          .map((k) => [k, canonical((v as Record<string, unknown>)[k])]),
      );
    }
    return v;
  };
  return [`json:${JSON.stringify(canonical(value))}`];
}

/** A unix timestamp's calendar day in UTC (YYYY-MM-DD): one clock for seed and publish. */
export function utcDay(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
}

function digest(parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0001")).digest("hex");
}

export type SeedChoice = { change: Change; fallback: boolean };

/**
 * A presentation-only sweep can mark ITSELF: a `Lastmod-Sweep: true` trailer
 * in the commit message. Unlike a SHA in seo/config.json it survives a
 * rebase, a cherry-pick and GitHub's rebase-merge (all of which rewrite the
 * SHA), so a sweep landed through a stacked PR is still skipped. Use it for
 * every new corpus-wide presentation change; the SHA list holds the older
 * sweeps that were already on main.
 */
export const SWEEP_TRAILER = "Lastmod-Sweep";
export function hasSweepTrailer(message: string): boolean {
  return message.split("\n").some((line) => /^Lastmod-Sweep:\s*true\s*$/i.test(line.trim()));
}

/** A sweepCommits entry: an abbreviated or full lowercase commit SHA. An empty prefix would skip every commit. */
export const SWEEP_SHA_RE = /^[0-9a-f]{7,40}$/;

/**
 * What is wrong with the sweepCommits list against HEAD's history (empty when
 * nothing is). A listed SHA that no reachable commit starts with skips
 * nothing, silently: the F-series lands on main rebased, so a sweep
 * registered under its branch SHA is exactly that case (F1 is 033d63c on its
 * branch). `landed` names the rebased copy when it can be found.
 */
export function sweepProblems(shas: readonly string[], reachable: readonly string[], landed: (sha: string) => string[] = () => []): string[] {
  const problems: string[] = [];
  for (const s of shas) {
    if (!SWEEP_SHA_RE.test(s)) {
      problems.push(`"${s}" is not a 7-40 character lowercase hex commit SHA`);
      continue;
    }
    const matches = reachable.filter((sha) => sha.startsWith(s));
    if (matches.length > 1) {
      problems.push(`${s} matches ${matches.length} commits in HEAD's history: list more characters`);
    } else if (matches.length === 0) {
      const copies = landed(s);
      problems.push(
        copies.length
          ? `${s} is not in HEAD's history; ${copies.map((c) => c.slice(0, 7)).join(", ")} has its author date and subject (the landed copy): list that SHA instead`
          : `${s} is not in HEAD's history: if it landed rebased or squashed, list the landed SHA instead`,
      );
    }
  }
  return problems;
}

/** Newest change not made by a skipped sweep; else the change that introduced the content. */
export function chooseChange(changes: Change[], isSkipped: (sha: string) => boolean): SeedChoice | null {
  if (!changes.length) return null;
  const kept = changes.find((c) => !isSkipped(c.sha));
  if (kept) return { change: kept, fallback: false };
  return { change: changes[changes.length - 1], fallback: true };
}

/**
 * Evidence masking: the report may be pasted into a public PR, and git
 * history still holds text the site no longer publishes. Runs of two or more
 * Capitalized words, #anchors and e-mail addresses are masked.
 */
export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]")
    .replace(/#[A-Za-z][\w-]*/g, "#…")
    .replace(/\b[A-Z][a-z]*(?:\s+[A-Z][a-z]*)+\b/g, "[Words]");
}

/** Content tokens a change removed and added (multiset difference), masked and shortened. */
export function evidence(before: string[], after: string[], max = 70, count = 4): string {
  const remaining = [...after];
  const removed: string[] = [];
  for (const token of before) {
    const i = remaining.indexOf(token);
    if (i === -1) removed.push(token);
    else remaining.splice(i, 1);
  }
  const added = remaining;
  if (!removed.length && !added.length) return "(token order only)";
  const show = (list: string[], sign: string): string[] =>
    list.slice(0, count).map((t) => {
      const masked = redact(t);
      return `${sign}"${masked.length > max ? `${masked.slice(0, max)}…` : masked}"`;
    });
  const extra = Math.max(0, removed.length - count) + Math.max(0, added.length - count);
  return [...show(removed, "-"), ...show(added, "+"), ...(extra ? [`(+${extra} more)`] : [])].join(" ");
}

// ------------------------------------------------------------------ seed

/** Corpus-wide sweeps ARCHITECTURE §4 names that are NOT on the skip list: they count only where they changed content, and every URL they date is reported. */
export const REPORTED_SWEEPS = ["6b4ddb2", "b0509fb", "f7183dd"];

type SeedRow = { path: string; date: string; sha: string; subject: string; fallback: boolean; clampedFrom: string | null; evidence: string | null };

function histogram(map: LastmodMap): { months: Array<[string, number]>; topDates: Array<[string, number]> } {
  const months = new Map<string, number>();
  const dates = new Map<string, number>();
  for (const date of Object.values(map)) {
    months.set(date.slice(0, 7), (months.get(date.slice(0, 7)) ?? 0) + 1);
    dates.set(date, (dates.get(date) ?? 0) + 1);
  }
  return {
    months: [...months.entries()].sort(([a], [b]) => (a < b ? -1 : 1)),
    topDates: [...dates.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 5),
  };
}

export function renderReport(rows: SeedRow[], map: LastmodMap, skip: readonly string[]): string {
  const { months, topDates } = histogram(map);
  const lines: string[] = [];
  lines.push(`# lastmod seed — ${rows.length} sitemap URLs`, "");
  lines.push(`Always-skipped sweeps (seo/config.json sweepCommits): ${skip.join(", ")}.`, "");
  lines.push("## URLs per month", "", "| Month | URLs |", "|---|---:|");
  for (const [month, count] of months) lines.push(`| ${month} | ${count} |`);
  lines.push("", "## Most-shared dates", "", "| Date | URLs |", "|---|---:|");
  for (const [date, count] of topDates) lines.push(`| ${date} | ${count} |`);
  const clamped = rows.filter((r) => r.clampedFrom !== null);
  lines.push("", `## Posts clamped up to publishedAt: ${clamped.length}`, "");
  for (const r of clamped) lines.push(`- ${r.path}: history ${r.clampedFrom} → ${r.date} (${r.sha.slice(0, 7)})`);
  const fallbacks = rows.filter((r) => r.fallback);
  lines.push("", `## Introduced by a skipped sweep and never changed since (introduction date used): ${fallbacks.length}`, "");
  for (const r of fallbacks) lines.push(`- ${r.path}: ${r.date} (${r.sha.slice(0, 7)} ${r.subject})`);
  const byCommit = new Map<string, SeedRow[]>();
  for (const r of rows) byCommit.set(r.sha, [...(byCommit.get(r.sha) ?? []), r]);
  lines.push("", "## Commits that date the most URLs", "", "| Commit | Date | URLs | Subject |", "|---|---|---:|---|");
  for (const [sha, list] of [...byCommit.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 12)) {
    lines.push(`| ${sha.slice(0, 7)} | ${list[0].date} | ${list.length} | ${list[0].subject.replace(/\|/g, "\\|").slice(0, 80)} |`);
  }
  const named = rows.filter((r) => REPORTED_SWEEPS.some((s) => r.sha.startsWith(s)));
  lines.push("", `## URLs dated by a named corpus-wide sweep (${REPORTED_SWEEPS.join(", ")}): ${named.length}`, "");
  lines.push("Each one changed that URL's content signature. Evidence: the content tokens the commit removed (-) and added (+); runs of Capitalized words, #anchors and e-mails are masked.", "");
  for (const r of named) lines.push(`- ${r.path} — ${r.sha.slice(0, 7)} ${r.date}: \`${(r.evidence ?? "").replace(/`/g, "'")}\``);
  return `${lines.join("\n")}\n`;
}

/**
 * seo/config.json sweepCommits checked against the history of the clone at
 * `root`, or null in a shallow clone (CI's unit job), where history cannot
 * answer. `seed` refuses to run on any problem; a test reports them locally.
 */
export function sweepHistoryProblems(root: string = REPO_ROOT, shas: readonly string[] = loadConfig().sweepCommits.shas): string[] | null {
  const history = new History(root);
  if (history.isShallow()) return null;
  return sweepProblems(shas, history.reachable(), (s) => history.landedCopies(s));
}

async function seed(args: Args): Promise<number> {
  await loadSignatures();
  const sitemapFile = flagString(args, "sitemap");
  const urls = sitemapFile ? parseSitemap(readFileSync(sitemapFile, "utf8")) : await fetchSitemap();
  if (!urls.length) throw new Error("the sitemap has no URLs");
  const config = loadConfig();
  const skip = config.sweepCommits.shas;
  // The SHA list, or a sweep that marks itself with the trailer.
  const isSkipped = (sha: string): boolean => skip.some((s) => sha.startsWith(s)) || history.sweepTrailer(sha);
  const exists = (file: string): boolean => existsSync(path.join(REPO_ROOT, file));
  const history = new History(REPO_ROOT);
  // Every date comes from history: a shallow clone would invent them, and a
  // listed sweep that is not in this history (a rebased landing) would skip
  // nothing and date its presentation-only changes as content.
  if (history.isShallow()) throw new Error("seed needs the full git history, and this clone is shallow (git fetch --unshallow)");
  const problems = sweepProblems(skip, history.reachable(), (s) => history.landedCopies(s));
  if (problems.length) throw new Error(`seo/config.json sweepCommits does not match this history; fix it before seeding:\n  ${problems.join("\n  ")}`);
  const published = signatureLib().entryStringField("lib/blog-posts.ts", readFileSync(path.join(REPO_ROOT, "lib", "blog-posts.ts"), "utf8"), "BLOG_POSTS", "publishedAt");

  const map: LastmodMap = {};
  const rows: SeedRow[] = [];
  for (const { path: urlPath } of urls) {
    const specs = sourcesFor(urlPath, exists);
    if (!specs) throw new Error(`no content sources known for ${urlPath}`);
    for (const spec of specs) if (!exists(spec.file)) throw new Error(`${urlPath}: source ${spec.file} does not exist`);
    const choice = chooseChange(history.changes(specs), isSkipped);
    if (!choice) throw new Error(`${urlPath}: no commit ever changed its content (is the entry's slug right?)`);
    let date = choice.change.date;
    let clampedFrom: string | null = null;
    const post = /^\/blog\/([^/]+)$/.exec(urlPath);
    const publishedAt = post ? published.get(post[1]) : undefined;
    if (publishedAt && date < publishedAt) {
      clampedFrom = date;
      date = publishedAt;
    }
    if (!DATE_RE.test(date)) throw new Error(`${urlPath}: bad commit date ${date}`);
    map[urlPath] = date;
    const named = REPORTED_SWEEPS.some((s) => choice.change.sha.startsWith(s));
    rows.push({
      path: urlPath,
      date,
      sha: choice.change.sha,
      subject: history.subject(choice.change.sha),
      fallback: choice.fallback,
      clampedFrom,
      evidence: named ? history.evidenceFor(choice.change) : null,
    });
  }
  writeJson(LASTMOD_FILE, sortMap(map));
  log(`lastmod seeded for ${rows.length} URL(s); ${rows.filter((r) => r.clampedFrom).length} post(s) clamped to publishedAt; ${rows.filter((r) => r.fallback).length} introduction fallback(s)`);
  const reportFile = flagString(args, "report");
  if (reportFile) {
    writeText(reportFile, renderReport(rows, map, skip));
    writeJson(`${reportFile}.json`, rows.map(({ evidence: ev, ...row }) => ({ ...row, sha: row.sha.slice(0, 12), evidence: ev })));
  }
  return 0;
}

async function bump(args: Args): Promise<number> {
  const planFile = requireFlag(args, "plan", "publish-plan.json");
  if (!existsSync(LASTMOD_FILE)) {
    log("content/seo/lastmod.json does not exist yet (F2) — lastmod bump skipped.");
    return 0;
  }
  const plan = readJson<{ urls?: string[]; lastmodUrls?: string[] }>(planFile);
  const urls = bumpUrls(plan);
  const date = flagString(args, "date", today());
  const map = readJson<LastmodMap>(LASTMOD_FILE);
  writeJson(LASTMOD_FILE, bumpMap(map, urls, date));
  log(`lastmod bumped for ${urls.length} URL(s) to ${date}`);
  return 0;
}

async function main(args: Args): Promise<number> {
  const command = args.positionals[0];
  if (command === "bump") return bump(args);
  if (command === "seed") return seed(args);
  console.error("usage: lastmod.ts bump --plan <publish-plan.json> [--date YYYY-MM-DD] | seed [--sitemap <sitemap.xml>] [--report <report.md>]");
  return 2;
}

function significant(before: string, after: string, file = "app/blog/x/page.tsx"): boolean {
  return digest(signatureLib().statementSignatures(file, before)) !== digest(signatureLib().statementSignatures(file, after));
}

async function selfTest(): Promise<void> {
  await loadSignatures();
  const next = bumpMap({ "/blog/a": "2026-06-01", "/blog/z": "2026-10-09" }, ["/blog/a", "/blog/z", "/blog/new"], "2026-10-05");
  check(next["/blog/a"] === "2026-10-05", "bumps an older date");
  check(next["/blog/z"] === "2026-10-09", "never moves a date backwards");
  check(next["/blog/new"] === "2026-10-05", "adds a new URL");
  check(Object.keys(next).join() === "/blog/a,/blog/new,/blog/z", "sorted keys");
  let threw = false;
  try {
    bumpMap({}, ["https://usetruecap.com/x"], "2026-10-05");
  } catch {
    threw = true;
  }
  check(threw, "rejects full URLs");
  check(bumpUrls({ urls: ["/blog/a", "/blog/b"], lastmodUrls: ["/blog/a"] }).join() === "/blog/a", "an OG-only page keeps its date");

  // Content signature: what counts as a significant change.
  const page = (body: string, extra = ""): string =>
    `import Link from "next/link";\n${extra}const PUBLISHED_AT = "2026-06-01";\nconst MODIFIED_AT = "2026-06-01";\nexport default function P() {\n  return (\n    <main className="mx-auto max-w-3xl">\n      ${body}\n    </main>\n  );\n}\n`;
  const base = page(`<p className="text-sm">Cap rate is NOI divided by price.</p>`);
  check(!significant(base, page(`<p className="text-base font-bold">Cap rate is NOI divided by price.</p>`)), "a className-only change is not significant");
  check(significant(base, page(`<p className="text-sm">Cap rate is NOI divided by value.</p>`)), "a text change is significant");
  check(!significant(base, base.replace('const MODIFIED_AT = "2026-06-01"', 'const MODIFIED_AT = "2026-09-27"')), "a date-const change is not significant");
  check(!significant(base, base.replace('const MODIFIED_AT = "2026-06-01"', 'const MODIFIED_AT = lastmodFor("/blog/x") ?? PUBLISHED_AT')), "wiring MODIFIED_AT to the map is not significant");
  check(!significant(base, page(`<p className="text-sm">Cap rate is NOI divided by price.</p>`, 'import { lastmodFor } from "@/lib/seo/lastmod";\n')), "an import line is not significant");
  check(!significant(base, page(`<p className="text-sm">\n        Cap rate is NOI\n        divided by price.\n      </p>`)), "a whitespace reflow is not significant");
  check(significant(base, page(`<p className="text-sm">Cap rate is NOI divided by price.</p><Link href="/glossary/noi">NOI</Link>`)), "a new link is significant");
  check(!significant(base, page(`<p className={cn("text-sm", "px-2")}>Cap rate is NOI divided by price.</p>`)), "class helpers are not content");
  check(
    !significant(base, page(`<p className="text-sm">Cap rate is NOI divided by price.</p><RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />`)),
    "mounting a widget with configuration props only (RelatedContent kind) is not content",
  );
  check(significant(base, page(`<p className="text-sm">Cap rate is NOI divided by price.</p><RelatedContent kind="blog" slug={SLUG} heading="Read next" />`)), "a widget's visible text prop is content");
  check(
    !significant(page(`<p>Restored for property placed in service after January 19, 2025. That is new.</p>`), page(`<p>Restored for property placed in service after January\n        19, 2025. That is new.</p>`)),
    "a reflow that splits a written date across lines is whitespace",
  );
  const card = (label: string): string => page(`<p>{post.modifiedAt ? "${label}" : ""}{new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short" })}</p>`);
  check(!significant(card("Updated "), card("Revised ")), "text that only labels a date is not significant");
  const footer = (text: string): string => page(`<footer>${text}</footer>`);
  check(!significant(footer("Last updated: August 27, 2026. We review it monthly."), footer("Last updated: September 6, 2026. We review it monthly.")), "a date written into text is not significant");
  check(
    !significant(footer("Last updated: August 27, 2026. We review it monthly."), footer("{UPDATED_LABEL ? <>Last updated: {UPDATED_LABEL}. </> : null}We review it monthly.")),
    "rendering a hand-typed date from the map is not significant",
  );
  const hub = (body: string): string => page(`<p>{x}</p>`, `function postDate(post) { return ${body}; }\n`);
  check(!significant(hub("post.publishedAt"), hub("lastmodOrPublished(`/blog/${post.slug}`, post.publishedAt)")), "a lastmod-map lookup is a date, not content");
  const ld = (headline: string, modified: string): string => page(`<p>x</p>`, `const LD = { "@type": "Article", headline: "${headline}", dateModified: "${modified}" };\n`);
  check(!significant(ld("A", "2026-06-01"), ld("A", "2026-09-27")), "a JSON-LD dateModified change is not significant");
  check(significant(ld("A", "2026-06-01"), ld("B", "2026-06-01")), "a JSON-LD headline change is significant");
  const meta = (canonical: string, title: string): string => `export const metadata = { title: "${title}", alternates: { canonical: "${canonical}" }, openGraph: { images: ["/a.jpg"] } };\n`;
  check(!significant(meta("/a", "T"), meta("/b", "T")), "canonical/openGraph metadata is not main content");
  check(significant(meta("/a", "T"), meta("/a", "U")), "a title change is significant");

  // Moving a declaration between files (the F2 registry lift) is not a change.
  const registry = `export const BLOG_POSTS = [{ slug: "a", title: "A", publishedAt: "2026-06-01", modifiedAt: "2026-07-01", available: true }];\n`;
  const withRegistry = [...signatureLib().statementSignatures("app/blog/page.tsx", `${registry}export default function B() { return <h1>Blog</h1>; }\n`)].sort();
  const lifted = [
    ...signatureLib().statementSignatures("app/blog/page.tsx", `import { BLOG_POSTS } from "@/lib/blog-posts";\nexport default function B() { return <h1>Blog</h1>; }\n`),
    ...signatureLib().statementSignatures("lib/blog-posts.ts", registry.replace(', modifiedAt: "2026-07-01"', "")),
  ].sort();
  check(digest(withRegistry) === digest(lifted), "lifting a declaration into another file keeps the signature");

  // Entries: located by slug, only the rendered fields count.
  const data = (blurb: string, name: string): string =>
    `export const MARKET_CITIES = [{ slug: "erie", name: "${name}", blurb: "${blurb}" }, { slug: "york", name: "York", blurb: "b" }];\n`;
  const erie = (src: string): string | undefined => signatureLib().entrySignatures("lib/markets/cities.ts", src, "MARKET_CITIES", { fields: ["slug", "name"] }).get("erie");
  check(erie(data("one", "Erie")) === erie(data("two", "Erie")), "an unrendered field is not significant");
  check(erie(data("one", "Erie")) !== erie(data("one", "Erie, PA")), "a rendered field is significant");
  const rents = (year: number, rent: number): string => `export const HUD_RENTS = { "erie": { "rent2br": ${rent}, "year": ${year} } };\n`;
  const hud = (src: string): string | undefined => signatureLib().entrySignatures("lib/markets/hud-rents.ts", src, "HUD_RENTS", { omit: ["year"] }).get("erie");
  check(hud(rents(2025, 900)) === hud(rents(2026, 900)), "a HUD vintage change alone is not lastmod");
  check(hud(rents(2026, 900)) !== hud(rents(2026, 950)), "a HUD rent change is");

  // Only the named declarations (and what they use) of a shared components file count.
  const sections = (faq: string, other: string): string =>
    `const Q = "${faq}";\nexport function HomepageFaq() { return <p>{Q}</p>; }\nexport function Personas() { return <p>${other}</p>; }\n`;
  const faqOnly = (src: string): string => digest(signatureLib().statementSignatures(LANDING_SECTIONS, src, ["HomepageFaq"]));
  check(faqOnly(sections("q1", "x")) === faqOnly(sections("q1", "y")), "an unrendered section is not significant");
  check(faqOnly(sections("q1", "x")) !== faqOnly(sections("q2", "x")), "a const a rendered section uses is significant");

  // Choosing the commit: newest non-skipped change; the introduction when every change was a sweep.
  const ch = (sha: string, date: string): Change => ({ sha, date, before: [], after: [], touched: [] });
  const skipped = (sha: string): boolean => sha.startsWith("b9ebd44");
  check(chooseChange([ch("b9ebd44aa", "2026-09-25"), ch("1234567", "2026-08-01")], skipped)?.change.date === "2026-08-01", "skips a listed sweep");
  const only = chooseChange([ch("b9ebd44aa", "2026-09-25")], skipped);
  check(only?.change.date === "2026-09-25" && only.fallback, "falls back to the introducing commit, never today");
  check(chooseChange([], skipped) === null, "no history, no date");

  // The sweep list must name commits in this history, or it skips nothing.
  const reach = ["b9ebd44aa0c1", "033d63c3c47a", "af6211a5d2e0"];
  check(sweepProblems(["b9ebd44", "033d63c"], reach).length === 0, "listed sweeps in HEAD's history pass");
  check(sweepProblems(["185be48"], reach).length === 1, "a sweep missing from history is an error, not a silent no-op");
  const rebased = sweepProblems(["185be48"], reach, (s) => (s === "185be48" ? ["af6211a5d2e0"] : []));
  check(rebased.length === 1 && rebased[0].includes("af6211a"), "a rebased sweep names its landed copy");
  check(sweepProblems(["af6211"], reach).length === 1, "an entry shorter than 7 characters is an error");
  check(sweepProblems(["af6211a", "af6211"], ["af6211a1", "af6211a2"]).length === 2, "an ambiguous or short entry is an error");
  check(sweepProblems([""], reach).length === 1, "an empty entry (it would skip every commit) is an error");
  check(hasSweepTrailer("feat: x\n\nbody\n\nLastmod-Sweep: true\nCo-Authored-By: a <b@c>"), "a trailer marks a sweep");
  // 2026-09-28T01:50:00Z, which a US-zone committer's %cs reads as the 27th.
  check(utcDay(1790560200) === "2026-09-28", "commit days are read in UTC");
  const facts = (v: number, day: string) => JSON.stringify({ states: { ohio: { tax: { value: v, source: { url: "https://x.gov", retrievedAt: day } } } } });
  check(jsonEntryParts(facts(1, "2026-09-01"), ["states", "ohio"], ["retrievedAt"]).join() === jsonEntryParts(facts(1, "2026-09-27"), ["states", "ohio"], ["retrievedAt"]).join(), "a re-fetch day alone is not content");
  check(jsonEntryParts(facts(1, "2026-09-01"), ["states", "ohio"], ["retrievedAt"]).join() !== jsonEntryParts(facts(2, "2026-09-01"), ["states", "ohio"], ["retrievedAt"]).join(), "a changed value is content");
  check(jsonEntryParts(facts(1, "x"), ["states", "iowa"]).length === 0 && jsonEntryParts("{", ["states"]).length === 0, "absent entry or bad JSON contributes nothing");
  check(!hasSweepTrailer("feat: x\n\nLastmod-Sweep: false") && !hasSweepTrailer("feat: x mentions Lastmod-Sweep: true inline"), "only an exact trailer line counts");
  check(sweepProblems(["B9EBD44"], reach).length === 1, "an uppercase entry (it never matches git's lowercase SHAs) is an error");
  for (const s of loadConfig().sweepCommits.shas) check(SWEEP_SHA_RE.test(s), `seo/config.json sweepCommits entry "${s}" is a 7-40 character lowercase hex SHA`);

  // Sources.
  const none = (): boolean => false;
  check(sourcesFor("/glossary/cap-rate", none)?.[0].kind === "entry", "glossary terms are data entries");
  check(sourcesFor("/markets/erie", none)?.length === 5, "a market is its city, HUD, FMR-area, SAFMR and market-facts entries");
  check(sourcesFor("/states/ohio", none)?.some((x) => x.file === "content/seo/state-facts.json") === true, "a state page includes its sourced facts");
  check(sourcesFor("/markets/dallas", (f) => f === "app/markets/dallas/page.tsx")?.[0].file === "app/markets/dallas/page.tsx", "a bespoke metro is its page plus its HUD entries");
  check(sourcesFor("/blog", none)?.some((s) => s.file === "lib/blog-posts.ts") === true, "/blog includes its registry");
  check(sourcesFor("/about", none)?.some((s) => s.file === "lib/author.ts") === true, "/about includes the author bio it renders");
  check(sourcesFor("/blog/x", (f) => f === "app/blog/x/page.tsx")?.length === 1, "a post is its own page.tsx: the bio it ends with is boilerplate");
  // `bump` must move what a re-seed would: a loop-editable source of a core page makes verify-static declare that page.
  const agentAllow = loadConfig().paths.agentAllow;
  for (const [url, specs] of Object.entries(CORE_SOURCES)) {
    for (const spec of specs) {
      if (matchesAny(agentAllow, spec.file)) check(derivedPagesForFile(spec.file).includes(url), `${spec.file} is loop-editable, so an edit to it must declare ${url} (lib/family.ts derivedPagesForFile)`);
    }
  }
  check(sourcesFor("/nope", none) === null, "unknown URL");
  check(evidence(["/tools", "keep"], ["keep", "/analyze"]) === '-"/tools" +"/analyze"', "evidence lists removed and added tokens");
  check(redact("By Jane Q Doe, see /about#jane or jane@example.com") === "[Words], see /about#… or [email]", "evidence masks names, anchors and e-mails");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["date", "plan", "sitemap", "report"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
