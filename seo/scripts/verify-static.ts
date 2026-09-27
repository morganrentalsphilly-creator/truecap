/**
 * verify-static.ts — the deterministic fence between the model and a mergeable PR.
 *
 * The seo-weekly model job hands over a patch (`git diff --binary`) and a run
 * manifest. This script runs on a clean checkout of main, treats BOTH as data,
 * and decides from the diff alone whether the patch may go any further and at
 * which tier. Its verdict (VerifyVerdict) is the only source of tier truth for
 * publish, the ledger and merge; nothing downstream re-derives it.
 *
 * Load-bearing constraints:
 *   - Nothing from the patch is ever executed. Post-images are rebuilt by
 *     `git apply` inside an empty temp dir that holds copies of the base files,
 *     and are then only PARSED (TypeScript compiler API) or scanned by the
 *     gate-1b scanner (scripts/check-agent-blog-content.mjs, run from main's
 *     checkout, never from the patch).
 *   - patchSha256 is taken over the raw bytes before any other work. Later jobs
 *     refuse any patch whose hash differs, so what was verified is what ships.
 *   - The diff is parsed here, strictly, and then cross-checked against git's
 *     own reading of it (numstat and the applied bytes must both agree). A
 *     patch that this parser and git read differently is rejected: a parser
 *     differential is exactly how a fence gets walked around.
 *   - The manifest is written by the model, so it can only REDUCE what is
 *     accepted (an undeclared file is a violation). It never raises a tier,
 *     never adds a path to the accepted set and never stands in for the diff.
 *   - Whole-file rules (imports, identifiers, directives, raw-HTML sinks,
 *     markup-breaking literals) apply to the entire post-image, not just the
 *     added lines: a payload split across an old line and a new one is still a
 *     payload. Link rules apply to ADDED links only; existing links are the
 *     site's, not the model's.
 *   - Fail closed. Anything this script cannot establish is a violation, and
 *     an internal error still produces a verdict with ok:false.
 *
 * Beyond the brief's list, these rules were added after measuring the article
 * corpus (230 page/OG modules on 2026-09-27) and finding ZERO legitimate uses,
 * so they cost nothing today and close known escapes:
 *   - computed keys (`x["con"+"structor"]`, `{[k]: v}`), denied names written
 *     as strings (`const { "constructor": F } = …`, `{ "__proto__": x }`) and
 *     reflection (getOwnPropertyDescriptors, prepareStackTrace, …): all reach
 *     the Function constructor without naming it as an identifier;
 *   - JSX spreads (`{...{dangerouslySetInnerHTML}}`), intrinsic elements
 *     outside a prose allow-list (<iframe>, <form>, <object>, …), `on*` props,
 *     and `style` on pages (a CSS url() loads a third-party resource);
 *   - route exports beyond default/metadata (OG: default/alt/size/contentType):
 *     `dynamic`, `revalidate`, `runtime` change how and when a module runs;
 *   - redeclaring or mutating globals (a local or reassigned `JSON.stringify`
 *     fakes the JSON-LD form), and JSX pragma comments (an `@jsxImportSource`
 *     is an import no declaration shows);
 *   - import specifiers with `..` segments: the allow-list globs let `*` cross
 *     `/`, so `@/components/ui/../../lib/supabase/admin` would match;
 *   - URLs embedded in prose strings or split across strings
 *     (`"https://" + host`, `url(//host)`), and hrefs/srcs that are not one
 *     verifiable literal (a module const is resolved; anything else is refused);
 *   - regular-expression literals carrying markup (`/<!--/.source` is a string);
 *   - adding or changing robots metadata or a next/navigation redirect: both
 *     remove a page from the index outside content/seo/noindex.json and its cap.
 * Date consts (PUBLISHED_AT, MODIFIED_AT, …) may not change in an existing
 * page: dates are set by the publish job from what actually changed.
 *
 * The brief's `jsonLdScript(...)` form is not accepted yet: no such helper
 * exists, so any import could be aliased to that name. When the F4 helper
 * lands, accept it only as an un-aliased named import from its one module.
 *
 * What it cannot see: a string computed at runtime (`"<a".slice(0, 1)` +
 * `"/script>"`), or a style value assembled from pieces inside an OG image.
 * The loopback render in verify-build (jsonld-validate.ts, a string-aware scan
 * of the RENDERED JSON-LD) is the backstop for the first.
 *
 *   node seo/scripts/verify-static.ts --patch patch.diff --manifest run-manifest.json \
 *        --flags run-flags.json [--sitemap-file paths.json] [--holdout paths.json] \
 *        [--indexed N] [--calibrating] [--crawl-stalled] --out verdict.json
 *   node seo/scripts/verify-static.ts --working-tree [--base origin/main]   (owner PRs; diffs against the
 *        merge-base with --base, so a branch that is behind main is judged on its own change; ignores any manifest)
 *
 * Exit 0 when ok, 1 when there are violations (the verdict is written either way).
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import type { Args } from "./lib/cli.ts";
import { check, flagNumber, flagString, hasFlag, log, runMain } from "./lib/cli.ts";
import type { SeoConfig } from "./lib/config.ts";
import { globMatch, loadConfig, matchesAny } from "./lib/config.ts";
import { pageUrlForFile } from "./lib/family.ts";
import { decodeEntities } from "./lib/html.ts";
import { cleanChangeType, isKnownChangeType, CHANGE_TYPES } from "./lib/change-types.ts";
import { readJsonIfExists, writeJson } from "./lib/io.ts";
import { REPO_ROOT, latestDataFile } from "./lib/paths.ts";
import { fetchSitemap, toPath } from "./lib/sitemap.ts";
import type { Brakes, VerifyFile, VerifyVerdict, Violation } from "./lib/types.ts";

// ------------------------------------------------------------------- limits

/** A weekly content patch is a few hundred KB at most; anything bigger is not one. */
const MAX_PATCH_BYTES = 8 * 1024 * 1024;
const GIT_HEADER = "diff --git ";
const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: .*)?$/;
const REGULAR_FILE_MODE = "100644";
const SAFE_PATH_RE = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
const ARTICLE_ROOTS = ["app/blog", "app/vs", "app/research"];
const ARTICLE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const SCANNER = path.join(REPO_ROOT, "scripts", "check-agent-blog-content.mjs");
/** Written by the publish job from rendered-main hashes; the model never edits dates. */
const PUBLISH_OWNED_FILES = new Set(["content/seo/lastmod.json"]);

/** Metadata consts whose string-only edits are tier 0 (the brief's list). */
const META_CONSTS = new Set(["TITLE", "SERP_TITLE", "TITLE_PLAIN", "DESCRIPTION", "META_DESCRIPTION", "OG_TITLE", "OG_DESCRIPTION"]);
const DATE_CONST_RE = /^[A-Z0-9_]*(?:PUBLISHED|MODIFIED|UPDATED|REVIEWED|CHECKED)[A-Z0-9_]*$/;
const DATE_PROPS = new Set(["datePublished", "dateModified", "dateCreated", "lastReviewed", "uploadDate"]);

/**
 * Identifiers a prose page never needs and a payload always does, rejected
 * ANYWHERE in the AST: as a property name too (`x.constructor` is the escape),
 * and as a string that equals one exactly (`const { "constructor": F } = f`
 * destructures the same member). The first nine are the brief's; the rest
 * (reflection, timers, encoders, global mutation) had zero uses in the corpus
 * when this was written. Matched on the AST and on whole strings, so "the
 * escrow process" in prose is fine.
 */
export const DENIED_IDENTIFIERS = new Set([
  "process", "globalThis", "eval", "Function", "fetch", "XMLHttpRequest", "WebSocket", "__dirname", "Buffer",
  "global", "require", "module", "exports", "__filename", "constructor", "prototype", "__proto__",
  "Reflect", "Proxy", "WebAssembly", "Worker", "SharedArrayBuffer", "Atomics", "atob", "btoa", "fromCharCode",
  "fromCodePoint", "setTimeout", "setInterval", "setImmediate", "queueMicrotask", "Deno", "Bun", "createElement",
  "defineProperty", "defineProperties", "assign", "getPrototypeOf", "setPrototypeOf", "getOwnPropertyDescriptor",
  "getOwnPropertyDescriptors", "getOwnPropertyNames", "getOwnPropertySymbols", "ownKeys", "prepareStackTrace",
  "captureStackTrace", "__lookupGetter__", "__lookupSetter__", "__defineGetter__", "__defineSetter__",
]);

/**
 * Browser globals: rejected only as free references. As property or key names
 * they are ordinary words (`{ location: "Philadelphia" }`, `row.document`).
 */
export const DENIED_FREE_IDENTIFIERS = new Set([
  "window", "self", "document", "location", "navigator", "localStorage", "sessionStorage", "indexedDB", "caches",
  "EventSource", "importScripts", "postMessage", "sendBeacon",
]);

/** Globals a module may not redeclare: `const JSON = {stringify: …}` would fake the JSON-LD form. */
const SHADOW_PROTECTED = new Set(["JSON", "Object", "Array", "String", "Number", "Boolean", "Math", "Date", "Symbol", "Promise", "RegExp", "Error", "Map", "Set", "Intl", "undefined", "NaN", "Infinity"]);

/** Value exports an article module may have (measured: every page and OG image in the corpus). */
const ARTICLE_EXPORTS: Record<string, Set<string>> = {
  "page.tsx": new Set(["default", "metadata"]),
  "opengraph-image.tsx": new Set(["default", "alt", "size", "contentType"]),
};

/** Intrinsic elements an article may render. <script> is allowed only as JSON-LD. */
const ALLOWED_INTRINSIC = new Set([
  "a", "abbr", "article", "aside", "b", "blockquote", "br", "caption", "cite", "code", "col", "colgroup", "dd", "del",
  "details", "dfn", "div", "dl", "dt", "em", "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6",
  "header", "hr", "i", "ins", "kbd", "li", "main", "mark", "nav", "ol", "p", "pre", "q", "s", "samp", "script",
  "section", "small", "span", "strong", "sub", "summary", "sup", "table", "tbody", "td", "tfoot", "th", "thead",
  "time", "tr", "u", "ul", "var", "wbr",
]);
/** Attributes that run code, submit, or fetch a URL the link rules do not follow (zero corpus uses). */
const DENIED_JSX_ATTRIBUTES = new Set(["srcDoc", "formAction", "action", "ping", "srcSet", "srcset", "poster", "background", "xlinkHref", "xlink:href"]);
const LINK_SHORTENERS = new Set([
  "bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at",
  "tiny.cc", "lnkd.in", "rb.gy", "t.ly", "s.id", "v.gd", "bl.ink", "short.io",
]);
const LINK_PROPERTY_NAMES = new Set(["href", "url", "link", "sameAs", "@id"]);
const STATIC_ASSET_RE = /\/[^/]+\.(?:jpe?g|png|webp|avif|gif|svg|ico|pdf|csv|txt|xml|json|mp4|webm)$/i;
const MARKUP_BREAKERS = /<\/|<!--|<script/i;
/**
 * CSS that fetches — `url(` followed by a scheme, a path, or the end of the
 * piece (a split value) — plus image-set() and @import. No article needs it,
 * and in a Tailwind class or a style it loads a third-party resource. Prose
 * such as "the listing URL(s)" does not match.
 */
const CSS_FETCH = /\burl\(\s*['"]?\s*(?:[a-z][a-z0-9+.-]*:|[/\\.]|$)|image-set\(|@import\b/i;
/** A backslash or an ASCII control character: browsers read `/\host` as `//host` and drop tabs/newlines. */
const URL_HAZARD = /[\\\x00-\x1f\x7f]/;
/** Metadata that can deindex a page; changing it goes through content/seo/noindex.json instead. */
const ROBOTS_NAME = /^(?:robots|googlebot)$/i;
/** Its exports redirect, 404 or reroute a page (`permanentRedirect`, `notFound`, `useRouter`, …). */
const NAVIGATION_MODULE = "next/navigation";

/**
 * The only post-processing a JSON-LD `__html` value may carry: exact
 * one-character escapes (regex source text → replacement string value). Each
 * replacement is a JSON `\uXXXX` escape: it cannot delete, reorder or rebuild
 * characters, so a chain of them never turns checked literals into markup.
 * Built by concatenation so no escape sequence has to survive an editor.
 */
const uEscape = (hex: string): string => "\\" + "u" + hex;
const LD_ESCAPES: ReadonlyMap<string, string> = new Map([
  ["/</g", uEscape("003c")],
  ["/>/g", uEscape("003e")],
  ["/&/g", uEscape("0026")],
  [`/${uEscape("2028")}/g`, uEscape("2028")],
  [`/${uEscape("2029")}/g`, uEscape("2029")],
]);

// -------------------------------------------------------------------- types

export type HunkLine = { kind: " " | "+" | "-" | "\\"; text: string };
export type PatchHunk = { oldStart: number; oldLines: number; newStart: number; newLines: number; lines: HunkLine[] };
export type PatchFile = {
  /** Repo-relative path of the file after the patch (before it, for a deletion). */
  path: string;
  oldPath: string | null;
  newPath: string | null;
  status: VerifyFile["status"];
  oldMode: string | null;
  newMode: string | null;
  isNew: boolean;
  isDeleted: boolean;
  isRename: boolean;
  isCopy: boolean;
  isBinary: boolean;
  hunks: PatchHunk[];
  addedLines: number;
  removedLines: number;
  /** 1-based post-image line numbers the patch added. */
  addedLineNumbers: number[];
};
export type ParsedPatch = { files: PatchFile[]; errors: string[] };

export type BaseReader = {
  /** Base content of a repo-relative file, or null when it does not exist on the base. */
  read(file: string): string | null;
  dirExists(dir: string): boolean;
  /** Whether a regular file exists on the base (read() !== null when omitted). */
  exists?(file: string): boolean;
};

export type SandboxInput = { patch: Uint8Array; preImages: Map<string, string>; files: PatchFile[]; scan: string[] };
export type SandboxResult = { postImages: Map<string, string>; violations: Violation[] };
/** Rebuilds post-images outside the repo and runs the scanners that need real files. */
export type Sandbox = (input: SandboxInput) => SandboxResult;

export type VerifyInput = {
  patch: Uint8Array | string;
  base: BaseReader;
  /** Parsed run-manifest.json, untrusted. null/undefined = none supplied. */
  manifest?: unknown;
  /** Set when the manifest file existed but could not be read or parsed. */
  manifestError?: string | null;
  mode?: "patch" | "working-tree";
  sitemap: Iterable<string>;
  holdout?: Iterable<string>;
  calibrating?: boolean;
  crawlStalled?: boolean;
  indexed?: number;
  /** Working-tree mode: untracked files git diff cannot see. */
  untracked?: string[];
  /**
   * Change types the brakes demoted this run (run-flags.json
   * demotedChangeTypes, cleaned slugs). A file whose manifest change names
   * one is tier 2; while any is set, every change must name a known type.
   */
  demotedChangeTypes?: Iterable<string>;
  config?: SeoConfig;
  /** null = pure mode (JS applier only, no git, no scanner). */
  sandbox?: Sandbox | null;
};

type ManifestChange = { path: string; file: string; newArticle: boolean; changeType: unknown };
/** jsx-src: a src attribute, which may only name a same-origin file under public/. */
type LinkRef = { href: string; line: number; kind: "jsx-href" | "jsx-src" | "property" | "literal" };
type Reporter = (rule: string, file: string | null, detail: string) => void;

// ------------------------------------------------------------------ helpers

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function preview(text: string, max = 60): string {
  const flat = text.replace(/\s+/g, " ");
  return JSON.stringify(flat.length > max ? `${flat.slice(0, max - 1)}…` : flat);
}

function isTsFile(file: string): boolean {
  return /\.(?:ts|tsx)$/.test(file);
}

function parseTs(file: string, source: string): ts.SourceFile {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
}

function lineOf(sf: ts.SourceFile, pos: number): number {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

function walk(node: ts.Node, visit: (n: ts.Node) => void): void {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

function propertyNameText(name: ts.PropertyName | ts.JsxAttributeName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text;
  if (ts.isPrivateIdentifier(name)) return name.text;
  return null;
}

function jsxAttributeName(attr: ts.JsxAttribute): string {
  return ts.isIdentifier(attr.name) ? attr.name.text : attr.name.getText();
}

/** The literal string an attribute or property holds, when it is a plain literal. */
function literalValue(node: ts.Node | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isJsxExpression(node) && node.expression) return literalValue(node.expression);
  if (ts.isParenthesizedExpression(node)) return literalValue(node.expression);
  return null;
}

function isStringish(node: ts.Expression): boolean {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return true;
  if (ts.isParenthesizedExpression(node)) return isStringish(node.expression);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return isStringish(node.left) && isStringish(node.right);
  return false;
}

/** A metadata property value: a string, a const reference, or a template of const references. */
function isMetaValue(node: ts.Expression): boolean {
  if (isStringish(node) || ts.isIdentifier(node)) return true;
  if (ts.isParenthesizedExpression(node)) return isMetaValue(node.expression);
  if (ts.isTemplateExpression(node)) return node.templateSpans.every((span) => ts.isIdentifier(span.expression));
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return isMetaValue(node.left) && isMetaValue(node.right);
  return false;
}

function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function unwrapExpression(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isSatisfiesExpression(current)) current = current.expression;
  return current;
}

function hostMatches(host: string, domains: string[]): boolean {
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function siteHost(config: SeoConfig): string {
  return new URL(config.site.base).hostname.toLowerCase();
}

// -------------------------------------------------------------- diff parser

/**
 * Parse a git C-style quoted name starting at `start` (which must be `"`).
 * Octal escapes are bytes, so the result is decoded as UTF-8 (strictly).
 */
export function parseQuotedName(text: string, start: number): { value: string; end: number } | null {
  if (text[start] !== '"') return null;
  const bytes: number[] = [];
  const simple: Record<string, number> = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, "\\": 92 };
  const encoder = new TextEncoder();
  for (let i = start + 1; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      try {
        return { value: new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes)), end: i + 1 };
      } catch {
        return null;
      }
    }
    if (ch !== "\\") {
      bytes.push(...encoder.encode(ch));
      continue;
    }
    const next = text[i + 1];
    if (next === undefined) return null;
    if (next in simple) {
      bytes.push(simple[next]);
      i += 1;
      continue;
    }
    const octal = /^[0-7]{3}/.exec(text.slice(i + 1, i + 4));
    if (!octal) return null;
    bytes.push(parseInt(octal[0], 8));
    i += 3;
  }
  return null;
}

