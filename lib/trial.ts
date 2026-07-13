/**
 * Single source of truth for the Pro free-trial length. Shared by the Stripe
 * checkout default (app/actions/billing.ts) and all marketing copy so the
 * promise and the behavior never drift.
 *
 * Runtime behavior can still be overridden server-side via the PRO_TRIAL_DAYS
 * env var. If you change the trial length, change TRIAL_DAYS here too so the
 * copy matches what checkout actually grants.
 */
export const TRIAL_DAYS = 3;
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
