import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  allowedUrl,
  applyBaseline,
  extractLdJsonBlocks,
  failing,
  findingKey,
  jsonExtent,
  main,
  normalizeVisible,
  pageIdFor,
  sortFindings,
  validateBlocks,
  validateHtml,
  validateHtmlDir,
  validateUrls,
  type FetchLike,
  type JsonLdFinding,
} from "../../seo/scripts/jsonld-validate.ts";
import { parseArgs } from "../../seo/scripts/lib/cli.ts";

/**
 * seo/scripts/jsonld-validate.ts. The properties that matter:
 *   - a raw </script or <!-- inside JSON-LD text is CRITICAL (the browser ends
 *     the script there), found by a string-aware scan, not the first </script>;
 *   - required properties per @type, and FAQ questions visible in <main>;
 *   - only loopback and the production host are fetched; --baseline keeps
 *     pre-existing debt from failing every run.
 * No network: fetch is always a stub.
 */

const tmpDirs: string[] = [];
afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});

const ld = (value: unknown): string => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;

/** Shaped like Next's server output: head scripts, entity-escaped text, FAQ in <details>. */
function page(blocks: string[], main: string, canonical = "https://usetruecap.com/blog/cap-rate"): string {
  return [
    "<!DOCTYPE html><html lang=\"en\"><head><meta charSet=\"utf-8\"/>",
    `<link rel="canonical" href="${canonical}"/>`,
    "<title>Cap rate | TrueCap</title></head><body>",
    "<header><nav><a href=\"/blog\">Blog</a></nav></header>",
    `<main>${blocks.join("")}${main}</main>`,
    "<footer>© TrueCap</footer></body></html>",
  ].join("");
}

const ARTICLE = {
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": "https://usetruecap.com/blog/cap-rate#article",
  headline: "What is a good cap rate?",
  datePublished: "2026-07-01",
  dateModified: "2026-07-02",
  author: { "@type": "Organization", "@id": "https://usetruecap.com/#organization", name: "TrueCap", url: "https://usetruecap.com" },
  publisher: { "@id": "https://usetruecap.com/#organization" },
};
const BREADCRUMB = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "TrueCap", item: "https://usetruecap.com" },
    { "@type": "ListItem", position: 2, name: "Blog", item: { "@id": "https://usetruecap.com/blog" } },
    { "@type": "ListItem", position: 3, name: "Cap rate" },
  ],
};
const FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "What’s a good cap rate?", acceptedAnswer: { "@type": "Answer", text: "It depends on the market." } },
    { "@type": "Question", name: "Is NOI   before debt service?", acceptedAnswer: { "@type": "Answer", text: "Yes." } },
  ],
};
const VISIBLE_FAQ =
  "<section><h2>FAQ</h2><details><summary>What&#x27;s a <strong>good</strong> cap rate?</summary><p>It depends.</p></details>" +
  "<details><summary>Is NOI before\n debt service?</summary><p>Yes.</p></details></section>";

// ---------------------------------------------------------------- extraction

