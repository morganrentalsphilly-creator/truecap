/**
 * Pins lib/owned-equity-series — the shared owned-deal equity helpers:
 *
 * - computeRowEquity / resolveOwnedEquityBasis: the row → equity derivation
 *   extracted from the My Deals page (behavior must stay identical — the
 *   dashboard home's owned strip and My Deals' OwnedEquityCell both use it).
 * - buildOwnedEquitySeries: the month-by-month portfolio equity decomposition
 *   (down payment + principal paid + appreciation) behind OwnedEquityChart.
 *   Must derive ONLY from computeOwnedEquity — its endpoint has to agree with
 *   the "today" equity tiles exactly.
 */
import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import type { InvestmentFormValues } from "../investcalc-schema";
import { computeOwnedEquity, monthsOwnedBetween, type OwnedEquityInput } from "../owned-equity";
import {
  buildOwnedEquitySeries,
  computeRowEquity,
  resolveOwnedEquityBasis,
  type OwnedDealEquityBasis,
} from "../owned-equity-series";

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

const ownedRow = (overrides: Record<string, unknown> = {}) => ({
  is_completed: true as boolean | null,
  close_date: "2025-01-15",
  form_snapshot: baseSingleFamily(),
  ...overrides,
});

describe("resolveOwnedEquityBasis / computeRowEquity", () => {
  it("returns null for non-completed deals, missing/invalid close dates, and bad snapshots", () => {
    expect(computeRowEquity(ownedRow({ is_completed: false }))).toBeNull();
    expect(computeRowEquity(ownedRow({ is_completed: null }))).toBeNull();
    expect(computeRowEquity(ownedRow({ close_date: null }))).toBeNull();
    expect(computeRowEquity(ownedRow({ close_date: undefined }))).toBeNull();
    expect(computeRowEquity(ownedRow({ close_date: "not-a-date" }))).toBeNull();
    expect(computeRowEquity(ownedRow({ form_snapshot: { garbage: true } }))).toBeNull();
    expect(computeRowEquity(ownedRow({ form_snapshot: null }))).toBeNull();
  });

  it("derives the equity input from the deal's OWN saved assumptions (no new financial math)", () => {
    const basis = resolveOwnedEquityBasis(ownedRow());
    expect(basis).not.toBeNull();
    const values = baseSingleFamily();
    const result = calculateAnalysis(values);
    expect(basis!.input).toEqual({
      purchasePrice: 245_000,
      loanAmount: result.loanAmount,
      annualRatePct: 7,
      termYears: 30,
      appreciationRatePct: 3,
    });
    expect(basis!.closeDate.toISOString().slice(0, 10)).toBe("2025-01-15");
  });

  it("computeRowEquity equals computeOwnedEquity at monthsOwnedBetween(close, asOf) — the original page behavior", () => {
    const asOf = new Date("2026-07-15");
    const row = ownedRow();
    const summary = computeRowEquity(row, asOf);
    expect(summary).not.toBeNull();
    const basis = resolveOwnedEquityBasis(row)!;
    const expected = computeOwnedEquity(
      basis.input,
      monthsOwnedBetween(new Date("2025-01-15"), asOf),
    )!;
    expect(summary).toEqual(expected);
    expect(summary!.monthsOwned).toBe(18);
    // Sanity: identity the whole feature leans on.
    expect(summary!.equity).toBeCloseTo(
      summary!.downPayment + summary!.appreciationGain + summary!.principalPaid,
      2,
    );
  });
});

const baseInput: OwnedEquityInput = {
  purchasePrice: 300_000,
  loanAmount: 240_000, // 20% down
  annualRatePct: 6.75,
  termYears: 30,
  appreciationRatePct: 3,
};

const dealA: OwnedDealEquityBasis = { input: baseInput, closeDate: new Date("2025-07-01") };

