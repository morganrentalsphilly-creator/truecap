/**
 * jsonld-validate.ts — structured-data checks on RENDERED pages.
 *
 * verify-build renders the patched tree on loopback (seo/scripts/render-build.sh
 * --validate) and runs this over the saved HTML; it also runs by hand against
 * production URLs. It checks what Google actually reads, not the page source:
 *
 *   - every application/ld+json block parses and has a schema.org @context;
 *   - required properties per @type (Article/BlogPosting, BreadcrumbList,
 *     FAQPage, SoftwareApplication, Organization, WebSite, DefinedTerm, WebPage);
 *   - FAQ questions are VISIBLE in the page's main text. Google requires FAQ
 *     markup to mirror visible content; invisible FAQ markup is a spam-policy
 *     problem, not a style nit.
 *   - the page's F4 values, by its path (scripts/seo/structured-data-
 *     expectations.mjs, shared with the production healthcheck): hub and /vs
 *     breadcrumb trails, one application entity per tool with @id
 *     <origin>/tools/<slug>#app, /analyze -> <origin>/#software, and the
 *     glossary's one DefinedTermSet. Reported as type "page".
 *
 * Load-bearing constraints:
 *   - A raw `</script` or `<!--` inside JSON-LD text is CRITICAL. The HTML
 *     parser ends (or re-modes) the script element there, so whatever follows
 *     in the "JSON" is live markup. JSON.stringify does not escape `<`, so one
 *     string from a dataset is enough. The extractor therefore finds where the
 *     JSON really ends with a string-aware scan instead of stopping at the first
 *     `</script>` the way a browser (and lib/html.ts) would.
 *   - Only loopback and the production host are ever fetched (--urls). The
 *     saved-HTML mode (--html-dir) touches no network at all.
 *   - Pre-existing debt must not turn every run red: --baseline <findings.json>
 *     (a previous run's output, e.g. the base build's) moves findings that
 *     already existed into `known`, and only NEW errors fail the run. Matching
 *     ignores the `block N:` numbering (adding a block renumbers the rest) and
 *     counts occurrences (a duplicated broken block is still new).
 *
 *   node seo/scripts/jsonld-validate.ts --html-dir <dir> [--baseline base.json] [--out findings.json]
 *   node seo/scripts/jsonld-validate.ts --urls https://usetruecap.com/blog/x,http://127.0.0.1:3100/
 *
 * Output: {findings:[{url, type, severity, detail}]} (plus `known` with
 * --baseline). Exit 1 when any non-baselined finding is critical or an error.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Args } from "./lib/cli.ts";
import { check, flagString, log, runMain } from "./lib/cli.ts";
import { loadConfig } from "./lib/config.ts";
import { decodeEntities, mainTextOf } from "./lib/html.ts";
import { readJson, writeJson } from "./lib/io.ts";
import { toPath } from "./lib/sitemap.ts";
import { structuredDataProblems } from "../../scripts/seo/structured-data-expectations.mjs";

export type Severity = "critical" | "error" | "warning";
export type JsonLdFinding = { url: string; type: string; severity: Severity; detail: string };
export type LdBlock = { json: string; value: unknown; parsed: boolean; critical: string[]; errors: string[] };
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const LD_OPEN_RE = /<script\b[^>]*\btype\s*=\s*["']?application\/ld\+json["']?[^>]*>/gi;
const SCHEMA_CONTEXT_RE = /^https?:\/\/schema\.org\/?$/;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const FETCH_TIMEOUT_MS = 20_000;
const SEVERITY_RANK: Record<Severity, number> = { critical: 0, error: 1, warning: 2 };

type Rule = { types: string[]; check: (node: Record<string, unknown>, report: (detail: string) => void, visible: string) => void };

// ----------------------------------------------------------------- extraction

/**
 * Where the JSON value that starts at `start` really ends, honouring strings
 * and escapes. A browser would stop at the first `</script`; this does not,
 * which is what lets a breakout be reported as one.
 */
export function jsonExtent(text: string, start: number): { end: number } | { error: string } {
  let i = start;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  if (text[i] !== "{" && text[i] !== "[") return { error: "the JSON-LD block does not start with { or [" };
  let depth = 0;
  let inString = false;
  for (; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) return { end: i + 1 };
    }
  }
  return { error: "the JSON-LD block never closes" };
}

