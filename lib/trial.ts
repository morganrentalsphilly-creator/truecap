import { PRODUCT_EVALUATION_DAYS } from "@/lib/product-access";

/**
 * Backward-compatible names for older marketing imports. This is a product
 * evaluation, not a Stripe subscription trial: no card is collected and no
 * charge is scheduled when it begins.
 */
export const TRIAL_DAYS = PRODUCT_EVALUATION_DAYS;
export const TRIAL_LABEL = `${TRIAL_DAYS}-day no-card product evaluation`;

/**
 * Mirror of the checkout repeat-trial guard (app/actions/billing.ts:
 * `grantTrial = !priorSubscription` — where priorSubscription is ANY
 * subscription row for the user, any status, including canceled/incomplete).
 * The trial is a first-time offer, so trial-promising copy must run through
 * this check or it lies to returning ex-subscribers whose checkout charges
 * immediately. `hadPriorSubscription` comes from
 * hasAnySubscriptionHistory() in lib/entitlements.ts — the server-computed
 * mirror of that same query. If you change the guard's condition in
 * billing.ts, change this (and the helper) in lockstep.
 */
export function willCheckoutGrantTrial(hadPriorSubscription: boolean): boolean {
  void hadPriorSubscription;
  return false;
}
