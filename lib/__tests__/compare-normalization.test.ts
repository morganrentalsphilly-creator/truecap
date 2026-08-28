import { describe, expect, it } from "vitest";
import {
  buildAssumptionDifferences,
  isComparisonMetricScalable,
  normalizeComparisonValue,
} from "@/lib/compare-normalization";
import type { DealAssumptions } from "@/lib/compare-assumptions";

const assumptions = (rate: number, vacancy = 5): DealAssumptions => ({
  financing: { interestRatePct: rate, loanTermYears: 30, downPaymentPct: 25 },
  income: { totalMonthlyRent: 2_000, unitsDescription: "Single-family" },
  expenses: {
    vacancyPct: vacancy,
    managementPct: 8,
    maintenancePct: 5,
    capexPct: 5,
    propertyTaxInputMode: "annual",
    propertyTaxAnnual: 3_000,
    propertyTaxPct: null,
    insuranceInputMode: "monthly",
    insurancePct: null,
    insuranceMonthly: 150,
  },
});

describe("comparison normalization", () => {
  it("preserves saved values by default", () => {
    expect(normalizeComparisonValue({
      mode: "as_saved",
      metricKey: "netCashFlow",
      value: 500,
      purchasePrice: 250_000,
      kind: "currency",
    })).toBe(500);
  });

  it("normalizes scalable currency outcomes per $100k of purchase price", () => {
    expect(normalizeComparisonValue({
      mode: "per_100k_purchase",
      metricKey: "netCashFlow",
      value: 500,
      purchasePrice: 250_000,
      kind: "currency",
    })).toBe(200);
  });

  it("normalizes long-term currency outcomes without changing ratios", () => {
    expect(normalizeComparisonValue({
      mode: "per_100k_purchase",
      metricKey: "ltTenYearCashFlow",
      value: 75_000,
      purchasePrice: 300_000,
      kind: "currency",
      longTerm: true,
    })).toBe(25_000);
    expect(normalizeComparisonValue({
      mode: "per_100k_purchase",
      metricKey: "ltIrr",
      value: 12.5,
      purchasePrice: 300_000,
      kind: "percent",
      longTerm: true,
    })).toBe(12.5);
    expect(isComparisonMetricScalable({
      metricKey: "ltTenYearCashFlow",
      kind: "currency",
      longTerm: true,
    })).toBe(true);
  });

  it("does not distort ratios, purchase price, or Offer Ceiling", () => {
    for (const [metricKey, value, kind] of [
      ["capRate", 7.2, "percent"],
      ["purchasePrice", 250_000, "currency"],
      ["maxOffer", 240_000, "currency"],
    ] as const) {
      expect(normalizeComparisonValue({
        mode: "per_100k_purchase",
        metricKey,
        value,
        purchasePrice: 250_000,
        kind,
      })).toBe(value);
    }
  });

  it("returns N/A rather than divide by an invalid purchase price", () => {
    expect(normalizeComparisonValue({
      mode: "per_100k_purchase",
      metricKey: "netCashFlow",
      value: 500,
      purchasePrice: 0,
      kind: "currency",
    })).toBeNull();
  });

  it("identifies assumption differences without treating identical inputs as different", () => {
    const rows = buildAssumptionDifferences([
      { assumptions: assumptions(6.5) },
      { assumptions: assumptions(7.25) },
    ]);
    expect(rows.find((row) => row.key === "interest")?.differs).toBe(true);
    expect(rows.find((row) => row.key === "vacancy")?.differs).toBe(false);
  });

  it("compares actual rent, tax, and insurance values instead of input mode alone", () => {
    const first = assumptions(6.5);
    const second: DealAssumptions = {
      ...assumptions(6.5),
      income: {
        totalMonthlyRent: 2_250,
        unitsDescription: "Duplex (2 unit rows)",
      },
      expenses: {
        ...assumptions(6.5).expenses,
        propertyTaxAnnual: 3_600,
        insuranceMonthly: 175,
      },
    };
    const rows = buildAssumptionDifferences([
      { assumptions: first },
      { assumptions: second },
    ]);

    for (const key of ["rent", "units", "property_tax", "insurance"]) {
      expect(rows.find((row) => row.key === key)?.differs).toBe(true);
    }
  });
});
