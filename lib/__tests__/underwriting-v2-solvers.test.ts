import { describe, expect, it } from "vitest";

import { solveBreakpoints } from "@/lib/breakpoint-solver";
import { calculateAnalysis } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  calculateMaxAllowableOffer,
  meetsTarget,
  solveRequiredMonthlyRent,
  type MaoTarget,
} from "@/lib/max-allowable-offer";
import { getDealTier, type DealTier } from "@/lib/verdict";

type V2Values = InvestmentFormValues & { underwritingModelVersion: "2.0" };

const V2_BASE: V2Values = {
  underwritingModelVersion: "2.0",
  analysisDate: "2026-08-24",
  propertyType: "single-family",
  unitCount: 1,
  address: "12 Solver Boundary Way, Philadelphia, PA 19140",
  purchasePrice: 325_000,
  yearBuilt: 1998,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1_450,
  // Deliberately unrelated to both v2 scenarios. A solver that mutates this
  // legacy field will never change the v2 engine result.
  monthlyRent: 9_999,
  units: [],
  operatingScenario: "current",
  rentBasis: "in-place",
  currentMonthlyRent: 2_850,
  stabilizedMonthlyRent: 3_200,
  recurringOtherIncomeMonthly: 125,
  recurringOtherExpenseMonthly: 85,
  acquisitionCredits: 7_500,
  financingMode: "percent-down",
  downPaymentPct: 20,
  interestRate: 6.375,
  loanTermYears: 30,
  closingCostsInputMode: "percent",
  closingCostsPct: 2.75,
  loanFees: 1_800,
  initialReserve: 5_000,
  rehabBudget: 12_000,
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
  propertyTaxPct: undefined,
  insuranceInputMode: "monthly",
  insuranceMonthly: 190,
  insurancePct: undefined,
  hoaMonthly: 0,
  utilitiesMonthly: 125,
};

function v2(overrides: Partial<V2Values> = {}): V2Values {
  return { ...V2_BASE, ...overrides };
}

const TIER_RANK: Record<DealTier, number> = {
  Negative: 0,
  Marginal: 1,
  Mixed: 2,
  Solid: 3,
  Strong: 4,
};