/** `diff --git <a> <b>` → the two names without their a/ b/ prefixes; nulls when ambiguous. */
function parseGitHeaderNames(rest: string): { a: string | null; b: string | null } | null {
  const strip = (a: string, b: string): { a: string; b: string } | null =>
    a.startsWith("a/") && b.startsWith("b/") ? { a: a.slice(2), b: b.slice(2) } : null;
  if (rest.startsWith('"')) {
    const first = parseQuotedName(rest, 0);
    if (!first || rest[first.end] !== " ") return null;
    const remainder = rest.slice(first.end + 1);
    if (remainder.startsWith('"')) {
      const second = parseQuotedName(remainder, 0);
      if (!second || second.end !== remainder.length) return null;
      return strip(first.value, second.value);
    }
    return strip(first.value, remainder);
  }
  if (rest.endsWith('"')) {
    for (let k = rest.indexOf(' "'); k !== -1; k = rest.indexOf(' "', k + 1)) {
      const second = parseQuotedName(rest, k + 1);
      if (second && second.end === rest.length) return strip(rest.slice(0, k), second.value);
    }
    return null;
  }
  // Both unquoted: git's own rule. The names are equal unless this is a
  // rename, so split the line in the middle and check the halves agree.
  if ((rest.length - 1) % 2 === 0) {
    const half = (rest.length - 1) / 2;
    const left = rest.slice(0, half);
    const right = rest.slice(half + 1);
    if (rest[half] === " " && left.startsWith("a/") && right.startsWith("b/") && left.slice(2) === right.slice(2)) {
      return { a: left.slice(2), b: right.slice(2) };
    }
  }
  return { a: null, b: null };
}

/** The name field of a `---`/`+++`/`rename from` line: quoted, or unquoted up to a TAB. */
function parseNameField(field: string): string | null {
  if (field.startsWith('"')) {
    const quoted = parseQuotedName(field, 0);
    if (!quoted) return null;
    const rest = field.slice(quoted.end);
    return rest === "" || rest.startsWith("\t") ? quoted.value : null;
  }
  const tab = field.indexOf("\t");
  return tab === -1 ? field : field.slice(0, tab);
}

function parseHunk(lines: string[], start: number): { hunk: PatchHunk; next: number; added: number[] } | { error: string } {
  const m = HUNK_RE.exec(lines[start]);
  if (!m) return { error: `line ${start + 1}: malformed hunk header ${preview(lines[start])}` };
  const hunk: PatchHunk = {
    oldStart: Number(m[1]),
    oldLines: m[2] === undefined ? 1 : Number(m[2]),
    newStart: Number(m[3]),
    newLines: m[4] === undefined ? 1 : Number(m[4]),
    lines: [],
  };
  const added: number[] = [];
  let oldLeft = hunk.oldLines;
  let newLeft = hunk.newLines;
  let newLineNo = hunk.newStart;
  let i = start + 1;
  const take = (): boolean => {
    const line = lines[i];
    const kind = line[0];
    if (kind === " ") {
      if (oldLeft === 0 || newLeft === 0) return false;
      oldLeft -= 1;
      newLeft -= 1;
      newLineNo += 1;
    } else if (kind === "-") {
      if (oldLeft === 0) return false;
      oldLeft -= 1;
    } else if (kind === "+") {
      if (newLeft === 0) return false;
      newLeft -= 1;
      added.push(newLineNo);
      newLineNo += 1;
    } else if (kind === "\\") {
      if (!line.startsWith("\\ ") || hunk.lines.length === 0) return false;
    } else {
      return false;
    }
    hunk.lines.push({ kind, text: line.slice(1) });
    i += 1;
    return true;
  };
  while (oldLeft > 0 || newLeft > 0) {
    if (i >= lines.length) return { error: `line ${start + 1}: hunk is truncated (the patch ends inside it)` };
    if (!take()) return { error: `line ${i + 1}: line does not fit its hunk ${preview(lines[i])}` };
  }
  while (i < lines.length && lines[i].startsWith("\\ ")) take();
  return { hunk, next: i, added };
}

/**
 * Parse `git diff --binary` output. Strict on purpose: anything this parser
 * does not recognise is an error rather than something to skip, because git
 * apply may read what we skipped.
 */
export function parsePatch(text: string): ParsedPatch {
  const files: PatchFile[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  const lines = text.split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  let i = 0;
  const stop = (message: string): ParsedPatch => {
    errors.push(message);
    return { files, errors };
  };
  while (i < lines.length) {
    const headerLine = lines[i];
    if (!headerLine.startsWith(GIT_HEADER)) return stop(`line ${i + 1}: expected a "diff --git" header, found ${preview(headerLine)}`);
    const names = parseGitHeaderNames(headerLine.slice(GIT_HEADER.length));
    if (!names) return stop(`line ${i + 1}: unparseable diff header ${preview(headerLine)}`);
    const file: PatchFile = {
      path: "",
      oldPath: names.a,
      newPath: names.b,
      status: "M",
      oldMode: null,
      newMode: null,
      isNew: false,
      isDeleted: false,
      isRename: false,
      isCopy: false,
      isBinary: false,
      hunks: [],
      addedLines: 0,
      removedLines: 0,
      addedLineNumbers: [],
    };
    const where = `line ${i + 1}`;
    let renameFrom: string | null = null;
    let renameTo: string | null = null;
    let minus: string | null | undefined;
    let plus: string | null | undefined;
    i += 1;

    // Extended header lines, then optionally the ---/+++ pair.
    while (i < lines.length && !lines[i].startsWith(GIT_HEADER) && !lines[i].startsWith("@@")) {
      const h = lines[i];
      let m: RegExpExecArray | null;
      if (h.startsWith("--- ")) {
        const next = lines[i + 1];
        if (next === undefined || !next.startsWith("+++ ")) return stop(`line ${i + 1}: "---" without a following "+++"`);
        const rawMinus = parseNameField(h.slice(4));
        const rawPlus = parseNameField(next.slice(4));
        if (rawMinus === null || rawPlus === null) return stop(`line ${i + 1}: unparseable file name line`);
        if (rawMinus !== "/dev/null" && !rawMinus.startsWith("a/")) return stop(`line ${i + 1}: "---" name lacks the a/ prefix`);
        if (rawPlus !== "/dev/null" && !rawPlus.startsWith("b/")) return stop(`line ${i + 2}: "+++" name lacks the b/ prefix`);
        minus = rawMinus === "/dev/null" ? null : rawMinus.slice(2);
        plus = rawPlus === "/dev/null" ? null : rawPlus.slice(2);
        i += 2;
        break;
      } else if ((m = /^old mode (\d{6})$/.exec(h))) file.oldMode = m[1];
      else if ((m = /^new mode (\d{6})$/.exec(h))) file.newMode = m[1];
      else if ((m = /^deleted file mode (\d{6})$/.exec(h))) {
        file.isDeleted = true;
        file.oldMode = m[1];
      } else if ((m = /^new file mode (\d{6})$/.exec(h))) {
        file.isNew = true;
        file.newMode = m[1];
      } else if ((m = /^index [0-9a-f]+\.\.[0-9a-f]+(?: (\d{6}))?$/.exec(h))) {
        if (m[1]) {
          file.oldMode ??= m[1];
          file.newMode ??= m[1];
        }
      } else if (/^(?:dis)?similarity index \d+%$/.test(h)) {
        // companion of rename/copy lines, which carry the decision
      } else if (h.startsWith("rename from ")) {
        file.isRename = true;
        renameFrom = parseNameField(h.slice("rename from ".length));
      } else if (h.startsWith("rename to ")) {
        file.isRename = true;
        renameTo = parseNameField(h.slice("rename to ".length));
      } else if (h.startsWith("copy from ") || h.startsWith("copy to ")) {
        file.isCopy = true;
        const name = parseNameField(h.slice(h.startsWith("copy from ") ? 10 : 8));
        if (h.startsWith("copy from ")) renameFrom = name;
        else renameTo = name;
      } else if (h === "GIT binary patch") {
        file.isBinary = true;
        i += 1;
        // The payload is base85 lines and blank separators; it can never
        // contain a "diff --git " line (base85 has no space character).
        while (i < lines.length && !lines[i].startsWith(GIT_HEADER)) i += 1;
        break;
      } else if (/^Binary files .* differ$/.test(h)) {
        file.isBinary = true;
      } else {
        return stop(`line ${i + 1}: unrecognised header line ${preview(h)}`);
      }
      i += 1;
    }

    while (i < lines.length && lines[i].startsWith("@@")) {
      if (minus === undefined) return stop(`line ${i + 1}: hunk before any "---"/"+++" file names`);
      const parsed = parseHunk(lines, i);
      if ("error" in parsed) return stop(parsed.error);
      file.hunks.push(parsed.hunk);
      file.addedLineNumbers.push(...parsed.added);
      for (const line of parsed.hunk.lines) {
        if (line.kind === "+") file.addedLines += 1;
        else if (line.kind === "-") file.removedLines += 1;
      }
      i = parsed.next;
    }
    if (i < lines.length && !lines[i].startsWith(GIT_HEADER)) return stop(`line ${i + 1}: unexpected line after a file's hunks ${preview(lines[i])}`);

    // Reconcile the names: the header, the ---/+++ pair and any rename lines
    // must all tell the same story, or git and this parser may disagree.
    if (file.isNew && minus !== undefined && minus !== null) return stop(`${where}: new file whose "---" is not /dev/null`);
    if (file.isDeleted && plus !== undefined && plus !== null) return stop(`${where}: deleted file whose "+++" is not /dev/null`);
    let oldName = file.oldPath ?? renameFrom ?? (minus === undefined ? null : minus);
    let newName = file.newPath ?? renameTo ?? (plus === undefined ? null : plus);
    if (minus !== undefined && minus !== null && oldName !== null && minus !== oldName) return stop(`${where}: "---" name disagrees with the diff header`);
    if (plus !== undefined && plus !== null && newName !== null && plus !== newName) return stop(`${where}: "+++" name disagrees with the diff header`);
    if (renameFrom !== null && oldName !== renameFrom) return stop(`${where}: "rename from" disagrees with the diff header`);
    if (renameTo !== null && newName !== renameTo) return stop(`${where}: "rename to" disagrees with the diff header`);
    if (oldName === null && minus !== undefined && minus !== null) oldName = minus;
    if (newName === null && plus !== undefined && plus !== null) newName = plus;
    if (oldName === null || newName === null) return stop(`${where}: cannot determine the file name`);
    if (!file.isRename && !file.isCopy && oldName !== newName) return stop(`${where}: header names differ without rename/copy lines`);
    file.oldPath = file.isNew ? null : oldName;
    file.newPath = file.isDeleted ? null : newName;
    file.path = file.isDeleted ? oldName : newName;
    file.status = file.isNew
      ? "A"
      : file.isDeleted
        ? "D"
        : file.isRename || file.isCopy
          ? "R"
          : file.oldMode && file.newMode && file.oldMode !== file.newMode
            ? "T"
            : "M";
    if (seen.has(file.path)) return stop(`${where}: ${file.path} appears twice in the patch`);
    seen.add(file.path);
    files.push(file);
  }
  return { files, errors };
}

/**
 * Apply one file's hunks to its pre-image, requiring every context and
 * removed line to match exactly at the stated position (git apply may slide
 * a hunk; if it does, the two post-images differ and the patch is rejected).
 */
export function applyHunks(pre: string | null, hunks: PatchHunk[]): string {
  const src = pre === null || pre === "" ? [] : pre.split("\n");
  let srcEol = true;
  if (src.length) {
    if (src[src.length - 1] === "") src.pop();
    else srcEol = false;
  }
  const out: string[] = [];
  let cursor = 0;
  let endEol: boolean | null = null;
  for (const hunk of hunks) {
    const start = hunk.oldLines === 0 ? hunk.oldStart : hunk.oldStart - 1;
    if (start < cursor || start > src.length) throw new Error(`hunk @@ -${hunk.oldStart} is out of order or past the end of the file`);
    while (cursor < start) out.push(src[cursor++]);
    if (hunk.newLines > 0 && out.length !== hunk.newStart - 1) throw new Error(`hunk @@ +${hunk.newStart} does not land where its header says`);
    let previous: HunkLine | null = null;
    let oldNoEol = false;
    let newNoEol = false;
    for (const line of hunk.lines) {
      if (line.kind === "\\") {
        if (previous?.kind === "-") oldNoEol = true;
        else if (previous?.kind === "+") newNoEol = true;
        else if (previous?.kind === " ") {
          oldNoEol = true;
          newNoEol = true;
        }
        continue;
      }
      if (line.kind === " " || line.kind === "-") {
        if (cursor >= src.length || src[cursor] !== line.text) throw new Error(`context does not match the base at line ${cursor + 1}`);
        cursor += 1;
      }
      if (line.kind === " " || line.kind === "+") out.push(line.text);
      previous = line;
    }
    if (oldNoEol && (cursor !== src.length || srcEol)) throw new Error("a no-newline marker does not match the base file");
    if (cursor === src.length) endEol = !newNoEol;
  }
  while (cursor < src.length) out.push(src[cursor++]);
  if (!out.length) return "";
  const eol = endEol ?? srcEol;
  return out.join("\n") + (eol ? "\n" : "");
}

// ------------------------------------------------------------- path fences

/** Structural rejections: things the loop never does, whatever the file. */
export function structureViolations(file: PatchFile): Violation[] {
  const out: Violation[] = [];
  const add = (rule: string, detail: string): void => {
    if (!out.some((v) => v.rule === rule)) out.push({ rule, path: file.path, detail });
  };
  if (file.isDeleted) add("deletion", "the loop never deletes a file (pruning goes through content/seo/noindex.json)");
  if (file.isRename || file.isCopy) add("rename", "renames and copies are not allowed");
  for (const mode of [file.oldMode, file.newMode]) {
    if (mode === "120000") add("symlink", "symlinks are not allowed (mode 120000)");
    else if (mode === "160000") add("gitlink", "submodules are not allowed (mode 160000)");
    else if (mode !== null && mode !== REGULAR_FILE_MODE) add("file-mode", `only regular ${REGULAR_FILE_MODE} files are allowed, found ${mode}`);
  }
  if (!file.isNew && !file.isDeleted && file.oldMode && file.newMode && file.oldMode !== file.newMode) add("mode-change", `mode ${file.oldMode} → ${file.newMode}`);
  if (file.isBinary) add("binary", "binary content is never allowed (OG images are .tsx)");
  return out;
}

/** app/blog/<slug>, app/vs/<slug> or app/research/<slug> for an article file, else null. */
export function articleDirOf(file: string): string | null {
  for (const root of ARTICLE_ROOTS) {
    if (!file.startsWith(`${root}/`)) continue;
    const parts = file.slice(root.length + 1).split("/");
    return parts.length === 2 ? `${root}/${parts[0]}` : null;
  }
  return null;
}

/** The page URL a changed file renders (lib/family.ts pageUrlForFile, the one shared mapping). */
export function urlForFile(file: string): string | null {
  return pageUrlForFile(file);
}

export function pathViolations(file: string, config: SeoConfig): Violation[] {
  const out: Violation[] = [];
  const add = (rule: string, detail: string): void => {
    out.push({ rule, path: file, detail });
  };
  const segments = file.split("/");
  if (!SAFE_PATH_RE.test(file) || segments.some((s) => s === "." || s === "..")) {
    add("path-unsafe", "paths may contain only letters, digits, '.', '_', '-' and '/' segments (no spaces, quotes or '..')");
    return out;
  }
  if (!matchesAny(config.paths.agentAllow, file)) add("path-not-allowed", "outside the agent allow-list (seo/config.json paths.agentAllow)");
  if (matchesAny(config.paths.agentDeny, file)) add("path-denied", "matches the agent deny-list (seo/config.json paths.agentDeny)");
  const base = segments[segments.length - 1];
  if (config.paths.forbiddenFileNames.includes(base)) add("forbidden-file-name", `${base} is never agent-writable`);
  // The allow-list's `*` crosses `/`; datasets live flat, where the dataset checks look for them.
  for (const flat of ["content/seo/", "public/research/"]) {
    if (file.startsWith(flat) && file.slice(flat.length).includes("/")) add("dataset-depth", `files under ${flat} must be direct children`);
  }
  for (const root of ARTICLE_ROOTS) {
    if (!file.startsWith(`${root}/`)) continue;
    const parts = file.slice(root.length + 1).split("/");
    if (parts.length !== 2) {
      add("article-depth", `files under ${root}/ must be ${root}/<slug>/<file>`);
      continue;
    }
    if (!ARTICLE_SLUG_RE.test(parts[0])) add("article-slug", `article directory ${preview(parts[0])} is not a lowercase slug`);
    if (!config.paths.articleFileNames.includes(parts[1])) add("article-file-name", `only ${config.paths.articleFileNames.join(", ")} are allowed under ${root}/<slug>/`);
  }
  return out;
}

// ------------------------------------------------------------ content: TS

/** Import specifiers: the allow-list, the deny prefixes, no dynamic loading. */
export function checkImports(file: string, source: string, config: SeoConfig = loadConfig()): Violation[] {
  return importViolations(parseTs(file, source), file, config);
}

function specifierViolation(spec: string, config: SeoConfig): string | null {
  if (!/^[A-Za-z0-9@][A-Za-z0-9@/._-]*$/.test(spec) || spec.split("/").some((s) => s === "." || s === ".." || s === "")) {
    return `import ${preview(spec)} is not a plain module specifier (no relative, '..' or loader syntax)`;
  }
  const denied = config.paths.importDenyPrefixes.find((prefix) => spec === prefix || spec.startsWith(prefix));
  if (denied) return `import ${preview(spec)} is denied (prefix ${preview(denied)})`;
  if (!matchesAny(config.paths.importAllow, spec)) return `import ${preview(spec)} is not on the import allow-list`;
  return null;
}

function importViolations(sf: ts.SourceFile, file: string, config: SeoConfig): Violation[] {
  const out: Violation[] = [];
  const add = (node: ts.Node, detail: string): void => {
    out.push({ rule: "import", path: file, detail: `line ${lineOf(sf, node.getStart(sf))}: ${detail}` });
  };
  if (sf.referencedFiles.length || sf.typeReferenceDirectives.length || sf.libReferenceDirectives.length) {
    out.push({ rule: "import", path: file, detail: "triple-slash reference directives are not allowed" });
  }
  // `/** @jsxImportSource x */` makes the compiler import x/jsx-runtime: an import no declaration shows.
  if (/@jsx(?:ImportSource|Runtime|Frag)?\b/.test(sf.text)) {
    out.push({ rule: "import", path: file, detail: "JSX pragma comments (@jsx, @jsxImportSource, …) are not allowed" });
  }
  walk(sf, (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      const spec = literalValue(node.moduleSpecifier);
      const problem = spec === null ? "non-literal module specifier" : specifierViolation(spec, config);
      if (problem) add(node, problem);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      add(node, "`import x = require(...)` is not allowed");
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      add(node, "dynamic import() is not allowed");
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require") {
      add(node, "require() is not allowed");
    } else if (ts.isImportTypeNode(node)) {
      add(node, "import() types are not allowed");
    }
  });
  return out;
}

