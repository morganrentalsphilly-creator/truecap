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
