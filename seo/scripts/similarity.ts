/**
 * "Is this draft a near-duplicate of a page we already have?"
 *
 * TF-IDF cosine similarity between a draft (a new page, or the new text of a
 * rewritten one) and the main text of every existing page, computed locally
 * from the crawl's text files: no external API, no dependency. The gates use
 * the answer: a new or rewritten page scoring above
 * config.thresholds.similarity.mergeAbove against an existing page is merged
 * into that page instead of shipping as a second URL that competes with it.
 *
 * Load-bearing choices:
 *   - Corpus = seo/data/pages/*.txt as mapped by the latest crawl file
 *     (path → textFile). Only pages a merge could land on are scored:
 *     HTTP 200, not noindex, canonical to itself (or no canonical). A
 *     textFile that resolves outside dataDir() is skipped, never read.
 *   - Template chrome is removed BEFORE term vectors are built, with the same
 *     rule, tokenizer and population crawl.ts uses for the thin flag: in every
 *     TEMPLATE_FAMILIES family with at least 5 pages that answered 200, a
 *     5-word shingle found on more than templateCommonShare of those pages is
 *     chrome, and every word such a shingle covers is dropped. Unscored 200
 *     pages (noindex, canonicalised) still count toward the family's chrome,
 *     so the chrome here is exactly the chrome behind uniqueRatio. Without
 *     this, market pages look like duplicates of each other (shared CTA, FAQ
 *     scaffolding, disclaimers) and a blog draft scores against the blog
 *     template instead of the article.
 *     A query (a draft, or new text for a page) is stripped with the UNION of
 *     every family's chrome, whatever family it is or claims to be. Chrome
 *     terms are dropped from their family's pages before df is counted, so
 *     one left in a query has df 0: it takes the maximum IDF, matches no page
 *     and swamps the query norm. Stripping with the query's own family only
 *     let a verbatim copy of a market page through as a blog post (~0.44,
 *     under mergeAbove). Removing boilerplate cannot hide real content, so
 *     the family (--family, or the one a --draft/--path implies) is reported,
 *     never used to score. The one cost is small and bounded: a copy of a
 *     page that itself carries another family's boilerplate loses just those
 *     terms from the query, not the page.
 *   - Drafts are compared against ALL pages, across families (plan deviation
 *     10). Within-family comparison is the thin flag's job, not this one's.
 *   - Scoring is the brief's: lowercase words of 2+ chars minus a small
 *     stopword list, TF = ln(1 + count), IDF = ln(N / (1 + df)), cosine.
 *     IDF dips slightly below zero for a term on every page; each shared term
 *     contributes tf_a * tf_b * idf^2 to the dot product, so scores stay in
 *     [0, 1] and such a term just weighs almost nothing.
 *   - A .tsx draft is read as DATA by a small lexer: it is never imported,
 *     compiled or executed (the model wrote it). Visible text = JSX text nodes
 *     plus prose string literals longer than 20 chars; module specifiers and
 *     className/href/src/style/aria-* style values are dropped.
 *   - Fails closed. A crawl with no scoreable pages, or a query with no
 *     scoreable text, exits 1 instead of printing `mergeInto: null`, which a
 *     gate would read as "not a duplicate" when nothing was compared.
 *
 * CLI (stdout is JSON; progress goes to stderr):
 *   node seo/scripts/similarity.ts --draft app/blog/x/page.tsx   (.tsx .ts .md .txt .html)
 *   node seo/scripts/similarity.ts --path /blog/x [--text-file rewritten.md]
 *   node seo/scripts/similarity.ts --pairs          → seo/data/similarity-<date>.json
 *   Options: --top N (default 10), --family <family> (reported only),
 *            --crawl <crawl-file.json>
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { check, flagNumber, flagString, hasFlag, log, runMain } from "./lib/cli.ts";
import type { Args } from "./lib/cli.ts";
import { loadConfig } from "./lib/config.ts";
import type { SeoConfig } from "./lib/config.ts";
import { familyOf, TEMPLATE_FAMILIES } from "./lib/family.ts";
import type { Family } from "./lib/family.ts";
import { decodeEntities, mainTextOf } from "./lib/html.ts";
import { readJson, writeJson } from "./lib/io.ts";
import { dataDir, datedDataPath, latestDataFile } from "./lib/paths.ts";
import type { Crawl } from "./lib/types.ts";

/** Shingle width shared with crawl.ts's thin flag (the spec's 5-word shingles). */
export const SHINGLE_WORDS = 5;
/**
 * Spec values for two knobs seo/config.json does not carry yet. They are read
 * from config when present (thresholds.similarity.templateMinFamilyPages /
 * crossFamilyPairsAbove) so the owner can move them without a code change.
 */
const DEFAULT_TEMPLATE_MIN_FAMILY_PAGES = 5;
const DEFAULT_CROSS_FAMILY_PAIRS_ABOVE = 0.6;
const DEFAULT_TOP_K = 10;
/** Spec: string literals in a .tsx draft count as visible text when longer than this. */
const MIN_LITERAL_CHARS = 20;

// ------------------------------------------------------------------ types

/**
 * `chromeOnly` pages (answered 200 but noindex, canonicalised elsewhere or
 * without text) count toward their family's chrome, exactly as crawl.ts
 * counts every 200 page, but are never scored or offered as a merge target.
 */
