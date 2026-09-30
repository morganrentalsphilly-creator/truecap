/**
 * The /vs hub prefetches on intent, not on scroll.
 *
 * A default next/link prefetches its route's RSC payload as soon as it
 * scrolls into view. Measured at 390x844 before this rule came back on the
 * design pass's rebuilt markup, one scroll of /vs pulled 120 RSC payloads
 * (3.5 MB), one or more per directory row, before the visitor clicked
 * anything. Below the first screen, internal links go through
 * IntentPrefetchLink (components/marketing/intent-prefetch-link.tsx), which
 * prefetches on hover or keyboard focus only. The hero's links keep next's
 * default (the first screen, the likeliest clicks), and every /analyze link
 * keeps prefetch={false} so the analyzer bundle stays off marketing pages.
 *
 * Read from the source (the file later edits touch) and, for the hub, from
 * the rendered page.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The hub's Header is a client island that calls next/navigation hooks; the
// session read is mocked as in structured-data-f4.test.tsx.
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push() {}, replace() {}, prefetch() {}, back() {}, forward() {}, refresh() {} }),
  usePathname: () => "/vs",
  useSearchParams: () => new URLSearchParams(),
}));

/** Every IntentPrefetchLink the render reached, marked in the HTML so its <a> can be told apart. */
const intentLinks = vi.hoisted(() => [] as Array<{ href: string; prefetch?: false }>);
vi.mock("@/components/marketing/intent-prefetch-link", async (importActual) => ({
  ...(await importActual<typeof import("@/components/marketing/intent-prefetch-link")>()),
  IntentPrefetchLink: ({ href, prefetch, children }: { href: string; prefetch?: false; children?: ReactNode }) => {
    intentLinks.push({ href, prefetch });
    return createElement("a", { href, "data-intent-prefetch": "" }, children);
  },
}));

const ROOT = process.cwd();
const read = (file: string) => readFileSync(join(ROOT, file), "utf8");

const IMPORT = 'import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";';

/** The opening tag of every `<name …>` in `source` (attributes may span lines). */
const openingTags = (source: string, name: string) =>
  [...source.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map((m) => m[0].replace(/\s+/g, " "));

/** The source between `open` and the first `close` after it ("" when `open` is absent). */
function between(source: string, open: string, close: string): string {
  const start = source.indexOf(open);
  if (start === -1) return "";
  const end = source.indexOf(close, start + open.length);
  return end === -1 ? "" : source.slice(start, end + close.length);
}

const ANALYZE_HREF = /\bhref="\/analyze(?:[?#][^"]*)?"/;
const NO_PREFETCH = /\bprefetch=\{false\}/;

/**
 * A default-prefetch next/link outside the first screen: any `<Link>` that is
 * not an /analyze link with prefetch={false}.
 */
const scrollPrefetchingLinks = (source: string) =>
  openingTags(source, "Link").filter((tag) => !(ANALYZE_HREF.test(tag) && NO_PREFETCH.test(tag)));

/** An IntentPrefetchLink to /analyze without prefetch={false} would prefetch the analyzer on hover. */
const analyzerIntentLinks = (source: string) =>
  openingTags(source, "IntentPrefetchLink").filter((tag) => ANALYZE_HREF.test(tag) && !NO_PREFETCH.test(tag));

describe("the /vs hub (app/vs/page.tsx)", () => {
  const source = read("app/vs/page.tsx");
  // The hero: PageHero through its ActionRow (the page's first screen).
  const hero = between(source, "<PageHero", "</ActionRow>");
  const belowHero = source.replace(hero, "");

  it("imports IntentPrefetchLink and keeps the hero's links on next's default", () => {
    expect(source).toContain(IMPORT);
    expect(hero, "PageHero with an ActionRow").toContain("<ActionRow>");
    const heroLinks = openingTags(hero, "Link");
    expect(heroLinks.length).toBe(2);
    expect(heroLinks[0]).toMatch(ANALYZE_HREF);
    expect(heroLinks[0]).toMatch(NO_PREFETCH);
    expect(heroLinks[1]).toContain('href="/pricing"');
    expect(heroLinks[1]).not.toMatch(NO_PREFETCH);
  });

  it("writes every directory row as an IntentPrefetchLink", () => {
    const rows = between(source, "{group.items.map((c) => (", "))}");
    expect(rows, "the directory's row map").not.toBe("");
    expect(openingTags(rows, "Link")).toEqual([]);
    expect(openingTags(rows, "IntentPrefetchLink")).toEqual([
      '<IntentPrefetchLink href={`/vs/${c.slug}`} className="group flex flex-1 flex-col py-4">',
    ]);
  });

  it("uses no default-prefetch <Link> below the hero, and /analyze never prefetches", () => {
    expect(scrollPrefetchingLinks(belowHero)).toEqual([]);
    expect(analyzerIntentLinks(source)).toEqual([]);
    // The close's secondary action is the intent link; its /analyze primary keeps prefetch={false}.
    const close = between(belowHero, "<CloseSection", "</ActionRow>");
    expect(openingTags(close, "IntentPrefetchLink").map((tag) => tag.match(/href="([^"]*)"/)?.[1])).toEqual(["/pricing"]);
    expect(openingTags(close, "Link")).toHaveLength(1);
  });

  it("renders every directory row and the close's secondary through IntentPrefetchLink", async () => {
    intentLinks.length = 0;
    const { default: VsHubPage } = await import("@/app/vs/page");
    const html = renderToStaticMarkup(createElement(VsHubPage));
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));

    const comparisonHrefs = [...main.matchAll(/<a\b[^>]*\shref="(\/vs\/[^"]+)"[^>]*>/g)];
    expect(comparisonHrefs.length).toBeGreaterThanOrEqual(38);
    for (const [tag, href] of comparisonHrefs) expect(tag, href).toContain("data-intent-prefetch");

    const viaIntent = intentLinks.map((link) => link.href);
    expect(viaIntent.filter((href) => href.startsWith("/vs/")).sort()).toEqual(comparisonHrefs.map((m) => m[1]).sort());
    expect(viaIntent).toContain("/pricing");
    for (const link of intentLinks) {
      if (/^\/analyze(?:[?#]|$)/.test(link.href)) expect(link.prefetch, link.href).toBe(false);
      else expect(link.prefetch, link.href).toBeUndefined();
    }
  }, 30_000);
});