export function extractLdJsonBlocks(html: string): LdBlock[] {
  const blocks: LdBlock[] = [];
  const lower = html.toLowerCase();
  for (const m of html.matchAll(LD_OPEN_RE)) {
    const start = (m.index ?? 0) + m[0].length;
    const block: LdBlock = { json: "", value: undefined, parsed: false, critical: [], errors: [] };
    blocks.push(block);
    const extent = jsonExtent(html, start);
    const firstClose = lower.indexOf("</script", start);
    if ("error" in extent) {
      block.json = html.slice(start, firstClose === -1 ? html.length : firstClose);
      block.errors.push(extent.error);
      continue;
    }
    block.json = html.slice(start, extent.end);
    if (/<\/script/i.test(block.json)) block.critical.push("raw </script inside the JSON-LD text: the browser ends the script there and renders the rest as markup");
    if (block.json.includes("<!--")) block.critical.push("raw <!-- inside the JSON-LD text: it changes how the browser finds the end of the script");
    const after = html.slice(extent.end, extent.end + 64).replace(/^\s+/, "");
    if (!/^<\/script\s*>/i.test(after)) block.errors.push("unexpected content between the JSON and </script>");
    try {
      block.value = JSON.parse(block.json);
      block.parsed = true;
    } catch (error) {
      block.errors.push(`does not parse: ${(error as Error).message.slice(0, 120)}`);
    }
  }
  return blocks;
}

// ------------------------------------------------------------------ helpers

