import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  applyHunks,
  articleDirOf,
  baseFromRecord,
  checkAst,
  checkContentJson,
  checkGuardBaseline,
  checkImports,
  checkLinks,
  checkLiterals,
  demotedFromBrakesFile,
  deriveTier,
  embeddedUrls,
  gitSandbox,
  hrefViolation,
  main,
  parseNumstatZ,
  parsePatch,
  parseQuotedName,
  pathViolations,
  pruneTierDuringCalibration,
  readRunFlags,
  scannerFindings,
  structureViolations,
  urlForFile,
  verify,
  wholeFileViolations,
  workingTreePatch,
  type VerifyInput,
} from "../../seo/scripts/verify-static.ts";
import { parseArgs } from "../../seo/scripts/lib/cli.ts";
import { loadConfig } from "../../seo/scripts/lib/config.ts";
import type { VerifyVerdict } from "../../seo/scripts/lib/types.ts";

/**
 * seo/scripts/verify-static.ts — the fence between the model's patch and a
 * mergeable PR. Patches here are REAL `git diff --binary` output, built in
 * throwaway repos under the OS temp dir, so the parser is tested against the
 * format git actually emits (quoted names, trailing TABs, binary payloads).
 * No network: the sitemap is always passed in.
 */

const config = loadConfig();
/** A backslash, and a `\\uXXXX` escape as it appears in TS source, built by concatenation so no editor decodes them. */
const BS = "\\";
const U = (hex: string): string => `${BS}${BS}u${hex}`;
const tmpDirs: string[] = [];
afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});

function tmp(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "seo-verify-static-test-"));
  tmpDirs.push(dir);
  return dir;
}

function gitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: os.devNull };
  for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"]) delete env[key];
  return env;
}

function git(cwd: string, args: string[]): Buffer {
  return execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args], {
    cwd,
    env: gitEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

type Change = string | null | { symlink: string } | { executable: true };

/** Commit `base`, apply `after`, return `git diff --binary --cached HEAD`. */
function makePatch(base: Record<string, string>, after: Record<string, Change>): Buffer {
  const dir = tmp();
  git(dir, ["init", "-q"]);
  const write = (file: string, content: string): void => {
    const abs = path.join(dir, file);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  };
  for (const [file, content] of Object.entries(base)) write(file, content);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "--allow-empty", "-m", "base"]);
  for (const [file, change] of Object.entries(after)) {
    const abs = path.join(dir, file);
    if (change === null) unlinkSync(abs);
    else if (typeof change === "string") write(file, change);
    else if ("symlink" in change) {
      if (existsSync(abs)) unlinkSync(abs);
      mkdirSync(path.dirname(abs), { recursive: true });
      symlinkSync(change.symlink, abs);
    } else chmodSync(abs, 0o755);
  }
  git(dir, ["add", "-A"]);
  return git(dir, ["diff", "--binary", "--cached", "HEAD"]);
}

function edit(source: string, from: string, to: string): string {
  if (!source.includes(from)) throw new Error(`fixture edit: ${JSON.stringify(from)} not found`);
  return source.replace(from, to);
}

const BLOG = "app/blog/cap-rate-guide/page.tsx";
const BASE_PAGE = [
  'import type { Metadata } from "next";',
  'import Link from "next/link";',
  "",
  'const TITLE = "Cap rate guide";',
  'const DESCRIPTION = "How to read a cap rate.";',
  'const PUBLISHED_AT = "2026-07-01";',
  'const MODIFIED_AT = "2026-07-01";',
  "",
  "export const metadata: Metadata = {",
  "  title: TITLE,",
  "  description: DESCRIPTION,",
  '  openGraph: { title: TITLE, description: "Read a cap rate." },',
  "};",
  "",
  "const articleLd = {",
  '  "@context": "https://schema.org",',
  '  "@type": "Article",',
  "  headline: TITLE,",
  "  datePublished: PUBLISHED_AT,",
  "  dateModified: MODIFIED_AT,",
  "};",
  "",
  "export default function Page() {",
  "  return (",
  "    <main>",
  '      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />',
  "      <h1>{TITLE}</h1>",
  "      <p>Cap rate is net operating income divided by price.</p>",
  "      <p>Read the guide on DSCR next.</p>",
  '      <p>See <Link href="/legacy-page">the old page</Link>.</p>',
  "    </main>",
  "  );",
  "}",
  "",
].join("\n");

const SITEMAP = ["/", "/blog/cap-rate-guide", "/blog/dscr", "/glossary/noi", "/markets/philadelphia", "/pricing", "/vs/stessa"];

function manifestFor(files: string[], extra: Record<string, unknown> = {}): unknown {
  return {
    runId: "42",
    changes: files.map((file) => ({ path: urlForFile(file) ?? "/blog/cap-rate-guide", file, skill: "seo-ctr", changeType: "title-meta", summary: "s", ...extra })),
    skipped: [],
    issues: [],
  };
}

function run(base: Record<string, string>, after: Record<string, Change>, overrides: Partial<VerifyInput> = {}): VerifyVerdict {
  return verify({
    patch: makePatch(base, after),
    base: baseFromRecord(base),
    sitemap: SITEMAP,
    manifest: manifestFor(Object.keys(after)),
    config,
    sandbox: null,
    ...overrides,
  });
}

const rules = (verdict: VerifyVerdict): string[] => verdict.violations.map((v) => v.rule);
const details = (verdict: VerifyVerdict): string => verdict.violations.map((v) => `${v.rule}: ${v.detail}`).join("\n");

// ------------------------------------------------------------ planted cases

describe("planted cases (the brief's must-fail and must-pass list)", () => {
  it("rejects a blog page importing @/lib/supabase/admin", () => {
    const v = run({ [BLOG]: BASE_PAGE }, { [BLOG]: edit(BASE_PAGE, 'import Link from "next/link";', 'import Link from "next/link";\nimport { createAdminSupabaseClient } from "@/lib/supabase/admin";') });
    expect(v.ok).toBe(false);
    expect(v.violations.some((x) => x.rule === "import" && x.detail.includes("@/lib/supabase/admin"))).toBe(true);
  });

  it("rejects a new app/blog/x/route.ts", () => {
    const v = run({ [BLOG]: BASE_PAGE }, { "app/blog/x/route.ts": "export function GET() { return new Response('x'); }\n" });
    expect(v.ok).toBe(false);
    expect(rules(v)).toEqual(expect.arrayContaining(["path-not-allowed", "forbidden-file-name", "article-file-name"]));
  });

  it('rejects a "use client" directive', () => {
    const v = run({ [BLOG]: BASE_PAGE }, { [BLOG]: `"use client";\n${BASE_PAGE}` });
    expect(v.ok).toBe(false);
    expect(v.violations.some((x) => x.rule === "directive" && x.detail.includes("use client"))).toBe(true);
  });

  it('rejects process.env reached through globalThis["pro"+"cess"]', () => {
    const v = run({ [BLOG]: BASE_PAGE }, { [BLOG]: edit(BASE_PAGE, 'const MODIFIED_AT = "2026-07-01";', 'const MODIFIED_AT = "2026-07-01";\nconst leak = globalThis["pro" + "cess"].env;') });
    expect(v.ok).toBe(false);
    expect(rules(v)).toEqual(expect.arrayContaining(["identifier", "computed-access"]));
    expect(v.files[0].tier).toBe(1);
  });

  it("rejects a JSON-LD string containing </script>", () => {
    const v = run({ [BLOG]: BASE_PAGE }, { [BLOG]: edit(BASE_PAGE, "  headline: TITLE,", '  headline: "Cap rates</script><script>alert(1)</script>",') });
    expect(v.ok).toBe(false);
    expect(v.violations.some((x) => x.rule === "literal" && x.detail.includes("</"))).toBe(true);
  });

  it("rejects an external link to a non-primary domain", () => {
    const v = run({ [BLOG]: BASE_PAGE }, { [BLOG]: edit(BASE_PAGE, "<p>Read the guide on DSCR next.</p>", '<p>Read <a href="https://www.example-blog.com/dscr">this DSCR guide</a> next.</p>') });
    expect(v.ok).toBe(false);
    expect(v.violations.some((x) => x.rule === "link" && x.detail.includes("not a primary-source domain"))).toBe(true);
  });

  it("passes a title-only change as tier 0", () => {
    const v = run({ [BLOG]: BASE_PAGE }, { [BLOG]: edit(BASE_PAGE, 'const TITLE = "Cap rate guide";', 'const TITLE = "What Is a Good Cap Rate? (2026 Guide)";') });
    expect(details(v)).toBe("");
    expect(v.ok).toBe(true);
    expect(v.tier).toBe(0);
    expect(v.files).toEqual([{ path: BLOG, status: "M", tier: 0, url: "/blog/cap-rate-guide", urls: ["/blog/cap-rate-guide"], addedLines: 1, removedLines: 1 }]);
    expect(v.declaredUrls).toEqual(["/blog/cap-rate-guide"]);
  });

  it("rejects an out-of-allow-list path (components/x.tsx)", () => {
    const v = run({ [BLOG]: BASE_PAGE }, { "components/x.tsx": "export const X = 1;\n" });
    expect(v.ok).toBe(false);
    expect(rules(v)).toEqual(expect.arrayContaining(["path-not-allowed", "path-denied"]));
  });

  it("rejects a symlink mode", () => {
    const v = run({ [BLOG]: BASE_PAGE }, { "app/blog/evil/page.tsx": { symlink: "../../../.env" } });
    expect(v.ok).toBe(false);
    expect(rules(v)).toContain("symlink");
  });

  it("rejects a deletion", () => {
    const v = run({ [BLOG]: BASE_PAGE, "app/blog/dscr/page.tsx": BASE_PAGE }, { "app/blog/dscr/page.tsx": null });
    expect(v.ok).toBe(false);
    expect(rules(v)).toContain("deletion");
    expect(v.files[0].status).toBe("D");
  });

  it("derives tier 1 for a body rewrite even when a forged manifest claims tier 0", () => {
    const forged = { runId: "1", changes: [{ path: "/blog/cap-rate-guide", file: BLOG, skill: "seo-ctr", changeType: "title-meta", summary: "title only", tier: 0 }], skipped: [], issues: [] };
    const v = run(
      { [BLOG]: BASE_PAGE },
      { [BLOG]: edit(BASE_PAGE, "<p>Cap rate is net operating income divided by price.</p>", "<p>Cap rate divides net operating income by the purchase price, before financing.</p>") },
      { manifest: forged },
    );
    expect(details(v)).toBe("");
    expect(v.files[0].tier).toBe(1);
    expect(v.tier).toBe(1);
  });

  it("rejects a guard-baseline loosening", () => {
    const baseline = JSON.stringify({ $comment: "c", longTitles: { "/blog/a": 55 }, limits: { maxTitleConstChars: 50 } }, null, 2);
    const looser = JSON.stringify({ $comment: "c", longTitles: { "/blog/a": 61 }, limits: { maxTitleConstChars: 50 } }, null, 2);
    const v = run({ "docs/seo/guard-baseline.json": baseline }, { "docs/seo/guard-baseline.json": looser }, { manifest: { changes: [{ file: "docs/seo/guard-baseline.json", path: "/blog/cap-rate-guide" }] } });
    expect(v.ok).toBe(false);
    expect(v.violations.some((x) => x.rule === "guard-baseline" && x.detail.includes("loosened 55 → 61"))).toBe(true);
  });
});

// ------------------------------------------------------------------- parser

