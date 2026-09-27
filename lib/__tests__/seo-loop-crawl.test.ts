import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertAllowedBase,
  brokenLinksFrom,
  buildCrawlPage,
  canonicalIsSelf,
  computeIssues,
  crawlFileFor,
  fetchPage,
  findDuplicates,
  hasNoindex,
  inboundCounts,
  indexStatusMergeBlocker,
  isLoopbackBase,
  isRobotsDisallowed,
  looksDown,
  mergeIntoIndexStatus,
  normalizeHealthcheck,
  parseRobotsDisallow,
  planLinkChecks,
  runCrawl,
  runHealthcheckProcess,
  scrubbedEnv,
  shingles,
  textFileFor,
  thinFlag,
  tokenize,
  uniqueRatios,
  writeCrawlArtifacts,
  type CrawlDeps,
  type CrawlMergedFields,
  type CrawlOutput,
  type CrawlPageRecord,
  type FetchFn,
  type FetchedPage,
  type HealthcheckEdge,
  type HealthcheckRun,
} from "../../seo/scripts/crawl.ts";
import { loadConfig } from "../../seo/scripts/lib/config.ts";
import type { Family } from "../../seo/scripts/lib/family.ts";
import { latestDataFile } from "../../seo/scripts/lib/paths.ts";
import type { SitemapUrl } from "../../seo/scripts/lib/sitemap.ts";
import type { IndexStatus, IndexStatusUrl } from "../../seo/scripts/lib/types.ts";

/**
 * seo/scripts/crawl.ts: the per-page census every later stage acts on. The
 * cases that matter most are the ones that would make brakes.ts revert a
 * healthy change or score.ts rewrite a healthy page: a transient failure read
 * as non-200, template chrome read as content (thin), a redirect or a
 * robots-disallowed link read as broken, and a merge that clobbers
 * gsc-inspect's mainHashAtInspect. No network: every fetch is a stub, and the
 * healthcheck child process is a fixture script in a temp dir.
 */

const BASE = "https://usetruecap.com";
const PRUNE = { minDaysInSitemap: 60, maxImpressions28d: 10, minWords: 600, minUniqueRatio: 0.4, minConfirmingInspections: 2, minDaysBetweenInspections: 14 };

type Route = { status: number; body?: string; headers?: Record<string, string> } | "error";
type RouteTable = Record<string, Route | Route[] | ((method: string) => Route)>;

/** A fetch stub over a route table. An array answers in order (last one repeats). */
function stubFetch(routes: RouteTable, calls: string[] = []): FetchFn {
  const cursor = new Map<string, number>();
  return async (url, init) => {
    const method = init.method ?? "GET";
    calls.push(`${method} ${url}`);
    const entry = routes[url];
    let route: Route;
    if (entry === undefined) route = { status: 404, body: "not found" };
    else if (typeof entry === "function") route = entry(method);
    else if (Array.isArray(entry)) {
      const i = cursor.get(url) ?? 0;
      cursor.set(url, i + 1);
      route = entry[Math.min(i, entry.length - 1)];
    } else route = entry;
    if (route === "error") throw new TypeError("fetch failed");
    return new Response(method === "HEAD" ? null : (route.body ?? ""), { status: route.status, headers: route.headers });
  };
}

function page(opts: {
  title?: string | null;
  description?: string | null;
  canonical?: string | null;
  robots?: string;
  h1?: string;
  body?: string;
  jsonLd?: unknown;
}): string {
  const head = [
    opts.title === null ? "" : `<title>${opts.title ?? "A page"}</title>`,
    opts.description === null ? "" : `<meta name="description" content="${opts.description ?? "A description"}">`,
    opts.canonical === null ? "" : `<link rel="canonical" href="${opts.canonical ?? ""}">`,
    opts.robots ? `<meta name="robots" content="${opts.robots}">` : "",
    opts.jsonLd ? `<script type="application/ld+json">${JSON.stringify(opts.jsonLd)}</script>` : "",
  ].join("");
  return (
    `<html><head>${head}</head><body>` +
    '<header><a href="/pricing">Pricing</a></header><nav><a href="/blog">Blog</a><a href="https://x.com/truecap">X</a></nav>' +
    `<main><h1>${opts.h1 ?? "Heading"}</h1>${opts.body ?? "<p>Body text.</p>"}</main>` +
    '<footer><a href="/terms">Terms</a><a href="https://www.linkedin.com/company/x">LinkedIn</a></footer></body></html>'
  );
}

const ok = (body: string, headers?: Record<string, string>): FetchedPage => ({ status: 200, location: null, xRobotsTag: headers?.["x-robots-tag"] ?? null, body, error: null });

function record(overrides: Partial<CrawlPageRecord> & { path: string }): CrawlPageRecord {
  return {
    url: `${BASE}${overrides.path}`,
    family: "blog-post",
    status: 200,
    finalUrl: null,
    title: "Title",
    metaDescription: "Description",
    h1: ["Heading"],
    canonical: `${BASE}${overrides.path}`,
    canonicalIsSelf: true,
    robots: null,
    noindex: false,
    jsonLdTypes: [],
    jsonLdParseErrors: 0,
    datePublished: null,
    dateModified: null,
    visibleUpdatedDate: null,
    wordCount: 800,
    mainHash: "hash",
    uniqueRatio: null,
    thin: false,
    outboundInternal: 0,
    outboundExternal: 0,
    inboundContextual: 0,
    inboundTotal: 0,
    depth: 1,
    textFile: textFileFor(overrides.path),
    fetchError: null,
    xRobotsTag: null,
    externalHosts: [],
    ...overrides,
  };
}

const words = (prefix: string, n: number): string => Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(" ");

describe("assertAllowedBase", () => {
  it("allows the configured production origin and loopback, normalised to a bare origin", () => {
    expect(assertAllowedBase("https://usetruecap.com/", BASE)).toBe(BASE);
    expect(assertAllowedBase("https://usetruecap.com", BASE)).toBe(BASE);
    expect(assertAllowedBase("http://localhost:3000/", BASE)).toBe("http://localhost:3000");
    expect(assertAllowedBase("http://127.0.0.1:3100", BASE)).toBe("http://127.0.0.1:3100");
    expect(assertAllowedBase("http://[::1]:3000", BASE)).toBe("http://[::1]:3000");
  });

  it("refuses every other host, the wrong scheme or port, a path, and credentials", () => {
    for (const bad of [
      "https://www.usetruecap.com",
      "https://truecap-iota.vercel.app",
      "https://usetruecap.com.evil.example",
      "http://usetruecap.com",
      "https://usetruecap.com:8443",
      "https://usetruecap.com/blog",
      "https://usetruecap.com/?x=1",
      "https://user:pw@usetruecap.com",
      "ftp://localhost",
      "not a url",
    ]) {
      expect(() => assertAllowedBase(bad, BASE), bad).toThrow();
    }
  });

  it("reads the production host from config rather than a literal", () => {
    expect(assertAllowedBase("https://example.org", "https://example.org")).toBe("https://example.org");
    expect(() => assertAllowedBase(BASE, "https://example.org")).toThrow(/refusing to crawl usetruecap\.com/);
  });

  it("identifies loopback bases", () => {
    expect(isLoopbackBase("http://localhost:3000")).toBe(true);
    expect(isLoopbackBase("http://127.0.0.1")).toBe(true);
    expect(isLoopbackBase(BASE)).toBe(false);
  });
});

