import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildIndex,
  cosine,
  draftText,
  findPairs,
  isTerm,
  loadCorpus,
  main,
  mergeTarget,
  normalizeSitePath,
  parseFamily,
  pathFromSourceFile,
  SHINGLE_WORDS,
  shingles,
  stripTemplateChrome,
  templateCommonShingles,
  textFromMarkdown,
  textFromTsx,
  tokenize,
  topMatches,
  vectorize,
  type CorpusDoc,
  type IndexOptions,
  type SimilarityAnswer,
  type SimilarityPairsReport,
} from "../../seo/scripts/similarity.ts";
import { parseArgs } from "../../seo/scripts/lib/cli.ts";
import { familyOf, TEMPLATE_FAMILIES } from "../../seo/scripts/lib/family.ts";
import type { Crawl, CrawlPage } from "../../seo/scripts/lib/types.ts";

/**
 * similarity.ts is the gate that stops the loop shipping a second URL for a
 * topic an existing page already covers (a draft scoring above mergeAbove is
 * merged instead). These tests pin the three things that decide that verdict:
 *   1. template chrome is stripped per family BEFORE scoring, with crawl.ts's
 *      thin-flag rule (5-word shingles on MORE than templateCommonShare of a
 *      family of ≥5 pages) — otherwise every market page "duplicates" every
 *      other one — and a query is stripped with EVERY family's chrome, so the
 *      family a draft claims can never lower its score against a page it copies;
 *   2. the brief's TF-IDF + cosine math, compared across ALL families;
 *   3. a .tsx draft is read as data (JSX text + prose literals), never with
 *      class lists, hrefs, module specifiers or comments leaking in.
 * No network: the CLI tests run against a crawl fixture in a tmp dir.
 */

const OPTIONS: IndexOptions = { templateCommonShare: 0.3, minFamilyPages: 5, shingleSize: SHINGLE_WORDS, templateFamilies: TEMPLATE_FAMILIES };
const NO_STRIP: IndexOptions = { ...OPTIONS, minFamilyPages: Number.POSITIVE_INFINITY };

/** Distinct pseudo-words: words("abc", 3) → "abc0 abc1 abc2". */
const words = (prefix: string, count: number, from = 0): string =>
  Array.from({ length: count }, (_, i) => `${prefix}${i + from}`).join(" ");

const MARKET_CHROME = (city: string, rent: number, tax: string): string =>
  [
    `Is ${city} a good place to buy a rental property in 2026?`,
    `Median rent in ${city} is $${rent} per month for a two-bedroom unit, and the effective property tax rate is ${tax}%.`,
    "Run any listing through the free rental property analyzer to see cash flow, cap rate, cash-on-cash return and DSCR before you make an offer.",
    "Our numbers come from public data sources and are refreshed every month so you can compare markets on the same basis.",
    "Frequently asked questions about investing in this market are answered below, with links to the methodology behind every estimate.",
    "This page is for education only and is not financial, tax or legal advice; always verify figures with a local professional.",
  ].join(" ");

const MARKETS: Array<[string, string, number, string, string]> = [
  ["/markets/austin", "Austin", 1850, "1.8", "Tech payrolls in Travis County cooled, so new apartment deliveries along the Domain corridor pushed concessions up and suburban duplex yields toward Pflugerville and Manor."],
  ["/markets/cleveland", "Cleveland", 1150, "2.4", "Lake Erie neighborhoods like Slavic Village and Old Brooklyn still price single-family homes under list, while Cuyahoga reappraisals lifted assessed values sharply."],
  ["/markets/memphis", "Memphis", 1250, "1.6", "FedEx logistics jobs anchor Shelby County demand; Cordova and Bartlett townhomes attract institutional buyers who bid against local landlords at trustee auctions."],
  ["/markets/boise", "Boise", 1700, "0.6", "Idaho's homestead exemption does not cover landlords, and Ada County's growth toward Meridian and Kuna means builders compete directly with resale investors."],
  ["/markets/tampa", "Tampa", 2000, "1.5", "Hillsborough flood zones and Citizens windstorm premiums dominate the expense side, so Seminole Heights bungalows underwrite very differently from Brandon condos."],
  ["/markets/pittsburgh", "Pittsburgh", 1300, "2.1", "Allegheny County's reassessment appeals, UPMC hospital employment and steep Mount Washington lots make rowhouse rehabs in Lawrenceville a specialist game."],
];

function marketDocs(): CorpusDoc[] {
  return MARKETS.map(([p, city, rent, tax, unique]) => ({ path: p, text: `${MARKET_CHROME(city, rent, tax)} ${unique}` }));
}

/** A blog template's boilerplate, the same on every post that carries it. */
const BLOG_CHROME = [
  "Every article here is reviewed by an editor who checks each figure against its original source before it goes live.",
  "Bookmark the guides index and come back whenever a new question about landlording comes up.",
].join(" ");

function blogDocs(count: number, size = 40, template = ""): CorpusDoc[] {
  return Array.from({ length: count }, (_, i) => ({ path: `/blog/post-${i}`, text: `${template} ${words(`post${i}w`, size)}`.trim() }));
}

