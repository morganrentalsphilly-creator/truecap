import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildRateAlertForDeal,
  buildRateReUnderwrite,
  dscrBand,
  evaluateRateAlertForDeal,
  parseRateAlertRateParam,
  RATE_ALERT_PARAM_MAX_PCT,
  RATE_ALERT_PARAM_MIN_PCT,
  RATE_ALERTS_MIN_DEAL_DELTA_PP,
  rateAlertDealUrl,
  rateAlertSubject,
} from "@/lib/rate-alerts";
import { calculateAnalysis } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";

const CURRENT_COMPUTATION = {
  methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
  recordedSnapshot: null,
} as const;

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
      ...CURRENT_COMPUTATION,
      id: "d1",
      values: baseDeal({ interestRate: 7 }),
      currentRatePct: 7 + RATE_ALERTS_MIN_DEAL_DELTA_PP - 0.01,
    });
    expect(alert).toBeNull();
  });

  it("returns null for cash purchases (no debt service to reprice)", () => {
    const alert = buildRateAlertForDeal({
      ...CURRENT_COMPUTATION,
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
      ...CURRENT_COMPUTATION,
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
      ...CURRENT_COMPUTATION,
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
      ...CURRENT_COMPUTATION,
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
      ...CURRENT_COMPUTATION,
      id: "d6",
      title: "  ",
      address: null,
      values: baseDeal({ interestRate: 8.5 }),
      currentRatePct: 5.5,
    });
    expect(alert).not.toBeNull();
    expect(alert!.label).toBe("Saved deal");
  });

  it("allows a same-version recording only when today's saved-rate baseline attests", () => {
    const values = baseDeal({ interestRate: 8.5 });
    const recordedSnapshot = calculateAnalysis(values);
    const evaluation = evaluateRateAlertForDeal({
      id: "attested",
      values,
      currentRatePct: 5.5,
      methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
      recordedSnapshot,
    });

    expect(evaluation.methodologyMode).toBe("same-version-recorded-snapshot");
    expect(evaluation.eligible).toBe(true);
    expect(evaluation.alert).not.toBeNull();
  });

  it("suppresses a same-version recording when formula drift breaks baseline parity", () => {
    const values = baseDeal({ interestRate: 8.5 });
    const baseline = calculateAnalysis(values);
    const recordedSnapshot = {
      ...baseline,
      netCashFlow: baseline.netCashFlow + 25,
    };
    const evaluation = evaluateRateAlertForDeal({
      id: "drifted",
      values,
      currentRatePct: 5.5,
      methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
      recordedSnapshot,
    });

    expect(evaluation.methodologyMode).toBe("same-version-recorded-snapshot");
    expect(evaluation.eligible).toBe(false);
    expect(evaluation.alert).toBeNull();
  });

  it("does not coerce missing recorded metrics to zero during attestation", () => {
    const evaluation = evaluateRateAlertForDeal({
      id: "incomplete-recording",
      values: baseDeal({ interestRate: 8.5 }),
      currentRatePct: 5.5,
      methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
      recordedSnapshot: {
        netCashFlow: null,
        dscr: null,
        capRate: null,
        cocReturn: null,
        totalCashRequired: null,
        monthlyPayment: null,
      },
    });

    expect(evaluation.methodologyMode).toBe("same-version-recorded-snapshot");
    expect(evaluation.eligible).toBe(false);
    expect(evaluation.alert).toBeNull();
  });

  it("suppresses frozen methodology rows without a historical engine dispatcher", () => {
    const values = baseDeal({ interestRate: 8.5 });
    const evaluation = evaluateRateAlertForDeal({
      id: "frozen",
      values,
      currentRatePct: 5.5,
      methodologyVersion: "1.0",
      recordedSnapshot: calculateAnalysis(values),
    });

    expect(evaluation.methodologyMode).toBe("frozen-version-snapshot");
    expect(evaluation.eligible).toBe(false);
    expect(evaluation.alert).toBeNull();
  });

  it("keeps a legacy row eligible only through the explicit current-engine recompute", () => {
    const evaluation = evaluateRateAlertForDeal({
      id: "legacy",
      values: baseDeal({ interestRate: 8.5 }),
      currentRatePct: 5.5,
      methodologyVersion: null,
      recordedSnapshot: {},
    });

    expect(evaluation.methodologyMode).toBe("legacy-recomputed");
    expect(evaluation.eligible).toBe(true);
    expect(evaluation.alert).not.toBeNull();
  });
});

