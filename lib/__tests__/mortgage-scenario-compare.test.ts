import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "@/lib/calc-analysis";
import { UNDERWRITING_V1_GOLDEN_CORPUS } from "@/lib/__tests__/fixtures/underwriting-v1-golden-corpus";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  buildMortgageScenarioComparisons,
  cloneInvestmentFormValues,
} from "@/lib/mortgage-scenario-compare";

const V2_VALUES: InvestmentFormValues = {
  underwritingModelVersion: "2.0",
  analysisDate: "2026-08-24",
  propertyType: "single-family",
  unitCount: 1,
  address: "12 Exact Annual Way, Philadelphia, PA 19140",
  purchasePrice: 325_000,
  yearBuilt: 1998,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1_450,
  monthlyRent: 9_999,
  units: [],
  operatingScenario: "current",
  rentBasis: "in-place",
  currentMonthlyRent: 2_850,
  stabilizedMonthlyRent: 3_200,
  recurringOtherIncomeMonthly: 125,
  recurringOtherExpenseMonthly: 85,
  acquisitionCredits: 7_500,
  financingMode: "fixed-loan",
  fixedLoanAmount: 260_000,
  downPaymentPct: 20,
  interestRate: 6.375,
  loanTermYears: 30,
  closingCostsInputMode: "fixed",
  closingCostsFixed: 8_938,
  loanFees: 1_800,
  initialReserve: 5_000,
  rehabBudget: 12_000,
  strategyArv: 410_000,
  pmiAnnualRatePct: 0.8,
  pmiNoCancel: false,
  maintenancePct: 6,
  vacancyPct: 5,
  mgmtPct: 8,
  capexPct: 5,
  buildingValuePct: 80,
  depreciationYears: 27.5,
  includeInterestDeduction: true,
  taxRatePct: 24,
  expenseGrowthPct: 2.5,
  rentGrowthPct: 2.5,
  appreciationRatePct: 3,
  sellingCostPct: 6,
  propertyTaxInputMode: "annual",
  propertyTaxAnnual: 5_200,
  insuranceInputMode: "monthly",
  insuranceMonthly: 190,
  hoaMonthly: 0,
  utilitiesMonthly: 125,
};

describe("mortgage scenario canonical parity", () => {
  it.each([
    ["public v1", UNDERWRITING_V1_GOLDEN_CORPUS[0]!.values],
    ["opt-in v2", V2_VALUES],
  ] as const)("reruns a byte-for-byte canonical baseline for %s", (_label, values) => {
    const canonical = calculateAnalysis(values);
    const scenarios = buildMortgageScenarioComparisons(values);
    const baseline = scenarios[0]!;

    expect(baseline.key).toBe("current");
    expect(baseline.values).not.toBe(values);
    expect(baseline.values).toEqual(values);
    expect(baseline.result).toEqual(canonical);
    for (const scenario of scenarios) {
      expect(scenario.result).toEqual(calculateAnalysis(scenario.values));
    }
  });

  it("deep-clones units and never mutates the caller's complete form", () => {
    const values: InvestmentFormValues = {
      ...UNDERWRITING_V1_GOLDEN_CORPUS[0]!.values,
      propertyType: "multi-family",
      monthlyRent: undefined,
      units: [
        { bedrooms: 2, bathrooms: 1, sqft: 900, monthlyRent: 1_400 },
        { bedrooms: 1, bathrooms: 1, sqft: 700, monthlyRent: 1_100 },
      ],
      rehabBudget: 20_000,
      strategyArv: 360_000,
    };
    const clone = cloneInvestmentFormValues(values);
    expect(clone).toEqual(values);
    expect(clone.units).not.toBe(values.units);
    expect(clone.units?.[0]).not.toBe(values.units?.[0]);

    const original = structuredClone(values);
    buildMortgageScenarioComparisons(values);
    expect(values).toEqual(original);
  });

  it("converts only the +5pp v2 variant to percent-down financing", () => {
    const scenarios = buildMortgageScenarioComparisons(V2_VALUES);
    const baseline = scenarios.find((scenario) => scenario.key === "current")!;
    const moreDown = scenarios.find((scenario) => scenario.key === "more-down")!;
    const shorter = scenarios.find((scenario) => scenario.key === "shorter")!;

    expect(baseline.values.financingMode).toBe("fixed-loan");
    expect(baseline.result.loanAmount).toBe(260_000);
    expect(moreDown.values.financingMode).toBe("percent-down");
    expect(moreDown.values.fixedLoanAmount).toBeUndefined();
    expect(moreDown.result.loanAmount).toBeLessThan(baseline.result.loanAmount);
    expect(shorter.values.financingMode).toBe("fixed-loan");
    expect(shorter.result.loanAmount).toBe(260_000);
  });
});
