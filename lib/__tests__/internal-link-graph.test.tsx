import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { BLOG_TOPICS } from "@/lib/blog-topics";
import { UNRELEASED_UNDERWRITING_CALCULATORS, isCalculatorReleased } from "@/lib/calculator-registry";
import { GLOSSARY } from "@/lib/glossary";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import { nearbyMarketGroups, nearbyMarkets, stateGuideSlugFor } from "@/lib/markets/nearby";
import { NOINDEX_PATHS } from "@/lib/seo/noindex";
import { blogTopicForPost, isLinkablePath } from "@/lib/seo/link-policy";
import { CANONICAL_SITE_URL } from "@/lib/site-url";
import { STATES } from "@/lib/states";

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
 * state guide and at most five other markets under labels the data supports,
 * glossary pages link their calculator only while it is released, and
 * /blog/topics counts its hubs.
 *
 * The per-family checks walk the SITEMAP's pages, not the registries, and a
 * separate check holds the sitemap and the link policy to the same pages. So
 * listing a post, market or term on content/seo/noindex.json (a prune) needs
 * no edit here: the path leaves the sitemap and every registry block, and
 * only a hand-written body link to it fails rule 2.
 *
 * Three pages need the mounted app router, request state or live services
 * while rendering and cannot render in a unit test (NOT_UNIT_RENDERABLE).
 * Their literal hrefs, and those of every component module they import
 * (followed through the import graph), are checked against rule 2 from
 * source; their outbound links do not count toward rule 1 (which only makes
 * it stricter), and the loopback crawl of the built site covers them
 * (seo/scripts/crawl.ts --base).
 *
 * /pricing was the fourth. It now reads the session and the Stripe prices
 * inside Suspense boundaries, so it renders here, but only as far as its
 * first bytes: the plan cards arrive later in the response. Its rendered
 * links are checked like any page's, and its source and imports are still
 * scanned for rule 2 (SOURCE_SCANNED), so the cards' links stay covered.
 */

// /for-investors opens with the homepage's address form (audit row P1-64), a
// client island that calls useRouter. Only useRouter is replaced, so the page
// renders and its links stay in the rendered graph; "/" and /analyze still
// need what NOT_UNIT_RENDERABLE says they need.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push() {}, replace() {}, prefetch() {}, back() {}, forward() {}, refresh() {} }),
}));
// Pages in the sitemap (/pricing among them) mount <Testimonials />, which reads published rows
// through the service-role client. With Supabase variables set (CI sets
// placeholders) that was a real request to the placeholder host, retried
// until it gave up. The component turns any failed read into no rows, and no
// row is published, so an empty list renders what the live page renders.
vi.mock("@/lib/testimonials/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/testimonials/store")>()),
  listPublishedTestimonials: async () => [],
}));

const ROOT = process.cwd();
const APP = join(ROOT, "app");

const NOT_UNIT_RENDERABLE: Record<string, string> = {
  "/": "client components (BillingSuccessBanner) call useRouter/useSearchParams, which need the mounted app router",
  "/analyze": "the analyzer's client components need the mounted app router and the root layout's ActionConfirmProvider",
  "/reviews": "reads live usage counts through unstable_cache",
};

/**
 * Targets the source scan finds behind the same env gate that lists them in
 * the sitemap: the scan sees the literal href, not the condition around it.
 * Each entry is the app/sitemap.ts gate that must still hold.
 */
const ENV_GATED_SITEMAP_PATHS: Record<string, RegExp> = {
  // components/marketing/pricing-value-stack.tsx links it inside `agentProConfigured ? …`.
  "/for-agents": /isAgentProConfigured\(\)\s*\?\s*\[sitemapEntry\(siteUrl,\s*"\/for-agents"\)\]/,
};

/** Pages whose source is scanned for rule 2: the unrenderable ones, and /pricing for the parts that stream. */
const SOURCE_SCANNED = [...Object.keys(NOT_UNIT_RENDERABLE), "/pricing"];

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

/** The component module an import specifier names, or null (only @/components/… and relative imports inside components/ are followed). */
function resolveComponentImport(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/components/")) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith(".") && fromFile.startsWith("components/")) base = join(ROOT, fromFile, "..", spec);
  else return null;
  for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    if (existsSync(base + ext)) return (base + ext).slice(ROOT.length + 1);
  }
  return null;
}

