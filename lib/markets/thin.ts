/**
 * The market-data "thin" flag (F8): a /markets/<slug> page is thin when HUD
 * publishes no ZIP-level Small Area FMR rows for it (lib/markets/safmr-rents.ts)
 * and content/seo/market-facts.json holds no sourced facts for it. Such a page
 * says nothing beyond its area's two HUD figures and the shared template, so it
 * is the first place local, sourced facts add value.
 *
 * It is a signal, never an index rule: indexability stays the HUD-row rule in
 * lib/markets/indexability.ts. Both city templates print it as
 * `data-market-data="thin" | "enriched"` on <main>; seo/scripts/crawl.ts reads
 * that attribute into the crawl record, and seo/scripts/score.ts tags the
 * page's MARKET_ENRICH reason `market-data-thin` for the seo-market-enrich skill.
 */

import { SAFMR_RENTS } from "@/lib/markets/safmr-rents";
import { marketFactsFor } from "@/lib/seo/market-facts";

export type MarketDataSignals = Readonly<{ safmrRows: number; hasMarketFacts: boolean }>;

/** Value of the `data-market-data` attribute the city templates render. */
export type MarketDataStatus = "thin" | "enriched";

/** The HTML attribute crawl.ts reads. */
export const MARKET_DATA_ATTRIBUTE = "data-market-data";

/** Pure: thin when there are no SAFMR ZIP rows and no market-facts entry. */
export function isMarketDataThin(signals: MarketDataSignals): boolean {
  return signals.safmrRows === 0 && !signals.hasMarketFacts;
}

/** The repo's signals for one market slug. */
export function marketDataSignals(slug: string): MarketDataSignals {
  const safmr = Object.prototype.hasOwnProperty.call(SAFMR_RENTS, slug) ? SAFMR_RENTS[slug] : undefined;
  return Object.freeze({ safmrRows: safmr?.rows.length ?? 0, hasMarketFacts: marketFactsFor(slug) !== null });
}

/** "thin" or "enriched" for one market slug. */
export function marketDataStatus(slug: string): MarketDataStatus {
  return isMarketDataThin(marketDataSignals(slug)) ? "thin" : "enriched";
}
