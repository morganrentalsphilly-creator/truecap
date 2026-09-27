/**
 * post-deploy.ts — runs after Vercel reports a successful Production
 * deployment of a commit on main (seo-deployed.yml, `deployment_status`).
 *
 * If the commit is a merged SEO-loop PR (head branch seo/<run id>, authored by
 * the Claude App), it:
 *   1. finds the pages the PR changed: the `SEO-URLs:` trailer the publish
 *      job wrote into the loop commit (the publish plan's checkUrls: the
 *      /markets pages a dataset edit renders included, the pages it
 *      noindexes left out), plus each page or OG file mapped through
 *      lib/family.ts pageUrlForFile (the one shared mapping);
 *   2. checks each changed page on production with absolute, deterministic
 *      rules (200, indexable, self-canonical, parseable JSON-LD, no broken
 *      internal links from the page);
 *   3. pings IndexNow for the pages that pass.
 * A failure is a REGRESSION: it goes into the result JSON for the workflow to
 * file as a `seo-regression` issue. The weekly gate treats an open regression
 * issue as a halt, and the daily shepherd opens the revert PR. This job never
 * writes run state and never runs a model (claude-code-action cannot run on
 * this event, and a second state writer would race the weekly job).
 *
 * Every Production deploy, loop PR or not, also pings IndexNow for the
 * pages whose honest date moved: the keys of content/seo/lastmod.json that
 * were added or changed since the PREVIOUS successful Production deploy (not
 * the parent commit — several merges can land in one deploy), plus the paths
 * added to or removed from content/seo/noindex.json. Owner PRs change pages
 * too, and the lastmod map is the one record of which pages they changed.
 *
 * The result is ONE JSON document (to --out, else stdout). indexnow.ts prints
 * its own summary on stdout, so its stdout is captured and dropped, never
 * inherited: two documents in one file made the workflow's parse throw and
 * lost every regression. An IndexNow failure is recorded as `indexnowError`
 * instead of aborting, for the same reason.
 *
 *   node seo/scripts/post-deploy.ts --sha <commit> [--out result.json] [--dry-run]
 * Needs GH_TOKEN (read) and GITHUB_REPOSITORY.
 */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { flagString, hasFlag, requireFlag, runMain, check, log } from "./lib/cli.ts";
import type { Args } from "./lib/cli.ts";
import { loadConfig } from "./lib/config.ts";
import { pageUrlForFile } from "./lib/family.ts";
import { extractPage } from "./lib/html.ts";
import { writeJson } from "./lib/io.ts";
import { toPath } from "./lib/sitemap.ts";

export type LoopPr = { number: number; headRef: string; author: string; files: string[]; commitMessages: string[] };

/** File → site path: a page or OG file of a page the loop may edit (lib/family.ts, shared with verify-static). */
export function pathForFile(file: string): string | null {
  return pageUrlForFile(file);
}

/** The trailer the publish job writes into the loop commit: `SEO-URLs: /blog/a,/markets/x`. */
export const URLS_TRAILER = "SEO-URLs";
const SITE_PATH_RE = /^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/;

/** Site paths named by `SEO-URLs:` trailers in the PR's commit messages; anything not a plain site path is dropped. */
export function urlsFromCommitMessages(messages: readonly string[]): string[] {
  const out = new Set<string>();
  for (const message of messages) {
    for (const line of String(message).split("\n")) {
      const m = new RegExp(`^${URLS_TRAILER}:\\s*(.*)$`).exec(line.trim());
      if (!m) continue;
      for (const part of m[1].split(",")) {
        const p = part.trim();
        if (SITE_PATH_RE.test(p) && !p.split("/").some((seg) => seg === "." || seg === "..")) out.add(p);
      }
    }
  }
  return [...out].sort();
}

export function hasUrlsTrailer(messages: readonly string[]): boolean {
  return messages.some((message) => String(message).split("\n").some((line) => line.trim().startsWith(`${URLS_TRAILER}:`)));
}

/**
 * The pages to check. With the publish job's trailer, exactly its pages: it
 * is the plan's checkUrls, which already holds every page and OG file's page
 * and leaves out the pages the PR noindexes on purpose (a file mapping would
 * put those back and file a prune as a regression). Without one (a PR from
 * before the trailer), each page or OG file's page.
 */
