import { describe, expect, it } from "vitest";
import {
  buildRentAlertForDeal,
  RENT_ALERTS_MIN_DEAL_DELTA_PCT,
  rentAlertSubject,
} from "@/lib/rent-alerts";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

/** Same canonical single-family fixture as the rate-alerts test. */
function baseDeal(overrides: Partial<InvestmentFormValues> = {}): InvestmentFormValues {
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

describe("buildRentAlertForDeal", () => {
  it("returns null when the market rent barely moved (below per-deal delta)", () => {
    const saved = 2_000;
    const alert = buildRentAlertForDeal({
      id: "d1",
      values: baseDeal({ monthlyRent: saved }),
      // 4% move — below the 5% gate.
      currentMarketRentMonthly: saved * (1 + RENT_ALERTS_MIN_DEAL_DELTA_PCT - 0.01),
    });
    expect(alert).toBeNull();
  });

  it("returns null for multi-family deals (unit-mix rents unsupported here)", () => {
    const alert = buildRentAlertForDeal({
      id: "d2",
      values: baseDeal({ propertyType: "multi-family" }),
      currentMarketRentMonthly: 4_000,
    });
    expect(alert).toBeNull();
  });

  it("returns null when the saved rent is missing", () => {
    const alert = buildRentAlertForDeal({
      id: "d3",
      values: baseDeal({ monthlyRent: undefined }),
      currentMarketRentMonthly: 2_500,
    });
    expect(alert).toBeNull();
  });

  it("alerts when market rent FALLS enough to flip a positive deal negative", () => {
    // Strong rent makes the deal cash-flow positive; a big market-rent drop
    // should push it negative — a state change worth an email.
    const values = baseDeal({ monthlyRent: 2_600 });
    const alert = buildRentAlertForDeal({
      id: "d4",
      title: "N 5th St rowhome",
      values,
      currentMarketRentMonthly: 1_400,
    });
    expect(alert).not.toBeNull();
    expect(alert!.label).toBe("N 5th St rowhome");
    expect(alert!.improved).toBe(false);
    expect(alert!.savedRentMonthly).toBe(2_600);
    expect(alert!.currentMarketRentMonthly).toBe(1_400);
    expect(alert!.changes.length).toBeGreaterThan(0);
    expect(alert!.after.monthlyCashFlow).toBeLessThan(alert!.before.monthlyCashFlow);
  });

  it("alerts when market rent RISES enough to flip a negative deal positive", () => {
    // Low saved rent makes the deal bleed; a strong market rent should turn
    // it cash-flow positive.
    const values = baseDeal({ monthlyRent: 1_300 });
    const alert = buildRentAlertForDeal({
      id: "d5",
      address: "1205 N 5th St",
      values,
      currentMarketRentMonthly: 2_600,
    });
    expect(alert).not.toBeNull();
    expect(alert!.improved).toBe(true);
    expect(alert!.label).toBe("1205 N 5th St");
    expect(alert!.after.monthlyCashFlow).toBeGreaterThan(alert!.before.monthlyCashFlow);
    expect(alert!.changes.some((c) => /cash-flow/i.test(c))).toBe(true);
  });

  it("falls back to 'Saved deal' when title and address are blank", () => {
    const alert = buildRentAlertForDeal({
      id: "d6",
      title: "  ",
      address: null,
      values: baseDeal({ monthlyRent: 1_300 }),
      currentMarketRentMonthly: 2_600,
    });
    expect(alert).not.toBeNull();
    expect(alert!.label).toBe("Saved deal");
  });
});

describe("rentAlertSubject", () => {
  it("pluralizes correctly", () => {
    expect(rentAlertSubject(1)).toBe("Market rents moved — 1 of your saved deals changed");
    expect(rentAlertSubject(4)).toBe("Market rents moved — 4 of your saved deals changed");
  });
});
