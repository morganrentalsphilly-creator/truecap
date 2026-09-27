import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * F2 D3: a URL with no content/seo/lastmod.json entry gets NO last-modified
 * date — never the build date, never a hand-typed floor. The committed map
 * covers every sitemap URL, so the contract tests never reach that branch;
 * here the map is EMPTY and everything that reads it is the real code. A
 * fallback such as `lastmodFor(path) ?? "2026-09-06"` in the sitemap or a
 * template fails this file.
 */

vi.mock("@/content/seo/lastmod.json", () => ({ default: {} }));

// Imported after the mock (vi.mock is hoisted above these).
import sitemap from "@/app/sitemap";
import { GET as getFeed } from "@/app/feed.xml/route";
import MarketCityPage from "@/app/markets/[city]/page";
import CityStrategyPage from "@/app/markets/[city]/[strategy]/page";
import StatePage from "@/app/states/[slug]/page";
import GlossaryTermPage from "@/app/glossary/[slug]/page";
import MethodologyPage from "@/app/methodology/page";
import StessaComparisonPage from "@/app/vs/stessa/page";
import MortgagePaymentPage from "@/app/tools/mortgage-payment-calculator/page";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { CITY_STRATEGY_COMBOS } from "@/lib/city-strategy-combos";
import { LASTMOD } from "@/lib/seo/lastmod";

const dateModifiedValues = (html: string): string[] => [...html.matchAll(/"dateModified":"([^"]*)"/g)].map((m) => m[1]);

describe("with an empty lastmod map, nothing invents a date", () => {
  it("the mock is in force", () => {
    expect(Object.keys(LASTMOD)).toEqual([]);
  });

  it("the sitemap emits no <lastmod> at all", () => {
    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(300);
    expect(entries.filter((entry) => entry.lastModified !== undefined).map((entry) => entry.url)).toEqual([]);
  });

  it("the templates render no JSON-LD dateModified", async () => {
    const combo = CITY_STRATEGY_COMBOS[0];
    const pages: Array<[string, ReactElement]> = [
      ["/markets/columbus", await MarketCityPage({ params: Promise.resolve({ city: "columbus" }) })],
      [`/markets/${combo.citySlug}/${combo.strategy}`, await CityStrategyPage({ params: Promise.resolve({ city: combo.citySlug, strategy: combo.strategy }) })],
      ["/states/ohio", await StatePage({ params: Promise.resolve({ slug: "ohio" }) })],
      ["/glossary/cap-rate", await GlossaryTermPage({ params: Promise.resolve({ slug: "cap-rate" }) })],
      ["/methodology", MethodologyPage()],
      ["/vs/stessa", StessaComparisonPage()],
      ["/tools/mortgage-payment-calculator", MortgagePaymentPage()],
    ];
    for (const [path, element] of pages) {
      const html = renderToStaticMarkup(element);
      expect(html.length, path).toBeGreaterThan(1000);
      expect(dateModifiedValues(html), path).toEqual([]);
    }
  });

  it("/methodology drops its visible 'Last updated' line instead of inventing one", () => {
    expect(renderToStaticMarkup(MethodologyPage())).not.toContain("Last updated:");
  });

  it("the feed dates its channel by the newest publication, not the build", async () => {
    const xml = await (await getFeed()).text();
    const newest = BLOG_POSTS.filter((p) => p.available)
      .map((p) => p.publishedAt)
      .sort()
      .at(-1);
    expect(xml).toContain(`<lastBuildDate>${new Date(`${newest}T00:00:00Z`).toUTCString()}</lastBuildDate>`);
  });
});
