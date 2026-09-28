import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { BLOG_TOPICS } from "@/lib/blog-topics";
import { UNRELEASED_UNDERWRITING_CALCULATORS, isCalculatorReleased } from "@/lib/calculator-registry";
import { GLOSSARY } from "@/lib/glossary";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import { nearbyMarkets, stateGuideSlugFor } from "@/lib/markets/nearby";
import { NOINDEX_PATHS } from "@/lib/seo/noindex";
import { blogTopicForPost } from "@/lib/seo/link-policy";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

/**
 * F9 — the internal link graph, rendered.
 *
 * Every sitemap page is rendered the way `next build` renders it (the page
 * module's default export, awaited, then renderToStaticMarkup) and every
 * <a href> on it is read. Two rules hold for the whole graph:
 *
 *   1. No orphans: every sitemap URL is linked from at least one OTHER
 *      sitemap page.
 *   2. Every internal link lands on a sitemap URL, a robots.txt-disallowed
 *      app route (sign-in and the like) or a file. So no page links a
 *      redirect (next.config.mjs redirects(), or a route whose page
 *      redirects), a path on content/seo/noindex.json, an unreleased
 *      calculator, a noindexed market/state/strategy page or a 404. The
 *      failure names which of those a bad target is.
 *
 * The registry-driven blocks stay inside rule 2 through lib/seo/link-policy.ts;
 * a hand-written href in a page body is caught here. Then the F9 blocks
 * themselves: every post links its hub once, city pages link their indexable
 * state guide and at most five nearby markets, glossary pages link their
 * calculator only while it is released, and /blog/topics counts its hubs.
 *
 * Four pages need the mounted app router, request state or live services
 * while rendering and cannot render in a unit test (NOT_UNIT_RENDERABLE). Their own literal hrefs are
 * checked against rule 2 from source, their outbound links do not count
 * toward rule 1 (which only makes it stricter), and the loopback crawl of
 * the built site covers them (seo/scripts/crawl.ts --base).
 */

const ROOT = process.cwd();
const APP = join(ROOT, "app");

const NOT_UNIT_RENDERABLE: Record<string, string> = {
  "/": "client components (BillingSuccessBanner) call useRouter/useSearchParams, which need the mounted app router",
  "/analyze": "the analyzer's client components need the mounted app router and the root layout's ActionConfirmProvider",
  "/pricing": "reads the Supabase session cookie and Stripe display prices",
  "/reviews": "reads live usage counts through unstable_cache",
};

type Rendered = { html: string; links: string[]; mainLinks: string[] };

const isDir = (path: string) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

/** The app/ page file a URL path renders, with its dynamic params (App Router rules: literal segments win). */
function routeFor(path: string): { file: string; params: Record<string, string> } | null {
  const walk = (dir: string, segs: string[], params: Record<string, string>, rel: string[]): { file: string; params: Record<string, string> } | null => {
    if (segs.length === 0) return existsSync(join(dir, "page.tsx")) ? { file: ["app", ...rel, "page.tsx"].join("/"), params } : null;
    const [head, ...rest] = segs;
    if (isDir(join(dir, head))) {
      const found = walk(join(dir, head), rest, params, [...rel, head]);
      if (found) return found;
    }
    for (const entry of readdirSync(dir)) {
      const m = /^\[([^.\]]+)\]$/.exec(entry);
      if (!m || !isDir(join(dir, entry))) continue;
      const found = walk(join(dir, entry), rest, { ...params, [m[1]]: head }, [...rel, entry]);
      if (found) return found;
    }
    return null;
  };
  return walk(APP, path.split("/").filter(Boolean), {}, []);
}

type Outcome = { kind: "page"; html: string } | { kind: "redirect"; to: string } | { kind: "not-found" } | { kind: "error"; message: string } | { kind: "no-route" };

