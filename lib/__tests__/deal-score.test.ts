/**
 * Deal Score — holistic (total-return-aware) scoring tests.
 *
 * The Deal Score used to be built ONLY from year-1 operating metrics
 * (cash flow / CoC / cap rate / DSCR). That made it blind to the three
 * non-cash-flow sources of real-estate return — appreciation, loan
 * paydown, and the tax shield — so a genuinely strong long-term hold with
 * negative year-1 cash flow (e.g. a low-money-down deal projecting +678%
 * total ROI over 10 years) scored 0 / "Avoid — weak fundamentals".
 *
 * The engine now adds a fifth component (Total Return, 0–25) computed from
 * the same exit-scenario engine the Exit Scenarios panel + PDF use, makes
 * the negative-cash-flow penalty after-tax aware, and floors an
 * appreciation play out of the "Avoid" band. These tests pin that
 * behaviour so it can't silently regress.
 *
 * Per CLAUDE.md §8, score/threshold changes are "ask first" — these tests
 * encode the agreed behaviour; do not loosen them to push a tier change.
 */

import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
  dealScoreInputSchema,
  computeTenYearAnnualizedReturnPct,
  type DealScoreInput,
} from "../deal-score";
import { SAMPLE_DEAL_VALUES } from "../sample-deal";
import type { InvestmentFormValues } from "../investcalc-schema";

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

function baseSingleFamily(
  overrides: Partial<InvestmentFormValues> = {}
): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "2138 E Tucker St, Philadelphia, PA 19125, USA",
    purchasePrice: 205_000,
    yearBuilt: undefined,
    bedrooms: 3,
    bathrooms: 1,
    sqft: 1200,
    monthlyRent: 2_000,
    units: [],
    downPaymentPct: 20,
    interestRate: 7,
    loanTermYears: 30,
    closingCostsPct: 3,
    propertyTaxPct: 1.0,
    insuranceInputMode: "percent",
    insurancePct: 0.5,
    insuranceMonthly: undefined,
    hoaMonthly: 0,
    utilitiesMonthly: 0,
    maintenancePct: 5,
    vacancyPct: 5,
    mgmtPct: 0,
    capexPct: 5,
    buildingValuePct: 85,
    depreciationYears: 27.5,
    includeInterestDeduction: true,
    taxRatePct: 32,
    expenseGrowthPct: 2,
    rentGrowthPct: 3,
    appreciationRatePct: 3,
    sellingCostPct: 6,
    ...overrides,
  } as InvestmentFormValues;
}

describe("computeDealScore — appreciation play (the headline fix)", () => {
  it("does NOT score a strong-total-return / positive-after-tax deal as Avoid", () => {
    // Tucker-style: negative year-1 pre-tax CF + sub-1 DSCR, but positive
    // after-tax cash flow and a ~23%/yr projected total return.
    const r = computeDealScore(
      input({
        monthlyCashFlow: -159,
        cashOnCashReturn: -19,
        capRate: 7.0,
        dscr: 0.9,
        monthlyPropertyTax: 200,
        monthlyRentIncome: 2_000,
        afterTaxMonthlyCashFlow: 226,
        tenYearAnnualizedReturnPct: 22.8,
      })
    );
    expect(r.breakdown.totalReturnScore).toBe(25);
    expect(r.recommendation).not.toBe("Avoid");
    expect(r.recommendation).not.toBe("Risky");
    expect(r.score).toBeGreaterThanOrEqual(40); // appreciation floor
    expect(r.riskLevel).not.toBe("High Risk");
    expect(r.explanation.toLowerCase()).toContain("appreciation play");
  });

  it("still scores a weak deal (no upside, bleeding after-tax) as Avoid/Risky", () => {
    const r = computeDealScore(
      input({
        monthlyCashFlow: -350,
        cashOnCashReturn: -25,
        capRate: 3.5,
        dscr: 0.78,
        vacancyRate: 9,
        propertyAge: 40,
        capexPct: 12,
        maintenancePct: 11,
        monthlyPropertyTax: 400,
        monthlyRentIncome: 1_500,
        afterTaxMonthlyCashFlow: -180,
        tenYearAnnualizedReturnPct: 4,
      })
    );
    expect(["Avoid", "Risky"]).toContain(r.recommendation);
    expect(r.explanation.toLowerCase()).not.toContain("appreciation play");
  });

  it("does not floor a negative-after-tax deal even if total return looks high", () => {
    // Strong leveraged total return but the owner IS bleeding after-tax →
    // no appreciation floor (you can't carry it on the tax shield).
    const r = computeDealScore(
      input({
        monthlyCashFlow: -500,
        cashOnCashReturn: -30,
        capRate: 4.5,
        dscr: 0.82,
        monthlyPropertyTax: 250,
        monthlyRentIncome: 1_800,
        afterTaxMonthlyCashFlow: -240,
        tenYearAnnualizedReturnPct: 18,
      })
    );
    // totalReturn still credited, but no floor → stays out of Neutral+.
    expect(r.breakdown.totalReturnScore).toBeGreaterThan(0);
    expect(["Avoid", "Risky"]).toContain(r.recommendation);
  });
});