export type CorpusDoc = { path: string; family?: Family; text: string; chromeOnly?: boolean };
export type TermVector = Map<string, number>;
export type IndexedDoc = { path: string; family: Family; vector: TermVector; norm: number };
export type IndexOptions = {
  templateCommonShare: number;
  minFamilyPages: number;
  shingleSize: number;
  templateFamilies: readonly Family[];
};
export type SimilarityIndex = {
  /** Scored pages only (chromeOnly docs excluded); `n` is their count and the IDF's N. */
  docs: IndexedDoc[];
  df: Map<string, number>;
  n: number;
  /** Chrome shingles per template family (only families with ≥ minFamilyPages pages). */
  common: Map<Family, Set<string>>;
  /** The union of every family's chrome: what every query is stripped with. */
  queryChrome: ReadonlySet<string>;
  options: IndexOptions;
};
export type Match = { path: string; score: number; family: Family };
export type MatchOptions = { excludePath?: string | null };
export type SimilarPair = { a: string; b: string; familyA: Family; familyB: Family; score: number; scope: "cross-family" | "within-family" };
export type CorpusExclusions = { non200: number; noindex: number; nonSelfCanonical: number; missingText: string[] };

/** CLI answer for --draft / --path. `top` and `mergeInto` are the contract; the rest is diagnostics. */
export type SimilarityAnswer = {
  top: Match[];
  mergeInto: string | null;
  mergeAbove: number;
  query: { path: string | null; family: Family | null; source: "draft" | "corpus"; terms: number };
  corpus: { crawlFile: string; docs: number };
};

/** seo/data/similarity-<date>.json (not in lib/types.ts yet; reported as a lib addition). */
export type SimilarityPairsReport = {
  generatedAt: string;
  crawlFile: string;
  docs: number;
  excluded: CorpusExclusions;
  thresholds: { crossFamilyAbove: number; withinFamilyAbove: number; templateCommonShare: number; templateMinFamilyPages: number };
  templateFamilies: Array<{ family: Family; pages: number; chromeShingles: number }>;
  pairs: SimilarPair[];
};

/** Config fields this script reads that seo/config.json may not declare yet. */
type SimilarityThresholds = SeoConfig["thresholds"]["similarity"] & {
  templateMinFamilyPages?: number;
  crossFamilyPairsAbove?: number;
};

function similarityThresholds(config: SeoConfig): Required<SimilarityThresholds> {
  const sim = config.thresholds.similarity as SimilarityThresholds;
  return {
    mergeAbove: sim.mergeAbove,
    templateCommonShare: sim.templateCommonShare,
    templateMinFamilyPages: sim.templateMinFamilyPages ?? DEFAULT_TEMPLATE_MIN_FAMILY_PAGES,
    crossFamilyPairsAbove: sim.crossFamilyPairsAbove ?? DEFAULT_CROSS_FAMILY_PAIRS_ABOVE,
  };
}

export function defaultIndexOptions(config: SeoConfig = loadConfig()): IndexOptions {
  const sim = similarityThresholds(config);
  return {
    templateCommonShare: sim.templateCommonShare,
    minFamilyPages: sim.templateMinFamilyPages,
    shingleSize: SHINGLE_WORDS,
    templateFamilies: TEMPLATE_FAMILIES,
  };
}

// --------------------------------------------------------------- tokens

const STOPWORDS = new Set(
  (
    "a about above after again all also am an and any are as at be because been before being below between both but by can " +
    "could did do does doing don't down during each few for from further had has have having he her here hers him his how " +
    "i if in into is isn't it it's its itself just me more most my no nor not now of off on once only or other our ours out " +
    "over own per same she should so some such than that that's the their theirs them then there these they this those " +
    "through to too under until up us very was we were what when where which while who whom why will with would you you're " +
    "your yours"
  ).split(" "),
);

const WORD_RE = /[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu;

/** Every word, lowercased, in order (crawl.ts's tokenizer, so chrome shingles agree). */
export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/’/g, "'").match(WORD_RE) ?? [];
}

/** A word counts as a term when it has 2+ chars and is not a stopword. */
export function isTerm(word: string): boolean {
  return word.length >= 2 && !STOPWORDS.has(word);
}

export function shingles(words: readonly string[], size: number = SHINGLE_WORDS): string[] {
  const out: string[] = [];
  for (let i = 0; i + size <= words.length; i += 1) out.push(words.slice(i, i + size).join(" "));
  return out;
}

/**
 * Shingles found on MORE than `share` of the family's pages. The comparison
 * is crawl.ts's `pages > share × n` verbatim: `pages / n > share` rounds
 * differently at some (share, n) pairs, e.g. 0.35 × 180.
 */
export function templateCommonShingles(familyWords: readonly string[][], share: number, size: number = SHINGLE_WORDS): Set<string> {
  const pagesWith = new Map<string, number>();
  for (const words of familyWords) {
    for (const shingle of new Set(shingles(words, size))) pagesWith.set(shingle, (pagesWith.get(shingle) ?? 0) + 1);
  }
  const commonAbove = share * familyWords.length;
  const common = new Set<string>();
  for (const [shingle, pages] of pagesWith) if (pages > commonAbove) common.add(shingle);
  return common;
}