/**
 * Literal internal hrefs in a route file and in every component module it
 * imports, followed through the import graph (for the pages a unit test
 * cannot render: their links live in imported sections, not the route file).
 */
function sourceTargets(file: string): Array<{ target: string; file: string }> {
  const out = new Map<string, string>();
  const seen = new Set<string>([file]);
  const queue = [file];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const source = readFileSync(join(ROOT, current), "utf8");
    for (const m of source.matchAll(/href\s*[:=]\s*\{?\s*["'`](\/[^"'`}\s]*)/g)) {
      if (m[1].includes("${") || m[1].startsWith("//")) continue;
      const target = m[1].split(/[?#]/)[0] || "/";
      if (!out.has(target)) out.set(target, current);
    }
    for (const m of source.matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)) {
      const next = resolveComponentImport(current, m[1]);
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return [...out].map(([target, from]) => ({ target, file: from }));
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
    for (const path of SOURCE_SCANNED) {
      const route = routeFor(path);
      expect(route, path).not.toBeNull();
      const targets = sourceTargets(route!.file);
      // The route files hold almost no hrefs; the imported sections hold them.
      expect(targets.length, `${path}: hrefs found in its source and imports`).toBeGreaterThan(10);
      for (const { target, file } of targets) {
        const gate = ENV_GATED_SITEMAP_PATHS[target];
        if (gate) {
          expect(readFileSync(join(APP, "sitemap.ts"), "utf8"), `${target} is listed under its env gate`).toMatch(gate);
          continue;
        }
        await check(`${path} (source: ${file})`, target);
      }
    }
    expect(violations).toEqual([]);
  });

  it("puts a registry page in the sitemap exactly when the link policy lets blocks link it", () => {
    // What keeps the per-family checks below honest after a prune: they walk
    // the sitemap, and here every registry page is in it iff it is linkable.
    const registryPaths = [
      ...BLOG_POSTS.map((p) => `/blog/${p.slug}`),
      ...BLOG_TOPICS.map((t) => `/blog/topics/${t.slug}`),
      ...[...BESPOKE_MARKETS, ...MARKET_CITIES].map((m) => `/markets/${m.slug}`),
      ...Object.values(STATES).map((st) => `/states/${st.slug}`),
      ...Object.values(GLOSSARY).map((g) => `/glossary/${g.slug}`),
      ...readdirSync(join(APP, "tools"))
        .filter((slug) => existsSync(join(APP, "tools", slug, "page.tsx")))
        .map((slug) => `/tools/${slug}`),
    ];
    const disagree = [...new Set(registryPaths)].filter((path) => inSitemap.has(path) !== isLinkablePath(path));
    expect(disagree, "in the sitemap but not linkable, or linkable but not in the sitemap").toEqual([]);
  });

  it("never glues a link to the words around it", () => {
    // JSX drops a line break between text and a <Link>: "insurance.<a>House-hackers</a>"
    // reads "insurance.House-hackers". A link that follows sentence punctuation,
    // or runs straight into the next word, lost its {" "}.
    const glued: string[] = [];
    for (const [path, page] of rendered) {
      const main = mainOf(page.html);
      for (const m of main.matchAll(/[A-Za-z0-9)][.!?;:,]<a\b[^>]*>(?=[^\s<])/g)) glued.push(`${path}: …${main.slice(Math.max(0, m.index! - 30), m.index! + m[0].length + 20)}`);
      for (const m of main.matchAll(/<\/a>(?=[A-Za-z0-9])/g)) glued.push(`${path}: …${main.slice(Math.max(0, m.index! - 40), m.index! + 20)}`);
    }
    expect(glued).toEqual([]);
  });

  it("offers the comparison posts no calculator: none of them is about ARV", () => {
    const comparisons = BLOG_TOPICS.find((t) => t.slug === "comparisons");
    expect(comparisons?.postSlugs.length).toBeGreaterThan(5);
    for (const slug of comparisons!.postSlugs) {
      const html = rendered.get(`/blog/${slug}`)?.html;
      if (html === undefined) continue; // not in the sitemap (unpublished or pruned)
      const at = html.indexOf('data-related-content=""');
      expect(at, slug).toBeGreaterThan(-1);
      const box = internalTargets(html.slice(at, html.indexOf("</nav>", at)));
      expect(box, slug).not.toContain("/tools/arv-calculator");
    }
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
    for (const post of BLOG_POSTS.filter((p) => p.available && inSitemap.has(`/blog/${p.slug}`))) {
      const path = `/blog/${post.slug}`;
      const html = rendered.get(path)?.html;
      expect(html, path).toBeDefined();
      const topic = blogTopicForPost(post.slug);
      expect(topic, `${path} is filed in a hub`).not.toBeNull();
      const hub = `/blog/topics/${topic!.slug}`;
      const blocks = html!.split('data-blog-hub-link=""').length - 1;
      expect(blocks, `${path}: one "Part of" line`).toBe(1);
      const line = html!.slice(html!.indexOf('data-blog-hub-link=""'), html!.indexOf("</p>", html!.indexOf('data-blog-hub-link=""')));
      expect(internalTargets(line), `${path}: the "Part of" line links ${hub}`).toEqual([hub]);
      expect(rendered.get(hub)?.mainLinks, `${hub} lists ${path}`).toContain(path);
    }
  });

  it("files every published post in exactly one hub", () => {
    // what-is-a-good-dscr, the one post F9 left unfiled, was merged into
    // /blog/how-to-calculate-dscr by the DSCR consolidation: no exception is left.
    const unfiled = BLOG_POSTS.filter((p) => p.available && !BLOG_TOPICS.some((t) => t.postSlugs.includes(p.slug))).map((p) => p.slug);
    expect(unfiled).toEqual([]);
    for (const post of BLOG_POSTS) {
      const hubs = BLOG_TOPICS.filter((t) => t.postSlugs.includes(post.slug)).map((t) => t.slug);
      expect(hubs.length, `${post.slug} in ${hubs.join(", ")}`).toBeLessThanOrEqual(1);
    }
  });

  it("links each city page to its indexable state guide and to at most five other markets, same state first", () => {
    const markets = [...BESPOKE_MARKETS, ...MARKET_CITIES];
    for (const market of markets.filter((m) => inSitemap.has(`/markets/${m.slug}`))) {
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

  it("labels the other markets by what the data says, never as nearby", () => {
    // No coordinates exist, so most same-state picks are the state's next
    // markets alphabetically (Fort Worth lists Houston, not Dallas). The
    // labels say only that: the state, and a HUD FMR area across the line.
    let across = 0;
    for (const market of [...BESPOKE_MARKETS, ...MARKET_CITIES].filter((m) => inSitemap.has(`/markets/${m.slug}`))) {
      const path = `/markets/${market.slug}`;
      const html = rendered.get(path)!.html;
      const at = html.indexOf('data-market-nearby=""');
      const groups = nearbyMarketGroups(market.slug)!;
      if (at === -1) {
        expect(groups.sameState.length + groups.acrossStateLine.length, path).toBe(0);
        continue;
      }
      const section = html.slice(at + 'data-market-nearby=""'.length, html.indexOf("</section>", at));
      expect(section, path).not.toMatch(/nearby/i);
      const group = (name: string) => {
        const start = section.indexOf(`data-market-group="${name}"`);
        return start === -1 ? null : section.slice(start, section.indexOf("</div></div>", start));
      };
      const state = group("state");
      const line = group("across-state-line");
      if (groups.sameState.length > 0) {
        expect(state, path).toContain(`More ${market.stateName} markets`);
        expect(internalTargets(state!), path).toEqual(groups.sameState.map((m) => `/markets/${m.slug}`));
      } else expect(state, path).toBeNull();
      if (groups.acrossStateLine.length > 0) {
        across += 1;
        expect(line, path).toContain("Across the state line");
        expect(internalTargets(line!), path).toEqual(groups.acrossStateLine.map((m) => `/markets/${m.slug}`));
        for (const m of groups.acrossStateLine) expect(m.stateName, path).not.toBe(market.stateName);
      } else expect(line, path).toBeNull();
    }
    // At least one page lists a market across a state line (a state with few markets).
    expect(across).toBeGreaterThan(0);
  });

  it("links a glossary term's calculator only while it is released", () => {
    for (const entry of Object.values(GLOSSARY).filter((e) => inSitemap.has(`/glossary/${e.slug}`))) {
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
