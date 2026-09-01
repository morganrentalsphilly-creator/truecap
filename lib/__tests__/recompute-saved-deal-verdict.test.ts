/**
 * Pins recomputeSavedDealVerdict — the recompute-on-read helper every list /
 * dashboard / compare surface uses to stay in lockstep with the live engine.
 *
 * In particular this pins the after-tax pair (taxSavingsMonthly + afterTaxCF)
 * added for Compare (finding NT-1): older saved deals' stored snapshots
 * predate the PMI / CapEx-taxable corrections, so Compare must read these from
 * the recompute, and they must reconcile with the fresh Net CF row
 * (afterTaxCF = netCashFlow + taxSavingsMonthly per calc-analysis).
 */
import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import type { InvestmentFormValues } from "../investcalc-schema";
import {
  recomputeSavedDealVerdict,
  toRecomputedSavedAnalysisSnapshot,
} from "../recompute-saved-deal-verdict";

/** Canonical single-family deal (mirrors the calc-analysis test baseline). */
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

describe("recomputeSavedDealVerdict", () => {
  it("returns null for an unparseable legacy snapshot (caller falls back to stored values)", () => {
    expect(recomputeSavedDealVerdict(null)).toBeNull();
    expect(recomputeSavedDealVerdict(undefined)).toBeNull();
    expect(recomputeSavedDealVerdict({ garbage: true })).toBeNull();
  });

  it("recomputes the headline metrics from the current engine", () => {
    const values = baseSingleFamily();
    const fresh = recomputeSavedDealVerdict(values);
    expect(fresh).not.toBeNull();
    const expected = calculateAnalysis(values);
    expect(fresh!.netCashFlowMonthly).toBe(expected.netCashFlow);
    expect(fresh!.dscr).toBe(expected.dscr);
    expect(fresh!.monthlyPayment).toBe(expected.monthlyPayment);
    expect(fresh!.capRatePct).toBe(expected.capRate);
    expect(fresh!.cocReturnPct).toBe(expected.cocReturn);
    expect(fresh!.isCashPurchase).toBe(false);
  });

  it("carries explicit score-method provenance into a current recompute snapshot", () => {
    const fresh = recomputeSavedDealVerdict(baseSingleFamily());
    expect(fresh).not.toBeNull();

    const snapshot = toRecomputedSavedAnalysisSnapshot(fresh!);
    expect(fresh!.scoreMethodologyVersion).toBe("1.4");
    expect(snapshot.scoreMethodologyVersion).toBe(
      fresh!.scoreMethodologyVersion,
    );
  });

  it("carries taxSavingsMonthly + afterTaxCF from the SAME recompute (NT-1)", () => {
    const values = baseSingleFamily();
    const fresh = recomputeSavedDealVerdict(values);
    expect(fresh).not.toBeNull();
    const expected = calculateAnalysis(values);

    // Both after-tax fields come straight from the live engine…
    expect(fresh!.taxSavingsMonthly).toBe(expected.taxSavingsMonthly);
    expect(fresh!.afterTaxCF).toBe(expected.afterTaxCF);
    expect(Number.isFinite(fresh!.taxSavingsMonthly)).toBe(true);
    expect(Number.isFinite(fresh!.afterTaxCF)).toBe(true);

    // …and reconcile with the fresh Net CF row on the compare grid:
    // afterTaxCF = netCashFlow + taxSavingsMonthly (calc-analysis identity).
    expect(fresh!.afterTaxCF).toBe(fresh!.netCashFlowMonthly + fresh!.taxSavingsMonthly);
  });

  it("flags a cash purchase (DSCR 0, monthlyPayment 0) so callers render N/A", () => {
    const values = baseSingleFamily({ downPaymentPct: 100 });
    const fresh = recomputeSavedDealVerdict(values);
    expect(fresh).not.toBeNull();
    expect(fresh!.isCashPurchase).toBe(true);
    expect(fresh!.monthlyPayment).toBeLessThanOrEqual(0);
    expect(fresh!.dscr).toBe(0);
    // The after-tax identity holds on the cash path too.
    expect(fresh!.afterTaxCF).toBe(fresh!.netCashFlowMonthly + fresh!.taxSavingsMonthly);
  });
});
