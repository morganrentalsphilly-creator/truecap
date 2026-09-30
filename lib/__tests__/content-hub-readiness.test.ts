import { readFileSync } from "node:fs";
import { join } from "node:path";
// 2026-09 audit: the product uses one focus vocabulary — the primitives'
// 3px ring at 50% (focus-visible:ring-[3px] focus-visible:ring-ring/50).
import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog-posts";
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

    // 73 since the DSCR consolidation (founder decision Q5, 2026-09-28)
    // merged two posts into /blog/how-to-calculate-dscr.
    expect(posts.length).toBeGreaterThanOrEqual(73);
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

    // The /blog topic links are a two-column ruled list below 640px and tags
    // from 640px (DESIGN.md radius by role: 2px), one set of links either
    // way. The 44px floor (min-h-11 min-w-11) holds at every width and is
    // what this guards; the second pin carries the tag radius from 640px.
    const blog = read("app/blog/page.tsx");
    expect(blog).toContain(
      "block min-h-11 min-w-11 border-b border-rule-soft",
    );
    expect(blog).toContain("sm:inline-flex sm:items-center sm:rounded-sm");

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
    const summaryOf = (path: string) => {
      const source = read(path);
      const start = source.indexOf("<summary");
      const end = source.indexOf("</summary>");
      expect(start, path).toBeGreaterThan(-1);
      expect(end, path).toBeGreaterThan(start);
      return source.slice(start, end);
    };

    // The embed invite's summary has its own test below (it moved to the
    // global outline floor in the tools shared-furniture commit).

    // ComparisonFaq's rows are the homepage FAQ's (DESIGN.md "Components":
    // FAQ; FaqSection): 48px tall, and focus is the global 3px Signal Blue
    // outline floor, not a per-row ring. So the row must stay at least
    // 44px, must not try to suppress the outline, and the floor in
    // app/globals.css must keep covering summary.
    const comparison = summaryOf("components/marketing/comparison-faq.tsx");
    expect(comparison).toMatch(/\bmin-h-1[12]\b/);
    expect(comparison).not.toMatch(/\boutline-(?:none|hidden|0)\b/);

    // The floor's selector is `:where(<controls>):where(:not(<menu roles>))
    // :focus-visible`. summary must be one of the FIRST list's own items: a
    // summary moved into a :not(...) (either list) is excluded from the
    // floor, and a match anywhere in the selector would still pass.
    const floor = /([^{}]*)\{\s*outline:\s*3px solid var\(--ring\) !important;/.exec(
      read("app/globals.css"),
    );
    expect(floor, "the 3px focus outline floor in app/globals.css").not.toBeNull();
    const selector = (floor?.[1] ?? "").split("*/").pop()!.trim();
    expect(selector.startsWith(":where(")).toBe(true);
    expect(selector.endsWith(":focus-visible")).toBe(true);
    const controls: string[] = [];
    let depth = 1;
    let item = "";
    for (const ch of selector.slice(":where(".length)) {
      if (ch === "(") depth += 1;
      if (ch === ")") depth -= 1;
      if (depth === 0) break;
      if (depth === 1 && ch === ",") {
        controls.push(item.trim());
        item = "";
      } else {
        item += ch;
      }
    }
    controls.push(item.trim());
    expect(controls).toContain("summary");
  });

  it("keeps the embed invite summary touch-sized and on the global focus outline", () => {
    // The invite's <summary> takes its focus indicator from the global 3px
    // outline in app/globals.css, an !important floor whose selector lists
    // summary. A local ring would draw a second indicator inside it, and
    // outline-none would fight the floor, so the summary carries neither.
    const path = "components/marketing/tool-embed-invite.tsx";
    const source = read(path);
    const start = source.indexOf("<summary");
    const end = source.indexOf("</summary>");
    expect(start, path).toBeGreaterThan(-1);
    expect(end, path).toBeGreaterThan(start);
    const summaryTag = source.slice(start, source.indexOf(">", start));
    expect(summaryTag, path).toContain("min-h-11");
    expect(summaryTag, path).not.toContain("outline-none");
    expect(summaryTag, path).not.toMatch(/focus(-visible)?:ring/);

    const css = read("app/globals.css");
    const floor = css.indexOf("outline: 3px solid var(--ring) !important");
    expect(floor, "global focus outline").toBeGreaterThan(-1);
    const selector = css
      .slice(css.lastIndexOf("}", floor) + 1, css.lastIndexOf("{", floor))
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(selector).toContain(":focus-visible");
    const targets = selector.slice(
      selector.indexOf(":where(") + ":where(".length,
      selector.indexOf("):where("),
    );
    expect(targets.split(",").map((target) => target.trim())).toContain(
      "summary",
    );
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