describe("parsePatch", () => {
  it("parses paths with spaces (git appends a TAB on ---/+++)", () => {
    const patch = makePatch({ "app/blog/a b/page.tsx": "one\ntwo\n" }, { "app/blog/a b/page.tsx": "one\ntwo changed\n" }).toString("utf8");
    expect(patch).toContain("--- a/app/blog/a b/page.tsx\t");
    const parsed = parsePatch(patch);
    expect(parsed.errors).toEqual([]);
    expect(parsed.files.map((f) => [f.path, f.status, f.addedLines, f.removedLines])).toEqual([["app/blog/a b/page.tsx", "M", 1, 1]]);
    expect(pathViolations("app/blog/a b/page.tsx", config).map((v) => v.rule)).toEqual(["path-unsafe"]);
  });

  it("decodes C-quoted names with TABs and octal UTF-8 bytes", () => {
    const patch = makePatch({}, { "app/blog/tab\té/page.tsx": "x\n" }).toString("utf8");
    expect(patch).toContain('"b/app/blog/tab\\t\\303\\251/page.tsx"');
    const parsed = parsePatch(patch);
    expect(parsed.errors).toEqual([]);
    expect(parsed.files[0].path).toBe("app/blog/tab\té/page.tsx");
    expect(parsed.files[0].status).toBe("A");
    expect(parseQuotedName('"a\\"b\\\\c"', 0)).toEqual({ value: 'a"b\\c', end: 9 });
    expect(parseQuotedName('"\\777"', 0)).toBeNull();
  });

  it("recognises renames, mode changes, binaries, symlinks and deletions", () => {
    const patch = makePatch(
      { "app/blog/r/old.tsx": "a\nb\nc\nd\n", "app/blog/m/page.tsx": "m\n", "app/blog/d/page.tsx": "gone\n" },
      {
        "app/blog/r/old.tsx": null,
        "app/blog/r/new.tsx": "a\nb\nc\nd\n",
        "app/blog/m/page.tsx": { executable: true },
        "app/blog/d/page.tsx": null,
        "app/blog/b/og.png": "\u0000\u0001\u0002",
        "app/blog/s/page.tsx": { symlink: "../x" },
      },
    ).toString("utf8");
    const parsed = parsePatch(patch);
    expect(parsed.errors).toEqual([]);
    const byPath = new Map(parsed.files.map((f) => [f.path, f]));
    expect(byPath.get("app/blog/r/new.tsx")?.isRename).toBe(true);
    expect(byPath.get("app/blog/m/page.tsx")?.status).toBe("T");
    expect(byPath.get("app/blog/d/page.tsx")?.status).toBe("D");
    expect(byPath.get("app/blog/b/og.png")?.isBinary).toBe(true);
    expect(byPath.get("app/blog/s/page.tsx")?.newMode).toBe("120000");
    const structural = parsed.files.flatMap(structureViolations).map((v) => v.rule).sort();
    expect(structural).toEqual(["binary", "deletion", "file-mode", "mode-change", "rename", "symlink"]);
  });

  it("is strict: preamble, trailing garbage, truncation, name disagreement and duplicates are errors", () => {
    const good = makePatch({ [BLOG]: "a\nb\n" }, { [BLOG]: "a\nc\n" }).toString("utf8");
    expect(parsePatch(good).errors).toEqual([]);
    expect(parsePatch(`From: someone\n${good}`).errors[0]).toMatch(/expected a "diff --git" header/);
    expect(parsePatch(`${good}--- a/x\n+++ b/x\n`).errors[0]).toMatch(/unexpected line after a file's hunks/);
    expect(parsePatch(good.replace(/\+c\n$/, "")).errors[0]).toMatch(/truncated/);
    expect(parsePatch(good.replace(`+++ b/${BLOG}`, "+++ b/app/blog/other/page.tsx")).errors[0]).toMatch(/disagrees with the diff header/);
    expect(parsePatch(`${good}${good}`).errors[0]).toMatch(/appears twice/);
    expect(parsePatch(good.replace(" a\n", "\n")).errors[0]).toMatch(/does not fit its hunk/);
  });

  it("round-trips post-images exactly, including missing final newlines", () => {
    const cases: Array<[string, string]> = [
      ["a\nb\nc\n", "z\na\nb\nc\n"],
      ["a\nb\nc\n", "a\nb\nc\nd"],
      ["a\nb\nc", "a\nb\nc\n"],
      ["a\nb\nc\n", "a\nb"],
      ["1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n", "1\nX\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\nY\n14\n"],
      ["", "fresh\n"],
    ];
    for (const [before, after] of cases) {
      const base: Record<string, string> = before === "" ? {} : { [BLOG]: before };
      const parsed = parsePatch(makePatch(base, { [BLOG]: after }).toString("utf8"));
      expect(parsed.errors).toEqual([]);
      expect(applyHunks(before === "" ? null : before, parsed.files[0].hunks)).toBe(after);
    }
  });

  it("refuses to apply a hunk whose context does not match the base", () => {
    const parsed = parsePatch(makePatch({ [BLOG]: "a\nb\n" }, { [BLOG]: "a\nc\n" }).toString("utf8"));
    expect(() => applyHunks("a\nDIFFERENT\n", parsed.files[0].hunks)).toThrow(/does not match/);
  });

  it("parses git apply --numstat -z", () => {
    expect(parseNumstatZ("1\t2\tapp/blog/a b/page.tsx\u00003\t0\tx.json\u0000-\t-\tbin.png\u0000")).toEqual([
      { path: "app/blog/a b/page.tsx", added: 1, removed: 2 },
      { path: "x.json", added: 3, removed: 0 },
      { path: "bin.png", added: null, removed: null },
    ]);
  });
});

// -------------------------------------------------------------- path fences

describe("path fences", () => {
  it("allows only one-level article dirs with the article file names", () => {
    expect(pathViolations("app/blog/good-slug/page.tsx", config)).toEqual([]);
    expect(pathViolations("app/blog/good-slug/opengraph-image.tsx", config)).toEqual([]);
    expect(pathViolations("app/blog/a/b/page.tsx", config).map((v) => v.rule)).toContain("article-depth");
    expect(pathViolations("app/blog/Bad_Slug/page.tsx", config).map((v) => v.rule)).toContain("article-slug");
    expect(pathViolations("app/vs/stessa/opengraph-image.tsx", config).map((v) => v.rule)).toContain("path-not-allowed");
    expect(pathViolations("app/blog/topics/x/page.tsx", config).map((v) => v.rule)).toContain("path-denied");
    expect(pathViolations("app/blog/x/layout.tsx", config).map((v) => v.rule)).toContain("forbidden-file-name");
    expect(pathViolations("app/blog/../../proxy.ts", config).map((v) => v.rule)).toEqual(["path-unsafe"]);
    expect(pathViolations("content/seo/market-facts.json", config)).toEqual([]);
    expect(pathViolations("seo/config.json", config).map((v) => v.rule)).toEqual(expect.arrayContaining(["path-not-allowed", "path-denied"]));
  });

  it("derives page URLs from files through family.ts", () => {
    expect(urlForFile("app/blog/x/page.tsx")).toBe("/blog/x");
    expect(urlForFile("app/blog/x/opengraph-image.tsx")).toBe("/blog/x");
    expect(urlForFile("app/vs/stessa/page.tsx")).toBe("/vs/stessa");
    expect(urlForFile("app/research/fmr-2026/page.tsx")).toBe("/research/fmr-2026");
    expect(urlForFile("app/blog/topics/page.tsx")).toBeNull();
    expect(urlForFile("lib/blog-topics.ts")).toBeNull();
    expect(articleDirOf("app/blog/x/page.tsx")).toBe("app/blog/x");
    expect(articleDirOf("app/blog/page.tsx")).toBeNull();
  });

  it("refuses the publish-owned lastmod map in a model patch", () => {
    const v = run({ "content/seo/lastmod.json": "{}\n" }, { "content/seo/lastmod.json": '{"/blog/x":"2026-09-27"}\n' });
    expect(rules(v)).toContain("publish-owned");
  });
});

// ----------------------------------------------------------- code rules

describe("checkImports", () => {
  const page = (imports: string): string => `${imports}\nexport default function Page() { return <main /> }\n`;
  it("accepts the allow-list and rejects everything else", () => {
    expect(checkImports(BLOG, page('import Link from "next/link";\nimport { X } from "@/components/marketing/x";\nimport type { Metadata } from "next";'), config)).toEqual([]);
    for (const spec of ["@/lib/supabase/admin", "node:fs", "fs", "child_process", "server-only", "@/app/actions/billing", "@/lib/analytics/track", "lodash", "./data", "../x", "@/components/ui/../../lib/supabase/admin", "next/dist/server/x"]) {
      expect(checkImports(BLOG, page(`import x from "${spec}";`), config).length, spec).toBeGreaterThan(0);
    }
    expect(checkImports(BLOG, page('export * from "@/lib/stripe/client";'), config).length).toBe(1);
  });

  it("rejects dynamic import(), require() and import-equals", () => {
    expect(checkImports(BLOG, page('const m = import("next/link");'), config)[0].detail).toMatch(/dynamic import/);
    expect(checkImports(BLOG, page('const m = require("fs");'), config)[0].detail).toMatch(/require/);
    expect(checkImports("lib/blog-topics.ts", 'import fs = require("fs");\n', config)[0].detail).toMatch(/require/);
    expect(checkImports(BLOG, page('/// <reference path="../x.d.ts" />'), config)[0].detail).toMatch(/triple-slash/);
  });
});

describe("checkAst", () => {
  const body = (jsx: string, pre = ""): string => `${pre}\nexport default function Page() { return (<main>${jsx}</main>); }\n`;
  const astRules = (source: string): string[] => checkAst(BLOG, source).map((v) => v.rule);

  it("accepts the ordinary article surface", () => {
    expect(checkAst(BLOG, BASE_PAGE)).toEqual([]);
    expect(astRules(body("<details><summary>Q</summary><p>A</p></details><table><tbody><tr><td>1</td></tr></tbody></table>"))).toEqual([]);
    expect(astRules(body("<p>{ROWS[0]} {LOOKUP[\"cap-rate\"]}</p>", 'const ROWS = ["a"]; const LOOKUP: Record<string, string> = { "cap-rate": "x" };'))).toEqual([]);
  });

  it("rejects directives anywhere, including inline server actions", () => {
    expect(astRules(body("<p />", 'async function save() { "use server"; }'))).toContain("directive");
    expect(astRules(`"use client";\n${body("<p />")}`)).toContain("directive");
  });

  it("rejects denied identifiers and non-literal computed access", () => {
    for (const snippet of ["const e = process.env;", "const f = fetch;", "const g = window;", "const h = ({}).constructor;", "const i = new Function('x');", "eval('1');", "const j = Buffer.from('x');", "const k = String.fromCharCode(112);"]) {
      expect(astRules(body("<p />", snippet)), snippet).toContain("identifier");
    }
    expect(astRules(body("<p />", 'const k = "con" + "structor"; const F = [][k];'))).toContain("computed-access");
    expect(astRules(body("<p />", 'const F = []["constructor"];'))).toContain("computed-access");
    expect(astRules(body("<p />", "const m = import.meta.url;"))).toContain("identifier");
  });

  it("rejects denied member names written as strings (no Identifier node is ever created for them)", () => {
    // The reviewer's probe: this hands the page the Function constructor at module top level.
    const leak = 'const { "constructor": F } = () => 0;\nconst leak = F("return this.pro" + "cess.env.X")();';
    expect(checkAst(BLOG, body("<p />", leak)).map((v) => v.detail)).toEqual([expect.stringMatching(/the string "constructor" names a denied member/)]);
    for (const snippet of [
      `const { "${BS}u0063onstructor": F } = () => 0;`, // a unicode escape cooks to the same key
      "const { 'constructor': F } = () => 0;",
      "const { `constructor`: F } = () => 0;",
      'const x = { "__proto__": null };',
      'const o = { "prototype"() { return 1; } };',
      'const has = "constructor" in ({});',
      'const o = { get "constructor"() { return 1; } };',
    ]) {
      expect(astRules(body("<p />", snippet)), snippet).toContain("identifier");
    }
    expect(astRules(body("<p />", 'const { "__html": h } = JSON.parse("{}");'))).toContain("dangerous-html");
    // Whole-string match only: prose that mentions a denied word is fine.
    expect(astRules(body("<p />", 'const s = "the escrow process"; const t = "module 2: exports";'))).toEqual([]);
  });

  it("rejects mutation of anything but a local variable (a reassigned JSON.stringify fakes the JSON-LD form)", () => {
    for (const snippet of [
      "JSON.stringify = (x: unknown) => String(x);",
      'JSON["stringify"] = (x: unknown) => String(x);',
      "const a = [0]; a[0] += 1;",
      "const o = { n: 1 }; o.n++;",
      "const o = { n: 1 }; delete o.n;",
      "let f; ({ stringify: f } = JSON); [JSON.parse] = [f];",
      "for (JSON.stringify of [String]) {}",
    ]) {
      expect(astRules(body("<p />", snippet)), snippet).toContain("mutation");
    }
    expect(astRules(body("<p />", "const x = Object.assign(JSON, { stringify: String });"))).toContain("identifier");
    expect(astRules(body("<p />", "let n = 0; n += 1; n++; for (const k of [1]) { n = k; }"))).toEqual([]);
  });

  it("allows dangerouslySetInnerHTML only as a JSON-LD script", () => {
    const ok = [
      '<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />',
      '<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld, null, 2) }} />',
      `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "${U("003c")}") }} />`,
      `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "${U("003c")}").replace(/>/g, "${U("003e")}").replaceAll(/&/g, "${U("0026")}") }} />`,
    ];
    for (const jsx of ok) expect(astRules(body(jsx, "const ld = {};")), jsx).toEqual([]);
    const bad: Array<[string, string]> = [
      ['<div dangerouslySetInnerHTML={{ __html: "<b>x</b>" }} />', "dangerous-html"],
      ['<script type="text/javascript" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />', "jsx-script"],
      ['<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: raw }} />', "jsx-script"],
      ['<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld, (k, v) => v) }} />', "jsx-script"],
      ['<script src="https://evil.example/x.js" />', "jsx-script"],
      ["<div {...{ dangerouslySetInnerHTML: { __html: raw } }} />", "jsx-spread"],
      ['<iframe src="https://evil.example" />', "jsx-element"],
      ["<form action={go}><p /></form>", "jsx-element"],
      ["<p onClick={go}>x</p>", "jsx-attribute"],
    ];
    for (const [jsx, rule] of bad) expect(astRules(body(jsx, 'const ld = {}; const raw = "x"; const go = "y";')), jsx).toContain(rule);
    expect(astRules(body("<p />", 'const opts = { __html: "x" };'))).toContain("dangerous-html");
  });

  it("accepts only EXACT one-character escapes on top of JSON.stringify (a replace chain can rebuild markup)", () => {
    const ld = (html: string): string => `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ${html} }} />`;
    const bad = [
      // The reviewer's payload: `$1` puts the `<` back in front of `/script>` after the literal scan passed.
      `JSON.stringify({ a: "<Q/script><img src=x onerror=alert(1)>" }).replace(/"(<)Q/, '""}$1')`,
      // A chain that DELETES characters turns a checked literal into a breaker.
      'JSON.stringify({ a: "<Z/script>" }).replace(/Z/g, "")',
      `JSON.stringify(ld).replace(/</g, "${U("003e")}")`, // regex and replacement do not pair up
      `JSON.stringify(ld).replace("<", "${U("003c")}")`, // string pattern: first occurrence only
      `JSON.stringify(ld).replace(/</gi, "${U("003c")}")`, // flags differ
      `JSON.stringify(ld).replace(/</g, "${U("003c")}", 1)`,
      `JSON.stringify(ld).trim()`,
      // One syntactic argument, but a replacer function at runtime.
      "JSON.stringify(...[ld, (k: string, v: unknown) => v])",
    ];
    for (const html of bad) expect(astRules(body(ld(html), "const ld = {};")), html).toContain("jsx-script");
  });

  it("refuses jsonLdScript(...) until a real helper exists, aliased or not", () => {
    const script = '<script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript("x")} />';
    // Any allow-listed export could be aliased to the trusted name.
    expect(astRules(body(script, 'import { cn as jsonLdScript } from "@/lib/utils";'))).toContain("jsx-script");
    expect(astRules(body(script, 'import { jsonLdScript } from "@/components/seo/json-ld";'))).toContain("jsx-script");
    expect(astRules(body(script, "function jsonLdScript(x: unknown) { return x; }"))).toContain("jsx-script");
  });

  it("reports TypeScript parse errors instead of trusting a recovered tree", () => {
    expect(astRules("export default function Page( { return <main> }\n")).toContain("ts-parse");
  });
});

describe("hardening beyond the brief's list (each had zero uses in the corpus)", () => {
  const body = (jsx: string, pre = ""): string => `${pre}\nexport default function Page() { return (<main>${jsx}</main>); }\n`;
  const astRules = (source: string, file = BLOG): string[] => checkAst(file, source).map((v) => v.rule);

  it("route modules export only what pages and OG images export", () => {
    expect(astRules(body("<p />", 'export const dynamic = "force-dynamic";'))).toContain("route-export");
    expect(astRules(body("<p />", "export const revalidate = 0;"))).toContain("route-export");
    expect(astRules(body("<p />", "export async function generateMetadata() { return {}; }"))).toContain("route-export");
    expect(astRules(body("<p />", 'const x = 1;\nexport { x as runtime };'))).toContain("route-export");
    expect(astRules(body("<p />", "export type Row = { a: string };\nexport const metadata = {};"))).toEqual([]);
    const og = 'import { ImageResponse } from "next/og";\nexport const alt = "x";\nexport const size = { width: 1, height: 1 };\nexport const contentType = "image/png";\nexport default function Image() { return new ImageResponse(<div />); }\n';
    expect(checkAst("app/blog/x/opengraph-image.tsx", og)).toEqual([]);
    expect(checkAst("app/blog/x/opengraph-image.tsx", `${og}export const runtime = "edge";\n`).map((v) => v.rule)).toContain("route-export");
    expect(checkAst("lib/blog-topics.ts", "export const BLOG_TOPICS = [];\nexport function helper() { return 1; }\n")).toEqual([]);
  });

  it("globals the fence relies on may not be redeclared", () => {
    expect(astRules(body("<p />", 'const JSON = { stringify: () => "x" };'))).toContain("shadowing");
    expect(astRules(body("<p />", "function f(Object: unknown) { return Object; }"))).toContain("shadowing");
    expect(astRules(body("<p />", 'import { JSON } from "@/lib/utils";'))).toContain("shadowing");
  });

  it("computed keys in object literals are computed access too", () => {
    expect(astRules(body("<p />", 'const k = "x"; const o = { [k]: 1 };'))).toContain("computed-access");
    expect(astRules(body("<p />", 'const o = { ["constructor"]: 1 };'))).toContain("computed-access");
    expect(astRules(body("<p />", 'const o = { ["cap-rate"]: 1, [2]: 2 };'))).toEqual([]);
  });

  it("browser globals are refused as references but fine as property names", () => {
    expect(astRules(body("<p />", 'const rows = [{ location: "Philadelphia", document: "Lease" }]; const d = rows[0].document;'))).toEqual([]);
    expect(astRules(body("<p />", "const c = document.cookie;"))).toContain("identifier");
    expect(astRules(body("<p />", "const w = { location };"))).toContain("identifier");
  });

  it("reflection that reaches constructors without naming them is refused", () => {
    expect(astRules(body("<p />", "const d = Object.getOwnPropertyDescriptors(Object);"))).toContain("identifier");
    expect(astRules(body("<p />", "Error.prepareStackTrace = (e, s) => s;"))).toContain("identifier");
  });

  it("JSX pragma comments are imports in disguise", () => {
    expect(checkImports(BLOG, `/** @jsxImportSource @/lib/supabase */\n${body("<p />")}`, config)[0].detail).toMatch(/pragma/);
  });

  it("finds URLs embedded in prose and URLs split across strings", () => {
    const sitemap = new Set(SITEMAP);
    const linkDetails = (source: string): string[] => checkLinks(BLOG, source, { tier: 1, sitemap, addedLines: null }, config).map((v) => v.detail.replace(/^line \d+: /, ""));
    expect(linkDetails('const a = "Source: https://www.irs.gov/p527 and https://evil.example/x.";')).toEqual(["external link to evil.example is not a primary-source domain"]);
    expect(linkDetails('const a = "https://" + "evil.example";')[0]).toMatch(/assembled at runtime/);
    expect(linkDetails('const a = "https:/" + "/evil.example";')[0]).toMatch(/assembled at runtime/);
    expect(linkDetails('const a = "htt" + "ps://evil.example";')[0]).toMatch(/ps: links are not allowed/);
    expect(linkDetails("const a = `https://${host}/x`;")[0]).toMatch(/assembled at runtime/);
    expect(linkDetails('const a = "javascript:alert(1)";')[0]).toMatch(/javascript: links/);
    expect(linkDetails("const p = <a href={base + path}>x</a>;")[0]).toMatch(/assembled at runtime/);
    // An unresolvable reference is not "a literal elsewhere": it is a runtime value.
    expect(linkDetails("const p = <a href={post.href}>x</a>;")[0]).toMatch(/assembled at runtime/);
    expect(embeddedUrls("//cdn.evil.example/x")).toEqual(["//cdn.evil.example/x"]);
  });

  it("finds protocol-relative and backslash hosts anywhere in a string, not only at its start", () => {
    expect(embeddedUrls("see //cdn.evil.example/x")).toEqual(["//cdn.evil.example/x"]);
    expect(embeddedUrls("url(//evil.example/x.png)")).toEqual(["//evil.example/x.png"]);
    expect(embeddedUrls("a.png 1x, ///evil.example/b.png 2x")).toEqual(["///evil.example/b.png"]);
    expect(embeddedUrls(`${BS}${BS}evil.example/x`)).toEqual([`${BS}${BS}evil.example/x`]);
    expect(embeddedUrls(`/${BS}evil.example/x`)).toEqual([`/${BS}evil.example/x`]);
    expect(embeddedUrls(`https:${BS}${BS}evil.example`)).toEqual([`https:${BS}${BS}evil.example`]);
    expect(embeddedUrls("x //")).toEqual(["//${…}"]);
    // Paths, prose and scheme URLs are not protocol-relative.
    expect(embeddedUrls("and/or // note: 1/2 of a/b//c")).toEqual([]);
    expect(embeddedUrls("https://www.irs.gov/x")).toEqual(["https://www.irs.gov/x"]);
  });

  it("refuses a page style= and CSS that fetches (a url() loads a third-party resource on every view)", () => {
    const sitemap = new Set(SITEMAP);
    const page = body('<p style={{ backgroundImage: "url(//evil.example/x.png)" }}>x</p>');
    expect(astRules(page)).toContain("jsx-attribute");
    expect(checkLiterals(BLOG, page)[0].detail).toMatch(/CSS "url\(/);
    expect(checkLinks(BLOG, page, { tier: 1, sitemap, addedLines: null }, config)[0].detail).toMatch(/protocol-relative link "\/\/evil\.example/);
    // Tailwind reads classes statically, so a class literal is enough to emit the CSS.
    expect(checkLiterals(BLOG, body('<p className="bg-[url(https://evil.example/x.png)]">x</p>'))).toHaveLength(1);
    expect(checkLiterals(BLOG, 'const a = "image-set(" + x;\nconst b = "@import x";').map((v) => v.detail)).toHaveLength(2);
    // OG images are styled inline by design; CSS that fetches is still refused there.
    const og = 'export default function Image() { return <div style={{ color: "#fff", background: "url(/home.jpg)" }} />; }\n';
    expect(checkAst("app/blog/x/opengraph-image.tsx", og)).toEqual([]);
    expect(checkLiterals("app/blog/x/opengraph-image.tsx", og)).toHaveLength(1);
    expect(checkLiterals(BLOG, 'const a = "Paste the listing URL(s) here.";')).toEqual([]);
    expect(astRules(body('<img srcSet="/a.png 1x" /><table background={x} />', "const x = 1;"))).toEqual(expect.arrayContaining(["jsx-attribute", "jsx-element"]));
  });

  it("datasets live flat under content/seo and public/research", () => {
    expect(pathViolations("content/seo/nested/facts.json", config).map((v) => v.rule)).toContain("dataset-depth");
    expect(pathViolations("public/research/2026/rents.csv", config).map((v) => v.rule)).toContain("dataset-depth");
    expect(pathViolations("public/research/rents.csv", config)).toEqual([]);
  });
});

describe("checkLiterals", () => {
  const lit = (source: string): string[] => checkLiterals(BLOG, source).map((v) => v.detail);
  it("rejects markup breakers in strings, templates and JSX text", () => {
    expect(lit('const a = "x</script>";')).toHaveLength(1);
    expect(lit('const a = "<!-- x";')).toHaveLength(1);
    expect(lit('const a = "<SCRIPT>";')).toHaveLength(1);
    expect(lit("const a = `x</style>`;")).toHaveLength(1);
    expect(lit("const a = `x${1}</b>${2}`;")).toHaveLength(1);
    expect(lit("const p = <p>a &lt;/script&gt; b</p>;")).toHaveLength(1);
    expect(lit('const p = <abbr title="&lt;/script&gt;">x</abbr>;')).toHaveLength(1);
    expect(lit('const a = "rent < 1,000";')).toEqual([]);
  });

  it("rejects a piece that ends in '<' (concatenation can finish the tag)", () => {
    expect(lit('const a = "x<" + "/script>";')[0]).toMatch(/ends in "</);
    expect(lit("const a = `x<${y}`;")[0]).toMatch(/ends in "</);
  });

  it("gives a string no exemption for sitting in a .replace() call (the brief's /<\\//g helper needs none)", () => {
    // The regex form `/<\//g` carries no `</` in its source, so the brief's escaping helper passes as is.
    expect(lit('const s = JSON.stringify(x).replace(/<\\//g, "<\\\\/");')).toEqual([]);
    expect(lit('const s = JSON.stringify(x).replace(/<\\//g, "</script>");')).toHaveLength(1);
    // A user-defined `replace` can hand its first argument straight back.
    expect(lit('const o = { replace: (s: string, _t: string) => s };\nconst ld = { a: o.replace("</script><img src=x onerror=alert(1)>", "") };')).toHaveLength(1);
    expect(lit('const s = JSON.stringify(x).replace("</", "<\\\\/");')).toHaveLength(1);
  });

  it("scans regular-expression literals: .source, String() and template coercion make them strings", () => {
    expect(lit("const ld = { a: /<!--<script>/.source };")).toHaveLength(1);
    expect(lit("const ld = { a: String(/<script/i) };")).toHaveLength(1);
    expect(lit('const ld = { a: /x</.source + "/script>" };')[0]).toMatch(/regular expression/);
    // The exact JSON-LD escape keeps its `/</g`, but only on a JSON.stringify chain.
    expect(lit(`const s = JSON.stringify(x).replace(/</g, "${U("003c")}");`)).toEqual([]);
    expect(lit(`const o = { replace: (r: RegExp, _t: string) => r.source };\nconst s = o.replace(/</g, "${U("003c")}") + "/script>";`)[0]).toMatch(/regular expression/);
    expect(lit("const re = /cap rate|noi/i;")).toEqual([]);
  });
});

// --------------------------------------------------------------------- links

describe("links", () => {
  const sitemap = new Set(SITEMAP);
  const hv = (href: string, file = BLOG, tier: 0 | 1 | 2 = 1, kind: "jsx-href" | "property" | "literal" = "jsx-href"): string | null => hrefViolation(href, file, kind, { tier, sitemap }, config);

  it("checks internal links against the sitemap", () => {
    expect(hv("/blog/dscr")).toBeNull();
    expect(hv("/blog/dscr/")).toBeNull();
    expect(hv("/blog/dscr#faq")).toBeNull();
    expect(hv("/markets/philadelphia?ref=blog")).toBeNull();
    expect(hv("#faq")).toBeNull();
    expect(hv("/blog/nope")).toMatch(/not a sitemap URL/);
    expect(hv("https://usetruecap.com/glossary/noi")).toBeNull();
    expect(hv("https://usetruecap.com/admin")).toMatch(/not a sitemap URL/);
    expect(hv("blog/dscr")).toMatch(/relative link/);
    expect(hrefViolation("/blog/brand-new", BLOG, "jsx-href", { tier: 0, sitemap, newPaths: new Set(["/blog/brand-new"]) }, config)).toBeNull();
  });

  it("allows only https primary sources (and subdomains) at tier >= 1", () => {
    expect(hv("https://www.irs.gov/publications/p527")).toBeNull();
    expect(hv("https://www.huduser.gov/portal/datasets/fmr.html")).toBeNull();
    expect(hv("https://www.irs.gov/x", BLOG, 0)).toMatch(/tier-0 files may add internal links only/);
    expect(hv("http://www.irs.gov/x")).toMatch(/http: links/);
    expect(hv("//www.irs.gov/x")).toMatch(/protocol-relative/);
    expect(hv("https://notirs.gov/x")).toMatch(/not a primary-source domain/);
    expect(hv("https://irs.gov.evil.example/x")).toMatch(/not a primary-source domain/);
    expect(hv("https://bit.ly/abc")).toMatch(/shortener/);
    expect(hv("https://93.184.216.34/x")).toMatch(/IP-address/);
    expect(hv("https://user@www.irs.gov/x")).toMatch(/userinfo/);
    expect(hv("https://www.irs.gov:8443/x")).toMatch(/port/);
    expect(hv("javascript:alert(1)")).toMatch(/javascript: links/);
    expect(hv("mailto:a@b.c")).toMatch(/mailto: links/);
  });

  it("allows vendor hosts only on /vs pages at tier 1", () => {
    expect(hv("https://www.stessa.com/pricing", "app/vs/stessa/page.tsx")).toBeNull();
    expect(hv("https://www.stessa.com/pricing", BLOG)).toMatch(/not a primary-source domain/);
    expect(hv("https://www.stessa.com/pricing", "app/vs/stessa/page.tsx", 0)).toMatch(/tier-0/);
  });

  it("treats schema.org as vocabulary outside an href", () => {
    expect(hv("https://schema.org", BLOG, 0, "literal")).toBeNull();
    expect(hv("http://schema.org/InStock", BLOG, 1, "property")).toBeNull();
    expect(hv("https://schema.org", BLOG, 1, "jsx-href")).toMatch(/not a primary-source/);
  });

  it("checks only links the patch ADDED, from hrefs, link-ish properties and bare URL literals", () => {
    const source = [
      'const SOURCES = [{ href: "https://www.irs.gov/a" }, { url: "https://evil.example/b" }];',
      'const CITE = "https://evil.example/c";',
      'const p = <p><a href="/legacy-page">old</a><a href="/blog/dscr">ok</a><a href={`/blog/${slug}`}>t</a></p>;',
    ].join("\n");
    const all = checkLinks(BLOG, source, { tier: 1, sitemap, addedLines: null }, config).map((v) => v.detail);
    expect(all).toHaveLength(4);
    expect(all.join("\n")).toMatch(/evil\.example\/?.*not a primary-source|evil.example is not/);
    expect(all.join("\n")).toMatch(/\/legacy-page is not a sitemap URL/);
    expect(all.join("\n")).toMatch(/assembled at runtime/);
    // A literal counts only on its own added line; a runtime href counts on ANY edit to the file.
    const onlyLine2 = checkLinks(BLOG, source, { tier: 1, sitemap, addedLines: new Set([2]) }, config).map((v) => v.detail).sort();
    expect(onlyLine2).toEqual([expect.stringMatching(/^line 2: external link to evil.example/), expect.stringMatching(/^line 3: a link assembled at runtime/)]);
    expect(checkLinks(BLOG, source, { tier: 1, sitemap, addedLines: new Set() }, config)).toEqual([]);
  });

  it("a page's pre-existing off-sitemap link does not fail an unrelated edit", () => {
    const v = run({ [BLOG]: BASE_PAGE }, { [BLOG]: edit(BASE_PAGE, 'const TITLE = "Cap rate guide";', 'const TITLE = "Cap rate guide 2026";') });
    expect(v.ok).toBe(true);
  });

  it("rejects a backslash or control character anywhere in a link (/\\host is //host to a browser)", () => {
    expect(hv(`/${BS}evil.example/casino`)).toMatch(/backslash or control character/);
    expect(hv(`https://www.irs.gov${BS}@evil.example/`)).toMatch(/backslash or control character/);
    expect(hv("/\t/evil.example")).toMatch(/backslash or control character/);
    expect(hv("/blog/\u0000dscr")).toMatch(/backslash or control character/);
  });

  it("lets only real files under public/ skip the sitemap check (never /api/x.csv)", () => {
    const publicFile = (p: string): boolean => ["/home.jpg", "/research/rents.csv"].includes(p);
    const pv = (href: string, kind: "jsx-href" | "jsx-src" | "property" = "jsx-href"): string | null => hrefViolation(href, BLOG, kind, { tier: 1, sitemap, publicFile }, config);
    expect(pv("/home.jpg", "property")).toBeNull();
    expect(pv("/research/rents.csv")).toBeNull();
    expect(pv("/api/export.csv")).toMatch(/\/api\/export\.csv is not a file under public\//);
    expect(pv("/admin/users.json")).toMatch(/not a file under public\//);
    // No oracle = no file is known to exist: fail closed.
    expect(hrefViolation("/home.jpg", BLOG, "jsx-href", { tier: 1, sitemap }, config)).toMatch(/not a file under public\//);
    // src may only name such a file: never a page, never another origin.
    expect(pv("/home.jpg", "jsx-src")).toBeNull();
    expect(pv("/blog/dscr", "jsx-src")).toMatch(/not a static file under public\//);
    expect(pv("https://www.irs.gov/logo.png", "jsx-src")).toMatch(/same-origin file under public\//);
    expect(pv("//evil.example/x.png", "jsx-src")).toMatch(/same-origin file under public\//);
    const v = run({ [BLOG]: BASE_PAGE }, { [BLOG]: edit(BASE_PAGE, "<p>Read the guide on DSCR next.</p>", '<p>Export <a href="/api/export.csv">csv</a>.</p>') });
    expect(v.violations.map((x) => x.detail)).toEqual([expect.stringMatching(/\/api\/export\.csv is not a file under public\//)]);
  });

  it("counts a CSV added by the same patch as a public file", () => {
    const csv = "public/research/rents.csv";
    const after = { [BLOG]: edit(BASE_PAGE, "<p>Read the guide on DSCR next.</p>", '<p>Get <a href="/research/rents.csv">the data</a>.</p>'), [csv]: "city,rent\nphl,1650\n" };
    const v = run({ [BLOG]: BASE_PAGE }, after);
    expect(details(v)).toBe("");
  });
});

describe("href/src references resolve to their literal, or count as runtime values", () => {
  const sitemap = new Set(SITEMAP);
  const page = (pre: string, jsx: string): string => `${pre}\nexport default function Page() {\n  return (\n    <main>\n      ${jsx}\n    </main>\n  );\n}\n`;
  const links = (source: string, addedLines: Set<number> | null = null, tier: 0 | 1 = 1): string[] =>
    checkLinks(BLOG, source, { tier, sitemap, addedLines, publicFile: (p) => p === "/home.jpg" }, config).map((v) => v.detail.replace(/^line \d+: /, ""));

  it("the reviewer's probes: a const holding /\\host, a concatenated //, an off-sitemap path", () => {
    expect(links(page(`const L = "/${BS}${BS}evil.example/casino";`, "<a href={L}>guide</a>"))).toEqual([expect.stringMatching(/backslash or control character/)]);
    expect(links(page('const L = "/" + "/evil.example";', "<a href={L}>guide</a>"))).toEqual([expect.stringMatching(/assembled at runtime/)]);
    expect(links(page('const L = "/admin";', "<a href={L}>guide</a>"))).toEqual(["internal link to /admin is not a sitemap URL"]);
    expect(links(page('const O = { u: "/" + "/evil.example" };', "<a href={O.u}>guide</a>"))).toEqual([expect.stringMatching(/assembled at runtime/)]);
    expect(links(page('import Image from "next/image";\nconst L = "/" + "/evil.example/x.png";', '<Image src={L} alt="" />'))).toEqual([expect.stringMatching(/assembled at runtime/)]);
    expect(links(page("", '<Image src="https://evil.example/x.png" alt="" />'))).toContain('src "https://evil.example/x.png" must be a same-origin file under public/');
  });

  it("checks a resolved literal when either the attribute or the declaration is added", () => {
    const source = page('const L = "/nope";', "<a href={L}>guide</a>");
    expect(links(source, new Set([1]))).toEqual(["internal link to /nope is not a sitemap URL"]); // declaration only
    expect(links(source, new Set([5]))).toEqual(["internal link to /nope is not a sitemap URL"]); // attribute only
    expect(links(source, new Set([3]))).toEqual([]); // an unrelated line
  });

  it("resolves top-level consts, const objects and `ROWS.map((row) => row.url)` over const arrays", () => {
    expect(links(page('const IRS = "https://www.irs.gov/publications/p946";', "<a href={IRS}>Pub 946</a>"))).toEqual([]);
    expect(links(page('const IRS = "https://www.irs.gov/publications/p946";', "<a href={IRS}>Pub 946</a>"), null, 0)).toEqual([expect.stringMatching(/tier-0 files may add internal links only/)]);
    expect(links(page('const L = { dscr: "/blog/dscr", noi: "/glossary/noi" };', "<a href={L.noi}>NOI</a>"))).toEqual([]);
    const rows = (third: string): string =>
      page(`type Row = { name: string; url: string };\nconst ROWS: Row[] = [\n  { name: "a", url: "/blog/dscr" },\n  { name: "b", url: "/vs/stessa" },\n  ${third}\n];`, "{ROWS.map((row) => (<a key={row.name} href={row.url}>{row.name}</a>))}");
    expect(links(rows('{ name: "c", url: "/glossary/noi" }'))).toEqual([]);
    expect(links(rows('{ name: "c", url: "/nope" }'), new Set([5]))).toEqual(["internal link to /nope is not a sitemap URL"]); // only the row changed
    expect(links(rows('{ name: "c", url: "/" + "/evil.example" }'), new Set([5]))).toEqual([expect.stringMatching(/assembled at runtime/)]);
    expect(links(rows('{ name: "c", ...EXTRA }'), new Set([5]))).toEqual([expect.stringMatching(/assembled at runtime/)]);
    expect(links(rows('{ name: "c", url: "/glossary/noi", ["url"]: "/nope" }'), new Set([5]))).toEqual([expect.stringMatching(/assembled at runtime/)]);
    // The binding is the nearest callback parameter; a reassigned or redeclared one is not what ROWS holds.
    const reassigned = rows('{ name: "c", url: "/glossary/noi" }').replace("(row) => (<a", '(row) => { row = { name: "x", url: "//evil.example" }; return <a').replace("</a>))}", "</a>; })}");
    expect(links(reassigned, new Set([1]))).toEqual([expect.stringMatching(/assembled at runtime/)]);
  });

  it("exempts owner-written imports, but not the agent-writable data modules", () => {
    expect(links(page('import { LINKS } from "@/components/marketing/links";', "<a href={LINKS.pricing.href}>x</a>"), new Set([1]))).toEqual([]);
    expect(links(page('import { BLOG_TOPICS } from "@/lib/blog-topics";', "<a href={BLOG_TOPICS.first}>x</a>"), new Set([1]))).toEqual([expect.stringMatching(/assembled at runtime/)]);
    expect(links(page('import { HREF } from "@/lib/blog-topics";', "<a href={HREF}>x</a>"), new Set([1]))).toEqual([expect.stringMatching(/assembled at runtime/)]);
  });

  it("a runtime href fails ANY edit to the file (what builds it can change without its line)", () => {
    const source = page('const A = "/ok-";\nconst B = "page";', "<a href={A + B}>x</a>");
    expect(links(source, new Set([1]))).toEqual([expect.stringMatching(/assembled at runtime/)]);
    expect(links(source, new Set())).toEqual([]);
    // A prop threaded into a local component: the value comes from a call site the attribute cannot see.
    expect(links(page("function Card({ to }: { to: string }) { return <a href={to}>x</a>; }", "<Card to={x} />"), new Set([5]))).toEqual([expect.stringMatching(/assembled at runtime/)]);
  });

  it("end to end with the git sandbox: a const holding /\\host no longer passes", () => {
    const after = edit(BASE_PAGE, "<p>Read the guide on DSCR next.</p>", `<p>Read <a href={L}>guide</a>.</p>`).replace('const TITLE = "Cap rate guide";', `const TITLE = "Cap rate guide";\nconst L = "/${BS}${BS}evil.example/casino";`);
    const v = run({ [BLOG]: BASE_PAGE }, { [BLOG]: after }, { sandbox: gitSandbox });
    expect(v.ok).toBe(false);
    expect(v.violations.some((x) => x.rule === "link" && /backslash/.test(x.detail))).toBe(true);
  });
});

// --------------------------------------------------------------------- tiers

describe("deriveTier", () => {
  const tier = (after: string, file = BLOG, calibrating = false): number => deriveTier(file, BASE_PAGE, after, { calibrating }).tier;

  it("tier 0: metadata consts and metadata title/description properties", () => {
    expect(tier(edit(BASE_PAGE, 'const DESCRIPTION = "How to read a cap rate.";', 'const DESCRIPTION =\n  "What a cap rate measures, what counts as good, and when it misleads.";'))).toBe(0);
    expect(tier(edit(BASE_PAGE, 'openGraph: { title: TITLE, description: "Read a cap rate." }', 'openGraph: { title: TITLE, description: "Read a cap rate the right way." }'))).toBe(0);
    expect(tier(edit(BASE_PAGE, "  title: TITLE,", '  title: "Cap Rate: A Plain Guide",'))).toBe(0);
  });

  it("tier 0: exactly one internal link wrapped around existing text, or inserted whole", () => {
    expect(tier(edit(BASE_PAGE, "<p>Read the guide on DSCR next.</p>", '<p>Read the <Link href="/blog/dscr">guide on DSCR</Link> next.</p>'))).toBe(0);
    expect(tier(edit(BASE_PAGE, "<p>Read the guide on DSCR next.</p>", '<p>Read the guide on DSCR next.<Link href="/blog/dscr">DSCR guide</Link></p>'))).toBe(0);
  });

  it("tier 1: anything else, however small", () => {
    expect(tier(edit(BASE_PAGE, "<p>Read the guide on DSCR next.</p>", "<p>Read the DSCR guide next.</p>"))).toBe(1);
    expect(tier(edit(BASE_PAGE, "<p>Read the guide on DSCR next.</p>", '<p>Read the <Link href="/blog/dscr">guide on DSCR</Link> next. Then <Link href="/glossary/noi">NOI</Link>.</p>'))).toBe(1);
    expect(tier(edit(BASE_PAGE, "<p>Read the guide on DSCR next.</p>", '<p>Read the <a href="https://www.irs.gov/x">guide on DSCR</a> next.</p>'))).toBe(1);
    expect(tier(edit(BASE_PAGE, 'const TITLE = "Cap rate guide";', "const TITLE = buildTitle();"))).toBe(1);
    expect(tier(edit(BASE_PAGE, "  headline: TITLE,", '  headline: "Other",'))).toBe(1);
    expect(deriveTier(BLOG, null, BASE_PAGE, { calibrating: false }).tier).toBe(1);
    expect(deriveTier("lib/blog-topics.ts", "export const A = 1;\n", "export const A = 2;\n", { calibrating: false }).tier).toBe(1);
  });

  it("tier 2: research pages, and noindex while calibrating", () => {
    expect(deriveTier("app/research/fmr-2026/page.tsx", null, BASE_PAGE, { calibrating: false }).tier).toBe(2);
    expect(deriveTier("content/seo/noindex.json", "[]", '["/blog/dscr"]', { calibrating: true }).tier).toBe(2);
    expect(deriveTier("content/seo/noindex.json", "[]", '["/blog/dscr"]', { calibrating: false }).tier).toBe(1);
  });

  it("takes the calibration tier for noindex.json from config.gates.pruneTierDuringCalibration", () => {
    const withTier = (value: unknown): typeof config => ({ ...config, gates: { ...config.gates, pruneTierDuringCalibration: value as number } });
    expect(deriveTier("content/seo/noindex.json", "[]", '["/blog/dscr"]', { calibrating: true, config: withTier(1) }).tier).toBe(1);
    expect(pruneTierDuringCalibration(withTier(2))).toBe(2);
    expect(pruneTierDuringCalibration(withTier(1))).toBe(1);
    // Never looser than outside calibration (tier 1), and a broken value fails closed to 2.
    expect(pruneTierDuringCalibration(withTier(0))).toBe(1);
    expect(pruneTierDuringCalibration(withTier("two"))).toBe(2);
    expect(pruneTierDuringCalibration(withTier(undefined))).toBe(2);
    const noindex = { "content/seo/noindex.json": `${JSON.stringify(["/blog/dscr"])}\n` };
    const manifest = { changes: [{ path: "/blog/dscr", file: "content/seo/noindex.json" }] };
    expect(run({ "content/seo/noindex.json": "[]\n" }, noindex, { manifest, indexed: 60, calibrating: true, config: withTier(1) }).tier).toBe(1);
  });

  it("run tier is the max over files", () => {
    const v = run(
      { [BLOG]: BASE_PAGE, "app/blog/dscr/page.tsx": BASE_PAGE },
      {
        [BLOG]: edit(BASE_PAGE, 'const TITLE = "Cap rate guide";', 'const TITLE = "Cap rate guide 2026";'),
        "app/blog/dscr/page.tsx": edit(BASE_PAGE, "<p>Cap rate is net operating income divided by price.</p>", "<p>DSCR divides NOI by debt service.</p>"),
      },
    );
    expect(details(v)).toBe("");
    expect(v.files.map((f) => f.tier).sort()).toEqual([0, 1]);
    expect(v.tier).toBe(1);
  });

  it("refuses edited dates in an existing page (the publish job owns them)", () => {
    const v = run({ [BLOG]: BASE_PAGE }, { [BLOG]: edit(BASE_PAGE, 'const MODIFIED_AT = "2026-07-01";', 'const MODIFIED_AT = "2026-09-27";') });
    expect(rules(v)).toContain("date-edit");
  });
});

// ------------------------------------------- deindexing outside noindex.json

describe("robots metadata and next/navigation redirects (they remove a page outside noindex.json)", () => {
  const withMeta = (extra: string): string => edit(BASE_PAGE, "  description: DESCRIPTION,\n", `  description: DESCRIPTION,\n${extra}\n`);

  it("rejects adding robots / googleBot metadata to an existing page, however it is spelled", () => {
    for (const extra of ["  robots: { index: false },", '  robots: "noindex",', "  robots: { googleBot: { index: false } },", '  other: { robots: "noindex" },', '  other: { "googlebot": "noindex" },']) {
      const v = run({ [BLOG]: BASE_PAGE }, { [BLOG]: withMeta(extra) });
      expect(rules(v), extra).toContain("robots");
    }
    const viaEntries = edit(BASE_PAGE, "};\n\nconst articleLd", '  other: Object.fromEntries([["robots", "noindex"]]),\n};\n\nconst articleLd');
    expect(rules(run({ [BLOG]: BASE_PAGE }, { [BLOG]: viaEntries }))).toContain("robots");
  });

  it("rejects robots in a new article, and leaves an unchanged one alone", () => {
    const NEW = "app/blog/brand-new/page.tsx";
    const fresh = withMeta("  robots: { index: false },").replace('<p>See <Link href="/legacy-page">the old page</Link>.</p>\n', "");
    expect(rules(run({ [BLOG]: BASE_PAGE }, { [NEW]: fresh }, { manifest: { changes: [{ path: "/blog/brand-new", file: NEW, newArticle: true }] } }))).toContain("robots");
    const noindexed = withMeta("  robots: { index: false },");
    const v = run({ [BLOG]: noindexed }, { [BLOG]: edit(noindexed, 'const TITLE = "Cap rate guide";', 'const TITLE = "Cap rate guide 2026";') });
    expect(details(v)).toBe("");
  });

  it("rejects adding or changing a next/navigation call, including aliases and namespace imports", () => {
    const add = (imports: string, statement: string): string =>
      edit(BASE_PAGE, 'import Link from "next/link";', `import Link from "next/link";\n${imports}`).replace("export default function Page() {\n", `export default function Page() {\n  ${statement}\n`);
    const cases: Array<[string, string]> = [
      ['import { redirect } from "next/navigation";', 'redirect("/blog/dscr");'],
      ['import { permanentRedirect as go } from "next/navigation";', 'go("/blog/dscr");'],
      ['import * as nav from "next/navigation";', 'nav.permanentRedirect("/blog/dscr");'],
      ['import { notFound } from "next/navigation";', "notFound();"],
    ];
    for (const [imports, statement] of cases) expect(rules(run({ [BLOG]: BASE_PAGE }, { [BLOG]: add(imports, statement) })), imports).toContain("navigation");
    // An existing redirect stub (two /vs pages are) may not be retargeted, but an unrelated edit is fine.
    const stub = 'import { permanentRedirect } from "next/navigation";\n\nexport default function Page() {\n  permanentRedirect("/blog/dscr");\n}\n';
    const VS = "app/vs/dealcheck-for-brrrr/page.tsx";
    const manifest = { changes: [{ path: "/vs/stessa", file: VS }] };
    expect(rules(run({ [VS]: stub }, { [VS]: stub.replace('"/blog/dscr"', '"/glossary/noi"') }, { manifest }))).toContain("navigation");
    expect(details(run({ [VS]: stub }, { [VS]: stub.replace("\nexport default", "\n// Consolidated into the DSCR guide.\nexport default") }, { manifest }))).toBe("");
  });
});

// ------------------------------------------------------ articles, datasets

describe("new articles", () => {
  const NEW = "app/blog/brand-new/page.tsx";
  const newArticle = (extra: Record<string, unknown> = {}): unknown => ({ changes: [{ path: "/blog/brand-new", file: NEW, newArticle: true, ...extra }] });

  it("allows a declared new article and lets it link to itself before the sitemap knows it", () => {
    const page = edit(BASE_PAGE, "<p>Read the guide on DSCR next.</p>", '<p>Read the <Link href="/blog/brand-new#faq">FAQ</Link> and <Link href="/blog/dscr">DSCR</Link>.</p>');
    const v = run({ [BLOG]: BASE_PAGE }, { [NEW]: page.replace('<p>See <Link href="/legacy-page">the old page</Link>.</p>\n', "") }, { manifest: newArticle() });
    expect(details(v)).toBe("");
    expect(v.caps.newArticles).toBe(1);
    expect(v.declaredUrls).toEqual(["/blog/brand-new"]);
    expect(v.files[0]).toMatchObject({ status: "A", tier: 1, url: "/blog/brand-new" });
  });

  it("rejects an undeclared new directory, one without page.tsx, and the caps", () => {
    const clean = BASE_PAGE.replace('<p>See <Link href="/legacy-page">the old page</Link>.</p>\n', "");
    expect(rules(run({ [BLOG]: BASE_PAGE }, { [NEW]: clean }, { manifest: { changes: [{ path: "/blog/brand-new", file: NEW }] } }))).toContain("new-article");
    expect(rules(run({ [BLOG]: BASE_PAGE }, { "app/blog/brand-new/opengraph-image.tsx": "export const alt = 'x';\n" }, { manifest: newArticle({ file: "app/blog/brand-new/opengraph-image.tsx" }) }))).toContain("new-article");
    expect(rules(run({ [BLOG]: BASE_PAGE }, { [NEW]: clean }, { manifest: newArticle(), crawlStalled: true }))).toContain("cap-new-articles");
    const three = Object.fromEntries(["a1", "a2", "a3"].map((slug) => [`app/blog/${slug}/page.tsx`, clean]));
    const manifest = { changes: ["a1", "a2", "a3"].map((slug) => ({ path: `/blog/${slug}`, file: `app/blog/${slug}/page.tsx`, newArticle: true })) };
    const v = run({ [BLOG]: BASE_PAGE }, three, { manifest });
    expect(rules(v)).toContain("cap-new-articles");
    expect(v.caps.newArticles).toBe(3);
  });

  it("adding an OG image to an existing article is not a new article", () => {
    const v = run({ [BLOG]: BASE_PAGE }, { "app/blog/cap-rate-guide/opengraph-image.tsx": 'import { ImageResponse } from "next/og";\nexport const alt = "Cap rate";\n' });
    expect(details(v)).toBe("");
    expect(v.caps.newArticles).toBe(0);
  });
});

describe("content/seo datasets", () => {
  const sitemap = new Set(SITEMAP);
  const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

  it("validates sources entries", () => {
    const ok = { philadelphia: { rentMedian: 1650, sources: [{ url: "https://www.huduser.gov/portal/datasets/fmr.html", title: "HUD FMR FY2026", retrievedAt: "2026-09-20" }] } };
    expect(checkContentJson("content/seo/market-facts.json", json(ok), null, { sitemap }, config).violations).toEqual([]);
    const bad = {
      a: { sources: [{ url: "http://www.huduser.gov/x", retrievedAt: "2026-09-20" }] },
      b: { sources: [{ url: "https://www.zillow.com/x", retrievedAt: "2026-09-20" }] },
      c: { sources: [{ url: "https://www.census.gov/x" }] },
      d: { sources: [{ url: "https://www.census.gov/x", retrievedAt: "2026-09-20", note: "extra" }] },
      e: { sources: "https://www.census.gov/x" },
    };
    const found = checkContentJson("content/seo/market-facts.json", json(bad), null, { sitemap }, config).violations.map((v) => v.detail);
    expect(found).toHaveLength(5);
  });

  it("rejects markup and non-primary URLs anywhere in a dataset, and bad JSON", () => {
    expect(checkContentJson("content/seo/state-facts.json", json({ pa: { note: "x</script>" } }), null, { sitemap }, config).violations[0].rule).toBe("literal");
    expect(checkContentJson("content/seo/state-facts.json", json({ pa: { link: "https://evil.example" } }), null, { sitemap }, config).violations[0].rule).toBe("link");
    expect(checkContentJson("content/seo/state-facts.json", "{ nope", null, { sitemap }, config).violations[0].rule).toBe("json-parse");
  });

  it("noindex.json: sorted sitemap paths, excluded paths refused, additions counted", () => {
    const check = (after: unknown, before: unknown = []): ReturnType<typeof checkContentJson> => checkContentJson("content/seo/noindex.json", json(after), json(before), { sitemap }, config);
    expect(check(["/blog/dscr", "/glossary/noi"], ["/glossary/noi"])).toEqual({ violations: [], noindexAdded: ["/blog/dscr"] });
    expect(check(["/glossary/noi", "/blog/dscr"]).violations[0].detail).toMatch(/sorted/);
    expect(check(["/blog/dscr", "/blog/dscr"]).violations[0].detail).toMatch(/sorted and unique/);
    expect(check(["/blog/not-listed"]).violations[0].detail).toMatch(/not a sitemap path/);
    expect(check(["/pricing"]).violations[0].detail).toMatch(/excluded from optimization/);
    expect(check({ a: 1 }).violations[0].detail).toMatch(/array/);
  });

  it("caps noindex additions at floor(share × indexed) and holds noindex at tier 2 while calibrating", () => {
    const base = { "content/seo/noindex.json": "[]\n" };
    const after = { "content/seo/noindex.json": json(["/blog/dscr", "/glossary/noi", "/markets/philadelphia"]) };
    const manifest = { changes: [{ path: "/blog/dscr", file: "content/seo/noindex.json" }] };
    const tooMany = run(base, after, { manifest, indexed: 40 });
    expect(rules(tooMany)).toContain("cap-noindex");
    expect(tooMany.caps.noindex).toBe(3);
    expect(tooMany.declaredUrls).toEqual(["/blog/dscr", "/glossary/noi", "/markets/philadelphia"]);
    const fits = run(base, after, { manifest, indexed: 60 });
    expect(details(fits)).toBe("");
    expect(fits.tier).toBe(1);
    expect(run(base, after, { manifest, indexed: 60, calibrating: true }).tier).toBe(2);
    expect(rules(run(base, after, { manifest }))).toContain("cap-noindex");
  });
});

describe("checkGuardBaseline (tighten-only)", () => {
  const baseline = {
    $comment: "generated",
    $generated: "2026-08-28",
    adopted: [{ slug: "old", adoptedOn: "2026-08-02", note: "n" }],
    limits: { maxTitleConstChars: 50, maxMetaDescriptionChars: 165, internalLinkTarget: { glossary: 3, blog: 2 } },
    longTitles: { "/a": 62 } as Record<string, number>,
    longDescriptions: { "/b": 190 } as Record<string, number>,
    missingFaqPage: ["x", "y"],
    internalLinks: { post: { glossary: 1, blog: 2 } },
  };
  const s = (value: unknown): string => JSON.stringify(value, null, 2);
  const withChange = (fn: (b: typeof baseline) => void): string => {
    const copy = JSON.parse(JSON.stringify(baseline)) as typeof baseline;
    fn(copy);
    return s(copy);
  };

  it("accepts paying debt down", () => {
    const paid = withChange((b) => {
      b.$generated = "2026-09-27";
      b.longTitles = {};
      b.longDescriptions["/b"] = 170;
      b.missingFaqPage = ["y"];
      // Below the target (3), a higher count is a higher floor.
      b.internalLinks.post.glossary = 2;
    });
    expect(checkGuardBaseline(s(baseline), paid)).toEqual([]);
    // At or above the target the entry sets no floor, so lowering it below the target adds one.
    const tighter = withChange((b) => {
      b.internalLinks.post.blog = 1;
    });
    expect(checkGuardBaseline(s(baseline), tighter)).toEqual([]);
  });

  it("reads internalLinks the way the real ratchet does: an entry at the target switches the floor OFF", () => {
    // lib/__tests__/seo-guards.test.ts enforces `now >= before` only while before < target,
    // and holds a post with NO entry to the full target.
    const raised = checkGuardBaseline(s(baseline), withChange((b) => (b.internalLinks.post.glossary = 3)));
    expect(raised.map((v) => v.detail)).toEqual(["internalLinks.post.glossary floor loosened 1 → 0 (1 → 3)"]);
    const added = checkGuardBaseline(s(baseline), withChange((b) => ((b.internalLinks as Record<string, { glossary: number; blog: number }>).fresh = { glossary: 3, blog: 2 })));
    expect(added.map((v) => v.detail)).toEqual([expect.stringMatching(/internalLinks\.fresh is a new entry/)]);
    const missingFamily = checkGuardBaseline(s(baseline), withChange((b) => delete (b.internalLinks.post as Partial<typeof b.internalLinks.post>).glossary));
    expect(missingFamily.map((v) => v.detail)).toEqual([expect.stringMatching(/internalLinks\.post\.glossary floor loosened 1 → 0/)]);
  });

  it("rejects every kind of loosening", () => {
    const cases: Array<(b: typeof baseline) => void> = [
      (b) => (b.longTitles["/a"] = 63),
      (b) => ((b.longTitles as Record<string, number>)["/new"] = 70),
      (b) => b.missingFaqPage.push("z"),
      (b) => (b.limits.maxTitleConstChars = 60),
      (b) => (b.limits.internalLinkTarget.glossary = 1),
      (b) => (b.internalLinks.post.glossary = 0),
      (b) => ((b.internalLinks as Record<string, { glossary: number; blog: number }>).fresh = { glossary: 0, blog: 2 }),
      (b) => delete (b.internalLinks as Record<string, unknown>).post,
      (b) => b.adopted.push({ slug: "new", adoptedOn: "2026-09-27", note: "n" }),
      (b) => ((b as Record<string, unknown>).extra = 1),
    ];
    for (const change of cases) expect(checkGuardBaseline(s(baseline), withChange(change)).length, change.toString()).toBeGreaterThan(0);
    expect(checkGuardBaseline(null, s(baseline))[0].detail).toMatch(/may not be created/);
  });

  it("the live baseline passes against itself", () => {
    const live = readFileSync(path.join(__dirname, "../../docs/seo/guard-baseline.json"), "utf8");
    expect(checkGuardBaseline(live, live)).toEqual([]);
  });
});

// ------------------------------------------------- manifest, holdout, caps

describe("manifest, holdout and caps", () => {
  const titleChange = { [BLOG]: edit(BASE_PAGE, 'const TITLE = "Cap rate guide";', 'const TITLE = "Cap rate guide 2026";') };

  it("a changed file the manifest does not declare is a violation", () => {
    expect(rules(run({ [BLOG]: BASE_PAGE }, titleChange, { manifest: { changes: [] } }))).toContain("undeclared-file");
    expect(rules(run({ [BLOG]: BASE_PAGE }, titleChange, { manifest: null, manifestError: "run manifest unreadable: x" }))).toEqual(expect.arrayContaining(["manifest", "undeclared-file"]));
    expect(rules(run({ [BLOG]: BASE_PAGE }, titleChange, { manifest: { nope: true } }))).toContain("manifest");
  });

  it("a model patch with no manifest (or a JSON null one) is refused, and every file counts as undeclared", () => {
    for (const manifest of [null, undefined]) {
      const v = run({ [BLOG]: BASE_PAGE }, titleChange, { manifest });
      expect(v.ok).toBe(false);
      expect(v.violations).toEqual(
        expect.arrayContaining([
          { rule: "manifest", path: null, detail: expect.stringContaining("run manifest missing") },
          { rule: "undeclared-file", path: BLOG, detail: "changed but not declared in the run manifest" },
        ]),
      );
    }
    for (const manifest of [[], 3, "x"]) expect(rules(run({ [BLOG]: BASE_PAGE }, titleChange, { manifest })), JSON.stringify(manifest)).toEqual(expect.arrayContaining(["manifest", "undeclared-file"]));
  });

  it("manifest paths only count for changed files and must be sitemap URLs outside the excluded set", () => {
    const manifest = {
      changes: [
        { path: "/blog/cap-rate-guide", file: BLOG },
        { path: "/pricing", file: BLOG },
        { path: "/nowhere", file: BLOG },
        { path: "/glossary/noi", file: "app/blog/untouched/page.tsx" },
      ],
    };
    const v = run({ [BLOG]: BASE_PAGE }, titleChange, { manifest });
    expect(v.violations.filter((x) => x.rule === "manifest").map((x) => x.detail)).toEqual([
      "declared path /pricing is excluded from optimization",
      "declared path /nowhere is not a sitemap URL",
    ]);
    expect(v.declaredUrls).toEqual(["/blog/cap-rate-guide"]);
  });

  it("a declared URL in the active holdout is a violation", () => {
    const v = run({ [BLOG]: BASE_PAGE }, titleChange, { holdout: ["/blog/cap-rate-guide"] });
    expect(v.violations).toEqual([{ rule: "holdout", path: "/blog/cap-rate-guide", detail: "this URL is in the active holdout" }]);
  });

  it("enforces file, line and page caps from config", () => {
    const tight = { ...config, caps: { ...config.caps, maxChangedFilesPerRun: 1, maxChangedLinesPerRun: 1, pagesChangedPerRun: 1 } };
    const v = run(
      { [BLOG]: BASE_PAGE, "app/blog/dscr/page.tsx": BASE_PAGE },
      { [BLOG]: titleChange[BLOG], "app/blog/dscr/page.tsx": titleChange[BLOG] },
      { config: tight },
    );
    expect(rules(v)).toEqual(expect.arrayContaining(["cap-files", "cap-lines", "cap-pages"]));
    expect(v.caps).toEqual({ files: 2, lines: 4, pages: 2, newArticles: 0, noindex: 0 });
  });

  it("working-tree mode ignores the manifest and flags untracked agent-writable files", () => {
    const v = run({ [BLOG]: BASE_PAGE }, titleChange, { mode: "working-tree", manifest: { changes: [] }, untracked: ["app/blog/draft/page.tsx", "notes.txt"] });
    expect(v.violations).toEqual([{ rule: "untracked-file", path: "app/blog/draft/page.tsx", detail: expect.stringContaining("git add -N") }]);
  });
});

describe("byte-level guards", () => {
  it("hashes the raw bytes and refuses NUL, bad UTF-8, empty and mismatched patches", () => {
    const patch = makePatch({ [BLOG]: BASE_PAGE }, { [BLOG]: edit(BASE_PAGE, "Cap rate guide", "Cap rate guide!") });
    const v = verify({ patch, base: baseFromRecord({ [BLOG]: BASE_PAGE }), sitemap: SITEMAP, manifest: manifestFor([BLOG]), config, sandbox: null });
    expect(v.patchSha256).toBe(createHash("sha256").update(patch).digest("hex"));
    const bad = (bytes: Uint8Array | string): string[] => rules(verify({ patch: bytes, base: baseFromRecord({}), sitemap: SITEMAP, manifest: { changes: [] }, config, sandbox: null }));
    expect(bad(Buffer.concat([patch, Buffer.from([0])]))).toEqual(["patch-nul"]);
    expect(bad(Buffer.concat([patch, Buffer.from([0xff, 0xfe])]))).toEqual(["patch-encoding"]);
    expect(bad("")).toEqual(["empty-patch"]);
    const missingBase = verify({ patch, base: baseFromRecord({}), sitemap: SITEMAP, manifest: manifestFor([BLOG]), config, sandbox: null });
    expect(rules(missingBase)).toContain("base-mismatch");
    const staleBase = verify({ patch, base: baseFromRecord({ [BLOG]: BASE_PAGE.replace("How to read a cap rate.", "A different base.") }), sitemap: SITEMAP, manifest: manifestFor([BLOG]), config, sandbox: null });
    expect(rules(staleBase)).toContain("apply");
  });
});

// --------------------------------------------------- git sandbox + scanner

describe("git sandbox (real git apply + the gate-1b scanner)", () => {
  it("agrees with the JS applier on a clean patch", () => {
    const after = { [BLOG]: edit(BASE_PAGE, "<p>Read the guide on DSCR next.</p>", '<p>Read the <Link href="/blog/dscr">guide on DSCR</Link> next.</p>') };
    const v = run({ [BLOG]: BASE_PAGE }, after, { sandbox: gitSandbox });
    expect(details(v)).toBe("");
    expect(v.tier).toBe(0);
  });

  it("folds the scanner's findings into violations", () => {
    const after = { [BLOG]: edit(BASE_PAGE, 'const MODIFIED_AT = "2026-07-01";', 'const MODIFIED_AT = "2026-07-01";\nconst NOTE = "node:fs";') };
    const v = run({ [BLOG]: BASE_PAGE }, after, { sandbox: gitSandbox });
    expect(v.violations.some((x) => x.rule === "content-scan" && x.path === BLOG && x.detail.includes("node-builtin-import"))).toBe(true);
  });

  it("parses the scanner's report format", () => {
    const report = ["    app/blog/x/page.tsx:12  [process-env] reads the build environment", "      const t = process.env", "    app/blog/x/page.tsx  [aliased-global] rebinds"].join("\n");
    expect(scannerFindings(report, ["app/blog/x/page.tsx"])).toEqual([
      { rule: "content-scan", path: "app/blog/x/page.tsx", detail: "line 12: [process-env] reads the build environment" },
      { rule: "content-scan", path: "app/blog/x/page.tsx", detail: "[aliased-global] rebinds" },
    ]);
    expect(scannerFindings("boom", ["a.tsx"])[0].detail).toMatch(/scanner failed: boom/);
  });
});

// --------------------------------------------------------- owner PR helpers

describe("working-tree mode and whole-file rules", () => {
  it("diffs against the merge-base, so a branch behind main is judged on its own change only", () => {
    const dir = tmp();
    git(dir, ["init", "-q", "-b", "main"]);
    mkdirSync(path.join(dir, "app/blog/cap-rate-guide"), { recursive: true });
    writeFileSync(path.join(dir, BLOG), BASE_PAGE);
    writeFileSync(path.join(dir, "notes.txt"), "one\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "base"]);
    git(dir, ["checkout", "-q", "-b", "owner-branch"]);
    // main moves on after the branch point…
    git(dir, ["checkout", "-q", "main"]);
    writeFileSync(path.join(dir, "notes.txt"), "one\ntwo\n");
    writeFileSync(path.join(dir, "later.txt"), "added on main\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "main moves on"]);
    // …while the owner edits one title on the stale branch.
    git(dir, ["checkout", "-q", "owner-branch"]);
    writeFileSync(path.join(dir, BLOG), edit(BASE_PAGE, 'const TITLE = "Cap rate guide";', 'const TITLE = "Cap rate guide 2026";'));
    const { patch, baseSha } = workingTreePatch("main", dir);
    expect(parsePatch(patch.toString("utf8")).files.map((f) => [f.path, f.status])).toEqual([[BLOG, "M"]]);
    expect(baseSha).toBe(git(dir, ["rev-parse", "owner-branch"]).toString("utf8").trim());
    // Diffing against the ref itself (the old behaviour) drags main's commit in, reversed.
    const direct = parsePatch(git(dir, ["diff", "--binary", "main"]).toString("utf8")).files.map((f) => `${f.path}:${f.status}`).sort();
    expect(direct).toEqual([`${BLOG}:M`, "later.txt:D", "notes.txt:M"]);
    expect(() => workingTreePatch("main; rm -rf /", dir)).toThrow(/not a plain ref/);
  });

  it("exports the whole-file rules so candidates whose source already fails can be skipped", () => {
    expect(wholeFileViolations(BLOG, BASE_PAGE, config)).toEqual([]);
    const legacy = edit(BASE_PAGE, "<p>Read the guide on DSCR next.</p>", '<p dangerouslySetInnerHTML={{ __html: "Read <b>this</b>" }} />');
    expect(wholeFileViolations(BLOG, legacy, config).map((v) => v.rule)).toEqual(["dangerous-html", "literal"]);
  });
});

// ---------------------------------------- demotion and per-file pages

describe("demoted change types (brakes (d)) and the pages each file changes", () => {
  const titleChange = { [BLOG]: edit(BASE_PAGE, 'const TITLE = "Cap rate guide";', 'const TITLE = "What Is a Good Cap Rate?";') };
  const bodyChange = { [BLOG]: edit(BASE_PAGE, "<p>Cap rate is net operating income divided by price.</p>", "<p>Cap rate divides net operating income by the price.</p>") };
  const typed = (changeType: unknown) => ({ runId: "1", changes: [{ path: "/blog/cap-rate-guide", file: BLOG, skill: "seo-ctr", changeType, summary: "s" }], skipped: [], issues: [] });

  it("raises a tier-0 or tier-1 edit whose change type is demoted to tier 2, so it never auto-merges", () => {
    expect(run({ [BLOG]: BASE_PAGE }, titleChange).tier).toBe(0);
    const demoted = run({ [BLOG]: BASE_PAGE }, titleChange, { manifest: typed("Title Meta"), demotedChangeTypes: ["title-meta"] });
    expect(details(demoted)).toBe("");
    expect(demoted.tier).toBe(2);
    expect(demoted.files[0]).toMatchObject({ tier: 2, tierReason: "demoted change type title-meta" });
    const body = run({ [BLOG]: BASE_PAGE }, bodyChange, { manifest: typed("refresh"), demotedChangeTypes: ["refresh"] });
    expect(body.files[0].tier).toBe(2);
  });

  it("leaves other change types alone, and never lowers a tier", () => {
    expect(run({ [BLOG]: BASE_PAGE }, titleChange, { manifest: typed("title-meta"), demotedChangeTypes: ["citations"] }).tier).toBe(0);
    expect(run({ [BLOG]: BASE_PAGE }, bodyChange, { manifest: typed("citations"), demotedChangeTypes: [] }).tier).toBe(1);
  });

  it("while a type is demoted, a change must name a known type (a blank or made-up one cannot dodge the demotion)", () => {
    for (const changeType of [undefined, "", "title", "tweak"]) {
      const v = run({ [BLOG]: BASE_PAGE }, titleChange, { manifest: typed(changeType), demotedChangeTypes: ["title-meta"] });
      expect(rules(v), String(changeType)).toContain("change-type");
    }
    expect(rules(run({ [BLOG]: BASE_PAGE }, titleChange, { manifest: typed("tweak"), demotedChangeTypes: [] }))).not.toContain("change-type");
  });

  it("reads a demoted list from the flags or the brakes file, and fails closed on a malformed one", () => {
    const dir = tmp();
    const file = path.join(dir, "brakes-2026-09-27.json");
    writeFileSync(file, JSON.stringify({ demotedChangeTypes: [{ changeType: "Title Meta", lossRate: 0.5, scored: 10 }] }));
    expect(demotedFromBrakesFile(file)).toEqual(["title-meta"]);
    expect(demotedFromBrakesFile(null)).toEqual([]);
    writeFileSync(file, JSON.stringify({ demotedChangeTypes: "title-meta" }));
    expect(() => demotedFromBrakesFile(file)).toThrow(/demotedChangeTypes must be an array/);
    expect(readRunFlags({ activeHoldout: [], demotedChangeTypes: ["Title Meta"] }).demoted).toEqual(["title-meta"]);
    expect(() => readRunFlags({ activeHoldout: [], demotedChangeTypes: "title-meta" })).toThrow(/demotedChangeTypes must be an array/);
    expect(() => readRunFlags({ activeHoldout: [], demotedChangeTypes: [7] })).toThrow(/non-string change type/);
  });

  it("records the pages each file changes: its own page, or the validated manifest pages of a shared file", () => {
    const facts = { "content/seo/market-facts.json": `${JSON.stringify({ philadelphia: { rentMedian: 1600 } }, null, 2)}\n` };
    const after = { "content/seo/market-facts.json": `${JSON.stringify({ philadelphia: { rentMedian: 1650 } }, null, 2)}\n` };
    const manifest = { changes: [{ path: "/markets/philadelphia", file: "content/seo/market-facts.json", skill: "seo-market-enrich", changeType: "market-enrich", summary: "s" }] };
    const v = run(facts, after, { manifest });
    expect(details(v)).toBe("");
    expect(v.files[0]).toMatchObject({ path: "content/seo/market-facts.json", url: null, urls: ["/markets/philadelphia"] });
    const og = "app/blog/cap-rate-guide/opengraph-image.tsx";
    expect(urlForFile(og)).toBe("/blog/cap-rate-guide");
    const noindex = run({ "content/seo/noindex.json": "[]\n" }, { "content/seo/noindex.json": `${JSON.stringify(["/blog/dscr"])}\n` }, { manifest: { changes: [{ path: "/blog/dscr", file: "content/seo/noindex.json" }] }, indexed: 60 });
    expect(noindex.files[0].urls).toEqual(["/blog/dscr"]);
    expect(noindex.noindexAdded).toEqual(["/blog/dscr"]);
  });
});

// ------------------------------------------------------------------ the CLI

describe("main (CLI)", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  const NEW = "app/blog/zz-verify-static-cli-test/page.tsx";
  const page = BASE_PAGE.replace('<p>See <Link href="/legacy-page">the old page</Link>.</p>\n', "");

  function setup(content: string): { dir: string; args: string[] } {
    const dir = tmp();
    writeFileSync(path.join(dir, "patch.diff"), makePatch({}, { [NEW]: content }));
    writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ changes: [{ path: "/blog/zz-verify-static-cli-test", file: NEW, newArticle: true }] }));
    writeFileSync(path.join(dir, "flags.json"), JSON.stringify({ calibrating: false, crawlStalled: false, indexed: 300, sitemapPaths: SITEMAP, activeHoldout: [] }));
    const args = ["--patch", path.join(dir, "patch.diff"), "--manifest", path.join(dir, "manifest.json"), "--flags", path.join(dir, "flags.json"), "--out", path.join(dir, "verdict.json")];
    return { dir, args };
  }

  it("verifies a new article against the real checkout and writes the verdict", async () => {
    const { dir, args } = setup(page);
    expect(await main(parseArgs(args))).toBe(0);
    const verdict = JSON.parse(readFileSync(path.join(dir, "verdict.json"), "utf8")) as VerifyVerdict;
    expect(verdict).toMatchObject({ ok: true, tier: 1, declaredUrls: ["/blog/zz-verify-static-cli-test"], violations: [] });
    expect(verdict.patchSha256).toBe(createHash("sha256").update(readFileSync(path.join(dir, "patch.diff"))).digest("hex"));
  });

  it("makes a demoted change type tier 2, from run-flags.json or, when the flags lack the field, the newest brakes file", async () => {
    const saved = process.env.SEO_DATA_DIR;
    const data = tmp();
    process.env.SEO_DATA_DIR = data;
    try {
      const tierWith = async (flagsExtra: Record<string, unknown>): Promise<number> => {
        const { dir, args } = setup(page);
        writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ changes: [{ path: "/blog/zz-verify-static-cli-test", file: NEW, newArticle: true, changeType: "new-article" }] }));
        writeFileSync(path.join(dir, "flags.json"), JSON.stringify({ calibrating: false, crawlStalled: false, indexed: 300, sitemapPaths: SITEMAP, activeHoldout: [], ...flagsExtra }));
        expect(await main(parseArgs(args))).toBe(0);
        return (JSON.parse(readFileSync(path.join(dir, "verdict.json"), "utf8")) as VerifyVerdict).tier;
      };
      expect(await tierWith({ demotedChangeTypes: [] })).toBe(1);
      expect(await tierWith({ demotedChangeTypes: ["new-article"] })).toBe(2);
      expect(await tierWith({})).toBe(1); // no field and no brakes file: nothing was demoted
      writeFileSync(path.join(data, "brakes-2026-01-05.json"), JSON.stringify({ demotedChangeTypes: [{ changeType: "new-article", lossRate: 0.5, scored: 10 }] }));
      expect(await tierWith({})).toBe(2);
    } finally {
      if (saved === undefined) delete process.env.SEO_DATA_DIR;
      else process.env.SEO_DATA_DIR = saved;
    }
  });

  it("exits 1 and still writes the verdict when the fence trips", async () => {
    const { dir, args } = setup(edit(page, 'import Link from "next/link";', 'import Link from "next/link";\nimport { x } from "@/lib/supabase/admin";'));
    expect(await main(parseArgs([...args, "--crawl-stalled"]))).toBe(1);
    const verdict = JSON.parse(readFileSync(path.join(dir, "verdict.json"), "utf8")) as VerifyVerdict;
    expect(verdict.ok).toBe(false);
    expect(verdict.violations.map((v) => v.rule)).toEqual(expect.arrayContaining(["import", "cap-new-articles"]));
  });

  it("turns an internal error into a failing verdict instead of no verdict", async () => {
    const { dir, args } = setup(page);
    writeFileSync(path.join(dir, "flags.json"), "{ not json");
    expect(await main(parseArgs(args))).toBe(1);
    const verdict = JSON.parse(readFileSync(path.join(dir, "verdict.json"), "utf8")) as VerifyVerdict;
    expect(verdict.ok).toBe(false);
    expect(verdict.violations[0].rule).toBe("internal-error");
    expect(verdict.patchSha256).toHaveLength(64);
  });

  it("reads run-flags fail-closed", () => {
    expect(readRunFlags({ activeHoldout: [] })).toEqual({ calibrating: true, crawlStalled: true, indexed: 0, sitemapPaths: [], holdout: [], demoted: null });
    expect(readRunFlags({ calibrating: false, crawlStalled: false, indexed: 12, sitemapPaths: ["/a", 3], activeHoldout: ["/b", "/blog/x/", "https://usetruecap.com/c"] })).toEqual({
      calibrating: false,
      crawlStalled: false,
      indexed: 12,
      sitemapPaths: ["/a"],
      holdout: ["/b", "/blog/x", "/c"],
      demoted: null,
    });
  });

  it("a missing or renamed activeHoldout is an error, never 'no holdout'", async () => {
    for (const flags of [{}, { calibrating: false, crawlStalled: false, indexed: 3, holdout: ["/b"] }, { activeHoldout: "/b" }, { activeHoldout: ["/b", 7] }]) {
      expect(() => readRunFlags(flags), JSON.stringify(flags)).toThrow(/activeHoldout/);
    }
    const { dir, args } = setup(page);
    writeFileSync(path.join(dir, "flags.json"), JSON.stringify({ calibrating: false, crawlStalled: false, indexed: 300, sitemapPaths: SITEMAP }));
    expect(await main(parseArgs(args))).toBe(1);
    const verdict = JSON.parse(readFileSync(path.join(dir, "verdict.json"), "utf8")) as VerifyVerdict;
    expect(verdict.violations).toEqual([{ rule: "internal-error", path: null, detail: expect.stringContaining("activeHoldout") }]);
  });
});