async function renderPath(path: string): Promise<Outcome> {
  const route = routeFor(path);
  if (!route) return { kind: "no-route" };
  try {
    const mod = await import(/* @vite-ignore */ `@/${route.file}`);
    const element = await mod.default({ params: Promise.resolve(route.params), searchParams: Promise.resolve({}) });
    return { kind: "page", html: renderToStaticMarkup(element) };
  } catch (error) {
    const digest = String((error as { digest?: unknown }).digest ?? "");
    if (digest.startsWith("NEXT_REDIRECT")) return { kind: "redirect", to: digest.split(";")[2] ?? "" };
    if (digest.includes(";404")) return { kind: "not-found" };
    return { kind: "error", message: (error as Error).message };
  }
}

const decode = (href: string) => href.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'");

/** Internal link targets (site paths, no query or hash) of every <a href> in `html`. */
function internalTargets(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)) {
    let href = decode(m[1]);
    if (href.startsWith(CANONICAL_SITE_URL)) href = href.slice(CANONICAL_SITE_URL.length) || "/";
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    out.add(href.split(/[?#]/)[0] || "/");
  }
  return [...out];
}

/** `<main>…</main>` of a page, or "" when it has none. */
function mainOf(html: string): string {
  const start = html.indexOf("<main");
  const end = html.lastIndexOf("</main>");
  return start === -1 || end === -1 ? "" : html.slice(start, end);
}

/** Literal internal hrefs in a source file (for the pages a unit test cannot render). */
function sourceTargets(file: string): string[] {
  const source = readFileSync(join(ROOT, file), "utf8");
  const out = new Set<string>();
  for (const m of source.matchAll(/href\s*[:=]\s*\{?\s*["'`](\/[^"'`}\s]*)/g)) {
    if (m[1].includes("${") || m[1].startsWith("//")) continue;
    out.add(m[1].split(/[?#]/)[0] || "/");
  }
  return [...out];
}

const FILE_EXTENSION = /\.[a-z0-9]{2,5}$/i;

describe("internal link graph (every sitemap page, rendered)", () => {
  const sitemapPaths = sitemap().map((entry) => new URL(entry.url).pathname);
  const inSitemap = new Set(sitemapPaths);
  const rendered = new Map<string, Rendered>();
  const renderProblems: string[] = [];
  const disallowed: string[] = [];
  const redirectSources = new Map<string, string>();
  const noindex = new Set<string>(NOINDEX_PATHS);
  /** Every /tools/<slug> page that is not a released calculator (unreleased, flag-gated or retired). */
  const unreleasedTools = new Set<string>(
    readdirSync(join(APP, "tools"))
      .filter((slug) => existsSync(join(APP, "tools", slug, "page.tsx")))
      .filter((slug) => slug !== "rental-property-spreadsheet" && !isCalculatorReleased(slug))
      .map((slug) => `/tools/${slug}`),
  );

  beforeAll(async () => {
    const rules = robots().rules;
    for (const rule of Array.isArray(rules) ? rules : [rules]) {
      const list = rule.disallow === undefined ? [] : Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
      disallowed.push(...list);
    }
    // next.config.mjs is hash-pinned build config; read its redirects() as data.
    const nextConfig = (await import(/* @vite-ignore */ join(ROOT, "next.config.mjs"))).default as {
      redirects?: () => Promise<Array<{ source: string; destination: string }>>;
    };
    for (const r of (await nextConfig.redirects?.()) ?? []) redirectSources.set(r.source, r.destination);

    for (const path of sitemapPaths) {
      const outcome = await renderPath(path);
      if (path in NOT_UNIT_RENDERABLE) {
        if (outcome.kind === "page") renderProblems.push(`${path} renders now: remove it from NOT_UNIT_RENDERABLE`);
        continue;
      }
      if (outcome.kind !== "page") {
        renderProblems.push(`${path}: ${outcome.kind}${"to" in outcome ? ` → ${outcome.to}` : ""}${"message" in outcome ? ` (${outcome.message.slice(0, 120)})` : ""}`);
        continue;
      }
      rendered.set(path, { html: outcome.html, links: internalTargets(outcome.html), mainLinks: internalTargets(mainOf(outcome.html)) });
    }
  }, 300_000);

  /** Why `target` may not be linked, or null when it may. */
  async function badTarget(target: string): Promise<string | null> {
    if (noindex.has(target)) return "on the noindex list (content/seo/noindex.json)";
    if (redirectSources.has(target)) return `a redirect (next.config.mjs → ${redirectSources.get(target)})`;
    if (unreleasedTools.has(target)) return "an unreleased calculator (lib/calculator-registry.ts)";
    if (inSitemap.has(target)) return null;
    if (disallowed.some((prefix) => target === prefix.replace(/\/$/, "") || target.startsWith(prefix))) return null;
    if (FILE_EXTENSION.test(target)) return null;
    if (/^\/markets\/[^/]+\/[^/]+$/.test(target)) return "a noindexed strategy page (STRATEGY_PAGES_INDEXABLE)";
    const outcome = await renderPath(target);
    if (outcome.kind === "redirect") return `a redirect (its page → ${outcome.to})`;
    if (outcome.kind === "not-found" || outcome.kind === "no-route") return "a 404";
    return "not in the sitemap (noindexed or unlisted)";
  }

  it("renders every sitemap page except the documented pages that need a request", () => {
    expect(sitemapPaths.length).toBeGreaterThan(380);
    expect(renderProblems).toEqual([]);
    expect(rendered.size).toBe(sitemapPaths.length - Object.keys(NOT_UNIT_RENDERABLE).length);
  });

  it("links every sitemap URL from at least one other sitemap page (no orphans)", () => {
    const inbound = new Map<string, number>();
    for (const [from, page] of rendered) {
      for (const target of page.links) if (target !== from) inbound.set(target, (inbound.get(target) ?? 0) + 1);
    }
    const orphans = sitemapPaths.filter((path) => !inbound.get(path));
    expect(orphans, "sitemap URLs no other sitemap page links to").toEqual([]);
  });

  it("never links a redirect, a noindex path, an unreleased tool or any other URL the sitemap leaves out", async () => {
    const violations: string[] = [];
    const verdicts = new Map<string, string | null>();
    const check = async (from: string, target: string) => {
      if (!verdicts.has(target)) verdicts.set(target, await badTarget(target));
      const why = verdicts.get(target);
      if (why) violations.push(`${from} → ${target}: ${why}`);
    };
    for (const [from, page] of rendered) for (const target of page.links) await check(from, target);
    for (const path of Object.keys(NOT_UNIT_RENDERABLE)) {
      const route = routeFor(path);
      expect(route, path).not.toBeNull();
      for (const target of sourceTargets(route!.file)) await check(`${path} (source)`, target);
    }
    expect(violations).toEqual([]);
  });

  it("keeps redirects, noindexed paths and unreleased tools out of the sitemap", () => {
    for (const path of sitemapPaths) {
      expect(redirectSources.has(path), `${path} is a redirect source`).toBe(false);
      expect(noindex.has(path), `${path} is on the noindex list`).toBe(false);
      expect(unreleasedTools.has(path), `${path} is an unreleased calculator`).toBe(false);
    }
    // The registry of unreleased calculators is what the tools check reads.
    for (const slug of UNRELEASED_UNDERWRITING_CALCULATORS) expect(unreleasedTools.has(`/tools/${slug}`), slug).toBe(true);
  });

  it("links every published post back to its hub once, and the hub lists it", () => {
    for (const post of BLOG_POSTS.filter((p) => p.available)) {
      const path = `/blog/${post.slug}`;
      const html = rendered.get(path)?.html;
      expect(html, path).toBeDefined();
      const topic = blogTopicForPost(post.slug);
      if (!topic) continue; // what-is-a-good-dscr is being merged into another post
      const hub = `/blog/topics/${topic.slug}`;
      const blocks = html!.split('data-blog-hub-link=""').length - 1;
      expect(blocks, `${path}: one "Part of" line`).toBe(1);
      const line = html!.slice(html!.indexOf('data-blog-hub-link=""'), html!.indexOf("</p>", html!.indexOf('data-blog-hub-link=""')));
      expect(internalTargets(line), `${path}: the "Part of" line links ${hub}`).toEqual([hub]);
      expect(rendered.get(hub)?.mainLinks, `${hub} lists ${path}`).toContain(path);
    }
  });

  it("files every published post except the one being merged away in exactly one hub", () => {
    // what-is-a-good-dscr is being merged into another post by a sibling PR;
    // once it leaves the registry this list is simply empty.
    const MERGING_AWAY = new Set(["what-is-a-good-dscr"]);
    const unfiled = BLOG_POSTS.filter((p) => p.available && !BLOG_TOPICS.some((t) => t.postSlugs.includes(p.slug))).map((p) => p.slug);
    expect(unfiled.filter((slug) => !MERGING_AWAY.has(slug))).toEqual([]);
    for (const post of BLOG_POSTS) {
      const hubs = BLOG_TOPICS.filter((t) => t.postSlugs.includes(post.slug)).map((t) => t.slug);
      expect(hubs.length, `${post.slug} in ${hubs.join(", ")}`).toBeLessThanOrEqual(1);
    }
  });

  it("links each city page to its indexable state guide and to at most five nearby markets, same state first", () => {
    const markets = [...BESPOKE_MARKETS, ...MARKET_CITIES];
    for (const market of markets) {
      const path = `/markets/${market.slug}`;
      const page = rendered.get(path);
      expect(page, path).toBeDefined();
      const stateSlug = stateGuideSlugFor(market.stateName);
      const stateLinks = page!.mainLinks.filter((target) => target.startsWith("/states/"));
      expect(stateLinks, path).toEqual(stateSlug ? [`/states/${stateSlug}`] : []);

      const at = page!.html.indexOf('data-market-nearby=""');
      const nearby = at === -1 ? [] : internalTargets(page!.html.slice(at, page!.html.indexOf("</section>", at)));
      expect(nearby, path).toEqual(nearbyMarkets(market.slug).map((m) => `/markets/${m.slug}`));
      expect(nearby.length, path).toBeLessThanOrEqual(5);
      expect(nearby, path).not.toContain(path);
      const states = nearby.map((target) => markets.find((m) => `/markets/${m.slug}` === target)?.stateName);
      const firstOther = states.findIndex((state) => state !== market.stateName);
      if (firstOther !== -1) expect(states.slice(firstOther).every((state) => state !== market.stateName), `${path}: same-state markets come first`).toBe(true);
    }
  });

  it("links a glossary term's calculator only while it is released", () => {
    for (const entry of Object.values(GLOSSARY)) {
      const path = `/glossary/${entry.slug}`;
      const html = rendered.get(path)?.html;
      expect(html, path).toBeDefined();
      const at = html!.indexOf('data-glossary-tool-link=""');
      const slug = entry.toolUrl?.replace(/^\/tools\//, "");
      if (slug && isCalculatorReleased(slug)) {
        expect(at, `${path} links ${entry.toolUrl}`).toBeGreaterThan(-1);
        expect(internalTargets(html!.slice(at, html!.indexOf("</p>", at)))).toEqual([entry.toolUrl]);
      } else {
        expect(at, `${path} renders no calculator line`).toBe(-1);
      }
    }
  });

  it("counts the hubs on /blog/topics from the registry", () => {
    const html = rendered.get("/blog/topics")?.html ?? "";
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
    expect(html).toContain(`grouped into the ${words[BLOG_TOPICS.length]} things investors`);
    for (const topic of BLOG_TOPICS) expect(rendered.get("/blog/topics")?.mainLinks).toContain(`/blog/topics/${topic.slug}`);
  });
});