describe("shingles", () => {
  it("tokenises to lowercase letter/digit runs, keeping internal apostrophes", () => {
    expect(tokenize("Don’t buy — the $1,200 CAP-rate deal!")).toEqual(["don't", "buy", "the", "1", "200", "cap", "rate", "deal"]);
  });

  it("cuts distinct 5-word shingles and none below five words", () => {
    expect([...shingles("a b c d e f")]).toEqual(["a b c d e", "b c d e f"]);
    expect(shingles("a b c d").size).toBe(0);
    expect(shingles("a b c d e a b c d e").size).toBe(5);
    expect([...shingles("a b c", 2)]).toEqual(["a b", "b c"]);
  });
});

describe("uniqueRatios", () => {
  const chrome = words("chrome", 10);

  it("drops shingles shared by more than the common share of the family", () => {
    const pages = ["a", "b", "c", "d", "e"].map((c) => ({ path: `/markets/${c}`, text: `${chrome} ${words(c, 10)}` }));
    const ratios = uniqueRatios(new Map<Family, typeof pages>([["market-city", pages]]), { commonShare: 0.3 });
    // 20 tokens → 16 shingles. The 6 made only of chrome words are in all 5 pages.
    for (const p of pages) expect(ratios.get(p.path)).toBe(0.625);
  });

  it("uses a strict 'more than' share", () => {
    const shared = "alpha beta gamma delta epsilon";
    const unique = (i: number): string => words(`u${i}x`, 5);
    const build = (sharedCount: number) =>
      Array.from({ length: 10 }, (_, i) => ({ path: `/glossary/t${i}`, text: i < sharedCount ? shared : unique(i) }));
    // 3 of 10 = exactly 0.3: not common, so fully unique.
    expect(uniqueRatios({ "glossary-term": build(3) }, { commonShare: 0.3 }).get("/glossary/t0")).toBe(1);
    // 4 of 10 > 0.3: common, so nothing unique.
    expect(uniqueRatios({ "glossary-term": build(4) }, { commonShare: 0.3 }).get("/glossary/t0")).toBe(0);
  });

  it("returns null for small families and non-template families", () => {
    const four = ["a", "b", "c", "d"].map((c) => ({ path: `/states/${c}`, text: words(c, 20) }));
    const hubs = ["a", "b", "c", "d", "e", "f"].map((c) => ({ path: `/hub-${c}`, text: words(c, 20) }));
    const ratios = uniqueRatios({ state: four, hub: hubs }, { commonShare: 0.3 });
    for (const p of [...four, ...hubs]) expect(ratios.get(p.path)).toBeNull();
  });

  it("gives a page with no shingles a ratio of 0, not NaN", () => {
    const pages = [{ path: "/vs/empty", text: "too short" }, ...["a", "b", "c", "d"].map((c) => ({ path: `/vs/${c}`, text: words(c, 20) }))];
    expect(uniqueRatios({ vs: pages }, { commonShare: 0.3 }).get("/vs/empty")).toBe(0);
  });

  it("defaults the common share from config", () => {
    const pages = ["a", "b", "c", "d", "e"].map((c) => ({ path: `/tools/${c}`, text: `${chrome} ${words(c, 10)}` }));
    expect(loadConfig().thresholds.similarity.templateCommonShare).toBe(0.3);
    expect(uniqueRatios({ tool: pages }).get("/tools/a")).toBe(0.625);
  });
});

describe("thinFlag", () => {
  it("is thin below the word floor or below the unique-ratio floor", () => {
    expect(thinFlag(599, null, PRUNE)).toBe(true);
    expect(thinFlag(600, null, PRUNE)).toBe(false);
    expect(thinFlag(2000, 0.39, PRUNE)).toBe(true);
    expect(thinFlag(2000, 0.4, PRUNE)).toBe(false);
  });
});

describe("findDuplicates", () => {
  it("groups after trim + whitespace collapse + lowercase, keeps the first spelling, and skips blanks", () => {
    const dupes = findDuplicates([
      { path: "/b", value: "  Cap  Rate Guide " },
      { path: "/a", value: "cap rate guide" },
      { path: "/c", value: "NOI" },
      { path: "/d", value: "noi" },
      { path: "/e", value: "noi" },
      { path: "/f", value: null },
      { path: "/g", value: "   " },
      { path: "/h", value: "   " },
      { path: "/i", value: "unique" },
    ]);
    expect(dupes).toEqual([
      { value: "NOI", paths: ["/c", "/d", "/e"] },
      { value: "Cap Rate Guide", paths: ["/a", "/b"] },
    ]);
  });

  it("does not count one path twice as a duplicate", () => {
    expect(findDuplicates([{ path: "/a", value: "x" }, { path: "/a", value: "X" }])).toEqual([]);
  });
});

describe("computeIssues", () => {
  const pages: CrawlPageRecord[] = [
    record({ path: "/", family: "home", depth: 0, title: "Home", metaDescription: "Home desc" }),
    record({ path: "/blog/a", title: "Same", metaDescription: "Same desc" }),
    record({ path: "/blog/b", title: " same ", metaDescription: "same desc", canonicalIsSelf: false }),
    record({ path: "/blog/c", title: null, metaDescription: " ", noindex: true, depth: 4 }),
    record({ path: "/blog/orphan", title: "Orphan", metaDescription: "Orphan desc", depth: null }),
    record({ path: "/blog/unreached-not-orphan", title: "U", metaDescription: "U desc", depth: null }),
    record({ path: "/gone", status: 404, title: null, metaDescription: null, canonicalIsSelf: null, depth: 2 }),
    record({ path: "/moved", status: 308, title: null, metaDescription: null, noindex: true, depth: 2 }),
  ];
  const broken = [{ from: "/", target: "/moved", status: 308 }];

  it("reports every issue class from pages that answered 200", () => {
    const issues = computeIssues(pages, { ran: true, orphans: ["/blog/orphan"] }, broken);
    expect(issues.duplicateTitles).toEqual([{ title: "Same", paths: ["/blog/a", "/blog/b"] }]);
    expect(issues.duplicateDescriptions).toEqual([{ description: "Same desc", paths: ["/blog/a", "/blog/b"] }]);
    expect(issues.missingTitles).toEqual(["/blog/c"]);
    expect(issues.missingDescriptions).toEqual(["/blog/c"]);
    expect(issues.orphans).toEqual(["/blog/orphan"]);
    expect(issues.deeperThan3).toEqual([
      { path: "/blog/c", depth: 4 },
      { path: "/blog/orphan", depth: null },
    ]);
    expect(issues.brokenInternalLinks).toBe(broken);
    expect(issues.nonSelfCanonical).toEqual(["/blog/b"]);
    // /moved carries noindex but did not answer 200: it is a non-200, not a noindex page.
    expect(issues.noindexInSitemap).toEqual(["/blog/c"]);
    expect(issues.non200).toEqual([
      { path: "/gone", status: 404 },
      { path: "/moved", status: 308 },
    ]);
  });

  it("reports no orphans or depth issues when the link graph did not run", () => {
    const issues = computeIssues(pages, { ran: false, orphans: ["/blog/orphan"] }, []);
    expect(issues.orphans).toEqual([]);
    expect(issues.deeperThan3).toEqual([]);
  });
});