/** `JSON.stringify(x)` or `JSON.stringify(x, null, <number>)`: never a replacer, never a spread argument. */
function isJsonStringifyCall(expr: ts.Expression): boolean {
  const call = unwrapExpression(expr);
  if (!ts.isCallExpression(call)) return false;
  const callee = call.expression;
  if (!ts.isPropertyAccessExpression(callee) || !ts.isIdentifier(callee.expression) || callee.expression.text !== "JSON" || callee.name.text !== "stringify") return false;
  const args = call.arguments;
  // `JSON.stringify(...[x, replacer])` is one syntactic argument and a replacer at runtime.
  if (args.some((arg) => ts.isSpreadElement(arg))) return false;
  if (args.length === 1) return true;
  return args.length === 3 && args[1].kind === ts.SyntaxKind.NullKeyword && ts.isNumericLiteral(args[2]);
}

/** `.replace(/</g, "\\u003c")`-shaped: exactly one LD_ESCAPES pair, compared as source text. */
function isExactEscapeCall(call: ts.CallExpression): boolean {
  const callee = call.expression;
  if (!ts.isPropertyAccessExpression(callee) || (callee.name.text !== "replace" && callee.name.text !== "replaceAll")) return false;
  if (call.arguments.length !== 2) return false;
  const [pattern, replacement] = call.arguments;
  return ts.isRegularExpressionLiteral(pattern) && ts.isStringLiteral(replacement) && LD_ESCAPES.get(pattern.text) === replacement.text;
}

/** JSON.stringify(...) under zero or more exact escape calls, and nothing else. */
function isEscapedJsonStringify(expr: ts.Expression): boolean {
  let current = unwrapExpression(expr);
  while (ts.isCallExpression(current) && isExactEscapeCall(current)) current = unwrapExpression((current.expression as ts.PropertyAccessExpression).expression);
  return isJsonStringifyCall(current);
}

/**
 * `{ __html: JSON.stringify(x) }`, optionally with exact escape calls on top.
 * Any other chain can delete or rebuild characters (`.replace(/"(<)Q/, '""}$1')`
 * turns a checked literal back into `</script>`), so none is accepted.
 */
function isAllowedLdJsonValue(expr: ts.Expression): boolean {
  const value = unwrapExpression(expr);
  if (!ts.isObjectLiteralExpression(value) || value.properties.length !== 1) return false;
  const prop = value.properties[0];
  if (!ts.isPropertyAssignment(prop) || propertyNameText(prop.name) !== "__html") return false;
  return isEscapedJsonStringify(prop.initializer);
}

function checkScriptElement(element: ts.JsxOpeningElement | ts.JsxSelfClosingElement, report: (detail: string) => void): void {
  const attrs = element.attributes.properties;
  let typeOk = false;
  let htmlOk = false;
  for (const attr of attrs) {
    if (!ts.isJsxAttribute(attr)) continue; // spreads are reported separately
    const name = jsxAttributeName(attr);
    if (name === "type") typeOk = literalValue(attr.initializer) === "application/ld+json";
    else if (name === "dangerouslySetInnerHTML") {
      htmlOk = !!attr.initializer && ts.isJsxExpression(attr.initializer) && !!attr.initializer.expression && isAllowedLdJsonValue(attr.initializer.expression);
    } else if (name !== "key" && name !== "id") report(`<script> may not carry ${name}=`);
  }
  if (!typeOk) report('<script> is allowed only as type="application/ld+json"');
  if (!htmlOk) report('<script> must set dangerouslySetInnerHTML={{ __html: JSON.stringify(<expr>) }} (optionally + exact .replace(/</g, "\\u003c")-style escapes)');
  if (ts.isJsxOpeningElement(element) && ts.isJsxElement(element.parent)) {
    const hasChildren = element.parent.children.some((child) => !ts.isJsxText(child) || child.text.trim() !== "");
    if (hasChildren) report("<script> may not have children");
  }
}

/** True when an identifier is a property/key/attribute NAME rather than a reference. */
function isNamePosition(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) || ts.isQualifiedName(parent)) return (ts.isPropertyAccessExpression(parent) ? parent.name : parent.right) === node;
  if (ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent) || ts.isPropertySignature(parent) || ts.isMethodSignature(parent)) return parent.name === node;
  if (ts.isGetAccessorDeclaration(parent) || ts.isSetAccessorDeclaration(parent) || ts.isJsxAttribute(parent)) return parent.name === node;
  if (ts.isBindingElement(parent)) return parent.propertyName === node;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) return parent.propertyName === node;
  return false;
}

/** Local name → module specifier, for every binding an import declaration creates. */
function importBindings(sf: ts.SourceFile): Map<string, string> {
  const names = new Map<string, string>();
  for (const statement of sf.statements) {
    const clause = ts.isImportDeclaration(statement) ? statement.importClause : undefined;
    const spec = clause ? literalValue((statement as ts.ImportDeclaration).moduleSpecifier) : null;
    if (!clause || spec === null) continue;
    if (clause.name) names.set(clause.name.text, spec);
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) names.set(bindings.name.text, spec);
    if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) names.set(element.name.text, spec);
  }
  return names;
}

/** Whether a binding name or pattern binds `name`. */
function bindsName(binding: ts.BindingName, name: string): boolean {
  if (ts.isIdentifier(binding)) return binding.text === name;
  return binding.elements.some((element) => !ts.isOmittedExpression(element) && bindsName(element.name, name));
}

/**
 * How the module binds names, for link resolution:
 *   nested — declared anywhere below the top level (parameters included), so
 *            a reference may not mean the top-level binding;
 *   unsafe — declared below the top level by anything but a parameter, or
 *            assigned anywhere (`t = …`, `t++`, `for (t of …)`): a parameter
 *            with one of these names may not hold what the caller passed.
 */
function bindingInfo(sf: ts.SourceFile): { nested: Set<string>; unsafe: Set<string> } {
  const nested = new Set<string>();
  const unsafe = new Set<string>();
  const collect = (name: ts.BindingName | undefined, into: Set<string>[]): void => {
    if (!name) return;
    if (ts.isIdentifier(name)) for (const set of into) set.add(name.text);
    else for (const element of name.elements) if (!ts.isOmittedExpression(element)) collect(element.name, into);
  };
  walk(sf, (node) => {
    const topLevel = ts.isVariableDeclaration(node) && ts.isVariableDeclarationList(node.parent) && ts.isVariableStatement(node.parent.parent) && node.parent.parent.parent === sf;
    if (ts.isVariableDeclaration(node) && !topLevel) collect(node.name, [nested, unsafe]);
    else if (ts.isParameter(node)) collect(node.name, [nested]);
    else if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.parent !== sf) collect(node.name, [nested, unsafe]);
    else if ((ts.isFunctionExpression(node) || ts.isClassExpression(node)) && node.name) collect(node.name, [nested, unsafe]);
    else if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const target = unwrapExpression(node.left);
      if (ts.isIdentifier(target)) unsafe.add(target.text);
    } else if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && ts.isIdentifier(unwrapExpression(node.operand))) {
      unsafe.add((unwrapExpression(node.operand) as ts.Identifier).text);
    } else if ((ts.isForInStatement(node) || ts.isForOfStatement(node)) && ts.isIdentifier(node.initializer)) {
      unsafe.add(node.initializer.text);
    }
  });
  return { nested, unsafe };
}

/** Top-level `const` declarations by name (let/var are not resolvable: they can be reassigned). */
function topLevelConsts(sf: ts.SourceFile): Map<string, ts.VariableDeclaration> {
  const consts = new Map<string, ts.VariableDeclaration>();
  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    for (const decl of statement.declarationList.declarations) if (ts.isIdentifier(decl.name)) consts.set(decl.name.text, decl);
  }
  return consts;
}

/** Value exports of a module: `default`, declared names, and `export { a as b }` names. */
function exportedValueNames(sf: ts.SourceFile): Array<{ name: string; node: ts.Node }> {
  const out: Array<{ name: string; node: ts.Node }> = [];
  for (const statement of sf.statements) {
    if (ts.isExportAssignment(statement)) out.push({ name: "default", node: statement });
    else if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) continue;
      if (!statement.exportClause) out.push({ name: "*", node: statement });
      else if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) if (!element.isTypeOnly) out.push({ name: element.name.text, node: element });
      } else out.push({ name: statement.exportClause.name.text, node: statement });
    } else if (hasExportModifier(statement)) {
      if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) continue;
      const isDefault = (ts.canHaveModifiers(statement) ? (ts.getModifiers(statement) ?? []) : []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
      if (isDefault) out.push({ name: "default", node: statement });
      else if (ts.isVariableStatement(statement)) for (const decl of statement.declarationList.declarations) out.push({ name: decl.name.getText(sf), node: decl });
      else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) && statement.name) out.push({ name: statement.name.text, node: statement });
      else out.push({ name: ts.SyntaxKind[statement.kind], node: statement });
    }
  }
  return out;
}

