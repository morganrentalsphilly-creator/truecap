/**
 * Tests for the MAO engine extensions: DSCR as a price target, and the inverse
 * "what would make THIS price work?" solvers (required rent, required rate).
 * These dollar/rate numbers go straight into negotiation guidance, so the math
 * is pinned here.
 */
import { describe, expect, it, vi } from "vitest";

import * as calcAnalysisModule from "../calc-analysis";
import { calculateAnalysis } from "../calc-analysis";
import {
  calculateMaxAllowableOffer,
  meetsTarget,
  solveRequiredMonthlyRent,
  solveRequiredInterestRate,
  type MaoTarget,
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
      // achieved is computed AT maxPrice, which rounds DOWN — so the target
      // holds exactly, no binary-search slack needed.
      expect(res.achieved.dscr).toBeGreaterThanOrEqual(1.25);
    }
  });

  it("meetsTarget enforces the DSCR floor", () => {
    const r = calculateAnalysis(baseSingleFamily());
    expect(meetsTarget(r, { dscr: r.dscr - 0.1 })).toBe(true);
    expect(meetsTarget(r, { dscr: r.dscr + 0.5 })).toBe(false);
  });
});

describe("MAO — explicit purchase-price ceiling", () => {
  it("treats a hard price cap as a first-class target and recomputes achieved metrics there", () => {
    const values = baseSingleFamily();
    const target: MaoTarget = { monthlyCashFlow: -99_999, maxPurchasePrice: 180_250 };
    const res = calculateMaxAllowableOffer(values, target);

    expect(res).not.toBeNull();
    expect(res?.maxPrice).toBe(180_000);
    if (res) {
      const atDisplayedPrice = calculateAnalysis({ ...values, purchasePrice: res.maxPrice });
      expect(meetsTarget(atDisplayedPrice, target)).toBe(true);
      expect(res.achieved.netCashFlow).toBe(atDisplayedPrice.netCashFlow);
      expect(res.achieved.dscr).toBe(atDisplayedPrice.dscr);
    }
  });

  it("uses the price cap by itself instead of silently falling back to a return target", () => {
    const capOnly: MaoTarget = { maxPurchasePrice: 200_000 };
    const res = calculateMaxAllowableOffer(baseSingleFamily(), capOnly);

    expect(res?.maxPrice).toBe(200_000);
    expect(res && meetsTarget(res.achieved, capOnly)).toBe(true);
    expect(meetsTarget(calculateAnalysis(baseSingleFamily()), capOnly)).toBe(false);
  });

  it("uses an explicit price cap above the default $10M return-only search bound", () => {
    const capOnly: MaoTarget = { maxPurchasePrice: 50_000_000 };
    const res = calculateMaxAllowableOffer(baseSingleFamily(), capOnly);

    expect(res?.maxPrice).toBe(50_000_000);
    expect(res && meetsTarget(res.achieved, capOnly)).toBe(true);
  });

  it("fails closed instead of quoting the supported-price boundary as an exact ceiling", () => {
    const res = calculateMaxAllowableOffer(baseSingleFamily(), {
      maxPurchasePrice: 200_000_000,
    });
    expect(res).toBeNull();
  });

  it("fails closed when the displayed rounded price cannot be recomputed", () => {
    const values = baseSingleFamily();
    const target: MaoTarget = {
      monthlyCashFlow: -99_999,
      maxPurchasePrice: 180_250,
    };
    const baseline = calculateMaxAllowableOffer(values, target);
    expect(baseline?.maxPrice).toBe(180_000);

    const originalCalculateAnalysis = calcAnalysisModule.calculateAnalysis;
    const calculateSpy = vi.spyOn(calcAnalysisModule, "calculateAnalysis");
    calculateSpy.mockImplementation(((candidate: InvestmentFormValues) => {
      if (candidate.purchasePrice === baseline?.maxPrice) {
        throw new Error("displayed-price recompute failed");
      }
      return originalCalculateAnalysis(candidate);
    }) as typeof calcAnalysisModule.calculateAnalysis);

    try {
      expect(calculateMaxAllowableOffer(values, target)).toBeNull();
    } finally {
      calculateSpy.mockRestore();
    }
  });

  it("does not claim rent or rate can repair a current price above a hard cap", () => {
    const values = baseSingleFamily({ purchasePrice: 245_000 });
    const target: MaoTarget = { maxPurchasePrice: 200_000 };

    expect(solveRequiredMonthlyRent(values, target)?.unreachable).toBe(true);
    expect(solveRequiredInterestRate(values, target)?.unreachable).toBe(true);
  });
});

