import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import {
  buildWhatNeedsToBeTrue,
  DECISION_GAP_NORMALIZATION_FORMULA,
} from "../decision-thresholds";
import type { InvestmentFormValues } from "../investcalc-schema";
import { meetsTarget, type MaoTarget } from "../max-allowable-offer";

function singleFamily(overrides: Partial<InvestmentFormValues> = {}): InvestmentFormValues {
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
    propertyTaxInputMode: "percent",
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

function expectExactPass(
  threshold: {
    rechecked: boolean;
    recheckedAnalysis: ReturnType<typeof calculateAnalysis> | null;
  },
  target: MaoTarget
) {
  expect(threshold.rechecked).toBe(true);
  expect(threshold.recheckedAnalysis).not.toBeNull();
  if (threshold.recheckedAnalysis) {
    expect(meetsTarget(threshold.recheckedAnalysis, target)).toBe(true);
  }
}

describe("What Needs To Be True — canonical one-variable boundaries", () => {
  it("returns conservative price, rent, rate, and expense boundaries and ranks exact gaps", () => {
    const values = singleFamily();
    const target: MaoTarget = { monthlyCashFlow: 0, dscr: 1.25 };
    const result = buildWhatNeedsToBeTrue(values, target);

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.targetAlreadyMet).toBe(false);

    expect(result.maxPrice.status).toBe("change_required");
    expect(result.maxPrice.thresholdValue).toBeLessThan(values.purchasePrice);
    expect(result.maxPrice.thresholdValue! % 500).toBe(0);
    expectExactPass(result.maxPrice, target);

    expect(result.requiredRent.status).toBe("change_required");
    expect(result.requiredRent.thresholdValue).toBeGreaterThan(values.monthlyRent!);
    expect(Number.isInteger(result.requiredRent.thresholdValue)).toBe(true);
    expectExactPass(result.requiredRent, target);

    expect(result.maxInterestRate.status).toBe("change_required");
    expect(result.maxInterestRate.thresholdValue).toBeLessThan(values.interestRate);
    expect(Number.isInteger(result.maxInterestRate.thresholdValue! * 100)).toBe(true);
    expectExactPass(result.maxInterestRate, target);

    expect(result.operatingExpenses.status).toBe("change_required");
    expect(result.operatingExpenses.requiredOpexReductionMonthly).toBeGreaterThan(0);
    expectExactPass(result.operatingExpenses, target);
    // This solver is exact at a whole-dollar aggregate boundary.
    const oneDollarOver = calculateAnalysis({
      ...values,
      propertyTaxInputMode: "annual",
      propertyTaxAnnual: 0,
      insuranceInputMode: "monthly",
      insuranceMonthly: 0,
      hoaMonthly: 0,
      utilitiesMonthly:
        result.operatingExpenses.maximumTotalRecurringExpensesMonthly! -
        result.operatingExpenses.capexReserveHeldFixedMonthly +
        1,
      maintenancePct: 0,
      vacancyPct: 0,
      mgmtPct: 0,
    });
    expect(meetsTarget(oneDollarOver, target)).toBe(false);

    expect(result.cashNeededReduction.status).toBe("not_applicable");
    expect(result.maxRehabBudget.status).toBe("not_applicable");

    expect(result.rankedGaps.length).toBeGreaterThanOrEqual(4);
    expect(result.rankedGaps.map((gap) => gap.normalizedGapPct)).toEqual(
      [...result.rankedGaps.map((gap) => gap.normalizedGapPct)].sort((a, b) => a - b)
    );
    for (const gap of result.rankedGaps) {
      expect(gap.formula).toBe(DECISION_GAP_NORMALIZATION_FORMULA);
      expect(gap.normalizedGapPct).toBeCloseTo(
        (gap.requiredChange / gap.normalizationBasisValue) * 100,
        10
      );
    }
    expect(result.smallestNormalizedGap).toEqual(result.rankedGaps[0]);
  });

  it("finds the actual minimum rent and maximum rate even when current inputs already pass", () => {
    const values = singleFamily({ monthlyRent: 3_000, interestRate: 5 });
    const target: MaoTarget = { monthlyCashFlow: 0 };
    const result = buildWhatNeedsToBeTrue(values, target);

    expect(result?.targetAlreadyMet).toBe(true);
    expect(result?.requiredRent.status).toBe("already_true");
    expect(result?.requiredRent.thresholdValue).toBeLessThan(values.monthlyRent!);
    expect(result?.maxInterestRate.status).toBe("already_true");
    expect(result?.maxInterestRate.thresholdValue).toBeGreaterThan(values.interestRate);
    if (result) {
      expectExactPass(result.requiredRent, target);
      expectExactPass(result.maxInterestRate, target);
    }
  });
});