/**
 * Whole-module code rules: directives, denied identifiers, computed access,
 * shadowed globals, route exports, raw-HTML sinks, and the JSX surface
 * (elements, spreads, handlers).
 */
export function checkAst(file: string, source: string): Violation[] {
  return astViolations(parseTs(file, source), file);
}

function astViolations(sf: ts.SourceFile, file: string): Violation[] {
  const out: Violation[] = [];
  const add = (rule: string, node: ts.Node, detail: string): void => {
    out.push({ rule, path: file, detail: `line ${lineOf(sf, node.getStart(sf))}: ${detail}` });
  };
  const diagnostics = (sf as unknown as { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
  if (diagnostics.length) {
    const first = diagnostics[0];
    const line = first.start === undefined ? "?" : String(lineOf(sf, first.start));
    out.push({ rule: "ts-parse", path: file, detail: `line ${line}: ${ts.flattenDiagnosticMessageText(first.messageText, " ").slice(0, 160)}` });
  }
  const isOgImage = file.endsWith("/opengraph-image.tsx");

  // Route modules may export only what the corpus's pages and OG images export:
  // `dynamic`, `revalidate`, `runtime`, `generateMetadata` & co. change how and
  // when the module runs.
  const allowedExports = /^app\//.test(file) ? ARTICLE_EXPORTS[file.split("/").pop() ?? ""] : undefined;
  if (allowedExports) {
    for (const { name, node } of exportedValueNames(sf)) {
      if (!allowedExports.has(name)) add("route-export", node, `export \`${name}\` is not allowed in ${file.split("/").pop()} (allowed: ${[...allowedExports].join(", ")})`);
    }
  }

  walk(sf, (node) => {
    if (ts.isExpressionStatement(node) && ts.isStringLiteralLike(node.expression)) {
      add("directive", node, `directive/expression string ${preview(node.expression.text)} is not allowed ("use client"/"use server" change where code runs)`);
    } else if (ts.isIdentifier(node)) {
      if (DENIED_IDENTIFIERS.has(node.text)) add("identifier", node, `identifier \`${node.text}\` is not allowed in a content module`);
      else if (DENIED_FREE_IDENTIFIERS.has(node.text) && !isNamePosition(node)) add("identifier", node, `browser global \`${node.text}\` is not allowed in a content module`);
      const declares =
        (ts.isVariableDeclaration(node.parent) || ts.isFunctionDeclaration(node.parent) || ts.isClassDeclaration(node.parent) || ts.isParameter(node.parent) || ts.isBindingElement(node.parent)) &&
        node.parent.name === node;
      if (declares && SHADOW_PROTECTED.has(node.text)) add("shadowing", node, `declaring \`${node.text}\` shadows a global the fence relies on`);
      if ((ts.isImportSpecifier(node.parent) || ts.isImportClause(node.parent) || ts.isNamespaceImport(node.parent)) && node.parent.name === node && SHADOW_PROTECTED.has(node.text)) {
        add("shadowing", node, `importing \`${node.text}\` shadows a global the fence relies on`);
      }
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // A key written as a string is the same key: `const { "constructor": F } = f`
      // and `{ "__proto__": x }` never produce an Identifier node. Whole-string
      // match on the cooked text, so a unicode-escaped spelling is caught and prose is not.
      if (DENIED_IDENTIFIERS.has(node.text)) add("identifier", node, `the string ${preview(node.text)} names a denied member (as a key it reaches the same thing)`);
      else if ((node.text === "dangerouslySetInnerHTML" || node.text === "__html") && !(ts.isPropertyAssignment(node.parent) && node.parent.name === node)) {
        add("dangerous-html", node, `the string ${preview(node.text)} is only allowed as the JSON-LD <script> form's own key`);
      }
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      // `JSON.stringify = …` or `({ a: JSON.stringify } = o)` rewrites what the fence checks, for every page in the build.
      if (!ts.isIdentifier(unwrapExpression(node.left))) add("mutation", node, "only a local variable may be assigned (a member or destructuring target can rewrite a global)");
    } else if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)) {
      if (!ts.isIdentifier(unwrapExpression(node.operand))) add("mutation", node, "only a local variable may be incremented or decremented");
    } else if (ts.isDeleteExpression(node)) {
      add("mutation", node, "`delete` is not allowed");
    } else if ((ts.isForInStatement(node) || ts.isForOfStatement(node)) && !ts.isVariableDeclarationList(node.initializer) && !ts.isIdentifier(node.initializer)) {
      add("mutation", node, "a for-in/for-of loop may only assign a declared variable");
    } else if (ts.isMetaProperty(node)) {
      add("identifier", node, "import.meta / new.target are not allowed");
    } else if (ts.isElementAccessExpression(node) || ts.isComputedPropertyName(node)) {
      const arg = ts.isElementAccessExpression(node) ? node.argumentExpression : node.expression;
      if (ts.isNumericLiteral(arg)) return;
      if (ts.isStringLiteralLike(arg)) {
        if (DENIED_IDENTIFIERS.has(arg.text) || arg.text === "dangerouslySetInnerHTML" || arg.text === "__html") add("computed-access", node, `["${arg.text}"] is not allowed`);
        return;
      }
      add("computed-access", node, "a computed property with a non-literal key is not allowed (it can reach any global)");
    } else if (ts.isJsxSpreadAttribute(node)) {
      add("jsx-spread", node, "JSX spread attributes are not allowed (they can smuggle href or dangerouslySetInnerHTML)");
    } else if (ts.isJsxAttribute(node)) {
      const name = jsxAttributeName(node);
      if (/^on[A-Z]/.test(name) || DENIED_JSX_ATTRIBUTES.has(name)) add("jsx-attribute", node, `${name}= is not allowed`);
      // OG images are styled inline by design; a page has no style= in the corpus, and a CSS url() there loads a third-party resource.
      if (name === "style" && !isOgImage) add("jsx-attribute", node, "style= is allowed only in opengraph-image.tsx (use className)");
      if (name === "dangerouslySetInnerHTML") {
        const element = node.parent.parent;
        const tag = element.tagName.getText(sf);
        if (tag !== "script") add("dangerous-html", node, `dangerouslySetInnerHTML on <${tag}> (only JSON-LD <script> may use it)`);
      }
    } else if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName;
      const isIntrinsic = (ts.isIdentifier(tag) && /^[a-z]/.test(tag.text)) || ts.isJsxNamespacedName(tag);
      if (isIntrinsic) {
        const name = tag.getText(sf);
        if (!ALLOWED_INTRINSIC.has(name)) add("jsx-element", node, `<${name}> is not an allowed article element`);
        if (name === "script") checkScriptElement(node, (detail) => add("jsx-script", node, detail));
      }
    }
    if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && ["dangerouslySetInnerHTML", "__html"].includes(propertyNameText(node.name) ?? "")) {
      // `__html` is fine inside the one allowed JSX form; anywhere else it is a spread-in sink.
      const inAllowedAttr = (() => {
        for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
          if (ts.isJsxAttribute(p)) return jsxAttributeName(p) === "dangerouslySetInnerHTML";
          if (ts.isSourceFile(p)) return false;
        }
        return false;
      })();
      if (!inAllowedAttr) add("dangerous-html", node, `a \`${propertyNameText(node.name)}\` property outside the JSON-LD <script> form`);
    }
  });
  return out;
}

/**
 * The regex of an exact JSON-LD escape (`/</g` in `JSON.stringify(x).replace(/</g, "\\u003c")`)
 * contains `<` and nothing else can use it. Only there, only with its exact
 * replacement, and only on a JSON.stringify chain: a user-defined `o.replace`
 * could hand the regex (and its `.source`) straight back.
 */
function isLdEscapePattern(node: ts.RegularExpressionLiteral): boolean {
  const call = node.parent;
  return !!call && ts.isCallExpression(call) && call.arguments[0] === node && isExactEscapeCall(call) && isEscapedJsonStringify(call);
}

/**
 * No string, template, regex or JSX text may carry `</`, `<!--` or `<script`:
 * any of them, serialized into a JSON-LD <script>, ends the script early. A
 * literal ending in `<` is refused too, since concatenation can finish the
 * tag. There is no search-pattern exemption for strings: whatever a call does
 * with its argument, a literal is refused on what it contains. CSS that
 * fetches (`url(`, `image-set(`, `@import`) is refused in any string.
 */
export function checkLiterals(file: string, source: string): Violation[] {
  return literalViolations(parseTs(file, source), file);
}

function literalViolations(sf: ts.SourceFile, file: string): Violation[] {
  const out: Violation[] = [];
  walk(sf, (node) => {
    const line = lineOf(sf, node.getStart(sf));
    if (ts.isRegularExpressionLiteral(node)) {
      // `/<!--/.source`, `String(/x</)` and `${/re/}` all put the regex text in a string.
      const pattern = node.text.slice(1, node.text.lastIndexOf("/"));
      if (!isLdEscapePattern(node) && (MARKUP_BREAKERS.test(node.text) || pattern.endsWith("<"))) {
        out.push({ rule: "literal", path: file, detail: `line ${line}: a regular expression carries markup (${preview(node.text)}); its source becomes a string` });
      }
      return;
    }
    let texts: string[];
    // JSX text and JSX attribute strings have HTML entities decoded by the JSX
    // transform, so `&lt;/script&gt;` there is `</script>` at runtime.
    const decodes = ts.isJsxText(node) || (ts.isStringLiteral(node) && ts.isJsxAttribute(node.parent));
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) texts = [node.text];
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) texts = [node.text];
    else return;
    if (decodes) texts.push(decodeEntities(node.text));
    for (const text of texts) {
      const match = MARKUP_BREAKERS.exec(text);
      if (match) {
        out.push({ rule: "literal", path: file, detail: `line ${line}: a literal contains ${preview(match[0])}, which can close a <script> or open a comment` });
        return;
      }
      // A piece that ends in "<" is half a tag; the next piece can finish it.
      if (text.endsWith("<") && !ts.isJsxText(node) && !ts.isTemplateTail(node)) {
        out.push({ rule: "literal", path: file, detail: `line ${line}: a literal ends in "<", which concatenation can turn into a tag` });
        return;
      }
      const css = ts.isJsxText(node) ? null : CSS_FETCH.exec(text);
      if (css) {
        out.push({ rule: "literal", path: file, detail: `line ${line}: a literal contains CSS ${preview(css[0])}, which fetches a resource` });
        return;
      }
    }
  });
  return out;
}

/**
 * The whole-module rules (imports, AST, literals) for one post-image: what
 * ANY edit to this file must pass, whatever it changes. Exported so score.ts
 * can skip candidates whose editable source already fails here (six /blog
 * comparison pages use dangerouslySetInnerHTML on <p>/<div> today): every run
 * that proposes an edit to one of them would be refused.
 */
export function wholeFileViolations(file: string, source: string, config: SeoConfig = loadConfig()): Violation[] {
  return wholeModuleViolations(parseTs(file, source), file, config);
}

function wholeModuleViolations(sf: ts.SourceFile, file: string, config: SeoConfig): Violation[] {
  return [...importViolations(sf, file, config), ...astViolations(sf, file), ...literalViolations(sf, file)];
}

/**
 * Everything in a module that can deindex its page through robots metadata:
 * `robots`/`googleBot` keys at any depth (`other: { robots }` too) and
 * strings naming them (`Object.fromEntries([["robots", …]])`). Must be
 * identical before and after: a noindex goes through content/seo/noindex.json,
 * its cap and its calibration tier.
 */
export function robotsSignature(sf: ts.SourceFile): string[] {
  const out: string[] = [];
  walk(sf, (node) => {
    if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node) || ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node)) && ROBOTS_NAME.test(memberNameText(node.name) ?? "")) {
      out.push(node.getText(sf));
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && ROBOTS_NAME.test(node.text)) {
      out.push(`string:${node.text}`);
    }
  });
  return out.sort();
}

/**
 * Every use of next/navigation in a module: its import/export declarations and
 * each expression that references a binding they create (aliases and
 * namespace imports included). Must be identical before and after: a
 * `permanentRedirect()` removes the page (consolidation is a tier-2 issue), a
 * computed target is an open redirect, and `notFound()` kills the page.
 */
export function navigationSignature(sf: ts.SourceFile): string[] {
  const out: string[] = [];
  const bound = new Set<string>();
  for (const [local, spec] of importBindings(sf)) if (spec === NAVIGATION_MODULE) bound.add(local);
  walk(sf, (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && literalValue(node.moduleSpecifier) === NAVIGATION_MODULE) {
      out.push(node.getText(sf));
    } else if (ts.isIdentifier(node) && bound.has(node.text) && !isNamePosition(node) && !ts.isImportSpecifier(node.parent) && !ts.isImportClause(node.parent) && !ts.isNamespaceImport(node.parent)) {
      let use: ts.Node = node;
      while (use.parent && (ts.isPropertyAccessExpression(use.parent) || ts.isElementAccessExpression(use.parent) || ts.isParenthesizedExpression(use.parent) || (ts.isCallExpression(use.parent) && use.parent.expression === use))) use = use.parent;
      out.push(use.getText(sf));
    }
  });
  return out.sort();
}

/** Name text of a member, including a computed key written as a literal (`["robots"]`). */
function memberNameText(name: ts.PropertyName): string | null {
  if (ts.isComputedPropertyName(name)) return ts.isStringLiteralLike(name.expression) ? name.expression.text : null;
  return propertyNameText(name);
}

function dateValues(sf: ts.SourceFile): string[] {
  const values: string[] = [];
  walk(sf, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && DATE_CONST_RE.test(node.name.text) && node.initializer && isStringish(node.initializer)) {
      values.push(`${node.name.text}=${node.initializer.getText(sf)}`);
    } else if (ts.isPropertyAssignment(node) && DATE_PROPS.has(propertyNameText(node.name) ?? "") && isStringish(node.initializer)) {
      values.push(`${propertyNameText(node.name)}=${node.initializer.getText(sf)}`);
    }
  });
  return values.sort();
}

// -------------------------------------------------------------------- tiers

function metadataMask(file: string, source: string): string {
  const sf = parseTs(file, source);
  const ranges: Array<[number, number]> = [];
  const collectMetadata = (obj: ts.ObjectLiteralExpression): void => {
    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const name = propertyNameText(prop.name);
      const value = unwrapExpression(prop.initializer);
      if ((name === "title" || name === "description") && isMetaValue(value)) ranges.push([prop.initializer.pos, prop.initializer.getEnd()]);
      else if (ts.isObjectLiteralExpression(value)) collectMetadata(value);
    }
  };
  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      if (META_CONSTS.has(decl.name.text) && isStringish(decl.initializer)) {
        ranges.push([decl.initializer.pos, decl.initializer.getEnd()]);
      } else if (decl.name.text === "metadata" && hasExportModifier(statement)) {
        const value = unwrapExpression(decl.initializer);
        if (ts.isObjectLiteralExpression(value)) collectMetadata(value);
      }
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let masked = "";
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start < cursor) continue;
    masked += `${source.slice(cursor, start)}\u0000`;
    cursor = end;
  }
  return masked + source.slice(cursor);
}