describe("normalizeHealthcheck", () => {
  const report = {
    linkGraph: {
      ran: true,
      reason: null,
      sitemapUrls: 3,
      reachable: 2,
      orphans: ["/z", "/a", 7],
      edges: [
        { source: "/b", target: "/c", anchor: "C", placement: "contextual" },
        { source: "/", target: "/b", anchor: "B", placement: "navigation" },
        { from: "/x", target: "/y", anchor: "Y", placement: "footer" },
        { source: "/", target: 3 },
        "junk",
      ],
      depth: { "/": 0, "/b": 1, "/c": 2, "/z": null, "/bad": "x" },
    },
    findings: [{ severity: "high", check: "orphaned sitemap URLs", detail: "1 of 3" }, { check: "no severity" }, { severity: "low" }],
  };

  it("maps healthcheck `source` to the contract's `from`, sorted, dropping malformed edges", () => {
    const health = normalizeHealthcheck(report);
    expect(health.ran).toBe(true);
    expect(health.reason).toBeNull();
    expect(health.edges).toEqual([
      { from: "/", target: "/b", anchor: "B", placement: "navigation" },
      { from: "/b", target: "/c", anchor: "C", placement: "contextual" },
      { from: "/x", target: "/y", anchor: "Y", placement: "footer" },
    ]);
    expect(health.orphans).toEqual(["/a", "/z"]);
    expect(health.depth).toEqual({ "/": 0, "/b": 1, "/c": 2, "/z": null, "/bad": null });
    expect(health.findings).toEqual([
      { severity: "high", check: "orphaned sitemap URLs", detail: "1 of 3" },
      { severity: "info", check: "no severity" },
    ]);
  });

  it("keeps findings but discards orphans and depth when the graph did not complete", () => {
    const health = normalizeHealthcheck({ ...report, linkGraph: { ...report.linkGraph, ran: false, reason: "sampled run" } });
    expect(health.ran).toBe(false);
    expect(health.reason).toBe("sampled run");
    expect(health.orphans).toEqual([]);
    expect(health.depth).toEqual({});
    expect(health.findings).toHaveLength(2);
  });

  it("survives garbage", () => {
    for (const raw of [null, 7, "x", [], { linkGraph: "no" }]) {
      const health = normalizeHealthcheck(raw);
      expect(health.ran).toBe(false);
      expect(health.edges).toEqual([]);
      expect(health.reason).toMatch(/no completed link graph/);
    }
  });
});

describe("inboundCounts", () => {
  it("counts distinct linking pages, contextual vs any placement, excluding self-links", () => {
    const edges: HealthcheckEdge[] = [
      { from: "/a", target: "/t", anchor: "one", placement: "contextual" },
      { from: "/a", target: "/t", anchor: "two", placement: "contextual" },
      { from: "/b", target: "/t", anchor: "t", placement: "footer" },
      { from: "/c", target: "/t", anchor: "t", placement: "navigation" },
      { from: "/t", target: "/t", anchor: "self", placement: "contextual" },
    ];
    expect(inboundCounts(edges).get("/t")).toEqual({ contextual: 1, total: 3 });
    expect(inboundCounts(edges).get("/a")).toBeUndefined();
  });
});

describe("robots rules", () => {
  const robots = [
    "# comment",
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /auth/ # inline comment",
    "Disallow: /*.json$",
    "Disallow:",
    "",
    "User-agent: GPTBot",
    "User-agent: ClaudeBot",
    "Allow: /",
    "Disallow: /bots-only/",
    "",
    "Sitemap: https://usetruecap.com/sitemap.xml",
  ].join("\n");

  it("collects Disallow values for the `*` group only", () => {
    expect(parseRobotsDisallow(robots)).toEqual(["/api/", "/auth/", "/*.json$"]);
  });

  it("matches prefixes, wildcards, end anchors, and the bare directory like the healthcheck", () => {
    const rules = parseRobotsDisallow(robots);
    expect(isRobotsDisallowed("/auth/login", rules)).toBe(true);
    expect(isRobotsDisallowed("/auth", rules)).toBe(true);
    expect(isRobotsDisallowed("/authors", rules)).toBe(false);
    expect(isRobotsDisallowed("/data/x.json", rules)).toBe(true);
    expect(isRobotsDisallowed("/data/x.json/more", rules)).toBe(false);
    expect(isRobotsDisallowed("/bots-only/x", rules)).toBe(false);
    expect(isRobotsDisallowed("/blog/x", [])).toBe(false);
  });
});

describe("broken-link planning", () => {
  const edges: HealthcheckEdge[] = [
    { from: "/", target: "/blog/a", anchor: "a", placement: "contextual" },
    { from: "/", target: "/moved", anchor: "m", placement: "contextual" },
    { from: "/blog/a", target: "/moved", anchor: "m", placement: "footer" },
    { from: "/", target: "/pricing", anchor: "p", placement: "navigation" },
    { from: "/blog/a", target: "/pricing", anchor: "p", placement: "navigation" },
    { from: "/", target: "/old", anchor: "o", placement: "contextual" },
    { from: "/", target: "/auth/login", anchor: "Sign in", placement: "navigation" },
    { from: "/", target: "/down", anchor: "d", placement: "contextual" },
  ];
  const crawled = new Map([
    ["/blog/a", 200],
    ["/moved", 308],
    ["/down", 0],
  ]);

  it("reuses crawled statuses, skips robots-disallowed targets, and checks the most-linked first up to the cap", () => {
    const plan = planLinkChecks(edges, crawled, ["/auth/"], 1);
    expect([...plan.known]).toEqual([
      ["/blog/a", 200],
      ["/moved", 308],
      ["/down", null],
    ]);
    expect(plan.skippedRobots).toEqual(["/auth/login"]);
    expect(plan.toCheck).toEqual(["/pricing"]);
    expect(plan.skippedOverCap).toEqual(["/old"]);
  });

  it("lists each (from, target) pair once for every known non-200 target, never unchecked ones", () => {
    const status = new Map<string, number | null>([
      ["/blog/a", 200],
      ["/moved", 308],
      ["/down", null],
      ["/pricing", 200],
    ]);
    expect(brokenLinksFrom(edges, status)).toEqual([
      { from: "/", target: "/down", status: null },
      { from: "/", target: "/moved", status: 308 },
      { from: "/blog/a", target: "/moved", status: 308 },
    ]);
  });
});

