/**
 * Tests for the stress-survivability readout (lib/stress-survivability.ts).
 *
 * This module answers, under the worst-case / what-if stress tools:
 * "does the deal still cash-flow, and if not, what closes the gap?"
 * The dollar and pp figures render verbatim in the analyzer, so a
 * silent regression here would print a wrong break-even target.
 *
 * These tests pin:
 *   - survives / breaks / already-negative verdict classification
 *   - the break-even rent figure actually zeroes the stressed shortfall
 *     when fed back through calculateAnalysis (no parallel math drift)
 *   - the vacancy-pp figure actually zeroes the shortfall, and is
 *     suppressed when the gap exceeds the stressed vacancy allowance
 *   - DSCR banding vs the 1.20 lender line + cash-purchase N/A
 *   - headline / sentence copy shape (signs, units)
 *
 * Stressed inputs are built the same way the UI does it: adjust the
 * form values, call calculateAnalysis again. Never hand-rolled results.
 */

import { describe, expect, it } from "vitest";

import { calculateAnalysis, type AnalysisResult } from "../calc-analysis";
import type { InvestmentFormValues } from "../investcalc-schema";
import { buildStressSurvivability, LENDER_DSCR_LINE } from "../stress-survivability";
import {
  WORST_CASE_PRESET,
  applyWhatIfAdjustments,
} from "@/components/investcalc/what-if-sliders";

function baseSingleFamily(
  overrides: Partial<InvestmentFormValues> = {}
): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "1205 N 5th St, Philadelphia, PA 19122, USA",
    purchasePrice: 245_000,
    yearBuilt: 2010,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    monthlyRent: 2_400,
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

/** The worst-case bundle, applied via the SHIPPED preset + adjustment
 *  path — not a local copy — so a change to either constant or mutation
 *  logic fails these round-trip tests instead of silently diverging. */
function worstCase(values: InvestmentFormValues): InvestmentFormValues {
  return applyWhatIfAdjustments(
    values,
    WORST_CASE_PRESET.rentPct,
    0,
    WORST_CASE_PRESET.ratePp,
    WORST_CASE_PRESET.vacancyPp
  );
}

function analyze(values: InvestmentFormValues): AnalysisResult {
  return calculateAnalysis(values);
}

describe("buildStressSurvivability — verdicts", () => {
  it("survives when the stressed deal still cash-flows", () => {
    const values = baseSingleFamily({ monthlyRent: 3_200 });
    const base = analyze(values);
    const stressed = analyze(worstCase(values));
    expect(stressed.netCashFlow).toBeGreaterThanOrEqual(0);

    const s = buildStressSurvivability(base, stressed);
    expect(s.verdict).toBe("survives");
    expect(s.survives).toBe(true);
    expect(s.headline).toMatch(/^Survives — still \+\$[\d,]+\/mo\.$/);
    expect(s.breakEven.sentence).toBeNull();
    expect(s.breakEven.extraRentMonthly).toBeNull();
    expect(s.breakEven.vacancyPpReduction).toBeNull();
  });

  it("breaks when a positive deal goes negative under stress", () => {
    const values = baseSingleFamily({ monthlyRent: 2_400 });
    const base = analyze(values);
    const stressed = analyze(worstCase(values));
    expect(base.netCashFlow).toBeGreaterThanOrEqual(0);
    expect(stressed.netCashFlow).toBeLessThan(0);

    const s = buildStressSurvivability(base, stressed);
    expect(s.verdict).toBe("breaks");
    expect(s.survives).toBe(false);
    expect(s.headline).toMatch(/^Breaks — -\$[\d,]+\/mo under this stress\.$/);
    expect(s.deltaMonthly).toBeLessThan(0);
  });

  it("flags a deal that was already negative before stress", () => {
    const values = baseSingleFamily({ monthlyRent: 1_500 });
    const base = analyze(values);
    const stressed = analyze(worstCase(values));
    expect(base.netCashFlow).toBeLessThan(0);

    const s = buildStressSurvivability(base, stressed);
    expect(s.verdict).toBe("already-negative");
    expect(s.headline).toContain("No cushion");
    expect(s.headline).toContain("before stress");
  });

  it("reports rounded cash flows and the monthly delta", () => {
    const values = baseSingleFamily();
    const base = analyze(values);
    const stressed = analyze(worstCase(values));
    const s = buildStressSurvivability(base, stressed);
    expect(s.baseCashFlow).toBe(Math.round(base.netCashFlow));
    expect(s.stressedCashFlow).toBe(Math.round(stressed.netCashFlow));
    expect(s.deltaMonthly).toBe(s.stressedCashFlow - s.baseCashFlow);
  });
});

