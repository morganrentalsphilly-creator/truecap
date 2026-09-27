import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildPlan, pageGroups, pagesOf, type CriticVerdict } from "../../seo/scripts/publish-plan.ts";
import { bumpUrls } from "../../seo/scripts/lastmod.ts";
import { changedPaths, pathForFile, urlsFromCommitMessages } from "../../seo/scripts/post-deploy.ts";
import { headerComment, parseArgs, requireFlag, unknownFlags } from "../../seo/scripts/lib/cli.ts";
import type { VerifyFile, VerifyVerdict } from "../../seo/scripts/lib/types.ts";

/**
 * The publish side of the SEO loop: which files of a verified patch ship
 * (publish-plan.ts), which pages that touches (lastmod.ts, post-deploy.ts),
 * and the CLI harness every script runs under (lib/cli.ts). Scripts are run
 * under real Node where the behaviour is the process's (exit code, stdout).
 */

const ROOT = path.resolve(__dirname, "../..");
const SCRIPTS = path.join(ROOT, "seo", "scripts");
const tmpDirs: string[] = [];
afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});
const tmp = (): string => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "seo-publish-test-"));
  tmpDirs.push(dir);
  return dir;
};

function node(args: string[], env: Record<string, string> = {}, cwd = ROOT): { code: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", ...args], { cwd, env: { ...process.env, ...env }, encoding: "utf8", timeout: 60_000 });
  return { code: result.status ?? -1, stdout: result.stdout, stderr: result.stderr };
}

const file = (p: string, status: VerifyFile["status"], tier: 0 | 1 | 2, url: string | null, urls: string[]): VerifyFile => ({ path: p, status, tier, url, urls, addedLines: 1, removedLines: 0 });
const verdictOf = (files: VerifyFile[]): VerifyVerdict => ({
  ok: true,
  patchSha256: "0".repeat(64),
  tier: Math.max(0, ...files.map((f) => f.tier)) as 0 | 1 | 2,
  files,
  declaredUrls: [...new Set(files.flatMap((f) => f.urls ?? []))].sort(),
  violations: [],
  caps: { files: files.length, lines: files.length, pages: 1, newArticles: 0, noindex: 0 },
});
const critic = (entries: Array<[string, "APPROVE" | "REJECT"]>): CriticVerdict => ({ verdicts: entries.map(([f, v]) => ({ file: f, verdict: v, reasons: v === "REJECT" ? ["Pub 544 does not say that"] : [] })) });

// The issue's case: a new article (page, OG image, registry entry) plus a tier-0 edit elsewhere.
const NEW_PAGE = "app/blog/new-guide/page.tsx";
const NEW_OG = "app/blog/new-guide/opengraph-image.tsx";
const REGISTRY = "lib/blog-posts.ts";
const OLD_PAGE = "app/blog/old/page.tsx";
const articleVerdict = verdictOf([
  file(NEW_PAGE, "A", 1, "/blog/new-guide", ["/blog/new-guide"]),
  file(NEW_OG, "A", 1, "/blog/new-guide", ["/blog/new-guide"]),
  file(REGISTRY, "M", 1, null, ["/blog/new-guide"]),
  file(OLD_PAGE, "M", 0, "/blog/old", ["/blog/old"]),
]);

// ----------------------------------------------------------- publish-plan