describe("extractLdJsonBlocks", () => {
  it("extracts every block, with any quoting of the type attribute", () => {
    const html = `${ld({ a: 1 })}<script type='application/ld+json'>{"b":2}</script><script type=application/ld+json>[{"c":3}]</script><script>var x = 1;</script>`;
    const blocks = extractLdJsonBlocks(html);
    expect(blocks.map((b) => b.value)).toEqual([{ a: 1 }, { b: 2 }, [{ c: 3 }]]);
    expect(blocks.every((b) => b.critical.length === 0 && b.errors.length === 0)).toBe(true);
  });

  it("finds the real end of the JSON, so a </script> inside a string is a CRITICAL breakout", () => {
    const html = page(['<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"x</script><img src=x onerror=alert(1)>"}</script>'], "<p>x</p>");
    const [block] = extractLdJsonBlocks(html);
    expect(block.critical[0]).toMatch(/raw <\/script/);
    expect(block.value).toEqual({ "@context": "https://schema.org", "@type": "WebPage", name: "x</script><img src=x onerror=alert(1)>" });
    const findings = validateHtml(html, "/x");
    expect(findings.filter((f) => f.severity === "critical")).toHaveLength(1);
  });

  it("treats <!-- inside the JSON text as critical, and case does not hide </SCRIPT", () => {
    expect(extractLdJsonBlocks(`<script type="application/ld+json">{"a":"<!-- x"}</script>`)[0].critical[0]).toMatch(/<!--/);
    expect(extractLdJsonBlocks(`<script type="application/ld+json">{"a":"</SCRIPT >"}</script>`)[0].critical[0]).toMatch(/<\/script/);
  });

  it("reports blocks that never close, do not parse, or carry trailing junk", () => {
    expect(extractLdJsonBlocks(`<script type="application/ld+json">{"a":1</script>`)[0].errors[0]).toMatch(/never closes/);
    expect(extractLdJsonBlocks(`<script type="application/ld+json">{"a":1,}</script>`)[0].errors[0]).toMatch(/does not parse/);
    expect(extractLdJsonBlocks(`<script type="application/ld+json">{"a":1} {"b":2}</script>`)[0].errors[0]).toMatch(/unexpected content/);
    expect(extractLdJsonBlocks(`<script type="application/ld+json">nope</script>`)[0].errors[0]).toMatch(/does not start/);
  });

  it("jsonExtent honours escapes and brackets inside strings", () => {
    const text = 'x{"a":"}\\"]","b":[1,{"c":"{"}]}tail';
    const extent = jsonExtent(text, 1);
    expect(extent).toEqual({ end: text.length - 4 });
  });
});

// --------------------------------------------------------------------- rules