describe("tokenize and isTerm", () => {
  it("lowercases words, keeps apostrophes inside words and splits on punctuation", () => {
    expect(tokenize("The Cap-Rate’s 7.5% RULE — don't panic")).toEqual(["the", "cap", "rate's", "7", "5", "rule", "don't", "panic"]);
    expect(tokenize("Café in São Paulo")).toEqual(["café", "in", "são", "paulo"]);
  });

  it("does not compatibility-normalize, so its shingles match crawl.ts's byte for byte", () => {
    const ligature = `${String.fromCharCode(0xfb01)}nance`; // "fi" ligature: NFKC would rewrite it to "finance"
    expect(tokenize(ligature)).toEqual([ligature]);
  });

  it("drops stopwords and 1-char words from terms but keeps numbers of 2+ digits", () => {
    expect(["the", "and", "of", "a", "x", "7", "don't"].filter(isTerm)).toEqual([]);
    expect(["rent", "1031", "dscr", "cap"].filter(isTerm)).toEqual(["rent", "1031", "dscr", "cap"]);
  });

  it("builds 5-word shingles over the full word stream", () => {
    expect(SHINGLE_WORDS).toBe(5);
    expect(shingles(["a", "b", "c", "d", "e", "f"])).toEqual(["a b c d e", "b c d e f"]);
    expect(shingles(["a", "b", "c"])).toEqual([]);
  });
});

describe("template chrome removal", () => {
  it("marks a shingle common only when it is on MORE than the share of family pages", () => {
    // 10 pages: phrase P on exactly 3 (= 30%, not more), phrase Q on 4 (40%).
    const P = "alpha bravo charlie delta echo";
    const Q = "kilo lima mike november oscar";
    const pages = Array.from({ length: 10 }, (_, i) => tokenize(`${i < 3 ? P : ""} ${i < 4 ? Q : ""} ${words(`u${i}x`, 6)}`));
    const common = templateCommonShingles(pages, 0.3);
    expect(common.has(P)).toBe(false);
    expect(common.has(Q)).toBe(true);
    expect(common.size).toBe(1);
  });

  it("compares as crawl.ts does (pages > share × n), which differs from pages / n > share at some sizes", () => {
    // 0.35 × 180 = 62.99999999999999 in floating point, while 63 / 180 === 0.35.
    const phrase = "alpha bravo charlie delta echo";
    const pages = Array.from({ length: 180 }, (_, i) => tokenize(`${i < 63 ? phrase : ""} ${words(`u${i}x`, 6)}`));
    expect(63 / 180 > 0.35).toBe(false);
    expect(templateCommonShingles(pages, 0.35).has(phrase)).toBe(true);
  });

  it("learns chrome from chromeOnly pages but never scores or returns them", () => {
    const markets = marketDocs();
    const withChromeOnly = [...markets.slice(0, 4), ...markets.slice(4).map((doc) => ({ ...doc, chromeOnly: true })), ...blogDocs(20)];
    const index = buildIndex(withChromeOnly, OPTIONS);
    expect(index.common.get("market-city")?.size).toBeGreaterThan(40); // 6 pages ≥ 5
    expect(index.n).toBe(24);
    expect(index.docs.map((d) => d.path)).not.toContain("/markets/tampa");
    const top = topMatches(index, markets[4].text, 30);
    expect(top.map((m) => m.path)).not.toContain("/markets/tampa");
    // The same four scored pages without the two chromeOnly siblings are below the 5-page floor.
    expect(buildIndex([...markets.slice(0, 4), ...blogDocs(20)], OPTIONS).common.has("market-city")).toBe(false);
  });

  it("drops every word covered by a common shingle and keeps the rest in order", () => {
    const common = new Set(["run the numbers on your"]);
    const stream = tokenize("Austin rent is high so run the numbers on your deal today");
    expect(stripTemplateChrome(stream, common)).toEqual(["austin", "rent", "is", "high", "so", "deal", "today"]);
    expect(stripTemplateChrome(stream, new Set())).toEqual(stream);
    expect(stripTemplateChrome(["too", "short"], common)).toEqual(["too", "short"]);
  });

  it("strips market-page chrome so template siblings stop looking like duplicates", () => {
    // Markets are a minority of the real corpus; IDF alone only half-discounts their shared template.
    const docs = [...marketDocs(), ...blogDocs(40)];
    const stripped = buildIndex(docs, OPTIONS);
    const unstripped = buildIndex(docs, NO_STRIP);

    expect(stripped.common.get("market-city")?.size).toBeGreaterThan(40);
    const austin = stripped.docs.find((d) => d.path === "/markets/austin")!;
    for (const chromeTerm of ["analyzer", "methodology", "professional", "refreshed"]) expect(austin.vector.has(chromeTerm)).toBe(false);
    for (const uniqueTerm of ["travis", "pflugerville", "concessions"]) expect(austin.vector.has(uniqueTerm)).toBe(true);

    const siblingScores = (index: typeof stripped): number[] => {
      const markets = index.docs.filter((d) => d.family === "market-city");
      const scores: number[] = [];
      for (let i = 0; i < markets.length; i += 1) for (let j = i + 1; j < markets.length; j += 1) scores.push(cosine(markets[i].vector, markets[j].vector));
      return scores;
    };
    expect(siblingScores(unstripped)).toHaveLength(15);
    expect(Math.min(...siblingScores(unstripped))).toBeGreaterThan(0.5);
    expect(Math.max(...siblingScores(stripped))).toBeLessThan(0.1);
  });

  it("only strips TEMPLATE_FAMILIES with at least minFamilyPages pages", () => {
    const shared = words("shared", 30);
    const fourGlossary = Array.from({ length: 4 }, (_, i) => ({ path: `/glossary/term-${i}`, text: `${shared} ${words(`g${i}x`, 5)}` }));
    const sixPersona = Array.from({ length: 6 }, (_, i) => ({ path: `/for-persona-${i}`, text: `${shared} ${words(`p${i}x`, 5)}` }));
    const index = buildIndex([...fourGlossary, ...sixPersona, ...blogDocs(3)], OPTIONS);
    expect(index.common.has("glossary-term")).toBe(false); // 4 < 5 pages
    expect(index.common.has("persona")).toBe(false); // not a template family
    expect(index.docs.find((d) => d.path === "/glossary/term-0")!.vector.has("shared0")).toBe(true);
  });

  it("strips a query with EVERY family's chrome, so a copy scores 1 whatever template wraps it", () => {
    // Chrome is dropped from each family's pages before df is counted, so a chrome term left in a
    // query has df 0: the maximum IDF, no match on any page, and most of the query norm. Stripping
    // a query with its own family's chrome only let a verbatim copy of /markets/memphis through as
    // a blog post (0.44, under mergeAbove); the CLI test below pins every route a family comes in by.
    const index = buildIndex([...marketDocs(), ...blogDocs(40, 40, BLOG_CHROME)], OPTIONS);
    expect(index.common.get("market-city")?.size).toBeGreaterThan(40);
    expect(index.common.get("blog-post")?.size).toBeGreaterThan(20);
    expect(index.queryChrome.size).toBe(index.common.get("market-city")!.size + index.common.get("blog-post")!.size);
    const memphis = index.docs.find((d) => d.path === "/markets/memphis")!;
    const copy = marketDocs()[2].text; // a verbatim copy of /markets/memphis, market chrome included
    const rendered = `${BLOG_CHROME} ${copy}`; // the same copy as a blog page renders it
    for (const text of [copy, rendered]) {
      expect(vectorize(index, text)).toEqual(memphis.vector);
      const top = topMatches(index, text, 3);
      expect(top[0].path).toBe("/markets/memphis");
      expect(top[0].score).toBeCloseTo(1, 10);
      expect(mergeTarget(top, 0.8)).toBe("/markets/memphis");
    }
  });
});

