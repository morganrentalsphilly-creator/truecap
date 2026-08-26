import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "@/lib/calc-analysis";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import { generateInvestmentPDFBlob } from "@/lib/pdf-generator";
import { buildCanonicalReportData } from "@/lib/report-data-builder";
import { reportDataSchema } from "@/lib/report-payload-schema";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import {
  buildSpecialistAnalysisSnapshot,
  parseSpecialistAnalysisSnapshot,
  SPECIALIST_ANALYSIS_MODEL_VERSION,
} from "@/lib/specialist-analysis-snapshot";

function specialistValues(overrides: Record<string, unknown> = {}) {
  return investmentFormSchema.parse({
    ...SAMPLE_DEAL_VALUES,
    strategyArv: 400_000,
    rehabBudget: 30_000,
    strategyHoldMonths: 6,
    ...overrides,
  });
}

describe("specialist analysis snapshots", () => {
  it("freezes every BRRRR default and preserves explicit zero", () => {
    const values = specialistValues({
      rehabBudget: 0,
      strategyHoldMonths: 0,
      brrrrRefiLtvPct: 0,
      brrrrRefiRatePct: 0,
      brrrrRefiTermYears: undefined,
      brrrrRefiClosingCostsPct: 0,
      closingCostsPct: 0,
      downPaymentPct: 0,
    });
    const snapshot = buildSpecialistAnalysisSnapshot(
      values,
      calculateAnalysis(values),
      "brrrr",
    );

    expect(snapshot?.strategy).toBe("brrrr");
    if (!snapshot || snapshot.strategy !== "brrrr") {
      throw new Error("Expected a BRRRR snapshot");
    }
    expect(snapshot.modelVersion).toBe(SPECIALIST_ANALYSIS_MODEL_VERSION);
    expect(snapshot.effectiveInputs).toMatchObject({
      rehabBudget: 0,
      holdMonths: 0,
      refiLtvPct: 0,
      refiRatePct: 0,
      refiTermYears: 30,
      closingCostsPctAcq: 0,
      closingCostsRefiPct: 0,
      downPaymentPct: 0,
    });
    expect(snapshot.inputSources).toMatchObject({
      rehabBudget: "saved-assumption",
      holdMonths: "saved-assumption",
      refiLtvPct: "saved-assumption",
      refiRatePct: "saved-assumption",
      refiTermYears: "strategy-default",
      closingCostsPctAcq: "base-underwrite",
      closingCostsRefiPct: "saved-assumption",
      downPaymentPct: "base-underwrite",
    });
  });

  it("preserves an explicit $0 flip carry instead of replacing it with the derived carry", () => {
    const values = specialistValues({
      rehabBudget: 0,
      strategyHoldMonths: 0,
      fixFlipSellingCostsPct: 0,
      fixFlipDownPaymentPct: 0,
      fixFlipCarryMonthly: 0,
    });
    const snapshot = buildSpecialistAnalysisSnapshot(
      values,
      calculateAnalysis(values),
      "fix-flip",
    );

    expect(snapshot?.strategy).toBe("fix-flip");
    if (!snapshot || snapshot.strategy !== "fix-flip") {
      throw new Error("Expected a fix-and-flip snapshot");
    }
    expect(snapshot.effectiveInputs).toMatchObject({
      rehabBudget: 0,
      holdMonths: 0,
      sellingCostsPct: 0,
      downPaymentPct: 0,
      monthlyCarryingCost: 0,
    });
    expect(snapshot.inputSources.monthlyCarryingCost).toBe("saved-assumption");
  });

  it("labels auto-estimated flip carry as derived", () => {
    const values = specialistValues({ fixFlipCarryMonthly: undefined });
    const snapshot = buildSpecialistAnalysisSnapshot(
      values,
      calculateAnalysis(values),
      "fix-flip",
    );

    expect(snapshot?.strategy).toBe("fix-flip");
    if (!snapshot || snapshot.strategy !== "fix-flip") {
      throw new Error("Expected a fix-and-flip snapshot");
    }
    expect(snapshot.effectiveInputs.monthlyCarryingCost).toBeGreaterThan(0);
    expect(snapshot.inputSources.monthlyCarryingCost).toBe("derived");
  });

  it("is JSON-safe when BRRRR cash-on-cash is mathematically infinite", () => {
    const values = specialistValues({
      purchasePrice: 80_000,
      monthlyRent: 5_000,
      downPaymentPct: 100,
      closingCostsPct: 3,
      rehabBudget: 20_000,
      strategyArv: 200_000,
      brrrrRefiLtvPct: 75,
      brrrrRefiRatePct: 7,
      brrrrRefiTermYears: 30,
      brrrrRefiClosingCostsPct: 2,
    });
    const snapshot = buildSpecialistAnalysisSnapshot(
      values,
      calculateAnalysis(values),
      "brrrr",
    );

    expect(snapshot?.strategy).toBe("brrrr");
    if (!snapshot || snapshot.strategy !== "brrrr") {
      throw new Error("Expected a BRRRR snapshot");
    }
    expect(snapshot.outcome.isInfiniteReturn).toBe(true);
    expect(snapshot.outcome.postRefiCashOnCashPct).toBeNull();
    const roundTrip = JSON.parse(JSON.stringify(snapshot));
    expect(parseSpecialistAnalysisSnapshot(roundTrip)).toEqual(snapshot);
  });

  it("suppresses non-specialist strategies and incomplete or invalid specialist inputs", () => {
    const missingArv = investmentFormSchema.parse({
      ...SAMPLE_DEAL_VALUES,
      strategyArv: undefined,
    });
    expect(
      buildSpecialistAnalysisSnapshot(
        missingArv,
        calculateAnalysis(missingArv),
        "buy-hold",
      ),
    ).toBeNull();

    const missingRehab = investmentFormSchema.parse({
      ...SAMPLE_DEAL_VALUES,
      rehabBudget: undefined,
      strategyArv: 400_000,
    });
    expect(
      buildSpecialistAnalysisSnapshot(
        missingRehab,
        calculateAnalysis(missingRehab),
        "brrrr",
      ),
    ).toBeNull();
    expect(
      buildCanonicalReportData({
        values: missingRehab,
        analyzerStrategyKey: "brrrr",
        generatedAt: new Date("2026-08-26T12:00:00.000Z"),
      }).specialistAnalysis,
    ).toBeNull();
    expect(
      buildSpecialistAnalysisSnapshot(
        missingRehab,
        calculateAnalysis(missingRehab),
        "fix-flip",
      ),
    ).toBeNull();
    expect(
      buildSpecialistAnalysisSnapshot(
        missingArv,
        calculateAnalysis(missingArv),
        "brrrr",
      ),
    ).toBeNull();

    const invalid = {
      ...specialistValues(),
      brrrrRefiRatePct: Number.NaN,
    };
    expect(
      buildSpecialistAnalysisSnapshot(
        invalid,
        calculateAnalysis(specialistValues()),
        "brrrr",
      ),
    ).toBeNull();
  });

  it("rejects malformed, non-finite, mismatched, and unknown-version snapshots", () => {
    const values = specialistValues();
    const valid = buildSpecialistAnalysisSnapshot(
      values,
      calculateAnalysis(values),
      "brrrr",
    );
    expect(valid?.strategy).toBe("brrrr");
    if (!valid || valid.strategy !== "brrrr") {
      throw new Error("Expected a BRRRR snapshot");
    }

    expect(
      parseSpecialistAnalysisSnapshot({ ...valid, modelVersion: 2 }),
    ).toBeNull();
    for (const invalidNumber of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(
        parseSpecialistAnalysisSnapshot({
          ...valid,
          effectiveInputs: {
            ...valid.effectiveInputs,
            rehabBudget: invalidNumber,
          },
        }),
      ).toBeNull();
    }
    expect(
      parseSpecialistAnalysisSnapshot({
        ...valid,
        outcome: {
          ...valid.outcome,
          isInfiniteReturn: false,
          postRefiCashOnCashPct: null,
        },
      }),
    ).toBeNull();
    expect(
      parseSpecialistAnalysisSnapshot({
        ...valid,
        strategy: "fix-flip",
      }),
    ).toBeNull();
  });

  it("derives only current specialist reports and preserves the strict report wire shape", () => {
    const values = specialistValues({
      fixFlipSellingCostsPct: 0,
      fixFlipCarryMonthly: 0,
    });
    const current = buildCanonicalReportData({
      values,
      analyzerStrategyKey: "fix-flip",
      generatedAt: new Date("2026-08-26T12:00:00.000Z"),
    });
    expect(current.specialistAnalysis?.strategy).toBe("fix-flip");
    expect(
      current.specialistAnalysis?.strategy === "fix-flip"
        ? current.specialistAnalysis.inputSources.monthlyCarryingCost
        : null,
    ).toBe("saved-assumption");

    const parsedReport = reportDataSchema.parse(current);
    expect(parsedReport.specialistAnalysis).toEqual(current.specialistAnalysis);

    const incompatibleLens = buildCanonicalReportData({
      values,
      analyzerStrategyKey: "short-term",
      generatedAt: new Date("2026-08-26T12:00:00.000Z"),
    });
    expect(incompatibleLens.specialistAnalysis).toBeNull();

    const generalLens = buildCanonicalReportData({
      values,
      generatedAt: new Date("2026-08-26T12:00:00.000Z"),
    });
    expect(generalLens.specialistAnalysis).toBeNull();
  });

  it("adds exactly one clearly separated PDF page for a specialist snapshot", async () => {
    const values = specialistValues();
    const generatedAt = new Date("2026-08-26T12:00:00.000Z");
    const baseReport = buildCanonicalReportData({ values, generatedAt });
    const specialistReport = buildCanonicalReportData({
      values,
      analyzerStrategyKey: "brrrr",
      generatedAt,
    });
    const [baseBlob, specialistBlob] = await Promise.all([
      generateInvestmentPDFBlob(baseReport),
      generateInvestmentPDFBlob(specialistReport),
    ]);
    const pageCount = async (blob: Blob) => {
      const pdf = Buffer.from(await blob.arrayBuffer()).toString("latin1");
      return pdf.match(/\/Type \/Page\b/g)?.length ?? 0;
    };

    expect(await pageCount(specialistBlob)).toBe(
      (await pageCount(baseBlob)) + 1,
    );
  });
});
