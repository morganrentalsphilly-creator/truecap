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
import { HUD_RENTS } from "@/lib/markets/hud-rents";
import { buildHudDataAsOfLine } from "@/lib/markets/data-copy";
import {
  buildDataAsOfLine,
  getMarketDataYear,
} from "@/lib/markets/indexability";
import { STATES, getStateBySlug } from "@/lib/states";

/** The market and state pages' one dating line (F8): HUD vintage plus retrieval date. */
const HUD_DATA_AS_OF = /Data as of HUD FY\d{4} \(retrieved [A-Z][a-z]+ \d{1,2}, \d{4}/g;
/** The strategy pages' older year-only line. */
const YEAR_DATA_AS_OF = /Data as of \d{4}; verify locally before you offer\./g;

/**
 * What each public template may and may not publish from its data record
 * (docs/site-overhaul.md Phase 8.1–8.2, F8). HUD rent, the sample underwrite
 * and the sourced Census state facts are on the page. Nothing hand-authored
 * is: not the city ranges and narratives, and not the state pitch, market
 * tier, landlord lean or property-tax rate (founder decision 2026-09-27:
 * "state pitches become sourced facts"), nor rankings or legal timelines.
 */
describe("public market and state rendering boundary", () => {
  it("renders HUD rent and the sample underwrite without the city's hand-authored market claims", async () => {
    const city = getMarketCity("columbus");
    expect(city).not.toBeNull();
    const hud = HUD_RENTS.columbus;
    expect(hud).toBeDefined();

    const html = renderToStaticMarkup(
      await MarketCityPage({ params: Promise.resolve({ city: "columbus" }) }),
    );

    expect(html).toContain(`HUD Fair Market Rent (FY${hud.year})`);
    expect(html).toContain("Sample underwrite at a stated");
    expect(html).toContain("Three things to verify locally");
    expect(html.match(HUD_DATA_AS_OF)).toHaveLength(1);
    expect(html.match(YEAR_DATA_AS_OF)).toBeNull();
    expect(html).toContain(buildHudDataAsOfLine(hud.year, [hud.retrievedAt]));
    expect(html).not.toContain(city!.blurb);
    expect(html).not.toContain(city!.typicalPrice);
    expect(html).not.toContain(city!.typicalRent);
    expect(html).not.toContain(city!.investorAngle);
    for (const neighborhood of city!.neighborhoods) {
      expect(html).not.toContain(neighborhood.why);
    }
  });

  it("keeps every unsourced state field — pitch, tier, landlord lean, tax rate, eviction, insurance, strategy, median, ranking — out of HTML and JSON-LD", async () => {
    const state = getStateBySlug("texas");
    expect(state).not.toBeNull();

    const html = renderToStaticMarkup(
      await StatePage({ params: Promise.resolve({ slug: "texas" }) }),
    );

    expect(html).not.toContain(state!.pitch);
    expect(html).not.toContain(`${state!.propertyTaxRatePct}%`);
    expect(html).not.toMatch(/Market tier|Landlord-leaning|Tenant-leaning|Landlord-tenant law|Typical effective property tax/);
    expect(html).not.toContain(`>${state!.tier}<`);
    expect(html.match(HUD_DATA_AS_OF)).toHaveLength(1);
    expect(html.match(YEAR_DATA_AS_OF)).toBeNull();
    expect(html).not.toContain(`${state!.evictionTimelineDays} days`);
    expect(html).not.toContain(state!.evictionTimelineDays);
    expect(html).not.toContain(state!.insuranceNote);
    expect(html).not.toContain(state!.medianHomePrice.toLocaleString("en-US"));
    expect(html).not.toContain(state!.medianRent.toLocaleString("en-US"));

    // The income-tax rate stays off the page too. Texas's is 0, which any
    // percentage would match, so check a state with a distinct non-zero rate.
    const taxed = Object.values(STATES).find(
      (candidate) =>
        candidate.topStateIncomeTaxPct > 0 &&
        !`${candidate.propertyTaxRatePct}`.includes(
          `${candidate.topStateIncomeTaxPct}`,
        ),
    )!;
    const taxedHtml = renderToStaticMarkup(
      await StatePage({ params: Promise.resolve({ slug: taxed.slug }) }),
    );
    expect(taxedHtml).not.toContain(taxed.pitch);
    expect(taxedHtml).not.toContain(`${taxed.topStateIncomeTaxPct}%`);
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

    // Strategy pages keep the year-only line; Cleveland (bespoke) dates itself
    // by its HUD FY row since F8.
    expect(html.match(YEAR_DATA_AS_OF)).toHaveLength(1);
    expect(html).toContain(buildDataAsOfLine(getMarketDataYear("cleveland")));
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

    expect(html.match(HUD_DATA_AS_OF)).toHaveLength(3);
    expect(html.match(YEAR_DATA_AS_OF)).toBeNull();
    expect(html).not.toMatch(/What this page doesn(?:'|&#x27;|&apos;)t publish/);
    expect(html).not.toMatch(
      /3-5%|8-11%|1M\+ residents|500k\+ residents|top 5 US markets|MLS-derived medians|active TrueCap user analyses|Tax Foundation \(property tax\)/i,
    );
  });
});