describe("TF-IDF and cosine", () => {
  it("weights a term as ln(1 + count) × ln(N / (1 + df))", () => {
    const docs = [
      { path: "/blog/a", text: "escrow escrow escrow ledger" },
      { path: "/blog/b", text: "ledger audit" },
      { path: "/blog/c", text: "audit trail" },
      { path: "/blog/d", text: "zoning variance" },
    ];
    const index = buildIndex(docs, NO_STRIP);
    const a = index.docs[0].vector;
    expect(index.n).toBe(4);
    expect(a.get("escrow")).toBeCloseTo(Math.log(1 + 3) * Math.log(4 / (1 + 1)), 12);
    expect(a.get("ledger")).toBeCloseTo(Math.log(2) * Math.log(4 / (1 + 2)), 12);
    // Query-only terms use df = 0.
    expect(vectorize(index, "brandnewterm").get("brandnewterm")).toBeCloseTo(Math.log(2) * Math.log(4), 12);
  });

  it("cosine is 1 for parallel vectors, 0 for disjoint or empty ones, and symmetric", () => {
    const a = new Map([["x", 1], ["y", 2]]);
    const b = new Map([["x", 3], ["y", 6]]);
    const c = new Map([["z", 1]]);
    const d = new Map([["x", 1], ["z", 5]]);
    expect(cosine(a, b)).toBeCloseTo(1, 12);
    expect(cosine(a, c)).toBe(0);
    expect(cosine(new Map(), a)).toBe(0);
    expect(cosine(a, d)).toBeCloseTo(cosine(d, a), 12);
    expect(cosine(a, d)).toBeCloseTo(1 / (Math.sqrt(5) * Math.sqrt(26)), 12);
  });

  it("stays within [0, 1] even when a term on every page gets a negative IDF", () => {
    const docs = Array.from({ length: 6 }, (_, i) => ({ path: `/x-${i}`, text: `everywhere ${words(`d${i}x`, 3)}` }));
    const index = buildIndex(docs, NO_STRIP);
    expect(index.docs[0].vector.get("everywhere")).toBeLessThan(0);
    for (const match of topMatches(index, "everywhere d0x0 d0x1", 6)) {
      expect(match.score).toBeGreaterThan(0);
      expect(match.score).toBeLessThanOrEqual(1);
    }
  });
});

describe("topMatches and mergeTarget", () => {
  const index = buildIndex([...marketDocs(), ...blogDocs(8), { path: "/glossary/cap-rate", text: words("capterm", 40) }], OPTIONS);

  it("finds the page a near-duplicate draft copies, across families", () => {
    const draft = `${words("capterm", 36)} fresh1 fresh2 fresh3 fresh4`;
    const top = topMatches(index, draft, 5);
    expect(top[0]).toMatchObject({ path: "/glossary/cap-rate", family: "glossary-term" });
    expect(top[0].score).toBeGreaterThan(0.8);
    expect(mergeTarget(top, 0.8)).toBe("/glossary/cap-rate");
  });

  it("returns best-first, at most k, only positive scores, ties broken by path", () => {
    const draft = `${words("post3w", 20)} ${words("post1w", 20)}`;
    const top = topMatches(index, draft, 10);
    expect(top.map((m) => m.path)).toEqual(["/blog/post-1", "/blog/post-3"]);
    expect(top[0].score).toBeCloseTo(top[1].score, 12);
    expect(topMatches(index, draft, 1)).toHaveLength(1);
    expect(topMatches(index, draft, 0)).toEqual([]);
  });

  it("excludes the page being rewritten from its own matches", () => {
    const top = topMatches(index, words("post5w", 40), 3, { excludePath: "/blog/post-5" });
    expect(top.some((m) => m.path === "/blog/post-5")).toBe(false);
  });

  it("matches nothing for text with no scoreable terms, or against an empty corpus", () => {
    expect(topMatches(index, "the and of to a", 5)).toEqual([]);
    expect(topMatches(index, "", 5)).toEqual([]);
    expect(topMatches(buildIndex([], OPTIONS), "anything at all", 5)).toEqual([]);
  });

  it("merges only when the best score is strictly above the bar", () => {
    const top = [
      { path: "/blog/a", score: 0.8, family: "blog-post" as const },
      { path: "/blog/b", score: 0.5, family: "blog-post" as const },
    ];
    expect(mergeTarget(top, 0.8)).toBeNull();
    expect(mergeTarget(top, 0.79)).toBe("/blog/a");
    expect(mergeTarget([], 0.8)).toBeNull();
  });
});

