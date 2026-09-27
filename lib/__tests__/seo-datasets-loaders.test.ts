import { describe, expect, it } from "vitest";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import { CITY_STRATEGY_COMBOS } from "@/lib/city-strategy-combos";
import { getIndexableMarketSlugs, isStateIndexable } from "@/lib/markets/indexability";
import { STATES } from "@/lib/states";
import { LASTMOD, lastmodFor, lastmodOrPublished, parseLastmodMap } from "@/lib/seo/lastmod";
import { NOINDEX_PATHS, isNoindexPath, noindexRobotsHeader, parseNoindexList } from "@/lib/seo/noindex";
import { RESEARCH_PAGES, parseResearchRegistry, researchSitemapPaths } from "@/lib/seo/research";

/**
 * F2 owner loaders for content/seo/*.json. Each validates at import and
 * throws on malformed data, so a bad dataset fails `next build` instead of
 * publishing a wrong date, deindexing the wrong page or listing a bad URL.
 */

describe("lib/seo/lastmod: parseLastmodMap", () => {
  it("accepts the committed map and a well-formed one", () => {
    expect(Object.keys(LASTMOD).length).toBeGreaterThanOrEqual(380);
    expect(parseLastmodMap({ "/": "2026-09-19", "/blog/a-b": "2026-02-28" })).toEqual({ "/": "2026-09-19", "/blog/a-b": "2026-02-28" });
    expect(Object.isFrozen(parseLastmodMap({}))).toBe(true);
  });

  it.each([
    ["an array", []],
    ["null", null],
    ["a string", "2026-09-19"],
  ])("rejects %s", (_label, value) => {
    expect(() => parseLastmodMap(value)).toThrow(/JSON object/);
  });

  it.each([
    ["no leading slash", "blog/x"],
    ["a full URL", "https://usetruecap.com/blog/x"],
    ["a trailing slash", "/blog/x/"],
    ["a query", "/blog/x?a=1"],
    ["a fragment", "/blog/x#faq"],
    ["upper case", "/Blog/x"],
    ["an empty segment", "/blog//x"],
  ])("rejects a key with %s", (_label, key) => {
    expect(() => parseLastmodMap({ [key]: "2026-09-19" })).toThrow(/not a site path/);
  });

  it.each([
    ["a datetime", "2026-09-19T00:00:00Z"],
    ["a short date", "2026-9-19"],
    ["an impossible day", "2026-02-30"],
    ["an impossible month", "2026-13-01"],
    ["a number", 20260919],
    ["null", null],
  ])("rejects a value that is %s", (_label, value) => {
    expect(() => parseLastmodMap({ "/blog/x": value })).toThrow(/not a YYYY-MM-DD date/);
  });

  it("looks up own keys only, and never invents a date", () => {
    expect(lastmodFor("/")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(lastmodFor("/no-such-page")).toBeUndefined();
    expect(lastmodFor("constructor")).toBeUndefined();
    expect(lastmodFor("__proto__")).toBeUndefined();
    expect(lastmodFor("/blog/")).toBeUndefined();
  });

  it("lastmodOrPublished never returns a date before publication", () => {
    const path = "/blog/what-is-a-good-dscr";
    const date = lastmodFor(path) as string;
    expect(lastmodOrPublished(path, "2000-01-01")).toBe(date);
    expect(lastmodOrPublished(path, "2999-01-01")).toBe("2999-01-01");
    expect(lastmodOrPublished("/no-such-page", "2026-05-01")).toBe("2026-05-01");
  });
});

describe("lib/seo/noindex: parseNoindexList and the proxy header", () => {
  it("loads the committed list", () => {
    expect(Array.isArray(NOINDEX_PATHS)).toBe(true);
    for (const path of NOINDEX_PATHS) expect(isNoindexPath(path)).toBe(true);
    expect(parseNoindexList({ paths: ["/blog/a", "/glossary/b"] })).toEqual(["/blog/a", "/glossary/b"]);
  });

  it.each([
    ["a bare array (the pre-F2 shape)", ["/blog/a"]],
    ["no paths key", {}],
    ["an extra key", { paths: [], note: "x" }],
    ["paths that is not an array", { paths: "/blog/a" }],
  ])("rejects %s", (_label, value) => {
    expect(() => parseNoindexList(value)).toThrow(/must be \{ "paths"/);
  });

  it.each([
    ["the homepage", "/"],
    ["a trailing slash", "/blog/a/"],
    ["a full URL", "https://usetruecap.com/blog/a"],
    ["a non-string", 7],
  ])("rejects an entry that is %s", (_label, entry) => {
    expect(() => parseNoindexList({ paths: [entry] })).toThrow(/not a noindexable site path/);
  });

  it("rejects duplicates", () => {
    expect(() => parseNoindexList({ paths: ["/blog/a", "/blog/a"] })).toThrow(/listed twice/);
  });

  it("matches exact paths only", () => {
    // The committed list is empty today; nothing is noindexed by it.
    expect(NOINDEX_PATHS).toEqual([]);
    expect(isNoindexPath("/blog/what-is-a-good-dscr")).toBe(false);
    const listed = (path: string) => ["/blog/thin"].includes(path);
    expect(noindexRobotsHeader("/blog/thin", null, listed)).toBe("noindex");
    expect(noindexRobotsHeader("/blog/thin/", null, listed)).toBeNull();
    expect(noindexRobotsHeader("/blog/thin-er", null, listed)).toBeNull();
    expect(noindexRobotsHeader("/blog", null, listed)).toBeNull();
  });

  it("never replaces a robots header already set (the host guard's noindex, nofollow wins)", () => {
    const listed = () => true;
    expect(noindexRobotsHeader("/blog/thin", "noindex, nofollow", listed)).toBeNull();
    expect(noindexRobotsHeader("/blog/thin", null, () => false)).toBeNull();
  });
});

describe("lib/seo/research: parseResearchRegistry and the sitemap filter", () => {
  const page = (over: Record<string, unknown> = {}) => ({
    slug: "rent-trends-2026",
    title: "Rent trends in 2026",
    status: "published",
    publishedAt: "2026-10-01",
    ...over,
  });

  it("loads the committed (empty) registry", () => {
    expect(RESEARCH_PAGES).toEqual([]);
    expect(researchSitemapPaths()).toEqual([]);
  });

  it("accepts published pages and dated or undated drafts", () => {
    expect(parseResearchRegistry({ pages: [page(), page({ slug: "d", status: "draft", publishedAt: null })] })).toHaveLength(2);
  });

  it.each([
    ["a bare array", [page()]],
    ["an extra top-level key", { pages: [], note: 1 }],
    ["a page with a missing key", { pages: [{ slug: "a", title: "A", status: "draft" }] }],
    ["a page with an extra key", { pages: [page({ body: "x" })] }],
    ["an upper-case slug", { pages: [page({ slug: "Rent" })] }],
    ["a slug with a slash", { pages: [page({ slug: "a/b" })] }],
    ["a duplicate slug", { pages: [page(), page()] }],
    ["markup in the title", { pages: [page({ title: "<script>x</script>" })] }],
    ["an empty title", { pages: [page({ title: " " })] }],
    ["an unknown status", { pages: [page({ status: "live" })] }],
    ["a published page without a date", { pages: [page({ publishedAt: null })] }],
    ["a bad date", { pages: [page({ publishedAt: "2026-10-32" })] }],
  ])("rejects %s", (_label, value) => {
    expect(() => parseResearchRegistry(value)).toThrow();
  });

  it("lists published pages only, and never a noindex-listed one", () => {
    const pages = parseResearchRegistry({
      pages: [
        page({ slug: "published" }),
        page({ slug: "draft", status: "draft", publishedAt: null }),
        page({ slug: "hidden" }),
      ],
    });
    expect(researchSitemapPaths(pages, (path) => path !== "/research/hidden")).toEqual(["/research/published"]);
  });
});

describe("llms.txt uses the sitemap's indexability rules (D6)", () => {
  it("lists every indexable market page and no noindex strategy page", async () => {
    const text = await (await getLlmsTxt()).text();
    const marketLinks = [...text.matchAll(/\]\([^)]*\/markets\/([a-z0-9-]+)\)/g)].map((m) => m[1]);
    expect(marketLinks.sort()).toEqual([...getIndexableMarketSlugs()].sort());
    expect(marketLinks.length).toBeGreaterThanOrEqual(150);
    // Strategy pages are noindex (STRATEGY_PAGES_INDEXABLE = false): none may be advertised.
    expect(CITY_STRATEGY_COMBOS.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/\/markets\/[a-z0-9-]+\/[a-z0-9-]+\)/);
    // States: exactly the indexable ones.
    const stateLinks = [...text.matchAll(/\]\([^)]*\/states\/([a-z0-9-]+)\)/g)].map((m) => m[1]);
    expect(stateLinks.sort()).toEqual(Object.values(STATES).map((s) => s.slug).filter(isStateIndexable).sort());
  });
});