function present(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function typesOf(node: Record<string, unknown>): string[] {
  const t = node["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asList(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** A node that only points at another (`{"@type": "Organization", "@id": "…"}`). */
function isReference(node: Record<string, unknown>): boolean {
  return "@id" in node && Object.keys(node).every((key) => key === "@id" || key === "@type" || key === "@context");
}

function hasSchemaContext(context: unknown): boolean {
  if (typeof context === "string") return SCHEMA_CONTEXT_RE.test(context.trim());
  if (Array.isArray(context)) return context.some(hasSchemaContext);
  const record = asObject(context);
  return !!record && typeof record["@vocab"] === "string" && SCHEMA_CONTEXT_RE.test(record["@vocab"].trim());
}

/** Whitespace-insensitive, entity- and quote-normalized text for "is it on the page?". */
export function normalizeVisible(text: string): string {
  return decodeEntities(text.replace(/<[^>]+>/g, " "))
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, "");
}

function requireAll(keys: string[]): Rule["check"] {
  return (node, report) => {
    for (const key of keys) if (!present(node[key])) report(`missing ${key}`);
  };
}

// -------------------------------------------------------------------- rules

const RULES: Rule[] = [
  { types: ["Article", "BlogPosting", "NewsArticle"], check: requireAll(["headline", "author", "datePublished", "dateModified", "publisher"]) },
  {
    types: ["BreadcrumbList"],
    check: (node, report) => {
      const items = asList(node.itemListElement);
      if (!items.length) {
        report("missing itemListElement");
        return;
      }
      items.forEach((raw, index) => {
        const item = asObject(raw);
        const label = `itemListElement[${index}]`;
        if (!item) {
          report(`${label} is not an object`);
          return;
        }
        const target = item.item;
        const targetObject = asObject(target);
        if (typeof item.position !== "number" || !Number.isInteger(item.position) || item.position < 1) report(`${label} has no integer position`);
        if (!present(item.name) && !present(targetObject?.name)) report(`${label} has no name`);
        const isLast = index === items.length - 1;
        if (!isLast && !(typeof target === "string" ? target.trim() : targetObject?.["@id"])) report(`${label} has no item (only the last crumb may omit it)`);
      });
    },
  },
  {
    types: ["FAQPage"],
    check: (node, report, visible) => {
      const questions = asList(node.mainEntity);
      if (!questions.length) {
        report("missing mainEntity");
        return;
      }
      questions.forEach((raw, index) => {
        const question = asObject(raw);
        const label = `mainEntity[${index}]`;
        if (!question) {
          report(`${label} is not an object`);
          return;
        }
        if (!typesOf(question).includes("Question")) report(`${label} is not a Question`);
        const name = typeof question.name === "string" ? question.name : "";
        if (!name.trim()) report(`${label} has no name`);
        const answer = asObject(asList(question.acceptedAnswer)[0]);
        if (!answer || typeof answer.text !== "string" || !answer.text.trim()) report(`${label} has no acceptedAnswer.text`);
        if (name.trim() && !visible.includes(normalizeVisible(name))) {
          const shown = name.length > 80 ? `${name.slice(0, 79)}…` : name;
          report(`question not visible on the page: ${JSON.stringify(shown)}`);
        }
      });
    },
  },
  {
    types: ["SoftwareApplication", "WebApplication", "MobileApplication"],
    check: (node, report) => {
      requireAll(["name", "applicationCategory"])(node, report, "");
      if (!present(node.offers) && !present(node.aggregateRating)) report("missing offers or aggregateRating");
    },
  },
  { types: ["Organization"], check: requireAll(["name", "url"]) },
  { types: ["WebSite"], check: requireAll(["name", "url"]) },
  { types: ["DefinedTerm"], check: requireAll(["name", "description"]) },
  {
    types: ["WebPage", "CollectionPage", "AboutPage"],
    check: (node, report) => {
      if (!present(node.name) && !present(node.headline)) report("missing name or headline");
    },
  },
];

// ----------------------------------------------------------------- validate

/**
 * Validate parsed JSON-LD blocks against the rules. `visibleText` is the
 * page's main text (lib/html.ts mainTextOf); FAQ questions must appear in it.
 */
export function validateBlocks(blocks: unknown[], visibleText: string, url = ""): JsonLdFinding[] {
  const findings: JsonLdFinding[] = [];
  const visible = normalizeVisible(visibleText);
  const checkNode = (node: Record<string, unknown>): void => {
    const types = typesOf(node);
    if (!types.length || isReference(node)) return;
    for (const rule of RULES) {
      const type = types.find((t) => rule.types.includes(t));
      if (type) rule.check(node, (detail) => findings.push({ url, type, severity: "error", detail }), visible);
    }
  };
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const node = asObject(value);
    if (!node) return;
    checkNode(node);
    for (const [key, child] of Object.entries(node)) if (key !== "@context" && child && typeof child === "object") visit(child);
  };
  blocks.forEach((block, index) => {
    const roots = Array.isArray(block) ? block : [block];
    for (const root of roots) {
      const node = asObject(root);
      if (!node) {
        findings.push({ url, type: "jsonld", severity: "error", detail: `block ${index + 1}: a top-level entry is not an object` });
        continue;
      }
      if (!hasSchemaContext(node["@context"])) findings.push({ url, type: typesOf(node)[0] ?? "jsonld", severity: "error", detail: `block ${index + 1}: @context is not schema.org` });
      visit(node);
    }
  });
  return findings;
}

/** Every node of the parsed blocks: top level, @graph members and nested objects. */
function allNodes(blocks: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const node = asObject(value);
    if (!node) return;
    out.push(node);
    for (const child of Object.values(node)) if (child && typeof child === "object") visit(child);
  };
  blocks.forEach(visit);
  return out;
}

/**
 * The F4 values the page at `url` must carry (breadcrumb trails, tool @ids,
 * /analyze, the glossary set), by its path. `url` is a page id ("/vs/x") or a
 * full URL; anything else matches no rule.
 */
export function pageExpectationFindings(blocks: unknown[], url: string): JsonLdFinding[] {
  const pagePath = url.startsWith("/") ? url : toPath(url);
  return structuredDataProblems(pagePath, allNodes(blocks)).map((detail: string) => ({ url, type: "page", severity: "error" as const, detail }));
}

/** Everything for one rendered page: extraction problems plus the rules. */
export function validateHtml(html: string, url: string): JsonLdFinding[] {
  const findings: JsonLdFinding[] = [];
  const parsed: unknown[] = [];
  extractLdJsonBlocks(html).forEach((block, index) => {
    for (const detail of block.critical) findings.push({ url, type: "jsonld", severity: "critical", detail: `block ${index + 1}: ${detail}` });
    for (const detail of block.errors) findings.push({ url, type: "jsonld", severity: "error", detail: `block ${index + 1}: ${detail}` });
    if (block.parsed) parsed.push(block.value);
  });
  findings.push(...validateBlocks(parsed, mainTextOf(html), url));
  findings.push(...pageExpectationFindings(parsed, url));
  return findings;
}

