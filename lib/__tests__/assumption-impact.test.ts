import { describe, expect, it } from "vitest";

import { computeAssumptionImpact } from "../assumption-impact";
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

describe("assumption impact", () => {
  it("ranks drivers by cash-flow swing, descending", () => {
    const drivers = computeAssumptionImpact(baseSingleFamily());
    expect(drivers.length).toBeGreaterThan(3);
    for (let i = 1; i < drivers.length; i++) {
      expect(drivers[i - 1].cashFlowSwing).toBeGreaterThanOrEqual(drivers[i].cashFlowSwing);
    }
  });

  it("every swing is non-negative", () => {
    for (const d of computeAssumptionImpact(baseSingleFamily())) {
      expect(d.cashFlowSwing).toBeGreaterThanOrEqual(0);
      expect(d.dscrSwing).toBeGreaterThanOrEqual(0);
    }
  });

  it("rent and purchase price are among the top drivers", () => {
    const top = computeAssumptionImpact(baseSingleFamily())
      .slice(0, 4)
      .map((d) => d.key);
    expect(top).toContain("rent");
    expect(top).toContain("purchasePrice");
  });

  it("interest rate has ~zero cash-flow impact on a cash purchase", () => {
    const rate = computeAssumptionImpact(baseSingleFamily({ downPaymentPct: 100 })).find(
      (d) => d.key === "interestRate"
    );
    expect(rate === undefined || rate.cashFlowSwing < 1).toBe(true);
  });

  it("perturbs nightly rate for an STR instead of the inactive monthly-rent field", () => {
    const drivers = computeAssumptionImpact(
      baseSingleFamily({
        monthlyRent: undefined,
        avgDailyRate: 185,
        occupancyPct: 62,
        strFurnishingCost: 25_000,
      })
    );
    const rent = drivers.find((driver) => driver.key === "rent");
    expect(rent).toBeDefined();
    expect(rent?.cashFlowSwing).toBeGreaterThan(0);
    expect(rent?.dscrSwing).toBeGreaterThan(0);
  });

  it("perturbs the active annual property-tax bill by an equivalent ±0.25pp", () => {
    const drivers = computeAssumptionImpact(
      baseSingleFamily({
        propertyTaxInputMode: "annual",
        propertyTaxAnnual: 4_200,
        // Deliberately absurd inactive value: the driver must not touch this.
        propertyTaxPct: 99,
      })
    );
    const propertyTax = drivers.find((driver) => driver.key === "propertyTaxPct");
    expect(propertyTax).toBeDefined();
    expect(propertyTax?.cashFlowSwing).toBeGreaterThan(0);
    expect(propertyTax?.deltaLabel).toBe("±0.25pp");
  });
});