/** True when `post` is `pre` plus exactly one internal <Link>/<a> element and nothing else. */
function isSingleInternalLinkAddition(file: string, pre: string, post: string): boolean {
  const sf = parseTs(file, post);
  const candidates: ts.JsxElement[] = [];
  walk(sf, (node) => {
    if (!ts.isJsxElement(node)) return;
    const tag = node.openingElement.tagName;
    if (!ts.isIdentifier(tag) || (tag.text !== "Link" && tag.text !== "a")) return;
    let href: string | null = null;
    for (const attr of node.openingElement.attributes.properties) {
      if (!ts.isJsxAttribute(attr)) return;
      const name = jsxAttributeName(attr);
      const value = literalValue(attr.initializer);
      if (value === null) return;
      if (name === "href") href = value;
      else if (name !== "className") return;
    }
    if (href === null || !href.startsWith("/") || href.startsWith("//")) return;
    if (!node.children.length || !node.children.every((child) => ts.isJsxText(child))) return;
    candidates.push(node);
  });
  for (const element of candidates) {
    const start = element.openingElement.getStart(sf);
    const end = element.closingElement.getEnd();
    const inner = post.slice(element.openingElement.getEnd(), element.closingElement.getStart(sf));
    if (post.slice(0, start) + inner + post.slice(end) === pre) return true;
    if (post.slice(0, start) + post.slice(end) === pre) return true;
  }
  return false;
}

/**
 * config.gates.pruneTierDuringCalibration as a tier. Never below 1 (a noindex
 * is tier 1 outside calibration, so calibrating cannot make it looser), and a
 * missing or non-numeric value fails closed to 2.
 */
export function pruneTierDuringCalibration(config: SeoConfig): 1 | 2 {
  const value = Number(config.gates?.pruneTierDuringCalibration);
  if (!Number.isFinite(value)) return 2;
  return value >= 2 ? 2 : 1;
}

/**
 * Tier from the diff alone. T2: research pages. noindex.json while
 * calibrating: config.gates.pruneTierDuringCalibration (2 today). T0: only
 * metadata strings changed (the brief's consts and the title/description
 * properties of `export const metadata`), or exactly one internal link element
 * was added and nothing else. T1 otherwise.
 */
export function deriveTier(
  file: string,
  pre: string | null,
  post: string | null,
  opts: { calibrating: boolean; config?: SeoConfig },
): { tier: 0 | 1 | 2; reason: string } {
  if (file.startsWith("app/research/")) return { tier: 2, reason: "research page" };
  if (file === "content/seo/noindex.json" && opts.calibrating) return { tier: pruneTierDuringCalibration(opts.config ?? loadConfig()), reason: "noindex while calibrating" };
  if (!isTsFile(file) || pre === null || post === null) return { tier: 1, reason: pre === null ? "new file" : "dataset or non-module file" };
  if (pre === post) return { tier: 1, reason: "no textual change" };
  try {
    if (metadataMask(file, pre) === metadataMask(file, post)) return { tier: 0, reason: "metadata strings only" };
    if (isSingleInternalLinkAddition(file, pre, post)) return { tier: 0, reason: "one internal link added" };
  } catch {
    return { tier: 1, reason: "could not compare" };
  }
  return { tier: 1, reason: "body change" };
}

// -------------------------------------------------------------------- links

export type LinkContext = {
  tier: 0 | 1 | 2;
  sitemap: ReadonlySet<string>;
  /** Paths of new articles created by the same patch (not in the sitemap yet). */
  newPaths?: ReadonlySet<string>;
  /** 1-based post-image lines the patch added; null = the whole file is new. */
  addedLines?: ReadonlySet<number> | null;
  /**
   * Whether a site path such as /home.jpg is a real file under public/ (on
   * the base, or added by this patch). Absent = none is: only real static
   * files skip the sitemap check, never /api/x.csv or /admin/x.json.
   */
  publicFile?: (sitePath: string) => boolean;
};

/** Stands in for the part of a link only known at runtime. */
const RUNTIME_MARK = "${…}";
const MAX_RESOLVE_DEPTH = 4;

/**
 * Every URL-shaped run inside one string piece: full `scheme://host…` URLs
 * anywhere in the text (browsers read `\` as `/` there), protocol-relative
 * `//host` anywhere it is not part of a path (`url(//host)`, `"//host"`,
 * `/\host`), script schemes, and a piece that is only a scheme or only
 * slashes (`"https://"` + host is a URL split so that no literal looks like one).
 */
