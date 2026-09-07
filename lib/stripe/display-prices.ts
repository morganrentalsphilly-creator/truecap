import "server-only";

import * as Sentry from "@sentry/nextjs";
import { revalidateTag, unstable_cache } from "next/cache";
import { getStripe } from "@/lib/stripe/client";
import { getPrimaryPlanPriceId, type PaidPlanSlug } from "@/lib/stripe/plan-prices";
import { stripePriceMatchesCatalog } from "@/lib/public-pricing";

/** Stripe is the source of truth for every recurring price shown publicly. */
export type StripeDisplayPriceDetails = {
  amountLabel: string;
  period: string;
  currency: string;
  /** Dollars, not cents; safe for user-entered ROI/time-value math. */
  unitAmount: number;
};

export type StripeDisplayPrice = StripeDisplayPriceDetails | null;

/**
 * Cache tag for the Stripe price reads behind /pricing, /for-agents and
 * /profile. The Stripe webhook revalidates it on price.* / plan.* events so a
 * price change shows within seconds rather than at the end of the TTL.
 */
export const STRIPE_DISPLAY_PRICE_CACHE_TAG = "stripe-display-prices";
const STRIPE_DISPLAY_PRICE_TTL_SECONDS = 600;
/**
 * A display read must never hold a public page render for the SDK's 80 s
 * default (x retries) during a Stripe incident; a failed read degrades to the
 * existing "Billing setup pending" null fallback instead.
 */
const STRIPE_DISPLAY_READ_TIMEOUT_MS = 5_000;

/**
 * The subset of a Stripe Price the display path reads. Kept small and plain
 * so the cache entry is serialisable and carries no customer data.
 */
type CachedStripePrice = {
  active: boolean;
  currency: string;
  type: string;
  unit_amount: number | null;
  recurring: { interval: string | null } | null;
};

/**
 * The only Stripe round-trip on this path, memoised per price id for the TTL.
 * It THROWS on any failure so a bad read is never cached: `unstable_cache`
 * stores resolved values only, and the callers' try/catch + Sentry + `null`
 * (fail-closed) stay outside the cache. The catalog check also runs outside,
 * per call, so a cached-but-drifted price still fails closed.
 */
const readStripePriceCached = unstable_cache(
  async (priceId: string): Promise<CachedStripePrice> => {
    const price = await getStripe({
      timeout: STRIPE_DISPLAY_READ_TIMEOUT_MS,
      maxNetworkRetries: 1,
    }).prices.retrieve(priceId);
    return {
      active: price.active,
      currency: price.currency,
      type: price.type,
      unit_amount: price.unit_amount,
      recurring: price.recurring ? { interval: price.recurring.interval ?? null } : null,
    };
  },
  ["stripe-display-price"],
  { revalidate: STRIPE_DISPLAY_PRICE_TTL_SECONDS, tags: [STRIPE_DISPLAY_PRICE_CACHE_TAG] }
);

/**
 * Called from the Stripe webhook on price.* / plan.* events. Safe to call
 * from any server context; a revalidation failure is not worth failing the
 * webhook over (the TTL still bounds staleness), so it is reported and
 * swallowed.
 */
export function revalidateStripeDisplayPrices(): void {
  try {
    revalidateTag(STRIPE_DISPLAY_PRICE_CACHE_TAG, "max");
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "billing-price-display", stage: "revalidate" },
    });
  }
}

function toDisplayDetails(
  price: CachedStripePrice,
  unitAmount: number,
  fallbackPeriod: string
): StripeDisplayPriceDetails {
  return {
    amountLabel: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: price.currency,
      maximumFractionDigits: unitAmount % 100 === 0 ? 0 : 2,
    }).format(unitAmount / 100),
    period: price.recurring?.interval ?? fallbackPeriod,
    currency: price.currency.toUpperCase(),
    unitAmount: unitAmount / 100,
  };
}

export async function loadStripeDisplayPriceById(
  priceId: string | null | undefined,
  fallbackPeriod: string,
  context: string = "subscription"
): Promise<StripeDisplayPrice> {
  if (!priceId || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const price = await readStripePriceCached(priceId);
    if (price.unit_amount == null) return null;
    return toDisplayDetails(price, price.unit_amount, fallbackPeriod);
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
  if (!priceId || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const price = await readStripePriceCached(priceId);
    if (!stripePriceMatchesCatalog(slug, price)) {
      Sentry.captureMessage(`billing: Stripe price does not match the committed catalog for ${slug}`, {
        level: "error",
        tags: { feature: "billing-price-display", guard: "catalog-match" },
        extra: { slug },
      });
      return null;
    }
    return toDisplayDetails(
      price,
      price.unit_amount!,
      slug.endsWith("_annual") ? "year" : "month"
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "billing-price-display" },
      extra: { context: slug },
    });
    return null;
  }
}
