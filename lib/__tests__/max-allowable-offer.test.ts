/**
 * Tests for the MAO engine extensions: DSCR as a price target, and the inverse
 * "what would make THIS price work?" solvers (required rent, required rate).
 * These dollar/rate numbers go straight into negotiation guidance, so the math
 * is pinned here.
 */
import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import {
  calculateMaxAllowableOffer,
  meetsTarget,
  solveRequiredMonthlyRent,
  solveRequiredInterestRate,
} from "../max-allowable-offer";
import type { InvestmentFormValues } from "../investcalc-schema";

function baseSingleFamily(overrides: Partial<InvestmentFormValues> = {}): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "1205 N 5th St, Philadelphia, PA 19122, USA",
    purchasePrice: 245_000,
    yearBuilt: 2010,
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
    insuranceMonthly: undefined,
    hoaMonthly: 0,
    utilitiesMonthly: 0,
    maintenancePct: 5,
    vacancyPct: 5,
    mgmtPct: 0,
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

describe("MAO — DSCR price target", () => {
  it("solves a price whose DSCR meets the target", () => {
    const res = calculateMaxAllowableOffer(baseSingleFamily(), { dscr: 1.25 });
    expect(res).not.toBeNull();
    if (res) {
      expect(res.maxPrice).toBeGreaterThan(0);
      // Achieved DSCR should be at/above target (allow tiny binary-search slack).
      expect(res.achieved.dscr).toBeGreaterThanOrEqual(1.25 - 0.02);
    }
  });

  it("meetsTarget enforces the DSCR floor", () => {
    const r = calculateAnalysis(baseSingleFamily());
    expect(meetsTarget(r, { dscr: r.dscr - 0.1 })).toBe(true);
    expect(meetsTarget(r, { dscr: r.dscr + 0.5 })).toBe(false);
  });
});

describe("MAO inverse — required monthly rent", () => {
  it("finds the rent that reaches a higher cash-flow target", () => {
    const base = baseSingleFamily();
    const cf = calculateAnalysis(base).netCashFlow;
    const target = { monthlyCashFlow: cf + 300 };
    const res = solveRequiredMonthlyRent(base, target);
    expect(res).not.toBeNull();
    if (res) {
      expect(res.alreadyMet).toBe(false);
      expect(res.unreachable).toBe(false);
      expect(res.value).toBeGreaterThan(Number(base.monthlyRent));
      expect(res.achieved.netCashFlow).toBeGreaterThanOrEqual(target.monthlyCashFlow - 5);
    }
  });

  it("reports alreadyMet when current rent already suffices", () => {
    const base = baseSingleFamily();
    const res = solveRequiredMonthlyRent(base, { monthlyCashFlow: -99_999 });
    expect(res?.alreadyMet).toBe(true);
    expect(res?.value).toBe(Number(base.monthlyRent));
  });

  it("returns null with no targets", () => {
    expect(solveRequiredMonthlyRent(baseSingleFamily(), {})).toBeNull();
  });
});

describe("MAO inverse — required interest rate", () => {
  it("finds the highest rate that still hits the target", () => {
    const base = baseSingleFamily({ interestRate: 7 });
    const cf = calculateAnalysis(base).netCashFlow;
    const target = { monthlyCashFlow: cf + 200 }; // fails at 7%, needs a lower rate
    const res = solveRequiredInterestRate(base, target);
    expect(res).not.toBeNull();
    if (res) {
      expect(res.value).toBeLessThanOrEqual(7);
      expect(res.achieved.netCashFlow).toBeGreaterThanOrEqual(target.monthlyCashFlow - 5);
    }
  });

  it("returns null for a cash purchase (no loan to solve)", () => {
    const res = solveRequiredInterestRate(
      baseSingleFamily({ downPaymentPct: 100 }),
      { monthlyCashFlow: 99_999 }
    );
    expect(res).toBeNull();
  });
});