describe("findPairs", () => {
  // Two pairs with the SAME overlap shape: one inside blog-post, one across glossary/vs.
  const docs: CorpusDoc[] = [
    { path: "/blog/p", text: `${words("pq", 32)} ${words("ponly", 8)}` },
    { path: "/blog/q", text: `${words("pq", 32)} ${words("qonly", 8)}` },
    { path: "/glossary/r", text: `${words("rs", 32)} ${words("ronly", 8)}` },
    { path: "/vs/s", text: `${words("rs", 32)} ${words("sonly", 8)}` },
    { path: "/blog/t", text: words("tu", 40) },
    { path: "/blog/u", text: `${words("tu", 39)} uonly` },
    ...Array.from({ length: 6 }, (_, i) => ({ path: `/filler-${i}`, text: words(`f${i}x`, 30) })),
  ];
  const index = buildIndex(docs, OPTIONS);
  const thresholds = { crossFamilyAbove: 0.6, withinFamilyAbove: 0.8 };

  it("reports cross-family pairs above 0.6 but within-family pairs only above mergeAbove", () => {
    const pq = cosine(index.docs[0].vector, index.docs[1].vector);
    const rs = cosine(index.docs[2].vector, index.docs[3].vector);
    // Fixture guard: both pairs sit between the two thresholds.
    expect(pq).toBeGreaterThan(0.6);
    expect(pq).toBeLessThan(0.8);
    expect(rs).toBeCloseTo(pq, 12);

    const pairs = findPairs(index, thresholds);
    expect(pairs.map((p) => `${p.a}|${p.b}|${p.scope}`)).toEqual(["/blog/t|/blog/u|within-family", "/glossary/r|/vs/s|cross-family"]);
    expect(pairs[0].score).toBeGreaterThan(0.8);
    expect(pairs[1]).toMatchObject({ familyA: "glossary-term", familyB: "vs" });
  });

  it("agrees with a brute-force comparison of every pair", () => {
    const expected: string[] = [];
    for (let i = 0; i < index.docs.length; i += 1) {
      for (let j = i + 1; j < index.docs.length; j += 1) {
        const [a, b] = [index.docs[i], index.docs[j]].sort((x, y) => x.path.localeCompare(y.path));
        const score = cosine(a.vector, b.vector);
        const bar = a.family === b.family ? thresholds.withinFamilyAbove : thresholds.crossFamilyAbove;
        if (score > bar) expected.push(`${a.path}|${b.path}`);
      }
    }
    expect(findPairs(index, thresholds).map((p) => `${p.a}|${p.b}`).sort()).toEqual(expected.sort());
  });
});

