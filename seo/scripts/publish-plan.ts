/**
 * publish-plan.ts — decides which files of a verified patch get published,
 * from two independent sources of truth: verify-static's verdict (tier per
 * file, computed from the diff) and the critic job's structured verdict.
 *
 * Rules, all deterministic:
 *   · tier 0 files publish without a critic verdict (title/meta or one internal link);
 *   · tier 1 files publish ONLY with an explicit APPROVE for that exact path;
 *   · tier 2 files publish into the PR for the founder to review — the merge
 *     job never arms auto-merge for a tier-2 PR, so the critic is advisory there.
 * The run-manifest (written by the model) is never consulted here: it cannot
 * raise a tier, add a file, or stand in for the critic.
 *
 * Publishing is all-or-nothing per page group. verify-static and verify-build
 * judged the WHOLE patch, and the subset applied with `git apply --include`
 * is never re-verified or rebuilt, so a subset must not break what they
 * checked:
 *   · files that change a common page (VerifyFile.urls: a new article's
 *     page.tsx, its OG image and its registry entry; a dataset and the pages
 *     it names) form one group, and a dropped file drops its whole group;
 *   · a dropped NEW article drops everything: verify-static let other pages
 *     link to it only because the same patch created it.
 * `urls` (the pages this publish changes), `lastmodUrls` (the ones whose
 * main content changed: not an OG-image-only change) and `checkUrls` (the
 * ones seo-deployed checks: not a page this publish noindexes) come from the
 * included files only.
 *
 *   node seo/scripts/publish-plan.ts --verdict v.json --critic c.json --run-id 123 --out plan.json
 *     → prints `tier=<n>` and `title=<...>` lines for $GITHUB_OUTPUT
 *   node seo/scripts/publish-plan.ts --assert-staged plan.json < staged-names
 *     → exits 1 if anything outside the plan (plus the lastmod map) is staged
 */

import { readFileSync, existsSync } from "node:fs";
import { flagString, requireFlag, runMain, check } from "./lib/cli.ts";
import type { Args } from "./lib/cli.ts";
import { isOgImageFile } from "./lib/family.ts";
import { readJson, writeJson } from "./lib/io.ts";
import type { VerifyFile, VerifyVerdict } from "./lib/types.ts";

export type CriticVerdict = { verdicts: Array<{ file: string; verdict: "APPROVE" | "REJECT"; reasons: string[] }> };

export type PublishPlan = {
  runId: string;
  include: string[];
  /** Every page the included files change. */
  urls: string[];
  /** The pages whose main content changed (urls minus OG-image-only changes): what lastmod.ts bumps. */
  lastmodUrls: string[];
  /**
   * The pages seo-deployed checks after the merge (the loop commit's
   * SEO-URLs trailer): urls minus the pages this publish noindexes, which
   * are meant to fail "indexable" and must never be filed as a regression.
   */
  checkUrls: string[];
  tier: 0 | 1 | 2;
  dropped: Array<{ file: string; reason: string }>;
  critic: Array<{ file: string; verdict: string; reasons: string[] }>;
  title: string;
};

/** Files the publish job may stage besides the plan's own: the lastmod map it rewrites. */
export const PUBLISH_OWNED_FILES = ["content/seo/lastmod.json"];

/** The pages a verdict file changes: `urls` when verify-static wrote it, else its own `url`. */
export function pagesOf(file: Pick<VerifyFile, "url" | "urls">): string[] {
  if (Array.isArray(file.urls)) return file.urls.filter((u): u is string => typeof u === "string");
  return file.url ? [file.url] : [];
}

function isNewArticlePage(file: VerifyFile): boolean {
  return file.status === "A" && Boolean(file.url) && /\/page\.tsx$/.test(file.path);
}