describe("publish-plan: all or nothing per page group", () => {
  it("drops the whole run when the critic rejects a new article's page (nothing may link to a page that is not published)", () => {
    const plan = buildPlan("99", articleVerdict, critic([[NEW_PAGE, "REJECT"], [NEW_OG, "APPROVE"], [REGISTRY, "APPROVE"]]));
    expect(plan.include).toEqual([]);
    expect(plan.urls).toEqual([]);
    expect(plan.lastmodUrls).toEqual([]);
    const why = Object.fromEntries(plan.dropped.map((d) => [d.file, d.reason]));
    expect(why[NEW_PAGE]).toBe("critic REJECT: Pub 544 does not say that");
    expect(why[NEW_OG]).toMatch(/^held back with app\/blog\/new-guide\/page\.tsx: it changes the same page/);
    expect(why[REGISTRY]).toMatch(/^held back with app\/blog\/new-guide\/page\.tsx/);
    expect(why[OLD_PAGE]).toMatch(/^held back: the new article \/blog\/new-guide was dropped/);
  });

  it("drops the article with its registry entry when only the registry is rejected", () => {
    const plan = buildPlan("99", articleVerdict, critic([[NEW_PAGE, "APPROVE"], [NEW_OG, "APPROVE"], [REGISTRY, "REJECT"]]));
    expect(plan.include).toEqual([]);
  });

  it("keeps unrelated pages when a dropped group holds no new article", () => {
    const verdict = verdictOf([
      file("app/blog/a/page.tsx", "M", 1, "/blog/a", ["/blog/a"]),
      file("content/seo/market-facts.json", "M", 1, null, ["/blog/a", "/markets/x"]),
      file("app/blog/b/page.tsx", "M", 1, "/blog/b", ["/blog/b"]),
      file("app/blog/b/opengraph-image.tsx", "M", 0, "/blog/b", ["/blog/b"]),
    ]);
    const plan = buildPlan("5", verdict, critic([["app/blog/a/page.tsx", "APPROVE"], ["content/seo/market-facts.json", "REJECT"], ["app/blog/b/page.tsx", "APPROVE"]]));
    expect(plan.include).toEqual(["app/blog/b/opengraph-image.tsx", "app/blog/b/page.tsx"]);
    expect(plan.dropped.map((d) => d.file).sort()).toEqual(["app/blog/a/page.tsx", "content/seo/market-facts.json"]);
    expect(plan.urls).toEqual(["/blog/b"]);
  });

  it("lists every page a shared file changes, and bumps lastmod only for main-content changes", () => {
    const verdict = verdictOf([
      file("content/seo/market-facts.json", "M", 0, null, ["/markets/philadelphia", "/markets/pittsburgh"]),
      file("app/blog/c/opengraph-image.tsx", "M", 0, "/blog/c", ["/blog/c"]),
    ]);
    const plan = buildPlan("6", verdict, null);
    expect(plan.urls).toEqual(["/blog/c", "/markets/philadelphia", "/markets/pittsburgh"]);
    expect(plan.lastmodUrls).toEqual(["/markets/philadelphia", "/markets/pittsburgh"]);
    expect(plan.title).toBe("seo-weekly: run 6, 3 pages, tier 0");
    expect(bumpUrls(plan)).toEqual(["/markets/philadelphia", "/markets/pittsburgh"]);
  });

  it("never asks the post-deploy check to find a page indexable that this publish noindexes", () => {
    const verdict = { ...verdictOf([file("content/seo/noindex.json", "M", 1, null, ["/blog/thin"]), file("content/seo/market-facts.json", "M", 0, null, ["/markets/erie"])]), noindexAdded: ["/blog/thin"] };
    const plan = buildPlan("8", verdict, critic([["content/seo/noindex.json", "APPROVE"]]));
    expect(plan.urls).toEqual(["/blog/thin", "/markets/erie"]);
    expect(plan.checkUrls).toEqual(["/markets/erie"]);
    // A verdict without the list: every page noindex.json names is left out.
    const { noindexAdded: _dropped, ...older } = verdict;
    expect(buildPlan("8", older, critic([["content/seo/noindex.json", "APPROVE"]])).checkUrls).toEqual(["/markets/erie"]);
  });

  it("reads a verdict written before VerifyFile.urls existed", () => {
    expect(pagesOf({ url: "/blog/a" })).toEqual(["/blog/a"]);
    expect(pagesOf({ url: null })).toEqual([]);
    expect(pageGroups([file("a", "M", 0, "/x", ["/x"]), file("b", "M", 0, null, ["/x", "/y"]), file("c", "M", 0, "/y", ["/y"]), file("d", "M", 0, null, [])])).toEqual([["a", "b", "c"], ["d"]]);
    expect(bumpUrls({ urls: ["/blog/a"] })).toEqual(["/blog/a"]);
    expect(() => bumpUrls({})).toThrow(/no lastmodUrls or urls/);
  });

  it("the CLI plans the issue's case to publish nothing", () => {
    const dir = tmp();
    writeFileSync(path.join(dir, "v.json"), JSON.stringify(articleVerdict));
    writeFileSync(path.join(dir, "c.json"), JSON.stringify(critic([[NEW_PAGE, "REJECT"], [NEW_OG, "APPROVE"], [REGISTRY, "APPROVE"]])));
    const out = path.join(dir, "plan.json");
    const run = node([path.join(SCRIPTS, "publish-plan.ts"), "--verdict", path.join(dir, "v.json"), "--critic", path.join(dir, "c.json"), "--run-id", "99", "--out", out]);
    expect(run.code, run.stderr).toBe(0);
    const plan = JSON.parse(readFileSync(out, "utf8"));
    expect(plan.include).toEqual([]);
    expect(plan.urls).toEqual([]);
  });
});