describe("textFromTsx", () => {
  const source = [
    "/**",
    " * Blog post header comment that mentions a secret phrase nobody should score.",
    " */",
    'import type { Metadata } from "next";',
    'import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";',
    "import {",
    "  Alpha,",
    "  Beta,",
    '} from "@/components/marketing/some-very-long-module-name";',
    'export { helper } from "@/lib/another-long-module-specifier-path";',
    // Specifiers with spaces would pass the prose filter; they must still be dropped as module paths.
    'import Extra from "./a local module whose file name has spaces";',
    'const lazy = import("./a dynamic module whose file name has spaces");',
    'const legacy = require("./a required module whose file name has spaces");',
    "",
    'const TITLE = "Depreciation recapture on a rental property sale";',
    'const SHORT = "Too short to count";',
    "const DESCRIPTION =",
    '  "What depreciation recapture costs when you sell, and how a 1031 exchange defers it.";',
    "const SLUG_LIKE = \"depreciation-recapture-rental-property-long-slug\";",
    'const cardClass = "rounded-xl border border-border bg-card p-6 shadow-sm";',
    "const FAQS = [",
    '  { q: "Is depreciation recapture taxed at 25 percent?", a: \'Unrecaptured section 1250 gain is taxed at a maximum of 25 percent, not the \\"ordinary\\" rate.\' },',
    '  { className: "text-sm text-muted-foreground leading-relaxed tracking-tight", href: "https://www.irs.gov/publications/p544 long link" },',
    "];",
    "",
    "export default function Post() {",
    "  const siteUrl = getSiteUrl();",
    "  const canonical = `${siteUrl}/blog/depreciation-recapture-rental-property`;",
    "  const ratio = total < limit && /['\"]quote-in-regex['\"]/.test(label) ? total / limit : 0;",
    "  const pick = <T,>(value: T): T => value;",
    "  return (",
    '    <div className="min-h-screen bg-background">',
    '      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@type": "BlogPosting", headline: TITLE }) }} />',
    '      <main id="main" className={cn("max-w-3xl mx-auto", ratio > 1 && "px-4 sm:px-6 py-8")}>',
    "        {/* JSX comment with words that must never be scored */}",
    "        <h1 className=\"text-3xl font-extrabold\">{TITLE}</h1>",
    "        <p>",
    "          Selling a rental triggers recapture on every dollar you",
    '          deducted.{" "}',
    '          <Link href="/blog/1031-exchange-basics" className="text-primary font-semibold hover:underline">',
    "            A 1031 exchange",
    "          </Link>{\" \"}",
    "          defers it &mdash; it doesn&apos;t erase it.",
    "        </p>",
    '        <Callout title="Recapture is not optional on a sale" data-tone="warning long attribute value" aria-label="decorative label that is not visible">',
    "          <>Keep your depreciation schedule.</>",
    "        </Callout>",
    "        {FAQS.map((f) => (",
    "          <section key={f.q}>",
    "            <h2>{f.q}</h2>",
    "            <p>{f.a}</p>",
    "          </section>",
    "        ))}",
    '        <img src="/images/a-very-long-image-file-name-for-the-post.png" alt="Chart of recapture tax owed by holding period" />',
    "      </main>",
    "    </div>",
    "  );",
    "}",
  ].join("\n");
  const text = textFromTsx(source);

  it("keeps JSX text nodes in order, with entities decoded and whitespace collapsed", () => {
    expect(text).toContain("Selling a rental triggers recapture on every dollar you deducted.");
    expect(text).toContain("A 1031 exchange defers it — it doesn't erase it.");
    expect(text).toContain("Keep your depreciation schedule.");
    expect(text.indexOf("Selling a rental")).toBeLessThan(text.indexOf("Keep your depreciation"));
  });

  it("keeps prose string literals longer than 20 chars, including visible attribute values", () => {
    expect(text).toContain("Depreciation recapture on a rental property sale");
    expect(text).toContain("What depreciation recapture costs when you sell, and how a 1031 exchange defers it.");
    expect(text).toContain("Is depreciation recapture taxed at 25 percent?");
    expect(text).toContain('Unrecaptured section 1250 gain is taxed at a maximum of 25 percent, not the "ordinary" rate.');
    expect(text).toContain("Recapture is not optional on a sale");
    expect(text).toContain("Chart of recapture tax owed by holding period");
  });

  it("drops short literals, slugs, class lists, hrefs, srcs, data-/aria- values, specifiers and comments", () => {
    for (const banned of [
      "Too short to count",
      "depreciation-recapture-rental-property-long-slug",
      "rounded-xl",
      "text-muted-foreground",
      "max-w-3xl",
      "px-4",
      "irs.gov",
      "a-very-long-image-file-name",
      "warning long attribute value",
      "decorative label",
      "@/components",
      "some-very-long-module-name",
      "another-long-module-specifier-path",
      "whose file name has spaces",
      "secret phrase",
      "must never be scored",
      "quote-in-regex",
      "getSiteUrl",
      "=>",
      "application/ld+json",
    ]) {
      expect(text).not.toContain(banned);
    }
  });

  it("never throws on malformed JSX and still returns the literals it could read", () => {
    const broken = 'const LEDE = "A perfectly good sentence that is long enough.";\nexport default () => (<div><p>unclosed paragraph <span>and more';
    expect(() => textFromTsx(broken)).not.toThrow();
    expect(textFromTsx(broken)).toContain("A perfectly good sentence that is long enough.");
    expect(textFromTsx("")).toBe("");
  });

  it("reads a .ts data module (no JSX) for its prose", () => {
    const data = 'export const POSTS = [{ slug: "cap-rate-guide-for-rental-investors", title: "Cap rate explained for rental investors" }];';
    expect(textFromTsx(data)).toBe("Cap rate explained for rental investors");
  });
});

describe("draft helpers", () => {
  it("textFromMarkdown drops frontmatter, link targets, HTML and fences but keeps the words", () => {
    const md = [
      "---",
      "title: Should not appear",
      "---",
      "# Cap rate guide",
      "",
      "See [IRS Publication 527](https://www.irs.gov/publications/p527) and ![a chart of cap rates](/img/x.png).",
      "<!-- editor note -->",
      "```",
      "rent / price",
      "```",
      "<div>Inline html text</div> [ref link][1]",
      "[1]: https://example.com/ref",
    ].join("\n");
    const text = textFromMarkdown(md);
    expect(text).toContain("Cap rate guide");
    expect(text).toContain("See IRS Publication 527 and a chart of cap rates.");
    expect(text).toContain("rent / price");
    expect(text).toContain("Inline html text ref link");
    for (const banned of ["Should not appear", "irs.gov", "x.png", "editor note", "```", "example.com", "<div>"]) expect(text).not.toContain(banned);
  });

  it("draftText dispatches on extension and rejects unknown types", () => {
    expect(draftText("x.txt", "plain words here")).toBe("plain words here");
    expect(draftText("x.md", "# Heading [link](/x)")).toBe("# Heading link");
    expect(draftText("x.html", "<html><body><nav>Menu</nav><main><p>Main words</p></main></body></html>")).toBe("Main words");
    expect(draftText("app/blog/x/page.tsx", "export default () => <p>Hello there reader</p>;")).toBe("Hello there reader");
    expect(() => draftText("x.pdf", "")).toThrow(/unsupported draft type/);
  });

  it("pathFromSourceFile maps page sources to site paths", () => {
    expect(pathFromSourceFile("app/blog/cap-rate/page.tsx")).toBe("/blog/cap-rate");
    expect(pathFromSourceFile("app/vs/dealcheck/page.tsx")).toBe("/vs/dealcheck");
    expect(pathFromSourceFile("./tmp/work/app/research/rent-study/page.tsx")).toBe("/research/rent-study");
    expect(pathFromSourceFile("app/(marketing)/about/page.tsx")).toBe("/about");
    expect(pathFromSourceFile("app/page.tsx")).toBe("/");
    expect(pathFromSourceFile("app\\blog\\x\\page.tsx")).toBe("/blog/x");
    expect(pathFromSourceFile("app/blog/[slug]/page.tsx")).toBeNull();
    expect(pathFromSourceFile("app/blog/xpage.tsx")).toBeNull();
    expect(pathFromSourceFile("app/blog/x/opengraph-image.tsx")).toBeNull();
    expect(pathFromSourceFile("drafts/new-post.md")).toBeNull();
  });

  it("parseFamily accepts every family and nothing else", () => {
    for (const family of [...TEMPLATE_FAMILIES, "home", "hub", "persona", "research", "market-strategy", "other"]) expect(parseFamily(family)).toBe(family);
    for (const bad of ["blog", "Blog-Post", "", "toString", "__proto__"]) expect(() => parseFamily(bad)).toThrow(/--family must be one of/);
  });

  it("normalizeSitePath accepts paths or full URLs", () => {
    expect(normalizeSitePath("/blog/x/")).toBe("/blog/x");
    expect(normalizeSitePath("blog/x")).toBe("/blog/x");
    expect(normalizeSitePath("https://usetruecap.com/blog/x/")).toBe("/blog/x");
    expect(normalizeSitePath("/")).toBe("/");
  });
});

