import { describe, expect, it } from "vitest";

import {
  buildRateWatch,
  resolveComparableSavedMetricCohort,
  type RateWatchDealRow,
} from "@/lib/rate-watch";
import { calculateAnalysis } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";

/** Same canonical single-family fixture as rate-alerts.test.ts. */
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

const row = (id: string, snapshot: unknown, title?: string): RateWatchDealRow => ({
  id,
  title: title ?? null,
  address: null,
  form_snapshot: snapshot,
  methodology_version: TRUECAP_UNDERWRITING_STANDARD_VERSION,
  result_snapshot: null,
});

describe("buildRateWatch", () => {
  it("returns null when the current rate is unavailable", () => {
    expect(buildRateWatch([row("a", baseDeal({ interestRate: 8.5 }))], null)).toBeNull();
  });

  it("returns null when there are no saved deals", () => {
    expect(buildRateWatch([], 5.5)).toBeNull();
  });

  it("returns null when every saved snapshot is unparseable (nothing watchable)", () => {
    expect(buildRateWatch([row("bad", { not: "valid" })], 5.5)).toBeNull();
  });

  it("returns an ambient summary (no changes, but deals are monitored)", () => {
    // 7% → 6.7% on a comfortable deal: numbers shift, but tier/band/sign hold.
    const rows = [row("flat", baseDeal({ interestRate: 7, monthlyRent: 2_600 }))];
    const result = buildRateWatch(rows, 6.7);
    expect(result).not.toBeNull();
    expect(result!.changedDeals).toHaveLength(0);
    expect(result!.monitoredCount).toBe(1);
    expect(result!.excludedMethodologyCount).toBe(0);
  });

  it("surfaces deals whose signal flips and excludes unchanged ones", () => {
    const rows = [
      // Saved at 8.5%, today 5.5% → a known state flip (improves).
      row("mover", baseDeal({ interestRate: 8.5 }), "Mover"),
      // Saved at 5.5% with today 5.5% → zero delta, below the per-deal gate.
      row("unchanged", baseDeal({ interestRate: 5.5 }), "Unchanged"),
    ];
    const result = buildRateWatch(rows, 5.5);
    expect(result).not.toBeNull();
    expect(result!.currentRatePct).toBe(5.5);
    expect(result!.changedDeals).toHaveLength(1);
    expect(result!.changedDeals[0]!.id).toBe("mover");
    expect(result!.changedDeals[0]!.improved).toBe(true);
    // Both deals are watched even though only one changed.
    expect(result!.monitoredCount).toBe(2);
    expect(result!.excludedMethodologyCount).toBe(0);
  });

  it("skips rows whose form snapshot doesn't validate", () => {
    const rows = [
      row("bad", { not: "a valid form" }),
      row("good", baseDeal({ interestRate: 8.5 }), "Good"),
    ];
    const result = buildRateWatch(rows, 5.5);
    expect(result).not.toBeNull();
    expect(result!.changedDeals.map((d) => d.id)).toEqual(["good"]);
  });

  it("counts only methodology-eligible deals as monitored", () => {
    const values = baseDeal({ interestRate: 8.5 });
    const current = row("current", values, "Current");
    const frozen: RateWatchDealRow = {
      ...row("frozen", values, "Frozen"),
      methodology_version: "1.0",
      result_snapshot: calculateAnalysis(values),
    };
    const result = buildRateWatch([current, frozen], 5.5);

    expect(result).not.toBeNull();
    expect(result!.monitoredCount).toBe(1);
    expect(result!.excludedMethodologyCount).toBe(1);
    expect(result!.changedDeals.map((deal) => deal.id)).toEqual(["current"]);
  });

  it("suppresses a recorded current row whose saved baseline no longer attests", () => {
    const values = baseDeal({ interestRate: 8.5 });
    const recorded = calculateAnalysis(values);
    const drifted: RateWatchDealRow = {
      ...row("drifted", values),
      result_snapshot: { ...recorded, dscr: recorded.dscr + 0.05 },
    };

    expect(buildRateWatch([drifted], 5.5)).toBeNull();
  });
});

describe("resolveComparableSavedMetricCohort", () => {
  it("keeps computed and recorded values in separate cohorts", () => {
    expect(
      resolveComparableSavedMetricCohort({
        methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
        resultSnapshot: null,
        recomputedSnapshot: { netCashFlow: 100 },
      }),
    ).toBe(`current-computed:${TRUECAP_UNDERWRITING_STANDARD_VERSION}`);
    expect(
      resolveComparableSavedMetricCohort({
        methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
        resultSnapshot: { netCashFlow: 100 },
        recomputedSnapshot: { netCashFlow: 100 },
      }),
    ).toBe(`recorded:${TRUECAP_UNDERWRITING_STANDARD_VERSION}`);
  });

  it("rejects an unavailable legacy stored fallback", () => {
    expect(
      resolveComparableSavedMetricCohort({
        methodologyVersion: null,
        resultSnapshot: { netCashFlow: 100 },
      }),
    ).toBeNull();
  });
});
