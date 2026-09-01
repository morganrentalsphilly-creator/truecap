import { describe, expect, it } from "vitest";

import { computeDealScore } from "@/lib/deal-score";

/**
 * A shortlist screener must keep ORDERING even among bad deals — "which of
 * these misses is closest to workable?" is the whole question. Every score
 * component used to return a hard 0 below its last band, so a barely-bad deal
 * (-$210/mo, DSCR 0.97, 3.8% cap) and a catastrophic one (-$2,000/mo, DSCR
 * 0.45, 1% cap) both pancaked to the same Screening Index and ranked equal.
 *
 * Near-miss tiers (1 point each; max +4 combined) restore strict ordering.
 * Deliberately unchanged, asserted below: recommendation thresholds, every
 * band above zero, and the catastrophic deal's score of 0 with "Avoid".
 */

const base = {
  propertyType: "single-family",
  isCashPurchase: false,
  cashOnCashApplicable: true,
  vacancyRate: 5,
  propertyAge: 15,
  propertyAgeKnown: true,
  capexPct: 5,
  maintenancePct: 5,
  monthlyPropertyTax: 250,
  monthlyRentIncome: 2_000,
  afterTaxMonthlyCashFlow: 0,
} as const;

/** Barely misses every band: one rate cut / small rent bump from workable. */
const barelyBad = {
  ...base,
  monthlyCashFlow: -210,
  cashOnCashReturn: -0.5,
  capRate: 3.8,
  dscr: 0.97,
};

/** Misses everything by a mile. */
const catastrophic = {
  ...base,
  monthlyCashFlow: -2_000,
  cashOnCashReturn: -15,
  capRate: 1.0,
  dscr: 0.45,
};

describe("near-miss discrimination on the Screening Index", () => {
  it("orders a barely-bad deal strictly above a catastrophic one", () => {
    const near = computeDealScore(barelyBad);
    const far = computeDealScore(catastrophic);
    // The regression this exists to prevent: both used to be 0 and tie.
    expect(near.score).toBeGreaterThan(far.score);
  });

  it("keeps the catastrophic deal at 0 / Avoid", () => {
    const far = computeDealScore(catastrophic);
    expect(far.score).toBe(0);
    expect(far.recommendation).toBe("Avoid");
  });

  it("caps combined near-miss credit at 4 points and never promotes past Avoid", () => {
    const near = computeDealScore(barelyBad);
    expect(near.score).toBeLessThanOrEqual(4);
    expect(near.recommendation).toBe("Avoid");
  });

  it("keeps riskPenalty integral and never -0 even when compressed", () => {
    // The compression clamp bounds the penalty by the (fractional, weighted)
    // component sum; flooring the clamp magnitude preserves the pre-v1.4
    // contract that receipts and persisted snapshots show whole points.
    for (const deal of [
      barelyBad,
      catastrophic,
      { ...barelyBad, vacancyRate: 12, capexPct: 12, maintenancePct: 12 },
    ]) {
      const { riskPenalty } = computeDealScore(deal).breakdown;
      expect(Number.isInteger(riskPenalty)).toBe(true);
      expect(Object.is(riskPenalty, -0)).toBe(false);
    }
  });

  it("flags a compressed penalty so no receipt can call the risk profile clean", () => {
    // Stack risk factors on the near-miss deal: the raw penalty far exceeds
    // the ~4 points the components leave to lose, so compression engages.
    const stacked = computeDealScore({
      ...barelyBad,
      vacancyRate: 12,
      capexPct: 12,
      maintenancePct: 12,
    });
    expect(stacked.breakdown.riskPenaltyLimited).toBe(true);
    // A clean deal must NOT carry the flag (historical shape preserved).
    const clean = computeDealScore({
      ...base,
      monthlyCashFlow: 400,
      cashOnCashReturn: 9,
      capRate: 7,
      dscr: 1.4,
    });
    expect("riskPenaltyLimited" in clean.breakdown).toBe(false);
  });

  it("leaves the first real band of every component untouched", () => {
    // One representative per component sitting exactly in its lowest
    // NON-near-miss band: the pre-change values must be unchanged.
    expect(
      computeDealScore({ ...catastrophic, monthlyCashFlow: -100 }).breakdown
        .cashFlowScore,
    ).toBe(3);
    expect(
      computeDealScore({ ...catastrophic, dscr: 1.05 }).breakdown.dscrScore,
    ).toBe(3);
    expect(
      computeDealScore({ ...catastrophic, capRate: 4.5 }).breakdown
        .capRateScore,
    ).toBe(4);
    expect(
      computeDealScore({ ...catastrophic, cashOnCashReturn: 2 }).breakdown
        .cocScore,
    ).toBe(3);
  });
});