describe("validateBlocks", () => {
  const errors = (blocks: unknown[], visible = ""): string[] => validateBlocks(blocks, visible, "/p").map((f) => `${f.type}: ${f.detail}`);

  it("accepts a complete Article, BreadcrumbList and visible FAQPage", () => {
    const html = page([ld(ARTICLE), ld(BREADCRUMB), ld(FAQ)], `<article><h1>Cap rate</h1><p>Body.</p>${VISIBLE_FAQ}</article>`);
    expect(validateHtml(html, "/blog/cap-rate")).toEqual([]);
  });

  it("Article/BlogPosting: headline, author, datePublished, dateModified, publisher", () => {
    expect(errors([{ "@context": "https://schema.org", "@type": "BlogPosting", headline: " " }])).toEqual([
      "BlogPosting: missing headline",
      "BlogPosting: missing author",
      "BlogPosting: missing datePublished",
      "BlogPosting: missing dateModified",
      "BlogPosting: missing publisher",
    ]);
  });

  it("BreadcrumbList: position, name, and item on all but the last crumb", () => {
    const crumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [{ "@type": "ListItem", position: "1", name: "A", item: "https://usetruecap.com" }, { "@type": "ListItem", position: 2 }, { "@type": "ListItem", position: 3, name: "C" }],
    };
    expect(errors([crumbs])).toEqual([
      "BreadcrumbList: itemListElement[0] has no integer position",
      "BreadcrumbList: itemListElement[1] has no name",
      "BreadcrumbList: itemListElement[1] has no item (only the last crumb may omit it)",
    ]);
    expect(errors([{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [] }])).toEqual(["BreadcrumbList: missing itemListElement"]);
  });

  it("FAQPage: Questions with name and acceptedAnswer.text, visible on the page", () => {
    const faq = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: "Shown?", acceptedAnswer: { text: "Yes." } }, { "@type": "Answer", name: "Hidden question?", acceptedAnswer: {} }],
    };
    expect(errors([faq], "<p>Shown?</p>")).toEqual([
      "FAQPage: mainEntity[1] is not a Question",
      "FAQPage: mainEntity[1] has no acceptedAnswer.text",
      'FAQPage: question not visible on the page: "Hidden question?"',
    ]);
    expect(errors([{ ...faq, mainEntity: [] }])).toEqual(["FAQPage: missing mainEntity"]);
  });

  it("FAQ visibility ignores tags, entities, curly quotes and whitespace", () => {
    expect(normalizeVisible("What&#x27;s a <strong>good</strong>\n cap rate?")).toBe(normalizeVisible("What’s a good cap rate?"));
    expect(validateHtml(page([ld(FAQ)], VISIBLE_FAQ), "/p")).toEqual([]);
    const outsideMain = page([ld(FAQ)], "<p>Body only.</p>").replace("<footer>", `<footer>${VISIBLE_FAQ}`);
    // Only <main> counts: the same FAQ rendered in the footer is not "the page's content".
    expect(validateHtml(outsideMain, "/p").map((f) => f.detail)).toEqual([
      'question not visible on the page: "What’s a good cap rate?"',
      'question not visible on the page: "Is NOI   before debt service?"',
    ]);
  });

  it("SoftwareApplication (and Web/Mobile): name, applicationCategory, offers or aggregateRating", () => {
    expect(errors([{ "@context": "https://schema.org", "@type": "WebApplication", name: "Calc" }])).toEqual([
      "WebApplication: missing applicationCategory",
      "WebApplication: missing offers or aggregateRating",
    ]);
    expect(errors([{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Calc", applicationCategory: "FinanceApplication", offers: { price: "0" } }])).toEqual([]);
  });

  it("Organization, WebSite, DefinedTerm, WebPage", () => {
    expect(errors([{ "@context": "https://schema.org", "@type": "Organization", name: "TrueCap" }])).toEqual(["Organization: missing url"]);
    expect(errors([{ "@context": "https://schema.org", "@type": "WebSite", url: "https://usetruecap.com" }])).toEqual(["WebSite: missing name"]);
    expect(errors([{ "@context": "https://schema.org", "@type": "DefinedTerm", name: "NOI" }])).toEqual(["DefinedTerm: missing description"]);
    expect(errors([{ "@context": "https://schema.org", "@type": "WebPage" }])).toEqual(["WebPage: missing name or headline"]);
    expect(errors([{ "@context": "https://schema.org", "@type": "CollectionPage", headline: "Hub" }])).toEqual([]);
  });

  it("checks nested typed nodes, @graph members and multi-type nodes; skips pure @id references", () => {
    const graph = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", "@id": "https://usetruecap.com/#organization" },
        { "@type": ["WebPage", "FAQPage"], name: "Hub", mainEntity: [{ "@type": "Question", name: "Q?", acceptedAnswer: { text: "A" } }] },
        { "@type": "Article", headline: "H", datePublished: "d", dateModified: "d", publisher: { "@id": "x" }, author: { "@type": "Organization", name: "TrueCap" } },
      ],
    };
    expect(errors([graph], "Q?")).toEqual(["Organization: missing url"]);
  });

  it("requires a schema.org @context on every top-level node", () => {
    const ok = ["https://schema.org", "http://schema.org/", ["https://schema.org", { x: 1 }], { "@vocab": "https://schema.org/" }];
    for (const context of ok) expect(errors([{ "@context": context, "@type": "Thing" }]), JSON.stringify(context)).toEqual([]);
    expect(errors([{ "@type": "Thing" }])).toEqual(["Thing: block 1: @context is not schema.org"]);
    expect(errors([[{ "@context": "https://schema.org", "@type": "Thing" }, { "@context": "https://example.org", "@type": "Thing" }]])).toEqual(["Thing: block 1: @context is not schema.org"]);
    expect(errors([[1]])).toEqual(["jsonld: block 1: a top-level entry is not an object"]);
  });
});

// ------------------------------------------------------------ plumbing