describe("buildOwnedEquitySeries", () => {
  it("returns an empty series for no usable deals", () => {
    expect(buildOwnedEquitySeries([], new Date("2026-07-01"))).toEqual([]);
    expect(
      buildOwnedEquitySeries(
        [{ input: { ...baseInput, purchasePrice: 0 }, closeDate: new Date("2025-07-01") }],
        new Date("2026-07-01"),
      ),
    ).toEqual([]);
  });

  it("emits one point per month from close to asOf, starting at the down payment", () => {
    const asOf = new Date("2026-07-01");
    const series = buildOwnedEquitySeries([dealA], asOf);
    expect(series).toHaveLength(13); // months 0..12 inclusive
    expect(series[0]!.month).toBe("2025-07-01");
    expect(series[12]!.month).toBe("2026-07-01");
    // Month 0: no growth yet — equity is exactly the cash that went in.
    expect(series[0]!.downPayment).toBeCloseTo(60_000, 2);
    expect(series[0]!.principalPaid).toBeCloseTo(0, 2);
    expect(series[0]!.appreciationGain).toBeCloseTo(0, 2);
    expect(series[0]!.equity).toBeCloseTo(60_000, 2);
    expect(series[0]!.dealCount).toBe(1);
  });

  it("every point satisfies the engine identity and matches computeOwnedEquity month-for-month", () => {
    const asOf = new Date("2026-07-01");
    const series = buildOwnedEquitySeries([dealA], asOf);
    series.forEach((p, i) => {
      const expected = computeOwnedEquity(baseInput, i)!;
      expect(p.downPayment).toBeCloseTo(expected.downPayment, 6);
      expect(p.principalPaid).toBeCloseTo(expected.principalPaid, 6);
      expect(p.appreciationGain).toBeCloseTo(expected.appreciationGain, 6);
      expect(p.equity).toBeCloseTo(p.downPayment + p.principalPaid + p.appreciationGain, 2);
    });
    // Up-and-to-the-right with positive appreciation — the screenshot test.
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i]!.equity).toBeGreaterThan(series[i - 1]!.equity);
    }
  });

  it("the endpoint agrees EXACTLY with the 'today' equity readout (computeRowEquity math)", () => {
    // asOf mid-month: interior points step whole months from close, but the
    // endpoint must evaluate at the true as-of months so the chart's last
    // value equals the Owned Equity tile.
    const asOf = new Date("2026-07-20");
    const series = buildOwnedEquitySeries([dealA], asOf);
    const last = series[series.length - 1]!;
    const today = computeOwnedEquity(baseInput, monthsOwnedBetween(dealA.closeDate, asOf))!;
    expect(last.equity).toBeCloseTo(today.equity, 6);
    expect(last.principalPaid).toBeCloseTo(today.principalPaid, 6);
    expect(last.appreciationGain).toBeCloseTo(today.appreciationGain, 6);
  });

  it("a later purchase joins the portfolio sum as a step-up at its close month", () => {
    const dealB: OwnedDealEquityBasis = {
      input: { ...baseInput, purchasePrice: 200_000, loanAmount: 150_000 },
      closeDate: new Date("2026-01-01"),
    };
    const asOf = new Date("2026-07-01");
    const series = buildOwnedEquitySeries([dealA, dealB], asOf);
    expect(series).toHaveLength(13);
    // Before deal B closes (months 0-5 from Jul 2025): only deal A contributes.
    expect(series[0]!.dealCount).toBe(1);
    expect(series[5]!.dealCount).toBe(1);
    expect(series[5]!.downPayment).toBeCloseTo(60_000, 2);
    // From deal B's close month on: both contribute; down payment steps up.
    expect(series[6]!.dealCount).toBe(2);
    expect(series[6]!.downPayment).toBeCloseTo(60_000 + 50_000, 2);
    // Endpoint = sum of each deal's "today" summary.
    const last = series[series.length - 1]!;
    const a = computeOwnedEquity(dealA.input, monthsOwnedBetween(dealA.closeDate, asOf))!;
    const b = computeOwnedEquity(dealB.input, monthsOwnedBetween(dealB.closeDate, asOf))!;
    expect(last.equity).toBeCloseTo(a.equity + b.equity, 6);
  });

  it("stride-samples decades-old portfolios but always keeps the endpoint", () => {
    const old: OwnedDealEquityBasis = { input: baseInput, closeDate: new Date("1990-01-01") };
    const asOf = new Date("2026-07-01");
    const series = buildOwnedEquitySeries([old], asOf);
    expect(series.length).toBeLessThanOrEqual(242); // MAX_SERIES_POINTS + forced endpoint
    expect(series.length).toBeGreaterThan(100);
    const last = series[series.length - 1]!;
    const today = computeOwnedEquity(baseInput, monthsOwnedBetween(old.closeDate, asOf))!;
    expect(last.equity).toBeCloseTo(today.equity, 6);
    expect(last.month).toBe("2026-07-01");
  });
});