export function sortFindings(findings: JsonLdFinding[]): JsonLdFinding[] {
  return [...findings].sort(
    (a, b) =>
      a.url.localeCompare(b.url) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.type.localeCompare(b.type) ||
      a.detail.localeCompare(b.detail),
  );
}

/**
 * What makes two findings "the same" across a base and a patched render. The
 * `block N: ` prefix is display-only: a patch that adds or reorders one
 * JSON-LD block renumbers every later block, and keying on the number would
 * report their pre-existing errors as new (red that teaches ignoring red).
 */
export function findingKey(f: JsonLdFinding): string {
  return JSON.stringify([f.url, f.type, f.severity, f.detail.replace(/^block \d+: /, "")]);
}

/**
 * Split findings into new ones and ones a baseline run already had. Matching
 * is by count, not by presence: a baseline with one "missing author" covers
 * one such finding on that page, so a patch that duplicates the broken block
 * still fails.
 */
export function applyBaseline(findings: JsonLdFinding[], baseline: JsonLdFinding[]): { fresh: JsonLdFinding[]; known: JsonLdFinding[] } {
  const budget = new Map<string, number>();
  for (const f of baseline) budget.set(findingKey(f), (budget.get(findingKey(f)) ?? 0) + 1);
  const fresh: JsonLdFinding[] = [];
  const known: JsonLdFinding[] = [];
  for (const f of findings) {
    const left = budget.get(findingKey(f)) ?? 0;
    if (left > 0) {
      budget.set(findingKey(f), left - 1);
      known.push(f);
    } else fresh.push(f);
  }
  return { fresh, known };
}

export function failing(findings: JsonLdFinding[]): boolean {
  return findings.some((f) => f.severity === "critical" || f.severity === "error");
}

// ---------------------------------------------------------------- inputs