export function changedPaths(pr: Pick<LoopPr, "files" | "commitMessages">): string[] {
  if (hasUrlsTrailer(pr.commitMessages)) return urlsFromCommitMessages(pr.commitMessages);
  const out = new Set<string>();
  for (const file of pr.files) {
    const p = pathForFile(file);
    if (p) out.add(p);
  }
  return [...out].sort();
}

export type IndexNowOutcome = { ok: boolean; error: string | null };
const INDEXNOW_SCRIPT = fileURLToPath(new URL("./indexnow.ts", import.meta.url));

/**
 * Run indexnow.ts for `paths`. Its stdout (its own JSON summary) is captured
 * and dropped so this script's result stays the only document; its stderr
 * (the progress log) still reaches the job log. Never throws: a rejected
 * batch or a crash comes back as `{ ok: false, error }` with only the exit
 * status, never the command line (which holds the runner path).
 */
export function pingIndexNow(paths: readonly string[], script: string = INDEXNOW_SCRIPT): IndexNowOutcome {
  try {
    execFileSync(process.execPath, [script, "--urls", paths.join(",")], { stdio: ["ignore", "pipe", "inherit"], maxBuffer: 16 * 1024 * 1024 });
    return { ok: true, error: null };
  } catch (error) {
    const status = (error as { status?: unknown }).status;
    return { ok: false, error: typeof status === "number" ? `indexnow.ts exited ${status}` : "indexnow.ts could not be run" };
  }
}

export function isLoopPr(pr: Pick<LoopPr, "headRef" | "author">): boolean {
  return /^seo\/[0-9]+$/.test(pr.headRef) && /^(app\/)?claude(\[bot\])?$/.test(pr.author);
}

/** Keys of `after` that are new or whose date changed since `before` (null = no map before). */
export function lastmodChangedPaths(before: Record<string, string> | null, after: Record<string, string>): string[] {
  return Object.keys(after)
    .filter((path) => SITE_PATH_RE.test(path) && (!before || before[path] !== after[path]))
    .sort();
}

/** Paths added to or removed from the noindex list: both tell a crawler to look again. */
export function noindexChangedPaths(before: readonly string[] | null, after: readonly string[]): string[] {
  const was = new Set(before ?? []);
  const now = new Set(after);
  return [...new Set([...after.filter((p) => !was.has(p)), ...(before ?? []).filter((p) => !now.has(p))])]
    .filter((p) => SITE_PATH_RE.test(p))
    .sort();
}

function asDateMap(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (typeof v === "string") out[k] = v;
  return out;
}

function asPathList(value: unknown): string[] | null {
  const paths = value && typeof value === "object" ? (value as { paths?: unknown }).paths : null;
  return Array.isArray(paths) ? paths.filter((p): p is string => typeof p === "string") : null;
}

