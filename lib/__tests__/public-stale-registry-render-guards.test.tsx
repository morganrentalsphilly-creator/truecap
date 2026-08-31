import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MarketCityPage from "@/app/markets/[city]/page";
import CityStrategyPage from "@/app/markets/[city]/[strategy]/page";
import StatePage from "@/app/states/[slug]/page";
import DallasMarketPage from "@/app/markets/dallas/page";
import PhiladelphiaMarketPage from "@/app/markets/philadelphia/page";
import PhoenixMarketPage from "@/app/markets/phoenix/page";
import { getCityStrategyCombo } from "@/lib/city-strategy-combos";
import { getMarketCity } from "@/lib/markets/cities";
import { getStateBySlug } from "@/lib/states";

describe("stale-review registry rendering boundary", () => {
  it("renders checked-in HUD context without the city's hand-curated market claims", async () => {
    const city = getMarketCity("columbus");
    expect(city).not.toBeNull();

    const html = renderToStaticMarkup(
      await MarketCityPage({ params: Promise.resolve({ city: "columbus" }) }),
    );

    expect(html).toContain("HUD 2BR area benchmark");
    expect(html).toContain("intentionally omits unsourced cap-rate");
    expect(html).not.toContain(city!.blurb);
    expect(html).not.toContain(city!.typicalPrice);
    expect(html).not.toContain(city!.typicalRent);
    expect(html).not.toContain(city!.investorAngle);
    for (const neighborhood of city!.neighborhoods) {
      expect(html).not.toContain(neighborhood.why);
    }
  });

  it("keeps state tax, law, insurance, strategy, and ranking records out of HTML and JSON-LD", async () => {
    const state = getStateBySlug("texas");
    expect(state).not.toBeNull();

    const html = renderToStaticMarkup(
      await StatePage({ params: Promise.resolve({ slug: "texas" }) }),
    );

    expect(html).toContain("Stale-review boundary");
    expect(html).not.toContain(state!.pitch);
    expect(html).not.toContain(`${state!.propertyTaxRatePct}%`);
    expect(html).not.toContain(`${state!.evictionTimelineDays} days`);
    expect(html).not.toContain(state!.insuranceNote);
    for (const claim of [
      ...state!.pros,
      ...state!.cons,
      ...state!.bestStrategies,
    ]) {
      expect(html).not.toContain(claim);
    }
    for (const city of state!.topCities) {
      expect(html).not.toContain(city.note);
    }
  });

  it("keeps combo ranges, neighborhood narratives, and strategy claims out of the public strategy page", async () => {
    const combo = getCityStrategyCombo("cleveland", "cash-flow");
    expect(combo).not.toBeNull();

    const html = renderToStaticMarkup(
      await CityStrategyPage({
        params: Promise.resolve({ city: "cleveland", strategy: "cash-flow" }),
      }),
    );

    expect(html).toContain("Stale-review boundary");
    expect(html).toContain("this link does not preload market ranges");
    expect(html).not.toContain(combo!.pitch);
    expect(html).not.toContain(combo!.whyHereWhyNow);
    expect(html).not.toContain(combo!.typicalNumbers.purchasePrice);
    expect(html).not.toContain(combo!.typicalNumbers.monthlyRent);
    expect(html).not.toContain(combo!.typicalNumbers.capRate);
    for (const neighborhood of combo!.neighborhoods) {
      expect(html).not.toContain(neighborhood.why);
    }
    for (const pitfall of combo!.pitfalls) {
      expect(html).not.toContain(pitfall);
    }
  });

  it("keeps the former bespoke market ranges, legal claims, and rankings out of rendered HTML", () => {
    const html = [
      renderToStaticMarkup(<DallasMarketPage />),
      renderToStaticMarkup(<PhiladelphiaMarketPage />),
      renderToStaticMarkup(<PhoenixMarketPage />),
    ].join("\n");

    expect(html.match(/Source-first boundary/g)).toHaveLength(3);
    expect(html).not.toMatch(
      /3-5%|8-11%|1M\+ residents|500k\+ residents|top 5 US markets|MLS-derived medians|active TrueCap user analyses|Tax Foundation \(property tax\)/i,
    );
  });
});