export function embeddedUrls(text: string): string[] {
  const out: string[] = [];
  const trimmed = text.trim();
  for (const m of text.matchAll(/[a-z][a-z0-9+.-]*:[/\\]{2}[^\s"'<>`]*/gi)) out.push(/:[/\\]{2}$/.test(m[0]) ? `${m[0]}${RUNTIME_MARK}` : m[0]);
  for (const m of text.matchAll(/(?<![\w:/\\])[/\\]{2,}(?:[^/\\\s"'<>`)][^\s"'<>`)]*|$)/g)) out.push(/^[/\\]+$/.test(m[0]) ? `${m[0]}${RUNTIME_MARK}` : m[0]);
  for (const m of text.matchAll(/(?:^|[\s"'(=])((?:javascript|vbscript):\S*)/gi)) out.push(m[1]);
  if (/^(?:https?|wss?|ftp):[/\\]?$/i.test(trimmed)) out.push(`${trimmed}${RUNTIME_MARK}`);
  return out;
}

/**
 * One value an href/src can take. A literal counts as added when its own
 * lines, the lines that route it to the attribute, or the attribute changed;
 * a runtime value (literal === null) counts as added on ANY edit to the file,
 * because what it is built from can change without any of its lines.
 */
type LinkSource = { value: string; nodes: ts.Node[]; literal: ts.Node | null };
type Resolved = LinkSource[] | "import";
type ModuleScope = {
  imports: ReadonlyMap<string, string>;
  consts: ReadonlyMap<string, ts.VariableDeclaration>;
  nested: ReadonlySet<string>;
  unsafe: ReadonlySet<string>;
  /** Import specifiers whose module the loop itself may write (lib/blog-topics.ts, …). */
  agentWritable: (spec: string) => boolean;
};

/** A module specifier that resolves to an agent-writable file is not owner code. */
function agentWritableImport(spec: string, config: SeoConfig): boolean {
  if (!spec.startsWith("@/")) return false;
  const base = spec.slice(2);
  return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].some((file) => matchesAny(config.paths.agentAllow, file));
}

function runtimeSource(value: string = RUNTIME_MARK): LinkSource[] {
  return [{ value, nodes: [], literal: null }];
}

const withoutImports = (resolved: Resolved): LinkSource[] => (resolved === "import" ? [] : resolved);

/**
 * The array elements a callback parameter ranges over: `row` in
 * `ROWS.map((row) => …)`, when ROWS is a top-level const array literal, the
 * nearest function binding `row` is that callback (as its first, plain
 * parameter), and nothing in the module redeclares or reassigns `row`.
 * null otherwise.
 */
function mapParamElements(ref: ts.Identifier, scope: ModuleScope): ts.Expression[] | null {
  if (scope.unsafe.has(ref.text)) return null;
  let fn: ts.Node | undefined = ref.parent;
  while (fn && !(ts.isFunctionLike(fn) && fn.parameters.some((param) => bindsName(param.name, ref.text)))) fn = fn.parent;
  if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) return null;
  const first = fn.parameters[0];
  if (!first || !ts.isIdentifier(first.name) || first.name.text !== ref.text) return null;
  const call = fn.parent;
  if (!ts.isCallExpression(call) || call.arguments[0] !== fn || !ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== "map") return null;
  const receiver = unwrapExpression(call.expression.expression);
  if (!ts.isIdentifier(receiver) || scope.nested.has(receiver.text)) return null;
  const init = scope.consts.get(receiver.text)?.initializer;
  const array = init ? unwrapExpression(init) : undefined;
  return array && ts.isArrayLiteralExpression(array) ? [...array.elements] : null;
}

/**
 * The values an href/src expression can take. A literal is itself; a
 * top-level const is its initializer; `L.url` is the `url` of a top-level
 * const object literal L; `row.url` inside `ROWS.map((row) => …)` is the
 * `url` of each element of a top-level const array literal ROWS. A reference
 * into an owner-written import is exempt ("import"). Everything else — a
 * computed value, a parameter, a template, an agent-writable import — is a
 * link assembled at runtime.
 */
function linkSources(expr: ts.Expression, scope: ModuleScope, depth = 0): Resolved {
  const e = unwrapExpression(expr);
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return [{ value: e.text, nodes: [e], literal: e }];
  if (ts.isTemplateExpression(e)) return runtimeSource(`${e.head.text}${RUNTIME_MARK}`);
  if (depth > MAX_RESOLVE_DEPTH) return runtimeSource();
  const via = (resolved: Resolved, node: ts.Node): Resolved => (resolved === "import" ? resolved : resolved.map((s) => ({ ...s, nodes: [...s.nodes, node] })));
  const fromObject = (object: ts.ObjectLiteralExpression, property: string, holder: ts.Node): Resolved => {
    const out: LinkSource[] = [];
    let found = false;
    for (const member of object.properties) {
      // A spread or a computed key can supply (or override) the property unseen.
      if (ts.isSpreadAssignment(member) || ts.isComputedPropertyName(member.name)) return runtimeSource();
      if (propertyNameText(member.name) !== property) continue;
      found = true;
      const value = ts.isPropertyAssignment(member) ? member.initializer : ts.isShorthandPropertyAssignment(member) ? member.name : null;
      if (value === null) return runtimeSource();
      out.push(...withoutImports(via(linkSources(value, scope, depth + 1), member)));
    }
    return found ? out.map((s) => ({ ...s, nodes: [...s.nodes, holder] })) : runtimeSource();
  };
  const fromElement = (element: ts.Expression, property: string | null): Resolved => {
    if (ts.isSpreadElement(element) || ts.isOmittedExpression(element)) return runtimeSource();
    if (property === null) return via(linkSources(element, scope, depth + 1), element);
    const object = unwrapExpression(element);
    return ts.isObjectLiteralExpression(object) ? fromObject(object, property, element) : runtimeSource();
  };
  /** Resolve `name` (and optionally `.property` on it). */
  const fromName = (id: ts.Identifier, property: string | null): Resolved => {
    if (scope.nested.has(id.text)) {
      const elements = mapParamElements(id, scope);
      return elements ? elements.flatMap((element) => withoutImports(fromElement(element, property))) : runtimeSource();
    }
    const spec = scope.imports.get(id.text);
    if (spec !== undefined) return scope.agentWritable(spec) ? runtimeSource() : "import";
    const decl = scope.consts.get(id.text);
    if (!decl?.initializer) return runtimeSource();
    if (property === null) return via(linkSources(decl.initializer, scope, depth + 1), decl);
    const object = unwrapExpression(decl.initializer);
    return ts.isObjectLiteralExpression(object) ? fromObject(object, property, decl) : runtimeSource();
  };
  if (ts.isIdentifier(e)) return fromName(e, null);
  if (ts.isPropertyAccessExpression(e)) {
    let root: ts.Expression = e;
    while (ts.isPropertyAccessExpression(root)) root = unwrapExpression(root.expression);
    if (!ts.isIdentifier(root)) return runtimeSource();
    const target = unwrapExpression(e.expression);
    // `Imported.a.b` is owner code however deep; a local chain resolves one level only.
    if (!scope.nested.has(root.text) && scope.imports.has(root.text)) return fromName(root, null) === "import" ? "import" : runtimeSource();
    return ts.isIdentifier(target) ? fromName(target, e.name.text) : runtimeSource();
  }
  return runtimeSource();
}

function collectLinks(sf: ts.SourceFile, addedLines: ReadonlySet<number> | null, config: SeoConfig): LinkRef[] {
  const out: LinkRef[] = [];
  const isAdded = (node: ts.Node): boolean => {
    if (addedLines === null) return true;
    const first = lineOf(sf, node.getStart(sf));
    const last = lineOf(sf, node.getEnd());
    for (let line = first; line <= last; line += 1) if (addedLines.has(line)) return true;
    return false;
  };
  const fileEdited = addedLines === null || addedLines.size > 0;
  const push = (node: ts.Node, href: string, kind: LinkRef["kind"]): void => {
    if (isAdded(node)) out.push({ href, line: lineOf(sf, node.getStart(sf)), kind });
  };
  const scope: ModuleScope = {
    imports: importBindings(sf),
    consts: topLevelConsts(sf),
    ...bindingInfo(sf),
    agentWritable: (spec) => agentWritableImport(spec, config),
  };
  const claimed = new Set<ts.Node>();
  walk(sf, (node) => {
    if (ts.isJsxAttribute(node) && (jsxAttributeName(node) === "href" || jsxAttributeName(node) === "src") && node.initializer) {
      const kind: LinkRef["kind"] = jsxAttributeName(node) === "src" ? "jsx-src" : "jsx-href";
      const expr = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
      if (!expr) {
        push(node, RUNTIME_MARK, kind);
        return;
      }
      const sources = linkSources(expr, scope);
      if (sources === "import") return;
      const attrAdded = isAdded(node);
      for (const source of sources) {
        if (source.literal) claimed.add(source.literal);
        const added = source.literal === null ? fileEdited : attrAdded || source.nodes.some(isAdded);
        // A resolved literal is reported where it is written; a runtime value where it is used.
        if (added) out.push({ href: source.value, line: lineOf(sf, (source.literal ?? node).getStart(sf)), kind });
      }
    } else if (ts.isPropertyAssignment(node) && LINK_PROPERTY_NAMES.has(propertyNameText(node.name) ?? "")) {
      const values = ts.isArrayLiteralExpression(node.initializer) ? [...node.initializer.elements] : [node.initializer];
      for (const value of values) {
        const text = literalValue(value);
        if (text === null) continue;
        push(value, text, "property");
        claimed.add(value);
      }
    }
  });
  walk(sf, (node) => {
    if (claimed.has(node)) return;
    const isPiece = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node);
    if (!isPiece || ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent)) return;
    for (const url of embeddedUrls(node.text)) push(node, url, "literal");
  });
  return out;
}

/** Why one link may not be added, or null when it may. */
export function hrefViolation(href: string, file: string, kind: LinkRef["kind"], ctx: LinkContext, config: SeoConfig = loadConfig()): string | null {
  const value = href.trim();
  const newPaths = ctx.newPaths ?? new Set<string>();
  const sitePath = (p: string): string => toPath(`https://internal.invalid${p.split(/[?#]/)[0]}`);
  // Same-origin static files (the OG /home.jpg every page's metadata names, research CSVs) are not pages.
  const asset = (clean: string): string | null => (ctx.publicFile?.(clean) ? null : `${clean} is not a file under public/`);
  const internal = (p: string): string | null => {
    const clean = sitePath(p);
    if (STATIC_ASSET_RE.test(clean)) return asset(clean);
    return ctx.sitemap.has(clean) || newPaths.has(clean) ? null : `internal link to ${clean} is not a sitemap URL`;
  };
  if (value === "") return "empty href";
  if (URL_HAZARD.test(value)) return `a link with a backslash or control character (${preview(value)}) is read differently by browsers (/\\host is //host)`;
  const runtime = `a link assembled at runtime (${preview(value)}) cannot be verified; write it as one literal or a top-level const`;
  if (kind === "jsx-src") {
    if (value.includes(RUNTIME_MARK)) return runtime;
    if (!value.startsWith("/") || value.startsWith("//")) return `src ${preview(value)} must be a same-origin file under public/`;
    const clean = sitePath(value);
    return STATIC_ASSET_RE.test(clean) ? asset(clean) : `src ${clean} is not a static file under public/`;
  }
  if (value.startsWith("#")) return null;
  if (value.includes(RUNTIME_MARK)) return runtime;
  if (value.startsWith("//")) return `protocol-relative link ${preview(value)}`;
  if (value.startsWith("/")) return internal(value);
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1]?.toLowerCase();
  if (!scheme) return `relative link ${preview(value)} (internal links start with "/")`;
  // schema.org URLs outside an href are vocabulary (@context, enumerations), not links.
  if (kind !== "jsx-href" && /^https?:\/\/(?:[a-z0-9-]+\.)*schema\.org(?:[/?#]|$)/i.test(value)) return null;
  if (scheme !== "https") return `${scheme}: links are not allowed (${preview(value)})`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return `unparseable URL ${preview(value)}`;
  }
  if (url.username || url.password || /^https:\/\/[^/?#]*@/i.test(value)) return "a URL with userinfo (@) is not allowed";
  const host = url.hostname.toLowerCase();
  if (/^\d+(?:\.\d+){3}$/.test(host) || host.startsWith("[")) return `IP-address host ${host}`;
  if (url.port) return `explicit port in ${preview(value)}`;
  if (host === siteHost(config)) return internal(url.pathname);
  if (LINK_SHORTENERS.has(host)) return `link shortener ${host}`;
  if (ctx.tier === 0) return `tier-0 files may add internal links only (found ${host})`;
  if (hostMatches(host, config.primarySourceDomains)) return null;
  if (globMatch("app/vs/*/page.tsx", file) && hostMatches(host, config.vendorDomains ?? [])) return null;
  return `external link to ${host} is not a primary-source domain`;
}

/** Links ADDED by the patch: internal ones must be sitemap URLs, external ones primary sources (tier ≥ 1). */
export function checkLinks(file: string, source: string, ctx: LinkContext, config: SeoConfig = loadConfig()): Violation[] {
  return linkViolations(parseTs(file, source), file, ctx, config);
}

function linkViolations(sf: ts.SourceFile, file: string, ctx: LinkContext, config: SeoConfig): Violation[] {
  const out: Violation[] = [];
  const seen = new Set<string>();
  for (const link of collectLinks(sf, ctx.addedLines ?? null, config)) {
    const problem = hrefViolation(link.href, file, link.kind, ctx, config);
    const detail = `line ${link.line}: ${problem}`;
    if (problem && !seen.has(detail)) {
      seen.add(detail);
      out.push({ rule: "link", path: file, detail });
    }
  }
  return out;
}

// ----------------------------------------------------------- content: JSON

export function checkContentJson(
  file: string,
  post: string,
  pre: string | null,
  ctx: { sitemap: ReadonlySet<string>; newPaths?: ReadonlySet<string>; publicFile?: (sitePath: string) => boolean },
  config: SeoConfig = loadConfig(),
): { violations: Violation[]; noindexAdded: string[] } {
  const violations: Violation[] = [];
  const add = (rule: string, detail: string): void => {
    violations.push({ rule, path: file, detail });
  };
  let value: unknown;
  try {
    value = JSON.parse(post);
  } catch (error) {
    add("json-parse", `does not parse: ${(error as Error).message.slice(0, 120)}`);
    return { violations, noindexAdded: [] };
  }
  const visit = (node: unknown, where: string): void => {
    if (typeof node === "string") {
      const breaker = MARKUP_BREAKERS.exec(node);
      if (breaker) add("literal", `${where}: a string contains ${preview(breaker[0])}`);
      for (const url of embeddedUrls(node)) {
        const problem = hrefViolation(url, file, "literal", { tier: 1, sitemap: ctx.sitemap, newPaths: ctx.newPaths, publicFile: ctx.publicFile }, config);
        if (problem) add("link", `${where}: ${problem}`);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${where}[${index}]`));
      return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if ("sources" in record) {
      const sources = record.sources;
      if (!Array.isArray(sources)) add("sources", `${where}.sources must be an array`);
      else sources.forEach((source, index) => checkSource(source, `${where}.sources[${index}]`));
    }
    for (const [key, child] of Object.entries(record)) if (key !== "sources") visit(child, `${where}.${key}`);
  };
  const checkSource = (source: unknown, where: string): void => {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      add("sources", `${where} must be {url, title?, retrievedAt}`);
      return;
    }
    const entry = source as Record<string, unknown>;
    const extra = Object.keys(entry).filter((key) => !["url", "title", "retrievedAt"].includes(key));
    if (extra.length) add("sources", `${where} has unexpected keys ${extra.join(", ")}`);
    if (typeof entry.url !== "string") add("sources", `${where}.url is missing`);
    else {
      let host = "";
      try {
        const url = new URL(entry.url);
        host = url.protocol === "https:" && !url.username && !url.password && !url.port ? url.hostname.toLowerCase() : "";
      } catch {
        host = "";
      }
      if (!host) add("sources", `${where}.url must be a plain https URL`);
      else if (!hostMatches(host, config.primarySourceDomains)) add("sources", `${where}.url host ${host} is not a primary-source domain`);
    }
    if (entry.title !== undefined && typeof entry.title !== "string") add("sources", `${where}.title must be a string`);
    if (entry.title !== undefined && typeof entry.title === "string" && MARKUP_BREAKERS.test(entry.title)) add("literal", `${where}.title contains markup`);
    if (typeof entry.retrievedAt !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:\d{2})?)?$/.test(entry.retrievedAt)) {
      add("sources", `${where}.retrievedAt must be a YYYY-MM-DD date`);
    }
  };
  visit(value, "$");

  let noindexAdded: string[] = [];
  if (file === "content/seo/noindex.json") {
    if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
      add("noindex", "noindex.json must be an array of site paths");
    } else {
      const list = value as string[];
      for (let i = 1; i < list.length; i += 1) {
        if (!(list[i - 1] < list[i])) {
          add("noindex", `noindex.json must be sorted and unique (${preview(list[i - 1])} then ${preview(list[i])})`);
          break;
        }
      }
      for (const entry of list) {
        if (!ctx.sitemap.has(entry)) add("noindex", `${preview(entry)} is not a sitemap path`);
        if (config.excludedFromOptimization.includes(entry)) add("noindex", `${entry} is excluded from optimization`);
      }
      let before: string[] = [];
      try {
        const parsed: unknown = pre === null ? [] : JSON.parse(pre);
        before = Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
      } catch {
        before = [];
      }
      const prior = new Set(before);
      noindexAdded = list.filter((entry) => !prior.has(entry));
    }
  }
  return { violations, noindexAdded };
}

/**
 * docs/seo/guard-baseline.json may only tighten. Section semantics come from
 * scripts/seo/guard-baseline.mjs and the tests that read the file: over-length
 * entries may shrink or go, the missing-FAQ list may only shrink, no post's
 * internal-link floor may drop (see below), limits may only get stricter, and
 * `adopted` (the escape hatch) never changes in a loop PR.
 */
export function checkGuardBaseline(pre: string | null, post: string, file = "docs/seo/guard-baseline.json"): Violation[] {
  const out: Violation[] = [];
  const add = (detail: string): void => {
    out.push({ rule: "guard-baseline", path: file, detail });
  };
  if (pre === null) return [{ rule: "guard-baseline", path: file, detail: "the baseline may not be created by the loop" }];
  let before: Record<string, unknown>;
  let after: Record<string, unknown>;
  try {
    before = JSON.parse(pre) as Record<string, unknown>;
    after = JSON.parse(post) as Record<string, unknown>;
  } catch {
    return [{ rule: "guard-baseline", path: file, detail: "does not parse" }];
  }
  if (!after || typeof after !== "object" || Array.isArray(after)) return [{ rule: "guard-baseline", path: file, detail: "must be an object" }];
  const obj = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
  const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

  for (const section of ["longTitles", "longDescriptions"]) {
    const was = obj(before[section]);
    for (const [key, value] of Object.entries(obj(after[section]))) {
      const now = num(value);
      const then = num(was[key]);
      if (now === null) add(`${section}.${key} is not a number`);
      else if (then === null) add(`${section}.${key} is new debt (${now})`);
      else if (now > then) add(`${section}.${key} loosened ${then} → ${now}`);
    }
  }

  const faqBefore = new Set(Array.isArray(before.missingFaqPage) ? before.missingFaqPage.map(String) : []);
  const faqAfter = Array.isArray(after.missingFaqPage) ? after.missingFaqPage.map(String) : null;
  if (faqAfter === null && before.missingFaqPage !== undefined) add("missingFaqPage must stay an array");
  for (const slug of faqAfter ?? []) if (!faqBefore.has(slug)) add(`missingFaqPage gained ${slug}`);

  const limitsBefore = obj(before.limits);
  const limitsAfter = obj(after.limits);
  for (const key of ["maxTitleConstChars", "maxMetaDescriptionChars"]) {
    const then = num(limitsBefore[key]);
    const now = num(limitsAfter[key]);
    if (then !== null && (now === null || now > then)) add(`limits.${key} loosened ${then} → ${String(limitsAfter[key])}`);
  }
  const targetBefore = obj(limitsBefore.internalLinkTarget);
  const targetAfter = obj(limitsAfter.internalLinkTarget);
  for (const [family, value] of Object.entries(targetBefore)) {
    const then = num(value);
    const now = num(targetAfter[family]);
    if (then !== null && (now === null || now < then)) add(`limits.internalLinkTarget.${family} loosened ${then} → ${String(targetAfter[family])}`);
  }
  for (const key of Object.keys(limitsAfter)) {
    if (!["maxTitleConstChars", "maxMetaDescriptionChars", "internalLinkTarget"].includes(key) && JSON.stringify(limitsAfter[key]) !== JSON.stringify(limitsBefore[key])) {
      add(`limits.${key} changed`);
    }
  }

  // internalLinks, read the way the real ratchet (lib/__tests__/seo-guards.test.ts)
  // reads it: a post with no entry must meet the target outright; an entry
  // below the target is a floor the post may not drop under; an entry at or
  // above the target sets NO floor at all. So "raise 1 → 3" (target 3) switches
  // the ratchet off, and "add an entry" exempts a new post from the standard.
  // Compare the floor each rule enforces, before vs after, per post and family.
  const linksBefore = obj(before.internalLinks);
  const linksAfter = obj(after.internalLinks);
  const floor = (links: Record<string, unknown>, slug: string, family: string, target: number | null): number => {
    if (target === null) return 0;
    if (!Object.prototype.hasOwnProperty.call(links, slug)) return target;
    const value = num(obj(links[slug])[family]);
    return value !== null && value < target ? value : 0;
  };
  for (const slug of new Set([...Object.keys(linksBefore), ...Object.keys(linksAfter)])) {
    if (!Object.prototype.hasOwnProperty.call(linksBefore, slug)) {
      add(`internalLinks.${slug} is a new entry (a post without one must meet the target outright)`);
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(linksAfter, slug)) {
      add(`internalLinks.${slug} was removed`);
      continue;
    }
    for (const family of new Set([...Object.keys(targetBefore), ...Object.keys(targetAfter)])) {
      const then = floor(linksBefore, slug, family, num(targetBefore[family]));
      const now = floor(linksAfter, slug, family, num(targetAfter[family]));
      if (now < then) add(`internalLinks.${slug}.${family} floor loosened ${then} → ${now} (${String(obj(linksBefore[slug])[family])} → ${String(obj(linksAfter[slug])[family])})`);
    }
  }

  if (JSON.stringify(before.adopted ?? null) !== JSON.stringify(after.adopted ?? null)) add("`adopted` may not change in a loop PR");

  const known = new Set(["$comment", "$generated", "adopted", "limits", "longTitles", "longDescriptions", "missingFaqPage", "internalLinks"]);
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (known.has(key)) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) add(`unknown section ${key} changed`);
  }
  if (JSON.stringify(before.$comment ?? null) !== JSON.stringify(after.$comment ?? null)) add("$comment changed");
  return out;
}

// ------------------------------------------------------------------ manifest

function readManifestChanges(manifest: unknown): { changes: ManifestChange[]; error: string | null } {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return { changes: [], error: "run manifest is not an object" };
  const raw = (manifest as { changes?: unknown }).changes;
  if (!Array.isArray(raw)) return { changes: [], error: "run manifest has no changes[] array" };
  const changes: ManifestChange[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return { changes, error: "a manifest change is not an object" };
    const record = entry as Record<string, unknown>;
    if (typeof record.file !== "string" || typeof record.path !== "string") return { changes, error: "a manifest change lacks string file/path" };
    changes.push({ file: record.file, path: record.path, newArticle: record.newArticle === true, changeType: record.changeType });
  }
  return { changes, error: null };
}

// ------------------------------------------------------------------- verify

function emptyVerdict(patchSha256: string): VerifyVerdict {
  return { ok: false, patchSha256, tier: 0, files: [], declaredUrls: [], violations: [], caps: { files: 0, lines: 0, pages: 0, newArticles: 0, noindex: 0 } };
}

/** The fence. Pure when `sandbox` is null; the CLI passes the git sandbox. */
export function verify(input: VerifyInput): VerifyVerdict {
  const bytes = typeof input.patch === "string" ? Buffer.from(input.patch, "utf8") : Buffer.from(input.patch);
  const verdict = emptyVerdict(sha256Hex(bytes));
  const config = input.config ?? loadConfig();
  const mode = input.mode ?? "patch";
  const sitemap = new Set(input.sitemap);
  const holdout = new Set(input.holdout ?? []);
  const violations = verdict.violations;
  const add: Reporter = (rule, file, detail) => {
    violations.push({ rule, path: file, detail });
  };

  if (bytes.length > MAX_PATCH_BYTES) {
    add("patch-size", null, `patch is ${bytes.length} bytes (limit ${MAX_PATCH_BYTES})`);
    return verdict;
  }
  if (bytes.includes(0)) {
    add("patch-nul", null, "patch contains a NUL byte");
    return verdict;
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    add("patch-encoding", null, "patch is not valid UTF-8");
    return verdict;
  }

  const parsed = parsePatch(text);
  for (const error of parsed.errors) add("patch-parse", null, error);
  if (!parsed.files.length && !parsed.errors.length) add("empty-patch", null, "the patch changes no files");
  let unsafe = parsed.errors.length > 0;

  // Structure and path fences.
  const pathClean = new Set<string>();
  for (const file of parsed.files) {
    const found = [...structureViolations(file), ...pathViolations(file.path, config)];
    if (mode === "patch" && PUBLISH_OWNED_FILES.has(file.path)) found.push({ rule: "publish-owned", path: file.path, detail: "written only by the publish job (the model never edits dates)" });
    violations.push(...found);
    if (found.length) unsafe = true;
    else pathClean.add(file.path);
  }
  for (const file of input.untracked ?? []) {
    if (matchesAny(config.paths.agentAllow, file)) add("untracked-file", file, "untracked file in an agent-writable path: `git diff` cannot see it (git add -N it)");
  }

  // Manifest (untrusted; can only reduce). A model patch always comes with one:
  // a missing or `null` manifest would otherwise switch the undeclared-file
  // cross-check off, and the model writes run-manifest.json itself.
  const manifestPresent = input.manifest !== undefined && input.manifest !== null;
  const requireManifest = mode === "patch";
  let changes: ManifestChange[] = [];
  if (mode === "patch") {
    if (input.manifestError) add("manifest", null, input.manifestError);
    else if (!manifestPresent) add("manifest", null, "run manifest missing: a model patch must come with run-manifest.json (--manifest)");
    else {
      const read = readManifestChanges(input.manifest);
      changes = read.changes;
      if (read.error) add("manifest", null, read.error);
    }
    const declaredFiles = new Set(changes.map((c) => c.file));
    for (const file of parsed.files) if (!declaredFiles.has(file.path)) add("undeclared-file", file.path, "changed but not declared in the run manifest");
  }

  // New article directories.
  const newArticleDirs = new Set<string>();
  for (const file of parsed.files) {
    const dir = articleDirOf(file.path);
    if (file.isNew && dir && !input.base.dirExists(dir)) newArticleDirs.add(dir);
  }
  const newPaths = new Set<string>();
  for (const dir of newArticleDirs) {
    const url = urlForFile(`${dir}/page.tsx`);
    if (url) newPaths.add(url);
    if (!parsed.files.some((f) => f.path === `${dir}/page.tsx`)) add("new-article", dir, "a new article directory must contain page.tsx");
    const declared = manifestPresent
      ? changes.some((c) => c.newArticle && (c.file.startsWith(`${dir}/`) || (url !== null && c.path === url)))
      : !requireManifest;
    if (!declared) add("new-article", dir, "new article directory not declared as newArticle in the run manifest");
  }
  const newArticleCap = input.crawlStalled ? config.gates.gapArticlesWhileCrawlStalled : config.caps.newArticlesPerRun;

  // Pre-images, then post-images (JS applier always; git sandbox when safe).
  const pre = new Map<string, string | null>();
  const jsPost = new Map<string, string>();
  for (const file of parsed.files) {
    if (!pathClean.has(file.path)) continue;
    const base = input.base.read(file.path);
    if (file.isNew && base !== null) {
      add("base-mismatch", file.path, "the patch creates a file that already exists on the base");
      unsafe = true;
      continue;
    }
    if (!file.isNew && base === null) {
      add("base-mismatch", file.path, "the patch modifies a file that does not exist on the base");
      unsafe = true;
      continue;
    }
    pre.set(file.path, base);
    try {
      jsPost.set(file.path, applyHunks(base, file.hunks));
    } catch (error) {
      add("apply", file.path, (error as Error).message);
      unsafe = true;
    }
  }
  let post = jsPost;
  if (input.sandbox && !unsafe) {
    const preImages = new Map<string, string>();
    for (const [file, content] of pre) if (content !== null) preImages.set(file, content);
    const scan = parsed.files.filter((f) => isTsFile(f.path)).map((f) => f.path);
    const result = input.sandbox({ patch: bytes, preImages, files: parsed.files, scan });
    violations.push(...result.violations);
    for (const [file, content] of jsPost) {
      if (result.postImages.get(file) !== content) add("apply-disagreement", file, "git apply and this parser produced different post-images");
    }
    post = result.postImages;
  }

  // Same-origin static files: on the base's public/, or written by this patch.
  const patchedPublic = new Set(parsed.files.filter((f) => !f.isDeleted && f.path.startsWith("public/")).map((f) => f.path.slice("public".length)));
  const publicFile = (sitePath: string): boolean => {
    if (patchedPublic.has(sitePath)) return true;
    const file = `public${sitePath}`;
    try {
      return input.base.exists ? input.base.exists(file) : input.base.read(file) !== null;
    } catch {
      return false;
    }
  };

  // Content rules, tiers and links.
  const tiers = new Map<string, 0 | 1 | 2>();
  const tierReasons = new Map<string, string>();
  const noindexAdded: string[] = [];
  /** Pages each file changes (VerifyFile.urls): its own page, validated manifest paths, noindex additions. */
  const fileUrls = new Map<string, Set<string>>();
  const addFileUrl = (file: string, url: string): void => {
    const set = fileUrls.get(file) ?? new Set<string>();
    set.add(url);
    fileUrls.set(file, set);
  };
  for (const file of parsed.files) {
    const after = post.get(file.path);
    const before = pre.get(file.path) ?? null;
    if (after === undefined) {
      tiers.set(file.path, 1);
      continue;
    }
    const { tier } = deriveTier(file.path, before, after, { calibrating: input.calibrating === true, config });
    tiers.set(file.path, tier);
    if (isTsFile(file.path)) {
      const sf = parseTs(file.path, after);
      const preSf = before === null ? null : parseTs(file.path, before);
      violations.push(...wholeModuleViolations(sf, file.path, config));
      if (preSf !== null && dateValues(preSf).join("\n") !== dateValues(sf).join("\n")) {
        add("date-edit", file.path, "PUBLISHED_AT/MODIFIED_AT-style dates may not change: the publish job sets them from what changed");
      }
      if ((preSf === null ? [] : robotsSignature(preSf)).join("\n") !== robotsSignature(sf).join("\n")) {
        add("robots", file.path, "robots/googleBot metadata may not be added or changed: a noindex goes through content/seo/noindex.json");
      }
      if ((preSf === null ? [] : navigationSignature(preSf)).join("\n") !== navigationSignature(sf).join("\n")) {
        add("navigation", file.path, "next/navigation (redirect, permanentRedirect, notFound, …) may not be added or changed: a redirect removes the page, and consolidation is a tier-2 issue");
      }
      const addedLines = file.isNew ? null : new Set(file.addedLineNumbers);
      violations.push(...linkViolations(sf, file.path, { tier, sitemap, newPaths, addedLines, publicFile }, config));
    } else if (/^content\/seo\/[^/]+\.json$/.test(file.path)) {
      const result = checkContentJson(file.path, after, before, { sitemap, newPaths, publicFile }, config);
      violations.push(...result.violations);
      noindexAdded.push(...result.noindexAdded);
      for (const url of result.noindexAdded) addFileUrl(file.path, url);
    } else if (file.path === "docs/seo/guard-baseline.json") {
      violations.push(...checkGuardBaseline(before, after, file.path));
    }
  }

  // Declared URLs: derived from files, the new articles, noindex additions,
  // and manifest paths — but only for manifest entries whose file changed.
  const declared = new Set<string>();
  for (const file of parsed.files) {
    const url = urlForFile(file.path);
    if (url) {
      declared.add(url);
      addFileUrl(file.path, url);
    }
  }
  for (const url of newPaths) declared.add(url);
  for (const url of noindexAdded) declared.add(url);
  const changed = new Set(parsed.files.map((f) => f.path));
  for (const change of changes) {
    if (!changed.has(change.file)) continue;
    const url = change.path.startsWith("/") && !change.path.startsWith("//") ? toPath(`https://internal.invalid${change.path}`) : null;
    if (url === null) add("manifest", change.file, `declared path ${preview(change.path)} is not a site path`);
    else if (config.excludedFromOptimization.includes(url)) add("manifest", change.file, `declared path ${url} is excluded from optimization`);
    else if (!sitemap.has(url) && !newPaths.has(url)) add("manifest", change.file, `declared path ${url} is not a sitemap URL`);
    else {
      declared.add(url);
      // A page file renders exactly its own URL; only a shared file takes its pages from the manifest.
      if (urlForFile(change.file) === null) addFileUrl(change.file, url);
    }
  }

  // Demoted change types (brakes.ts (d)): a file any of whose changes names one is tier 2.
  // The manifest can only raise a tier here, never lower one.
  const demoted = new Set([...(input.demotedChangeTypes ?? [])].map(cleanChangeType));
  if (demoted.size && mode === "patch") {
    for (const change of changes) {
      if (!changed.has(change.file)) continue;
      if (!isKnownChangeType(change.changeType)) {
        add("change-type", change.file, `changeType ${preview(String(change.changeType ?? ""))} is not one of ${CHANGE_TYPES.join(", ")}: required while a change type is demoted (${[...demoted].sort().join(", ")})`);
        continue;
      }
      const type = cleanChangeType(change.changeType);
      if (demoted.has(type) && (tiers.get(change.file) ?? 1) < 2) {
        tiers.set(change.file, 2);
        tierReasons.set(change.file, `demoted change type ${type}`);
      }
    }
  }
  for (const url of declared) if (holdout.has(url)) add("holdout", url, "this URL is in the active holdout");

  // Caps.
  const lines = parsed.files.reduce((sum, f) => sum + f.addedLines + f.removedLines, 0);
  const noindexCap = Math.floor(config.caps.noindexShareOfIndexedPerRun * Math.max(0, input.indexed ?? 0));
  verdict.caps = { files: parsed.files.length, lines, pages: declared.size, newArticles: newArticleDirs.size, noindex: noindexAdded.length };
  if (parsed.files.length > config.caps.maxChangedFilesPerRun) add("cap-files", null, `${parsed.files.length} files > ${config.caps.maxChangedFilesPerRun}`);
  if (lines > config.caps.maxChangedLinesPerRun) add("cap-lines", null, `${lines} changed lines > ${config.caps.maxChangedLinesPerRun}`);
  if (declared.size > config.caps.pagesChangedPerRun) add("cap-pages", null, `${declared.size} pages > ${config.caps.pagesChangedPerRun}`);
  if (newArticleDirs.size > newArticleCap) add("cap-new-articles", null, `${newArticleDirs.size} new articles > ${newArticleCap}${input.crawlStalled ? " (crawl stalled)" : ""}`);
  if (noindexAdded.length > noindexCap) add("cap-noindex", null, `${noindexAdded.length} noindex additions > ${noindexCap} (${config.caps.noindexShareOfIndexedPerRun} of ${input.indexed ?? 0} indexed)`);

  verdict.files = parsed.files.map((file) => {
    const reason = tierReasons.get(file.path);
    return {
      path: file.path,
      status: file.status,
      tier: tiers.get(file.path) ?? 1,
      url: urlForFile(file.path),
      addedLines: file.addedLines,
      removedLines: file.removedLines,
      urls: [...(fileUrls.get(file.path) ?? [])].sort(),
      ...(reason ? { tierReason: reason } : {}),
    };
  });
  verdict.tier = verdict.files.reduce<0 | 1 | 2>((max, f) => (f.tier > max ? f.tier : max), 0);
  verdict.declaredUrls = [...declared].sort();
  verdict.noindexAdded = [...new Set(noindexAdded)].sort();
  verdict.ok = violations.length === 0;
  return verdict;
}

// ------------------------------------------------------------ git sandbox

function gitEnv(ceiling: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: os.devNull, GIT_CEILING_DIRECTORIES: ceiling, GIT_TERMINAL_PROMPT: "0" };
  for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_COMMON_DIR"]) delete env[key];
  return env;
}

function childError(error: unknown, scrub: string[]): string {
  const e = error as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
  let text = `${e.stderr?.toString() ?? ""}${e.stdout?.toString() ?? ""}`.trim() || e.message || String(error);
  for (const secretish of scrub) text = text.split(secretish).join("<sandbox>");
  return text.split("\n").slice(0, 4).join(" | ").slice(0, 400);
}

/** git apply --numstat -z: `added\tremoved\tpath\0` per file ("-" for binary). */
export function parseNumstatZ(output: string): Array<{ path: string; added: number | null; removed: number | null }> {
  const out: Array<{ path: string; added: number | null; removed: number | null }> = [];
  const records = output.split("\0");
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    if (!record) continue;
    const m = /^(\d+|-)\t(\d+|-)\t([\s\S]*)$/.exec(record);
    if (!m) continue;
    const toNum = (value: string): number | null => (value === "-" ? null : Number(value));
    // A rename record ends with an empty path and carries old\0new next.
    const file = m[3] === "" ? (records[i + 2] ?? "") : m[3];
    if (m[3] === "") i += 2;
    out.push({ path: file, added: toNum(m[1]), removed: toNum(m[2]) });
  }
  return out;
}

function listTree(root: string): { files: string[]; odd: string[] } {
  const files: string[] = [];
  const odd: string[] = [];
  const visit = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      const abs = path.join(dir, entry.name);
      const stat = lstatSync(abs);
      if (stat.isDirectory()) visit(abs, childRel);
      else if (stat.isFile()) files.push(childRel);
      else odd.push(childRel);
    }
  };
  visit(root, "");
  return { files: files.sort(), odd };
}

/**
 * Rebuild post-images with git itself, in a temp dir outside any repository,
 * then run the gate-1b scanner (from main's checkout) over the TS modules.
 * Nothing in the temp dir is ever executed or imported.
 */
export const gitSandbox: Sandbox = ({ patch, preImages, files, scan }) => {
  const violations: Violation[] = [];
  const postImages = new Map<string, string>();
  const dir = mkdtempSync(path.join(os.tmpdir(), "seo-verify-"));
  const work = path.join(dir, "tree");
  const scrub = [dir, REPO_ROOT];
  try {
    mkdirSync(work);
    for (const [file, content] of preImages) {
      const abs = path.join(work, file);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, content);
    }
    const patchFile = path.join(dir, "patch.diff");
    writeFileSync(patchFile, patch);
    const env = gitEnv(dir);
    const run = (args: string[]): string => execFileSync("git", args, { cwd: work, env, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }).toString("utf8");

    // git's reading of the patch must match ours, file by file.
    let numstat: ReturnType<typeof parseNumstatZ>;
    try {
      numstat = parseNumstatZ(run(["apply", "--numstat", "-z", patchFile]));
    } catch (error) {
      return { postImages, violations: [{ rule: "git-apply", path: null, detail: `git apply --numstat failed: ${childError(error, scrub)}` }] };
    }
    const ours = new Map(files.map((f) => [f.path, f]));
    const theirs = new Set(numstat.map((n) => n.path));
    for (const entry of numstat) {
      const mine = ours.get(entry.path);
      if (!mine) violations.push({ rule: "parser-differential", path: null, detail: `git sees a file this parser did not: ${preview(entry.path)}` });
      else if (entry.added !== mine.addedLines || entry.removed !== mine.removedLines) {
        violations.push({ rule: "parser-differential", path: entry.path, detail: `git counts +${entry.added}/-${entry.removed}, this parser +${mine.addedLines}/-${mine.removedLines}` });
      }
    }
    for (const file of files) if (!theirs.has(file.path)) violations.push({ rule: "parser-differential", path: file.path, detail: "this parser sees a file git does not" });
    if (violations.length) return { postImages, violations };

    try {
      run(["apply", "--check", "--whitespace=nowarn", patchFile]);
      run(["apply", "--whitespace=nowarn", patchFile]);
    } catch (error) {
      return { postImages, violations: [{ rule: "git-apply", path: null, detail: `the patch does not apply to the base: ${childError(error, scrub)}` }] };
    }
    const tree = listTree(work);
    const expected = new Set(files.map((f) => f.path));
    for (const odd of tree.odd) violations.push({ rule: "sandbox", path: odd, detail: "git apply produced a non-regular file" });
    for (const file of tree.files) if (!expected.has(file) && !preImages.has(file)) violations.push({ rule: "sandbox", path: file, detail: "git apply produced a file the patch does not declare" });
    for (const file of expected) {
      const abs = path.join(work, file);
      if (existsSync(abs) && lstatSync(abs).isFile()) postImages.set(file, readFileSync(abs, "utf8"));
      else violations.push({ rule: "sandbox", path: file, detail: "post-image missing after git apply" });
    }

    if (scan.length) {
      if (!existsSync(SCANNER)) violations.push({ rule: "content-scan", path: null, detail: "scripts/check-agent-blog-content.mjs is missing; failing closed" });
      else {
        try {
          execFileSync(process.execPath, [SCANNER, ...scan], { cwd: work, env: { PATH: process.env.PATH ?? "" } as unknown as NodeJS.ProcessEnv, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024 });
        } catch (error) {
          violations.push(...scannerFindings(childErrorFull(error), scan, scrub));
        }
      }
    }
    return { postImages, violations };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

function childErrorFull(error: unknown): string {
  const e = error as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
  return `${e.stderr?.toString() ?? ""}\n${e.stdout?.toString() ?? ""}`;
}

/** Fold the gate-1b scanner's report into violations (one per finding). */
export function scannerFindings(output: string, scanned: string[], scrub: string[] = []): Violation[] {
  const out: Violation[] = [];
  const known = new Set(scanned);
  for (const line of output.split("\n")) {
    const m = /^\s{4}(\S+?)(?::(\d+))?\s{2}\[([a-z-]+)\]\s*(.*)$/.exec(line);
    if (!m || !known.has(m[1])) continue;
    out.push({ rule: "content-scan", path: m[1], detail: `${m[2] ? `line ${m[2]}: ` : ""}[${m[3]}] ${m[4].slice(0, 160)}` });
  }
  if (!out.length) {
    let text = output.trim();
    for (const s of scrub) text = text.split(s).join("<sandbox>");
    out.push({ rule: "content-scan", path: null, detail: `gate-1b scanner failed: ${text.split("\n").filter(Boolean).slice(0, 3).join(" | ").slice(0, 300)}` });
  }
  return out;
}

// --------------------------------------------------------------- base readers

export function baseFromRecord(record: Record<string, string>): BaseReader {
  const has = (file: string): boolean => Object.prototype.hasOwnProperty.call(record, file);
  return {
    read: (file) => (has(file) ? record[file] : null),
    dirExists: (dir) => Object.keys(record).some((file) => file.startsWith(`${dir}/`)),
    exists: has,
  };
}

/** Base = the checked-out tree (CI: a clean checkout of main). */
export function diskBaseReader(root: string = REPO_ROOT): BaseReader {
  return {
    read: (file) => {
      const abs = path.join(root, file);
      if (!existsSync(abs)) return null;
      const stat = lstatSync(abs);
      if (!stat.isFile()) throw new Error(`base ${file} is not a regular file`);
      return readFileSync(abs, "utf8");
    },
    dirExists: (dir) => existsSync(path.join(root, dir)),
    exists: (file) => {
      const abs = path.join(root, file);
      return existsSync(abs) && lstatSync(abs).isFile();
    },
  };
}

function gitBaseReader(ref: string, cwd: string = REPO_ROOT): BaseReader {
  const git = (args: string[]): string => execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
  return {
    read: (file) => {
      try {
        return git(["show", `${ref}:${file}`]);
      } catch {
        return null;
      }
    },
    dirExists: (dir) => {
      try {
        return git(["ls-tree", "--name-only", ref, "--", dir]).trim() !== "";
      } catch {
        return false;
      }
    },
    exists: (file) => {
      try {
        return git(["cat-file", "-t", `${ref}:${file}`]).trim() === "blob";
      } catch {
        return false;
      }
    },
  };
}

/**
 * The owner's change as a patch: the working tree against the MERGE-BASE of
 * `baseRef` and HEAD, not against `baseRef` itself. A branch that is behind
 * main would otherwise show every commit main gained since the branch point,
 * reversed (deletions, unrelated files), and fail on changes it never made.
 * The output format is pinned: a local diff.noprefix, color.ui=always or an
 * external diff driver would otherwise change what the parser reads.
 */
export function workingTreePatch(baseRef: string, cwd: string = REPO_ROOT): { patch: Buffer; baseSha: string } {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(baseRef)) throw new Error(`--base ${JSON.stringify(baseRef)} is not a plain ref`);
  const baseSha = execFileSync("git", ["merge-base", baseRef, "HEAD"], { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString("utf8").trim();
  if (!/^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(baseSha)) throw new Error(`git merge-base ${baseRef} HEAD did not return a commit`);
  const pinned = ["-c", "color.ui=never", "-c", "diff.noprefix=false", "-c", "diff.mnemonicPrefix=false", "-c", "core.quotePath=true"];
  const flags = ["diff", "--binary", "--no-color", "--no-ext-diff", "--no-textconv", "--no-relative", "--src-prefix=a/", "--dst-prefix=b/"];
  const patch = execFileSync("git", [...pinned, ...flags, baseSha], { cwd, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  return { patch, baseSha };
}

// ------------------------------------------------------------------------ CLI

type FlagsFile = {
  calibrating: boolean;
  crawlStalled: boolean;
  indexed: number;
  sitemapPaths: string[];
  holdout: string[];
  /** Cleaned demoted change types; null when the flags file predates the field (main then reads the brakes file). */
  demoted: string[] | null;
};

/** A site path as the verdict compares it (full URLs and trailing slashes normalized). */
function normalizeSitePath(value: string): string {
  return value.startsWith("/") ? toPath(`https://internal.invalid${value}`) : toPath(value);
}

/**
 * run-flags.json from the data job. Missing gates fail closed: an absent
 * calibrating/crawlStalled flag counts as true, and an absent or malformed
 * activeHoldout THROWS (the verdict becomes internal-error) rather than
 * reading as "no holdout", which would switch holdout protection off.
 */
export function readRunFlags(value: unknown): FlagsFile {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const holdout = record.activeHoldout;
  if (!Array.isArray(holdout) || !holdout.every((x) => typeof x === "string")) {
    throw new Error("run flags: activeHoldout must be an array of site paths (an empty array when no holdout is active)");
  }
  return {
    calibrating: typeof record.calibrating === "boolean" ? record.calibrating : true,
    crawlStalled: typeof record.crawlStalled === "boolean" ? record.crawlStalled : true,
    indexed: typeof record.indexed === "number" && Number.isFinite(record.indexed) && record.indexed >= 0 ? record.indexed : 0,
    sitemapPaths: Array.isArray(record.sitemapPaths) ? record.sitemapPaths.filter((x): x is string => typeof x === "string") : [],
    holdout: (holdout as string[]).map(normalizeSitePath),
    demoted: readDemoted(record.demotedChangeTypes, "run flags"),
  };
}

/** A demotedChangeTypes field: absent → null; present but not a list of strings → throws (fail closed). */
function readDemoted(value: unknown, source: string): string[] | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) throw new Error(`${source}: demotedChangeTypes must be an array`);
  return value.map((entry) => {
    const type = typeof entry === "string" ? entry : entry && typeof entry === "object" ? (entry as { changeType?: unknown }).changeType : undefined;
    if (typeof type !== "string") throw new Error(`${source}: demotedChangeTypes holds a non-string change type`);
    return cleanChangeType(type);
  });
}

/**
 * The demoted change types when run-flags.json does not carry them: the
 * newest brakes-<date>.json in the data dir. No brakes file means no brake
 * has run, so nothing is demoted; an unreadable one throws.
 */
export function demotedFromBrakesFile(file: string | null = latestDataFile("brakes")): string[] {
  if (!file) return [];
  const brakes = readJsonIfExists<Partial<Brakes>>(file);
  return readDemoted(brakes?.demotedChangeTypes ?? [], "brakes file") ?? [];
}

function readPathList(value: string): string[] {
  const text = value.trim().startsWith("[") ? value : readFileSync(value, "utf8");
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("expected a JSON array of paths");
  return parsed.filter((x): x is string => typeof x === "string").map(normalizeSitePath);
}

export async function main(args: Args): Promise<number> {
  const workingTree = hasFlag(args, "working-tree");
  const baseRef = flagString(args, "base", "origin/main");
  let patch: Buffer;
  let baseSha: string | null = null;
  if (workingTree) {
    ({ patch, baseSha } = workingTreePatch(baseRef));
  } else {
    const patchPath = flagString(args, "patch");
    if (!patchPath) throw new Error("pass --patch <file> or --working-tree");
    patch = readFileSync(patchPath);
  }
  // First, before any other work: pin the exact bytes being judged.
  const patchSha256 = sha256Hex(patch);
  const out = flagString(args, "out");

  let verdict: VerifyVerdict;
  try {
    const config = loadConfig();
    const flagsPath = flagString(args, "flags");
    const flags = flagsPath ? readRunFlags(JSON.parse(readFileSync(flagsPath, "utf8"))) : null;
    let manifest: unknown = null;
    let manifestError: string | null = null;
    const manifestPath = flagString(args, "manifest");
    if (!workingTree && manifestPath) {
      try {
        manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      } catch (error) {
        manifestError = `run manifest unreadable: ${(error as Error).message.slice(0, 120)}`;
      }
    }
    const sitemapFile = flagString(args, "sitemap-file");
    let sitemap: string[];
    if (sitemapFile) sitemap = readPathList(sitemapFile);
    else if (flags && flags.sitemapPaths.length) sitemap = flags.sitemapPaths;
    else sitemap = (await fetchSitemap(config.site.base)).map((u) => u.path);
    const holdoutFlag = flagString(args, "holdout");
    const holdout = [...(flags?.holdout ?? []), ...(holdoutFlag ? readPathList(holdoutFlag) : [])];
    const untracked = workingTree
      ? execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], { cwd: REPO_ROOT }).toString("utf8").split("\0").filter(Boolean)
      : [];
    verdict = verify({
      patch,
      base: baseSha ? gitBaseReader(baseSha) : diskBaseReader(),
      manifest: workingTree ? null : manifest,
      manifestError,
      mode: workingTree ? "working-tree" : "patch",
      sitemap,
      holdout,
      calibrating: hasFlag(args, "calibrating") || flags?.calibrating === true,
      crawlStalled: hasFlag(args, "crawl-stalled") || flags?.crawlStalled === true,
      indexed: flagNumber(args, "indexed", flags?.indexed ?? 0),
      untracked,
      demotedChangeTypes: workingTree ? [] : (flags?.demoted ?? demotedFromBrakesFile()),
      config,
      sandbox: gitSandbox,
    });
    if (verdict.patchSha256 !== patchSha256) throw new Error("patch bytes changed while being verified");
  } catch (error) {
    verdict = emptyVerdict(patchSha256);
    verdict.violations.push({ rule: "internal-error", path: null, detail: (error as Error).message.slice(0, 300) });
  }

  log(`verify-static: ${verdict.ok ? "OK" : "REJECTED"} · tier ${verdict.tier} · ${verdict.files.length} file(s) · ${verdict.violations.length} violation(s)`);
  for (const v of verdict.violations) log(`  ${v.rule}${v.path ? ` ${v.path}` : ""}: ${v.detail}`);
  if (out) {
    try {
      writeJson(out, verdict);
    } catch (error) {
      // A detail echoed something the publishability tripwire refuses; keep the verdict, drop the details.
      log(`verdict details withheld: ${(error as Error).message}`);
      writeJson(out, { ...verdict, ok: false, violations: verdict.violations.map((v) => ({ ...v, detail: "(detail withheld: failed the publishability check)" })) });
    }
  }
  console.log(JSON.stringify(verdict, null, 2));
  return verdict.ok ? 0 : 1;
}

// ------------------------------------------------------------------ self-test

function selfTest(): void {
  const config = loadConfig();
  const file = "app/blog/x/page.tsx";
  const base = [
    'import type { Metadata } from "next";',
    'import Link from "next/link";',
    "",
    'const TITLE = "Old title";',
    "",
    "export const metadata: Metadata = { title: TITLE };",
    "",
    "export default function Page() {",
    "  return <main><p>Read the guide on cap rates.</p></main>;",
    "}",
    "",
  ].join("\n");
  const diff = (hunk: string[]): string =>
    [`diff --git a/${file} b/${file}`, "index 1111111..2222222 100644", `--- a/${file}`, `+++ b/${file}`, ...hunk, ""].join("\n");
  const common = { base: baseFromRecord({ [file]: base }), sitemap: ["/", "/blog/x", "/blog/cap-rate"], manifest: { changes: [{ path: "/blog/x", file }] }, config, sandbox: null };

  const title = verify({ ...common, patch: diff(["@@ -3,3 +3,3 @@", " ", '-const TITLE = "Old title";', '+const TITLE = "New title";', " "]) });
  check(title.ok && title.tier === 0 && title.files[0].tier === 0, `title-only change is T0: ${JSON.stringify(title.violations)}`);
  check(title.patchSha256.length === 64 && title.declaredUrls.join() === "/blog/x", "hash and declared URL");

  const link = verify({
    ...common,
    patch: diff([
      "@@ -8,3 +8,3 @@",
      " export default function Page() {",
      "-  return <main><p>Read the guide on cap rates.</p></main>;",
      '+  return <main><p>Read the <Link href="/blog/cap-rate">guide on cap rates</Link>.</p></main>;',
      " }",
    ]),
  });
  check(link.ok && link.tier === 0, `one internal link is T0: ${JSON.stringify(link.violations)}`);

  const admin = verify({ ...common, patch: diff(["@@ -2,2 +2,3 @@", ' import Link from "next/link";', '+import { admin } from "@/lib/supabase/admin";', " "]) });
  check(!admin.ok && admin.violations.some((v) => v.rule === "import"), "supabase admin import is rejected");

  const leak = verify({ ...common, patch: diff(["@@ -3,3 +3,3 @@", " ", '-const TITLE = "Old title";', '+const TITLE = globalThis["pro" + "cess"].env.X;', " "]) });
  check(!leak.ok && leak.files[0].tier === 1 && leak.violations.some((v) => v.rule === "identifier"), "globalThis computed access is rejected and not T0");

  const quoted = parsePatch(['diff --git "a/app/blog/tab\\tb/page.tsx" "b/app/blog/tab\\tb/page.tsx"', "new file mode 120000", "index 0000000..1111111", "--- /dev/null", '+++ "b/app/blog/tab\\tb/page.tsx"', "@@ -0,0 +1 @@", "+x", "\\ No newline at end of file", ""].join("\n"));
  check(quoted.errors.length === 0 && quoted.files[0].path === "app/blog/tab\tb/page.tsx", "quoted path parses");
  check(structureViolations(quoted.files[0]).some((v) => v.rule === "symlink"), "symlink mode is rejected");
  check(hrefViolation("https://www.irs.gov/pub/527", file, "jsx-href", { tier: 1, sitemap: new Set() }, config) === null, "primary source allowed at tier 1");
  check(hrefViolation("https://bit.ly/x", file, "jsx-href", { tier: 1, sitemap: new Set() }, config) !== null, "shortener rejected");
  check(hrefViolation("/api/export.csv", file, "jsx-href", { tier: 1, sitemap: new Set(), publicFile: () => false }, config) !== null, "non-public asset path rejected");

  const page = (pre: string, jsx: string): string => `${pre}\nexport default function Page() { return <main>${jsx}</main>; }\n`;
  const rebuild = `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ a: "<Q/script>" }).replace(/"(<)Q/, '""}$1') }} />`;
  check(checkAst(file, page("", rebuild)).some((v) => v.rule === "jsx-script"), "a replace chain that rebuilds markup is rejected");
  const escaped = `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({}).replace(/</g, ${JSON.stringify(LD_ESCAPES.get("/</g"))}) }} />`;
  check(checkAst(file, page("", escaped)).length === 0 && checkLiterals(file, page("", escaped)).length === 0, "the exact < escape is accepted");
  check(checkAst(file, page('const { "constructor": F } = () => 0;', "<p />")).some((v) => v.rule === "identifier"), "a denied member written as a string is rejected");
  check(checkLiterals(file, "const a = { b: /<!--/.source };").length === 1, "a regex carrying markup is rejected");
  check(checkLinks(file, page('const L = "/" + "/evil.example";', "<a href={L}>x</a>"), { tier: 1, sitemap: new Set(), addedLines: null }, config).length === 1, "an href const assembled at runtime is rejected");
  check(embeddedUrls("url(//evil.example/x)").length === 1, "protocol-relative URL found mid-string");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["base", "calibrating", "crawl-stalled", "flags", "holdout", "indexed", "manifest", "out", "patch", "sitemap-file", "working-tree"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