/** Drops every word covered by at least one chrome shingle. */
export function stripTemplateChrome(words: readonly string[], common: ReadonlySet<string>, size: number = SHINGLE_WORDS): string[] {
  if (!common.size || words.length < size) return [...words];
  const chrome = new Uint8Array(words.length);
  for (let i = 0; i + size <= words.length; i += 1) {
    if (common.has(words.slice(i, i + size).join(" "))) chrome.fill(1, i, i + size);
  }
  return words.filter((_, i) => chrome[i] === 0);
}

function termCounts(words: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of words) if (isTerm(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
  return counts;
}

function weigh(counts: Map<string, number>, df: Map<string, number>, n: number): TermVector {
  const vector: TermVector = new Map();
  for (const [term, count] of counts) {
    const weight = Math.log1p(count) * Math.log(n / (1 + (df.get(term) ?? 0)));
    if (weight !== 0) vector.set(term, weight);
  }
  return vector;
}

function vectorNorm(vector: TermVector): number {
  let sum = 0;
  for (const weight of vector.values()) sum += weight * weight;
  return Math.sqrt(sum);
}

function dot(a: TermVector, b: TermVector): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let sum = 0;
  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other !== undefined) sum += weight * other;
  }
  return sum;
}

/** Cosine similarity of two sparse vectors; 0 when either is empty. */
export function cosine(a: TermVector, b: TermVector): number {
  const denominator = vectorNorm(a) * vectorNorm(b);
  if (denominator === 0) return 0;
  return Math.min(1, dot(a, b) / denominator);
}

// ---------------------------------------------------------------- index

const NO_CHROME: ReadonlySet<string> = new Set();

export function buildIndex(docs: readonly CorpusDoc[], options: IndexOptions = defaultIndexOptions()): SimilarityIndex {
  const seen = new Set<string>();
  const all: Array<{ path: string; family: Family; words: string[]; chromeOnly: boolean }> = [];
  for (const doc of docs) {
    if (seen.has(doc.path)) continue;
    seen.add(doc.path);
    all.push({ path: doc.path, family: doc.family ?? familyOf(doc.path), words: tokenize(doc.text), chromeOnly: doc.chromeOnly === true });
  }

  const byFamily = new Map<Family, string[][]>();
  for (const doc of all) {
    if (!options.templateFamilies.includes(doc.family)) continue;
    const members = byFamily.get(doc.family) ?? [];
    members.push(doc.words);
    byFamily.set(doc.family, members);
  }
  const common = new Map<Family, Set<string>>();
  const queryChrome = new Set<string>();
  for (const [family, members] of byFamily) {
    if (members.length >= options.minFamilyPages) {
      const chrome = templateCommonShingles(members, options.templateCommonShare, options.shingleSize);
      common.set(family, chrome);
      for (const shingle of chrome) queryChrome.add(shingle);
    }
  }

  const prepared = all.filter((doc) => !doc.chromeOnly);
  const counts = prepared.map((doc) => termCounts(stripTemplateChrome(doc.words, common.get(doc.family) ?? NO_CHROME, options.shingleSize)));
  const df = new Map<string, number>();
  for (const docCounts of counts) for (const term of docCounts.keys()) df.set(term, (df.get(term) ?? 0) + 1);

  const n = prepared.length;
  const indexed = prepared.map((doc, i) => {
    const vector = weigh(counts[i], df, n);
    return { path: doc.path, family: doc.family, vector, norm: vectorNorm(vector) };
  });
  return { docs: indexed, df, n, common, queryChrome, options };
}

/**
 * Query vector for text outside the corpus, weighted with the corpus's IDF.
 * Stripped with every family's chrome (see the header): the query's family
 * is deliberately not an input.
 */
export function vectorize(index: SimilarityIndex, text: string): TermVector {
  if (!index.n) return new Map();
  const words = stripTemplateChrome(tokenize(text), index.queryChrome, index.options.shingleSize);
  return weigh(termCounts(words), index.df, index.n);
}

const compareMatches = (x: Match, y: Match): number => y.score - x.score || x.path.localeCompare(y.path);
const comparePairs = (x: SimilarPair, y: SimilarPair): number => y.score - x.score || x.a.localeCompare(y.a) || x.b.localeCompare(y.b);

/**
 * The k most similar corpus pages to `text` (score > 0 only), best first,
 * ties broken by path. `excludePath` drops the page being rewritten.
 */
export function topMatches(index: SimilarityIndex, text: string, k: number = DEFAULT_TOP_K, options: MatchOptions = {}): Match[] {
  if (!index.n || k <= 0) return [];
  const query = vectorize(index, text);
  const queryNorm = vectorNorm(query);
  if (queryNorm === 0) return [];
  const matches: Match[] = [];
  for (const doc of index.docs) {
    if (doc.path === options.excludePath || doc.norm === 0) continue;
    const score = Math.min(1, dot(query, doc.vector) / (queryNorm * doc.norm));
    if (score > 0) matches.push({ path: doc.path, score, family: doc.family });
  }
  return matches.sort(compareMatches).slice(0, k);
}

/** The page to merge into: the top match when its score is strictly above `mergeAbove`. */
export function mergeTarget(top: readonly Match[], mergeAbove: number): string | null {
  const best = top[0];
  return best && best.score > mergeAbove ? best.path : null;
}

