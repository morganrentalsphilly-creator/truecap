import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * lib/stripe/display-prices.ts: the Stripe read behind /pricing, /for-agents
 * and /profile is memoised (unstable_cache, keyed by price id) while the
 * fail-closed behaviour stays OUTSIDE the cache — a failed read or a
 * catalog mismatch yields null every time and is never memoised.
 */
const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  getStripe: vi.fn(),
  cacheOptions: [] as unknown[],
  revalidateTag: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock("next/cache", () => ({
  // Pass-through that records the options; the real primitive needs a Next
  // request scope, and what matters here is which work sits inside it.
  unstable_cache: (fn: (...args: unknown[]) => unknown, _keys: string[], options: unknown) => {
    mocks.cacheOptions.push(options);
    return fn;
  },
  revalidateTag: mocks.revalidateTag,
}));
vi.mock("@/lib/stripe/client", () => ({
  getStripe: (options: unknown) => {
    mocks.getStripe(options);
    return { prices: { retrieve: mocks.retrieve } };
  },
}));
vi.mock("@/lib/stripe/plan-prices", () => ({
  getPrimaryPlanPriceId: (slug: string) => `price_${slug}`,
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
  captureMessage: mocks.captureMessage,
}));

import {
  loadStripeDisplayPrice,
  loadStripeDisplayPriceById,
  revalidateStripeDisplayPrices,
  STRIPE_DISPLAY_PRICE_CACHE_TAG,
} from "@/lib/stripe/display-prices";
import { stripePriceMatchesCatalog } from "@/lib/public-pricing";

const proMonthly = {
  active: true,
  currency: "usd",
  type: "recurring",
  unit_amount: 2999,
  recurring: { interval: "month" },
};

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_display";
  mocks.retrieve.mockReset();
  mocks.getStripe.mockClear();
  mocks.revalidateTag.mockClear();
  mocks.captureException.mockClear();
  mocks.captureMessage.mockClear();
});

describe("Stripe display prices", () => {
  it("wraps only the Stripe read in a tagged 10-minute cache with a bounded timeout", () => {
    expect(mocks.cacheOptions).toEqual([
      { revalidate: 600, tags: [STRIPE_DISPLAY_PRICE_CACHE_TAG] },
    ]);
  });

  it("returns the catalog price when Stripe matches the committed catalog", async () => {
    // Pin against the real catalog so a drifted fixture cannot pass silently.
    expect(stripePriceMatchesCatalog("pro_monthly", proMonthly)).toBe(true);
    mocks.retrieve.mockResolvedValue(proMonthly);
    const price = await loadStripeDisplayPrice("pro_monthly");
    expect(price).toEqual({
      amountLabel: "$29.99",
      period: "month",
      currency: "USD",
      unitAmount: 29.99,
    });
    expect(mocks.retrieve).toHaveBeenCalledWith("price_pro_monthly");
    expect(mocks.getStripe).toHaveBeenCalledWith({ timeout: 5_000, maxNetworkRetries: 1 });
  });

  it("fails closed on a catalog mismatch, outside the cache", async () => {
    mocks.retrieve.mockResolvedValue({ ...proMonthly, unit_amount: 1999 });
    expect(await loadStripeDisplayPrice("pro_monthly")).toBeNull();
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the Stripe read throws, without caching the failure", async () => {
    mocks.retrieve.mockRejectedValue(new Error("stripe down"));
    expect(await loadStripeDisplayPrice("pro_monthly")).toBeNull();
    expect(await loadStripeDisplayPriceById("price_x", "month")).toBeNull();
    expect(mocks.captureException).toHaveBeenCalledTimes(2);
    // Each call reached Stripe again: the rejection was not memoised.
    expect(mocks.retrieve).toHaveBeenCalledTimes(2);
  });

  it("formats an arbitrary price by id with the fallback period", async () => {
    mocks.retrieve.mockResolvedValue({ ...proMonthly, unit_amount: 5000, recurring: null });
    expect(await loadStripeDisplayPriceById("price_x", "year")).toEqual({
      amountLabel: "$50",
      period: "year",
      currency: "USD",
      unitAmount: 50,
    });
  });

  it("revalidates the display-price tag for the webhook", () => {
    revalidateStripeDisplayPrices();
    expect(mocks.revalidateTag).toHaveBeenCalledWith(STRIPE_DISPLAY_PRICE_CACHE_TAG, "max");
  });
});
