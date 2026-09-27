/**
 * SEO string builders for the /markets/<slug> pages (programmatic and
 * bespoke), extracted so the length contracts are unit-testable
 * (lib/__tests__/markets-data-bar.test.ts).
 *
 * Data-first framing (founder decision, 2026-09-27): the title and H1 say what
 * the page holds, "{City}, {ST} Rental Market Data ({YEAR})", where YEAR is
 * the HUD fiscal year of the page's figures (HUD_RENTS[slug].year), never a
 * typed or clock year. No page asks whether a city is a good investment.
 */

import type { HudRent } from "@/lib/markets/hud-rents";
import { usd } from "@/lib/markets/data-copy";

/** Pre-template SERP title budget — layout appends " | TrueCap". */
export const MARKET_TITLE_MAX = 50;

/** Meta description budget. */
export const MARKET_DESCRIPTION_MAX = 160;

/**
 * "{City}, {ST} Rental Market Data ({YEAR})". Without a HUD row there is no
 * vintage to name, so no year. A title over MARKET_TITLE_MAX drops "Market".
 */
export function buildMarketCityTitle(cityName: string, stateCode: string, year: number | null): string {
  const suffix = year === null ? "" : ` (${year})`;
  const full = `${cityName}, ${stateCode} Rental Market Data${suffix}`;
  if (full.length <= MARKET_TITLE_MAX) return full;
  return `${cityName}, ${stateCode} Rental Data${suffix}`;
}

/** The H1: always the full data title, which carries no length budget. */
export function buildMarketCityH1(cityName: string, stateCode: string, year: number | null): string {
  const suffix = year === null ? "" : ` (${year})`;
  return `${cityName}, ${stateCode} Rental Market Data${suffix}`;
}

/** Meta description: the page's own HUD figures, ≤ MARKET_DESCRIPTION_MAX characters. */
export function buildMarketCityDescription(cityName: string, stateCode: string, hud: HudRent | null): string {
  if (!hud) {
    return `${cityName}, ${stateCode} rental market data: what TrueCap publishes for the city and what to verify locally before you offer.`;
  }
  return `HUD FY${hud.year} Fair Market Rent for ${cityName}, ${stateCode}: ${usd(hud.rent2br)}/mo for 2 bedrooms, ${usd(hud.rent3br)}/mo for 3, with sources and a sample underwrite.`;
}
