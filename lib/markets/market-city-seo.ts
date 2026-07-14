/**
 * SEO string builders for the programmatic /markets/[city] pages —
 * extracted from the page template so the length contracts are
 * unit-testable (lib/__tests__/markets-data-bar.test.ts).
 *
 * Target query (2026 retarget): "Is [City] a good place to buy rental
 * property in 2026?" — the SERP is currently won by moving companies,
 * and TrueCap's city pages have the actual data to answer it.
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

/** Short verdict phrase for the meta description (kept short so the full description stays ≤160 chars). */
export function marketVerdictPhrase(tone: MarketVerdictTone): string {
  switch (tone) {
    case "cashflow":
      return "Yes — it's a cash-flow market.";
    case "appreciation":
      return "It's an appreciation-first market.";
    case "balanced":
      return "Yes — it's a balanced market.";
    default:
      return "Here's the real data.";
  }
}

/** Question-first meta description; worst case stays under ~160 chars. */
export function buildMarketCityDescription(
  cityName: string,
  tone: MarketVerdictTone
): string {
  return `Is ${cityName} a good place to buy rental property in 2026? ${marketVerdictPhrase(
    tone
  )} HUD rents, taxes & cap-rate data — verdict in 60 seconds.`;
}
