import { describe, expect, it } from "vitest";

import {
  expectedPlanAmountCents,
  PLAN_CATALOG,
  stripePriceMatchesCatalog,
  type CatalogPaidPlanSlug,
} from "@/lib/public-pricing";

describe("committed public pricing catalog", () => {
  it.each([
    ["pro_monthly", 2_999, "month"],
    ["pro_annual", 30_000, "year"],
    ["agent_pro_monthly", 5_999, "month"],
    ["agent_pro_annual", 59_000, "year"],
  ] as const)("pins %s to its amount and cadence", (slug, cents, interval) => {
    expect(expectedPlanAmountCents(slug)).toBe(cents);
    expect(PLAN_CATALOG[slug].stripeInterval).toBe(interval);
  });

  it("pins every SELLING plan to the amount its live Stripe Price charges", () => {
    // stripePriceMatchesCatalog fails closed on a mismatch: if a committed
    // amount drifts from the live Price, /pricing keeps advertising while
    // checkout returns "temporarily unavailable" — a silent, total loss of
    // revenue on that plan. Moving any of these requires creating the new
    // Stripe Price and repointing its STRIPE_PRICE_* env var in the same
    // release. Values verified against usetruecap.com/pricing on 2026-08-28.
    expect(expectedPlanAmountCents("pro_monthly")).toBe(2_999);
    expect(expectedPlanAmountCents("pro_annual")).toBe(30_000);
    expect(expectedPlanAmountCents("agent_pro_monthly")).toBe(5_999);
    expect(expectedPlanAmountCents("agent_pro_annual")).toBe(59_000);
  });

  it.each(Object.keys(PLAN_CATALOG).filter(
    (slug): slug is CatalogPaidPlanSlug => slug !== "decision_pack",
  ))("accepts only an active recurring USD Price matching %s", (slug) => {
    const matching = {
      active: true,
      currency: "usd",
      type: "recurring",
      unit_amount: expectedPlanAmountCents(slug),
      recurring: { interval: PLAN_CATALOG[slug].stripeInterval },
    };

    expect(stripePriceMatchesCatalog(slug, matching)).toBe(true);
    expect(stripePriceMatchesCatalog(slug, { ...matching, active: false })).toBe(false);
    expect(stripePriceMatchesCatalog(slug, { ...matching, currency: "eur" })).toBe(false);
    expect(stripePriceMatchesCatalog(slug, { ...matching, type: "one_time" })).toBe(false);
    expect(stripePriceMatchesCatalog(slug, { ...matching, unit_amount: matching.unit_amount + 1 })).toBe(false);
    expect(stripePriceMatchesCatalog(slug, { ...matching, recurring: { interval: "day" } })).toBe(false);
  });

  it("fails closed when Stripe omits fields", () => {
    expect(stripePriceMatchesCatalog("pro_monthly", {})).toBe(false);
  });
});
