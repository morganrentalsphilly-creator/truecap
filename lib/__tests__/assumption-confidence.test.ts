import { describe, expect, it } from "vitest";

import { assumptionMeta, CONFIDENCE_LABEL } from "../assumption-confidence";
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

describe("assumption confidence", () => {
  it("has source + confidence metadata for every impact driver key", () => {
    const drivers = computeAssumptionImpact(baseSingleFamily());
    expect(drivers.length).toBeGreaterThan(0);
    for (const d of drivers) {
      const meta = assumptionMeta(d.key);
      expect(meta, `missing confidence meta for driver "${d.key}"`).not.toBeNull();
      expect(meta!.source.length).toBeGreaterThan(0);
      expect(["high", "medium", "low"]).toContain(meta!.confidence);
      expect(meta!.verify.length).toBeGreaterThan(0);
    }
  });

  it("rates entered/current figures high and rough estimates low", () => {
    expect(assumptionMeta("purchasePrice")?.confidence).toBe("high");
    expect(assumptionMeta("interestRate")?.confidence).toBe("high");
    expect(assumptionMeta("rent")?.confidence).toBe("medium");
    expect(assumptionMeta("insurance")?.confidence).toBe("low");
  });

  it("returns null for an unknown key", () => {
    expect(assumptionMeta("nope")).toBeNull();
  });

  it("labels all three confidence levels; low tells the user to verify", () => {
    expect(Object.keys(CONFIDENCE_LABEL).sort()).toEqual(["high", "low", "medium"]);
    expect(CONFIDENCE_LABEL.low).toMatch(/verify/i);
  });
});
