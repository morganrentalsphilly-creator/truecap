/**
 * GENERATED — do not edit by hand.
 *
 * Real HUD Fair Market Rent per market city, written by
 * `npm run build-market-rents` (scripts/build-market-rents.ts), which
 * calls the HUD API using HUD_API_KEY and the county map in
 * lib/markets/city-geo.ts.
 *
 * Keyed by MarketCity.slug. Empty until the script is run; the
 * /markets/[city] template falls back to the hand-authored estimate
 * range (MarketCity.typicalRent) for any slug missing here.
 *
 * Refresh annually — HUD updates FMR once a year.
 */

export type HudRent = {
  /** 2-bedroom Fair Market Rent (monthly USD). */
  rent2br: number;
  /** 3-bedroom Fair Market Rent (monthly USD). */
  rent3br: number;
  /** HUD FMR data year. */
  year: number;
};

export const HUD_RENTS: Record<string, HudRent> = {};