describe("What Needs To Be True — cash and rehab boundaries", () => {
  it("uses seller-credit framing only when the rechecked reduction fits modeled closing costs", () => {
    const values = singleFamily();
    const current = calculateAnalysis(values);
    const target: MaoTarget = { cocReturn: current.cocReturn + 0.05 };
    const result = buildWhatNeedsToBeTrue(values, target);

    expect(result?.cashNeededReduction.status).toBe("change_required");
    expect(result?.cashNeededReduction.requiredCashReduction).toBeGreaterThan(0);
    expect(result?.cashNeededReduction.requiredCashReduction).toBeLessThanOrEqual(
      current.closingCosts
    );
    expect(result?.cashNeededReduction.sellerCreditFramingSupportedByModel).toBe(true);
    expect(result?.cashNeededReduction.sellerCreditAmount).toBe(
      result?.cashNeededReduction.requiredCashReduction
    );
    if (result) expectExactPass(result.cashNeededReduction, target);
  });

  it("keeps a larger one-time-cost reduction generic instead of calling it a seller credit", () => {
    const values = singleFamily({ rehabBudget: 20_000 });
    const current = calculateAnalysis(values);
    const desiredMaximumCash = current.totalCashRequired - 10_000;
    const target: MaoTarget = {
      cocReturn: (current.annualCashFlow / desiredMaximumCash) * 100,
    };
    const result = buildWhatNeedsToBeTrue(values, target);

    expect(result?.cashNeededReduction.status).toBe("change_required");
    expect(result?.cashNeededReduction.requiredCashReduction).toBeGreaterThan(
      current.closingCosts
    );
    expect(result?.cashNeededReduction.sellerCreditFramingSupportedByModel).toBe(false);
    expect(result?.cashNeededReduction.sellerCreditAmount).toBeNull();
    if (result) expectExactPass(result.cashNeededReduction, target);
  });

  it("rounds a maximum rehab budget down and rechecks it at the displayed dollar", () => {
    const values = singleFamily({ rehabBudget: 10_000 });
    const target: MaoTarget = { cocReturn: 3.1 };
    const result = buildWhatNeedsToBeTrue(values, target);

    expect(result?.currentAnalysis.annualCashFlow).toBeGreaterThan(0);
    expect(result?.maxRehabBudget.status).toBe("change_required");
    expect(result?.maxRehabBudget.maximumRehabBudget).toBeLessThan(10_000);
    expect(Number.isInteger(result?.maxRehabBudget.maximumRehabBudget)).toBe(true);
    if (result) {
      expectExactPass(result.maxRehabBudget, target);
      const oneDollarOver = calculateAnalysis({
        ...values,
        rehabBudget: result.maxRehabBudget.maximumRehabBudget! + 1,
      });
      expect(meetsTarget(oneDollarOver, target)).toBe(false);
    }
  });

  it("does not imply that reducing cash needed can fix a separate failing target", () => {
    const values = singleFamily({ rehabBudget: 20_000 });
    const current = calculateAnalysis(values);
    const result = buildWhatNeedsToBeTrue(values, {
      cocReturn: current.cocReturn + 0.1,
      dscr: current.dscr + 0.25,
    });

    expect(result?.cashNeededReduction.status).toBe("unreachable");
    expect(result?.cashNeededReduction.sellerCreditFramingSupportedByModel).toBe(false);
    expect(result?.maxRehabBudget.status).toBe("unreachable");
  });
});

describe("What Needs To Be True — property-model safety", () => {
  it("marks rate as not applicable for cash purchases", () => {
    const result = buildWhatNeedsToBeTrue(
      singleFamily({ downPaymentPct: 100 }),
      { monthlyCashFlow: 0, dscr: 1.25 }
    );

    expect(result?.maxInterestRate.status).toBe("not_applicable");
    expect(result?.maxInterestRate.thresholdValue).toBeNull();
  });

  it("does not collapse multifamily per-unit rents into a made-up single-rent threshold", () => {
    const values = singleFamily({
      propertyType: "multi-family",
      monthlyRent: undefined,
      units: [
        { bedrooms: 2, bathrooms: 1, sqft: 900, monthlyRent: 1_400 },
        { bedrooms: 2, bathrooms: 1, sqft: 900, monthlyRent: 1_450 },
      ],
    });
    const result = buildWhatNeedsToBeTrue(values, { monthlyCashFlow: 0 });

    expect(result).not.toBeNull();
    expect(result?.requiredRent.status).toBe("not_applicable");
    expect(result?.requiredRent.thresholdValue).toBeNull();
    expect(result?.operatingExpenses.rechecked).toBe(true);
  });

  it("does not present monthly rent as the income lever for an ADR-based STR", () => {
    const values = singleFamily({
      monthlyRent: 0,
      avgDailyRate: 150,
      occupancyPct: 55,
      strFurnishingCost: 8_000,
    });
    const result = buildWhatNeedsToBeTrue(values, { monthlyCashFlow: 0 });

    expect(result).not.toBeNull();
    expect(result?.requiredRent.status).toBe("not_applicable");
    expect(result?.requiredRent.reason).toContain("ADR and occupancy");
  });

  it("returns explicit non-applicable states for an empty target", () => {
    const result = buildWhatNeedsToBeTrue(singleFamily(), {});

    expect(result).not.toBeNull();
    expect(result?.thresholds.every((threshold) => threshold.status === "not_applicable")).toBe(
      true
    );
    expect(result?.rankedGaps).toEqual([]);
    expect(result?.smallestNormalizedGap).toBeNull();
  });

  it("returns unreachable boundaries instead of optimistic numbers when no single change works", () => {
    const values = singleFamily({ monthlyRent: 0 });
    const result = buildWhatNeedsToBeTrue(values, { monthlyCashFlow: 100 });

    expect(result).not.toBeNull();
    expect(result?.maxPrice.status).toBe("unreachable");
    expect(result?.cashNeededReduction.status).toBe("not_applicable");
    expect(result?.operatingExpenses.status).toBe("unreachable");
  });
});
