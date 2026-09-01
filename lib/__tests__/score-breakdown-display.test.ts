/**
 * "Why this score" display helpers — reconciliation + denominators.
 *
 * Two audit findings pinned here (both DISPLAY-only; the scoring engine is
 * untouched):
 *
 * 1. When the appreciation-play floor holds the score up, the breakdown
 *    factors do NOT sum to the headline (e.g. components sum 3, score 40).
 *    The receipts (answer-hero-card.tsx) and the shared ScoreBreakdown
 *    popover reconcile via isAppreciationFloorApplied + getScoreBreakdownSum
 *    — these tests pin that detection so the surfaces can never again recite
 *    an equation that doesn't add up.
 *
 * 2. Owner-occupant deals score cash flow on 0/25/30 bands, not the investor
 *    0–22 tiers, so "x / max" denominators must come from
 *    getCashFlowComponentMax (the popover used to hardcode
 *    COMPONENT_MAXES.cashFlow and render "25 / 22").
 */

import { describe, expect, it } from "vitest";

import {
  COMPONENT_MAXES,
  OWNER_OCCUPANT_CASH_FLOW_MAX,
  computeDealScore,
  dealScoreInputSchema,
  getCashFlowComponentMax,
  getScoreBreakdownSum,
  isAppreciationFloorApplied,
  type DealScoreInput,
} from "../deal-score";

/** Parse a partial into a full DealScoreInput (applies schema defaults). */
function input(overrides: Partial<DealScoreInput>): DealScoreInput {
  return dealScoreInputSchema.parse({
    propertyType: "single-family",
    monthlyCashFlow: 0,
    cashOnCashReturn: 0,
    capRate: 0,
    dscr: 0,
    vacancyRate: 5,
    propertyAge: 0,
    capexPct: 5,
    maintenancePct: 5,
    monthlyPropertyTax: 0,
    monthlyRentIncome: 0,
    ...overrides,
  });
}

describe("getCashFlowComponentMax — property-type-correct denominator", () => {
  it("returns the owner-occupant 30-pt max for owner-occupant deals", () => {
    expect(getCashFlowComponentMax("owner-occupant")).toBe(OWNER_OCCUPANT_CASH_FLOW_MAX);
    expect(getCashFlowComponentMax("owner-occupant")).toBe(30);
  });

  it("returns the investor 22-pt max for everything else (incl. missing type)", () => {
    expect(getCashFlowComponentMax("single-family")).toBe(COMPONENT_MAXES.cashFlow);
    expect(getCashFlowComponentMax("multi-family")).toBe(COMPONENT_MAXES.cashFlow);
    expect(getCashFlowComponentMax(null)).toBe(COMPONENT_MAXES.cashFlow);
    expect(getCashFlowComponentMax(undefined)).toBe(COMPONENT_MAXES.cashFlow);
  });

  it("matches the engine: no cash-flow subscore ever exceeds its type's max", () => {
    const cashFlows = [-1000, -300, -150, 0, 150, 301, 600, 1200, 5000];
    for (const cf of cashFlows) {
      for (const propertyType of ["single-family", "multi-family", "owner-occupant"] as const) {
        const r = computeDealScore(input({ propertyType, monthlyCashFlow: cf }));
        expect(r.breakdown.cashFlowScore).toBeLessThanOrEqual(
          getCashFlowComponentMax(propertyType)
        );
      }
    }
  });

  it("the display finding itself: a strong house-hack scores 30, above the investor 22", () => {
    // '30 / 22' is exactly what the shared popover used to render.
    const r = computeDealScore(
      input({ propertyType: "owner-occupant", monthlyCashFlow: 400, dscr: 1.1 })
    );
    expect(r.breakdown.cashFlowScore).toBe(30);
    expect(r.breakdown.cashFlowScore).toBeGreaterThan(COMPONENT_MAXES.cashFlow);
    expect(r.breakdown.cashFlowScore).toBeLessThanOrEqual(getCashFlowComponentMax("owner-occupant"));
  });
});

describe("getScoreBreakdownSum — the arithmetic the receipts recite", () => {
  it("sums the five factors plus the (negative) risk penalty", () => {
    expect(
      getScoreBreakdownSum({
        cashFlowScore: 8,
        cocScore: 13,
        capRateScore: 9,
        dscrScore: 7,
        totalReturnScore: 14,
        riskPenalty: -6,
      })
    ).toBe(45);
  });

  it("includes the explicit zero-cash applicability normalization", () => {
    expect(
      getScoreBreakdownSum({
        cashFlowScore: 22,
        cocScore: 0,
        capRateScore: 16,
        dscrScore: 17,
        totalReturnScore: 25,
        riskPenalty: 0,
        applicabilityAdjustment: 20,
      })
    ).toBe(100);
  });
});