describe("rate-alert methodology wiring", () => {
  it("passes authoritative methodology and recorded baseline through every scheduled caller", () => {
    const rateCron = readFileSync(
      join(process.cwd(), "app/api/cron/send-rate-alerts/route.ts"),
      "utf8",
    );
    const weeklyCron = readFileSync(
      join(process.cwd(), "app/api/cron/send-weekly-summary/route.ts"),
      "utf8",
    );
    const weeklySummary = readFileSync(
      join(process.cwd(), "lib/weekly-summary.ts"),
      "utf8",
    );

    for (const source of [rateCron, weeklyCron]) {
      expect(source).toContain("methodology_version");
      expect(source).toContain("result_snapshot");
    }
    expect(rateCron).toContain("methodologyVersion: row.methodology_version");
    expect(rateCron).toContain("recordedSnapshot: row.result_snapshot");
    expect(weeklySummary).toContain("methodology_version: r.methodology_version");
    expect(weeklySummary).toContain("result_snapshot: r.result_snapshot");
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

describe("parseRateAlertRateParam", () => {
  it("accepts a plausible rate string", () => {
    expect(parseRateAlertRateParam("6.875")).toBe(6.875);
    expect(parseRateAlertRateParam(String(RATE_ALERT_PARAM_MIN_PCT))).toBe(
      RATE_ALERT_PARAM_MIN_PCT
    );
    expect(parseRateAlertRateParam(String(RATE_ALERT_PARAM_MAX_PCT))).toBe(
      RATE_ALERT_PARAM_MAX_PCT
    );
  });

  it("takes the first value of a repeated param", () => {
    expect(parseRateAlertRateParam(["6.5", "999"])).toBe(6.5);
  });

  it("rejects missing, non-numeric, and non-finite values", () => {
    expect(parseRateAlertRateParam(undefined)).toBeNull();
    expect(parseRateAlertRateParam("")).toBeNull();
    expect(parseRateAlertRateParam("  ")).toBeNull();
    expect(parseRateAlertRateParam("abc")).toBeNull();
    expect(parseRateAlertRateParam("NaN")).toBeNull();
    expect(parseRateAlertRateParam("Infinity")).toBeNull();
    expect(parseRateAlertRateParam([])).toBeNull();
    expect(parseRateAlertRateParam(6.5)).toBeNull(); // only strings come off a URL
  });

  it("rejects rates outside the plausible mortgage bounds", () => {
    expect(parseRateAlertRateParam("0.4")).toBeNull();
    expect(parseRateAlertRateParam("15.01")).toBeNull();
    expect(parseRateAlertRateParam("-6.5")).toBeNull();
    expect(parseRateAlertRateParam("650")).toBeNull();
  });
});

describe("rateAlertDealUrl", () => {
  it("deep-links to the deal workspace with the new rate + source", () => {
    expect(
      rateAlertDealUrl("https://usetruecap.com", { id: "abc-123", currentRatePct: 6.875 })
    ).toBe("https://usetruecap.com/dashboard/saved-analyses/abc-123?rate=6.875&src=rate-alert");
  });
});

describe("buildRateReUnderwrite", () => {
  it("returns before/after metrics even for small, non-state-changing moves", () => {
    // 7% → 6.9% is below the email's per-deal delta gate, but the user
    // clicked a link promising this preview — the banner still renders it.
    const preview = buildRateReUnderwrite(baseDeal({ interestRate: 7 }), 6.9);
    expect(preview).not.toBeNull();
    expect(preview!.savedRatePct).toBe(7);
    expect(preview!.alertRatePct).toBe(6.9);
    expect(preview!.after.monthlyCashFlow).toBeGreaterThan(preview!.before.monthlyCashFlow);
    expect(preview!.after.dscr).toBeGreaterThan(preview!.before.dscr);
  });

  it("shows deterioration when the alert rate is higher than saved", () => {
    const preview = buildRateReUnderwrite(baseDeal({ interestRate: 5.5 }), 8.5);
    expect(preview).not.toBeNull();
    expect(preview!.after.monthlyCashFlow).toBeLessThan(preview!.before.monthlyCashFlow);
  });

  it("returns null for cash purchases (no debt service to reprice)", () => {
    expect(buildRateReUnderwrite(baseDeal({ downPaymentPct: 100 }), 6)).toBeNull();
  });

  it("returns null when the saved rate already matches at display precision", () => {
    expect(buildRateReUnderwrite(baseDeal({ interestRate: 6.875 }), 6.875)).toBeNull();
    expect(buildRateReUnderwrite(baseDeal({ interestRate: 6.875 }), 6.876)).toBeNull();
  });
});
