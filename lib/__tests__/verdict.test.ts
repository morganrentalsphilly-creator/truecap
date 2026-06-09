/**
 * Tier-classifier lockdown tests.
 *
 * `getDealTier(result)` drives:
 *   - the live tier pill in the WhatIfSliders
 *   - the breakpoint solver's "what would make it Solid" target
 *   - the verdict paragraph on the PDF cover page
 *   - the OG image classifier mirror in app/d/[encoded]/opengraph-image.tsx
 *
 * If the tier boundaries silently shift, every one of those surfaces
 * shows a different answer for the same deal. These tests pin the
 * five tier boundaries to concrete fixtures so any regression is
 * caught at PR time.
 *
 * Do NOT loosen these tests to make a tier change pass. CLAUDE.md §8
 * specifically calls out tier thresholds as a "ask first" change.
 */

import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import { getDealTier } from "../verdict";
import type { InvestmentFormValues } from "../investcalc-schema";

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

describe("getDealTier — leveraged purchase", () => {
  it("classifies a high-rent deal as Strong", () => {
    // High rent + same price → high cash flow, DSCR, CoC.
    // CF ≥ $400, DSCR ≥ 1.25, CoC ≥ 10 → Strong.
    const r = calculateAnalysis(baseSingleFamily({ monthlyRent: 3_500 }));
    expect(r.netCashFlow).toBeGreaterThanOrEqual(400);
    expect(r.dscr).toBeGreaterThanOrEqual(1.25);
    expect(r.cocReturn).toBeGreaterThanOrEqual(10);
    expect(getDealTier(r)).toBe("Strong");
  });

  it("classifies a moderate-rent deal as Solid", () => {
    // CF ≥ $100, DSCR ≥ 1.15, CoC ≥ 6 → Solid (but below Strong cuts).
    const r = calculateAnalysis(baseSingleFamily({ monthlyRent: 2_400 }));
    expect(getDealTier(r)).toBe("Solid");
    // Sanity: it's NOT also passing Strong cuts.
    const isStrong =
      r.netCashFlow >= 400 && r.dscr >= 1.25 && r.cocReturn >= 10;
    expect(isStrong).toBe(false);
  });

  it("classifies a low-margin deal as Mixed", () => {
    // CF positive, DSCR positive, but below Solid cuts.
    const r = calculateAnalysis(baseSingleFamily({ monthlyRent: 2_100 }));
    expect(r.netCashFlow).toBeGreaterThan(0);
    expect(r.dscr).toBeGreaterThanOrEqual(1.0);
    expect(getDealTier(r)).toBe("Mixed");
  });

  it("classifies a small-negative-CF deal as Marginal", () => {
    // CF in (-200, 0) AND DSCR in (0.9, 1.0) → Marginal, not Negative.
    const r = calculateAnalysis(baseSingleFamily({ monthlyRent: 1_900 }));
    expect(r.netCashFlow).toBeLessThan(0);
    expect(r.netCashFlow).toBeGreaterThan(-200);
    expect(r.dscr).toBeGreaterThan(0.9);
    expect(getDealTier(r)).toBe("Marginal");
  });

  it("classifies a deep-negative deal as Negative", () => {
    // CF <= -200 OR DSCR < 0.9 → Negative.
    const r = calculateAnalysis(baseSingleFamily({ monthlyRent: 1_500 }));
    const triggersNegative = r.netCashFlow < -200 || r.dscr < 0.9;
    expect(triggersNegative).toBe(true);
    expect(getDealTier(r)).toBe("Negative");
  });
});

describe("getDealTier — cash purchase (no debt service)", () => {
  it("uses the cash-purchase branch when downPaymentPct = 100", () => {
    // The cash branch leans on cap rate + CoC + cash flow only
    // (DSCR is N/A). This deal hits Strong cuts in the cash branch:
    // cf >= 400, cap >= 7, coc >= 8.
    const r = calculateAnalysis(
      baseSingleFamily({ monthlyRent: 3_000, downPaymentPct: 100 })
    );
    expect(r.monthlyPayment).toBeLessThanOrEqual(0); // no debt
    expect(r.netCashFlow).toBeGreaterThanOrEqual(400);
    expect(r.capRate).toBeGreaterThanOrEqual(7);
    expect(r.cocReturn).toBeGreaterThanOrEqual(8);
    expect(getDealTier(r)).toBe("Strong");
  });

  it("classifies a modest cash deal as Mixed (cap below 5)", () => {
    // Cap rate < 5% → falls through Strong and Solid, lands at Mixed.
    const r = calculateAnalysis(
      baseSingleFamily({ monthlyRent: 1_500, downPaymentPct: 100 })
    );
    expect(r.monthlyPayment).toBeLessThanOrEqual(0);
    expect(r.netCashFlow).toBeGreaterThan(0);
    expect(r.capRate).toBeLessThan(5);
    expect(getDealTier(r)).toBe("Mixed");
  });
});

describe("getDealTier — boundary invariants", () => {
  it("returns exactly one of the five tiers for every well-formed deal", () => {
    const tiers = ["Strong", "Solid", "Mixed", "Marginal", "Negative"];
    const rents = [800, 1_500, 1_900, 2_100, 2_400, 3_500];
    for (const monthlyRent of rents) {
      const r = calculateAnalysis(baseSingleFamily({ monthlyRent }));
      expect(tiers).toContain(getDealTier(r));
    }
  });

  it("tier rank improves monotonically as rent rises (holding price fixed)", () => {
    // Sweep rent upward and confirm the tier never drops.
    const rank: Record<string, number> = {
      Negative: 0,
      Marginal: 1,
      Mixed: 2,
      Solid: 3,
      Strong: 4,
    };
    const rents = [1_500, 1_900, 2_100, 2_400, 2_800, 3_500];
    let lastRank = -1;
    for (const monthlyRent of rents) {
      const r = calculateAnalysis(baseSingleFamily({ monthlyRent }));
      const here = rank[getDealTier(r)];
      expect(here).toBeGreaterThanOrEqual(lastRank);
      lastRank = here;
    }
  });
});
