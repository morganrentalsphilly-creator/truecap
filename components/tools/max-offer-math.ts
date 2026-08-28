/**
 * Shared 70%-rule max-offer math for the free tool widgets.
 *
 * One implementation, two consumers: the ARV calculator widget
 * (computes ARV from comps, then the price screen) and the 70% rule
 * calculator widget (takes ARV directly). Extracted so the rule
 * page can't drift from the ARV page's arithmetic.
 *
 *   70%-rule price screen = (ARV × multiplier%) − repair costs
 *
 * Like lib/max-allowable-offer.ts, a positive offer is rounded DOWN
 * to a $500 step — never up, so the widgets never quote a price above
 * the rule's own ceiling. Non-positive results are returned as-is so
 * callers can show "no workable offer" messaging.
 */

export function computeRuleMaxOffer(
  arv: number,
  multiplierPct: number,
  repairCosts: number
): number {
  const raw = arv * (multiplierPct / 100) - repairCosts;
  return raw > 0 ? Math.floor(raw / 500) * 500 : raw;
}
