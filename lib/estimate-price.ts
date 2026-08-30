/**
 * Rough purchase-price estimate from monthly rent.
 *
 * Purpose: when a cold visitor types an address in the homepage hero, we
 * can start rent (HUD) and rate (FRED), while tax stays manual — but NOT the
 * asking price, which only the listing knows. To honor the product
 * promise ("type an address → get a verdict") we estimate a plausible
 * starting price from the address-specific rent so the analyzer can show
 * an INSTANT, clearly-labeled verdict the visitor then refines with the
 * real number. This is intentionally approximate; it never persists and
 * is always presented as an estimate the user should replace.
 *
 * Method: a disclosed, editable price-to-rent placeholder (price ÷ annual
 * rent). It deliberately does not use the hand-curated state registry: those
 * records are not an authoritative current price source. The asking price is
 * property-specific and must replace this placeholder before reliance.
 *
 * Pure + dependency-light so it's unit-tested and safe to import anywhere.
 */

/** Explicit screening placeholder, not a national average or market fact. */
export const NATIONAL_PRICE_TO_RENT = 15;

export type PriceEstimate = {
  /** Estimated purchase price, rounded to the nearest $5,000. */
  price: number;
  /** Price-to-rent multiple (annual) actually used. */
  ratio: number;
  /** Human-readable disclosure shown beside the placeholder. */
  basis: string;
};

/**
 * Estimate a purchase price from monthly rent (+ optional state).
 * Returns null when rent isn't a usable positive number.
 *
 * @param input.monthlyRent gross monthly rent (e.g. HUD FMR)
 * @param input.state       state as 2-letter abbr, full name, or slug
 *                          (matched case-insensitively); optional
 */
export function estimatePurchasePrice(input: {
  monthlyRent: number;
  state?: string;
}): PriceEstimate | null {
  const rent = Number(input.monthlyRent);
  if (!Number.isFinite(rent) || rent <= 0) return null;

  const annualRent = rent * 12;

  const ratio = NATIONAL_PRICE_TO_RENT;
  const basis = `editable ${NATIONAL_PRICE_TO_RENT}x annual-rent screening placeholder; replace with asking price`;

  // Round to the nearest $5,000 so it reads as an estimate, not a precise
  // figure — reinforcing that the user should replace it.
  const price = Math.round((annualRent * ratio) / 5000) * 5000;
  return { price, ratio, basis };
}
