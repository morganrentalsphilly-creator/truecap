import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MarketCityPage, {
  generateMetadata as generateMarketMetadata,
} from "@/app/markets/[city]/page";
import { generateMetadata as generateStrategyMetadata } from "@/app/markets/[city]/[strategy]/page";
import StatePage, {
  generateMetadata as generateStateMetadata,
} from "@/app/states/[slug]/page";
import { buildSafeMarketMetadata } from "@/components/marketing/safe-market-page";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { CITY_STRATEGY_COMBOS } from "@/lib/city-strategy-combos";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import { HUD_RENTS } from "@/lib/markets/hud-rents";
import {
  NOINDEX_FOLLOW,
  STATE_PAGE_MIN_WORDS,
  countWords,
  estimateStatePageWords,
  getIndexableMarketSlugs,
  getIndexableStateSlugs,
  getStateHudCities,
  isMarketIndexable,
  isStrategyIndexable,
  isStateIndexable,
} from "@/lib/markets/indexability";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { STATES } from "@/lib/states";

/** Visible words inside <main>, with JSON-LD and markup stripped. */
function mainWords(html: string): number {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
  return countWords(
    main
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/g, " "),
  );
}

describe("market indexability (docs/site-overhaul.md Phase 8.1)", () => {
  it("indexes exactly the city pages that carry HUD rent", () => {
    const expected = [...MARKET_CITIES, ...BESPOKE_MARKETS]
      .map((city) => city.slug)
      .filter((slug) => Object.prototype.hasOwnProperty.call(HUD_RENTS, slug));
    expect(getIndexableMarketSlugs()).toEqual(expected);
    expect(getIndexableMarketSlugs().length).toBeGreaterThanOrEqual(150);
    for (const city of MARKET_CITIES) {
      expect(isMarketIndexable(city.slug), city.slug).toBe(true);
    }
    expect(isMarketIndexable("not-a-market")).toBe(false);
    expect(isMarketIndexable("constructor")).toBe(false);
  });

  it("sets robots only on the pages that have nothing to rank", async () => {
    const indexable = await generateMarketMetadata({
      params: Promise.resolve({ city: "columbus" }),
    });
    expect(indexable.robots).toBeUndefined();
    expect(indexable.alternates?.canonical).toBe("/markets/columbus");

    for (const market of BESPOKE_MARKETS) {
      const metadata = buildSafeMarketMetadata({
        city: market.name,
        stateCode: "XX",
        stateName: market.stateName,
        stateSlug: "state",
        slug: market.slug,
      });
      expect(metadata.robots, market.slug).toEqual(
        isMarketIndexable(market.slug) ? undefined : NOINDEX_FOLLOW,
      );
    }

    for (const combo of CITY_STRATEGY_COMBOS) {
      const metadata = await generateStrategyMetadata({
        params: Promise.resolve({
          city: combo.citySlug,
          strategy: combo.strategy,
        }),
      });
      expect(metadata.robots, `${combo.citySlug}/${combo.strategy}`).toEqual(
        isStrategyIndexable(combo.citySlug) ? undefined : NOINDEX_FOLLOW,
      );
    }
  });

  it("renders the sample underwrite from the real engine with the HUD 3-bedroom rent", async () => {
    const hud = HUD_RENTS.columbus;
    const expected = calculateAnalysis({
      ...SAMPLE_DEAL_FIXTURE.values,
      address: "Columbus sample",
      monthlyRent: hud.rent3br,
    });
    const html = renderToStaticMarkup(
      await MarketCityPage({ params: Promise.resolve({ city: "columbus" }) }),
    );
    const cashFlow = Math.round(expected.netCashFlow);
    expect(html).toContain(
      `${cashFlow < 0 ? "−" : "+"}$${Math.abs(cashFlow).toLocaleString("en-US")}/mo`,
    );
    expect(html).toContain(`${expected.capRate.toFixed(1)}%`);
    expect(html).toContain(expected.dscr.toFixed(2));
    expect(html).toContain(
      `$${SAMPLE_DEAL_FIXTURE.values.purchasePrice.toLocaleString("en-US")}`,
    );
    expect(html).toContain(`$${hud.rent3br.toLocaleString("en-US")}`);
    expect(html).toContain("not a listing");
    expect(mainWords(html)).toBeGreaterThanOrEqual(STATE_PAGE_MIN_WORDS);
  });
});

describe("state indexability (docs/site-overhaul.md Phase 8.2)", () => {
  it("requires the four state fields plus at least one HUD city", () => {
    expect(isStateIndexable("not-a-state")).toBe(false);
    for (const state of Object.values(STATES)) {
      if (isStateIndexable(state.slug)) {
        expect(getStateHudCities(state.name).length, state.slug).toBeGreaterThan(0);
        expect(estimateStatePageWords(state.slug), state.slug).toBeGreaterThanOrEqual(
          STATE_PAGE_MIN_WORDS,
        );
      }
    }
    expect(getIndexableStateSlugs()).toEqual(
      Object.values(STATES)
        .map((state) => state.slug)
        .filter(isStateIndexable),
    );
  });

  it.each(Object.values(STATES).map((state) => state.slug))(
    "/states/%s renders at least the estimated words and carries the matching robots tag",
    async (slug) => {
      const html = renderToStaticMarkup(
        await StatePage({ params: Promise.resolve({ slug }) }),
      );
      const words = mainWords(html);
      // The estimate counts only real content, so the page must never come
      // in under it — and an indexable page must clear the bar for real.
      expect(words).toBeGreaterThanOrEqual(estimateStatePageWords(slug));
      const metadata = await generateStateMetadata({
        params: Promise.resolve({ slug }),
      });
      if (isStateIndexable(slug)) {
        expect(words).toBeGreaterThanOrEqual(STATE_PAGE_MIN_WORDS);
        expect(metadata.robots).toBeUndefined();
      } else {
        expect(metadata.robots).toEqual(NOINDEX_FOLLOW);
      }
      expect(metadata.alternates?.canonical).toBe(`/states/${slug}`);
      expect(html.match(/Data as of \d{4}; verify locally before you offer\./g)).toHaveLength(1);
      for (const city of getStateHudCities(STATES[slug].name)) {
        expect(html).toContain(`href="/markets/${city.slug}"`);
      }
    },
  );
});
