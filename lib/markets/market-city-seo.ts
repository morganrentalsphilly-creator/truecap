/**
 * SEO string builders for the programmatic /markets/[city] pages —
 * extracted from the page template so the length contracts are
 * unit-testable (lib/__tests__/markets-data-bar.test.ts).
 *
 * Target query: "Is [City] a good place to buy rental property?" The page
 * answers with an evidence boundary and checked-in HUD context, not an
 * unsourced citywide investment verdict.
 */

/** Pre-template SERP title budget — layout appends " | TrueCap". */
export const MARKET_TITLE_MAX = 50;

/**
 * Question-first metadata title, guaranteed ≤ MARKET_TITLE_MAX chars
 * before the layout template. Long city names (e.g. "Colorado Springs")
 * fall back to the shorter "Rentals?" phrasing.
 */
export function buildMarketCityTitle(cityName: string): string {
  const full = `Is ${cityName} Good for Rental Property? (2026)`;
  if (full.length <= MARKET_TITLE_MAX) return full;
  return `Is ${cityName} Good for Rentals? (2026)`;
}

export type MarketVerdictTone = "cashflow" | "appreciation" | "balanced" | null;

/**
 * Retained for call-site compatibility. Stale-review market tones must never
 * become public verdict copy.
 */
export function marketVerdictPhrase(tone: MarketVerdictTone): string {
  void tone;
  return "Review the property-specific evidence.";
}

/** Question-first meta description; worst case stays under ~160 chars. */
export function buildMarketCityDescription(
  cityName: string,
  tone: MarketVerdictTone,
): string {
  void tone;
  return `Is ${cityName} good for rental property? Review HUD area rent context and property-specific evidence—no citywide investment verdict.`;
}
