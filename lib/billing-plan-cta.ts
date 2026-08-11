/**
 * Pure decision for what a plan tile's CTA should DO when a user clicks it,
 * given the plan they're currently subscribed to.
 *
 * This is the switch-vs-checkout fork, extracted from the billing UI so it is
 * unit-testable in isolation (a subscriber clicking the OTHER plan must go
 * through Stripe's proration flow, never a fresh checkout that would create a
 * SECOND parallel subscription and double-bill them).
 *
 *  - "current"  → the user is already on this exact plan; button is disabled.
 *  - "switch"   → the user has a live subscription on the OTHER plan; route
 *                 through the subscription-update portal flow (proration).
 *  - "checkout" → no live subscription; start a normal Stripe checkout.
 *
 * `activePlanSlug` is the slug of the user's live (active/trialing/past_due)
 * subscription, or null when they have none (free). Kept as a plain string on
 * the input so callers don't have to narrow before asking.
 */
export type PlanCtaDecision = "current" | "switch" | "checkout";

export function decidePlanCta(
  activePlanSlug: string | null | undefined,
  targetPlanSlug: string
): PlanCtaDecision {
  if (!activePlanSlug) return "checkout";
  if (activePlanSlug === targetPlanSlug) return "current";
  return "switch";
}
