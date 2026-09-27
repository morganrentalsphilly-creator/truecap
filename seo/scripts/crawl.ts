/**
 * crawl.ts — the rendered-page census of every sitemap URL, written to
 * seo/data/crawl-<date>.json (the `Crawl` contract in lib/types.ts).
 *
 * Every downstream decision reads this file: score.ts routes THIN/ORPHAN work
 * from it, brakes.ts reverts a live change when its page regresses here
 * (non-200, noindex, canonical, lost schema, new broken links), similarity.ts
 * builds its corpus from the main-text files it writes, and gsc-inspect.ts
 * re-inspects a URL when its mainHash moves. So a wrong value here is not a
 * cosmetic report error; it is a revert or a rewrite.
 *
 * TWO PASSES, on purpose:
 *   1. scripts/seo/healthcheck.mjs owns the link graph (a BFS from `/` that
 *      models Googlebot: robots-disallowed prefixes skipped, a fetch budget,
 *      orphan results suppressed on a partial crawl) and the ops tripwires.
 *      It is run as a child process, never re-implemented, so the weekly
 *      healthcheck and the loop cannot disagree about what an orphan is. It
 *      exits 1 whenever it has findings; that is data, not a crawl failure,
 *      so its --json report is read regardless of the exit code.
 *   2. This script fetches every sitemap URL itself (redirect: "manual", so a
 *      3xx is recorded as the defect it is rather than followed) and extracts
 *      the per-page fields with lib/html.ts.
 *
 * Load-bearing constraints:
 *   - --base is fenced to the configured production host or a loopback host.
 *     The crawl never points at another host (a preview, or the foreign
 *     deployment the healthcheck nags about) and then passes as production.
 *   - A transient failure must not read as a regression, because brakes.ts
 *     reverts on non-200. Each fetch gets one retry on a network error, 5xx
 *     or 429; and when more than half of the pages fail that way the site is
 *     down, so the run throws instead of writing a crawl of mass "regressions".
 *   - Null means unknown, never a violation (lib/html.ts). A page that did not
 *     answer 200 is not judged thin, and gets nulls when merged into
 *     index-status. `mainHash` is "" when there was no page to hash.
 *   - Merging into index-status.json writes wordCount, uniqueRatio, thin and a
 *     local `mainHash` (+ `crawledAt`). It never touches `mainHashAtInspect`:
 *     gsc-inspect owns it, and comparing the two is its re-inspect trigger. A
 *     loopback run does not merge, because a local build is not what Google
 *     crawled. writeCrawlArtifacts derives that from the crawl itself, so no
 *     caller can merge a crawl that must not be merged.
 *   - A --limit sample never becomes run state. It is not merged into
 *     index-status, and it is written as crawl-sample-<date>.json with its text
 *     under pages-sample/, names latestDataFile("crawl") and the corpus
 *     similarity.ts reads cannot pick up. It gets no uniqueRatio either: the
 *     "common" cutoff scales with family size, so 5 pages of a 10-page family
 *     halve it and turn a paragraph two siblings share into chrome (in the
 *     regression test, a 700-word page measures 1 against its 10-page family
 *     and 0.14, so thin, against a 5-page sample). A sampled page is judged
 *     thin on word count alone.
 *
 * Field semantics that the type leaves open:
 *   - `finalUrl` is the resolved Location of a 3xx, or null when the URL
 *     answered without redirecting.
 *   - `canonicalIsSelf` is true when the canonical resolves to this page's path
 *     on the production host (or the crawled host); null when there is none.
 *   - `outboundInternal` / `outboundExternal` count distinct link targets in the
 *     page's main content (the region `mainText` covers), so the header and
 *     footer every page shares cannot hide a page that cites nothing.
 *   - `inboundContextual` / `inboundTotal` count distinct linking pages from the
 *     healthcheck edges (self-links excluded); both read 0 when the link graph
 *     did not run, and `depth` is then null.
 *   - Broken internal links: every edge target that is not 200. Sitemap targets
 *     use this crawl's status; other targets get one HEAD (GET when HEAD is not
 *     allowed), capped, most-linked first. Targets robots.txt disallows are not
 *     checked, matching the healthcheck, which never crawls them either. A
 *     target that gave no HTTP answer after the retry is listed with status
 *     null.
 *
 * Thin flag (`uniqueRatios`, and similarity.ts mirrors these semantics): within
 * each TEMPLATE_FAMILIES family of at least 5 pages that answered 200, text is
 * tokenised to lowercase runs of letters/digits (internal apostrophes kept) and
 * cut into 5-word shingles. A shingle is template chrome when it appears in
 * more than `templateCommonShare` of the family's pages. uniqueRatio =
 * distinct non-chrome shingles / distinct shingles. thin = wordCount below
 * prune.minWords, or uniqueRatio below prune.minUniqueRatio. Smaller or
 * non-template families get uniqueRatio null and are judged on word count only.
 *
 * Usage:
 *   node seo/scripts/crawl.ts                           # production, full crawl
 *   node seo/scripts/crawl.ts --limit 20                # quick sample → crawl-sample-<date>.json; no link graph, no merge
 *   node seo/scripts/crawl.ts --base http://localhost:3000 --skip-healthcheck
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Args } from "./lib/cli.ts";
import { check, flagNumber, flagString, hasFlag, log, runMain } from "./lib/cli.ts";
import { loadConfig } from "./lib/config.ts";
import type { SeoConfig } from "./lib/config.ts";
import { TEMPLATE_FAMILIES, familyOf } from "./lib/family.ts";
import type { Family } from "./lib/family.ts";
import { decodeEntities, extractLinks, extractPage, mainHtml } from "./lib/html.ts";
import { readJsonIfExists, writeJson, writeText } from "./lib/io.ts";
import { REPO_ROOT, dataDir, datedDataPath, repoRelative, statePaths, today } from "./lib/paths.ts";
import { fetchSitemap, toPath } from "./lib/sitemap.ts";
import type { SitemapUrl } from "./lib/sitemap.ts";
import type { Crawl, CrawlPage, IndexStatus } from "./lib/types.ts";

// Crawl mechanics fixed by the toolkit spec. They are not tuning thresholds,
// so they live here rather than in seo/config.json.
const CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 20_000;
const FETCH_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_500;
const LINK_CHECK_CAP = 300;
const SHINGLE_WORDS = 5;
const MIN_TEMPLATE_FAMILY_PAGES = 5;
/** The healthcheck walks up to 1,200 pages at concurrency 6; this only stops a hang. */
const HEALTHCHECK_TIMEOUT_MS = 30 * 60_000;
/** Site-down guard: this share of failed pages, over at least this many, aborts the run. */
const SITE_DOWN_SHARE = 0.5;
const SITE_DOWN_MIN_PAGES = 10;

