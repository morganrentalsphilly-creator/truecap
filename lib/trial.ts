/**
 * Single source of truth for the Pro free-trial length. Shared by Stripe
 * checkout (app/actions/billing.ts) and every marketing surface so the promise
 * and the behavior cannot drift behind a deployment-only override.
 */
export const TRIAL_DAYS = 14;
export const TRIAL_LABEL = `${TRIAL_DAYS}-day free trial`;

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
  return !hadPriorSubscription;
}
