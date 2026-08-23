import "server-only";

import * as Sentry from "@sentry/nextjs";
import { getStripe } from "@/lib/stripe/client";
import { getPrimaryPlanPriceId, type PaidPlanSlug } from "@/lib/stripe/plan-prices";

/** Stripe is the source of truth for every recurring price shown publicly. */
export type StripeDisplayPriceDetails = {
  amountLabel: string;
  period: string;
  currency: string;
  /** Dollars, not cents; safe for user-entered ROI/time-value math. */
  unitAmount: number;
};

export type StripeDisplayPrice = StripeDisplayPriceDetails | null;

export async function loadStripeDisplayPriceById(
  priceId: string | null | undefined,
  fallbackPeriod: string,
  context: string = "subscription"
): Promise<StripeDisplayPrice> {
  if (!priceId || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const price = await getStripe().prices.retrieve(priceId);
    if (price.unit_amount == null) return null;
    return {
      amountLabel: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: price.currency,
        maximumFractionDigits: price.unit_amount % 100 === 0 ? 0 : 2,
      }).format(price.unit_amount / 100),
      period: price.recurring?.interval ?? fallbackPeriod,
      currency: price.currency.toUpperCase(),
      unitAmount: price.unit_amount / 100,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "billing-price-display" },
      // Price ids contain no customer or payment data, but keep the context
      // coarse so this diagnostic never grows into a billing-data payload.
      extra: { context },
    });
    return null;
  }
}

export async function loadStripeDisplayPrice(slug: PaidPlanSlug): Promise<StripeDisplayPrice> {
  const priceId = getPrimaryPlanPriceId(slug);
  return loadStripeDisplayPriceById(
    priceId,
    slug.endsWith("_annual") ? "year" : "month",
    slug
  );
}