// ------------------------------------------------------------- corpus + CLI

const TODAY = "2026-09-27";

function crawlPage(pagePath: string, textFile: string, overrides: Partial<CrawlPage> = {}): CrawlPage {
  return {
    url: `https://usetruecap.com${pagePath}`,
    path: pagePath,
    family: familyOf(pagePath),
    status: 200,
    finalUrl: null,
    title: null,
    metaDescription: null,
    h1: [],
    canonical: null,
    canonicalIsSelf: true,
    robots: null,
    noindex: false,
    jsonLdTypes: [],
    jsonLdParseErrors: 0,
    datePublished: null,
    dateModified: null,
    visibleUpdatedDate: null,
    wordCount: 0,
    mainHash: "0",
    uniqueRatio: null,
    thin: false,
    outboundInternal: 0,
    outboundExternal: 0,
    inboundContextual: 0,
    inboundTotal: 0,
    depth: null,
    textFile,
    ...overrides,
  };
}

function crawlOf(pages: CrawlPage[]): Crawl {
  return {
    generatedAt: `${TODAY}T00:00:00.000Z`,
    base: "https://usetruecap.com",
    sitemapCount: pages.length,
    pages,
    linkGraph: { ran: false, reason: "fixture", edges: [], orphans: [] },
    issues: {
      duplicateTitles: [],
      duplicateDescriptions: [],
      missingTitles: [],
      missingDescriptions: [],
      orphans: [],
      deeperThan3: [],
      brokenInternalLinks: [],
      nonSelfCanonical: [],
      noindexInSitemap: [],
      non200: [],
    },
    healthcheckFindings: [],
  };
}