describe("canonicalIsSelf and noindex", () => {
  const hosts = new Set(["usetruecap.com", "localhost"]);
  const url = `${BASE}/blog/a`;

  it("compares the resolved canonical path on an allowed host", () => {
    expect(canonicalIsSelf(`${BASE}/blog/a`, "/blog/a", url, hosts)).toBe(true);
    expect(canonicalIsSelf(`${BASE}/blog/a/`, "/blog/a", url, hosts)).toBe(true);
    expect(canonicalIsSelf("/blog/a", "/blog/a", url, hosts)).toBe(true);
    expect(canonicalIsSelf(`${BASE}/blog/a?utm=x`, "/blog/a", url, hosts)).toBe(true);
    expect(canonicalIsSelf(`${BASE}/blog/b`, "/blog/a", url, hosts)).toBe(false);
    expect(canonicalIsSelf("https://truecap-iota.vercel.app/blog/a", "/blog/a", url, hosts)).toBe(false);
    expect(canonicalIsSelf("http://[bad", "/blog/a", url, hosts)).toBe(false);
    expect(canonicalIsSelf(null, "/blog/a", url, hosts)).toBeNull();
    expect(canonicalIsSelf("  ", "/blog/a", url, hosts)).toBeNull();
  });

  it("treats noindex and none as noindex, anywhere in the directive list", () => {
    expect(hasNoindex("index, follow")).toBe(false);
    expect(hasNoindex("NOINDEX, follow")).toBe(true);
    expect(hasNoindex("none")).toBe(true);
    expect(hasNoindex("googlebot: noindex")).toBe(true);
    expect(hasNoindex(null)).toBe(false);
  });
});

describe("buildCrawlPage", () => {
  const hosts = new Set(["usetruecap.com"]);
  const entry = { url: `${BASE}/blog/cap-rate`, path: "/blog/cap-rate" };
  const fetchUrl = `${BASE}/blog/cap-rate`;

  it("extracts the page fields and counts only main-content links", () => {
    const html = page({
      title: "Cap Rate &amp; NOI",
      description: "How cap rate works",
      canonical: `${BASE}/blog/cap-rate`,
      robots: "index, follow",
      h1: "Cap rate",
      jsonLd: { "@context": "https://schema.org", "@type": "Article", datePublished: "2026-01-02", dateModified: "2026-09-01" },
      body:
        '<p>Updated Sep 1, 2026. See <a href="/blog/noi">NOI</a>, <a href="/blog/noi#calc">again</a>, <a href="/blog/cap-rate">this page</a> ' +
        'and <a href="https://www.irs.gov/p527">IRS</a> plus <a href="https://www.irs.gov/p946">IRS 946</a> and <a href="https://www.huduser.gov/fmr">HUD</a>.</p>',
    });
    const { page: built, text } = buildCrawlPage(entry, ok(html), fetchUrl, hosts);
    expect(built).toMatchObject({
      url: entry.url,
      path: entry.path,
      family: "blog-post",
      status: 200,
      finalUrl: null,
      title: "Cap Rate & NOI",
      metaDescription: "How cap rate works",
      h1: ["Cap rate"],
      canonicalIsSelf: true,
      robots: "index, follow",
      noindex: false,
      jsonLdTypes: ["Article"],
      datePublished: "2026-01-02",
      dateModified: "2026-09-01",
      visibleUpdatedDate: "Sep 1, 2026",
      outboundInternal: 1,
      outboundExternal: 3,
      externalHosts: ["www.huduser.gov", "www.irs.gov"],
      textFile: textFileFor("/blog/cap-rate"),
      fetchError: null,
    });
    expect(built.mainHash).toMatch(/^[0-9a-f]{64}$/);
    expect(text).toContain("See NOI");
    expect(text).not.toContain("Pricing");
    expect(built.wordCount).toBeGreaterThan(5);
  });

  it("reads noindex from the X-Robots-Tag header", () => {
    const { page: built } = buildCrawlPage(entry, ok(page({ canonical: fetchUrl }), { "x-robots-tag": "noindex" }), fetchUrl, hosts);
    expect(built.noindex).toBe(true);
    expect(built.xRobotsTag).toBe("noindex");
  });

  it("records a redirect as-is, with its Location and no content fields", () => {
    const { page: built, text } = buildCrawlPage(
      entry,
      { status: 308, location: `${BASE}/blog/new`, xRobotsTag: null, body: "", error: null },
      fetchUrl,
      hosts,
    );
    expect(built).toMatchObject({ status: 308, finalUrl: `${BASE}/blog/new`, title: null, canonicalIsSelf: null, wordCount: 0, mainHash: "", thin: false, uniqueRatio: null });
    expect(text).toBe("");
  });

  it("keeps the reason a page gave no answer", () => {
    const { page: built } = buildCrawlPage(entry, { status: 0, location: null, xRobotsTag: null, body: "", error: "no answer within 20s" }, fetchUrl, hosts);
    expect(built.status).toBe(0);
    expect(built.fetchError).toBe("no answer within 20s");
    expect(built.finalUrl).toBeNull();
  });

  it("names text files by sha1 of the path, relative to the data dir", () => {
    expect(textFileFor("/")).toBe("pages/42099b4af021e53fd8fd4e056c2568d7c2e3ffa8.txt");
    expect(textFileFor("/blog/a")).toMatch(/^pages\/[0-9a-f]{40}\.txt$/);
  });
});

describe("fetchPage", () => {
  it("never follows redirects and sends the configured user agent", async () => {
    const seen: RequestInit[] = [];
    const fetchImpl: FetchFn = async (_url, init) => {
      seen.push(init);
      return new Response("", { status: 308, headers: { location: "/blog/new" } });
    };
    const answer = await fetchPage(`${BASE}/blog/old`, "UA/1", fetchImpl, { retryDelayMs: 0 });
    expect(answer).toMatchObject({ status: 308, location: `${BASE}/blog/new`, body: "", error: null });
    expect(seen[0].redirect).toBe("manual");
    expect((seen[0].headers as Record<string, string>)["user-agent"]).toBe("UA/1");
    expect(seen[0].signal).toBeInstanceOf(AbortSignal);
  });

  it("retries once on a 5xx, 429 or network error, and not on a 404", async () => {
    const calls: string[] = [];
    const fetchImpl = stubFetch(
      {
        [`${BASE}/flaky`]: [{ status: 503 }, { status: 200, body: "ok" }],
        [`${BASE}/limited`]: [{ status: 429 }, { status: 429 }, { status: 200 }],
        [`${BASE}/dead`]: "error",
        [`${BASE}/missing`]: { status: 404 },
      },
      calls,
    );
    expect((await fetchPage(`${BASE}/flaky`, "UA", fetchImpl, { retryDelayMs: 0 })).status).toBe(200);
    expect((await fetchPage(`${BASE}/limited`, "UA", fetchImpl, { retryDelayMs: 0 })).status).toBe(429);
    const dead = await fetchPage(`${BASE}/dead`, "UA", fetchImpl, { retryDelayMs: 0 });
    expect(dead).toMatchObject({ status: 0, error: "fetch failed" });
    expect((await fetchPage(`${BASE}/missing`, "UA", fetchImpl, { retryDelayMs: 0 })).status).toBe(404);
    expect(calls.filter((c) => c.endsWith("/flaky"))).toHaveLength(2);
    expect(calls.filter((c) => c.endsWith("/limited"))).toHaveLength(2);
    expect(calls.filter((c) => c.endsWith("/dead"))).toHaveLength(2);
    expect(calls.filter((c) => c.endsWith("/missing"))).toHaveLength(1);
  });

  it("reports a timeout in words", async () => {
    const fetchImpl: FetchFn = async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    };
    expect((await fetchPage(`${BASE}/slow`, "UA", fetchImpl, { retryDelayMs: 0 })).error).toBe("no answer within 20s");
  });
});