/** Files that share a page, as groups (union-find over pagesOf); a file with no page is its own group. */
export function pageGroups(files: readonly VerifyFile[]): string[][] {
  const parent = new Map<string, string>(files.map((f) => [f.path, f.path]));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    parent.set(x, root);
    return root;
  };
  const owner = new Map<string, string>();
  for (const file of files) {
    for (const page of pagesOf(file)) {
      const first = owner.get(page);
      if (first === undefined) owner.set(page, file.path);
      else parent.set(find(file.path), find(first));
    }
  }
  const groups = new Map<string, string[]>();
  for (const file of files) {
    const root = find(file.path);
    groups.set(root, [...(groups.get(root) ?? []), file.path]);
  }
  return [...groups.values()].map((g) => g.sort()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

export function buildPlan(runId: string, verdict: VerifyVerdict, critic: CriticVerdict | null): PublishPlan {
  if (!verdict.ok) throw new Error("refusing to plan a publish from a failed verify-static verdict");
  const byFile = new Map((Array.isArray(critic?.verdicts) ? critic.verdicts : []).map((v) => [v.file, v]));
  const files = [...verdict.files];
  const reasonFor = new Map<string, string>();

  // 1. Each file on its own: a tier-1 file needs the critic's exact APPROVE.
  for (const file of files) {
    const review = byFile.get(file.path);
    if (file.tier === 1 && review?.verdict !== "APPROVE") {
      const reasons = Array.isArray(review?.reasons) ? review.reasons.map(String) : [];
      reasonFor.set(file.path, review ? `critic ${String(review.verdict)}: ${reasons.join("; ").slice(0, 300) || "no reasons given"}` : "no critic verdict for a tier-1 file");
    }
  }
  // 2. A dropped file takes its page group with it.
  for (const group of pageGroups(files)) {
    const cause = group.find((path) => reasonFor.has(path));
    if (!cause) continue;
    for (const path of group) if (!reasonFor.has(path)) reasonFor.set(path, `held back with ${cause}: it changes the same page, and the pair was verified together`);
  }
  // 3. A dropped new article takes everything: other pages may link to it.
  const lostArticle = files.find((f) => reasonFor.has(f.path) && isNewArticlePage(f));
  if (lostArticle) {
    for (const file of files) if (!reasonFor.has(file.path)) reasonFor.set(file.path, `held back: the new article ${lostArticle.url} was dropped, and this run's pages were verified with it present`);
  }

  const include: string[] = [];
  const urls = new Set<string>();
  const lastmodUrls = new Set<string>();
  const dropped: PublishPlan["dropped"] = [];
  let tier: 0 | 1 | 2 = 0;
  for (const file of files) {
    const reason = reasonFor.get(file.path);
    if (reason) {
      dropped.push({ file: file.path, reason });
      continue;
    }
    include.push(file.path);
    for (const page of pagesOf(file)) {
      urls.add(page);
      if (!isOgImageFile(file.path)) lastmodUrls.add(page);
    }
    if (file.tier > tier) tier = file.tier;
  }
  // Pages the included noindex.json newly noindexes (a verdict without the list: every page that file names).
  const noindexFile = files.find((f) => f.path === "content/seo/noindex.json" && include.includes(f.path));
  const noindexed = new Set(noindexFile ? (Array.isArray(verdict.noindexAdded) ? verdict.noindexAdded : pagesOf(noindexFile)) : []);
  const checkUrls = [...urls].filter((u) => !noindexed.has(u)).sort();
  const pages = urls.size;
  const title = `seo-weekly: run ${runId.replace(/[^0-9A-Za-z-]/g, "")}, ${pages} page${pages === 1 ? "" : "s"}, tier ${tier}`;
  return {
    runId,
    include: include.sort(),
    urls: [...urls].sort(),
    lastmodUrls: [...lastmodUrls].sort(),
    checkUrls,
    tier,
    dropped,
    critic: (Array.isArray(critic?.verdicts) ? critic.verdicts : []).map((v) => ({ file: String(v.file), verdict: String(v.verdict), reasons: Array.isArray(v.reasons) ? v.reasons.map(String).slice(0, 5) : [] })),
    title,
  };
}

export function unexpectedStaged(plan: PublishPlan, staged: string[]): string[] {
  const allowed = new Set([...plan.include, ...PUBLISH_OWNED_FILES]);
  return staged.map((s) => s.trim()).filter(Boolean).filter((path) => !allowed.has(path));
}

async function main(args: Args): Promise<number> {
  const assertFile = flagString(args, "assert-staged");
  if (assertFile) {
    const plan = readJson<PublishPlan>(assertFile);
    const staged = readFileSync(0, "utf8").split("\n");
    const extra = unexpectedStaged(plan, staged);
    if (extra.length) {
      console.error(`REFUSING TO COMMIT — staged paths outside the publish plan:\n${extra.map((p) => `  ${p}`).join("\n")}`);
      return 1;
    }
    return 0;
  }
  const verdict = readJson<VerifyVerdict>(requireFlag(args, "verdict", "verdict.json"));
  const criticPath = flagString(args, "critic");
  const critic = criticPath && existsSync(criticPath) ? readJson<CriticVerdict>(criticPath) : null;
  const plan = buildPlan(flagString(args, "run-id", "local"), verdict, critic);
  const out = flagString(args, "out");
  if (out) writeJson(out, plan);
  // Title is built from a sanitized run id, an integer and a digit: safe for $GITHUB_OUTPUT.
  process.stdout.write(`tier=${plan.tier}\ntitle=${plan.title}\n`);
  console.error(`publish plan: ${plan.include.length} file(s), ${plan.dropped.length} dropped, tier ${plan.tier}`);
  return 0;
}

function selfTest(): void {
  const verdict: VerifyVerdict = {
    ok: true,
    patchSha256: "x",
    tier: 1,
    declaredUrls: ["/blog/a", "/blog/b", "/vs/c"],
    violations: [],
    caps: { files: 3, lines: 10, pages: 3, newArticles: 0, noindex: 0 },
    files: [
      { path: "app/blog/a/page.tsx", status: "M", tier: 0, url: "/blog/a", addedLines: 1, removedLines: 1 },
      { path: "app/blog/b/page.tsx", status: "M", tier: 1, url: "/blog/b", addedLines: 5, removedLines: 2 },
      { path: "app/vs/c/page.tsx", status: "M", tier: 1, url: "/vs/c", addedLines: 5, removedLines: 2 },
    ],
  };
  const plan = buildPlan("42", verdict, { verdicts: [{ file: "app/blog/b/page.tsx", verdict: "APPROVE", reasons: [] }, { file: "app/vs/c/page.tsx", verdict: "REJECT", reasons: ["unsourced price"] }] });
  check(plan.include.join() === "app/blog/a/page.tsx,app/blog/b/page.tsx", "tier-1 needs APPROVE; tier-0 passes");
  check(plan.dropped.length === 1 && plan.dropped[0].file === "app/vs/c/page.tsx", "rejected file dropped");
  check(plan.tier === 1 && plan.title === "seo-weekly: run 42, 2 pages, tier 1", "tier and title");
  const noCritic = buildPlan("42", verdict, null);
  check(noCritic.include.length === 1, "no critic → only tier 0 publishes");
  check(unexpectedStaged(plan, ["app/blog/a/page.tsx", "content/seo/lastmod.json", "seo/scripts/x.ts"]).join() === "seo/scripts/x.ts", "staged fence");
  check(buildPlan("4\n2; rm", verdict, null).title.startsWith("seo-weekly: run 42rm,"), "run id sanitized");
  const malformed = buildPlan("42", verdict, { verdicts: [{ file: "app/blog/b/page.tsx", verdict: "APPROVE" } as never, { file: "app/vs/c/page.tsx" } as never] });
  check(malformed.include.includes("app/blog/b/page.tsx") && malformed.dropped.some((d) => d.file === "app/vs/c/page.tsx"), "malformed critic entries neither crash nor approve");
  const article: VerifyVerdict = {
    ...verdict,
    files: [
      { path: "app/blog/new/page.tsx", status: "A", tier: 1, url: "/blog/new", urls: ["/blog/new"], addedLines: 90, removedLines: 0 },
      { path: "app/blog/new/opengraph-image.tsx", status: "A", tier: 1, url: "/blog/new", urls: ["/blog/new"], addedLines: 20, removedLines: 0 },
      { path: "lib/blog-posts.ts", status: "M", tier: 1, url: null, urls: ["/blog/new"], addedLines: 8, removedLines: 0 },
      { path: "app/blog/old/page.tsx", status: "M", tier: 0, url: "/blog/old", urls: ["/blog/old"], addedLines: 1, removedLines: 0 },
    ],
  };
  const approveAllBut = (file: string): CriticVerdict => ({ verdicts: article.files.map((f) => ({ file: f.path, verdict: f.path === file ? "REJECT" : "APPROVE", reasons: [] })) });
  check(buildPlan("7", article, approveAllBut("app/blog/new/page.tsx")).include.length === 0, "a dropped new article drops its group and every page that may link to it");
  const ogOnly = buildPlan("7", { ...verdict, files: [{ path: "app/blog/a/opengraph-image.tsx", status: "M", tier: 0, url: "/blog/a", urls: ["/blog/a"], addedLines: 1, removedLines: 1 }] }, null);
  check(ogOnly.urls.join() === "/blog/a" && ogOnly.lastmodUrls.length === 0, "an OG-only change is a changed page but not a lastmod bump");
  const prune = buildPlan("8", { ...verdict, noindexAdded: ["/blog/thin"], files: [{ path: "content/seo/noindex.json", status: "M", tier: 1, url: null, urls: ["/blog/thin"], addedLines: 1, removedLines: 0 }, { path: "app/blog/a/page.tsx", status: "M", tier: 0, url: "/blog/a", urls: ["/blog/a"], addedLines: 1, removedLines: 1 }] }, { verdicts: [{ file: "content/seo/noindex.json", verdict: "APPROVE", reasons: [] }] });
  check(prune.urls.join() === "/blog/a,/blog/thin" && prune.checkUrls.join() === "/blog/a", "a page the publish noindexes is not checked as a regression");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["assert-staged", "critic", "out", "run-id", "verdict"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