describe("loadCorpus and the CLI", () => {
  let tmp: string;
  let data: string;
  let stdout: string[];
  const saved = { data: process.env.SEO_DATA_DIR, today: process.env.SEO_TODAY };

  const ALPHA = `${words("alpha", 60)} shared1 shared2`;
  const BETA = `${words("beta", 60)} shared1 shared2`;
  const GLOSSARY = words("gloss", 50);
  const FILLERS = 4;
  const INDEXED = ["/blog/alpha", "/blog/beta", "/glossary/cap-rate", "/glossary/filler-0", "/glossary/filler-1", "/glossary/filler-2", "/glossary/filler-3"];

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "seo-similarity-"));
    data = path.join(tmp, "data");
    mkdirSync(path.join(data, "pages"), { recursive: true });
    process.env.SEO_DATA_DIR = data;
    process.env.SEO_TODAY = TODAY;
    const put = (rel: string, text: string): void => writeFileSync(path.join(data, rel), text);
    put("pages/alpha.txt", ALPHA);
    put("pages/beta.txt", BETA);
    put("pages/gloss.txt", GLOSSARY);
    put("pages/noindex.txt", words("noidx", 40));
    put("pages/canon.txt", words("canon", 40));
    put("pages/redirect.txt", ALPHA);
    put("pages/empty.txt", "   \n");
    // Fillers keep N realistic: with ln(N / (1 + df)) and N = 3, a term on 2 pages weighs exactly 0.
    for (let i = 0; i < FILLERS; i += 1) put(`pages/filler-${i}.txt`, words(`filler${i}x`, 40));
    writeFileSync(path.join(tmp, "outside.txt"), ALPHA);
    const crawl = crawlOf([
      crawlPage("/blog/alpha", "pages/alpha.txt"),
      crawlPage("/blog/beta", "pages/beta.txt"),
      crawlPage("/glossary/cap-rate", "pages/gloss.txt"),
      ...Array.from({ length: FILLERS }, (_, i) => crawlPage(`/glossary/filler-${i}`, `pages/filler-${i}.txt`)),
      crawlPage("/blog/noindexed", "pages/noindex.txt", { noindex: true }),
      crawlPage("/blog/canonicalised", "pages/canon.txt", { canonicalIsSelf: false }),
      crawlPage("/blog/moved", "pages/redirect.txt", { status: 301 }),
      crawlPage("/blog/missing", "pages/does-not-exist.txt"),
      crawlPage("/blog/empty", "pages/empty.txt"),
      crawlPage("/blog/escape", "../outside.txt"),
    ]);
    writeFileSync(path.join(data, `crawl-${TODAY}.json`), JSON.stringify(crawl));
    // An older, smaller crawl must lose to the newest one.
    const older = [crawlPage("/glossary/cap-rate", "pages/gloss.txt"), ...Array.from({ length: FILLERS }, (_, i) => crawlPage(`/glossary/filler-${i}`, `pages/filler-${i}.txt`))];
    writeFileSync(path.join(data, "crawl-2026-09-01.json"), JSON.stringify(crawlOf(older)));
    stdout = [];
    vi.spyOn(console, "log").mockImplementation((...parts: unknown[]) => {
      stdout.push(parts.map(String).join(" "));
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tmp, { recursive: true, force: true });
    if (saved.data === undefined) delete process.env.SEO_DATA_DIR;
    else process.env.SEO_DATA_DIR = saved.data;
    if (saved.today === undefined) delete process.env.SEO_TODAY;
    else process.env.SEO_TODAY = saved.today;
  });

  const run = async (argv: string[]): Promise<SimilarityAnswer> => {
    expect(await main(parseArgs(argv))).toBe(0);
    return JSON.parse(stdout.join("\n")) as SimilarityAnswer;
  };

  const writeDraft = (rel: string, content: string): string => {
    const file = path.join(tmp, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
    return file;
  };

  it("scores only 200, indexable, self-canonical pages whose text sits inside the data dir", () => {
    const crawl = JSON.parse(readFileSync(path.join(data, `crawl-${TODAY}.json`), "utf8")) as Crawl;
    const { docs, excluded } = loadCorpus(crawl, data);
    expect(docs.filter((d) => !d.chromeOnly).map((d) => d.path)).toEqual(INDEXED);
    // Every other 200 page still feeds its family's chrome, as in crawl.ts; the 301 does not.
    expect(docs.filter((d) => d.chromeOnly).map((d) => d.path)).toEqual(["/blog/noindexed", "/blog/canonicalised", "/blog/missing", "/blog/empty", "/blog/escape"]);
    expect(docs.find((d) => d.path === "/blog/escape")?.text).toBe("");
    expect(excluded).toEqual({ non200: 1, noindex: 1, nonSelfCanonical: 1, missingText: ["/blog/missing", "/blog/empty", "/blog/escape"] });
    expect(buildIndex(docs, OPTIONS).n).toBe(INDEXED.length);
  });

  it("--draft: a new .tsx page that copies an existing page is told to merge into it", async () => {
    const draft = writeDraft("app/blog/brand-new-post/page.tsx", `export default function P() { return <main><p>${words("alpha", 58)} novel</p></main>; }`);
    const answer = await run(["--draft", draft]);
    expect(answer.query).toMatchObject({ path: "/blog/brand-new-post", family: "blog-post", source: "draft" });
    expect(answer.top[0].path).toBe("/blog/alpha");
    expect(answer.top[0].score).toBeGreaterThan(0.8);
    expect(answer.mergeInto).toBe("/blog/alpha");
    expect(answer.mergeAbove).toBe(0.8);
    expect(answer.corpus).toEqual({ crawlFile: `crawl-${TODAY}.json`, docs: INDEXED.length });
  });

  it("--draft: a rewrite of an existing page is not compared with itself", async () => {
    const draft = writeDraft("app/blog/alpha/page.tsx", `export default function P() { return <main><p>${ALPHA}</p></main>; }`);
    const answer = await run(["--draft", draft, "--top", "5"]);
    expect(answer.top.map((m) => m.path)).not.toContain("/blog/alpha");
    expect(answer.mergeInto).toBeNull();
  });

  it("--draft: an original .md draft gets no merge target", async () => {
    const draft = writeDraft("drafts/new.md", `# New topic\n\n${words("fresh", 50)} shared1`);
    const answer = await run(["--draft", draft]);
    expect(answer.query).toMatchObject({ path: null, family: null, source: "draft" });
    expect(answer.mergeInto).toBeNull();
    expect(answer.top.every((m) => m.score < 0.3)).toBe(true);
  });

  it("--path compares an existing page's current text, or new text from --text-file", async () => {
    const current = await run(["--path", "/blog/alpha/"]);
    expect(current.query).toMatchObject({ path: "/blog/alpha", family: "blog-post", source: "corpus" });
    expect(current.top.map((m) => m.path)).toEqual(["/blog/beta"]);
    expect(current.mergeInto).toBeNull();

    stdout = [];
    const rewrite = writeDraft("rewrite.txt", GLOSSARY);
    const rewritten = await run(["--path", "/blog/alpha", "--text-file", rewrite]);
    expect(rewritten.query.source).toBe("draft");
    expect(rewritten.mergeInto).toBe("/glossary/cap-rate");
  });

  it("a copy of a market page merges into it whatever family the query comes in as", async () => {
    // Regression: the query was stripped with its own family's chrome only, so the market template
    // left in a blog draft (df 0 once stripped from the market pages) swamped the score and
    // mergeInto came back null for a verbatim copy. Every route that sets a family is pinned here.
    const pages: CrawlPage[] = [];
    for (const doc of [...marketDocs(), ...blogDocs(40, 40, BLOG_CHROME)]) {
      const rel = `pages/${doc.path.slice(1).replace(/\//g, "-")}.txt`;
      writeFileSync(path.join(data, rel), doc.text);
      pages.push(crawlPage(doc.path, rel));
    }
    const crawlFile = path.join(data, "crawl-markets.json");
    writeFileSync(crawlFile, JSON.stringify(crawlOf(pages)));
    const copy = marketDocs()[2].text; // /markets/memphis verbatim, market chrome included
    const tsx = writeDraft("app/blog/memphis-rental-market/page.tsx", `export default function P() { return <main><p>${copy}</p></main>; }`);
    const rendered = writeDraft("rendered.html", `<html><body><nav>Menu</nav><main><p>${BLOG_CHROME}</p><p>${copy}</p></main></body></html>`);
    const plain = writeDraft("copy.txt", copy);
    const routes: Array<[string[], string | null]> = [
      [["--draft", tsx], "blog-post"],
      [["--path", "/blog/memphis-rental-market", "--text-file", rendered], "blog-post"],
      [["--draft", plain, "--family", "blog-post"], "blog-post"],
      [["--draft", rendered, "--family", "market-city"], "market-city"],
      [["--draft", plain], null],
    ];
    for (const [argv, family] of routes) {
      stdout = [];
      const answer = await run(["--crawl", crawlFile, ...argv]);
      expect(answer.query.family).toBe(family);
      expect(answer.top[0]).toMatchObject({ path: "/markets/memphis", score: 1 });
      expect(answer.mergeInto).toBe("/markets/memphis");
    }
  });

  it("--pairs writes seo/data/similarity-<date>.json with pairs, thresholds and exclusions", async () => {
    writeFileSync(path.join(data, "pages/beta.txt"), `${words("alpha", 60)} beta1`);
    expect(await main(parseArgs(["--pairs"]))).toBe(0);
    const out = path.join(data, `similarity-${TODAY}.json`);
    expect(existsSync(out)).toBe(true);
    const report = JSON.parse(readFileSync(out, "utf8")) as SimilarityPairsReport;
    expect(report.crawlFile).toBe(`crawl-${TODAY}.json`);
    expect(report.docs).toBe(INDEXED.length);
    expect(report.thresholds).toEqual({ crossFamilyAbove: 0.6, withinFamilyAbove: 0.8, templateCommonShare: 0.3, templateMinFamilyPages: 5 });
    expect(report.excluded.missingText).toEqual(["/blog/missing", "/blog/empty", "/blog/escape"]);
    expect(report.pairs).toHaveLength(1);
    expect(report.pairs[0]).toMatchObject({ a: "/blog/alpha", b: "/blog/beta", scope: "within-family" });
    expect(report.pairs[0].score).toBeGreaterThan(0.8);
    expect(JSON.parse(stdout.join("\n"))).toEqual({ file: `similarity-${TODAY}.json`, docs: INDEXED.length, pairs: 1, crossFamily: 0, withinFamily: 1 });
    expect(readFileSync(out, "utf8")).not.toContain(tmp);
  });

  it("fails loudly on bad input instead of answering 'no duplicate'", async () => {
    await expect(main(parseArgs([]))).rejects.toThrow(/usage/);
    await expect(main(parseArgs(["--path", "/blog/not-crawled"]))).rejects.toThrow(/not in the similarity corpus/);
    await expect(main(parseArgs(["--path", "/blog/noindexed"]))).rejects.toThrow(/not in the similarity corpus/);
    await expect(main(parseArgs(["--draft", "a.md", "--text-file", "b.md"]))).rejects.toThrow(/not both/);
    await expect(main(parseArgs(["--path", "/blog/alpha", "--top", "0"]))).rejects.toThrow(/--top/);
    // --family only labels the answer, but a typo must not be echoed back as a family.
    await expect(main(parseArgs(["--draft", writeDraft("f.txt", ALPHA), "--family", "blog"]))).rejects.toThrow(/--family must be one of/);
    await expect(main(parseArgs(["--draft", writeDraft("g.txt", ALPHA), "--family"]))).rejects.toThrow(/--family needs a value/);
    rmSync(path.join(data, `crawl-${TODAY}.json`));
    rmSync(path.join(data, "crawl-2026-09-01.json"));
    await expect(main(parseArgs(["--path", "/blog/alpha"]))).rejects.toThrow(/no crawl file/);
  });

  it("--crawl picks a specific crawl file", async () => {
    const answer = await run(["--crawl", path.join(data, "crawl-2026-09-01.json"), "--draft", writeDraft("x.txt", GLOSSARY)]);
    expect(answer.corpus).toEqual({ crawlFile: "crawl-2026-09-01.json", docs: 1 + FILLERS });
    expect(answer.mergeInto).toBe("/glossary/cap-rate");
  });

  it("fails closed when nothing could be compared, instead of printing mergeInto: null", async () => {
    // A draft with no scoreable terms (stopwords only, or a component-only .tsx).
    await expect(main(parseArgs(["--draft", writeDraft("stop.txt", "the and of to a")]))).rejects.toThrow(/no scoreable text/);
    await expect(main(parseArgs(["--draft", writeDraft("app/blog/stub/page.tsx", 'import { X } from "@/components/x";\nexport default function P() { return <X />; }')]))).rejects.toThrow(
      /\/blog\/stub has no scoreable text/,
    );
    // A crawl whose pages all failed, e.g. a site outage during the crawl.
    const outage = path.join(data, "crawl-outage.json");
    writeFileSync(outage, JSON.stringify(crawlOf([crawlPage("/blog/alpha", "pages/alpha.txt", { status: 503 })])));
    await expect(main(parseArgs(["--crawl", outage, "--draft", writeDraft("y.txt", ALPHA)]))).rejects.toThrow(/no scoreable pages/);
    await expect(main(parseArgs(["--crawl", outage, "--pairs"]))).rejects.toThrow(/no scoreable pages/);
    expect(existsSync(path.join(data, `similarity-${TODAY}.json`))).toBe(false);
  });
});
