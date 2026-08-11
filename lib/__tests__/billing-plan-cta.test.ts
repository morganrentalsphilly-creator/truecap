import { afterEach, describe, expect, it } from "vitest";
import { decidePlanCta } from "@/lib/billing-plan-cta";
import { getPrimaryPlanPriceId } from "@/lib/stripe/plan-prices";

const ORIG_MONTHLY = process.env.STRIPE_PRICE_PRO_MONTHLY;
const ORIG_ANNUAL = process.env.STRIPE_PRICE_PRO_ANNUAL;

afterEach(() => {
  if (ORIG_MONTHLY === undefined) delete process.env.STRIPE_PRICE_PRO_MONTHLY;
  else process.env.STRIPE_PRICE_PRO_MONTHLY = ORIG_MONTHLY;
  if (ORIG_ANNUAL === undefined) delete process.env.STRIPE_PRICE_PRO_ANNUAL;
  else process.env.STRIPE_PRICE_PRO_ANNUAL = ORIG_ANNUAL;
});

describe("decidePlanCta — switch vs checkout fork", () => {
  it("free user (no active plan) → checkout for either plan", () => {
    expect(decidePlanCta(null, "pro_monthly")).toBe("checkout");
    expect(decidePlanCta(null, "pro_annual")).toBe("checkout");
    expect(decidePlanCta(undefined, "pro_monthly")).toBe("checkout");
  });

  it("subscriber clicking the OTHER plan → switch (never a new checkout)", () => {
    // This is the double-billing guard: a monthly subscriber picking annual
    // (or vice versa) must go through the proration SWITCH flow, not a fresh
    // checkout that would create a second parallel subscription.
    expect(decidePlanCta("pro_monthly", "pro_annual")).toBe("switch");
    expect(decidePlanCta("pro_annual", "pro_monthly")).toBe("switch");
  });

  it("subscriber clicking their CURRENT plan → current (button disabled, no-op)", () => {
    expect(decidePlanCta("pro_monthly", "pro_monthly")).toBe("current");
    expect(decidePlanCta("pro_annual", "pro_annual")).toBe("current");
  });
});

describe("switch target price-id resolution", () => {
  it("resolves the target plan's PRIMARY (current) price for the switch", () => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_month_current";
    process.env.STRIPE_PRICE_PRO_ANNUAL = "price_year_current";
    // A monthly subscriber switching to annual resolves the annual current price.
    expect(decidePlanCta("pro_monthly", "pro_annual")).toBe("switch");
    expect(getPrimaryPlanPriceId("pro_annual")).toBe("price_year_current");
  });

  it("never targets a grandfathered price — only the primary (first) id", () => {
    // Even when the target plan lists a grandfathered id, a switch must land
    // the user on the CURRENT price, not an old one.
    process.env.STRIPE_PRICE_PRO_ANNUAL = "price_year_current,price_year_grandfathered";
    expect(getPrimaryPlanPriceId("pro_annual")).toBe("price_year_current");
  });

  it("unknown target price → null (action must fail loud, not open a broken flow)", () => {
    delete process.env.STRIPE_PRICE_PRO_ANNUAL;
    expect(getPrimaryPlanPriceId("pro_annual")).toBeNull();
  });
});