describe("baseline, ordering and ids", () => {
  const f = (url: string, severity: JsonLdFinding["severity"], detail: string): JsonLdFinding => ({ url, type: "Article", severity, detail });

  it("only NEW errors fail once a baseline is supplied", () => {
    const base = [f("/a", "error", "missing author")];
    const now = [f("/a", "error", "missing author"), f("/b", "warning", "w")];
    const { fresh, known } = applyBaseline(now, base);
    expect(known).toEqual([base[0]]);
    expect(fresh).toEqual([now[1]]);
    expect(failing(fresh)).toBe(false);
    expect(failing([f("/c", "critical", "x")])).toBe(true);
  });

  it("matches a baseline across block renumbering, and by count", () => {
    const noContext = (n: number): JsonLdFinding => ({ url: "/a", type: "Thing", severity: "error", detail: `block ${n}: @context is not schema.org` });
    // A patch that adds one block in front renumbers the rest; their old errors are not new.
    expect(applyBaseline([noContext(2)], [noContext(1)])).toEqual({ fresh: [], known: [noContext(2)] });
    expect(findingKey(noContext(1))).toBe(findingKey(noContext(7)));
    // One baseline finding covers one finding: a duplicated broken block still fails.
    const missing = f("/a", "error", "missing author");
    expect(applyBaseline([missing, missing], [missing])).toEqual({ fresh: [missing], known: [missing] });
  });

  it("sorts by url, then severity, then type and detail", () => {
    const sorted = sortFindings([f("/b", "error", "z"), f("/a", "warning", "a"), f("/a", "critical", "b"), f("/a", "error", "a")]);
    expect(sorted.map((x) => `${x.url} ${x.severity} ${x.detail}`)).toEqual(["/a critical b", "/a error a", "/a warning a", "/b error z"]);
  });

  it("uses the canonical path as the page id, so base and patched renders line up", () => {
    expect(pageIdFor(page([], ""), "f.html")).toBe("/blog/cap-rate");
    expect(pageIdFor(page([], "", "https://ci.invalid/blog/cap-rate/"), "f.html")).toBe("/blog/cap-rate");
    expect(pageIdFor("<html></html>", "ab12.html")).toBe("ab12.html");
  });

  it("fetches only loopback or the production host", () => {
    expect(allowedUrl("https://usetruecap.com/blog/x")?.pathname).toBe("/blog/x");
    expect(allowedUrl("http://127.0.0.1:3100/")).not.toBeNull();
    expect(allowedUrl("http://localhost:3000/x")).not.toBeNull();
    expect(allowedUrl("http://[::1]:3000/x")).not.toBeNull();
    for (const bad of ["https://evil.example/", "http://usetruecap.com/", "https://www.usetruecap.com/", "https://usetruecap.com:8443/", "https://u:p@usetruecap.com/", "file:///etc/passwd", "nope"]) {
      expect(allowedUrl(bad), bad).toBeNull();
    }
  });
});

// ------------------------------------------------------------------- fetch