describe("buildStressSurvivability — break-even guidance is real", () => {
  const values = baseSingleFamily({ monthlyRent: 2_400 });
  const stressedValues = worstCase(values);
  const base = analyze(values);
  const stressed = analyze(stressedValues);
  const s = buildStressSurvivability(base, stressed);

  it("the deal actually breaks under the worst-case bundle", () => {
    expect(stressed.netCashFlow).toBeLessThan(0);
    expect(s.breakEven.sentence).toMatch(/^Needs .+ to break even\.$/);
  });

  it("adding the suggested rent restores break-even (via calculateAnalysis)", () => {
    expect(s.breakEven.extraRentMonthly).not.toBeNull();
    const repaired = analyze({
      ...stressedValues,
      monthlyRent: (stressedValues.monthlyRent as number) + s.breakEven.extraRentMonthly!,
    });
    // Per-line-item rounding in calc-analysis can leave a few dollars of
    // slack either way; the point is the figure lands AT break-even, not
    // $50 short or $500 over.
    expect(repaired.netCashFlow).toBeGreaterThanOrEqual(-5);
    expect(repaired.netCashFlow).toBeLessThan(60);
  });

  it("cutting vacancy by the suggested pp restores break-even", () => {
    expect(s.breakEven.vacancyPpReduction).not.toBeNull();
    const repaired = analyze({
      ...stressedValues,
      vacancyPct: stressedValues.vacancyPct - s.breakEven.vacancyPpReduction!,
    });
    expect(repaired.netCashFlow).toBeGreaterThanOrEqual(-5);
  });

  it("suppresses the vacancy path when the gap exceeds the vacancy allowance", () => {
    // Rent so low the shortfall dwarfs what zeroing vacancy could recover.
    const weak = baseSingleFamily({ monthlyRent: 1_200 });
    const weakStressed = analyze(worstCase(weak));
    expect(weakStressed.netCashFlow).toBeLessThan(0);
    const sv = buildStressSurvivability(analyze(weak), weakStressed);
    expect(sv.breakEven.vacancyPpReduction).toBeNull();
    // Rent can still close it, so the sentence survives with one path.
    expect(sv.breakEven.extraRentMonthly).not.toBeNull();
    expect(sv.breakEven.sentence).not.toContain("vacancy");
  });
});

describe("buildStressSurvivability — DSCR banding vs the 1.20 lender line", () => {
  it("clears the lender line on a strong deal", () => {
    const values = baseSingleFamily({ monthlyRent: 3_500 });
    const stressed = analyze(worstCase(values));
    expect(stressed.dscr).toBeGreaterThanOrEqual(LENDER_DSCR_LINE);
    const s = buildStressSurvivability(analyze(values), stressed);
    expect(s.dscr.band).toBe("clears");
    expect(s.dscr.label).toContain("clears the 1.20 lender threshold");
    expect(s.dscr.value).toBeCloseTo(stressed.dscr, 5);
  });

  it("bands thin coverage between 1.0 and 1.20", () => {
    const values = baseSingleFamily({ monthlyRent: 2_650 });
    const stressed = analyze(worstCase(values));
    expect(stressed.dscr).toBeGreaterThanOrEqual(1.0);
    expect(stressed.dscr).toBeLessThan(LENDER_DSCR_LINE);
    const s = buildStressSurvivability(analyze(values), stressed);
    expect(s.dscr.band).toBe("thin");
    expect(s.dscr.label).toContain("thin coverage cushion");
  });

  it("bands underwater below 1.0", () => {
    const values = baseSingleFamily({ monthlyRent: 1_800 });
    const stressed = analyze(worstCase(values));
    expect(stressed.dscr).toBeLessThan(1.0);
    const s = buildStressSurvivability(analyze(values), stressed);
    expect(s.dscr.band).toBe("underwater");
    expect(s.dscr.label).toContain("underwater");
  });

  it("reports N/A for cash purchases (monthlyPayment <= 0)", () => {
    const values = baseSingleFamily({ downPaymentPct: 100, monthlyRent: 2_000 });
    const base = analyze(values);
    expect(base.monthlyPayment).toBe(0);
    // Cash worst case: rent + vacancy only (rate stress is a no-op).
    const stressed = analyze({
      ...values,
      monthlyRent: Math.round(2_000 * 0.9),
      vacancyPct: values.vacancyPct + 5,
    });
    const s = buildStressSurvivability(base, stressed);
    expect(s.dscr.band).toBe("cash");
    expect(s.dscr.value).toBeNull();
    expect(s.dscr.label).toContain("cash purchase");
  });
});