/** A --limit sample's names: never `crawl` or `pages`, which later stages read as the site's state. */
const SAMPLE_CRAWL_PREFIX = "crawl-sample";
const SAMPLE_TEXT_DIR = "pages-sample";

const HEALTHCHECK_SCRIPT = path.join(REPO_ROOT, "scripts", "seo", "healthcheck.mjs");
const LOOPBACK_HOSTS = new Set(["localhost", "[::1]", "::1"]);

// ------------------------------------------------------------------- types

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

/** One HTTP answer. `status` is 0 when there was no answer; `error` then says why. */
export type FetchedPage = { status: number; location: string | null; xRobotsTag: string | null; body: string; error: string | null };

/**
 * CrawlPage plus local extensions (reported for lib/types.ts):
 *   fetchError    — why a page has status 0 (network error or timeout)
 *   xRobotsTag    — the header `noindex` also reads, kept for diagnosis
 *   externalHosts — distinct hosts linked from the main content, so score.ts
 *                   can test NEEDS_CITATIONS against primarySourceDomains
 */
export type CrawlPageRecord = CrawlPage & { fetchError: string | null; xRobotsTag: string | null; externalHosts: string[] };

export type LinkCheckSummary = {
  targets: number;
  fromCrawl: number;
  checked: number;
  skippedRobotsDisallowed: number;
  skippedOverCap: number;
  cap: number;
};

/** The written artifact: `Crawl` with the page extensions and two local fields. */
export type CrawlOutput = Omit<Crawl, "pages"> & {
  pages: CrawlPageRecord[];
  /** Local extension: the --limit sample size, or null for a full crawl. */
  limit: number | null;
  /** Local extension: how the broken-link check was spent. */
  linkCheck: LinkCheckSummary;
};

export type HealthcheckEdge = Crawl["linkGraph"]["edges"][number];

/** What this script needs from the healthcheck's --json report. */
export type HealthcheckPass = {
  ran: boolean;
  reason: string | null;
  edges: HealthcheckEdge[];
  orphans: string[];
  depth: Record<string, number | null>;
  findings: Crawl["healthcheckFindings"];
};

export type HealthcheckRun = { json: unknown; exitCode: number | null; error: string | null };

export type CrawlOptions = { base: string; limit: number | null; skipHealthcheck: boolean };

export type CrawlDeps = {
  fetchImpl: FetchFn;
  fetchSitemap: (base: string) => Promise<SitemapUrl[]>;
  runHealthcheck: (base: string, limit: number | null) => HealthcheckRun;
  retryDelayMs: number;
  now: () => Date;
};

export type CrawlResult = { crawl: CrawlOutput; texts: Map<string, string> };

// ------------------------------------------------------------ base fencing

function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host) || /^127(?:\.\d{1,3}){3}$/.test(host);
}

export function isLoopbackBase(base: string): boolean {
  try {
    return isLoopbackHost(new URL(base).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * The only hosts the crawl may fetch: the configured production host (on its
 * own scheme and port) or loopback. Returns the bare origin.
 */
export function assertAllowedBase(raw: string, productionBase: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`--base must be an absolute URL, got "${raw}"`);
  }
  if (url.username || url.password) throw new Error("--base must not carry credentials");
  if ((url.pathname !== "/" && url.pathname !== "") || url.search || url.hash) {
    throw new Error(`--base must be a bare origin (no path, query or fragment), got "${raw}"`);
  }
  const production = new URL(productionBase);
  const host = url.hostname.toLowerCase();
  if (host === production.hostname.toLowerCase()) {
    if (url.protocol !== production.protocol || url.port !== production.port) {
      throw new Error(`--base for ${host} must be exactly ${production.origin}`);
    }
    return url.origin;
  }
  if (isLoopbackHost(host) && (url.protocol === "http:" || url.protocol === "https:")) return url.origin;
  throw new Error(`refusing to crawl ${host}: --base must be ${production.hostname} or a loopback host`);
}

// --------------------------------------------------------------- shingles

/** Lowercase runs of letters/digits; internal apostrophes are kept ("don't"). */
export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/’/g, "'").match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? [];
}

/** Distinct `size`-word shingles (consecutive tokens joined by one space). */
export function shingles(text: string, size: number = SHINGLE_WORDS): Set<string> {
  const words = tokenize(text);
  const out = new Set<string>();
  for (let i = 0; i + size <= words.length; i += 1) out.add(words.slice(i, i + size).join(" "));
  return out;
}

export type FamilyPages = Map<Family, Array<{ path: string; text: string }>> | Partial<Record<Family, Array<{ path: string; text: string }>>>;

/**
 * path → uniqueRatio (rounded to 4 places), or null when the page's family is
 * not a template family or has fewer than `minFamilyPages` pages. A page with
 * no shingles at all has nothing unique: 0.
 */
export function uniqueRatios(
  pagesByFamily: FamilyPages,
  options: { commonShare?: number; minFamilyPages?: number } = {},
): Map<string, number | null> {
  const share = options.commonShare ?? loadConfig().thresholds.similarity.templateCommonShare;
  const minPages = options.minFamilyPages ?? MIN_TEMPLATE_FAMILY_PAGES;
  const entries = (pagesByFamily instanceof Map ? [...pagesByFamily] : Object.entries(pagesByFamily)) as Array<
    [Family, Array<{ path: string; text: string }> | undefined]
  >;
  const out = new Map<string, number | null>();
  for (const [family, list] of entries) {
    const pages = list ?? [];
    if (!TEMPLATE_FAMILIES.includes(family) || pages.length < minPages) {
      for (const page of pages) out.set(page.path, null);
      continue;
    }
    const sets = pages.map((page) => shingles(page.text));
    const documentFrequency = new Map<string, number>();
    for (const set of sets) for (const shingle of set) documentFrequency.set(shingle, (documentFrequency.get(shingle) ?? 0) + 1);
    const commonAbove = share * pages.length;
    pages.forEach((page, i) => {
      const set = sets[i];
      if (set.size === 0) {
        out.set(page.path, 0);
        return;
      }
      let unique = 0;
      for (const shingle of set) if ((documentFrequency.get(shingle) ?? 0) <= commonAbove) unique += 1;
      out.set(page.path, Math.round((unique / set.size) * 10_000) / 10_000);
    });
  }
  return out;
}

