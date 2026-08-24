import { describe, expect, it } from "vitest";
import {
  buildDealSummaryContext,
  DEAL_SUMMARY_LIMITS,
  DEAL_SUMMARY_SYSTEM_PROMPT,
  hashDealInput,
} from "../deal-summary";
import { calculateAnalysis } from "../calc-analysis";
import type { InvestmentFormValues } from "../investcalc-schema";

function baseValues(overrides: Partial<InvestmentFormValues> = {}): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "1205 N 5th St, Philadelphia, PA 19122, USA",
    purchasePrice: 245_000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    monthlyRent: 2_100,
    units: [],
    downPaymentPct: 20,
    interestRate: 7,
    loanTermYears: 30,
    closingCostsPct: 3,
    propertyTaxPct: 1.1,
    insuranceInputMode: "percent",
    insurancePct: 0.5,
    maintenancePct: 5,
    vacancyPct: 5,
    mgmtPct: 8,
    capexPct: 5,
    buildingValuePct: 80,
    depreciationYears: 27.5,
    includeInterestDeduction: true,
    taxRatePct: 24,
    expenseGrowthPct: 2,
    rentGrowthPct: 3,
    appreciationRatePct: 3,
    sellingCostPct: 6,
    ...overrides,
  } as InvestmentFormValues;
}

describe("hashDealInput", () => {
  it("is stable for identical inputs", () => {
    expect(hashDealInput(baseValues())).toBe(hashDealInput(baseValues()));
  });

  it("is independent of object key order (same deal ⇒ same cache bucket)", () => {
    const a = { propertyType: "single-family", purchasePrice: 200_000, monthlyRent: 1_800 } as unknown as InvestmentFormValues;
    const b = { monthlyRent: 1_800, purchasePrice: 200_000, propertyType: "single-family" } as unknown as InvestmentFormValues;
    expect(hashDealInput(a)).toBe(hashDealInput(b));
  });

  it("changes when a material input changes", () => {
    expect(hashDealInput(baseValues())).not.toBe(hashDealInput(baseValues({ purchasePrice: 300_000 })));
    expect(hashDealInput(baseValues())).not.toBe(hashDealInput(baseValues({ monthlyRent: 2_500 })));
  });

  it("returns a compact base36 token", () => {
    expect(hashDealInput(baseValues())).toMatch(/^[0-9a-z]+$/);
  });
});

describe("buildDealSummaryContext", () => {
  it("grounds the model in the recomputed numbers (cap rate, cash flow, verdict)", () => {
    const values = baseValues();
    const context = buildDealSummaryContext(values, calculateAnalysis(values));
    expect(context).toContain("Cap rate:");
    expect(context).toContain("Net monthly cash flow:");
    expect(context).toContain("Secondary Screening Index band:");
  });
});

describe("DEAL_SUMMARY constants", () => {
  it("prompt forbids inventing data and caps length", () => {
    expect(DEAL_SUMMARY_SYSTEM_PROMPT).toMatch(/ONLY the provided numbers/i);
    expect(DEAL_SUMMARY_SYSTEM_PROMPT).toMatch(/not a financial advisor/i);
  });

  it("free limit is a small taste, pro is higher", () => {
    expect(DEAL_SUMMARY_LIMITS.free).toBeGreaterThan(0);
    expect(DEAL_SUMMARY_LIMITS.pro).toBeGreaterThan(DEAL_SUMMARY_LIMITS.free);
  });
});
