/**
 * Tests for the buy-box "your number" helpers in lib/mao-targets:
 * chooseMaoTargetFromBuyBox (the box-shaped target, or null when the box
 * doesn't shape one) and solveBuyBoxClearingPrice (the highest price that
 * clears the box's price-solvable criteria). These numbers render as
 * negotiation guidance in the verdict card, so the semantics are pinned.
 */
import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import { meetsTarget } from "../max-allowable-offer";
import {
  buildMaoTarget,
  chooseMaoTargetFromBuyBox,
  solveBuyBoxClearingPrice,
} from "../mao-targets";
import { EMPTY_BUY_BOX, type BuyBoxCriteria } from "../buy-box";
import type { InvestmentFormValues } from "../investcalc-schema";

const box = (overrides: Partial<BuyBoxCriteria>): BuyBoxCriteria => ({
  ...EMPTY_BUY_BOX,
  ...overrides,
});

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

describe("chooseMaoTargetFromBuyBox", () => {
  it("returns the box-shaped target when the box carries return thresholds", () => {
    const b = box({ minCapRatePct: 6, minCashFlowMonthly: 150 });
    expect(chooseMaoTargetFromBuyBox(b, { isCashPurchase: false })).toEqual(
      buildMaoTarget(b, { isCashPurchase: false })
    );
    expect(chooseMaoTargetFromBuyBox(b, { isCashPurchase: false })).toEqual({
      capRate: 6,
      monthlyCashFlow: 150,
    });
  });

  it("returns null when the box wouldn't shape the target (no silent default attribution)", () => {
    expect(chooseMaoTargetFromBuyBox(null, { isCashPurchase: false })).toBeNull();
    expect(chooseMaoTargetFromBuyBox(EMPTY_BUY_BOX, { isCashPurchase: false })).toBeNull();
    // Price/type/market-only box: buildMaoTarget would fall back to defaults.
    expect(
      chooseMaoTargetFromBuyBox(
        box({ maxPurchasePrice: 300_000, targetStates: ["PA"] }),
        { isCashPurchase: false }
      )
    ).toBeNull();
    // DSCR-only box on a cash deal: its sole threshold is dropped.
    expect(chooseMaoTargetFromBuyBox(box({ minDscr: 1.3 }), { isCashPurchase: true })).toBeNull();
  });

  it("keeps a mixed box's surviving thresholds on a cash deal", () => {
    expect(
      chooseMaoTargetFromBuyBox(box({ minDscr: 1.3, minCocPct: 8 }), { isCashPurchase: true })
    ).toEqual({ cocReturn: 8 });
  });
});

describe("solveBuyBoxClearingPrice", () => {
  it("solves a price whose analysis clears the box's return thresholds", () => {
    const values = baseSingleFamily();
    const b = box({ minCashFlowMonthly: 0, minDscr: 1.25 });
    const price = solveBuyBoxClearingPrice(values, b, { isCashPurchase: false });
    expect(price).not.toBeNull();
    if (price != null) {
      expect(price).toBeGreaterThan(0);
      // The card calls this "the highest price that clears this box" — the
      // returned price itself must clear it, no rounding slack.
      const at = calculateAnalysis({ ...values, purchasePrice: price });
      expect(meetsTarget(at, { monthlyCashFlow: 0, dscr: 1.25 })).toBe(true);
    }
  });

  it("caps the solved price at the box's own max purchase price", () => {
    const values = baseSingleFamily();
    const uncapped = solveBuyBoxClearingPrice(
      values,
      box({ minCashFlowMonthly: 0 }),
      { isCashPurchase: false }
    );
    expect(uncapped).not.toBeNull();
    const budget = Math.max(10_000, (uncapped ?? 0) - 50_000);
    const capped = solveBuyBoxClearingPrice(
      values,
      box({ minCashFlowMonthly: 0, maxPurchasePrice: budget }),
      { isCashPurchase: false }
    );
    expect(capped).toBe(budget);
  });

  it("returns the budget alone for a price-only box (nothing to solve)", () => {
    expect(
      solveBuyBoxClearingPrice(baseSingleFamily(), box({ maxPurchasePrice: 200_000 }), {
        isCashPurchase: false,
      })
    ).toBe(200_000);
  });

  it("returns null when no price can reach the targets (degenerate $0 rent)", () => {
    expect(
      solveBuyBoxClearingPrice(
        baseSingleFamily({ monthlyRent: 0 }),
        box({ minCashFlowMonthly: 100 }),
        { isCashPurchase: false }
      )
    ).toBeNull();
  });

  it("returns null for a missing box or a DSCR-only box on a cash deal without a budget", () => {
    expect(
      solveBuyBoxClearingPrice(baseSingleFamily(), null, { isCashPurchase: false })
    ).toBeNull();
    expect(
      solveBuyBoxClearingPrice(baseSingleFamily(), box({ minDscr: 1.3 }), {
        isCashPurchase: true,
      })
    ).toBeNull();
  });

  it("falls back to the budget when a cash deal drops the box's only return threshold", () => {
    expect(
      solveBuyBoxClearingPrice(
        baseSingleFamily(),
        box({ minDscr: 1.3, maxPurchasePrice: 150_000 }),
        { isCashPurchase: true }
      )
    ).toBe(150_000);
  });
});