describe("validateUrls", () => {
  const stub = (responses: Record<string, { status: number; body?: string } | Error>): FetchLike => async (url) => {
    const r = responses[url];
    if (!r) throw new Error(`unexpected fetch ${url}`);
    if (r instanceof Error) throw r;
    return new Response(r.body ?? "", { status: r.status });
  };

  it("validates fetched pages and records HTTP and network failures as findings", async () => {
    const fetchImpl = stub({
      "https://usetruecap.com/blog/ok": { status: 200, body: page([ld(ARTICLE)], "<p>x</p>") },
      "https://usetruecap.com/blog/moved": { status: 308 },
      "http://127.0.0.1:3100/down": new Error("connect ECONNREFUSED"),
    });
    const findings = await validateUrls(["https://usetruecap.com/blog/ok", "https://usetruecap.com/blog/moved", "http://127.0.0.1:3100/down"], fetchImpl, "ua");
    expect(findings.map((x) => `${x.url} ${x.type} ${x.detail}`)).toEqual(["http://127.0.0.1:3100/down fetch connect ECONNREFUSED", "https://usetruecap.com/blog/moved fetch HTTP 308"]);
  });

  it("refuses a disallowed host before any request", async () => {
    const fetchImpl = vi.fn<FetchLike>();
    await expect(validateUrls(["https://evil.example/x"], fetchImpl, "ua")).rejects.toThrow(/refusing to fetch/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

// --------------------------------------------------------------------- CLI

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

  function htmlDir(pages: Record<string, string>): string {
    const dir = mkdtempSync(path.join(os.tmpdir(), "seo-jsonld-test-"));
    tmpDirs.push(dir);
    for (const [name, html] of Object.entries(pages)) {
      mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      writeFileSync(path.join(dir, name), html);
    }
    return dir;
  }

  it("exits 0 on clean pages and 1 on errors, writing {findings} to --out", async () => {
    const clean = htmlDir({ "a1.html": page([ld(ARTICLE), ld(BREADCRUMB)], "<p>x</p>") });
    expect(await main(parseArgs(["--html-dir", clean]))).toBe(0);

    const dirty = htmlDir({
      "a1.html": page([ld(ARTICLE)], "<p>x</p>"),
      "nested/b2.html": page([ld(FAQ)], "<p>no faq text</p>", "https://usetruecap.com/blog/other"),
      "ignored.txt": "not html",
    });
    const out = path.join(dirty, "findings.json");
    expect(await main(parseArgs(["--html-dir", dirty, "--out", out]))).toBe(1);
    const written = JSON.parse(readFileSync(out, "utf8")) as { findings: JsonLdFinding[] };
    expect(written.findings.map((x) => [x.url, x.type, x.severity])).toEqual([
      ["/blog/other", "FAQPage", "error"],
      ["/blog/other", "FAQPage", "error"],
    ]);
    expect(validateHtmlDir(dirty)).toEqual(written.findings);
  });

  it("with --baseline, pre-existing findings move to `known` and do not fail the run", async () => {
    const dirty = htmlDir({ "b2.html": page([ld(FAQ)], "<p>no faq text</p>") });
    const baselineFile = path.join(dirty, "base.json");
    expect(await main(parseArgs(["--html-dir", dirty, "--out", baselineFile]))).toBe(1);
    const out = path.join(dirty, "patched.json");
    expect(await main(parseArgs(["--html-dir", dirty, "--baseline", baselineFile, "--out", out]))).toBe(0);
    const written = JSON.parse(readFileSync(out, "utf8")) as { findings: JsonLdFinding[]; known: JsonLdFinding[] };
    expect(written.findings).toEqual([]);
    expect(written.known).toHaveLength(2);

    writeFileSync(path.join(dirty, "c3.html"), page(['<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"</script>"}</script>'], "<p>x</p>", "https://usetruecap.com/c"));
    expect(await main(parseArgs(["--html-dir", dirty, "--baseline", baselineFile]))).toBe(1);
  });

  it("with --baseline, a patch that adds a JSON-LD block in front does not re-report the blocks it renumbered", async () => {
    const noContext = ld({ "@type": "WebPage", name: "Cap rate" });
    const base = htmlDir({ "p.html": page([noContext], "<p>x</p>") });
    const baselineFile = path.join(base, "base.json");
    expect(await main(parseArgs(["--html-dir", base, "--out", baselineFile]))).toBe(1);
    const patched = htmlDir({ "p.html": page([ld(ARTICLE), noContext], "<p>x</p>") });
    const out = path.join(patched, "patched.json");
    expect(await main(parseArgs(["--html-dir", patched, "--baseline", baselineFile, "--out", out]))).toBe(0);
    const written = JSON.parse(readFileSync(out, "utf8")) as { findings: JsonLdFinding[]; known: JsonLdFinding[] };
    expect(written.known.map((x) => x.detail)).toEqual(["block 2: @context is not schema.org"]);
    // Duplicating the broken block is new debt.
    const doubled = htmlDir({ "p.html": page([noContext, noContext], "<p>x</p>") });
    expect(await main(parseArgs(["--html-dir", doubled, "--baseline", baselineFile]))).toBe(1);
  });

  it("--urls goes through the fetch fence and the injected fetch", async () => {
    const fetchImpl: FetchLike = async () => new Response(page([ld(ARTICLE)], "<p>x</p>"), { status: 200 });
    expect(await main(parseArgs(["--urls", "https://usetruecap.com/blog/cap-rate, http://127.0.0.1:3100/"]), fetchImpl)).toBe(0);
    await expect(main(parseArgs(["--urls", "https://evil.example/"]), fetchImpl)).rejects.toThrow(/refusing/);
    await expect(main(parseArgs([]))).rejects.toThrow(/--html-dir/);
  });
});
