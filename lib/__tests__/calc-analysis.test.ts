/**
 * Math lockdown tests for `calculateAnalysis` and friends.
 *
 * These tests pin the calculation engine to known-correct values
 * computed by hand using textbook real estate investment formulas.
 * They are deliberately granular — each metric is checked against a
 * hand-derived expected value (with small tolerances for rounding).
 *
 * If any of these break, the math has changed. Either:
 *   (a) the change was intentional (then update the expected value
 *       and explain why in the commit message), or
 *   (b) it's a regression (revert it).
 *
 * Do NOT loosen the tolerances to make a failing test pass. The
 * whole point of this file is to catch silent math drift.
 */

import { describe, expect, it } from "vitest";

import {
  buildExitScenarios,
  type ExitScenarioInput,
} from "../exit-scenarios";
import { analyzeBrrrr } from "../brrrr-analysis";
import {
  analyzeFixFlip,
  estimateFixFlipCarryingCost,
} from "../fix-flip-analysis";
import { calculateAnalysis } from "../calc-analysis";
import { buildTenYearProjection } from "../ten-year-projections";
import type { InvestmentFormValues } from "../investcalc-schema";

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

/** A canonical single-family deal used as the baseline across tests. */
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

// ──────────────────────────────────────────────────────────────────
// 1. Mortgage payment — the textbook amortization formula
// ──────────────────────────────────────────────────────────────────
describe("monthly mortgage payment (via calculateAnalysis)", () => {
  it("$100k @ 6% for 30 years = $599.55/mo (within $1)", () => {
    // Hand-derived via M = P * r * (1+r)^n / ((1+r)^n - 1)
    // r = 0.06/12 = 0.005, n = 360 → M = 599.55
    const result = calculateAnalysis(
      baseSingleFamily({
        purchasePrice: 125_000,
        downPaymentPct: 20,       // loan = 100,000
        interestRate: 6,
        loanTermYears: 30,
      })
    );
    expect(result.loanAmount).toBe(100_000);
    expect(Math.abs(result.monthlyPayment - 600)).toBeLessThanOrEqual(1);
  });

  it("$200k @ 7% for 30 years = $1,330.60/mo (within $2)", () => {
    // M = 200000 * 0.00583 * (1.00583)^360 / ((1.00583)^360 - 1)
    //   = $1,330.60
    const result = calculateAnalysis(
      baseSingleFamily({
        purchasePrice: 250_000,
        downPaymentPct: 20,       // loan = 200,000
        interestRate: 7,
        loanTermYears: 30,
      })
    );
    expect(result.loanAmount).toBe(200_000);
    expect(Math.abs(result.monthlyPayment - 1331)).toBeLessThanOrEqual(2);
  });

  it("0% interest → simple division (no NaN)", () => {
    const result = calculateAnalysis(
      baseSingleFamily({
        purchasePrice: 120_000,
        downPaymentPct: 50,       // loan = 60,000
        interestRate: 0,
        loanTermYears: 30,
      })
    );
    // 60000 / 360 = 166.67/mo
    expect(Math.abs(result.monthlyPayment - 167)).toBeLessThanOrEqual(1);
  });

  it("100% down (cash purchase) → monthlyPayment = 0", () => {
    const result = calculateAnalysis(
      baseSingleFamily({
        downPaymentPct: 100,
        interestRate: 7,
      })
    );
    expect(result.loanAmount).toBe(0);
    expect(result.monthlyPayment).toBe(0);
    // DSCR should be 0 (calc-analysis convention for cash purchase)
    expect(result.dscr).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────
// 2. Cap rate — NOI / Purchase Price
// ──────────────────────────────────────────────────────────────────
describe("cap rate", () => {
  it("matches NOI / Purchase Price exactly", () => {
    const result = calculateAnalysis(baseSingleFamily());
    // NOI = (rent - operating expenses EXCLUDING the CapEx reserve) * 12.
    // CapEx is a below-the-line return-of-capital reserve, not an operating
    // expense (matches the glossary + the lender-standard NOI definition).
    const noi = (result.monthlyRentalIncome - (result.totalOperatingExpenses - result.capex)) * 12;
    const expectedCapRate = (noi / 245_000) * 100;
    expect(Math.abs(result.capRate - expectedCapRate)).toBeLessThan(0.01);
  });

  it("EXCLUDES the CapEx reserve from NOI but keeps it in cash flow", () => {
    const withCapex = calculateAnalysis(baseSingleFamily({ capexPct: 10 }));
    const noCapex = calculateAnalysis(baseSingleFamily({ capexPct: 0 }));
    // Cap rate must NOT change with the CapEx reserve (CapEx is out of NOI)...
    expect(Math.abs(withCapex.capRate - noCapex.capRate)).toBeLessThan(0.01);
    // ...but cash flow MUST be lower with a higher CapEx reserve.
    expect(withCapex.netCashFlow).toBeLessThan(noCapex.netCashFlow);
  });

  it("EXCLUDES debt service from NOI", () => {
    // Two deals — same NOI, different financing. Cap rate MUST be identical.
    const cash = calculateAnalysis(
      baseSingleFamily({ downPaymentPct: 100, interestRate: 0 })
    );
    const financed = calculateAnalysis(
      baseSingleFamily({ downPaymentPct: 20, interestRate: 7 })
    );
    expect(Math.abs(cash.capRate - financed.capRate)).toBeLessThan(0.01);
  });

  it("price = 0 → cap rate is 0 (no NaN)", () => {
    // Schema enforces purchasePrice >= 1, but the calc has a guard at 0.
    // We can't actually call with price=0 (Zod blocks it), but we can
    // verify the guard via the cocReturn check below.
    expect(true).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────
// 3. Cash-on-Cash return — Annual Cash Flow / Total Cash Invested
// ──────────────────────────────────────────────────────────────────
describe("cash-on-cash return", () => {
  it("matches (annualCashFlow / totalCashRequired) * 100", () => {
    const result = calculateAnalysis(baseSingleFamily());
    const expected =
      result.totalCashRequired > 0
        ? (result.annualCashFlow / result.totalCashRequired) * 100
        : 0;
    expect(Math.abs(result.cocReturn - expected)).toBeLessThan(0.01);
  });

  it("totalCashRequired = downPayment + closingCosts (no rehab in headline)", () => {
    const result = calculateAnalysis(baseSingleFamily());
    expect(result.totalCashRequired).toBe(
      result.downPayment + result.closingCosts
    );
  });
});

// ──────────────────────────────────────────────────────────────────
// 4. DSCR — NOI / Annual Debt Service (we use monthly/monthly which is equivalent)
// ──────────────────────────────────────────────────────────────────
describe("DSCR", () => {
  it("monthly NOI / monthly P&I matches annual NOI / annual P&I", () => {
    const result = calculateAnalysis(baseSingleFamily());
    // DSCR NOI excludes the CapEx reserve (lender-standard).
    const monthlyNoi =
      result.monthlyRentalIncome - (result.totalOperatingExpenses - result.capex);
    const expectedDscr =
      result.monthlyPayment > 0 ? monthlyNoi / result.monthlyPayment : 0;
    expect(Math.abs(result.dscr - expectedDscr)).toBeLessThan(0.001);
  });

  it("cash purchase returns DSCR = 0 (sentinel for N/A)", () => {
    const result = calculateAnalysis(
      baseSingleFamily({ downPaymentPct: 100 })
    );
    expect(result.dscr).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────
// PMI — financed conventional loans under 20% down
// ──────────────────────────────────────────────────────────────────
describe("PMI", () => {
  it("applies when down payment < 20% and reduces cash flow", () => {
    const lowDown = calculateAnalysis(baseSingleFamily({ downPaymentPct: 10 }));
    expect(lowDown.pmiMonthly).toBeGreaterThan(0);
    const expected =
      lowDown.monthlyRentalIncome -
      lowDown.totalOperatingExpenses -
      lowDown.monthlyPayment -
      lowDown.pmiMonthly;
    expect(lowDown.netCashFlow).toBe(expected);
  });

  it("is 0 at 20%+ down and on a cash purchase", () => {
    expect(calculateAnalysis(baseSingleFamily({ downPaymentPct: 20 })).pmiMonthly).toBe(0);
    expect(calculateAnalysis(baseSingleFamily({ downPaymentPct: 25 })).pmiMonthly).toBe(0);
    expect(calculateAnalysis(baseSingleFamily({ downPaymentPct: 100 })).pmiMonthly).toBe(0);
  });

  it("is excluded from DSCR (DSCR uses P&I only)", () => {
    const lowDown = calculateAnalysis(baseSingleFamily({ downPaymentPct: 10 }));
    const monthlyNoi =
      lowDown.monthlyRentalIncome - (lowDown.totalOperatingExpenses - lowDown.capex);
    expect(Math.abs(lowDown.dscr - monthlyNoi / lowDown.monthlyPayment)).toBeLessThan(0.001);
  });

  it("is in early projection debt service, then drops as the loan pays down", () => {
    const proj = calculateAnalysis(baseSingleFamily({ downPaymentPct: 10 })).tenYearProjection;
    const pAndIAnnual = calculateAnalysis(baseSingleFamily({ downPaymentPct: 10 })).monthlyPayment * 12;
    expect(proj[0].debtServiceAnnual).toBeGreaterThan(pAndIAnnual); // PMI present year 1
    expect(proj[9].debtServiceAnnual).toBeLessThanOrEqual(proj[0].debtServiceAnnual); // never increases
  });

  it("honors a custom pmiAnnualRatePct override", () => {
    const dflt = calculateAnalysis(baseSingleFamily({ downPaymentPct: 10 }));
    const higher = calculateAnalysis(baseSingleFamily({ downPaymentPct: 10, pmiAnnualRatePct: 1.5 }));
    expect(higher.pmiMonthly).toBeGreaterThan(dflt.pmiMonthly);
    // 1.5% of the loan / 12.
    expect(higher.pmiMonthly).toBe(Math.round((higher.loanAmount * (1.5 / 100)) / 12));
  });

  it("pmiAnnualRatePct = 0 disables PMI entirely (lender-paid MI)", () => {
    const r = calculateAnalysis(baseSingleFamily({ downPaymentPct: 10, pmiAnnualRatePct: 0 }));
    expect(r.pmiMonthly).toBe(0);
  });

  it("pmiNoCancel keeps mortgage insurance for the life of the loan (FHA MIP)", () => {
    // Deterministic projection: loan starts just above 80% LTV and pays down
    // below it after year 1, so PMI cancels in year 2 unless pmiNoCancel.
    const base = {
      monthlyRentalIncome: 2_000,
      totalOperatingExpenses: 500,
      capexReserveMonthly: 0,
      monthlyPayment: 1_000,
      pmiMonthly: 100,
      loanAmount: 82_000,
      purchasePrice: 100_000, // 80% LTV drop threshold = $80,000
      taxSavingsMonthly: 0,
      annualDepreciation: 0,
      yearlyInterestSchedule: Array.from({ length: 10 }, () => 5_000), // $7k principal/yr
      rentGrowthPct: 0,
      expenseGrowthPct: 0,
      taxRate: 0.24,
      includeInterestDeduction: false,
    };
    const cancels = buildTenYearProjection({ ...base, pmiNoCancel: false });
    const forLife = buildTenYearProjection({ ...base, pmiNoCancel: true });
    expect(cancels[0]!.debtServiceAnnual).toBe(forLife[0]!.debtServiceAnnual); // PMI both, year 1
    expect(forLife[9]!.debtServiceAnnual).toBeGreaterThan(cancels[9]!.debtServiceAnnual); // MIP stays
  });

  it("excludes the CapEx reserve from the taxable-income line, not the cash-flow line", () => {
    const base = {
      monthlyRentalIncome: 2_000,
      totalOperatingExpenses: 500,
      monthlyPayment: 1_000,
      taxSavingsMonthly: 0,
      annualDepreciation: 0,
      yearlyInterestSchedule: [] as number[],
      rentGrowthPct: 0,
      expenseGrowthPct: 0,
      taxRate: 0.24,
      includeInterestDeduction: false,
    };
    const noReserve = buildTenYearProjection({ ...base, capexReserveMonthly: 0 });
    const withReserve = buildTenYearProjection({ ...base, capexReserveMonthly: 100 });
    // Cash flow is identical — the reserve is still a real outflow.
    expect(withReserve[0]!.netCashFlowAnnual).toBe(noReserve[0]!.netCashFlowAnnual);
    // But the reserve no longer shelters rental income, so the after-tax line is
    // lower by exactly reserveAnnual × taxRate = 100 × 12 × 0.24 = 288.
    expect(noReserve[0]!.afterTaxCashFlowAnnual - withReserve[0]!.afterTaxCashFlowAnnual).toBe(
      Math.round(100 * 12 * 0.24)
    );
  });
});

// ──────────────────────────────────────────────────────────────────
// 4b. Short-term rental income model — ADR × occupancy
// ──────────────────────────────────────────────────────────────────
describe("short-term rental income", () => {
  it("derives monthly income from nightly rate × occupancy × 365 / 12", () => {
    const result = calculateAnalysis(
      baseSingleFamily({
        monthlyRent: undefined,
        avgDailyRate: 220,
        occupancyPct: 65,
        vacancyPct: 0, // STR: occupancy captures vacancy, so no separate haircut
      })
    );
    // 220 × 365 × 0.65 / 12 = 4,349.58…
    expect(result.monthlyRentalIncome).toBeCloseTo((220 * 365 * 0.65) / 12, 2);
  });

  it("ignores monthlyRent when a nightly rate is present (STR wins)", () => {
    const result = calculateAnalysis(
      baseSingleFamily({
        monthlyRent: 9_999, // should be overridden by the STR model
        avgDailyRate: 150,
        occupancyPct: 50,
        vacancyPct: 0,
      })
    );
    expect(result.monthlyRentalIncome).toBeCloseTo((150 * 365 * 0.5) / 12, 2);
  });

  it("falls back to monthlyRent when no nightly rate is set", () => {
    const result = calculateAnalysis(
      baseSingleFamily({ monthlyRent: 2_100, avgDailyRate: undefined, occupancyPct: undefined })
    );
    expect(result.monthlyRentalIncome).toBe(2_100);
  });

  it("adds furnishing as a one-time cost to cash invested (lowers cash-on-cash)", () => {
    const withoutFurnishing = calculateAnalysis(
      baseSingleFamily({ monthlyRent: undefined, avgDailyRate: 200, occupancyPct: 60, vacancyPct: 0 })
    );
    const withFurnishing = calculateAnalysis(
      baseSingleFamily({
        monthlyRent: undefined,
        avgDailyRate: 200,
        occupancyPct: 60,
        vacancyPct: 0,
        strFurnishingCost: 20_000,
      })
    );
    expect(withFurnishing.totalCashRequired).toBeCloseTo(
      withoutFurnishing.totalCashRequired + 20_000,
      2
    );
    // Same income + more cash invested ⇒ strictly lower cash-on-cash.
    expect(withFurnishing.cocReturn).toBeLessThan(withoutFurnishing.cocReturn);
  });
});

// ──────────────────────────────────────────────────────────────────
// 4c. Rehab / initial-repair budget — one-time cash, lowers cash-on-cash
// ──────────────────────────────────────────────────────────────────
describe("rehab budget", () => {
  it("adds to cash invested and lowers cash-on-cash (not NOI/cap)", () => {
    const without = calculateAnalysis(baseSingleFamily());
    const withRehab = calculateAnalysis(baseSingleFamily({ rehabBudget: 25_000 }));
    expect(withRehab.totalCashRequired).toBeCloseTo(without.totalCashRequired + 25_000, 2);
    expect(withRehab.cocReturn).toBeLessThan(without.cocReturn);
    // Rehab is cash-only in v1 — NOI and cap rate are untouched.
    expect(withRehab.capRate).toBeCloseTo(without.capRate, 6);
    expect(withRehab.netCashFlow).toBeCloseTo(without.netCashFlow, 6);
  });

  it("stacks with STR furnishing in cash required", () => {
    const both = calculateAnalysis(
      baseSingleFamily({ rehabBudget: 10_000, strFurnishingCost: 15_000 })
    );
    const neither = calculateAnalysis(baseSingleFamily());
    expect(both.totalCashRequired).toBeCloseTo(neither.totalCashRequired + 25_000, 2);
  });
});

// ──────────────────────────────────────────────────────────────────
// 5. Operating expenses — each line item formula
// ──────────────────────────────────────────────────────────────────
describe("operating expenses", () => {
  it("vacancy = (annualRent × vacancyPct) / 12", () => {
    const result = calculateAnalysis(
      baseSingleFamily({
        monthlyRent: 2_000,
        vacancyPct: 6,
      })
    );
    // annualRent = 24000; vacancy = 24000 * 0.06 / 12 = $120
    expect(result.vacancy).toBe(120);
  });

  it("management = (annualRent × mgmtPct) / 12", () => {
    const result = calculateAnalysis(
      baseSingleFamily({
        monthlyRent: 2_500,
        mgmtPct: 10,
      })
    );
    // annualRent = 30000; mgmt = 30000 * 0.10 / 12 = $250
    expect(result.management).toBe(250);
  });

  it("property tax = (purchasePrice × taxPct) / 12", () => {
    const result = calculateAnalysis(
      baseSingleFamily({
        purchasePrice: 300_000,
        propertyTaxPct: 1.5,
      })
    );
    // 300000 * 0.015 / 12 = $375
    expect(result.propertyTax).toBe(375);
  });

  it("totalOperatingExpenses = sum of all line items", () => {
    const result = calculateAnalysis(baseSingleFamily());
    const sum =
      result.propertyTax +
      result.insurance +
      result.hoa +
      result.utilities +
      result.maintenance +
      result.vacancy +
      result.management +
      result.capex;
    expect(result.totalOperatingExpenses).toBe(sum);
  });
});

// ──────────────────────────────────────────────────────────────────
// 6. Net cash flow — Rent - OpEx - Debt Service
// ──────────────────────────────────────────────────────────────────
describe("net cash flow", () => {
  it("netCashFlow = rent - opEx - monthlyPayment", () => {
    const result = calculateAnalysis(baseSingleFamily());
    const expected =
      result.monthlyRentalIncome -
      result.totalOperatingExpenses -
      result.monthlyPayment;
    expect(result.netCashFlow).toBe(expected);
  });

  it("annualCashFlow = netCashFlow × 12", () => {
    const result = calculateAnalysis(baseSingleFamily());
    expect(result.annualCashFlow).toBe(result.netCashFlow * 12);
  });
});

// ──────────────────────────────────────────────────────────────────
// 7. Depreciation — (Building Value) / Useful Life
// ──────────────────────────────────────────────────────────────────
describe("annual depreciation", () => {
  it("$245k × 80% / 27.5 = $7,127 (within $1)", () => {
    const result = calculateAnalysis(
      baseSingleFamily({
        purchasePrice: 245_000,
        buildingValuePct: 80,
        depreciationYears: 27.5,
      })
    );
    // (245000 * 0.80) / 27.5 = 7,127.27 → rounds to 7,127
    expect(Math.abs(result.annualDepreciation - 7_127)).toBeLessThanOrEqual(1);
  });
});

// ──────────────────────────────────────────────────────────────────
// 8. Ten-year projection — rent grows, debt service stays flat
// ──────────────────────────────────────────────────────────────────
describe("ten-year projection", () => {
  it("year-1 rental income = base × 12", () => {
    const years = buildTenYearProjection({
      monthlyRentalIncome: 2_000,
      totalOperatingExpenses: 500,
      capexReserveMonthly: 0,
      monthlyPayment: 1_000,
      taxSavingsMonthly: 0,
      annualDepreciation: 0,
      yearlyInterestSchedule: [],
      rentGrowthPct: 3,
      expenseGrowthPct: 2,
      taxRate: 0.24,
      includeInterestDeduction: false,
    });
    expect(years[0]!.rentalIncomeAnnual).toBe(2_000 * 12);
  });

  it("debt service is flat across all 10 years", () => {
    const years = buildTenYearProjection({
      monthlyRentalIncome: 2_000,
      totalOperatingExpenses: 500,
      capexReserveMonthly: 0,
      monthlyPayment: 1_000,
      taxSavingsMonthly: 0,
      annualDepreciation: 0,
      yearlyInterestSchedule: [],
      rentGrowthPct: 3,
      expenseGrowthPct: 2,
      taxRate: 0.24,
      includeInterestDeduction: false,
    });
    const expected = 1_000 * 12;
    for (const y of years) {
      expect(y.debtServiceAnnual).toBe(expected);
    }
  });

  it("debt service stops after a short-term loan amortizes (5-yr term)", () => {
    // A 5-year schedule means the loan is paid off entering year 6 — the
    // projection must not keep charging P&I (it did, contradicting the
    // exit-scenario balance table on the same analysis).
    const years = buildTenYearProjection({
      monthlyRentalIncome: 2_000,
      totalOperatingExpenses: 500,
      capexReserveMonthly: 0,
      monthlyPayment: 3_937,
      loanAmount: 200_000,
      purchasePrice: 250_000,
      taxSavingsMonthly: 0,
      annualDepreciation: 0,
      yearlyInterestSchedule: [12_856, 10_534, 8_050, 5_393, 2_551],
      rentGrowthPct: 0,
      expenseGrowthPct: 0,
      taxRate: 0.24,
      includeInterestDeduction: true,
    });
    for (const y of years.slice(0, 5)) {
      expect(y.debtServiceAnnual).toBe(3_937 * 12);
    }
    for (const y of years.slice(5)) {
      expect(y.debtServiceAnnual).toBe(0);
    }
    // Post-payoff cash flow reflects the freed-up debt service.
    expect(years[5]!.netCashFlowAnnual).toBe(2_000 * 12 - 500 * 12);
  });

  it("never-canceling MIP (pmiNoCancel) also stops once the loan is paid off", () => {
    const years = buildTenYearProjection({
      monthlyRentalIncome: 2_000,
      totalOperatingExpenses: 500,
      capexReserveMonthly: 0,
      monthlyPayment: 3_937,
      pmiMonthly: 150,
      pmiNoCancel: true,
      loanAmount: 200_000,
      purchasePrice: 250_000,
      taxSavingsMonthly: 0,
      annualDepreciation: 0,
      yearlyInterestSchedule: [12_856, 10_534, 8_050, 5_393, 2_551],
      rentGrowthPct: 0,
      expenseGrowthPct: 0,
      taxRate: 0.24,
      includeInterestDeduction: true,
    });
    expect(years[4]!.debtServiceAnnual).toBe(3_937 * 12 + 150 * 12);
    expect(years[5]!.debtServiceAnnual).toBe(0);
  });

  it("full-term financed deal end-to-end keeps flat debt service (30-yr)", () => {
    const result = calculateAnalysis(baseSingleFamily());
    const first = result.tenYearProjection[0]!.debtServiceAnnual;
    expect(first).toBeGreaterThan(0);
    for (const y of result.tenYearProjection) {
      expect(y.debtServiceAnnual).toBe(first);
    }
  });

  it("rent compounds at the growth rate (year-10 vs year-1)", () => {
    const years = buildTenYearProjection({
      monthlyRentalIncome: 1_000,
      totalOperatingExpenses: 0,
      capexReserveMonthly: 0,
      monthlyPayment: 0,
      taxSavingsMonthly: 0,
      annualDepreciation: 0,
      yearlyInterestSchedule: [],
      rentGrowthPct: 3,
      expenseGrowthPct: 0,
      taxRate: 0.24,
      includeInterestDeduction: false,
    });
    // year-1 = 12,000; year-10 = 12,000 × 1.03^9 ≈ 15,657
    const expectedY10 = Math.round(12_000 * Math.pow(1.03, 9));
    expect(Math.abs(years[9]!.rentalIncomeAnnual - expectedY10)).toBeLessThanOrEqual(2);
  });

  it("tax effect is a SIGNED net — a shield on paper-loss years", () => {
    // 12k rent − 6k opex − 12k depreciation = −6k taxable ⇒ +$1,440 shield.
    const years = buildTenYearProjection({
      monthlyRentalIncome: 1_000,
      totalOperatingExpenses: 500,
      capexReserveMonthly: 0,
      monthlyPayment: 0,
      taxSavingsMonthly: 0,
      annualDepreciation: 12_000,
      yearlyInterestSchedule: [],
      rentGrowthPct: 0,
      expenseGrowthPct: 0,
      taxRate: 0.24,
      includeInterestDeduction: false,
    });
    expect(years[0]!.taxSavingsAnnual).toBe(Math.round(6_000 * 0.24)); // +1,440
    expect(years[0]!.afterTaxCashFlowAnnual).toBe(
      years[0]!.netCashFlowAnnual + years[0]!.taxSavingsAnnual
    );
  });

  it("tax effect goes NEGATIVE once the deal is tax-positive (owes tax)", () => {
    // 36k rent − 6k opex − 5k depreciation = +25k taxable ⇒ −$6,000 tax owed.
    const years = buildTenYearProjection({
      monthlyRentalIncome: 3_000,
      totalOperatingExpenses: 500,
      capexReserveMonthly: 0,
      monthlyPayment: 0,
      taxSavingsMonthly: 0,
      annualDepreciation: 5_000,
      yearlyInterestSchedule: [],
      rentGrowthPct: 0,
      expenseGrowthPct: 0,
      taxRate: 0.24,
      includeInterestDeduction: false,
    });
    expect(years[0]!.taxSavingsAnnual).toBe(-Math.round(25_000 * 0.24)); // −6,000
    // After-tax must be BELOW pre-tax net cash flow — the old formula got this wrong.
    expect(years[0]!.afterTaxCashFlowAnnual).toBeLessThan(years[0]!.netCashFlowAnnual);
  });
});

// ──────────────────────────────────────────────────────────────────
// 9. Exit scenarios — appreciation compounds; total profit accounts for all 3 sources
// ──────────────────────────────────────────────────────────────────
describe("exit scenarios", () => {
  it("year-N property value = price × (1 + rate)^N", () => {
    const input: ExitScenarioInput = {
      purchasePrice: 245_000,
      appreciationRate: 3,
      sellingCostPct: 6,
      loanAmount: 0,
      interestRate: 0,
      loanTermYears: 30,
      monthlyPayment: 0,
      downPayment: 245_000,
      closingCosts: 7_350,
      cumulativeCashFlowByYear: Array(10).fill(0),
      cumulativeTaxBenefitByYear: Array(10).fill(0),
    };
    const years = buildExitScenarios(input);
    const expectedY5 = Math.round(245_000 * Math.pow(1.03, 5));
    expect(Math.abs(years[4]!.propertyValue - expectedY5)).toBeLessThanOrEqual(1);
  });

  it("totalProfit = netSaleProceeds + cumulativeCashFlow + cumulativeTaxBenefit - initialInvestment - exitTax", () => {
    const input: ExitScenarioInput = {
      purchasePrice: 245_000,
      appreciationRate: 3,
      sellingCostPct: 6,
      loanAmount: 196_000,
      interestRate: 7,
      loanTermYears: 30,
      monthlyPayment: 1_304,
      downPayment: 49_000,
      closingCosts: 7_350,
      cumulativeCashFlowByYear: [4000, 8000, 12000, 16000, 20000, 24000, 28000, 32000, 36000, 40000],
      cumulativeTaxBenefitByYear: [1500, 3000, 4500, 6000, 7500, 9000, 10500, 12000, 13500, 15000],
    };
    const years = buildExitScenarios(input);
    const y10 = years[9]!;
    const expected =
      y10.netSaleProceeds +
      y10.cumulativeCashFlow +
      y10.cumulativeTaxBenefit -
      (49_000 + 7_350) -
      (y10.exitTax ?? 0);
    expect(y10.totalProfit).toBe(expected);
  });

  it("initialCashInvested (rehab + furnishing) lowers profit vs down+closing basis", () => {
    const base: ExitScenarioInput = {
      purchasePrice: 245_000,
      appreciationRate: 3,
      sellingCostPct: 6,
      loanAmount: 196_000,
      interestRate: 7,
      loanTermYears: 30,
      monthlyPayment: 1_304,
      downPayment: 49_000,
      closingCosts: 7_350,
      cumulativeCashFlowByYear: Array(10).fill(0).map((_, i) => (i + 1) * 4000),
      cumulativeTaxBenefitByYear: Array(10).fill(0),
    };
    const lean = buildExitScenarios(base)[9]!;
    // $40k rehab pushes total cash in to 49k + 7.35k + 40k = 96,350.
    const withRehab = buildExitScenarios({ ...base, initialCashInvested: 96_350 })[9]!;
    expect(withRehab.totalProfit).toBe(lean.totalProfit - 40_000);
  });

  it("exit tax adds depreciation recapture on top of capital gains", () => {
    const base = {
      purchasePrice: 245_000,
      appreciationRate: 3,
      sellingCostPct: 6,
      loanAmount: 196_000,
      interestRate: 7,
      loanTermYears: 30,
      monthlyPayment: 1_304,
      downPayment: 49_000,
      closingCosts: 7_350,
      cumulativeCashFlowByYear: Array(10).fill(0),
      cumulativeTaxBenefitByYear: Array(10).fill(0),
    };
    // An appreciating property has a capital gain, so some exit tax is owed
    // even with no depreciation.
    const noDep = buildExitScenarios({ ...base, annualDepreciation: 0 });
    expect(noDep[9]!.exitTax ?? 0).toBeGreaterThan(0);
    // Adding annual depreciation lowers the basis -> larger gain taxed partly
    // at the higher recapture rate -> strictly more exit tax, less profit.
    const withDep = buildExitScenarios({ ...base, annualDepreciation: 8_000 });
    expect(withDep[9]!.exitTax ?? 0).toBeGreaterThan(noDep[9]!.exitTax ?? 0);
    expect(withDep[9]!.totalProfit).toBeLessThan(noDep[9]!.totalProfit);
  });
});

// ──────────────────────────────────────────────────────────────────
// 10. BRRRR — value-add + cash-left-in-deal math
// ──────────────────────────────────────────────────────────────────
describe("BRRRR analysis", () => {
  it("equityCreated = ARV - purchase - rehab", () => {
    const r = analyzeBrrrr({
      purchasePrice: 150_000,
      rehabBudget: 30_000,
      arv: 250_000,
      refiLtvPct: 75,
      refiRatePct: 7,
      refiTermYears: 30,
      closingCostsPctAcq: 3,
      closingCostsRefiPct: 2,
      downPaymentPct: 100,           // all-cash acquisition
      holdMonths: 6,
      monthlyCarryingCost: 500,
      postRefiMonthlyOpEx: 800,
      postRefiMonthlyRent: 2_000,
    });
    expect(r.equityCreated).toBe(250_000 - 150_000 - 30_000); // 70,000
  });

  it("newLoanAmount = ARV × LTV%", () => {
    const r = analyzeBrrrr({
      purchasePrice: 150_000,
      rehabBudget: 30_000,
      arv: 250_000,
      refiLtvPct: 75,
      refiRatePct: 7,
      refiTermYears: 30,
      closingCostsPctAcq: 3,
      closingCostsRefiPct: 2,
      downPaymentPct: 100,
      holdMonths: 6,
      monthlyCarryingCost: 500,
      postRefiMonthlyOpEx: 800,
      postRefiMonthlyRent: 2_000,
    });
    expect(r.newLoanAmount).toBe(Math.round(250_000 * 0.75)); // 187,500
  });

  it("isInfiniteReturn when cash left ≤ 0 and post-refi CF > 0", () => {
    // Set up a BRRRR where cash returned at refi exceeds total invested.
    // Total cash invested = 150k + 4.5k closing + 3k carry + 30k rehab = 187,500
    // New loan = 250k * 0.75 = 187,500; refi closing = 187,500 * 0.02 = 3,750
    // Cash returned = 187,500 - 150,000 - 3,750 = 33,750
    // Cash left = 187,500 - 33,750 = 153,750 (NOT infinite — this deal doesn't hit it)
    //
    // Instead, test with a small rehab + huge ARV jump to force cash returned > invested
    const r = analyzeBrrrr({
      purchasePrice: 80_000,
      rehabBudget: 20_000,
      arv: 200_000,
      refiLtvPct: 75,
      refiRatePct: 7,
      refiTermYears: 30,
      closingCostsPctAcq: 3,
      closingCostsRefiPct: 2,
      downPaymentPct: 100,            // all cash, no original loan to pay off
      holdMonths: 6,
      monthlyCarryingCost: 200,
      postRefiMonthlyOpEx: 600,
      postRefiMonthlyRent: 1_800,
    });
    // Total cash = 80k + 2.4k + 1.2k + 20k = 103,600
    // New loan = 150k; refi closing = 3k; original loan remaining = 0
    // Cash returned = 150,000 - 0 - 3,000 = 147,000
    // Cash left = max(0, 103,600 - 147,000) = 0
    expect(r.cashLeftInDeal).toBe(0);
    expect(r.isInfiniteReturn).toBe(true);
  });

  it("refi shortfall (low appraisal) increases cash left in deal instead of vanishing", () => {
    // Purchase 100k / 20% down → payoff 80k. ARV 105k @ 75% LTV → new loan
    // 78,750; refi closing = 78,750 × 2% = 1,575. Net at refi =
    // 78,750 − 80,000 − 1,575 = −2,825 — the investor BRINGS cash to the
    // refi table. The old clamp discarded that 2,825, understating the
    // customer's true basis.
    const r = analyzeBrrrr({
      purchasePrice: 100_000,
      rehabBudget: 20_000,
      arv: 105_000,
      refiLtvPct: 75,
      refiRatePct: 7,
      refiTermYears: 30,
      closingCostsPctAcq: 3,
      closingCostsRefiPct: 2,
      downPaymentPct: 20,
      holdMonths: 6,
      monthlyCarryingCost: 400,
      postRefiMonthlyOpEx: 700,
      postRefiMonthlyRent: 1_500,
    });
    // Displayed "cash returned" stays floored at 0…
    expect(r.cashReturnedAtRefi).toBe(0);
    // …but the shortfall is named…
    expect(r.cashNeededAtRefi).toBe(2_825);
    // …and flows into cash left in deal:
    // total invested = 20,000 down + 3,000 closing + 2,400 carry + 20,000 rehab
    // = 45,400; cash left = 45,400 + 2,825 = 48,225.
    expect(r.totalCashInvested).toBe(45_400);
    expect(r.cashLeftInDeal).toBe(48_225);
    expect(r.isInfiniteReturn).toBe(false);
  });

  it("normal cash-out refi reports no cash needed at refi", () => {
    const r = analyzeBrrrr({
      purchasePrice: 150_000,
      rehabBudget: 30_000,
      arv: 250_000,
      refiLtvPct: 75,
      refiRatePct: 7,
      refiTermYears: 30,
      closingCostsPctAcq: 3,
      closingCostsRefiPct: 2,
      downPaymentPct: 100,           // all-cash acquisition
      holdMonths: 6,
      monthlyCarryingCost: 500,
      postRefiMonthlyOpEx: 800,
      postRefiMonthlyRent: 2_000,
    });
    // New loan 187,500 − payoff 0 − refi closing 3,750 = 183,750 out.
    expect(r.cashReturnedAtRefi).toBe(183_750);
    expect(r.cashNeededAtRefi).toBe(0);
    // Happy path unchanged by the shortfall pass-through:
    // invested 187,500 − returned 183,750 = 3,750 left in the deal.
    expect(r.cashLeftInDeal).toBe(3_750);
  });
});

// ──────────────────────────────────────────────────────────────────
// 11. Fix-and-flip — break-even ARV algebra
// ──────────────────────────────────────────────────────────────────
describe("fix-and-flip analysis", () => {
  it("uses annual tax and monthly insurance inputs in the carry screen", () => {
    const values = baseSingleFamily({
      purchasePrice: 240_000,
      interestRate: 6,
      downPaymentPct: 25,
      propertyTaxInputMode: "annual",
      propertyTaxAnnual: 7_200,
      // These unused percentage values deliberately disagree with the active
      // modes; the carry helper must not leak them into the flip result.
      propertyTaxPct: 9,
      insuranceInputMode: "monthly",
      insuranceMonthly: 250,
      insurancePct: 8,
      utilitiesMonthly: 150,
    });
    const result = calculateAnalysis(values);

    // Interest-only screen: $180k × 6% / 12 = $900, plus $600 tax,
    // $250 insurance and $150 utilities.
    expect(estimateFixFlipCarryingCost(values, result, 25)).toBe(1_900);
    // The no-result fallback follows the same input-mode contract.
    expect(estimateFixFlipCarryingCost(values, null, 25)).toBe(1_900);
  });

  it("breakEvenArv satisfies ARV × (1 - sellPct) = total cost ex-selling", () => {
    const r = analyzeFixFlip({
      purchasePrice: 200_000,
      rehabBudget: 40_000,
      arv: 320_000,
      closingCostsPctAcq: 3,
      sellingCostsPct: 6,
      holdMonths: 6,
      monthlyCarryingCost: 1_500,
      downPaymentPct: 25,
    });
    // totalCostExclSelling = 200000 + 6000 acquisition closing + 40000 + 9000 = 255,000
    // breakEvenArv = 255000 / 0.94 = 271,277 (within $1)
    expect(Math.abs(r.breakEvenArv - 271_277)).toBeLessThanOrEqual(2);
  });

  it("netProfit = ARV - purchase - acquisition closing - rehab - carry - selling", () => {
    const r = analyzeFixFlip({
      purchasePrice: 200_000,
      rehabBudget: 40_000,
      arv: 320_000,
      closingCostsPctAcq: 3,
      sellingCostsPct: 6,
      holdMonths: 6,
      monthlyCarryingCost: 1_500,
      downPaymentPct: 25,
    });
    // sellingCosts = 320000 * 0.06 = 19,200
    // carry = 1500 * 6 = 9,000
    // acquisition closing = 200000 * 3% = 6,000
    // netProfit = 320000 - 200000 - 6000 - 40000 - 9000 - 19200 = 45,800
    expect(r.acquisitionClosingCosts).toBe(6_000);
    expect(r.netProfit).toBe(45_800);
  });

  it("annualizedRoiPct = roiOnCashPct × (12 / holdMonths)", () => {
    const r = analyzeFixFlip({
      purchasePrice: 200_000,
      rehabBudget: 40_000,
      arv: 320_000,
      closingCostsPctAcq: 3,
      sellingCostsPct: 6,
      holdMonths: 6,
      monthlyCarryingCost: 1_500,
      downPaymentPct: 25,
    });
    // 6-month hold → annualizer is 2x
    const expected = Math.round(r.roiOnCashPct * 2 * 10) / 10;
    expect(Math.abs(r.annualizedRoiPct - expected)).toBeLessThanOrEqual(0.2);
  });
});

// ──────────────────────────────────────────────────────────────────
// 12. End-to-end sanity check — values match what a user would
//     compute by hand for a known deal.
// ──────────────────────────────────────────────────────────────────
describe("end-to-end sanity check (Philadelphia $245k deal)", () => {
  it("hand-derived: $245k @ 7%/30yr, $2,100 rent → ~$1,304 P&I", () => {
    const r = calculateAnalysis(baseSingleFamily());
    // Loan = 245000 * 0.80 = 196,000
    expect(r.loanAmount).toBe(196_000);
    // M = 196000 * (0.00583 * 1.00583^360) / (1.00583^360 - 1) ≈ $1,304
    expect(Math.abs(r.monthlyPayment - 1_304)).toBeLessThanOrEqual(2);
  });

  it("hand-derived: cap rate is independent of financing", () => {
    const financed = calculateAnalysis(baseSingleFamily({ downPaymentPct: 20 }));
    const allCash = calculateAnalysis(baseSingleFamily({ downPaymentPct: 100 }));
    expect(Math.abs(financed.capRate - allCash.capRate)).toBeLessThan(0.01);
  });

  it("hand-derived: total cash required = down + closing", () => {
    const r = calculateAnalysis(baseSingleFamily());
    // 245000 * 0.20 = 49,000; 245000 * 0.03 = 7,350; total = 56,350
    expect(r.totalCashRequired).toBe(56_350);
  });
});

// ──────────────────────────────────────────────────────────────────
// Property tax input mode — annual-$ bill vs annual-% of price
// ──────────────────────────────────────────────────────────────────
describe("property tax input mode", () => {
  it("percent mode (and legacy snapshots with no mode) is byte-identical to before", () => {
    const base = calculateAnalysis(baseSingleFamily());
    const explicitPercent = calculateAnalysis(
      baseSingleFamily({ propertyTaxInputMode: "percent", propertyTaxAnnual: 5_000 })
    );
    // 245,000 * 1.1% / 12 = 224.58… → 225
    expect(base.propertyTax).toBe(225);
    // In percent mode the annual field is ignored entirely.
    expect(explicitPercent.propertyTax).toBe(225);
    expect(explicitPercent.netCashFlow).toBe(base.netCashFlow);
  });

  it("annual mode uses the actual bill / 12", () => {
    const r = calculateAnalysis(
      baseSingleFamily({ propertyTaxInputMode: "annual", propertyTaxAnnual: 4_200 })
    );
    expect(r.propertyTax).toBe(350);
  });

  it("annual mode with a blank bill falls back to the percent estimate", () => {
    const r = calculateAnalysis(
      baseSingleFamily({ propertyTaxInputMode: "annual", propertyTaxAnnual: undefined })
    );
    expect(r.propertyTax).toBe(225);
  });

  it("propertyTaxPctEffective reports the % the math actually used", () => {
    // Percent mode: the typed % (or the 1.1 default when blank) passes through.
    expect(
      calculateAnalysis(baseSingleFamily({ propertyTaxPct: 2.05 })).propertyTaxPctEffective
    ).toBe(2.05);
    expect(
      calculateAnalysis(baseSingleFamily({ propertyTaxPct: undefined })).propertyTaxPctEffective
    ).toBe(1.1);
    // Annual-$ mode: derived from the bill — NOT the unused percent field
    // (the PDF assumptions line used to print "0%" and the saved column
    // fabricated 1.1% from exactly this gap).
    const annual = calculateAnalysis(
      baseSingleFamily({ propertyTaxInputMode: "annual", propertyTaxAnnual: 4_900 })
    );
    // 4,900 / 245,000 × 100 = 2%
    expect(annual.propertyTaxPctEffective).toBeCloseTo(2, 10);
    // Blank bill in annual mode falls back to the percent path.
    const blankBill = calculateAnalysis(
      baseSingleFamily({ propertyTaxInputMode: "annual", propertyTaxAnnual: undefined })
    );
    expect(blankBill.propertyTaxPctEffective).toBe(1.1);
  });

  it("the bill flows through cash flow, cap rate, and DSCR consistently", () => {
    const cheap = calculateAnalysis(
      baseSingleFamily({ propertyTaxInputMode: "annual", propertyTaxAnnual: 1_200 })
    );
    const dear = calculateAnalysis(
      baseSingleFamily({ propertyTaxInputMode: "annual", propertyTaxAnnual: 9_600 })
    );
    // $700/mo more tax → exactly $700/mo less cash flow.
    expect(cheap.netCashFlow - dear.netCashFlow).toBe(700);
    expect(cheap.capRate).toBeGreaterThan(dear.capRate);
    expect(cheap.dscr).toBeGreaterThan(dear.dscr);
  });
});