describe("computeDealScore — fundamentals still drive the top end", () => {
  it("scores a strong all-around deal as Strong Buy", () => {
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
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.recommendation).toBe("Strong Buy");
    expect(r.riskLevel).toBe("Low Risk");
  });

  it("gives cash purchases full DSCR credit (no debt to cover)", () => {
    const r = computeDealScore(
      input({
        monthlyCashFlow: 500,
        cashOnCashReturn: 6,
        capRate: 6.4,
        dscr: 0,
        propertyAge: 5,
        monthlyPropertyTax: 150,
        monthlyRentIncome: 1_500,
        isCashPurchase: true,
        afterTaxMonthlyCashFlow: 600,
        tenYearAnnualizedReturnPct: 8,
      })
    );
    expect(r.breakdown.dscrScore).toBe(17);
    expect(r.score).toBeGreaterThan(0);
    expect(r.recommendation).not.toBe("Avoid");
  });

  it("keeps owner-occupant near-break-even as at least Buy", () => {
    const r = computeDealScore(
      input({
        propertyType: "owner-occupant",
        monthlyCashFlow: -150,
        cashOnCashReturn: 0,
        capRate: 5.5,
        dscr: 1.05,
        propertyAge: 10,
        monthlyPropertyTax: 250,
        monthlyRentIncome: 1_800,
        afterTaxMonthlyCashFlow: 50,
        tenYearAnnualizedReturnPct: 7,
      })
    );
    expect(r.recommendation).toBe("Buy");
  });
});

