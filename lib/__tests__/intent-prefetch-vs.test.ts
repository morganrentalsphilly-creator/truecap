/**
 * The /vs hub and the /vs comparison pages prefetch on intent, not on scroll.
 *
 * A default next/link prefetches its route's RSC payload as soon as it
 * scrolls into view. Measured at 390x844 before this rule came back on the
 * design pass's rebuilt markup, one scroll of /vs pulled 120 RSC payloads
 * (3.5 MB), one or more per directory row, before the visitor clicked
 * anything; each comparison page carries 5 to 10 more body links (TL;DR
 * roundups, guides, tools, glossary terms, "Other comparisons", the close's
 * secondary). Below the first screen, internal links go through
 * IntentPrefetchLink (components/marketing/intent-prefetch-link.tsx), which
 * prefetches on hover or keyboard focus only. The hero's links keep next's
 * default (the first screen, the likeliest clicks), and every /analyze link
 * keeps prefetch={false} so the analyzer bundle stays off marketing pages.
 *
 * The SEO loop edits app/vs/<slug>/page.tsx on autopilot, so the rule is read
 * from every rendered page's source, the file the loop writes: a link it adds
 * as a plain <Link> fails here. The hub is also rendered.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

/** A /vs slug whose page.tsx only redirects (it renders no page of its own). */
const isRedirectStub = (source: string) =>
  /\b(?:permanentRedirect|redirect)\(/.test(source) && !/<main\b/.test(source);

const PAGES = readdirSync(join(ROOT, "app", "vs"))
  .filter((slug) => existsSync(join(ROOT, "app", "vs", slug, "page.tsx")))
  .map((slug) => ({ slug, file: `app/vs/${slug}/page.tsx`, source: read(`app/vs/${slug}/page.tsx`) }))
  .filter((page) => !isRedirectStub(page.source));

describe("the /vs comparison pages", () => {
  it("finds every rendered comparison page", () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(38);
  });

  it("stay editable by the SEO loop: verify-static allows the IntentPrefetchLink import and its links", async () => {
    const { checkImports, wholeFileViolations } = await import("../../seo/scripts/verify-static.ts");
    // An edit to a page is refused when the page fails a whole-file rule, so
    // the import must pass them (it is on paths.importAllow as
    // @/components/marketing/*). Only violations this rule could cause are
    // read: a page's other imports are not this guard's business.
    expect(checkImports("app/vs/example/page.tsx", `${IMPORT}\n`)).toEqual([]);
    const failures = PAGES.flatMap(({ file, source }) =>
      wholeFileViolations(file, source)
        .filter((v) => /intent-prefetch-link|IntentPrefetchLink/.test(v.detail))
        .map((v) => `${file}: ${v.rule} ${v.detail}`),
    );
    expect(failures).toEqual([]);
  }, 60_000);

  it("seo-internal-links admits /vs sources exactly when verify-static derives tier 0 for an added IntentPrefetchLink", async () => {
    // Its step 0g reads verify-static's tag check with a Grep; this ties the
    // Grep to the tier the rule really derives, so a comment or self-test that
    // names IntentPrefetchLink cannot re-admit /vs sources while the rule still
    // makes them tier 1, and teaching the rule the element (a founder call, held
    // 2026-09-30) cannot leave the skill excluding them.
    const { deriveTier } = await import("../../seo/scripts/verify-static.ts");
    const skill = read(".claude/skills/seo-internal-links/SKILL.md");
    const gate = /- g\. Grep `seo\/scripts\/verify-static\.ts` \(content\) for `([^`]+)`/.exec(skill);
    expect(gate, "seo-internal-links step 0g").not.toBeNull();
    const pattern = new RegExp(gate![1]);
    const admitsVs = read("seo/scripts/verify-static.ts").split("\n").some((line) => pattern.test(line));

    const page = (link: string) =>
      `${IMPORT}\n\nexport default function Page() {\n  return <p>Screen by cap rate threshold, ${link} condition and DOM.</p>;\n}\n`;
    const pre = page("rehab");
    // The control: the rule does derive tier 0 for the blog shape, so a tier 1
    // below means the element, not a broken fixture.
    const blog = deriveTier("app/blog/example/page.tsx", pre, page('<Link href="/glossary/rehab" className="tc-link">rehab</Link>'), { calibrating: false });
    expect(blog).toEqual({ tier: 0, reason: "one internal link added" });
    const vs = deriveTier(
      "app/vs/example/page.tsx",
      pre,
      page('<IntentPrefetchLink href="/glossary/rehab" className="tc-link">rehab</IntentPrefetchLink>'),
      { calibrating: false },
    );
    expect(vs.tier === 0, `0g ${admitsVs ? "admits" : "excludes"} /vs sources; verify-static derives tier ${vs.tier} (${vs.reason})`).toBe(admitsVs);
  }, 60_000);

  it("renders no next/link from the /vs frame components, so their links cannot prefetch on scroll", () => {
    // VsHero, VsMatrixTable and ComparisonFaq render on every comparison page
    // but live outside the page files the checks below read. Neither module
    // imports next/link today; a link added to one goes through
    // IntentPrefetchLink. (AuthorBio, BlogByline and RelatedContent, which
    // the blog shares, belong to the content-pages prefetch unit and its
    // intent-prefetch-shared.test.ts.)
    for (const file of ["components/marketing/vs-page.tsx", "components/marketing/comparison-faq.tsx"]) {
      expect(read(file), file).not.toMatch(/from ["']next\/link["']/);
    }
    const rendered = PAGES.filter(({ source }) => source.includes("<VsMatrixTable") && source.includes("<ComparisonFaq"));
    expect(rendered.length, "pages that render both frame components").toBe(PAGES.length);
  });
});

describe.each(PAGES)("/vs/$slug", ({ source }) => {
  const hero = between(source, "<VsHero>", "</VsHero>");
  // Data arrays (MATRIX cells, the FAQ answers) sit above and below the
  // component; everything but the hero renders below the first screen.
  const outsideHero = source.replace(hero, "");

  it("imports IntentPrefetchLink on a line of its own, so a link the SEO loop adds needs no import", () => {
    expect(source.split("\n")).toContain(IMPORT);
  });

  it("keeps the hero's links on next's default: the AnalyzeCtaLink island and a <Link>", () => {
    expect(hero, "VsHero opens the page").not.toBe("");
    expect(hero).toContain('<AnalyzeCtaLink analyticsSource="vs_hero"');
    expect(openingTags(hero, "IntentPrefetchLink")).toEqual([]);
    expect(openingTags(hero, "Link").length).toBeGreaterThanOrEqual(1);
  });

  it("uses no default-prefetch <Link> outside the hero", () => {
    expect(scrollPrefetchingLinks(outsideHero)).toEqual([]);
  });

  it("never prefetches /analyze, through either link", () => {
    expect(analyzerIntentLinks(source)).toEqual([]);
    const analyzer = openingTags(source, "Link").filter((tag) => ANALYZE_HREF.test(tag));
    // The screenshot caption's sample run and the close's primary, at least.
    expect(analyzer.length).toBeGreaterThanOrEqual(2);
    for (const tag of analyzer) expect(tag).toMatch(NO_PREFETCH);
  });

  it("writes the close's secondary and the Other comparisons rows as IntentPrefetchLink", () => {
    const close = between(outsideHero, "<CloseSection", "</ActionRow>");
    expect(close, "CloseSection with an ActionRow").toContain("<ActionRow>");
    expect(openingTags(close, "IntentPrefetchLink").length).toBeGreaterThanOrEqual(1);
    const others = between(source, "Other comparisons:", "</ul>");
    expect(others, "the Other comparisons list").not.toBe("");
    expect(openingTags(others, "IntentPrefetchLink").length).toBeGreaterThanOrEqual(2);
  });
});
