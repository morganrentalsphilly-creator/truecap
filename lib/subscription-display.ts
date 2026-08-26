import type { StripeDisplayPriceDetails } from "@/lib/stripe/display-prices";
import { formatPublicUsd, PUBLIC_PRO_MONTHLY_USD } from "@/lib/public-pricing";

export type SubscriptionDisplayInput = {
  status: string;
  planSlug: string | null;
  cancelAtPeriodEnd: boolean;
  subscribedPrice: StripeDisplayPriceDetails | null;
  standardMonthlyPrice: StripeDisplayPriceDetails | null;
};

export type SubscriptionDisplayModel = {
  state: "active" | "trialing" | "past_due" | "canceling" | "inactive";
  rateHeadline: string | null;
  detailLines: string[];
  isGrandfatheredTwenty: boolean;
};

const LIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Render Stripe period boundaries identically during server rendering and
 * browser hydration. `current_period_end` is an instant, but leaving the time
 * zone implicit lets Vercel (UTC) and a customer's browser disagree on the
 * calendar date near midnight.
 */
export function formatBillingDate(value?: string | null): string {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function amountPerPeriod(price: StripeDisplayPriceDetails): string {
  return `${price.amountLabel}/${price.period}`;
}

/**
 * Pure subscription presentation policy. It never determines entitlements and
 * never changes billing; it only turns read-only Stripe price data into honest
 * account copy that can be regression-tested without Stripe or Supabase.
 */
export function buildSubscriptionDisplay(
  input: SubscriptionDisplayInput
): SubscriptionDisplayModel {
  const isLive = LIVE_STATUSES.has(input.status);
  const state: SubscriptionDisplayModel["state"] = input.cancelAtPeriodEnd && isLive
    ? "canceling"
    : input.status === "trialing"
      ? "trialing"
      : input.status === "past_due"
        ? "past_due"
        : isLive
          ? "active"
          : "inactive";

  const subscribed = input.subscribedPrice;
  const standard = input.standardMonthlyPrice;
  const isGrandfatheredTwenty = Boolean(
    isLive &&
      input.planSlug === "pro_monthly" &&
      subscribed?.currency === "USD" &&
      subscribed.period === "month" &&
      Math.round(subscribed.unitAmount * 100) === 2_000
  );

  if (isGrandfatheredTwenty) {
    return {
      state,
      rateHeadline: "Grandfathered $20/month rate",
      detailLines: [
        `Standard price: ${
          standard && Math.round(standard.unitAmount * 100) !== 2_000
            ? amountPerPeriod(standard)
            : `${formatPublicUsd(PUBLIC_PRO_MONTHLY_USD)}/month`
        }`,
        "Your rate remains active while this subscription remains active.",
        "Changing plans ends this protected rate.",
      ],
      isGrandfatheredTwenty: true,
    };
  }

  return {
    state,
    rateHeadline: subscribed ? amountPerPeriod(subscribed) : null,
    detailLines:
      state === "inactive" && subscribed
        ? ["This was the rate on your previous subscription."]
        : [],
    isGrandfatheredTwenty: false,
  };
}
