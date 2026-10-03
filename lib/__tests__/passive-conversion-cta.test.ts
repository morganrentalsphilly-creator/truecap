import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { CALCULATOR_REGISTRY } from "@/lib/calculator-registry";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * One self-closing <BlogStickyCta … /> mount. A post on the ledger article
 * frame passes `inArticleColumn` (it sits in <ArticleEnd>); an unconverted
 * post mounts the bare `<BlogStickyCta />`. Both count once; a second mount
 * of either form, or none, fails.
 */
const BLOG_CTA_MOUNT = /<BlogStickyCta\b[^>]*\/>/g;

describe("sitewide passive-conversion CTA", () => {
  it("has one privacy-safe analyzer destination and one tracked link", () => {
    const shared = read("components/marketing/seo-analyzer-cta.tsx");

    expect(shared.match(/<TrackedContentCtaLink\b/g)).toHaveLength(1);
    expect(shared).toContain("Analyze a property free");
    // The analyzer lives at /analyze (site overhaul Phase 2). A "/…#main"
    // destination lands on the marketing hero and drops the staged prefill.
    expect(shared).toContain('base: ANALYZER_ROUTE');
    // An internal hop is marked with `from`, never a utm_ parameter, which
    // analytics would count as a traffic source (audit row P2-113).
    expect(shared).toContain('`${ANALYZER_ROUTE}?from=${encodeURIComponent(utmSource)}`');
    expect(shared).not.toContain("?utm_source=");
    expect(shared).toContain(": ANALYZER_ROUTE;");
    expect(shared).not.toContain("#main");
    expect(shared).not.toContain('"/?utm_source');
    expect(shared).not.toMatch(/property(?:_| )?(?:address|price|rent)/i);
  });

  it("uses the shared inline CTA once in every content-family template", () => {
    for (const path of [
      "app/markets/[city]/page.tsx",
      "app/states/[slug]/page.tsx",
      "app/glossary/[slug]/page.tsx",
      "components/marketing/comparison-faq.tsx",
    ]) {
      expect(read(path).match(/<SeoAnalyzerCta\b/g), path).toHaveLength(1);
    }
  });

  it("keeps exactly one wrapper instance on every available article and released tool", () => {
    const sourceFirstArticle = read(
      "components/marketing/source-first-article.tsx",
    );
    expect(sourceFirstArticle.match(BLOG_CTA_MOUNT)).toHaveLength(1);

    for (const post of BLOG_POSTS.filter((entry) => entry.available)) {
      const path = `app/blog/${post.slug}/page.tsx`;
      const source = read(path);
      const directWrappers = source.match(BLOG_CTA_MOUNT) ?? [];
      const sharedWrappers = source.match(/<SourceFirstArticle\b/g) ?? [];
      expect(
        directWrappers.length + sharedWrappers.length,
        `${path}: expected one direct or shared article CTA wrapper`,
      ).toBe(1);

      // Contextual prose links may cite the analyzer, but a second imperative
      // analyzer button/link would compete with the one shared conversion CTA.
      // Match JSX link blocks (<Link>, <IntentPrefetchLink> or <a>) instead of
      // one particular class list so a visual restyle cannot silently
      // reintroduce the duplicate. "/analyze" is the analyzer's home now; "/"
      // and "/#main" are kept so a stale link is still counted. The one
      // allowed imperative link is the shared <UnderTitleAnalyzeLink />
      // (checked below), which holds no href in a post's source.
      const directAnalyzerLinks =
        source.match(
          /<(Link|IntentPrefetchLink|a)\b[^>]*href=\{?["']\/(?:#main|analyze(?:\?[^"']*)?)?["']\}?[^>]*>[\s\S]{0,800}?<\/\1>/g,
        ) ?? [];
      const duplicateCallsToAction = directAnalyzerLinks.filter((link) => {
        const text = link
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return (
          /\b(?:bg-primary|rounded-(?:lg|xl|2xl)|inline-flex)\b/.test(link) ||
          /^(?:analyze|run|try|open|underwrite|compute|calculate|check|start)\b/i.test(
            text,
          )
        );
      });
      expect(duplicateCallsToAction, path).toHaveLength(0);
    }

    for (const calculator of CALCULATOR_REGISTRY) {
      const path = `app/tools/${calculator.slug}/page.tsx`;
      expect(read(path).match(/<ToolsConversionCta\b/g), path).toHaveLength(1);
    }
  });

  it("accepts exactly the shared under-H1 analyze link: one plain /analyze text link, once per page file", () => {
    // The part (audit row P2-80): one next/link to /analyze that never
    // prefetches, reading "Analyze a deal free", not set as a button.
    const parts = read("components/marketing/page-parts.tsx");
    const start = parts.indexOf("export function UnderTitleAnalyzeLink() {");
    expect(start).toBeGreaterThan(-1);
    const part = parts.slice(start, parts.indexOf("\n}\n", start));
    const links = part.match(/<Link\b[^>]*>[\s\S]*?<\/Link>/g) ?? [];
    expect(links).toHaveLength(1);
    const link = links[0] ?? "";
    expect(link).toMatch(/\shref="\/analyze"\s/);
    expect(link).toMatch(/\sprefetch=\{false\}\s/);
    expect(link.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).toBe("Analyze a deal free");
    expect(part).not.toMatch(/buttonVariants|bg-primary|rounded-|<form|<input|<button/);
    // Blog posts take it from the frame, which re-exports this one part.
    expect(read("components/marketing/article.tsx")).toContain(
      'export { UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";',
    );

    // Every mount is the propless tag, at most one per page file. In a post
    // it sits in the post's own <header> (under the H1, never in the body);
    // on the hubs (the topic hubs and /blog itself share app/blog/ but are
    // PageHero pages with no <header>; /tools, /methodology and /playbook
    // are PageHero pages too) it is the hero's `actions`.
    const HUBS_ON_PAGE_HERO = [
      "app/blog/page.tsx",
      "app/tools/page.tsx",
      "app/methodology/page.tsx",
      "app/playbook/page.tsx",
    ];
    const walk = (dir: string): string[] =>
      readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? entry.name === "node_modules" || entry.name === "__tests__"
            ? []
            : walk(`${dir}/${entry.name}`)
          : entry.name.endsWith(".tsx")
            ? [`${dir}/${entry.name}`]
            : [],
      );
    const mounting: string[] = [];
    for (const path of [...walk("app"), ...walk("components")]) {
      // Comments removed: a doc comment naming the part is not a mount.
      const source = read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      const mounts = [...source.matchAll(/<UnderTitleAnalyzeLink\b[^>]*>/g)];
      if (mounts.length === 0) continue;
      mounting.push(path);
      expect(mounts, path).toHaveLength(1);
      expect(mounts[0][0], path).toBe("<UnderTitleAnalyzeLink />");
      if (path.startsWith("app/blog/topics/") || HUBS_ON_PAGE_HERO.includes(path)) {
        expect(source, `${path}: in the hero's actions slot`).toContain("actions={<UnderTitleAnalyzeLink />}");
        expect(source.slice(0, mounts[0].index).lastIndexOf("<PageHero"), `${path}: on the PageHero`).toBeGreaterThan(-1);
      } else if (path.startsWith("app/blog/")) {
        const before = source.slice(0, mounts[0].index);
        expect(before.lastIndexOf("<header"), `${path}: in the post header`).toBeGreaterThan(before.lastIndexOf("</header>"));
      }
    }
    expect(mounting).toEqual(
      expect.arrayContaining([
        "app/blog/1-percent-rule-rental-property/page.tsx",
        "app/tools/1-percent-rule-calculator/page.tsx",
        // The hubs (wave 6): /glossary, /blog/topics and each topic hub.
        "app/glossary/page.tsx",
        "app/blog/topics/page.tsx",
        "app/blog/topics/[topic]/page.tsx",
        // Four more hubs (wave 6, founder answer 15).
        ...HUBS_ON_PAGE_HERO,
      ]),
    );
    // /markets holds exactly one imperative analyzer link in its hero. Today
    // that is the "Run a deal free" button in the hero's aside, so the page
    // takes no under-title link; if the under-title link is chosen instead,
    // the button goes. Never both, never neither.
    const markets = read("app/markets/page.tsx");
    const marketsHero = markets.slice(markets.indexOf("<PageHero"), markets.indexOf("</PageHero>"));
    const hasButton = /href="\/analyze\?from=markets-hub" prefetch=\{false\}[\s\S]*?Run a deal free/.test(marketsHero);
    const underTitleMounts = markets.match(/<UnderTitleAnalyzeLink\b/g)?.length ?? 0;
    expect(
      Number(hasButton) + underTitleMounts,
      "/markets: exactly one imperative analyzer link in the hero",
    ).toBe(1);
  });

  it("uses the shared CTA without signup detours, overlays, or sticky bars", () => {
    const blog = read("components/marketing/blog-sticky-cta.tsx");
    const tools = read("components/marketing/tools-conversion-cta.tsx");

    for (const source of [blog, tools]) {
      expect(source.match(/<SeoAnalyzerCta\b/g)).toHaveLength(1);
      expect(source).not.toContain("/auth/sign-up");
      expect(source).not.toContain("fixed inset-x-0");
      expect(source).not.toContain("ExitIntent");
    }
  });
});