describe("v2 Offer Ceiling financing bounds", () => {
  const target: MaoTarget = { capRate: 6.5 };

  it("solves fixed-down candidates without probing below the fixed down payment", () => {
    const fixedDownPaymentAmount = 75_250;
    const values = v2({
      financingMode: "fixed-down",
      fixedDownPaymentAmount,
    });
    const solved = calculateMaxAllowableOffer(values, target);

    expect(solved).not.toBeNull();
    if (!solved) return;
    expect(solved.maxPrice).toBeGreaterThanOrEqual(fixedDownPaymentAmount);
    expect(solved.achieved.downPayment).toBe(fixedDownPaymentAmount);
    expect(solved.achieved.loanAmount).toBe(
      solved.maxPrice - fixedDownPaymentAmount
    );
    expect(meetsTarget(solved.achieved, target)).toBe(true);

    const rerun = calculateAnalysis({
      ...values,
      purchasePrice: solved.maxPrice,
    });
    expect(rerun).toEqual(solved.achieved);
    expect(
      meetsTarget(
        calculateAnalysis({ ...values, purchasePrice: solved.maxPrice + 500 }),
        target
      )
    ).toBe(false);
  });

  it("solves fixed-loan candidates without probing below the fixed loan", () => {
    const fixedLoanAmount = 240_250;
    const values = v2({
      financingMode: "fixed-loan",
      fixedLoanAmount,
    });
    const solved = calculateMaxAllowableOffer(values, target);

    expect(solved).not.toBeNull();
    if (!solved) return;
    expect(solved.maxPrice).toBeGreaterThanOrEqual(fixedLoanAmount);
    expect(solved.achieved.loanAmount).toBe(fixedLoanAmount);
    expect(solved.achieved.downPayment).toBe(solved.maxPrice - fixedLoanAmount);
    expect(meetsTarget(solved.achieved, target)).toBe(true);

    const rerun = calculateAnalysis({
      ...values,
      purchasePrice: solved.maxPrice,
    });
    expect(rerun).toEqual(solved.achieved);
    expect(
      meetsTarget(
        calculateAnalysis({ ...values, purchasePrice: solved.maxPrice + 500 }),
        target
      )
    ).toBe(false);
  });

  it("fails closed when a hard price cap is below a v2 fixed financing floor", () => {
    expect(
      calculateMaxAllowableOffer(
        v2({ financingMode: "fixed-loan", fixedLoanAmount: 240_250 }),
        { maxPurchasePrice: 240_000 }
      )
    ).toBeNull();
  });

  it("finds the first valid credit-constrained price before applying the target quick-reject", () => {
    const values = v2({
      acquisitionCredits: 20_000,
      loanFees: 0,
      initialReserve: 0,
      rehabBudget: 0,
    });
    const target: MaoTarget = { monthlyCashFlow: 0 };
    const bounds = { minPrice: 10_000, maxPrice: 650_000 };

    expect(() =>
      calculateAnalysis({ ...values, purchasePrice: bounds.minPrice })
    ).toThrow("Acquisition credits cannot exceed modeled acquisition cash uses");

    let oraclePrice: number | null = null;
    for (let price = bounds.minPrice; price <= bounds.maxPrice; price += 500) {
      try {
        const candidate = calculateAnalysis({ ...values, purchasePrice: price });
        if (meetsTarget(candidate, target)) oraclePrice = price;
      } catch {
        // A fixed credit can make low prices economically invalid. The oracle
        // keeps enumerating rather than mistaking that domain boundary for an
        // unreachable target.
      }
    }

    const solved = calculateMaxAllowableOffer(values, target, bounds);
    expect(oraclePrice).not.toBeNull();
    expect(solved?.maxPrice ?? null).toBe(oraclePrice);
    if (!solved) return;
    expect(solved.achieved).toEqual(
      calculateAnalysis({ ...values, purchasePrice: solved.maxPrice })
    );
    expect(meetsTarget(solved.achieved, target)).toBe(true);
  });

  it("rejects a DSCR-only target for an explicit v2 cash acquisition", () => {
    const values = v2({ financingMode: "cash", loanFees: 0 });
    expect(calculateAnalysis(values).monthlyPayment).toBe(0);
    expect(calculateMaxAllowableOffer(values, { dscr: 1.25 })).toBeNull();
  });
});

describe.each([
  ["current", "currentMonthlyRent", 2_850],
  ["stabilized", "stabilizedMonthlyRent", 3_200],
] as const)("v2 %s scenario rent solving", (operatingScenario, rentField, startingRent) => {
  it(`solves and achieves required rent through ${rentField}`, () => {
    const values = v2({ operatingScenario });
    const base = calculateAnalysis(values);
    const target: MaoTarget = { monthlyCashFlow: base.netCashFlow + 200 };
    const solved = solveRequiredMonthlyRent(values, target);

    expect(solved).not.toBeNull();
    if (!solved) return;
    expect(solved.alreadyMet).toBe(false);
    expect(solved.unreachable).toBe(false);
    expect(solved.value).toBeGreaterThan(startingRent);
    expect(solved.value).toBeLessThan(Number(values.monthlyRent));
    expect(solved.achieved.monthlyRentalIncome).toBe(solved.value);
    expect(meetsTarget(solved.achieved, target)).toBe(true);

    const rerun = calculateAnalysis({ ...values, [rentField]: solved.value });
    expect(rerun).toEqual(solved.achieved);
  });

  it(`uses ${rentField} for the next-tier rent breakpoint`, () => {
    const values = v2({ operatingScenario });
    const base = calculateAnalysis(values);
    const breakpoint = solveBreakpoints(values, base);

    expect(breakpoint).not.toBeNull();
    if (!breakpoint) return;
    expect(breakpoint.currentRentMonthly).toBe(startingRent);
    expect(breakpoint.rentDeltaPct).not.toBeNull();
    expect(breakpoint.rentBreakpointMonthly).not.toBeNull();
    expect(breakpoint.rentBreakpointMonthly).toBeGreaterThan(startingRent);

    const rerun = calculateAnalysis({
      ...values,
      [rentField]: breakpoint.rentBreakpointMonthly,
    });
    expect(TIER_RANK[getDealTier(rerun)]).toBeGreaterThanOrEqual(
      TIER_RANK[breakpoint.targetTier]
    );
  });
});