// ------------------------------------------------------------ post-deploy

describe("post-deploy", () => {
  it("maps page AND OG-image files to their page, and reads the publish job's SEO-URLs trailer", () => {
    expect(pathForFile("app/blog/x/opengraph-image.tsx")).toBe("/blog/x");
    expect(pathForFile("content/seo/market-facts.json")).toBeNull();
    const pr = { files: ["content/seo/market-facts.json", "app/vs/stessa/opengraph-image.tsx"], commitMessages: ["seo-weekly: run 9, 3 pages, tier 1\n\nSEO-URLs: /markets/philadelphia,/markets/pittsburgh,/vs/stessa", "Merge branch 'main' into seo/9"] };
    expect(changedPaths(pr)).toEqual(["/markets/philadelphia", "/markets/pittsburgh", "/vs/stessa"]);
    // A prune that also touched the page: the trailer (the plan's checkUrls) left the noindexed page out on purpose.
    expect(changedPaths({ files: ["content/seo/noindex.json", "app/blog/thin/page.tsx"], commitMessages: ["t\n\nSEO-URLs: "] })).toEqual([]);
    // A PR from before the trailer: page and OG files map to their page.
    expect(changedPaths({ files: ["app/blog/a/page.tsx", "app/vs/b/opengraph-image.tsx", "lib/blog-posts.ts"], commitMessages: ["seo-weekly: run 1"] })).toEqual(["/blog/a", "/vs/b"]);
    expect(urlsFromCommitMessages(["SEO-URLs: /blog/a,//evil.test/x,javascript:alert(1),/blog/../admin, /blog/b "])).toEqual(["/blog/a", "/blog/b"]);
  });

  it("keeps IndexNow's own stdout out of its result, and records an IndexNow failure instead of throwing", () => {
    const dir = tmp();
    // A stand-in for indexnow.ts: its JSON summary on stdout, then a rejected batch.
    const fake = path.join(dir, "fake-indexnow.ts");
    writeFileSync(fake, 'console.log(JSON.stringify({ dryRun: false, submitted: 0 }, null, 2));\nconsole.error("indexnow: batch rejected");\nprocess.exitCode = 1;\n');
    const ok = path.join(dir, "ok-indexnow.ts");
    writeFileSync(ok, 'console.log(JSON.stringify({ submitted: 1 }, null, 2));\n');
    // Run post-deploy's ping in a child process whose stdout is the result, exactly as the workflow reads it.
    const harness = path.join(dir, "harness.ts");
    writeFileSync(
      harness,
      [
        `import { pingIndexNow } from ${JSON.stringify(path.join(SCRIPTS, "post-deploy.ts"))};`,
        `const failed = pingIndexNow(["/blog/a"], ${JSON.stringify(fake)});`,
        `const passed = pingIndexNow(["/blog/a"], ${JSON.stringify(ok)});`,
        "console.log(JSON.stringify({ failed, passed, regressions: [] }));",
      ].join("\n"),
    );
    const run = node([harness]);
    expect(run.code, run.stderr).toBe(0);
    const doc = JSON.parse(run.stdout) as { failed: unknown; passed: unknown };
    expect(doc.failed).toEqual({ ok: false, error: "indexnow.ts exited 1" });
    expect(doc.passed).toEqual({ ok: true, error: null });
    expect(run.stderr).toContain("indexnow: batch rejected");
  });
});