/** The page's own canonical, as a path, so base and patched renders line up. */
export function pageIdFor(html: string, fallback: string): string {
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/\brel=["']?canonical["']?/i.test(m[0])) continue;
    const href = /\bhref=["']([^"']+)["']/i.exec(m[0])?.[1];
    if (!href) continue;
    try {
      return toPath(new URL(decodeEntities(href), "https://page.invalid").href);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  const visit = (current: string): void => {
    for (const name of readdirSync(current).sort()) {
      const abs = path.join(current, name);
      const stat = statSync(abs);
      if (stat.isDirectory()) visit(abs);
      else if (stat.isFile() && name.endsWith(".html")) out.push(abs);
    }
  };
  visit(dir);
  return out;
}

export function validateHtmlDir(dir: string): JsonLdFinding[] {
  const findings: JsonLdFinding[] = [];
  for (const file of htmlFiles(dir)) {
    const html = readFileSync(file, "utf8");
    const rel = path.relative(dir, file).split(path.sep).join("/");
    findings.push(...validateHtml(html, pageIdFor(html, rel)));
  }
  return sortFindings(findings);
}

/** Only loopback and the production host may be fetched. */
export function allowedUrl(raw: string, base: string = loadConfig().site.base): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (LOOPBACK_HOSTS.has(host)) return url;
  return url.protocol === "https:" && host === new URL(base).hostname.toLowerCase() && !url.port ? url : null;
}

export async function validateUrls(urls: string[], fetchImpl: FetchLike = fetch, userAgent: string = loadConfig().site.userAgent): Promise<JsonLdFinding[]> {
  const findings: JsonLdFinding[] = [];
  for (const raw of urls) {
    const url = allowedUrl(raw);
    if (!url) throw new Error(`refusing to fetch ${JSON.stringify(raw)}: only loopback or the production host`);
    try {
      const response = await fetchImpl(url.href, { headers: { "user-agent": userAgent }, redirect: "manual", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (response.status !== 200) {
        findings.push({ url: url.href, type: "fetch", severity: "error", detail: `HTTP ${response.status}` });
        continue;
      }
      findings.push(...validateHtml(await response.text(), url.href));
    } catch (error) {
      findings.push({ url: url.href, type: "fetch", severity: "error", detail: (error as Error).message.slice(0, 160) });
    }
  }
  return sortFindings(findings);
}

// ------------------------------------------------------------------------ CLI

export async function main(args: Args, fetchImpl: FetchLike = fetch): Promise<number> {
  const htmlDir = flagString(args, "html-dir");
  const urls = flagString(args, "urls");
  if (!htmlDir && !urls) throw new Error("pass --html-dir <dir> or --urls <a,b,c>");
  const all = htmlDir
    ? validateHtmlDir(htmlDir)
    : await validateUrls(
        (urls ?? "")
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean),
        fetchImpl,
      );
  const baselinePath = flagString(args, "baseline");
  const baseline = baselinePath ? readJson<{ findings?: JsonLdFinding[]; known?: JsonLdFinding[] }>(baselinePath) : null;
  const { fresh, known } = baseline ? applyBaseline(all, [...(baseline.findings ?? []), ...(baseline.known ?? [])]) : { fresh: all, known: [] };
  const result = baseline ? { findings: fresh, known } : { findings: fresh };

  const counts = (list: JsonLdFinding[], severity: Severity): number => list.filter((f) => f.severity === severity).length;
  log(`jsonld-validate: ${counts(fresh, "critical")} critical, ${counts(fresh, "error")} error(s), ${counts(fresh, "warning")} warning(s)${baseline ? `; ${known.length} known from the baseline` : ""}`);
  for (const f of fresh.filter((x) => x.severity !== "warning").slice(0, 50)) log(`  ${f.severity} ${f.url} ${f.type}: ${f.detail}`);
  const out = flagString(args, "out");
  if (out) writeJson(out, result);
  console.log(JSON.stringify(result, null, 2));
  return failing(fresh) ? 1 : 0;
}

// ------------------------------------------------------------------ self-test

function selfTest(): void {
  const page = (ld: string[], main: string): string =>
    `<html><head><link rel="canonical" href="https://usetruecap.com/blog/x/">${ld.map((j) => `<script type="application/ld+json">${j}</script>`).join("")}</head><body><main>${main}</main></body></html>`;
  const article = JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: "H", author: { "@type": "Organization", name: "TrueCap", url: "https://usetruecap.com" }, datePublished: "2026-01-01", dateModified: "2026-01-02", publisher: { "@id": "https://usetruecap.com/#organization" } });
  const faq = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "What is NOI?", acceptedAnswer: { "@type": "Answer", text: "Income minus expenses." } }] });

  check(validateHtml(page([article, faq], "<details><summary>What is <strong>NOI</strong>?</summary>Income.</details>"), "/blog/x").length === 0, "valid Article + visible FAQ");
  const hidden = validateHtml(page([faq], "<p>No questions here.</p>"), "/blog/x");
  check(hidden.length === 1 && hidden[0].type === "FAQPage" && hidden[0].detail.startsWith("question not visible"), "invisible FAQ is a finding");
  const breakout = validateHtml(page(['{"@context":"https://schema.org","@type":"WebPage","name":"x</script><img src=x>"}'], "<p>x</p>"), "/blog/x");
  check(breakout.some((f) => f.severity === "critical"), "raw </script inside JSON-LD is critical");
  const bad = validateBlocks([{ "@type": "Organization", name: "TrueCap" }], "", "/");
  check(bad.some((f) => f.detail.includes("@context")) && bad.some((f) => f.detail === "missing url"), "missing @context and url");
  check(pageIdFor(page([], ""), "f.html") === "/blog/x", "canonical becomes the page id");
  const noContext = (n: number): JsonLdFinding => ({ url: "/x", type: "Thing", severity: "error", detail: `block ${n}: @context is not schema.org` });
  const shifted = applyBaseline([noContext(2)], [noContext(1)]);
  check(shifted.fresh.length === 0 && shifted.known.length === 1, "a renumbered block keeps its baseline");
  check(applyBaseline([noContext(1), noContext(2)], [noContext(1)]).fresh.length === 1, "a duplicated finding is still new");
  check(allowedUrl("https://evil.example/") === null && allowedUrl("http://127.0.0.1:3100/x") !== null, "fetch fence");
  const crumbs = (...paths: string[]) => JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: paths.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: ["TrueCap", "Comparisons", "TrueCap vs X"][i], item: `https://usetruecap.com${p}` })) });
  check(validateHtml(page([crumbs("/", "/vs", "/vs/x")], "<p>x</p>"), "/vs/x").length === 0, "a three-level /vs trail passes");
  check(validateHtml(page([crumbs("/", "/vs/x")], "<p>x</p>"), "/vs/x").some((f) => f.type === "page"), "a two-level /vs trail is a page finding");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["baseline", "html-dir", "out", "urls"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
