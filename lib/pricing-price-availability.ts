import {
  CHECKOUT_PLAN_SLUGS,
  type CheckoutPlanSlug,
} from "@/lib/pricing-checkout-resume";

export type DisplayPriceLike = { amountLabel: string; period: string } | null;
export type PricingPriceAvailability = Record<CheckoutPlanSlug, boolean>;

/**
 * Accept only a currency-style numeric label. A malformed fallback such as a
 * plan name must never occupy the dollar-amount position on a pricing card.
 */
export function parseDisplayPriceAmount(price: DisplayPriceLike): number | null {
  if (!price) return null;
  const match = price.amountLabel.trim().match(/^(?:US)?[$€£]\s*([\d,]+(?:\.\d{1,2})?)$/);
  if (!match) return null;
  const amount = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function buildPricingPriceAvailability(prices: {
  pro_monthly: DisplayPriceLike;
  pro_annual: DisplayPriceLike;
  agent_pro_monthly: DisplayPriceLike;
  agent_pro_annual: DisplayPriceLike;
}): PricingPriceAvailability {
  return Object.fromEntries(
    CHECKOUT_PLAN_SLUGS.map((slot) => [
      slot,
      parseDisplayPriceAmount(prices[slot]) != null,
    ])
  ) as PricingPriceAvailability;
}

export type CheckoutResumeAvailabilityDecision =
  | "resume"
  | "disable_current"
  | "keep_current";

/**
 * A checkout return is claimed by the tier family, even when the page has
 * remounted on the other billing cadence. If the requested cadence is down,
 * keep a healthy mounted cadence usable instead of poisoning both choices.
 */
export function decideCheckoutResumeAvailability(
  mountedSlot: CheckoutPlanSlug,
  requestedPlan: CheckoutPlanSlug,
  availability: PricingPriceAvailability
): CheckoutResumeAvailabilityDecision {
  if (availability[requestedPlan]) return "resume";
  return mountedSlot === requestedPlan ? "disable_current" : "keep_current";
}
