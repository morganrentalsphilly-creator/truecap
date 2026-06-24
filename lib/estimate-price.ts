/**
 * Rough purchase-price estimate from monthly rent.
 *
 * Purpose: when a cold visitor types an address in the homepage hero, we
 * can auto-fill rent (HUD), rate (FRED), and tax (state) — but NOT the
 * asking price, which only the listing knows. To honor the product
 * promise ("type an address → get a verdict") we estimate a plausible
 * starting price from the address-specific rent so the analyzer can show
 * an INSTANT, clearly-labeled verdict the visitor then refines with the
 * real number. This is intentionally approximate; it never persists and
 * is always presented as an estimate the user should replace.
 *
 * Method: a price-to-rent multiple (price ÷ annual rent). Market-aware
 * when the state is known — derived from lib/states.ts median home price
 * and median rent — with a national fallback otherwise. The result scales
 * with the real local rent (HUD county FMR), so a cheap Midwest market and
 * an expensive coastal one land in different ballparks.
 *
 * Pure + dependency-light so it's unit-tested and safe to import anywhere.
 */

import { STATES } from "@/lib/states";

/** National-ish price-to-rent multiple (annual rent) used when the state
 *  is unknown or its data is out of band. Deliberately mid-range. */
export const NATIONAL_PRICE_TO_RENT = 15;

/** Sane band for a state-derived ratio — guards against a quirky data
 *  point producing an absurd price. Outside this, fall back to national. */
const MIN_RATIO = 6;
const MAX_RATIO = 35;

export type PriceEstimate = {
  /** Estimated purchase price, rounded to the nearest $5,000. */
  price: number;
  /** Price-to-rent multiple (annual) actually used. */
  ratio: number;
  /** Human-readable basis, e.g. "Texas price-to-rent (~15x rent)". */
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

  let ratio = NATIONAL_PRICE_TO_RENT;
  let basis = `national average (~${NATIONAL_PRICE_TO_RENT}x annual rent)`;

  const key = input.state?.trim().toLowerCase();
  if (key) {
    const state = Object.values(STATES).find(
      (s) =>
        s.abbr.toLowerCase() === key ||
        s.name.toLowerCase() === key ||
        s.slug.toLowerCase() === key
    );
    if (state && state.medianRent > 0 && state.medianHomePrice > 0) {
      const stateRatio = state.medianHomePrice / (state.medianRent * 12);
      if (Number.isFinite(stateRatio) && stateRatio >= MIN_RATIO && stateRatio <= MAX_RATIO) {
        ratio = stateRatio;
        basis = `${state.name} price-to-rent (~${Math.round(stateRatio)}x rent)`;
      }
    }
  }

  // Round to the nearest $5,000 so it reads as an estimate, not a precise
  // figure — reinforcing that the user should replace it.
  const price = Math.round((annualRent * ratio) / 5000) * 5000;
  return { price, ratio, basis };
}