export function thinFlag(wordCount: number, uniqueRatio: number | null, prune: SeoConfig["thresholds"]["prune"]): boolean {
  return wordCount < prune.minWords || (uniqueRatio !== null && uniqueRatio < prune.minUniqueRatio);
}

// ------------------------------------------------------------ duplicates

const normalizeForDupes = (value: string): string => value.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Values shared by two or more paths, compared after trim + whitespace
 * collapse + lowercase. Each group keeps the first spelling seen. Largest
 * groups first, then alphabetical; paths sorted.
 */
export function findDuplicates(items: Array<{ path: string; value: string | null }>): Array<{ value: string; paths: string[] }> {
  const groups = new Map<string, { value: string; paths: Set<string> }>();
  for (const item of items) {
    if (item.value === null) continue;
    const key = normalizeForDupes(item.value);
    if (!key) continue;
    const group = groups.get(key) ?? { value: item.value.trim().replace(/\s+/g, " "), paths: new Set<string>() };
    group.paths.add(item.path);
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((group) => group.paths.size > 1)
    .map((group) => ({ value: group.value, paths: [...group.paths].sort() }))
    .sort((a, b) => b.paths.length - a.paths.length || a.value.localeCompare(b.value));
}

// ------------------------------------------------------------ healthcheck

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const stringsOf = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

/**
 * Read the healthcheck's --json report defensively. Its edges carry `source`
 * (an extended healthcheck may say `from`); the Crawl contract says `from`.
 * Orphans and depth only count when the link graph ran to completion.
 */
export function normalizeHealthcheck(raw: unknown): HealthcheckPass {
  const root = isRecord(raw) ? raw : {};
  const graph = isRecord(root.linkGraph) ? root.linkGraph : {};
  const edges: HealthcheckEdge[] = [];
  for (const edge of Array.isArray(graph.edges) ? graph.edges : []) {
    if (!isRecord(edge)) continue;
    const from = typeof edge.from === "string" ? edge.from : typeof edge.source === "string" ? edge.source : null;
    if (from === null || typeof edge.target !== "string") continue;
    edges.push({
      from,
      target: edge.target,
      anchor: typeof edge.anchor === "string" ? edge.anchor : "",
      placement: typeof edge.placement === "string" ? edge.placement : "unknown",
    });
  }
  edges.sort((a, b) => a.from.localeCompare(b.from) || a.target.localeCompare(b.target) || a.placement.localeCompare(b.placement) || a.anchor.localeCompare(b.anchor));
  const ran = graph.ran === true;
  const depth: Record<string, number | null> = {};
  if (ran && isRecord(graph.depth)) {
    for (const [key, value] of Object.entries(graph.depth)) depth[key] = typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  const findings: Crawl["healthcheckFindings"] = [];
  for (const finding of Array.isArray(root.findings) ? root.findings : []) {
    if (!isRecord(finding) || typeof finding.check !== "string") continue;
    const out: Crawl["healthcheckFindings"][number] = { severity: typeof finding.severity === "string" ? finding.severity : "info", check: finding.check };
    if (typeof finding.detail === "string") out.detail = finding.detail;
    if (typeof finding.path === "string") out.path = finding.path;
    findings.push(out);
  }
  return {
    ran,
    reason: ran ? null : typeof graph.reason === "string" && graph.reason ? graph.reason : "the healthcheck report has no completed link graph",
    edges,
    orphans: ran ? stringsOf(graph.orphans).sort() : [],
    depth,
    findings,
  };
}

function healthcheckNotRun(reason: string, findings: Crawl["healthcheckFindings"] = []): HealthcheckPass {
  return { ran: false, reason, edges: [], orphans: [], depth: {}, findings };
}

/** Environment for the child: nothing that looks like a credential. It needs none. */
export function scrubbedEnv(env: Record<string, string | undefined> = process.env): NodeJS.ProcessEnv {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    if (/SECRET|TOKEN|KEY|PASSWORD|PASSWD|CREDENTIAL|SERVICE_ACCOUNT|PRIVATE|AUTH/i.test(key)) continue;
    out[key] = value;
  }
  // A plain record: the root tsconfig's Next typings make NODE_ENV a required key.
  return out as NodeJS.ProcessEnv;
}

/** Run healthcheck.mjs with --json into a temp dir. Exit 1 with a report is success. */
export function runHealthcheckProcess(base: string, limit: number | null, script: string = HEALTHCHECK_SCRIPT): HealthcheckRun {
  const dir = mkdtempSync(path.join(os.tmpdir(), "seo-crawl-"));
  const jsonFile = path.join(dir, "healthcheck.json");
  const argv = [script, "--json", jsonFile, "--base", base];
  if (limit) argv.push("--limit", String(limit));
  let exitCode: number | null = 0;
  let failure: string | null = null;
  try {
    execFileSync(process.execPath, argv, {
      cwd: REPO_ROOT,
      env: scrubbedEnv(),
      stdio: ["ignore", "ignore", "inherit"],
      timeout: HEALTHCHECK_TIMEOUT_MS,
    });
  } catch (error) {
    const detail = error as { status?: number | null; signal?: string | null };
    exitCode = typeof detail.status === "number" ? detail.status : null;
    failure = exitCode === null ? `healthcheck was killed (${detail.signal ?? "no exit code"})` : `healthcheck exited ${exitCode}`;
  }
  try {
    if (!existsSync(jsonFile)) return { json: null, exitCode, error: `${failure ?? "healthcheck exited 0"} without writing its --json report` };
    return { json: JSON.parse(readFileSync(jsonFile, "utf8")) as unknown, exitCode, error: null };
  } catch (error) {
    return { json: null, exitCode, error: `healthcheck --json report is unreadable: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- fetching

function describeFetchError(error: unknown): string {
  const name = error && typeof error === "object" ? (error as { name?: unknown }).name : null;
  if (name === "TimeoutError" || name === "AbortError") return `no answer within ${FETCH_TIMEOUT_MS / 1000}s`;
  if (error instanceof Error) {
    const cause = (error as { cause?: { code?: unknown } }).cause;
    return typeof cause?.code === "string" ? `${error.message} (${cause.code})` : error.message;
  }
  return String(error);
}

const isRetryable = (page: FetchedPage): boolean => page.status === 0 || page.status === 429 || page.status >= 500;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOnce(url: string, userAgent: string, fetchImpl: FetchFn, method: "GET" | "HEAD"): Promise<FetchedPage> {
  try {
    const response = await fetchImpl(url, {
      method,
      redirect: "manual",
      headers: { "user-agent": userAgent },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const location = response.headers.get("location");
    let body = "";
    if (method === "GET" && response.status === 200) {
      body = await response.text();
    } else {
      try {
        await response.body?.cancel();
      } catch {
        /* the socket is released either way */
      }
    }
    let resolvedLocation: string | null = null;
    if (location) {
      try {
        resolvedLocation = new URL(location, url).href;
      } catch {
        resolvedLocation = location;
      }
    }
    return { status: response.status, location: resolvedLocation, xRobotsTag: response.headers.get("x-robots-tag"), body, error: null };
  } catch (error) {
    return { status: 0, location: null, xRobotsTag: null, body: "", error: describeFetchError(error) };
  }
}

/** One request, retried once on a network error, 5xx or 429. Never throws. */
export async function fetchPage(url: string, userAgent: string, fetchImpl: FetchFn, options: { method?: "GET" | "HEAD"; retryDelayMs?: number } = {}): Promise<FetchedPage> {
  const method = options.method ?? "GET";
  let result = await fetchOnce(url, userAgent, fetchImpl, method);
  for (let attempt = 2; attempt <= FETCH_ATTEMPTS && isRetryable(result); attempt += 1) {
    await sleep(options.retryDelayMs ?? RETRY_DELAY_MS);
    result = await fetchOnce(url, userAgent, fetchImpl, method);
  }
  return result;
}

export async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

// ------------------------------------------------------------ page fields

/** Main content minus the chrome mainTextOf also drops, for link counting. */
function contentHtmlOf(html: string): string {
  let out = mainHtml(html);
  for (const tag of ["script", "style", "nav", "header", "footer", "noscript", "template", "svg"]) {
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  }
  return out;
}

/** True when the canonical resolves to `pagePath` on one of `hosts`; null when absent. */
export function canonicalIsSelf(canonical: string | null, pagePath: string, pageUrl: string, hosts: ReadonlySet<string>): boolean | null {
  if (!canonical || !canonical.trim()) return null;
  let resolved: URL;
  try {
    resolved = new URL(decodeEntities(canonical.trim()), pageUrl);
  } catch {
    return false;
  }
  return hosts.has(resolved.hostname.toLowerCase()) && toPath(resolved.href) === pagePath;
}

export const hasNoindex = (value: string | null): boolean => /\b(?:noindex|none)\b/i.test(value ?? "");

/** dataDir-relative main-text file for a path: pages/<sha1(path)>.txt (a sample uses pages-sample/). */
export function textFileFor(pagePath: string, dir: string = "pages"): string {
  return `${dir}/${createHash("sha1").update(pagePath).digest("hex")}.txt`;
}

/**
 * One sitemap URL's CrawlPage from its HTTP answer. Graph fields (inbound,
 * depth) and the thin fields are placeholders here; runCrawl fills them once
 * every page is in.
 */
export function buildCrawlPage(
  entry: { url: string; path: string },
  fetched: FetchedPage,
  fetchUrl: string,
  hosts: ReadonlySet<string>,
): { page: CrawlPageRecord; text: string } {
  const common = {
    url: entry.url,
    path: entry.path,
    family: familyOf(entry.path),
    status: fetched.status,
    finalUrl: fetched.status >= 300 && fetched.status < 400 ? fetched.location : null,
    uniqueRatio: null,
    thin: false,
    inboundContextual: 0,
    inboundTotal: 0,
    depth: null,
    textFile: textFileFor(entry.path),
    fetchError: fetched.error,
    xRobotsTag: fetched.xRobotsTag,
  };
  if (fetched.status !== 200) {
    return {
      page: {
        ...common,
        title: null,
        metaDescription: null,
        h1: [],
        canonical: null,
        canonicalIsSelf: null,
        robots: null,
        noindex: hasNoindex(fetched.xRobotsTag),
        jsonLdTypes: [],
        jsonLdParseErrors: 0,
        datePublished: null,
        dateModified: null,
        visibleUpdatedDate: null,
        wordCount: 0,
        mainHash: "",
        outboundInternal: 0,
        outboundExternal: 0,
        externalHosts: [],
      },
      text: "",
    };
  }
  const extract = extractPage(fetched.body, fetchUrl);
  const content = extractLinks(contentHtmlOf(fetched.body), fetchUrl);
  const internalTargets = new Set(content.internal.map((link) => link.target).filter((target) => target !== entry.path));
  const externalHrefs = new Set(content.external.map((link) => link.href));
  return {
    page: {
      ...common,
      title: extract.title,
      metaDescription: extract.metaDescription,
      h1: extract.h1,
      canonical: extract.canonical,
      canonicalIsSelf: canonicalIsSelf(extract.canonical, entry.path, fetchUrl, hosts),
      robots: extract.robots,
      noindex: hasNoindex(extract.robots) || hasNoindex(fetched.xRobotsTag),
      jsonLdTypes: extract.jsonLdTypes,
      jsonLdParseErrors: extract.jsonLdParseErrors,
      datePublished: extract.datePublished,
      dateModified: extract.dateModified,
      visibleUpdatedDate: extract.visibleUpdatedDate,
      wordCount: extract.wordCount,
      mainHash: extract.mainHash,
      outboundInternal: internalTargets.size,
      outboundExternal: externalHrefs.size,
      externalHosts: [...new Set(content.external.map((link) => link.host))].sort(),
    },
    text: extract.mainText,
  };
}

/** path → distinct linking pages (all placements, and contextual only). Self-links excluded. */
export function inboundCounts(edges: HealthcheckEdge[]): Map<string, { contextual: number; total: number }> {
  const sources = new Map<string, { contextual: Set<string>; total: Set<string> }>();
  for (const edge of edges) {
    if (edge.from === edge.target) continue;
    const entry = sources.get(edge.target) ?? { contextual: new Set<string>(), total: new Set<string>() };
    entry.total.add(edge.from);
    if (edge.placement === "contextual") entry.contextual.add(edge.from);
    sources.set(edge.target, entry);
  }
  return new Map([...sources].map(([target, s]) => [target, { contextual: s.contextual.size, total: s.total.size }]));
}

// ------------------------------------------------------------ broken links

/** `Disallow` values of the robots.txt groups that apply to every crawler (`*`). */
export function parseRobotsDisallow(robotsTxt: string): string[] {
  const rules = new Set<string>();
  let agents: string[] = [];
  let inRules = false;
  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (inRules) {
        agents = [];
        inRules = false;
      }
      agents.push(value.toLowerCase());
    } else if (key === "disallow" || key === "allow") {
      inRules = true;
      if (key === "disallow" && value && agents.includes("*")) rules.add(value);
    }
  }
  return [...rules];
}

/**
 * Prefix match with `*` wildcards and a `$` end anchor. Like healthcheck.mjs's
 * isDisallowed, a rule ending in "/" also covers the bare path ("/auth/" →
 * "/auth"). Allow lines are ignored: the site's only Allow is the root.
 */
export function isRobotsDisallowed(pagePath: string, rules: string[]): boolean {
  return rules.some((rule) => {
    if (rule.endsWith("/") && pagePath === rule.slice(0, -1)) return true;
    const anchored = rule.endsWith("$");
    const body = anchored ? rule.slice(0, -1) : rule;
    const pattern = body
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(pagePath);
  });
}

export type LinkCheckPlan = { known: Map<string, number | null>; toCheck: string[]; skippedRobots: string[]; skippedOverCap: string[] };

/**
 * Which edge targets need an HTTP check. Crawled pages already have a status
 * (0 → null: no answer). The rest are checked most-linked first, up to `cap`.
 */
export function planLinkChecks(edges: HealthcheckEdge[], crawledStatus: Map<string, number>, robotsRules: string[], cap: number): LinkCheckPlan {
  const known = new Map<string, number | null>();
  const linkCount = new Map<string, number>();
  for (const edge of edges) {
    if (crawledStatus.has(edge.target)) {
      const status = crawledStatus.get(edge.target) ?? 0;
      known.set(edge.target, status === 0 ? null : status);
    } else {
      linkCount.set(edge.target, (linkCount.get(edge.target) ?? 0) + 1);
    }
  }
  const skippedRobots: string[] = [];
  const candidates: string[] = [];
  for (const target of linkCount.keys()) (isRobotsDisallowed(target, robotsRules) ? skippedRobots : candidates).push(target);
  candidates.sort((a, b) => (linkCount.get(b) ?? 0) - (linkCount.get(a) ?? 0) || a.localeCompare(b));
  return { known, toCheck: candidates.slice(0, cap), skippedRobots: skippedRobots.sort(), skippedOverCap: candidates.slice(cap) };
}

/** Every (from, target) pair whose target has a known non-200 status. Unchecked targets are skipped. */
export function brokenLinksFrom(edges: HealthcheckEdge[], statusByTarget: Map<string, number | null>): Crawl["issues"]["brokenInternalLinks"] {
  const out = new Map<string, { from: string; target: string; status: number | null }>();
  for (const edge of edges) {
    if (!statusByTarget.has(edge.target)) continue;
    const status = statusByTarget.get(edge.target) ?? null;
    if (status === 200) continue;
    out.set(`${edge.from}\u0000${edge.target}`, { from: edge.from, target: edge.target, status });
  }
  return [...out.values()].sort((a, b) => a.target.localeCompare(b.target) || a.from.localeCompare(b.from));
}

// ------------------------------------------------------------------ issues

export function computeIssues(
  pages: CrawlPage[],
  linkGraph: Pick<Crawl["linkGraph"], "ran" | "orphans">,
  brokenInternalLinks: Crawl["issues"]["brokenInternalLinks"],
): Crawl["issues"] {
  const ok = pages.filter((page) => page.status === 200);
  const byPath = (a: string, b: string): number => a.localeCompare(b);
  const orphanSet = new Set(linkGraph.ran ? linkGraph.orphans : []);
  return {
    duplicateTitles: findDuplicates(ok.map((page) => ({ path: page.path, value: page.title }))).map((group) => ({ title: group.value, paths: group.paths })),
    duplicateDescriptions: findDuplicates(ok.map((page) => ({ path: page.path, value: page.metaDescription }))).map((group) => ({
      description: group.value,
      paths: group.paths,
    })),
    missingTitles: ok.filter((page) => !page.title?.trim()).map((page) => page.path).sort(byPath),
    missingDescriptions: ok.filter((page) => !page.metaDescription?.trim()).map((page) => page.path).sort(byPath),
    orphans: [...orphanSet].sort(byPath),
    deeperThan3: linkGraph.ran
      ? pages
          .filter((page) => (page.depth !== null ? page.depth > 3 : orphanSet.has(page.path)))
          .map((page) => ({ path: page.path, depth: page.depth }))
          .sort((a, b) => byPath(a.path, b.path))
      : [],
    brokenInternalLinks,
    nonSelfCanonical: ok.filter((page) => page.canonicalIsSelf === false).map((page) => page.path).sort(byPath),
    noindexInSitemap: ok.filter((page) => page.noindex).map((page) => page.path).sort(byPath),
    non200: pages
      .filter((page) => page.status !== 200)
      .map((page) => ({ path: page.path, status: page.status }))
      .sort((a, b) => byPath(a.path, b.path)),
  };
}

/** True when enough pages failed to answer (or answered 5xx) that the site, not a page, is broken. */
export function looksDown(statuses: number[]): boolean {
  if (statuses.length < SITE_DOWN_MIN_PAGES) return false;
  const failed = statuses.filter((status) => status === 0 || status >= 500).length;
  return failed / statuses.length > SITE_DOWN_SHARE;
}

// ------------------------------------------------------ index-status merge

/** IndexStatusUrl plus the crawl's local fields (reported for lib/types.ts). */
export type CrawlMergedFields = { mainHash: string | null; crawledAt: string };

/**
 * Copy wordCount / uniqueRatio / thin and a local `mainHash` + `crawledAt` into
 * each index-status entry this crawl covered, matched by path (entry.path, else
 * the url or key). Pure: returns a new object. `mainHashAtInspect` is never
 * touched. Entries the crawl did not reach are left exactly as they were.
 */
export function mergeIntoIndexStatus(status: IndexStatus, pages: CrawlPage[], crawledAt: string): { status: IndexStatus; merged: number; unmatched: string[] } {
  const byPath = new Map(pages.map((page) => [page.path, page]));
  const matched = new Set<string>();
  const urls: IndexStatus["urls"] = {};
  for (const [key, entry] of Object.entries(status.urls ?? {})) {
    const entryPath = typeof entry?.path === "string" && entry.path ? entry.path : toPath(typeof entry?.url === "string" ? entry.url : key);
    const page = byPath.get(entryPath);
    if (!page) {
      urls[key] = entry;
      continue;
    }
    matched.add(page.path);
    const answered = page.status === 200;
    const fields: CrawlMergedFields = { mainHash: answered ? page.mainHash : null, crawledAt };
    urls[key] = {
      ...entry,
      wordCount: answered ? page.wordCount : null,
      uniqueRatio: answered ? page.uniqueRatio : null,
      thin: answered ? page.thin : null,
      ...fields,
    };
  }
  return { status: { ...status, urls }, merged: matched.size, unmatched: [...byPath.keys()].filter((p) => !matched.has(p)).sort() };
}

// -------------------------------------------------------------------- run

export function defaultDeps(): CrawlDeps {
  return {
    fetchImpl: (url, init) => fetch(url, init),
    fetchSitemap: (base) => fetchSitemap(base),
    runHealthcheck: (base, limit) => runHealthcheckProcess(base, limit),
    retryDelayMs: RETRY_DELAY_MS,
    now: () => new Date(),
  };
}

async function loadRobotsRules(base: string, userAgent: string, deps: CrawlDeps): Promise<string[]> {
  const robots = await fetchPage(`${base}/robots.txt`, userAgent, deps.fetchImpl, { retryDelayMs: deps.retryDelayMs });
  if (robots.status !== 200) {
    log(`  robots.txt answered ${robots.status || robots.error}; checking every link target`);
    return [];
  }
  return parseRobotsDisallow(robots.body);
}

/** Both passes, all network through `deps`. Writes nothing. */
export async function runCrawl(options: CrawlOptions, deps: CrawlDeps): Promise<CrawlResult> {
  const config = loadConfig();
  const base = options.base.replace(/\/+$/, "");
  const userAgent = config.site.userAgent;
  const hosts = new Set([new URL(config.site.base).hostname.toLowerCase(), new URL(base).hostname.toLowerCase()]);
  const limit = options.limit !== null && options.limit > 0 ? options.limit : null;

  const seen = new Set<string>();
  const sitemap = (await deps.fetchSitemap(base)).filter((entry) => {
    if (!entry.path.startsWith("/") || seen.has(entry.path)) return false;
    seen.add(entry.path);
    return true;
  });
  const selected = limit === null ? sitemap : sitemap.slice(0, limit);
  log(`crawl: ${selected.length} of ${sitemap.length} sitemap URLs from ${base}${limit === null ? "" : " (sample)"}`);

  // Pass 1 — the healthcheck's link graph and findings.
  let health: HealthcheckPass;
  if (options.skipHealthcheck) {
    health = healthcheckNotRun("--skip-healthcheck was passed");
  } else {
    log("crawl: pass 1, scripts/seo/healthcheck.mjs …");
    const run = deps.runHealthcheck(base, limit);
    health = run.json === null ? healthcheckNotRun(`the healthcheck did not report: ${run.error ?? "no JSON"}`, [{ severity: "high", check: "healthcheck", detail: run.error ?? "no JSON report" }]) : normalizeHealthcheck(run.json);
  }
  if (limit !== null) {
    health = { ...health, ran: false, orphans: [], depth: {}, reason: `sampled run (--limit ${limit}): an incomplete crawl makes every unreached page look orphaned` };
  }

  // Pass 2 — every selected sitemap URL, fetched and extracted here.
  log(`crawl: pass 2, fetching ${selected.length} pages …`);
  let done = 0;
  const works = await mapLimit(selected, CONCURRENCY, async (entry) => {
    const fetchUrl = `${base}${entry.path}`;
    const fetched = await fetchPage(fetchUrl, userAgent, deps.fetchImpl, { retryDelayMs: deps.retryDelayMs });
    done += 1;
    if (done % 50 === 0) log(`  …${done}/${selected.length}`);
    const built = buildCrawlPage(entry, fetched, fetchUrl, hosts);
    if (limit !== null) built.page.textFile = textFileFor(entry.path, SAMPLE_TEXT_DIR);
    return built;
  });
  const statuses = works.map((work) => work.page.status);
  if (looksDown(statuses)) {
    const failed = statuses.filter((status) => status === 0 || status >= 500).length;
    throw new Error(
      `${failed} of ${statuses.length} pages gave no answer or a 5xx: the site looks down. ` +
        "Not writing a crawl that would read as mass regressions; re-run when it recovers.",
    );
  }

  // Graph fields.
  const inbound = inboundCounts(health.edges);
  for (const { page } of works) {
    const counts = inbound.get(page.path);
    page.inboundContextual = counts?.contextual ?? 0;
    page.inboundTotal = counts?.total ?? 0;
    page.depth = health.ran ? (health.depth[page.path] ?? null) : null;
  }

  // Thin flag, within template families, over pages that answered 200. A
  // sample holds only part of each family, which moves the chrome cutoff, so
  // it gets no uniqueRatio and is judged on word count alone.
  const byFamily = new Map<Family, Array<{ path: string; text: string }>>();
  for (const { page, text } of works) {
    if (page.status !== 200) continue;
    const list = byFamily.get(page.family) ?? [];
    list.push({ path: page.path, text });
    byFamily.set(page.family, list);
  }
  const ratios = limit === null ? uniqueRatios(byFamily, { commonShare: config.thresholds.similarity.templateCommonShare }) : new Map<string, number | null>();
  for (const { page } of works) {
    if (page.status !== 200) continue;
    page.uniqueRatio = ratios.get(page.path) ?? null;
    page.thin = thinFlag(page.wordCount, page.uniqueRatio, config.thresholds.prune);
  }

  // Broken internal links.
  const crawledStatus = new Map(works.map(({ page }) => [page.path, page.status]));
  const robotsRules = health.edges.length ? await loadRobotsRules(base, userAgent, deps) : [];
  const plan = planLinkChecks(health.edges, crawledStatus, robotsRules, LINK_CHECK_CAP);
  if (plan.toCheck.length) log(`crawl: checking ${plan.toCheck.length} non-sitemap link targets …`);
  const checked = await mapLimit(plan.toCheck, CONCURRENCY, async (target) => {
    const url = `${base}${target}`;
    let answer = await fetchPage(url, userAgent, deps.fetchImpl, { method: "HEAD", retryDelayMs: deps.retryDelayMs });
    if (answer.status === 405 || answer.status === 501) answer = await fetchPage(url, userAgent, deps.fetchImpl, { method: "GET", retryDelayMs: deps.retryDelayMs });
    return [target, answer.status === 0 ? null : answer.status] as const;
  });
  const statusByTarget = new Map<string, number | null>([...plan.known, ...checked]);
  if (plan.skippedOverCap.length) log(`crawl: ${plan.skippedOverCap.length} link targets over the ${LINK_CHECK_CAP}-check cap were not checked`);

  const pages = works.map((work) => work.page).sort((a, b) => a.path.localeCompare(b.path));
  const linkGraph: Crawl["linkGraph"] = { ran: health.ran, reason: health.reason, edges: health.edges, orphans: health.orphans };
  const crawl: CrawlOutput = {
    generatedAt: deps.now().toISOString(),
    base,
    sitemapCount: sitemap.length,
    pages,
    linkGraph,
    issues: computeIssues(pages, linkGraph, brokenLinksFrom(health.edges, statusByTarget)),
    healthcheckFindings: health.findings,
    limit,
    linkCheck: {
      targets: plan.known.size + plan.toCheck.length + plan.skippedRobots.length + plan.skippedOverCap.length,
      fromCrawl: plan.known.size,
      checked: plan.toCheck.length,
      skippedRobotsDisallowed: plan.skippedRobots.length,
      skippedOverCap: plan.skippedOverCap.length,
      cap: LINK_CHECK_CAP,
    },
  };
  return { crawl, texts: new Map(works.map(({ page, text }) => [page.path, text])) };
}

export type WriteSummary = { crawlFile: string; textFiles: number; textFilesRefused: string[]; indexStatus: string };

const isSample = (crawl: Pick<CrawlOutput, "limit">): boolean => typeof crawl.limit === "number" && crawl.limit > 0;

/**
 * Why this crawl must not be merged into index-status.json, or null when it
 * may be. Read from the crawl itself, so no caller can merge a local build or
 * a sample by passing the wrong flag.
 */
export function indexStatusMergeBlocker(crawl: Pick<CrawlOutput, "base" | "limit">): string | null {
  if (isLoopbackBase(crawl.base)) return "loopback base: a local build is not what Google crawled";
  if (isSample(crawl)) return `sampled run (--limit ${crawl.limit}): a partial crawl is not the site's state`;
  return null;
}

/** seo/data/crawl-<date>.json, or crawl-sample-<date>.json, which latestDataFile("crawl") never returns. */
export function crawlFileFor(crawl: Pick<CrawlOutput, "limit">, date: string = today()): string {
  return datedDataPath(isSample(crawl) ? SAMPLE_CRAWL_PREFIX : "crawl", date);
}

/**
 * Text files first (so the crawl never names a missing file), then the crawl,
 * then the index-status merge. A text file io.ts refuses to publish is
 * written empty and reported, rather than failing the whole crawl.
 * `mergeIndexStatus: false` can only turn the merge off; it never forces a
 * merge indexStatusMergeBlocker refuses.
 */
export function writeCrawlArtifacts(result: CrawlResult, options: { mergeIndexStatus?: boolean; date?: string } = {}): WriteSummary {
  const refused: string[] = [];
  for (const page of result.crawl.pages) {
    const file = path.join(dataDir(), page.textFile);
    try {
      writeText(file, result.texts.get(page.path) ?? "");
    } catch (error) {
      refused.push(page.path);
      log(`  ${page.path}: main text not written (${error instanceof Error ? error.message : String(error)})`);
      writeText(file, "");
    }
  }
  const crawlFile = crawlFileFor(result.crawl, options.date ?? today());
  writeJson(crawlFile, result.crawl);

  let indexStatus: string;
  const statusFile = statePaths.indexStatus();
  const blocker = indexStatusMergeBlocker(result.crawl) ?? (options.mergeIndexStatus === false ? "the caller turned the merge off" : null);
  const existing = blocker === null ? readJsonIfExists<IndexStatus>(statusFile) : null;
  if (blocker !== null) {
    indexStatus = `not merged (${blocker})`;
  } else if (!existing) {
    indexStatus = "absent (nothing to merge)";
  } else {
    const merged = mergeIntoIndexStatus(existing, result.crawl.pages, result.crawl.generatedAt);
    writeJson(statusFile, merged.status);
    indexStatus = `merged ${merged.merged} entries; ${merged.unmatched.length} crawled paths have no index-status entry`;
  }
  return { crawlFile, textFiles: result.crawl.pages.length, textFilesRefused: refused, indexStatus };
}

async function main(args: Args): Promise<number> {
  const config = loadConfig();
  const base = assertAllowedBase(flagString(args, "base", config.site.base), config.site.base);
  const rawLimit = flagNumber(args, "limit", 0);
  if (hasFlag(args, "limit") && !(Number.isInteger(rawLimit) && rawLimit > 0)) throw new Error("--limit must be a positive integer");
  const limit = rawLimit > 0 ? rawLimit : null;

  const result = await runCrawl({ base, limit, skipHealthcheck: hasFlag(args, "skip-healthcheck") }, defaultDeps());
  // Loopback and --limit runs are kept out of run state inside writeCrawlArtifacts.
  const written = writeCrawlArtifacts(result);
  const { crawl } = result;
  console.log(
    JSON.stringify(
      {
        file: repoRelative(written.crawlFile),
        base: crawl.base,
        limit: crawl.limit,
        pages: crawl.pages.length,
        sitemapCount: crawl.sitemapCount,
        linkGraph: { ran: crawl.linkGraph.ran, reason: crawl.linkGraph.reason, edges: crawl.linkGraph.edges.length },
        issues: Object.fromEntries(Object.entries(crawl.issues).map(([key, value]) => [key, value.length])),
        thin: crawl.pages.filter((page) => page.thin).length,
        healthcheckFindings: crawl.healthcheckFindings.length,
        linkCheck: crawl.linkCheck,
        textFilesRefused: written.textFilesRefused,
        indexStatus: written.indexStatus,
      },
      null,
      2,
    ),
  );
  return 0;
}

// --------------------------------------------------------------- self-test

function selfTest(): void {
  const production = "https://usetruecap.com";
  check(assertAllowedBase("https://usetruecap.com/", production) === production, "production base is allowed");
  check(assertAllowedBase("http://localhost:3000", production) === "http://localhost:3000", "loopback base is allowed");
  for (const bad of ["https://www.usetruecap.com", "http://usetruecap.com", "https://truecap-iota.vercel.app", "https://usetruecap.com/blog"]) {
    let refused = false;
    try {
      assertAllowedBase(bad, production);
    } catch {
      refused = true;
    }
    check(refused, `base ${bad} is refused`);
  }

  check(shingles("One two three four five six").size === 2, "six words make two 5-word shingles");
  check(shingles("Don’t stop").size === 0, "fewer than five words make no shingle");
  const chrome = "this page is part of the rental market data series";
  const family = new Map<Family, Array<{ path: string; text: string }>>([
    ["market-city", ["a", "b", "c", "d", "e"].map((c) => ({ path: `/markets/${c}`, text: `${chrome} ${c}1 ${c}2 ${c}3 ${c}4 ${c}5 ${c}6 ${c}7 ${c}8 ${c}9 ${c}10` }))],
    ["hub", [{ path: "/markets", text: chrome }]],
  ]);
  const ratios = uniqueRatios(family, { commonShare: 0.3 });
  // 20 tokens → 16 shingles; the 6 made only of chrome words are in all 5 pages.
  check(ratios.get("/markets/a") === 0.625, `chrome shingles are excluded (got ${ratios.get("/markets/a")})`);
  check(ratios.get("/markets") === null, "non-template families get null");

  const dupes = findDuplicates([
    { path: "/b", value: " Cap Rate " },
    { path: "/a", value: "cap rate" },
    { path: "/c", value: null },
  ]);
  check(dupes.length === 1 && dupes[0].paths.join() === "/a,/b", "duplicates normalise trim + case");

  const health = normalizeHealthcheck({
    linkGraph: { ran: true, orphans: ["/x"], depth: { "/x": null, "/y": 5 }, edges: [{ source: "/", target: "/y", anchor: "Y", placement: "contextual" }] },
    findings: [{ severity: "high", check: "orphaned sitemap URLs", detail: "1 of 2" }],
  });
  check(health.edges[0]?.from === "/" && health.depth["/y"] === 5, "healthcheck edges map source → from");

  const hosts = new Set(["usetruecap.com"]);
  const html =
    '<html><head><title>Cap Rate</title><meta name="description" content="What it is"><link rel="canonical" href="https://usetruecap.com/blog/cap-rate">' +
    '<meta name="robots" content="index, follow"></head><body><nav><a href="/pricing">Pricing</a></nav><main><h1>Cap rate</h1>' +
    '<p>Read <a href="/blog/noi">NOI</a> and <a href="https://www.irs.gov/pub/p527">IRS Pub 527</a>.</p></main></body></html>';
  const built = buildCrawlPage(
    { url: "https://usetruecap.com/blog/cap-rate", path: "/blog/cap-rate" },
    { status: 200, location: null, xRobotsTag: null, body: html, error: null },
    "https://usetruecap.com/blog/cap-rate",
    hosts,
  );
  check(built.page.canonicalIsSelf === true && !built.page.noindex, "self canonical, indexable");
  check(built.page.outboundInternal === 1 && built.page.outboundExternal === 1, "nav links are not counted as outbound content links");
  check(built.page.externalHosts.join() === "www.irs.gov", "external hosts recorded");

  const pages = [built.page, { ...built.page, path: "/blog/dup", canonicalIsSelf: false, depth: 4 }, { ...built.page, path: "/gone", status: 404, title: null }];
  const issues = computeIssues(pages, { ran: true, orphans: [] }, []);
  check(issues.duplicateTitles.length === 1, "duplicate titles flagged");
  check(issues.nonSelfCanonical.join() === "/blog/dup", "non-self canonical flagged");
  check(issues.deeperThan3.length === 1 && issues.non200[0]?.status === 404, "depth and non-200 flagged");

  const rules = parseRobotsDisallow("User-agent: *\nAllow: /\nDisallow: /auth/\n\nUser-agent: GPTBot\nDisallow: /secret/\n");
  check(isRobotsDisallowed("/auth", rules) && isRobotsDisallowed("/auth/login", rules) && !isRobotsDisallowed("/secret/x", rules), "robots rules for * only");

  const merged = mergeIntoIndexStatus(
    {
      generatedAt: "",
      site: "",
      sitemapReport: [],
      quota: { day: "", used: 0 },
      summary: { total: 0, indexed: 0, byClass: { indexed: 0, never_crawled: 0, crawled_not_indexed: 0, dropped_after_indexed: 0, excluded: 0, unknown: 0 }, byFamily: {} },
      urls: { "https://usetruecap.com/blog/cap-rate": { url: "https://usetruecap.com/blog/cap-rate", mainHashAtInspect: "keep" } as IndexStatus["urls"][string] },
    },
    [built.page],
    "2026-09-27T00:00:00.000Z",
  );
  const entry = merged.status.urls["https://usetruecap.com/blog/cap-rate"] as IndexStatus["urls"][string] & CrawlMergedFields;
  check(entry.mainHashAtInspect === "keep" && entry.mainHash === built.page.mainHash && entry.wordCount === built.page.wordCount, "merge keeps mainHashAtInspect");
  check(looksDown(Array(10).fill(0)) && !looksDown([0, 0, 0]), "site-down guard needs volume");

  check(indexStatusMergeBlocker({ base: production, limit: null }) === null, "a full production crawl merges");
  check(/sampled run/.test(indexStatusMergeBlocker({ base: production, limit: 20 }) ?? ""), "a production sample does not merge");
  check(/loopback/.test(indexStatusMergeBlocker({ base: "http://localhost:3000", limit: null }) ?? ""), "a loopback crawl does not merge");
  check(path.basename(crawlFileFor({ limit: 20 }, "2026-09-27")) === "crawl-sample-2026-09-27.json", "a sample is not named crawl-<date>");
  check(path.basename(crawlFileFor({ limit: null }, "2026-09-27")) === "crawl-2026-09-27.json", "a full crawl is crawl-<date>");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["base", "limit", "skip-healthcheck"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
