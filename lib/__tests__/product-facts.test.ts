import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CURRENT_DEFAULT_FACTS,
  DATA_SOURCE_FACTS,
  FINANCIAL_PRODUCT_DISCLAIMERS,
  getOneTimePurchaseFacts,
  getPlanFacts,
  getProductAvailabilityFacts,
  PRODUCT_PLAN_FACTS,
  PROPERTY_TAX_FACTS,
  RELEASED_ANALYSIS_STRATEGIES,
  RELEASED_WORKFLOW_FACTS,
} from "@/lib/product-facts";
import { PLAN_CATALOG, formatPublicUsd } from "@/lib/public-pricing";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DEAL_LIMIT,
  PRODUCT_EVALUATION_DAYS,
} from "@/lib/product-access";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("central public product facts", () => {
  it("derives offer names and prices from the executable catalog", () => {
    expect(PRODUCT_PLAN_FACTS.investorPro).toMatchObject({
      name: PLAN_CATALOG.pro_monthly.name,
      monthlyDisplayPrice: formatPublicUsd(
        PLAN_CATALOG.pro_monthly.unitAmountUsd,
      ),
      annualDisplayPrice: formatPublicUsd(
        PLAN_CATALOG.pro_annual.unitAmountUsd,
      ),
      cardRequiredAtCheckout: true,
      autoRenewsUntilCanceled: true,
    });
    expect(PRODUCT_PLAN_FACTS.agentPro).toMatchObject({
      name: PLAN_CATALOG.agent_pro_monthly.name,
      monthlyDisplayPrice: formatPublicUsd(
        PLAN_CATALOG.agent_pro_monthly.unitAmountUsd,
      ),
      annualDisplayPrice: formatPublicUsd(
        PLAN_CATALOG.agent_pro_annual.unitAmountUsd,
      ),
    });
    expect(PRODUCT_PLAN_FACTS.oneTimePurchase).toMatchObject({
      name: PLAN_CATALOG.decision_pack.name,
      catalogDefaultDisplayPrice: formatPublicUsd(
        PLAN_CATALOG.decision_pack.unitAmountUsd,
      ),
      autoRenews: false,
    });
  });

  it("derives evaluation and Free limits from runtime policy catalogs", () => {
    expect(PRODUCT_PLAN_FACTS.evaluation).toMatchObject({
      durationDays: PRODUCT_EVALUATION_DAYS,
      dealLimit: PRODUCT_EVALUATION_DEAL_LIMIT,
      comparisonLimit: PRODUCT_EVALUATION_COMPARISON_LIMIT,
      cardRequired: false,
      autoRenews: false,
    });
    expect(String(PRODUCT_PLAN_FACTS.free.savedDealLimit)).toMatch(/5/);
  });

  it("states the released tax-input behavior without implying parcel data", () => {
    expect(PROPERTY_TAX_FACTS.behavior).toBe("manual");
    expect(PROPERTY_TAX_FACTS.notAutoFilled).toMatch(/does not auto-fill/i);
    expect(PROPERTY_TAX_FACTS.blankFieldBehavior).toContain("1.1%");
    expect(CURRENT_DEFAULT_FACTS.propertyTaxFallback).toContain("1.1%");
    expect(DATA_SOURCE_FACTS.propertyTax).not.toMatch(
      /state average|assessor/i,
    );
  });

  it("publishes only released strategy and workflow facts", () => {
    expect(RELEASED_ANALYSIS_STRATEGIES.map(({ key }) => key)).toEqual([
      "buy-hold",
      "house-hack",
      "wholesale-mao",
      "short-term",
    ]);
    expect(RELEASED_WORKFLOW_FACTS.withheld.map(({ key }) => key)).toEqual([
      "tax_strategy",
      "exit_scenarios",
      "agent_portal",
      "embed_whitelabel",
    ]);
    expect(FINANCIAL_PRODUCT_DISCLAIMERS.join(" ")).toMatch(
      /not an appraisal.*not a recommended offer/i,
    );
  });
});

describe("deployment-specific product availability", () => {
  it("follows the same configured-price and dual-gate predicates as checkout", () => {
    vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "price_pro");
    vi.stubEnv("STRIPE_PRICE_AGENT_PRO_MONTHLY", "price_agent");
    vi.stubEnv("STRIPE_PRICE_AGENT_PRO_ANNUAL", "");
    vi.stubEnv("NEXT_PUBLIC_TRUECAP_DEAL_DECISION_PACK", "true");
    vi.stubEnv("TRUECAP_DECISION_PACK_CHECKOUT_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT", "current");
    vi.stubEnv("STRIPE_PRICE_SINGLE_DEAL_9", "price_pack");

    expect(getProductAvailabilityFacts()).toEqual({
      investorPro: true,
      agentPro: true,
      oneTimePurchase: true,
    });
    expect(getPlanFacts().singleDeal).toContain("non-renewing $9");
    expect(getPlanFacts().agentPro).toContain("Agent Pro is available");
  });

  it("recognizes annual-only Investor Pro checkout and the selected one-time variant", () => {
    vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "");
    vi.stubEnv("STRIPE_PRICE_PRO_ANNUAL", "price_pro_annual");
    vi.stubEnv("NEXT_PUBLIC_TRUECAP_DEAL_DECISION_PACK", "true");
    vi.stubEnv("TRUECAP_DECISION_PACK_CHECKOUT_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT", "p15");
    vi.stubEnv("STRIPE_PRICE_SINGLE_DEAL_15", "price_pack_15");

    expect(getProductAvailabilityFacts().investorPro).toBe(true);
    expect(getOneTimePurchaseFacts()).toMatchObject({
      displayPrice: "$15",
      amountUsd: 15,
      autoRenews: false,
    });
    expect(getPlanFacts().singleDeal).toContain("non-renewing $15");
    expect(getPlanFacts().pro).toContain("Investor Pro is available");
  });

  it("fails closed when prices or either one-time release gate are missing", () => {
    vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "");
    vi.stubEnv("STRIPE_PRICE_PRO_ANNUAL", "");
    vi.stubEnv("STRIPE_PRICE_AGENT_PRO_MONTHLY", "");
    vi.stubEnv("STRIPE_PRICE_AGENT_PRO_ANNUAL", "");
    vi.stubEnv("NEXT_PUBLIC_TRUECAP_DEAL_DECISION_PACK", "true");
    vi.stubEnv("TRUECAP_DECISION_PACK_CHECKOUT_ENABLED", "false");
    vi.stubEnv("STRIPE_PRICE_SINGLE_DEAL_9", "price_pack");

    expect(getProductAvailabilityFacts()).toEqual({
      investorPro: false,
      agentPro: false,
      oneTimePurchase: false,
    });
    expect(getPlanFacts().agentPro).toMatch(/not configured/i);
    expect(getPlanFacts().pro).toMatch(/not configured/i);
    expect(getPlanFacts().singleDeal).toMatch(/temporarily unavailable/i);
  });
});
