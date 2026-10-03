/**
 * Trial-end annual offer (docs/funnel-leaks-plan.md Phase B, steps T4/T5).
 *
 * 50% off the first year of Pro annual (founder decision 2026-10-03; the
 * brief's original "two months free" was replaced), open on days 18–23 of the no-card
 * evaluation. The discount is a Stripe coupon the founder creates in the
 * dashboard; its id arrives in TRIAL_END_ANNUAL_COUPON. Nothing here creates
 * or edits a coupon.
 *
 * ENFORCED SERVER-SIDE: createCheckoutSessionAction asks this resolver with
 * the signed-in user's own product_evaluations.started_at. There is no code
 * in the URL to share or replay — a checkout outside the window, on any plan
 * other than Pro annual, or with the flag off simply gets the normal price.
 * Pro annual only (founder decision 2026-10-03).
 *
 * The same predicate (`trialEndOfferConfigured`) decides whether T4/T5 may
 * mention the offer, so an email can never promise a discount checkout
 * cannot apply.
 */

import { isFunnelFlagOn } from "@/lib/funnel-flags";
import { isWithinTrialEndOfferWindow } from "@/lib/funnel-sequences";

type Env = Record<string, string | undefined>;

export const TRIAL_END_OFFER_PLAN_SLUG = "pro_annual";

export function trialEndOfferConfigured(env: Env = process.env): boolean {
  return isFunnelFlagOn("FUNNEL_SEQUENCES", env) && Boolean(env.TRIAL_END_ANNUAL_COUPON?.trim());
}

/** The Stripe coupon id to apply to this checkout, or null. */
export function resolveTrialEndAnnualCoupon(input: {
  planSlug: string;
  trialStartedAt: string | null | undefined;
  now?: Date;
  env?: Env;
}): string | null {
  const env = input.env ?? process.env;
  if (!trialEndOfferConfigured(env)) return null;
  if (input.planSlug !== TRIAL_END_OFFER_PLAN_SLUG) return null;
  if (!isWithinTrialEndOfferWindow(input.trialStartedAt, input.now ?? new Date())) return null;
  return env.TRIAL_END_ANNUAL_COUPON!.trim();
}