/** Cross-family pairs above `crossFamilyAbove` and within-family pairs above `withinFamilyAbove`, each pair once. */
export function findPairs(index: SimilarityIndex, thresholds: { crossFamilyAbove: number; withinFamilyAbove: number }): SimilarPair[] {
  const docs = [...index.docs].filter((doc) => doc.norm > 0).sort((a, b) => a.path.localeCompare(b.path));
  const pairs: SimilarPair[] = [];
  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      const a = docs[i];
      const b = docs[j];
      const score = Math.min(1, dot(a.vector, b.vector) / (a.norm * b.norm));
      const within = a.family === b.family;
      if (score > (within ? thresholds.withinFamilyAbove : thresholds.crossFamilyAbove)) {
        pairs.push({ a: a.path, b: b.path, familyA: a.family, familyB: b.family, score, scope: within ? "within-family" : "cross-family" });
      }
    }
  }
  return pairs.sort(comparePairs);
}

// ------------------------------------------------------- draft extraction

const NON_VISIBLE_ATTRS = new Set([
  "classname", "class", "href", "src", "srcset", "id", "key", "style", "rel", "target", "type", "d", "viewbox",
  "xmlns", "htmlfor", "as", "variant", "size", "sizes", "loading", "role", "lang", "dir",
]);

function isNonVisibleAttr(name: string): boolean {
  const lower = name.toLowerCase();
  return NON_VISIBLE_ATTRS.has(lower) || lower.startsWith("data-") || lower.startsWith("aria-");
}

