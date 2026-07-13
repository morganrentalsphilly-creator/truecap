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
