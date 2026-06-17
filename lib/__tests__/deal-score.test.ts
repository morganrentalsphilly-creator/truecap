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

  it("rescues a real low-money-down appreciation play (2138 E Tucker St)", () => {
    // 3% down + realistic Philly carry (8% mgmt, ~1.4% tax, 7.25% rate)
    // pushes year-1 pre-tax cash flow negative while the high-leverage
    // appreciation + paydown keep the 10-year total return strong.
    const values = baseSingleFamily({
      downPaymentPct: 3,
      mgmtPct: 8,
      propertyTaxPct: 1.4,
      interestRate: 7.25,
    });
    const result = calculateAnalysis(values);
    const scoreInput = buildDealScoreInputFromAnalysis(values, result);

    // Preconditions: this IS the hard case — negative year-1 cash flow but
    // a strong projected long-term return.
    expect(result.netCashFlow).toBeLessThan(0);
    expect(scoreInput.tenYearAnnualizedReturnPct ?? 0).toBeGreaterThan(12);

    const r = computeDealScore(scoreInput);
    expect(r.recommendation).not.toBe("Avoid");
    expect(r.recommendation).not.toBe("Risky");
    expect(r.score).toBeGreaterThanOrEqual(35);
  });
});
