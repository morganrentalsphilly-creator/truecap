import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPricingPriceAvailability,
  decideCheckoutResumeAvailability,
  parseDisplayPriceAmount,
} from "@/lib/pricing-price-availability";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("pricing display-price availability", () => {
  it("accepts currency amounts and rejects missing, zero, or plan-name fallbacks", () => {
    expect(parseDisplayPriceAmount({ amountLabel: "$29.99", period: "month" })).toBe(29.99);
    expect(parseDisplayPriceAmount({ amountLabel: "€1,200.50", period: "year" })).toBe(1_200.5);
    expect(parseDisplayPriceAmount(null)).toBeNull();
    expect(parseDisplayPriceAmount({ amountLabel: "$0", period: "month" })).toBeNull();
    expect(parseDisplayPriceAmount({ amountLabel: "TrueCap Pro", period: "month" })).toBeNull();
    expect(parseDisplayPriceAmount({ amountLabel: "Agent Pro", period: "year" })).toBeNull();
  });

  it("tracks availability independently for every exact checkout slot", () => {
    expect(
      buildPricingPriceAvailability({
        pro_monthly: { amountLabel: "$29.99", period: "month" },
        pro_annual: null,
        agent_pro_monthly: { amountLabel: "$79", period: "month" },
        agent_pro_annual: { amountLabel: "Agent Pro", period: "year" },
      })
    ).toEqual({
      pro_monthly: true,
      pro_annual: false,
      agent_pro_monthly: true,
      agent_pro_annual: false,
    });
  });

  it("blocks direct and resumed checkout before the billing action when a price is unavailable", () => {
    const source = read("components/marketing/pricing-plan-buttons.tsx");
    const directGuard = source.indexOf("if (!priceAvailability[planSlug])");
    const checkoutAction = source.indexOf("const result = await createCheckoutSessionAction");
    const resumeGuard = source.indexOf("decideCheckoutResumeAvailability(");
    const resumeCheckout = source.indexOf("startCheckout(resume.plan");
    const intentConsumed = source.indexOf("window.history.replaceState(");

    expect(directGuard).toBeGreaterThan(0);
    expect(directGuard).toBeLessThan(checkoutAction);
    expect(resumeGuard).toBeGreaterThan(0);
    expect(resumeGuard).toBeLessThan(resumeCheckout);
    expect(intentConsumed).toBeLessThan(resumeGuard);
    expect(source).toContain("Checkout temporarily unavailable");
    expect(source).toContain("Retry price");
    expect(source).toContain("no checkout was started");
  });

  it("preserves current-subscriber Billing management before the unavailable checkout branch", () => {
    const source = read("components/marketing/pricing-plan-buttons.tsx");
    expect(source.indexOf('paidCardDecision.kind !== "checkout"')).toBeLessThan(
      source.indexOf("checkoutUnavailablePlan")
    );
    expect(source).toContain('href="/profile#billing"');
  });

  it("never substitutes a plan name into the amount position", () => {
    const source = read("components/marketing/pricing-toggle-plans.tsx");
    expect(source).not.toContain("monthly?.amountLabel ?? proOfferName");
    expect(source).not.toContain('agentMonthly?.amountLabel ?? "Agent Pro"');
    expect(source).not.toContain("annual?.amountLabel ?? proOfferName");
    expect(source).toContain("Price temporarily unavailable");
  });

  it("states the exact downgrade editing boundary", () => {
    const source = read("app/pricing/page.tsx");
    expect(source).toContain("you can open a saved deal and test changes");
    expect(source).toContain("saving updates to that existing deal requires Pro");
    expect(source).not.toContain("you'll lose the ability to edit them");
  });
});

describe("checkout resume price failures", () => {
  const availability = buildPricingPriceAvailability({
    pro_monthly: { amountLabel: "$29.99", period: "month" },
    pro_annual: null,
    agent_pro_monthly: { amountLabel: "$59.99", period: "month" },
    agent_pro_annual: { amountLabel: "$590", period: "year" },
  });

  it("keeps a healthy mounted cadence usable when the requested cadence failed", () => {
    expect(
      decideCheckoutResumeAvailability(
        "pro_monthly",
        "pro_annual",
        availability
      )
    ).toBe("keep_current");
  });

  it("disables only the requested cadence when it is the mounted choice", () => {
    expect(
      decideCheckoutResumeAvailability(
        "pro_annual",
        "pro_annual",
        availability
      )
    ).toBe("disable_current");
  });

  it("resumes when the requested Stripe price is available", () => {
    expect(
      decideCheckoutResumeAvailability(
        "pro_monthly",
        "pro_monthly",
        availability
      )
    ).toBe("resume");
  });
});