// ---------------------------------------------------------------- lib/cli

describe("CLI harness", () => {
  it("names a missing required flag", () => {
    expect(() => requireFlag(parseArgs([]), "verdict", "verdict.json")).toThrow("--verdict <verdict.json> is required");
    expect(() => requireFlag(parseArgs(["--verdict"]), "verdict", "verdict.json")).toThrow("--verdict <verdict.json> is required");
    expect(requireFlag(parseArgs(["--verdict", "v.json"]), "verdict")).toBe("v.json");
    expect(unknownFlags(parseArgs(["--dryrun", "--help", "--self-test", "--mode=auto"]), ["mode"])).toEqual(["dryrun"]);
    expect(headerComment("/**\n * one\n *\n * two\n */\nexport {}")).toBe("one\n\ntwo");
  });

  it.each([
    ["publish-plan.ts", [], "--verdict <verdict.json> is required"],
    ["render-diff.ts", [], "--base <base-hashes.json> is required"],
    ["lastmod.ts", ["bump"], "--plan <publish-plan.json> is required"],
  ] as const)("%s says which flag is missing", (script, extra, message) => {
    const run = node([path.join(SCRIPTS, script), ...extra], { SEO_DATA_DIR: tmp() });
    expect(run.code).toBe(1);
    expect(run.stderr).toContain(message);
    expect(run.stderr).not.toContain("ENOENT");
  });

  // Each of these writes real files (report, digest, run flags, brakes) when it runs.
  const WRITERS = ["report.ts", "run-flags.ts", "brakes.ts", "publish-plan.ts", "ledger.ts"];

  it.each(WRITERS)("%s --help prints its usage and writes nothing", (script) => {
    const state = tmp();
    const data = path.join(state, "data");
    mkdirSync(data, { recursive: true });
    const run = node([path.join(SCRIPTS, script), "--help"], { SEO_STATE_DIR: state, SEO_DATA_DIR: data, SEO_TODAY: "2026-09-27" });
    expect(run.code, run.stderr).toBe(0);
    expect(run.stdout.length).toBeGreaterThan(40);
    expect(run.stdout).not.toMatch(/^\s*\/\*\*/);
    expect(readdirSync(data)).toEqual([]);
    expect(existsSync(path.join(state, "reports"))).toBe(false);
  });

  it.each(WRITERS)("%s refuses an unknown flag before doing anything", (script) => {
    const state = tmp();
    const data = path.join(state, "data");
    mkdirSync(data, { recursive: true });
    const run = node([path.join(SCRIPTS, script), "--dryrun"], { SEO_STATE_DIR: state, SEO_DATA_DIR: data, SEO_TODAY: "2026-09-27" });
    expect(run.code).toBe(1);
    expect(run.stderr).toContain("unknown flag --dryrun (see --help)");
    expect(readdirSync(data)).toEqual([]);
    expect(existsSync(path.join(state, "reports"))).toBe(false);
  });

  it("every script declares its flags", async () => {
    const missing: string[] = [];
    for (const name of readdirSync(SCRIPTS).filter((f) => f.endsWith(".ts"))) {
      const source = readFileSync(path.join(SCRIPTS, name), "utf8");
      if (!/runMain\(import\.meta\.url, main, selfTest, \{ flags: CLI_FLAGS \}\);/.test(source)) missing.push(name);
      const mod = (await import(path.join(SCRIPTS, name))) as { CLI_FLAGS?: readonly string[] };
      const declared = new Set(mod.CLI_FLAGS ?? []);
      // Every literal flag the script reads is declared (report.ts reads four through a helper).
      for (const m of source.matchAll(/(?:flagString|flagNumber|hasFlag|requireFlag)\(args, "([a-z0-9-]+)"/g)) if (!declared.has(m[1])) missing.push(`${name}: --${m[1]}`);
    }
    expect(missing).toEqual([]);
  });
});