describe("MAO — product price search bound", () => {
  it("does not truncate a return-only Offer Ceiling at the former $10M limit", () => {
    const values = baseSingleFamily({
      purchasePrice: 20_000_000,
      monthlyRent: 1_000_000,
    });
    const target: MaoTarget = { monthlyCashFlow: 0 };
    const res = calculateMaxAllowableOffer(values, target);

    expect(res).not.toBeNull();
    expect(res?.maxPrice).toBeGreaterThan(10_000_000);
    expect(res && meetsTarget(res.achieved, target)).toBe(true);
  });
});

describe("MAO — returned price honors its own target (no round-up overshoot)", () => {
  // The UI quotes maxPrice as "the highest price that clears this" ("Your
  // number", "Max offer", the break-even hint). Rounding to NEAREST $500 used
  // to land up to $250 past the pass/fail boundary, so re-running the deal at
  // the quoted price failed the very bar it claimed to clear (e.g. DSCR ≥ 1.25
  // → $305,500 quoted, actual DSCR 1.249). Pin: the returned price itself
  // passes, for every target kind.
  const targets: { name: string; target: MaoTarget }[] = [
    { name: "DSCR ≥ 1.25", target: { dscr: 1.25 } },
    { name: "cash flow ≥ $100/mo", target: { monthlyCashFlow: 100 } },
    { name: "break-even cash flow", target: { monthlyCashFlow: 0 } },
    { name: "cash-on-cash ≥ 6%", target: { cocReturn: 6 } },
    { name: "cap rate ≥ 6%", target: { capRate: 6 } },
    { name: "break-even + DSCR ≥ 1.25 (default basis)", target: { monthlyCashFlow: 0, dscr: 1.25 } },
  ];

  for (const { name, target } of targets) {
    it(`re-running the analysis at the returned price still meets ${name}`, () => {
      const values = baseSingleFamily();
      const res = calculateMaxAllowableOffer(values, target);
      expect(res).not.toBeNull();
      if (res) {
        expect(res.maxPrice % 500).toBe(0);
        const at = calculateAnalysis({ ...values, purchasePrice: res.maxPrice });
        expect(meetsTarget(at, target)).toBe(true);
      }
    });
  }

  it("holds across rent levels (the audit's $305,500-class overshoots)", () => {
    for (const monthlyRent of [1_500, 2_100, 2_500, 3_200, 4_000]) {
      const values = baseSingleFamily({ monthlyRent });
      for (const target of [{ dscr: 1.25 }, { monthlyCashFlow: 0 }, { cocReturn: 6 }] as MaoTarget[]) {
        const res = calculateMaxAllowableOffer(values, target);
        expect(res).not.toBeNull();
        if (res) {
          const at = calculateAnalysis({ ...values, purchasePrice: res.maxPrice });
          expect(meetsTarget(at, target)).toBe(true);
        }
      }
    }
  });

  it("achieved describes the returned price, not the unrounded solver price", () => {
    const values = baseSingleFamily();
    const res = calculateMaxAllowableOffer(values, { monthlyCashFlow: 0 });
    expect(res).not.toBeNull();
    if (res) {
      const at = calculateAnalysis({ ...values, purchasePrice: res.maxPrice });
      expect(res.achieved.netCashFlow).toBe(at.netCashFlow);
      expect(res.achieved.dscr).toBe(at.dscr);
      expect(res.achieved.capRate).toBe(at.capRate);
      expect(res.achieved.cocReturn).toBe(at.cocReturn);
    }
  });

  it("clamps the floored price to minPrice instead of rounding below it", () => {
    // Range so narrow that flooring to a $500 step would fall below minPrice.
    const res = calculateMaxAllowableOffer(
      baseSingleFamily(),
      { monthlyCashFlow: -99_999 }, // trivially met — the solver walks to the top of the range
      { minPrice: 10_250, maxPrice: 10_499 }
    );
    expect(res).not.toBeNull();
    expect(res?.maxPrice).toBe(10_250);
  });

  it("still returns null for unreachable targets and empty targets (contracts preserved)", () => {
    expect(
      calculateMaxAllowableOffer(baseSingleFamily({ monthlyRent: 0 }), { monthlyCashFlow: 100 })
    ).toBeNull();
    expect(calculateMaxAllowableOffer(baseSingleFamily(), {})).toBeNull();
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
      expect(Number.isInteger(res.value)).toBe(true);
      const atDisplayedRent = calculateAnalysis({ ...base, monthlyRent: res.value });
      expect(meetsTarget(atDisplayedRent, target)).toBe(true);
      expect(res.achieved.netCashFlow).toBe(atDisplayedRent.netCashFlow);
      expect(res.achieved.dscr).toBe(atDisplayedRent.dscr);
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

  it("ignores an inapplicable DSCR floor and still solves rent for a cash deal", () => {
    const cashDeal = baseSingleFamily({ downPaymentPct: 100 });
    const current = calculateAnalysis(cashDeal);
    const target = { monthlyCashFlow: current.netCashFlow + 200, dscr: 1.25 };
    const res = solveRequiredMonthlyRent(cashDeal, target);
    expect(res).not.toBeNull();
    expect(res?.unreachable).toBe(false);
    if (res) {
      const atDisplayedRent = calculateAnalysis({ ...cashDeal, monthlyRent: res.value });
      expect(meetsTarget(atDisplayedRent, target)).toBe(true);
      expect(res.achieved.netCashFlow).toBe(atDisplayedRent.netCashFlow);
    }
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
      expect(Number.isInteger(res.value * 100)).toBe(true);
      const atDisplayedRate = calculateAnalysis({ ...base, interestRate: res.value });
      expect(meetsTarget(atDisplayedRate, target)).toBe(true);
      expect(res.achieved.netCashFlow).toBe(atDisplayedRate.netCashFlow);
      expect(res.achieved.dscr).toBe(atDisplayedRate.dscr);
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

describe("MAO — cash-purchase DSCR handling", () => {
  it("treats DSCR as not applicable when there is no debt service", () => {
    const cashDeal = baseSingleFamily({ downPaymentPct: 100 });
    const result = calculateAnalysis(cashDeal);
    expect(result.monthlyPayment).toBe(0);
    expect(result.dscr).toBe(0);
    expect(meetsTarget(result, { dscr: 1.25 })).toBe(true);
  });

  it("does not let DSCR make a combined cash-deal price target unreachable", () => {
    const cashDeal = baseSingleFamily({ downPaymentPct: 100 });
    const res = calculateMaxAllowableOffer(cashDeal, {
      monthlyCashFlow: 0,
      dscr: 1.25,
    });
    expect(res).not.toBeNull();
    if (res) expect(meetsTarget(res.achieved, res.target)).toBe(true);
  });

  it("rejects a DSCR-only target because cash has no debt service to constrain", () => {
    const cashDeal = baseSingleFamily({ downPaymentPct: 100 });
    expect(calculateMaxAllowableOffer(cashDeal, { dscr: 1.25 })).toBeNull();
  });
});
