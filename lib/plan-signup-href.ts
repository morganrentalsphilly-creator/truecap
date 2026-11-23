/**
 * Where a signed-out visitor goes from a paid plan's call to action: the
 * sign-up page, carrying the plan and billing period they were looking at
 * and the page to open after sign-up. One builder, so the /pricing cards and
 * the homepage's Pro card (2026-11 ads pass, E2) link the same URL.
 *
 * A plain module (no "use client"): server components call it too.
 */
export type SignupPlan = "investor-pro" | "agent-pro";
export type SignupBilling = "monthly" | "annual";

export function planSignupHref(plan: SignupPlan, billing: SignupBilling): string {
  return `/auth/sign-up?plan=${plan}&billing=${billing}&next=${encodeURIComponent("/dashboard/new")}`;
}

/**
 * The Pro card's label for a signed-out visitor, on the homepage and on
 * /pricing. One name for the no-card trial everywhere it is offered.
 */
export const PRO_TRIAL_CTA_LABEL = "Start free trial, no card";