/** A tracked JSON file at a commit, or null when the file (or the commit) is not there. */
function readJsonAt(sha: string, file: string, cwd: string): unknown {
  try {
    return JSON.parse(execFileSync("git", ["show", `${sha}:${file}`], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    return null;
  }
}

/**
 * The commit of the Production deployment that succeeded before this one,
 * from the GitHub deployments API; falls back to the first parent. Its
 * objects are fetched (the checkout is shallow) so `git show` can read it.
 */
function previousProductionSha(sha: string): string {
  const repo = process.env.GITHUB_REPOSITORY;
  let previous: string | null = null;
  if (repo) {
    try {
      const deployments = JSON.parse(gh(["api", `repos/${repo}/deployments?environment=Production&per_page=30`])) as Array<{ id: number; sha: string }>;
      const start = deployments.findIndex((d) => d.sha === sha);
      for (const d of deployments.slice(start >= 0 ? start + 1 : 0, (start >= 0 ? start + 1 : 0) + 10)) {
        if (d.sha === sha) continue;
        const statuses = JSON.parse(gh(["api", `repos/${repo}/deployments/${d.id}/statuses?per_page=1`])) as Array<{ state: string }>;
        if (statuses[0]?.state === "success") {
          previous = d.sha;
          break;
        }
      }
    } catch (error) {
      log(`deployments API unavailable (${(error as Error).message.split("\n")[0]}); comparing with the parent commit`);
    }
  }
  const target = previous ?? `${sha}^1`;
  try {
    execFileSync("git", ["fetch", "--no-tags", "--depth=2", "origin", previous ?? sha], { stdio: ["ignore", "ignore", "ignore"] });
  } catch {
    // Already present, or offline: readJsonAt returns null and every map key counts as changed.
  }
  return target;
}

/** The pages whose date or index status moved between two commits. */
export function datedChanges(beforeSha: string, afterSha: string, cwd: string = process.cwd()): string[] {
  const lastmod = lastmodChangedPaths(asDateMap(readJsonAt(beforeSha, LASTMOD_FILE, cwd)), asDateMap(readJsonAt(afterSha, LASTMOD_FILE, cwd)) ?? {});
  const noindex = noindexChangedPaths(asPathList(readJsonAt(beforeSha, NOINDEX_FILE, cwd)), asPathList(readJsonAt(afterSha, NOINDEX_FILE, cwd)) ?? []);
  return [...new Set([...lastmod, ...noindex])].sort();
}

const LASTMOD_FILE = "content/seo/lastmod.json";
const NOINDEX_FILE = "content/seo/noindex.json";

function gh(args: string[]): string {
  return execFileSync("gh", args, { encoding: "utf8", env: process.env });
}

function findLoopPr(sha: string): LoopPr | null {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error("GITHUB_REPOSITORY is not set");
  const pulls = JSON.parse(gh(["api", `repos/${repo}/commits/${sha}/pulls`])) as Array<{ number: number; merged_at: string | null; base: { ref: string }; head: { ref: string; repo: { full_name: string } | null }; user: { login: string } }>;
  const merged = pulls.find((p) => p.merged_at && p.base.ref === "main" && p.head.repo?.full_name === repo);
  if (!merged) return null;
  const pr: LoopPr = { number: merged.number, headRef: merged.head.ref, author: merged.user.login, files: [], commitMessages: [] };
  if (!isLoopPr(pr)) return null;
  pr.files = (JSON.parse(gh(["api", `repos/${repo}/pulls/${merged.number}/files`, "--paginate"])) as Array<{ filename: string }>).map((f) => f.filename);
  pr.commitMessages = (JSON.parse(gh(["api", `repos/${repo}/pulls/${merged.number}/commits`, "--paginate"])) as Array<{ commit?: { message?: string } }>).map((c) => String(c.commit?.message ?? ""));
  return pr;
}

export type PageCheck = { path: string; ok: boolean; problems: string[] };

export async function checkPage(base: string, path: string, sitemapPaths: Set<string>): Promise<PageCheck> {
  const problems: string[] = [];
  const response = await fetch(`${base}${path}`, { redirect: "manual", headers: { "user-agent": loadConfig().site.userAgent } });
  if (response.status !== 200) return { path, ok: false, problems: [`HTTP ${response.status}`] };
  const html = await response.text();
  const page = extractPage(html, `${base}${path}`);
  if (/noindex/i.test(page.robots ?? "") || /noindex/i.test(response.headers.get("x-robots-tag") ?? "")) problems.push("noindex");
  if (!page.canonical || toPath(page.canonical) !== path) problems.push(`canonical is ${page.canonical ?? "missing"}`);
  if (page.jsonLdParseErrors > 0) problems.push(`${page.jsonLdParseErrors} unparseable JSON-LD block(s)`);
  if (!page.title) problems.push("no <title>");
  const broken = page.internalLinks.map((l) => l.target).filter((t) => t.startsWith("/blog/") || t.startsWith("/vs/") || t.startsWith("/glossary/") || t.startsWith("/markets/")).filter((t) => !sitemapPaths.has(t));
  if (broken.length) problems.push(`links to paths not in the sitemap: ${[...new Set(broken)].slice(0, 5).join(", ")}`);
  return { path, ok: problems.length === 0, problems };
}

export type PostDeployResult = {
  loopPr: number | null;
  sha: string;
  checked: number;
  indexnow: string[];
  indexnowError: string | null;
  regressions: PageCheck[];
  /** Pages pinged because their lastmod or noindex entry moved in this deploy. */
  dated?: string[];
  note?: string;
};

function emit(result: PostDeployResult, out: string | null): void {
  if (out) writeJson(out, result);
  else console.log(JSON.stringify(result));
}

async function main(args: Args): Promise<number> {
  const sha = requireFlag(args, "sha", "commit");
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error("--sha must be a commit SHA");
  const out = flagString(args, "out");
  const dryRun = hasFlag(args, "dry-run");
  const dated = datedChanges(previousProductionSha(sha), sha);
  const pr = findLoopPr(sha);
  if (!pr) {
    let indexnowError: string | null = null;
    if (dated.length && !dryRun) {
      const ping = pingIndexNow(dated);
      if (!ping.ok) indexnowError = ping.error;
    }
    emit(
      {
        loopPr: null,
        sha,
        checked: 0,
        indexnow: indexnowError ? [] : dated,
        indexnowError,
        regressions: [],
        dated,
        note: dated.length ? `not a loop PR; ${dated.length} page(s) with a moved date` : "not a loop PR and no page's date moved",
      },
      out,
    );
    log(`${dated.length} page(s) with a moved lastmod/noindex entry`);
    return 0;
  }
  const base = loadConfig().site.base;
  const sitemapXml = await (await fetch(`${base}/sitemap.xml`)).text();
  const sitemapPaths = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => toPath(m[1])));
  const paths = changedPaths(pr);
  const checks = await Promise.all(paths.map((p) => checkPage(base, p, sitemapPaths)));
  const passing = checks.filter((c) => c.ok && sitemapPaths.has(c.path)).map((c) => c.path);
  const regressions = checks.filter((c) => !c.ok);
  const failed = new Set(regressions.map((c) => c.path));
  // The loop's own pages that passed, plus any other page whose date moved in
  // this deploy; never a page that just failed its check.
  const ping = [...new Set([...passing, ...dated.filter((p) => !failed.has(p))])].sort();
  let indexnowError: string | null = null;
  if (ping.length && !dryRun) {
    const result = pingIndexNow(ping);
    if (!result.ok) {
      indexnowError = result.error;
      log(`IndexNow failed (${result.error}); the regressions are still reported`);
    }
  }
  emit({ loopPr: pr.number, sha, checked: checks.length, indexnow: indexnowError ? [] : ping, indexnowError, regressions, dated }, out);
  log(`PR #${pr.number}: ${checks.length} page(s) checked, ${regressions.length} regression(s)`);
  return 0;
}