/** A Tailwind-style class list: most tokens carry `-`, `:` or `[` and no prose punctuation. */
function looksLikeClassList(text: string): boolean {
  const tokens = text.split(/\s+/);
  const classy = tokens.filter((token) => /^[!\w:/.[\]()%#&>~+=,-]+$/.test(token) && /[-:[\]]/.test(token)).length;
  return classy / tokens.length >= 0.6;
}

/** Prose has a space and a real word; URLs, slugs, identifiers and class lists do not qualify. */
function looksLikeProse(text: string): boolean {
  return /\s/.test(text) && /\p{L}{2,}/u.test(text) && !looksLikeClassList(text);
}

function unescapeJs(text: string): string {
  return text.replace(/\\(u\{[0-9a-fA-F]{1,6}\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, escape: string) => {
    const code =
      escape.startsWith("u{") ? parseInt(escape.slice(2, -1), 16) : escape.length > 1 ? parseInt(escape.slice(1), 16) : null;
    if (code !== null) return code <= 0x10ffff ? String.fromCodePoint(code) : " ";
    return escape === "n" || escape === "r" || escape === "t" ? " " : escape;
  });
}

const cleanText = (text: string): string => decodeEntities(text).replace(/&[a-z][a-z0-9]*;/gi, " ").replace(/\s+/g, " ").trim();

const REGEX_PREFIX_CHARS = new Set(["", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", ";", "+", "-", "*", "%", "<", ">", "~", "^"]);
const JSX_PREFIX_CHARS = new Set(["", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", ";", ">"]);
const EXPRESSION_KEYWORDS = new Set(["return", "typeof", "case", "do", "else", "in", "of", "void", "yield", "await", "delete", "throw"]);

/**
 * Visible text of a .tsx/.ts page source, read as data: JSX text nodes plus
 * prose string literals longer than 20 chars, in source order. Comments,
 * import/export/require specifiers and non-visible attribute values
 * (className, href, src, style, data-*, aria-*, …) are dropped. Unparseable
 * JSX degrades to string-literal extraction, never to an exception.
 */
export function textFromTsx(source: string): string {
  const src = source.replace(/\r\n?/g, "\n");
  const n = src.length;
  const out: string[] = [];
  let i = 0;
  let prevChar = "";
  let prevWord = "";
  let lastWord = "";
  let lastString = "";
  let pendingKey = "";

  const emitLiteral = (raw: string, context: string | null): void => {
    if (context && isNonVisibleAttr(context)) return;
    const text = cleanText(raw);
    if (text.length > MIN_LITERAL_CHARS && looksLikeProse(text)) out.push(text);
  };
  const emitText = (raw: string): void => {
    const text = cleanText(raw);
    if (/[\p{L}\p{N}]/u.test(text)) out.push(text);
  };

  const skipLineComment = (): void => {
    const end = src.indexOf("\n", i);
    i = end === -1 ? n : end;
  };
  const skipBlockComment = (): void => {
    const end = src.indexOf("*/", i + 2);
    i = end === -1 ? n : end + 2;
  };
  const skipTrivia = (): void => {
    for (;;) {
      while (i < n && /\s/.test(src[i])) i += 1;
      if (src.startsWith("//", i)) skipLineComment();
      else if (src.startsWith("/*", i)) skipBlockComment();
      else return;
    }
  };
  const readQuoted = (jsxAttribute: boolean): string => {
    const quote = src[i];
    let j = i + 1;
    while (j < n && src[j] !== quote && (jsxAttribute || src[j] !== "\n")) j += !jsxAttribute && src[j] === "\\" ? 2 : 1;
    const body = src.slice(i + 1, Math.min(j, n));
    i = src[j] === quote ? j + 1 : Math.min(j, n);
    return body;
  };
  const skipRegex = (): boolean => {
    let j = i + 1;
    let inClass = false;
    while (j < n) {
      const c = src[j];
      if (c === "\n") return false;
      if (c === "\\") {
        j += 2;
        continue;
      }
      if (c === "[") inClass = true;
      else if (c === "]") inClass = false;
      else if (c === "/" && !inClass) {
        j += 1;
        while (j < n && /[a-z]/i.test(src[j])) j += 1;
        i = j;
        return true;
      }
      j += 1;
    }
    return false;
  };

  const TAG_NAME = /[A-Za-z][\w.:-]*/y;
  const ATTR_NAME = /[A-Za-z_$][\w$.:-]*/y;
  const CLOSING_TAG = /<\/\s*(?:[A-Za-z][\w.:-]*)?\s*>/y;

  // The three scanners recurse into each other; each leaves `i` just past what it consumed.
  const parseChildren = (): boolean => {
    for (;;) {
      if (i >= n) return false;
      const c = src[i];
      if (c === "<") {
        if (src[i + 1] === "/") {
          CLOSING_TAG.lastIndex = i;
          const close = CLOSING_TAG.exec(src);
          if (!close) return false;
          i += close[0].length;
          return true;
        }
        if (!parseElement()) return false;
        continue;
      }
      if (c === "{") {
        i += 1;
        scanJs(true, null);
        continue;
      }
      let j = i;
      while (j < n && src[j] !== "<" && src[j] !== "{") j += 1;
      emitText(src.slice(i, j));
      i = j;
    }
  };

  const parseElement = (): boolean => {
    i += 1; // "<"
    if (src[i] === ">") {
      i += 1;
      return parseChildren();
    }
    TAG_NAME.lastIndex = i;
    const tag = TAG_NAME.exec(src);
    // A lone capital is a generic type parameter (`<T>(x: T) => …`), not an element.
    if (!tag || /^[A-Z]$/.test(tag[0])) return false;
    i += tag[0].length;
    for (;;) {
      skipTrivia();
      if (i >= n) return false;
      if (src.startsWith("/>", i)) {
        i += 2;
        return true;
      }
      if (src[i] === ">") {
        i += 1;
        return parseChildren();
      }
      if (src[i] === "{") {
        i += 1;
        scanJs(true, null);
        continue;
      }
      ATTR_NAME.lastIndex = i;
      const attr = ATTR_NAME.exec(src);
      if (!attr) return false;
      i += attr[0].length;
      skipTrivia();
      if (src[i] !== "=") continue;
      i += 1;
      skipTrivia();
      const c = src[i];
      if (c === '"' || c === "'") {
        emitLiteral(readQuoted(true), attr[0]);
      } else if (c === "{") {
        i += 1;
        scanJs(true, attr[0]);
      } else if (c === "<") {
        if (!parseElement()) return false;
      } else {
        return false;
      }
    }
  };

  const scanJs = (untilBrace: boolean, context: string | null): void => {
    let depth = 0;
    prevChar = untilBrace ? "{" : "";
    prevWord = "";
    pendingKey = "";
    while (i < n) {
      const c = src[i];
      if (c === "/" && src[i + 1] === "/") {
        skipLineComment();
        continue;
      }
      if (c === "/" && src[i + 1] === "*") {
        skipBlockComment();
        continue;
      }
      if (c === '"' || c === "'") {
        const isSpecifier =
          prevWord === "from" || prevWord === "import" || (prevChar === "(" && (lastWord === "import" || lastWord === "require"));
        const key = pendingKey;
        const body = readQuoted(false);
        if (!isSpecifier) emitLiteral(unescapeJs(body), context ?? (key || null));
        lastString = body;
        prevChar = c;
        prevWord = "";
        pendingKey = "";
        continue;
      }
      if (c === "`") {
        const key = pendingKey;
        const parts: string[] = [];
        let j = i + 1;
        let start = j;
        while (j < n && src[j] !== "`") {
          if (src[j] === "\\") {
            j += 2;
          } else if (src[j] === "$" && src[j + 1] === "{") {
            parts.push(src.slice(start, j));
            i = j + 2;
            scanJs(true, context);
            j = i;
            start = j;
          } else {
            j += 1;
          }
        }
        parts.push(src.slice(start, Math.min(j, n)));
        i = Math.min(j + 1, n);
        emitLiteral(unescapeJs(parts.join(" ")), context ?? (key || null));
        prevChar = "`";
        prevWord = "";
        pendingKey = "";
        continue;
      }
      const expressionStart = prevWord ? EXPRESSION_KEYWORDS.has(prevWord) : null;
      if (c === "/" && (expressionStart ?? REGEX_PREFIX_CHARS.has(prevChar)) && skipRegex()) {
        prevChar = "/";
        prevWord = "";
        continue;
      }
      if (c === "<" && (expressionStart ?? JSX_PREFIX_CHARS.has(prevChar)) && /[A-Za-z>]/.test(src[i + 1] ?? "")) {
        const start = i;
        const mark = out.length;
        if (parseElement()) {
          prevChar = ")"; // an element ends an expression, like a closing paren
          prevWord = "";
          continue;
        }
        i = start;
        out.length = mark;
      }
      if (/[A-Za-z_$]/.test(c)) {
        let j = i + 1;
        while (j < n && /[\w$]/.test(src[j])) j += 1;
        prevWord = src.slice(i, j);
        lastWord = prevWord;
        prevChar = src[j - 1];
        pendingKey = "";
        i = j;
        continue;
      }
      if (/\d/.test(c)) {
        let j = i + 1;
        while (j < n && /[\w.]/.test(src[j])) j += 1;
        prevChar = "0";
        prevWord = "";
        pendingKey = "";
        i = j;
        continue;
      }
      if (c === "{") {
        depth += 1;
      } else if (c === "}") {
        if (untilBrace && depth === 0) {
          i += 1;
          return;
        }
        depth -= 1;
      }
      if (c === ":") pendingKey = prevWord || (prevChar === '"' || prevChar === "'" ? lastString : "");
      else if (!/\s/.test(c)) pendingKey = "";
      if (!/\s/.test(c)) {
        prevChar = c;
        prevWord = "";
      }
      i += 1;
    }
  };

  scanJs(false, null);
  return out.join(" ");
}

/** Markdown → prose: frontmatter, HTML, link targets and fence markers go; link text stays. */
export function textFromMarkdown(markdown: string): string {
  const text = markdown
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/^---\n[\s\S]*?\n---(?:\n|$)/, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/^\s{0,3}(?:```|~~~).*$/gm, " ")
    .replace(/^\s{0,3}\[[^\]\n]+\]:\s*\S+.*$/gm, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/<https?:[^>\s]+>/g, " ")
    .replace(/<[^>]+>/g, " ");
  return cleanText(text);
}

/** Site path a page source renders at (app/blog/x/page.tsx → /blog/x), or null. */
export function pathFromSourceFile(file: string): string | null {
  const normalized = file.replace(/\\/g, "/");
  const cut = normalized.startsWith("app/") ? normalized : normalized.slice(normalized.lastIndexOf("/app/") + 1);
  const match = /^app\/(?:(.*)\/)?page\.(?:tsx|ts|jsx|js|mdx)$/.exec(cut);
  if (!match) return null;
  const segments = (match[1] ?? "").split("/").filter((segment) => segment && !/^\(.*\)$/.test(segment) && !segment.startsWith("@"));
  if (segments.some((segment) => segment.startsWith("["))) return null;
  return `/${segments.join("/")}`;
}

/** Draft file → plain text, by extension. */
export function draftText(file: string, content: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".tsx" || ext === ".ts" || ext === ".jsx") return textFromTsx(content);
  if (ext === ".md" || ext === ".mdx" || ext === ".markdown") return textFromMarkdown(content);
  if (ext === ".html" || ext === ".htm") return mainTextOf(content);
  if (ext === ".txt") return content;
  throw new Error(`unsupported draft type "${ext || file}": use .tsx, .ts, .md, .txt or .html`);
}

/** "/blog/x/", "https://usetruecap.com/blog/x" → "/blog/x". */
export function normalizeSitePath(value: string): string {
  let p = value.trim();
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
  } catch {
    /* keep as given */
  }
  if (!p.startsWith("/")) p = `/${p}`;
  return p.length > 1 ? p.replace(/\/+$/, "") || "/" : p;
}

// --------------------------------------------------------------- corpus

/**
 * Crawl → corpus docs. Every page that answered 200 is returned (crawl.ts
 * learns chrome from all of them); those a merge must not land on come back
 * `chromeOnly`, counted in `excluded`. Text is read from under `root` only.
 */
export function loadCorpus(crawl: Crawl, root: string = dataDir()): { docs: CorpusDoc[]; excluded: CorpusExclusions } {
  const base = path.resolve(root);
  const docs: CorpusDoc[] = [];
  const excluded: CorpusExclusions = { non200: 0, noindex: 0, nonSelfCanonical: 0, missingText: [] };
  for (const page of crawl.pages) {
    if (page.status !== 200) {
      excluded.non200 += 1;
      continue;
    }
    const file = page.textFile ? path.resolve(base, page.textFile) : null;
    const text = file && file.startsWith(base + path.sep) && existsSync(file) ? readFileSync(file, "utf8") : "";
    const doc: CorpusDoc = { path: page.path, family: page.family ?? familyOf(page.path), text };
    if (page.noindex) excluded.noindex += 1;
    else if (page.canonicalIsSelf === false) excluded.nonSelfCanonical += 1;
    else if (!text.trim()) excluded.missingText.push(page.path);
    else {
      docs.push(doc);
      continue;
    }
    docs.push({ ...doc, chromeOnly: true });
  }
  return { docs, excluded };
}

const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;

// ------------------------------------------------------------------ CLI

type Query = { text: string; path: string | null; family: Family | null; source: "draft" | "corpus" };

/** Every Family; a Record, so a Family added to lib/family.ts fails to compile here until it is listed. */
const FAMILY_NAMES: Record<Family, true> = {
  home: true,
  "blog-post": true,
  "blog-topic": true,
  "market-city": true,
  "market-strategy": true,
  state: true,
  vs: true,
  "glossary-term": true,
  tool: true,
  research: true,
  hub: true,
  persona: true,
  other: true,
};

/** --family is only reported, but a typo must not be echoed back as if it were a family. */
export function parseFamily(value: string): Family {
  if (!Object.hasOwn(FAMILY_NAMES, value)) {
    throw new Error(`--family must be one of ${Object.keys(FAMILY_NAMES).join(", ")}; got "${value}"`);
  }
  return value as Family;
}

function resolveQuery(args: Args, docs: readonly CorpusDoc[]): Query {
  const draft = flagString(args, "draft");
  const textFile = flagString(args, "text-file");
  if (draft && textFile) throw new Error("pass --draft or --text-file, not both");
  const file = draft ?? textFile;
  const pathFlag = flagString(args, "path");
  const pagePath = pathFlag ? normalizeSitePath(pathFlag) : file ? pathFromSourceFile(file) : null;
  const familyFlag = flagString(args, "family");
  if (hasFlag(args, "family") && familyFlag === null) throw new Error("--family needs a value");
  const family = familyFlag !== null ? parseFamily(familyFlag) : pagePath ? familyOf(pagePath) : null;
  if (file) {
    const text = draftText(file, readFileSync(path.resolve(file), "utf8"));
    return { text, path: pagePath, family, source: "draft" };
  }
  if (!pagePath) throw new Error("usage: similarity.ts --draft <file> | --path </blog/x> [--text-file <file>] | --pairs");
  const doc = docs.find((d) => d.path === pagePath && !d.chromeOnly);
  if (!doc) {
    throw new Error(`${pagePath} is not in the similarity corpus (absent from the crawl, non-200, noindex or canonicalised elsewhere); pass --text-file to compare new text`);
  }
  return { text: doc.text, path: pagePath, family, source: "corpus" };
}

export async function main(args: Args): Promise<number> {
  const config = loadConfig();
  const sim = similarityThresholds(config);
  const crawlFile = flagString(args, "crawl") ?? latestDataFile("crawl");
  if (!crawlFile || !existsSync(crawlFile)) {
    throw new Error("no crawl file: run crawl.ts first to write seo/data/crawl-<date>.json (or pass --crawl <file>)");
  }
  const crawl = readJson<Crawl>(crawlFile);
  const { docs, excluded } = loadCorpus(crawl);
  const index = buildIndex(docs, defaultIndexOptions(config));
  log(
    `similarity: ${index.n} pages from ${path.basename(crawlFile)} ` +
      `(excluded non200=${excluded.non200} noindex=${excluded.noindex} nonSelfCanonical=${excluded.nonSelfCanonical} missingText=${excluded.missingText.length})`,
  );
  // Fail closed: an empty corpus or an empty query would answer "no duplicate" without having compared anything.
  if (!index.n) throw new Error(`${path.basename(crawlFile)} has no scoreable pages, so similarity cannot be judged: re-run crawl.ts`);
  for (const [family, set] of index.common) log(`  template chrome: ${family} ${set.size} shingles`);

  if (hasFlag(args, "pairs")) {
    const pairs = findPairs(index, { crossFamilyAbove: sim.crossFamilyPairsAbove, withinFamilyAbove: sim.mergeAbove });
    const familyPages = new Map<Family, number>();
    for (const doc of docs) {
      const family = doc.family ?? familyOf(doc.path);
      familyPages.set(family, (familyPages.get(family) ?? 0) + 1);
    }
    const report: SimilarityPairsReport = {
      generatedAt: new Date().toISOString(),
      crawlFile: path.basename(crawlFile),
      docs: index.n,
      excluded,
      thresholds: {
        crossFamilyAbove: sim.crossFamilyPairsAbove,
        withinFamilyAbove: sim.mergeAbove,
        templateCommonShare: sim.templateCommonShare,
        templateMinFamilyPages: sim.templateMinFamilyPages,
      },
      templateFamilies: [...index.common].map(([family, set]) => ({ family, pages: familyPages.get(family) ?? 0, chromeShingles: set.size })),
      pairs: pairs.map((pair) => ({ ...pair, score: round4(pair.score) })),
    };
    const out = datedDataPath("similarity");
    writeJson(out, report);
    const crossFamily = pairs.filter((pair) => pair.scope === "cross-family").length;
    console.log(JSON.stringify({ file: path.basename(out), docs: index.n, pairs: pairs.length, crossFamily, withinFamily: pairs.length - crossFamily }));
    return 0;
  }

  const k = flagNumber(args, "top", DEFAULT_TOP_K);
  if (!Number.isInteger(k) || k < 1) throw new Error(`--top must be a positive integer, got ${k}`);
  const query = resolveQuery(args, docs);
  const terms = vectorize(index, query.text).size;
  if (!terms) {
    throw new Error(
      `${query.path ?? "the draft"} has no scoreable text after template-chrome removal, so similarity cannot be judged` +
        " (a page that renders through a shared component needs its rendered text via --text-file)",
    );
  }
  const top = topMatches(index, query.text, k, { excludePath: query.path });
  const answer: SimilarityAnswer = {
    top: top.map((match) => ({ ...match, score: round4(match.score) })),
    mergeInto: mergeTarget(top, sim.mergeAbove),
    mergeAbove: sim.mergeAbove,
    query: { path: query.path, family: query.family, source: query.source, terms },
    corpus: { crawlFile: path.basename(crawlFile), docs: index.n },
  };
  console.log(JSON.stringify(answer, null, 2));
  return 0;
}

// ------------------------------------------------------------ self-test

function selfTest(): void {
  check(tokenize("The Cap-Rate’s 7.5% RULE").join(" ") === "the cap rate's 7 5 rule", "tokenize lowercases and keeps apostrophes");
  check(!isTerm("the") && !isTerm("a") && !isTerm("7") && isTerm("rent") && isTerm("15"), "isTerm drops stopwords and 1-char words");
  check(shingles(["a", "b", "c", "d", "e", "f"]).length === 2, "5-word shingles");
  check(cosine(new Map([["x", 1]]), new Map([["y", 1]])) === 0 && cosine(new Map(), new Map([["y", 1]])) === 0, "cosine: disjoint and empty are 0");
  check(Math.abs(cosine(new Map([["x", 2], ["y", 1]]), new Map([["x", 4], ["y", 2]])) - 1) < 1e-12, "cosine is scale-invariant");

  const words = (prefix: string, count: number): string => Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(" ");
  const chrome = words("chrome", 300);
  const docs: CorpusDoc[] = [];
  for (let m = 0; m < 6; m += 1) docs.push({ path: `/markets/city${m}`, text: `${chrome} ${words(`city${m}x`, 10)}` });
  for (let b = 0; b < 6; b += 1) docs.push({ path: `/blog/post${b}`, text: words(`post${b}x`, 40) });
  const options: IndexOptions = { templateCommonShare: 0.3, minFamilyPages: 5, shingleSize: SHINGLE_WORDS, templateFamilies: TEMPLATE_FAMILIES };
  const index = buildIndex(docs, options);
  check((index.common.get("market-city")?.size ?? 0) === 296, "market chrome shingles detected");
  check(index.common.get("blog-post")?.size === 0, "no chrome detected where pages share nothing");
  check(![...index.docs[0].vector.keys()].some((term) => term.startsWith("chrome")), "chrome terms removed before vectors");
  const pairs = findPairs(index, { crossFamilyAbove: 0.6, withinFamilyAbove: 0.8 });
  check(pairs.length === 0, "template siblings are not duplicates once chrome is stripped");
  const unstripped = buildIndex(docs, { ...options, minFamilyPages: Number.POSITIVE_INFINITY });
  check(findPairs(unstripped, { crossFamilyAbove: 0.6, withinFamilyAbove: 0.6 }).length === 15, "without stripping the template dominates");

  const draft = `${words("post2x", 37)} novel1 novel2 novel3`;
  const top = topMatches(index, draft, 3);
  check(top[0]?.path === "/blog/post2" && top[0].score > 0.8, "near-duplicate draft finds its page");
  check(mergeTarget(top, 0.8) === "/blog/post2" && mergeTarget(top, top[0].score) === null, "mergeInto is strictly above the bar");
  const wrapped = topMatches(index, `${chrome} ${words("post2x", 40)}`, 1);
  check(wrapped[0]?.path === "/blog/post2" && wrapped[0].score > 1 - 1e-9, "a copy wrapped in another family's template still scores 1");
  let rejected = false;
  try {
    parseFamily("blog");
  } catch {
    rejected = true;
  }
  check(rejected && parseFamily("market-city") === "market-city", "parseFamily rejects unknown families");
  check(topMatches(index, draft, 3, { excludePath: "/blog/post2" }).every((m) => m.path !== "/blog/post2"), "excludePath drops self");
  check(topMatches(index, "the and of", 3).length === 0, "stopword-only drafts match nothing");

  const tsx = [
    'import { Header } from "@/components/investcalc/header-with-a-long-name";',
    'const TITLE = "The one percent rule for rental property investors";',
    "// a comment that should never be read as text by anybody",
    "export default function Page() {",
    "  const ok = count < limit && /\"quoted\"/.test(label);",
    '  return (<main className="max-w-3xl mx-auto px-4 sm:px-6 py-8"><h1>{TITLE}</h1>',
    '    <p>Rent &apos;s ratio{" "}<Link href="/tools/one-percent-rule-calculator">calculator</Link> today.</p></main>);',
    "}",
  ].join("\n");
  const text = textFromTsx(tsx);
  check(text.includes("The one percent rule for rental property investors"), "tsx: prose literal kept");
  check(text.includes("Rent 's ratio") && text.includes("calculator") && text.includes("today."), "tsx: JSX text kept, entities decoded");
  check(!/components|max-w|tools\/one|comment|quoted/.test(text), "tsx: specifiers, className, href, comments and regexes dropped");
  check(pathFromSourceFile("app/blog/x/page.tsx") === "/blog/x" && pathFromSourceFile("app/(site)/page.tsx") === "/", "pathFromSourceFile");
  check(pathFromSourceFile("app/blog/[slug]/page.tsx") === null && pathFromSourceFile("lib/blog-posts.ts") === null, "pathFromSourceFile rejects non-pages");
  check(textFromMarkdown("---\ntitle: x\n---\n# Cap [rate](https://irs.gov/p527) guide") === "# Cap rate guide", "markdown: frontmatter and link targets dropped");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["crawl", "draft", "family", "pairs", "path", "text-file", "top"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
