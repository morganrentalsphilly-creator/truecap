import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/app/blog/page";
import { BLOG_TOPICS } from "@/lib/blog-topics";
import {
  groupBlogPostsByTopic,
  groupMarketsByStateRange,
} from "@/lib/content-hub-groups";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("server-rendered content hub directories", () => {
  it("groups every available blog URL exactly once", () => {
    const posts = BLOG_POSTS.filter((post) => post.available);
    const groups = groupBlogPostsByTopic(posts, BLOG_TOPICS);
    const renderedPaths = groups.flatMap((group) =>
      group.posts.map((post) => `/blog/${post.slug}`),
    );
    const expectedPaths = posts.map((post) => `/blog/${post.slug}`);

    expect(posts.length).toBeGreaterThanOrEqual(75);
    expect(renderedPaths).toHaveLength(expectedPaths.length);
    expect(new Set(renderedPaths).size).toBe(renderedPaths.length);
    expect([...renderedPaths].sort()).toEqual([...expectedPaths].sort());
    expect(groups.every((group) => group.posts.length > 0)).toBe(true);

    const source = read("app/blog/page.tsx");
    expect(source).toContain('data-blog-directory="grouped"');
    expect(source).toContain('data-blog-post-link=""');
    expect(source).toContain("href={`/blog/${post.slug}`}");
  });

  it("groups every market URL exactly once", () => {
    const entries = [
      ...BESPOKE_MARKETS,
      ...MARKET_CITIES.map(({ slug, name, stateName }) => ({
        slug,
        name,
        stateName,
      })),
    ];
    const groups = groupMarketsByStateRange(entries);
    const renderedPaths = groups.flatMap((group) =>
      group.states.flatMap((state) =>
        state.entries.map((entry) => `/markets/${entry.slug}`),
      ),
    );
    const expectedPaths = entries.map((entry) => `/markets/${entry.slug}`);

    expect(entries.length).toBeGreaterThanOrEqual(162);
    expect(renderedPaths).toHaveLength(expectedPaths.length);
    expect(new Set(renderedPaths).size).toBe(renderedPaths.length);
    expect([...renderedPaths].sort()).toEqual([...expectedPaths].sort());
    expect(groups.every((group) => group.states.length > 0)).toBe(true);

    const source = read("app/markets/page.tsx");
    expect(source).toContain('data-market-directory="grouped"');
    expect(source).toContain('data-market-city-link=""');
    expect(source).toContain("href={`/markets/${city.slug}`}");
  });

  it("links every released city-strategy page from both city render paths", () => {
    const dynamicCity = read("app/markets/[city]/page.tsx");
    const bespokeCity = read("components/marketing/safe-market-page.tsx");

    for (const source of [dynamicCity, bespokeCity]) {
      expect(source).toContain("<CityStrategyGuides");
      expect(source).toContain("citySlug=");
    }
  });
});

describe("content hub touch targets", () => {
  it("keeps cookie privacy links and hub chips at least 44 CSS pixels", () => {
    const cookie = read("components/marketing/cookie-consent-banner.tsx");
    const privacyLinks = cookie.split('data-cookie-privacy-link=""').slice(1);
    expect(privacyLinks).toHaveLength(2);
    for (const link of privacyLinks) {
      expect(link.slice(0, link.indexOf("</Link>"))).toContain(
        "min-h-11 min-w-11",
      );
    }

    const blog = read("app/blog/page.tsx");
    expect(blog).toContain(
      "inline-flex min-h-11 min-w-11 items-center rounded-full",
    );

    const markets = read("app/markets/page.tsx");
    expect(markets).toContain(
      "inline-flex min-h-11 min-w-11 w-full items-center",
    );

    const glossary = read("app/glossary/page.tsx");
    expect(glossary).toContain(
      "inline-flex min-h-11 min-w-11 items-center rounded-full",
    );

    const strategyGuides = read(
      "components/marketing/city-strategy-guides.tsx",
    );
    expect(strategyGuides).toContain(
      "inline-flex min-h-11 min-w-11 items-center rounded-full",
    );
  });

  it("keeps native disclosure summaries touch-sized and focus-visible", () => {
    for (const path of [
      "components/marketing/comparison-faq.tsx",
      "components/marketing/tool-embed-invite.tsx",
    ]) {
      const source = read(path);
      const summary = source.slice(
        source.indexOf("<summary"),
        source.indexOf("</summary>"),
      );
      expect(summary, path).toContain("min-h-11");
      expect(summary, path).toContain("focus-visible:ring-2");
    }
  });
});

describe("homepage loading boundaries", () => {
  it("keeps hero and analyzer SSR while deferring post-analysis dialogs", () => {
    // The analyzer lives at /analyze (the homepage ships no calculator JS);
    // it is a STATIC import there so the form server-renders.
    const analyzePage = read("app/analyze/page.tsx");
    expect(analyzePage).toContain(
      'from "@/components/marketing/analyze-page-content"',
    );
    const analyzeContent = read("components/marketing/analyze-page-content.tsx");
    expect(analyzeContent).toContain(
      'import { InvestCalcPage } from "@/components/investcalc/investcalc-page"',
    );
    expect(analyzeContent).not.toContain("dynamic(");
    const homepage = read("app/page.tsx");
    expect(homepage).toContain("<MarketingHero />");
    expect(homepage).not.toContain("<InvestCalcPage");

    const calculator = read("components/investcalc/investcalc-page.tsx");
    expect(calculator).not.toContain(
      'import { PdfPurchaseDialog } from "@/components/investcalc/pdf-purchase-dialog"',
    );
    expect(calculator).toContain(
      'import("@/components/investcalc/pdf-purchase-dialog")',
    );
    expect(calculator).toContain(
      'import("@/components/investcalc/duplicate-address-dialog")',
    );
    expect(calculator).toContain("{isPdfPurchaseDialogOpen ? (");
    expect(calculator).toContain("{duplicateCollision ? (");

    // Existing hydration and no-JS safeguards remain on the SSR form.
    expect(calculator).toContain(
      'data-calculator-ready={isCalculatorReady ? "true" : "false"}',
    );
    expect(calculator).toContain("aria-busy={!isCalculatorReady}");
    expect(calculator).toContain(
      "inert={isCalculatorReady ? undefined : true}",
    );
  });
});
