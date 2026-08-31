import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/app/blog/page";
import { CALCULATOR_REGISTRY } from "@/lib/calculator-registry";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("sitewide passive-conversion CTA", () => {
  it("has one privacy-safe analyzer destination and one tracked link", () => {
    const shared = read("components/marketing/seo-analyzer-cta.tsx");

    expect(shared.match(/<TrackedContentCtaLink\b/g)).toHaveLength(1);
    expect(shared).toContain("Analyze a property free");
    expect(shared).toContain('"/#main"');
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
    expect(sourceFirstArticle.match(/<BlogStickyCta\s*\/>/g)).toHaveLength(1);

    for (const post of BLOG_POSTS.filter((entry) => entry.available)) {
      const path = `app/blog/${post.slug}/page.tsx`;
      const source = read(path);
      const directWrappers = source.match(/<BlogStickyCta\s*\/>/g) ?? [];
      const sharedWrappers = source.match(/<SourceFirstArticle\b/g) ?? [];
      expect(
        directWrappers.length + sharedWrappers.length,
        `${path}: expected one direct or shared article CTA wrapper`,
      ).toBe(1);

      // Contextual prose links may cite the analyzer, but a second imperative
      // analyzer button/link would compete with the one shared conversion CTA.
      // Match JSX Link blocks instead of one particular class list so a visual
      // restyle cannot silently reintroduce the duplicate.
      const directAnalyzerLinks =
        source.match(
          /<Link\b[^>]*href=\{?["']\/(?:#main)?["']\}?[^>]*>[\s\S]{0,800}?<\/Link>/g,
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