function selfTest(): void {
  check(pathForFile("app/blog/how-to-x/page.tsx") === "/blog/how-to-x", "blog file");
  check(pathForFile("app/vs/dealcheck/page.tsx") === "/vs/dealcheck", "vs file");
  check(pathForFile("app/blog/how-to-x/opengraph-image.tsx") === "/blog/how-to-x", "OG image file");
  check(pathForFile("app/blog/page.tsx") === null && pathForFile("content/seo/lastmod.json") === null, "non-page files");
  check(urlsFromCommitMessages(["seo-weekly: run 1\n\nSEO-URLs: /markets/philadelphia,/blog/a, https://x.test/y ,/../etc"]).join() === "/blog/a,/markets/philadelphia", "trailer pages, plain site paths only");
  check(isLoopPr({ headRef: "seo/123", author: "claude[bot]" }), "loop PR");
  check(!isLoopPr({ headRef: "seo/maintain-x", author: "claude[bot]" }), "legacy branch is not a loop PR");
  check(!isLoopPr({ headRef: "seo/123", author: "someone" }), "wrong author");
  check(
    lastmodChangedPaths({ "/a": "2026-09-01", "/b": "2026-09-01" }, { "/a": "2026-09-01", "/b": "2026-10-05", "/c": "2026-10-05", "https://x.test/": "2026-10-05" }).join() === "/b,/c",
    "lastmod: changed and added site paths only",
  );
  check(lastmodChangedPaths(null, { "/a": "2026-09-01" }).join() === "/a", "no map before: every key");
  check(noindexChangedPaths(["/x", "/y"], ["/y", "/z"]).join() === "/x,/z", "noindex: added and removed");
  check(noindexChangedPaths(null, []).length === 0, "no list before or after");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["dry-run", "out", "sha"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
