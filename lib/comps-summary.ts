/**
 * Comps → plain-English verdict, shared by the expanded comps card and the
 * COLLAPSED ledger row that fronts it.
 *
 * Why this module exists: the comps card already turned a pulled comp set into
 * actionable warnings ("your rent is 14% above the comp range"), but that
 * verdict lived inside the card — so the collapsed row said only "Comps pulled"
 * and the user had to open it to learn whether the news was good or bad. The
 * row summary now carries the same finding.
 *
 * Both readouts derive from the SAME checks and the SAME thresholds here, so a
 * collapsed row can never contradict the card it fronts (the failure mode this
 * module is designed to prevent: a row reading "sit inside the comp range"
 * above a card warning the rent is 14% high).
 *
 * Pure: no React, no fetch, no quota. Reads only an already-fetched enrichment.
 */
import { checkCompRange } from "@/lib/comp-range-check";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

/**
 * Flag thresholds, in % outside the comp range. Asymmetric on purpose:
 * an OVER-stated rent or price inflates the verdict (the dangerous
 * direction — it makes a bad deal look good), so it trips earlier than an
 * under-stated rent, which is merely an upside note.
 */
export const COMP_RENT_ABOVE_PCT = 5;
export const COMP_PRICE_ABOVE_PCT = 5;
export const COMP_RENT_BELOW_PCT = 8;

const money = (n: number | null) => (n == null ? "—" : `$${Math.round(n).toLocaleString()}`);

/**
 * Actionable warnings when the analyzer's rent/price sit outside the pulled
 * comp ranges — the "make comps actionable" layer rendered inside the card.
 *
 * Moved here from property-comps-card.tsx (behavior unchanged) so the collapsed
 * row summary below can share its exact thresholds.
 */
export function buildCompWarnings(
  data: PropertyEnrichment,
  currentRent: number | null | undefined,
  currentPrice: number | null | undefined
): { tone: "warn" | "info"; text: string }[] {
  const out: { tone: "warn" | "info"; text: string }[] = [];
  const rent = checkCompRange(currentRent, data.rentRange);
  if (rent.status === "above" && rent.pctOutside >= COMP_RENT_ABOVE_PCT) {
    out.push({
      tone: "warn",
      text: `Your ${money(currentRent ?? null)}/mo rent is ${rent.pctOutside}% above the comp range (${money(rent.low)}–${money(rent.high)}). Cash flow may be optimistic - comps support up to about ${money(rent.high)}.`,
    });
  } else if (rent.status === "below" && rent.pctOutside >= COMP_RENT_BELOW_PCT) {
    out.push({
      tone: "info",
      text: `Your ${money(currentRent ?? null)}/mo rent is ${rent.pctOutside}% below the comp range (${money(rent.low)}–${money(rent.high)}) - you may be under-renting.`,
    });
  }
  const price = checkCompRange(currentPrice, data.valueRange);
  if (price.status === "above" && price.pctOutside >= COMP_PRICE_ABOVE_PCT) {
    out.push({
      tone: "warn",
      text: `Your ${money(currentPrice ?? null)} price is ${price.pctOutside}% above the comp value range (${money(price.low)}–${money(price.high)}) - you may be paying above recent sales.`,
    });
  }
  return out;
}

/**
 * One compact line for the COLLAPSED comps row, carrying the finding itself
 * rather than the fact that a pull happened.
 *
 * Priority is worst-news-first: an over-stated rent or price silently inflates
 * the verdict, so it leads over the merely-informational "under-renting" note.
 *
 * @param data  the comp set already on screen (null = nothing pulled yet).
 */
export function buildCompsRowSummary(
  data: PropertyEnrichment | null,
  currentRent: number | null | undefined,
  currentPrice: number | null | undefined
): string {
  if (!data) return "Not run yet — pull comps for this address";

  const rent = checkCompRange(currentRent, data.rentRange);
  const price = checkCompRange(currentPrice, data.valueRange);

  const rentHigh = rent.status === "above" && rent.pctOutside >= COMP_RENT_ABOVE_PCT;
  const priceHigh = price.status === "above" && price.pctOutside >= COMP_PRICE_ABOVE_PCT;
  const rentLow = rent.status === "below" && rent.pctOutside >= COMP_RENT_BELOW_PCT;

  // Both inflated — name both; this is the most misleading combination.
  if (rentHigh && priceHigh) {
    return `Rent ${rent.pctOutside}% and price ${price.pctOutside}% above comps — this deal may be overstated`;
  }
  if (rentHigh) {
    return `Rent ${rent.pctOutside}% above comps — cash flow may be optimistic`;
  }
  if (priceHigh) {
    return `Price ${price.pctOutside}% above recent sales`;
  }
  if (rentLow) {
    return `Rent ${rent.pctOutside}% below comps — you may be under-renting`;
  }

  // Nothing tripped. Only claim "inside the range" when a range actually
  // bounded the check — an unknown range means we verified nothing, and
  // saying otherwise would be a false all-clear.
  const rentChecked = rent.status === "within";
  const priceChecked = price.status === "within";
  if (rentChecked && priceChecked) return "Rent and price both sit inside the comp range";
  if (rentChecked) return "Rent sits inside the comp range";
  if (priceChecked) return "Price sits inside the comp value range";
  return "Comps pulled — see how your rent & price compare";
}
