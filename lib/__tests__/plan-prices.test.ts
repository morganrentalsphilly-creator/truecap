import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PAID_PLAN_SLUGS, getAllPlanPriceIds, getPrimaryPlanPriceId, isAgentProConfigured, planSlugFromPriceId, type PaidPlanSlug } from "@/lib/stripe/plan-prices";

const ORIG_MONTHLY = process.env.STRIPE_PRICE_PRO_MONTHLY;
const ORIG_ANNUAL = process.env.STRIPE_PRICE_PRO_ANNUAL;

function setEnv(monthly?: string, annual?: string) {
  if (monthly === undefined) delete process.env.STRIPE_PRICE_PRO_MONTHLY;
  else process.env.STRIPE_PRICE_PRO_MONTHLY = monthly;
  if (annual === undefined) delete process.env.STRIPE_PRICE_PRO_ANNUAL;
  else process.env.STRIPE_PRICE_PRO_ANNUAL = annual;
}

afterEach(() => {
  setEnv(ORIG_MONTHLY, ORIG_ANNUAL);
});

describe("plan-prices resolution", () => {
  it("single value behaves exactly as before (backward compatible)", () => {
    setEnv("price_month", "price_year");
    expect(getPrimaryPlanPriceId("pro_monthly")).toBe("price_month");
    expect(getAllPlanPriceIds("pro_monthly")).toEqual(["price_month"]);
    expect(planSlugFromPriceId("price_month")).toBe("pro_monthly");
    expect(planSlugFromPriceId("price_year")).toBe("pro_annual");
    expect(planSlugFromPriceId("price_unknown")).toBeNull();
  });

  it("comma list: primary is first, ALL ids resolve to the plan (grandfathering)", () => {
    // The 2026-07 incident class: list price moved to $29.99 but 2 users
    // stay on the old $20 price — both must still resolve to Pro.
    setEnv("price_2999,price_grandfathered_20", "price_300");
    // Checkout / display use only the current price.
    expect(getPrimaryPlanPriceId("pro_monthly")).toBe("price_2999");
    // Webhook resolution recognizes BOTH.
    expect(planSlugFromPriceId("price_2999")).toBe("pro_monthly");
    expect(planSlugFromPriceId("price_grandfathered_20")).toBe("pro_monthly");
    expect(getAllPlanPriceIds("pro_monthly")).toEqual(["price_2999", "price_grandfathered_20"]);
  });

  it("trims whitespace and ignores empty entries", () => {
    setEnv(" price_a , , price_b ", " price_c ,");
    expect(getAllPlanPriceIds("pro_monthly")).toEqual(["price_a", "price_b"]);
    expect(getPrimaryPlanPriceId("pro_annual")).toBe("price_c");
    expect(planSlugFromPriceId("price_b")).toBe("pro_monthly");
  });

  it("unset env → null primary, empty list, null slug", () => {
    setEnv(undefined, undefined);
    expect(getPrimaryPlanPriceId("pro_monthly")).toBeNull();
    expect(getAllPlanPriceIds("pro_monthly")).toEqual([]);
    expect(planSlugFromPriceId("price_anything")).toBeNull();
    expect(planSlugFromPriceId(null)).toBeNull();
  });
});

describe("agent pro slugs (2026-08 tier)", () => {
  const AGENT_ENV = ["STRIPE_PRICE_AGENT_PRO_MONTHLY", "STRIPE_PRICE_AGENT_PRO_ANNUAL"] as const;
  afterEach(() => {
    for (const k of AGENT_ENV) delete process.env[k];
  });

  it("planSlugFromPriceId resolves agent prices — the incident-class resolver must know every tier", () => {
    process.env.STRIPE_PRICE_AGENT_PRO_MONTHLY = "price_agent_59,price_agent_legacy";
    process.env.STRIPE_PRICE_AGENT_PRO_ANNUAL = "price_agent_590";
    expect(planSlugFromPriceId("price_agent_59")).toBe("agent_pro_monthly");
    expect(planSlugFromPriceId("price_agent_legacy")).toBe("agent_pro_monthly");
    expect(planSlugFromPriceId("price_agent_590")).toBe("agent_pro_annual");
  });

  it("PAID_PLAN_SLUGS enumerates every member of the PaidPlanSlug union", () => {
    // The resolver iterates this list; a slug missing from it silently
    // downgrades that tier's subscribers to Free on webhook sync.
    const bag: Record<PaidPlanSlug, true> = {
      pro_monthly: true,
      pro_annual: true,
      agent_pro_monthly: true,
      agent_pro_annual: true,
    };
    expect([...PAID_PLAN_SLUGS].sort()).toEqual(Object.keys(bag).sort());
  });

  it("isAgentProConfigured tracks the monthly env var", () => {
    expect(isAgentProConfigured()).toBe(false);
    process.env.STRIPE_PRICE_AGENT_PRO_MONTHLY = "price_agent_59";
    expect(isAgentProConfigured()).toBe(true);
  });
});