describe("isAppreciationFloorApplied — receipts/popover reconciliation", () => {
  // The audit's reproduced deal: components sum far below 40, floor holds at 40.
  const flooredDeal = input({
    monthlyCashFlow: 0,
    cashOnCashReturn: -5,
    capRate: 5.6,
    dscr: 0.92,
    propertyAge: 35,
    monthlyPropertyTax: 250,
    monthlyRentIncome: 2_000,
    afterTaxMonthlyCashFlow: 15,
    tenYearAnnualizedReturnPct: 11,
  });

  it("detects the floor on the reproduced appreciation-play deal (sum < score = 40)", () => {
    const r = computeDealScore(flooredDeal);
    expect(r.score).toBe(40); // APPRECIATION_FLOOR_SCORE
    expect(getScoreBreakdownSum(r.breakdown)).toBeLessThan(40);
    expect(isAppreciationFloorApplied(r.breakdown, r.score)).toBe(true);
  });

  it("stays false for an ordinary Balanced deal (factors sum to the score)", () => {
    const r = computeDealScore(
      input({
        monthlyCashFlow: 650,
        cashOnCashReturn: 9,
        capRate: 7.5,
        dscr: 1.35,
        propertyAge: 8,
        monthlyPropertyTax: 200,
        monthlyRentIncome: 2_200,
        afterTaxMonthlyCashFlow: 800,
        tenYearAnnualizedReturnPct: 14,
      })
    );
    expect(getScoreBreakdownSum(r.breakdown)).toBe(r.score);
    expect(isAppreciationFloorApplied(r.breakdown, r.score)).toBe(false);
  });

  it("stays false on a bottomed-out deal — and the raw sum can no longer go negative", () => {
    // This test used to construct "components + penalty sums negative, the
    // 0-clamp raises it" and assert that the clamp doesn't read as the floor.
    // The near-miss change (2026-08-31) bounds the risk penalty at
    // -(components - nearMissCredit), and credit <= components always, so a
    // negative raw sum is now STRUCTURALLY impossible: the score equals the
    // summed receipt for every deal unless the appreciation floor engages.
    // Same guarantee, strengthened — the floor detector still reads false,
    // and the receipt reconciles by plain addition with no clamp involved.
    const r = computeDealScore(
      input({
        monthlyCashFlow: -400, // near-miss tier: 1 point
        cashOnCashReturn: -25,
        capRate: 3,
        dscr: 0.7,
        vacancyRate: 10,
        propertyAge: 45,
        capexPct: 12,
        maintenancePct: 12,
        monthlyPropertyTax: 400,
        monthlyRentIncome: 1_200,
        afterTaxMonthlyCashFlow: -200,
        tenYearAnnualizedReturnPct: 2,
      })
    );
    expect(getScoreBreakdownSum(r.breakdown)).toBeGreaterThanOrEqual(0);
    expect(r.score).toBe(Math.round(getScoreBreakdownSum(r.breakdown)));
    expect(isAppreciationFloorApplied(r.breakdown, r.score)).toBe(false);
  });

  it("Balanced invariant: every score either matches the clamped sum or is flagged as floored", () => {
    const deals: DealScoreInput[] = [
      flooredDeal,
      input({ monthlyCashFlow: 300, cashOnCashReturn: 6, capRate: 6.6, dscr: 1.22, monthlyPropertyTax: 180, monthlyRentIncome: 2_000 }),
      input({ propertyType: "owner-occupant", monthlyCashFlow: -150, cashOnCashReturn: 0, capRate: 5.5, dscr: 1.05, propertyAge: 10, monthlyPropertyTax: 250, monthlyRentIncome: 1_800, afterTaxMonthlyCashFlow: 50, tenYearAnnualizedReturnPct: 7 }),
      input({ monthlyCashFlow: 500, cashOnCashReturn: 6, capRate: 6.4, dscr: 0, propertyAge: 5, monthlyPropertyTax: 150, monthlyRentIncome: 1_500, isCashPurchase: true, afterTaxMonthlyCashFlow: 600, tenYearAnnualizedReturnPct: 8 }),
      input({ monthlyCashFlow: -159, cashOnCashReturn: -19, capRate: 7.0, dscr: 0.9, monthlyPropertyTax: 200, monthlyRentIncome: 2_000, afterTaxMonthlyCashFlow: 226, tenYearAnnualizedReturnPct: 22.8 }),
    ];
    for (const deal of deals) {
      const r = computeDealScore(deal);
      const clampedSum = Math.max(0, Math.min(100, Math.round(getScoreBreakdownSum(r.breakdown))));
      if (isAppreciationFloorApplied(r.breakdown, r.score)) {
        expect(r.score).toBeGreaterThan(clampedSum);
        expect(r.score).toBe(40); // only the floor raises above the sum
      } else {
        expect(r.score).toBe(clampedSum);
      }
    }
  });
});
