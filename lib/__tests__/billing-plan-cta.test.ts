import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decidePlanCta, decidePricingCardCta } from "@/lib/billing-plan-cta";
import { getPrimaryPlanPriceId } from "@/lib/stripe/plan-prices";

const ORIG_MONTHLY = process.env.STRIPE_PRICE_PRO_MONTHLY;
const ORIG_ANNUAL = process.env.STRIPE_PRICE_PRO_ANNUAL;
const ROOT = join(__dirname, "..", "..");

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

describe("decidePricingCardCta — exact plan and tier messaging", () => {
  it("allows checkout only when there is no live paid plan", () => {
    expect(decidePricingCardCta(null, "pro_monthly")).toEqual({
      kind: "checkout",
      label: null,
    });
    expect(decidePricingCardCta(null, "agent_pro_monthly")).toEqual({
      kind: "checkout",
      label: null,
    });
  });

  it.each([
    "pro_monthly",
    "pro_annual",
    "agent_pro_monthly",
    "agent_pro_annual",
  ])("marks only the exact plan current: %s", (slug) => {
    expect(decidePricingCardCta(slug, slug)).toEqual({
      kind: "current",
      label: "Manage current plan",
    });
  });

  it("describes same-tier billing-period switches accurately", () => {
    expect(decidePricingCardCta("pro_monthly", "pro_annual")).toEqual({
      kind: "billing",
      label: "Switch to annual billing",
    });
    expect(decidePricingCardCta("agent_pro_annual", "agent_pro_monthly")).toEqual({
      kind: "billing",
      label: "Switch to monthly billing",
    });
  });

  it("distinguishes the Agent Pro upgrade from a switch back to Pro", () => {
    expect(decidePricingCardCta("pro_monthly", "agent_pro_monthly")).toEqual({
      kind: "billing",
      label: "Upgrade to Agent Pro",
    });
    expect(decidePricingCardCta("agent_pro_monthly", "pro_monthly")).toEqual({
      kind: "billing",
      label: "Switch to TrueCap Pro",
    });
  });

  it("fails safe to billing for an unrecognized live paid plan", () => {
    expect(decidePricingCardCta("legacy_paid", "pro_monthly")).toEqual({
      kind: "billing",
      label: "Manage subscription",
    });
  });

  it("wires the server's exact plan slug through both pricing cards", () => {
    const page = readFileSync(join(ROOT, "app/pricing/page.tsx"), "utf8");
    const plans = readFileSync(
      join(ROOT, "components/marketing/pricing-toggle-plans.tsx"),
      "utf8"
    );
    const buttons = readFileSync(
      join(ROOT, "components/marketing/pricing-plan-buttons.tsx"),
      "utf8"
    );

    expect(page).toContain("getActivePaidPlanSlug(supabase, user.id)");
    expect(page).toContain("activePaidPlanSlug={activePaidPlanSlug}");
    expect(plans).toContain("proCardDecision.kind === \"current\"");
    expect(plans).toContain("agentCardDecision.kind === \"current\"");
    expect(buttons).toContain("decidePricingCardCta(activePaidPlanSlug, slot)");
    expect(buttons).not.toContain("if (isPaid)");
  });
});
