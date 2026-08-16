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

export type PricingCardCtaDecision =
  | { kind: "checkout"; label: null }
  | { kind: "current"; label: "Manage current plan" }
  | { kind: "billing"; label: string };

function pricingTier(slug: string | null | undefined): "pro" | "agent_pro" | null {
  if (slug?.startsWith("agent_pro_")) return "agent_pro";
  if (slug?.startsWith("pro_")) return "pro";
  return null;
}

/**
 * Subscriber-safe CTA presentation for public pricing cards.
 *
 * Any live subscription—recognized or not—routes to Billing. Only a user with
 * no live paid plan may start Checkout. That keeps an Agent Pro customer from
 * seeing Pro marked current and prevents every non-current card from becoming
 * a second-subscription path.
 */
export function decidePricingCardCta(
  activePlanSlug: string | null | undefined,
  targetPlanSlug: string
): PricingCardCtaDecision {
  if (!activePlanSlug) return { kind: "checkout", label: null };
  if (activePlanSlug === targetPlanSlug) {
    return { kind: "current", label: "Manage current plan" };
  }

  const activeTier = pricingTier(activePlanSlug);
  const targetTier = pricingTier(targetPlanSlug);
  if (!activeTier || !targetTier) {
    return { kind: "billing", label: "Manage subscription" };
  }
  if (activeTier === targetTier) {
    return {
      kind: "billing",
      label: targetPlanSlug.endsWith("_annual")
        ? "Switch to annual billing"
        : "Switch to monthly billing",
    };
  }
  if (activeTier === "pro" && targetTier === "agent_pro") {
    return { kind: "billing", label: "Upgrade to Agent Pro" };
  }
  return { kind: "billing", label: "Switch to TrueCap Pro" };
}