describe("computeDealScore — invariants", () => {
  it("is backward-compatible when total-return fields are absent", () => {
    const r = computeDealScore(
      input({
        monthlyCashFlow: 300,
        cashOnCashReturn: 6,
        capRate: 6.6,
        dscr: 1.22,
        monthlyPropertyTax: 180,
        monthlyRentIncome: 2_000,
        // no afterTaxMonthlyCashFlow, no tenYearAnnualizedReturnPct
      })
    );
    expect(r.breakdown.totalReturnScore).toBe(0);
    expect(typeof r.recommendation).toBe("string");
    expect(r.score).toBeGreaterThan(0);
  });

  it("score is monotonic non-decreasing in projected total return", () => {
    const low = computeDealScore(
      input({
        monthlyCashFlow: 120,
        cashOnCashReturn: 4,
        capRate: 6.0,
        dscr: 1.15,
        monthlyPropertyTax: 180,
        monthlyRentIncome: 2_000,
        afterTaxMonthlyCashFlow: 240,
        tenYearAnnualizedReturnPct: 5,
      })
    );
    const high = computeDealScore(
      input({
        monthlyCashFlow: 120,
        cashOnCashReturn: 4,
        capRate: 6.0,
        dscr: 1.15,
        monthlyPropertyTax: 180,
        monthlyRentIncome: 2_000,
        afterTaxMonthlyCashFlow: 240,
        tenYearAnnualizedReturnPct: 20,
      })
    );
    expect(high.score).toBeGreaterThanOrEqual(low.score);
  });

  it("clamps the score to 0–100", () => {
    const r = computeDealScore(
      input({
        monthlyCashFlow: 5_000,
        cashOnCashReturn: 30,
        capRate: 15,
        dscr: 3,
        monthlyPropertyTax: 100,
        monthlyRentIncome: 5_000,
        afterTaxMonthlyCashFlow: 5_200,
        tenYearAnnualizedReturnPct: 40,
      })
    );
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe("buildDealScoreInputFromAnalysis — end-to-end wiring", () => {
  it("computes a total return for the marketing sample deal and keeps it strong", () => {
    const result = calculateAnalysis(SAMPLE_DEAL_VALUES);
    const scoreInput = buildDealScoreInputFromAnalysis(SAMPLE_DEAL_VALUES, result);
    expect(scoreInput.tenYearAnnualizedReturnPct).not.toBeUndefined();
    const r = computeDealScore(scoreInput);
    expect(r.breakdown.totalReturnScore).toBeGreaterThan(0);
    expect(["Buy", "Strong Buy"]).toContain(r.recommendation);
    expect(r.score).toBeGreaterThanOrEqual(55);
  });

  it("no longer rescues an appreciation play that bleeds AFTER tax (2138 E Tucker St)", () => {
    // 3% down + realistic Philly carry (8% mgmt, ~1.4% tax, 7.25% rate)
    // pushes year-1 pre-tax cash flow negative. Under the legacy one-way
    // tax shield this deal's after-tax CF looked positive and the
    // appreciation-play floor rescued it — but the SIGNED year-1 tax
    // effect (founder-approved 2026-07-14) shows it still bleeds after
    // tax, so the floor correctly refuses: an "appreciation play" must at
    // least cover itself post-tax.
    const values = baseSingleFamily({
      downPaymentPct: 3,
      mgmtPct: 8,
      propertyTaxPct: 1.4,
      interestRate: 7.25,
    });
    const result = calculateAnalysis(values);
    const scoreInput = buildDealScoreInputFromAnalysis(values, result);

    expect(result.netCashFlow).toBeLessThan(0);
    expect(result.afterTaxCF).toBeLessThan(0); // the honest number
    expect(scoreInput.tenYearAnnualizedReturnPct ?? 0).toBeGreaterThan(12);

    const r = computeDealScore(scoreInput);
    expect(["Risky", "Avoid"]).toContain(r.recommendation);
  });

  it("does not let an illustrative tax benefit rescue negative pre-tax carry", () => {
    // Passive-loss usability is taxpayer-specific. The production builder
    // deliberately feeds pre-tax carry into Deal Fit even when the separate
    // illustrative view happens to show a positive signed tax effect.
    const values = baseSingleFamily({
      downPaymentPct: 3,
      mgmtPct: 8,
      propertyTaxPct: 1.4,
      interestRate: 7.25,
      monthlyRent: 2_300,
    });
    const result = calculateAnalysis(values);
    const scoreInput = buildDealScoreInputFromAnalysis(values, result);

    expect(result.netCashFlow).toBeLessThan(0);
    expect(result.afterTaxCF).toBeGreaterThanOrEqual(0);
    expect(scoreInput.afterTaxMonthlyCashFlow).toBe(result.netCashFlow);

    const r = computeDealScore(scoreInput);
    expect(["Risky", "Avoid"]).toContain(r.recommendation);
  });
});

describe("computeTenYearAnnualizedReturnPct — edge branches", () => {
  const baseResult = {
    loanAmount: 160_000,
    monthlyPayment: 1_100,
    downPayment: 40_000,
    closingCosts: 6_000,
    totalCashRequired: 46_000,
    tenYearProjection: Array.from({ length: 10 }, (_, i) => ({
      cumulativeCashFlowAnnual: 1_200 * (i + 1),
    })),
    taxStrategyYears: Array.from({ length: 10 }, (_, i) => ({
      cumulativeTaxBenefitAnnual: 2_000 * (i + 1),
    })),
  };
  const baseValues = {
    purchasePrice: 200_000,
    interestRate: 7,
    loanTermYears: 30,
    appreciationRatePct: 3,
    sellingCostPct: 6,
  };

  it("returns null when no cash is invested (totalCashRequired = 0)", () => {
    expect(
      computeTenYearAnnualizedReturnPct(baseValues, { ...baseResult, totalCashRequired: 0 })
    ).toBeNull();
  });

  it("returns null when the projection is empty", () => {
    expect(
      computeTenYearAnnualizedReturnPct(baseValues, { ...baseResult, tenYearProjection: [] })
    ).toBeNull();
  });

  it("returns -100 (full loss) when you'd lose more than your basis", () => {
    const wipeout = {
      ...baseResult,
      purchasePrice: 200_000,
      tenYearProjection: Array.from({ length: 10 }, () => ({
        cumulativeCashFlowAnnual: -400_000,
      })),
      taxStrategyYears: Array.from({ length: 10 }, () => ({ cumulativeTaxBenefitAnnual: 0 })),
    };
    expect(
      computeTenYearAnnualizedReturnPct({ ...baseValues, appreciationRatePct: 0 }, wipeout)
    ).toBe(-100);
  });

  it("returns a positive annualized percent for a healthy leveraged deal", () => {
    const pct = computeTenYearAnnualizedReturnPct(baseValues, baseResult);
    expect(pct).not.toBeNull();
    expect(pct as number).toBeGreaterThan(0);
    expect(pct as number).toBeLessThan(100);
  });
});

describe("computeDealScore — strategy lens", () => {
  // Tucker-style appreciation play: negative year-1 CF, positive after-tax,
  // strong projected total return.
  const appreciationPlay = input({
    monthlyCashFlow: -159,
    cashOnCashReturn: -19,
    capRate: 7.0,
    dscr: 0.9,
    monthlyPropertyTax: 200,
    monthlyRentIncome: 2_000,
    afterTaxMonthlyCashFlow: 226,
    tenYearAnnualizedReturnPct: 22.8,
  });
  const strongAllRound = input({
    monthlyCashFlow: 650,
    cashOnCashReturn: 9,
    capRate: 7.5,
    dscr: 1.35,
    propertyAge: 8,
    monthlyPropertyTax: 200,
    monthlyRentIncome: 2_200,
    afterTaxMonthlyCashFlow: 800,
    tenYearAnnualizedReturnPct: 14,
  });

  it("defaults to balanced (identity) — the lens never moves an unset score", () => {
    const def = computeDealScore(appreciationPlay);
    const bal = computeDealScore(appreciationPlay, "balanced");
    expect(def.score).toBe(bal.score);
    expect(def.recommendation).toBe(bal.recommendation);
  });

  it("scores the SAME appreciation play differently per investor lens", () => {
    const cf = computeDealScore(appreciationPlay, "cash-flow");
    const bal = computeDealScore(appreciationPlay, "balanced");
    const appr = computeDealScore(appreciationPlay, "appreciation");

    // Monotonic across the spectrum: cash-flow ≤ balanced ≤ appreciation.
    expect(cf.score).toBeLessThan(bal.score);
    expect(appr.score).toBeGreaterThan(bal.score);

    // A cash-flow investor should be told to avoid a negative-cash-flow deal…
    expect(["Avoid", "Risky"]).toContain(cf.recommendation);
    // …while an appreciation investor sees its strong long-term return.
    expect(["Neutral", "Buy"]).toContain(appr.recommendation);
  });

  it("does not apply the appreciation floor under the cash-flow lens", () => {
    // Balanced floors this deal to 40; the cash-flow lens must be free to
    // score it below that floor (a negative-CF deal isn't a cash-flow buy).
    expect(computeDealScore(appreciationPlay, "cash-flow").score).toBeLessThan(40);
    expect(computeDealScore(appreciationPlay, "balanced").score).toBe(40);
  });

  it("keeps a genuinely strong deal a buy in every lens", () => {
    for (const strategy of ["cash-flow", "balanced", "appreciation"] as const) {
      const r = computeDealScore(strongAllRound, strategy);
      expect(["Buy", "Strong Buy"]).toContain(r.recommendation);
    }
  });

  it("renormalizes so a maxed-out deal tops out near 100 in every lens", () => {
    const perfect = input({
      monthlyCashFlow: 5_000,
      cashOnCashReturn: 30,
      capRate: 15,
      dscr: 3,
      monthlyPropertyTax: 50,
      monthlyRentIncome: 5_000,
      afterTaxMonthlyCashFlow: 5_200,
      tenYearAnnualizedReturnPct: 40,
    });
    for (const strategy of ["cash-flow", "balanced", "appreciation"] as const) {
      expect(computeDealScore(perfect, strategy).score).toBeGreaterThanOrEqual(99);
    }
  });
});

describe("computeDealScore — Phase 1: appreciation-floor recalibration + coherence", () => {
  // The 8–11%/yr "dead zone": before the floor threshold moved 12 → 8, a deal
  // the engine itself calls a "solid total return" (its >8%/yr tier) but under
  // 12% got NO floor and cratered to ~13 / Avoid — contradicting its own green
  // metrics and "wealth-building hold" copy. This pins the fix.
  it("floors an ~10%/yr after-tax-positive appreciation play to Neutral, not Avoid", () => {
    const tenPctPlay = input({
      monthlyCashFlow: -205,
      cashOnCashReturn: -3.6,
      capRate: 5.4,
      dscr: 0.87,
      propertyAge: 84,
      maintenancePct: 10,
      monthlyPropertyTax: 373,
      monthlyRentIncome: 2_500,
      afterTaxMonthlyCashFlow: 303,
      tenYearAnnualizedReturnPct: 10,
    });
    for (const strategy of ["balanced", "appreciation"] as const) {
      const r = computeDealScore(tenPctPlay, strategy);
      expect(r.score).toBeGreaterThanOrEqual(40);
      expect(r.recommendation).not.toBe("Avoid");
      expect(r.recommendation).not.toBe("Risky");
      expect(r.riskLevel).not.toBe("High Risk");
    }
  });

  // Coherence invariant: the headline number and the prose must agree. The
  // "wealth-building hold" copy and the score floor share ONE predicate, so the
  // copy can never appear on a deal the score calls Avoid/Risky.
  it("never shows 'wealth-building hold' copy while the score says Avoid/Risky", () => {
    for (const annual of [9, 12, 18, 25]) {
      for (const strategy of ["balanced", "appreciation"] as const) {
        const r = computeDealScore(
          input({
            monthlyCashFlow: -180,
            cashOnCashReturn: -10,
            capRate: 6,
            dscr: 0.9,
            monthlyPropertyTax: 200,
            monthlyRentIncome: 2_000,
            afterTaxMonthlyCashFlow: 120,
            tenYearAnnualizedReturnPct: annual,
          }),
          strategy
        );
        if (r.explanation.toLowerCase().includes("wealth-building hold")) {
          expect(r.recommendation).not.toBe("Avoid");
          expect(r.recommendation).not.toBe("Risky");
          expect(r.score).toBeGreaterThanOrEqual(35);
        }
      }
    }
  });

  // Lens-aware prose: under the cash-flow lens (which doesn't credit
  // appreciation) a negative-cash-flow deal must NOT be called a wealth-
  // building hold — it should point the user to the lens that does.
  it("does not call a negative-CF deal a wealth-building hold under the cash-flow lens", () => {
    const r = computeDealScore(
      input({
        monthlyCashFlow: -159,
        cashOnCashReturn: -19,
        capRate: 7,
        dscr: 0.9,
        monthlyPropertyTax: 200,
        monthlyRentIncome: 2_000,
        afterTaxMonthlyCashFlow: 226,
        tenYearAnnualizedReturnPct: 22.8,
      }),
      "cash-flow"
    );
    expect(r.explanation.toLowerCase()).not.toContain("wealth-building hold");
    expect(r.explanation.toLowerCase()).toContain("lens");
  });

  // Age softening (-10/-5/-2 → -6/-4/-2): pre-war stock isn't dragged a risk
  // tier purely for being old; genuine condition risk is still captured by the
  // separate age>20 + high-capex/maintenance penalty.
  it("does not over-penalize a sound deal purely for being old (pre-war stock)", () => {
    const oldButFine = {
      monthlyCashFlow: 250,
      cashOnCashReturn: 8,
      capRate: 7,
      dscr: 1.3,
      monthlyPropertyTax: 200,
      monthlyRentIncome: 1_500,
      afterTaxMonthlyCashFlow: 320,
      tenYearAnnualizedReturnPct: 12,
    };
    const young = computeDealScore(input({ ...oldButFine, propertyAge: 5 }));
    const old = computeDealScore(input({ ...oldButFine, propertyAge: 84 }));
    expect(young.score - old.score).toBeLessThanOrEqual(6);
    expect(old.recommendation).not.toBe("Avoid");
  });
});