describe("looksDown", () => {
  it("needs volume and a majority of failures", () => {
    expect(looksDown([0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(false);
    expect(looksDown([0, 0, 0, 0, 0, 0, 503, 200, 200, 200])).toBe(true);
    expect(looksDown([0, 0, 0, 0, 0, 200, 200, 200, 200, 200])).toBe(false);
    expect(looksDown([404, 404, 404, 404, 404, 404, 404, 404, 404, 404])).toBe(false);
  });
});

// ------------------------------------------------------------ integration

const SITEMAP_PATHS = ["/", "/blog/a", "/blog/b", "/blog/c", "/blog/moved", "/blog/flaky", "/markets/deep", "/glossary/orphan"];

function siteRoutes(): RouteTable {
  const long = (seed: string): string => `<p>${words(seed, 700)}</p>`;
  return {
    [`${BASE}/`]: { status: 200, body: page({ title: "Home", canonical: `${BASE}/`, body: long("home") }) },
    [`${BASE}/blog/a`]: { status: 200, body: page({ title: "Same Title", description: "Desc A", canonical: `${BASE}/blog/a`, body: long("a") }) },
    [`${BASE}/blog/b`]: { status: 200, body: page({ title: " same title ", description: null, canonical: `${BASE}/blog/a`, body: "<p>short</p>" }) },
    [`${BASE}/blog/c`]: { status: 200, body: page({ title: "C", canonical: `${BASE}/blog/c`, robots: "noindex", body: long("c") }) },
    [`${BASE}/blog/moved`]: { status: 308, headers: { location: "/blog/a" } },
    [`${BASE}/blog/flaky`]: [{ status: 503 }, { status: 200, body: page({ title: "Flaky", canonical: `${BASE}/blog/flaky`, body: long("f") }) }],
    [`${BASE}/markets/deep`]: { status: 200, body: page({ title: "Deep", canonical: `${BASE}/markets/deep`, body: long("m") }) },
    [`${BASE}/glossary/orphan`]: { status: 200, body: page({ title: "Orphan", canonical: `${BASE}/glossary/orphan`, body: long("g") }) },
    [`${BASE}/robots.txt`]: { status: 200, body: "User-agent: *\nAllow: /\nDisallow: /auth/\n" },
    [`${BASE}/pricing`]: { status: 200 },
    [`${BASE}/old`]: { status: 404 },
    [`${BASE}/legacy`]: (method) => (method === "HEAD" ? { status: 405 } : { status: 200, body: "legacy" }),
  };
}

const HEALTH_REPORT = {
  generatedAt: "2026-09-27T00:00:00.000Z",
  base: BASE,
  linkGraph: {
    ran: true,
    reason: null,
    sitemapUrls: SITEMAP_PATHS.length,
    reachable: SITEMAP_PATHS.length - 1,
    orphans: ["/glossary/orphan"],
    edges: [
      { source: "/", target: "/blog/a", anchor: "A", placement: "contextual" },
      { source: "/", target: "/blog/b", anchor: "B", placement: "navigation" },
      { source: "/blog/a", target: "/blog/b", anchor: "B", placement: "contextual" },
      { source: "/", target: "/blog/moved", anchor: "Moved", placement: "contextual" },
      { source: "/blog/a", target: "/old", anchor: "Old", placement: "contextual" },
      { source: "/", target: "/pricing", anchor: "Pricing", placement: "navigation" },
      { source: "/", target: "/legacy", anchor: "Legacy", placement: "footer" },
      { source: "/", target: "/auth/login", anchor: "Sign in", placement: "navigation" },
      { source: "/blog/b", target: "/markets/deep", anchor: "Deep", placement: "contextual" },
    ],
    depth: { "/": 0, "/blog/a": 1, "/blog/b": 1, "/blog/c": 2, "/blog/moved": 1, "/blog/flaky": 2, "/markets/deep": 5, "/glossary/orphan": null },
  },
  findings: [{ severity: "high", check: "orphaned sitemap URLs", detail: "1 of 8 sitemap URLs have ZERO inbound internal links" }],
};

function deps(overrides: Partial<CrawlDeps> = {}, calls: string[] = [], healthCalls: Array<[string, number | null]> = []): CrawlDeps {
  const sitemap: SitemapUrl[] = [...SITEMAP_PATHS, "/blog/a/"].map((p) => ({ url: `${BASE}${p}`, path: p === "/blog/a/" ? "/blog/a" : p, lastmod: null }));
  return {
    fetchImpl: stubFetch(siteRoutes(), calls),
    fetchSitemap: async () => sitemap,
    runHealthcheck: (base, limit): HealthcheckRun => {
      healthCalls.push([base, limit]);
      return { json: HEALTH_REPORT, exitCode: 1, error: null };
    },
    retryDelayMs: 0,
    now: () => new Date("2026-09-27T12:00:00.000Z"),
    ...overrides,
  };
}

describe("runCrawl", () => {
  it("combines the healthcheck graph with its own fetches into the Crawl contract", async () => {
    const calls: string[] = [];
    const healthCalls: Array<[string, number | null]> = [];
    const { crawl, texts } = await runCrawl({ base: BASE, limit: null, skipHealthcheck: false }, deps({}, calls, healthCalls));

    expect(healthCalls).toEqual([[BASE, null]]);
    expect(crawl.generatedAt).toBe("2026-09-27T12:00:00.000Z");
    expect(crawl.base).toBe(BASE);
    expect(crawl.sitemapCount).toBe(SITEMAP_PATHS.length);
    expect(crawl.limit).toBeNull();
    expect(crawl.pages.map((p) => p.path)).toEqual([...SITEMAP_PATHS].sort());

    const byPath = new Map(crawl.pages.map((p) => [p.path, p]));
    expect(byPath.get("/blog/flaky")?.status).toBe(200);
    expect(byPath.get("/blog/moved")).toMatchObject({ status: 308, finalUrl: `${BASE}/blog/a` });
    expect(byPath.get("/blog/b")).toMatchObject({ inboundTotal: 2, inboundContextual: 1, depth: 1, canonicalIsSelf: false, thin: true });
    expect(byPath.get("/markets/deep")?.depth).toBe(5);
    // Only 4 blog posts answered 200 (fewer than 5): judged on word count alone.
    expect(byPath.get("/blog/a")).toMatchObject({ thin: false, uniqueRatio: null });
    expect(byPath.get("/markets/deep")?.uniqueRatio).toBeNull();

    expect(crawl.linkGraph.ran).toBe(true);
    expect(crawl.linkGraph.orphans).toEqual(["/glossary/orphan"]);
    expect(crawl.linkGraph.edges[0]).toEqual({ from: "/", target: "/auth/login", anchor: "Sign in", placement: "navigation" });

    expect(crawl.issues.duplicateTitles).toEqual([{ title: "Same Title", paths: ["/blog/a", "/blog/b"] }]);
    expect(crawl.issues.missingDescriptions).toEqual(["/blog/b"]);
    expect(crawl.issues.nonSelfCanonical).toEqual(["/blog/b"]);
    expect(crawl.issues.noindexInSitemap).toEqual(["/blog/c"]);
    expect(crawl.issues.non200).toEqual([{ path: "/blog/moved", status: 308 }]);
    expect(crawl.issues.orphans).toEqual(["/glossary/orphan"]);
    expect(crawl.issues.deeperThan3).toEqual([
      { path: "/glossary/orphan", depth: null },
      { path: "/markets/deep", depth: 5 },
    ]);
    expect(crawl.issues.brokenInternalLinks).toEqual([
      { from: "/", target: "/blog/moved", status: 308 },
      { from: "/blog/a", target: "/old", status: 404 },
    ]);
    expect(crawl.healthcheckFindings).toEqual(HEALTH_REPORT.findings);
    expect(crawl.linkCheck).toEqual({ targets: 8, fromCrawl: 4, checked: 3, skippedRobotsDisallowed: 1, skippedOverCap: 0, cap: 300 });

    // Link targets: HEAD first, GET only where HEAD is not allowed; the robots-disallowed target is never fetched.
    expect(calls).toContain(`HEAD ${BASE}/pricing`);
    expect(calls).not.toContain(`GET ${BASE}/pricing`);
    expect(calls).toContain(`HEAD ${BASE}/legacy`);
    expect(calls).toContain(`GET ${BASE}/legacy`);
    expect(calls.some((c) => c.includes("/auth/login"))).toBe(false);
    // The duplicated sitemap entry is fetched once.
    expect(calls.filter((c) => c === `GET ${BASE}/blog/a`)).toHaveLength(1);

    expect(texts.get("/blog/a")).toContain("a0 a1");
    expect(texts.get("/blog/moved")).toBe("");
  });

  it("marks a --limit run as having no link graph and passes the limit to the healthcheck", async () => {
    const healthCalls: Array<[string, number | null]> = [];
    const { crawl } = await runCrawl({ base: BASE, limit: 2, skipHealthcheck: false }, deps({}, [], healthCalls));
    expect(healthCalls).toEqual([[BASE, 2]]);
    expect(crawl.pages).toHaveLength(2);
    expect(crawl.sitemapCount).toBe(SITEMAP_PATHS.length);
    expect(crawl.limit).toBe(2);
    expect(crawl.linkGraph.ran).toBe(false);
    expect(crawl.linkGraph.reason).toMatch(/--limit 2/);
    expect(crawl.linkGraph.orphans).toEqual([]);
    expect(crawl.issues.orphans).toEqual([]);
    expect(crawl.issues.deeperThan3).toEqual([]);
    expect(crawl.pages.every((p) => p.depth === null)).toBe(true);
  });

  it("skips the healthcheck on request and still crawls every page", async () => {
    const healthCalls: Array<[string, number | null]> = [];
    const calls: string[] = [];
    const { crawl } = await runCrawl({ base: BASE, limit: null, skipHealthcheck: true }, deps({}, calls, healthCalls));
    expect(healthCalls).toEqual([]);
    expect(crawl.linkGraph).toEqual({ ran: false, reason: "--skip-healthcheck was passed", edges: [], orphans: [] });
    expect(crawl.healthcheckFindings).toEqual([]);
    expect(crawl.pages).toHaveLength(SITEMAP_PATHS.length);
    expect(crawl.issues.brokenInternalLinks).toEqual([]);
    expect(calls.some((c) => c.endsWith("/robots.txt"))).toBe(false);
  });

  it("degrades to no link graph, with a finding, when the healthcheck produced no report", async () => {
    const { crawl } = await runCrawl(
      { base: BASE, limit: null, skipHealthcheck: false },
      deps({ runHealthcheck: () => ({ json: null, exitCode: 2, error: "healthcheck exited 2 without writing its --json report" }) }),
    );
    expect(crawl.linkGraph.ran).toBe(false);
    expect(crawl.linkGraph.reason).toMatch(/exited 2/);
    expect(crawl.healthcheckFindings).toEqual([{ severity: "high", check: "healthcheck", detail: "healthcheck exited 2 without writing its --json report" }]);
    expect(crawl.pages).toHaveLength(SITEMAP_PATHS.length);
  });

  it("refuses to write a crawl when the site is down", async () => {
    const down: SitemapUrl[] = Array.from({ length: 12 }, (_, i) => ({ url: `${BASE}/blog/p${i}`, path: `/blog/p${i}`, lastmod: null }));
    await expect(
      runCrawl(
        { base: BASE, limit: null, skipHealthcheck: true },
        deps({ fetchSitemap: async () => down, fetchImpl: async () => new Response("", { status: 502 }) }),
      ),
    ).rejects.toThrow(/site looks down/);
  });

  it("computes the thin flag within a template family", async () => {
    const chrome = words("chrome", 700);
    const family: SitemapUrl[] = ["a", "b", "c", "d", "e"].map((c) => ({ url: `${BASE}/states/${c}`, path: `/states/${c}`, lastmod: null }));
    const routes: RouteTable = {};
    for (const [i, entry] of family.entries()) {
      // Page a is all chrome; the rest add 700 unique words each.
      const body = i === 0 ? `<p>${chrome}</p>` : `<p>${chrome} ${words(`s${i}x`, 700)}</p>`;
      routes[entry.url] = { status: 200, body: page({ title: entry.path, canonical: entry.url, body }) };
    }
    const { crawl } = await runCrawl(
      { base: BASE, limit: null, skipHealthcheck: true },
      deps({ fetchSitemap: async () => family, fetchImpl: stubFetch(routes) }),
    );
    const byPath = new Map(crawl.pages.map((p) => [p.path, p]));
    expect(byPath.get("/states/a")).toMatchObject({ uniqueRatio: 0, thin: true });
    expect(byPath.get("/states/b")?.thin).toBe(false);
    expect(byPath.get("/states/b")?.uniqueRatio).toBeGreaterThan(0.4);
  });

  // Regression: a --limit run computed uniqueRatio over the sampled part of a
  // family. The "common" cutoff is share × family size, so a paragraph two
  // pages share is unique among 10 pages (2 ≤ 3) but chrome among 5 (2 > 1.5),
  // and the sample marked a healthy long page thin, which score.ts routes to
  // THIN work and prune.
  it("gives a --limit sample no uniqueRatio and judges its thin flag on word count alone", async () => {
    const shared = words("shared", 600);
    const family: SitemapUrl[] = Array.from({ length: 10 }, (_, i) => ({ url: `${BASE}/states/s${i}`, path: `/states/s${i}`, lastmod: null }));
    const routes: RouteTable = {};
    for (const [i, entry] of family.entries()) {
      // s0 and s1 share a 600-word paragraph; s4 is short; the rest are long and unique.
      const text = i < 2 ? `${shared} ${words(`own${i}x`, 100)}` : i === 4 ? words("short", 50) : words(`own${i}x`, 700);
      routes[entry.url] = { status: 200, body: page({ title: entry.path, canonical: entry.url, h1: "State guide", body: `<p>${text}</p>` }) };
    }
    const run = (limit: number | null) =>
      runCrawl({ base: BASE, limit, skipHealthcheck: true }, deps({ fetchSitemap: async () => family, fetchImpl: stubFetch(routes) }));

    const full = new Map((await run(null)).crawl.pages.map((p) => [p.path, p]));
    expect(full.get("/states/s0")).toMatchObject({ uniqueRatio: 1, thin: false });
    expect(full.get("/states/s4")).toMatchObject({ uniqueRatio: 1, thin: true });

    const sample = (await run(5)).crawl;
    expect(sample.limit).toBe(5);
    expect(sample.pages).toHaveLength(5);
    for (const p of sample.pages) expect(p.uniqueRatio).toBeNull();
    const byPath = new Map(sample.pages.map((p) => [p.path, p]));
    expect(byPath.get("/states/s0")?.thin).toBe(false);
    expect(byPath.get("/states/s1")?.thin).toBe(false);
    expect(byPath.get("/states/s4")?.thin).toBe(true);
  });
});

describe("indexStatusMergeBlocker and crawlFileFor", () => {
  it("blocks the merge for a loopback base or a sample, and names a sample so latestDataFile('crawl') cannot match it", () => {
    expect(indexStatusMergeBlocker({ base: BASE, limit: null })).toBeNull();
    expect(indexStatusMergeBlocker({ base: BASE, limit: 20 })).toMatch(/^sampled run \(--limit 20\)/);
    expect(indexStatusMergeBlocker({ base: "http://127.0.0.1:3100", limit: null })).toMatch(/^loopback base/);
    expect(indexStatusMergeBlocker({ base: "http://localhost:3000", limit: 5 })).toMatch(/^loopback base/);
    expect(path.basename(crawlFileFor({ limit: null }, "2026-09-27"))).toBe("crawl-2026-09-27.json");
    expect(path.basename(crawlFileFor({ limit: 20 }, "2026-09-27"))).toBe("crawl-sample-2026-09-27.json");
  });
});

// ------------------------------------------------------- disk + child process

describe("writeCrawlArtifacts and mergeIntoIndexStatus", () => {
  let tmp: string;
  const saved = { data: process.env.SEO_DATA_DIR, state: process.env.SEO_STATE_DIR, today: process.env.SEO_TODAY };

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "seo-crawl-test-"));
    process.env.SEO_DATA_DIR = path.join(tmp, "data");
    process.env.SEO_STATE_DIR = tmp;
    process.env.SEO_TODAY = "2026-09-28";
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    for (const [key, value] of [
      ["SEO_DATA_DIR", saved.data],
      ["SEO_STATE_DIR", saved.state],
      ["SEO_TODAY", saved.today],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function indexStatus(urls: Record<string, Partial<IndexStatusUrl>>): IndexStatus {
    return {
      generatedAt: "2026-09-27T00:00:00.000Z",
      site: "sc-domain:usetruecap.com",
      sitemapReport: [],
      quota: { day: "2026-09-27", used: 3 },
      summary: { total: 0, indexed: 0, byClass: { indexed: 0, never_crawled: 0, crawled_not_indexed: 0, dropped_after_indexed: 0, excluded: 0, unknown: 0 }, byFamily: {} },
      urls: urls as Record<string, IndexStatusUrl>,
    };
  }

  it("merges crawl fields by path and never touches mainHashAtInspect", () => {
    const status = indexStatus({
      [`${BASE}/blog/a`]: { url: `${BASE}/blog/a`, path: "/blog/a", mainHashAtInspect: "inspect-hash", wordCount: null },
      "/blog/moved": { mainHashAtInspect: "old", wordCount: 999, thin: false },
      [`${BASE}/not-crawled`]: { url: `${BASE}/not-crawled`, path: "/not-crawled", wordCount: 42, mainHashAtInspect: "x" },
    });
    const before = JSON.stringify(status);
    const pages = [
      record({ path: "/blog/a", wordCount: 812, uniqueRatio: 0.71, thin: false, mainHash: "fresh" }),
      record({ path: "/blog/moved", status: 308, wordCount: 0, mainHash: "" }),
      record({ path: "/blog/new" }),
    ];
    const merged = mergeIntoIndexStatus(status, pages, "2026-09-28T00:00:00.000Z");
    expect(JSON.stringify(status)).toBe(before);
    expect(merged.merged).toBe(2);
    expect(merged.unmatched).toEqual(["/blog/new"]);
    const a = merged.status.urls[`${BASE}/blog/a`] as IndexStatusUrl & CrawlMergedFields;
    expect(a).toMatchObject({ mainHashAtInspect: "inspect-hash", mainHash: "fresh", wordCount: 812, uniqueRatio: 0.71, thin: false, crawledAt: "2026-09-28T00:00:00.000Z" });
    const moved = merged.status.urls["/blog/moved"] as IndexStatusUrl & CrawlMergedFields;
    expect(moved).toMatchObject({ mainHashAtInspect: "old", mainHash: null, wordCount: null, uniqueRatio: null, thin: null });
    expect(merged.status.urls[`${BASE}/not-crawled`]).toEqual(status.urls[`${BASE}/not-crawled`]);
    expect(merged.status.quota).toEqual(status.quota);
  });

  it("writes text files, the dated crawl, and the merge into the redirected data dir", async () => {
    const statusFile = path.join(tmp, "data", "index-status.json");
    mkdirSync(path.dirname(statusFile), { recursive: true });
    writeFileSync(statusFile, JSON.stringify(indexStatus({ [`${BASE}/blog/a`]: { url: `${BASE}/blog/a`, path: "/blog/a", mainHashAtInspect: "keep" } })));

    const result = await runCrawl({ base: BASE, limit: null, skipHealthcheck: false }, deps());
    const summary = writeCrawlArtifacts(result, { mergeIndexStatus: true });

    expect(summary.crawlFile).toBe(path.join(tmp, "data", "crawl-2026-09-28.json"));
    const written = JSON.parse(readFileSync(summary.crawlFile, "utf8")) as CrawlOutput;
    expect(written.pages).toHaveLength(SITEMAP_PATHS.length);
    for (const p of written.pages) expect(existsSync(path.join(tmp, "data", p.textFile))).toBe(true);
    const aText = readFileSync(path.join(tmp, "data", textFileFor("/blog/a")), "utf8");
    expect(aText).toContain("a0 a1 a2");
    expect(readFileSync(path.join(tmp, "data", textFileFor("/blog/moved")), "utf8")).toBe("\n");

    const merged = JSON.parse(readFileSync(statusFile, "utf8")) as IndexStatus;
    const a = merged.urls[`${BASE}/blog/a`] as IndexStatusUrl & CrawlMergedFields;
    expect(a.mainHashAtInspect).toBe("keep");
    expect(a.mainHash).toBe(written.pages.find((p) => p.path === "/blog/a")?.mainHash);
    expect(summary.indexStatus).toMatch(/^merged 1 entries/);
  });

  it("reports an absent index-status, and lets the caller turn the merge off", async () => {
    const statusFile = path.join(tmp, "data", "index-status.json");
    const result = await runCrawl({ base: BASE, limit: null, skipHealthcheck: true }, deps());
    expect(writeCrawlArtifacts(result).indexStatus).toMatch(/^absent/);

    writeFileSync(statusFile, JSON.stringify(indexStatus({ "/": { path: "/", mainHashAtInspect: "keep" } })));
    const before = readFileSync(statusFile, "utf8");
    expect(writeCrawlArtifacts(result, { mergeIndexStatus: false }).indexStatus).toMatch(/^not merged \(the caller turned the merge off\)/);
    expect(readFileSync(statusFile, "utf8")).toBe(before);
  });

  it("never merges a loopback crawl, even when the caller asks it to", async () => {
    const statusFile = path.join(tmp, "data", "index-status.json");
    mkdirSync(path.dirname(statusFile), { recursive: true });
    writeFileSync(statusFile, JSON.stringify(indexStatus({ "/": { path: "/", mainHashAtInspect: "keep" } })));
    const before = readFileSync(statusFile, "utf8");
    const result = await runCrawl({ base: BASE, limit: null, skipHealthcheck: true }, deps());
    const local = { ...result, crawl: { ...result.crawl, base: "http://localhost:3000" } };
    expect(writeCrawlArtifacts(local, { mergeIndexStatus: true }).indexStatus).toMatch(/^not merged \(loopback base/);
    expect(readFileSync(statusFile, "utf8")).toBe(before);
  });

  // Regression: `--limit 20` against production used to merge sampled values
  // into index-status.json and overwrite crawl-<date>.json, the file score,
  // brakes, similarity and gsc-inspect read as the site's state. main passed
  // `mergeIndexStatus: true` for any non-loopback base, so the test does too.
  it("keeps a production --limit sample out of run state, the crawl file and the text corpus", async () => {
    const statusFile = path.join(tmp, "data", "index-status.json");
    mkdirSync(path.dirname(statusFile), { recursive: true });
    writeFileSync(statusFile, JSON.stringify(indexStatus({ [`${BASE}/`]: { url: `${BASE}/`, path: "/", mainHashAtInspect: "keep", wordCount: 1234, uniqueRatio: 0.9, thin: false } })));

    const full = writeCrawlArtifacts(await runCrawl({ base: BASE, limit: null, skipHealthcheck: true }, deps()), { mergeIndexStatus: true });
    expect(full.indexStatus).toMatch(/^merged 1 entries/);
    expect(full.crawlFile).toBe(path.join(tmp, "data", "crawl-2026-09-28.json"));
    const fullCrawlBytes = readFileSync(full.crawlFile, "utf8");
    const statusBytes = readFileSync(statusFile, "utf8");
    // Mark the full crawl's text for "/" so an overwrite by the sample shows.
    const homeText = path.join(tmp, "data", textFileFor("/"));
    writeFileSync(homeText, "full-crawl text\n");

    const sample = await runCrawl({ base: BASE, limit: 2, skipHealthcheck: true }, deps());
    const summary = writeCrawlArtifacts(sample, { mergeIndexStatus: true });

    expect(summary.indexStatus).toMatch(/^not merged \(sampled run \(--limit 2\)/);
    expect(readFileSync(statusFile, "utf8")).toBe(statusBytes);

    expect(summary.crawlFile).toBe(path.join(tmp, "data", "crawl-sample-2026-09-28.json"));
    expect(readFileSync(full.crawlFile, "utf8")).toBe(fullCrawlBytes);
    expect(latestDataFile("crawl")).toBe(full.crawlFile);

    expect(sample.crawl.pages.map((p) => p.path)).toEqual(["/", "/blog/a"]);
    for (const p of sample.crawl.pages) {
      expect(p.textFile).toBe(textFileFor(p.path, "pages-sample"));
      expect(existsSync(path.join(tmp, "data", p.textFile))).toBe(true);
    }
    expect(readFileSync(homeText, "utf8")).toBe("full-crawl text\n");
  });
});

describe("runHealthcheckProcess", () => {
  let tmp: string;
  const plantedSecret = "SEO_CRAWL_TEST_SECRET";

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "seo-crawl-hc-"));
    process.env[plantedSecret] = "do-not-pass-to-the-child";
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    delete process.env[plantedSecret];
  });

  const script = (name: string, body: string): string => {
    const file = path.join(tmp, name);
    writeFileSync(file, body);
    return file;
  };

  it("reads the --json report even though the healthcheck exits 1 for findings", () => {
    const file = script(
      "findings.mjs",
      [
        'import { writeFileSync } from "node:fs";',
        "const args = process.argv.slice(2);",
        'const out = args[args.indexOf("--json") + 1];',
        "writeFileSync(out, JSON.stringify({ args, envKeys: Object.keys(process.env), linkGraph: { ran: true, edges: [], orphans: [], depth: {} }, findings: [] }));",
        "process.exit(1);",
      ].join("\n"),
    );
    const run = runHealthcheckProcess("https://usetruecap.com", 25, file);
    expect(run.exitCode).toBe(1);
    expect(run.error).toBeNull();
    const json = run.json as { args: string[]; envKeys: string[] };
    expect(json.args.slice(0, 1)).toEqual(["--json"]);
    expect(json.args.slice(2)).toEqual(["--base", "https://usetruecap.com", "--limit", "25"]);
    expect(json.envKeys).not.toContain(plantedSecret);
    // The temp report is cleaned up.
    expect(existsSync(json.args[1])).toBe(false);
  });

  it("reports a crash that wrote no report", () => {
    const run = runHealthcheckProcess("https://usetruecap.com", null, script("crash.mjs", "process.exit(3);"));
    expect(run.json).toBeNull();
    expect(run.exitCode).toBe(3);
    expect(run.error).toMatch(/exited 3 without writing its --json report/);
  });

  it("reports an unreadable report", () => {
    const file = script(
      "garbled.mjs",
      ['import { writeFileSync } from "node:fs";', "const args = process.argv.slice(2);", 'writeFileSync(args[args.indexOf("--json") + 1], "{nope");'].join("\n"),
    );
    const run = runHealthcheckProcess("https://usetruecap.com", null, file);
    expect(run.json).toBeNull();
    expect(run.error).toMatch(/unreadable/);
  });

  it("scrubs anything credential-shaped from the child environment", () => {
    const env = scrubbedEnv({ PATH: "/bin", GSC_SERVICE_ACCOUNT_JSON: "{}", ANTHROPIC_API_KEY: "k", GITHUB_TOKEN: "t", NODE_ENV: "test", SEO_DATA_DIR: "/tmp/x" });
    expect(Object.keys(env).sort()).toEqual(["NODE_ENV", "PATH", "SEO_DATA_DIR"]);
  });
});

describe("market-data signal (F8)", () => {
  it("reads data-market-data off <main> only", async () => {
    const { marketDataOf } = await import("../../seo/scripts/crawl.ts");
    expect(marketDataOf('<html><body><main id="main" data-market-data="thin" class="x"><p>x</p></main>')).toBe("thin");
    expect(marketDataOf('<main data-market-data="enriched">')).toBe("enriched");
    expect(marketDataOf('<div data-market-data="thin"></div><main id="main">')).toBeNull();
    expect(marketDataOf("<main>")).toBeNull();
  });
});
