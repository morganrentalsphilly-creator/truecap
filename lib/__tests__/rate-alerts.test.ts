import { describe, expect, it } from "vitest";
import {
  buildRateAlertForDeal,
  dscrBand,
  RATE_ALERTS_MIN_DEAL_DELTA_PP,
  rateAlertSubject,
} from "@/lib/rate-alerts";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

/** Same canonical single-family fixture as calc-analysis.test.ts. */
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

describe("dscrBand", () => {
  it("buckets the lender thresholds", () => {
    expect(dscrBand(1.3)).toBe("bankable");
    expect(dscrBand(1.25)).toBe("bankable");
    expect(dscrBand(1.1)).toBe("tight");
    expect(dscrBand(1.0)).toBe("tight");
    expect(dscrBand(0.99)).toBe("underwater");
  });
});

describe("buildRateAlertForDeal", () => {
  it("returns null when the rate barely moved (below per-deal delta)", () => {
    const alert = buildRateAlertForDeal({
      id: "d1",
      values: baseDeal({ interestRate: 7 }),
      currentRatePct: 7 + RATE_ALERTS_MIN_DEAL_DELTA_PP - 0.01,
    });
    expect(alert).toBeNull();
  });

  it("returns null for cash purchases (no debt service to reprice)", () => {
    const alert = buildRateAlertForDeal({
      id: "d2",
      values: baseDeal({ downPaymentPct: 100 }),
      currentRatePct: 5,
    });
    expect(alert).toBeNull();
  });

  it("returns null when numbers move but no STATE changes", () => {
    // 7% → 6.7%: cash flow improves a bit but a healthy deal stays in
    // the same tier/band/sign — no email-worthy story.
    const values = baseDeal({ interestRate: 7, monthlyRent: 2_600 });
    const alert = buildRateAlertForDeal({
      id: "d3",
      values,
      currentRatePct: 6.7,
    });
    // Whatever the exact metrics, if this fixture DOES change state the
    // assertion below would fail loudly and the fixture needs retuning —
    // that's intentional; don't silence it.
    expect(alert).toBeNull();
  });

  it("alerts when a big rate drop flips the deal's story", () => {
    // At 8.5% this fixture is cash-flow negative; at 5.5% it should
    // flip positive and/or change DSCR band — a state change.
    const values = baseDeal({ interestRate: 8.5 });
    const alert = buildRateAlertForDeal({
      id: "d4",
      title: "N 5th St duplex",
      values,
      currentRatePct: 5.5,
    });
    expect(alert).not.toBeNull();
    expect(alert!.label).toBe("N 5th St duplex");
    expect(alert!.improved).toBe(true);
    expect(alert!.savedRatePct).toBe(8.5);
    expect(alert!.currentRatePct).toBe(5.5);
    expect(alert!.changes.length).toBeGreaterThan(0);
    expect(alert!.after.monthlyCashFlow).toBeGreaterThan(alert!.before.monthlyCashFlow);
    expect(alert!.after.dscr).toBeGreaterThan(alert!.before.dscr);
  });

  it("flags deterioration when rates rise", () => {
    const values = baseDeal({ interestRate: 5.5 });
    const alert = buildRateAlertForDeal({
      id: "d5",
      address: "1205 N 5th St",
      values,
      currentRatePct: 8.5,
    });
    expect(alert).not.toBeNull();
    expect(alert!.improved).toBe(false);
    expect(alert!.label).toBe("1205 N 5th St");
    expect(alert!.after.dscr).toBeLessThan(alert!.before.dscr);
  });

  it("falls back to 'Saved deal' label when title and address are blank", () => {
    const alert = buildRateAlertForDeal({
      id: "d6",
      title: "  ",
      address: null,
      values: baseDeal({ interestRate: 8.5 }),
      currentRatePct: 5.5,
    });
    expect(alert).not.toBeNull();
    expect(alert!.label).toBe("Saved deal");
  });
});

describe("rateAlertSubject", () => {
  it("pluralizes and directions correctly", () => {
    expect(rateAlertSubject(6.12, 1, true)).toBe(
      "Rates dropped to 6.12% — 1 of your saved deals changed"
    );
    expect(rateAlertSubject(7.4, 3, false)).toBe(
      "Rates rose to 7.40% — 3 of your saved deals changed"
    );
  });
});
