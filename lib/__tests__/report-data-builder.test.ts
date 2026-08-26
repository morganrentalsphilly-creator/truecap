import { describe, expect, it } from "vitest";

import {
  buildCanonicalReportData,
  type CanonicalReportBuildInput,
} from "@/lib/report-data-builder";
import { SAMPLE_DEAL_MAO_TARGET, SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import {
  TRUECAP_UNDERWRITING_STANDARD_NAME,
  TRUECAP_UNDERWRITING_STANDARD_VERSION,
} from "@/lib/underwriting-methodology";
import {
  formatReportInsuranceAssumption,
  type ReportData,
} from "@/lib/pdf-generator";
import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import { buildCompareSnapshotPayload } from "@/lib/compare-result-snapshot";
import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";

const NOW = new Date("2026-08-23T12:00:00.000Z");

function canonical(): ReportData {
  return buildCanonicalReportData({
    values: SAMPLE_DEAL_VALUES,
    maxOfferTarget: SAMPLE_DEAL_MAO_TARGET,
    maxOfferTargetSource: "buy-box",
    generatedAt: NOW,
  });
}

describe("server-owned PDF report data", () => {
  it("preserves and prints the active monthly insurance bill", () => {
    const report = buildCanonicalReportData({
      values: {
        ...SAMPLE_DEAL_VALUES,
        purchasePrice: 240_000,
        insuranceInputMode: "monthly",
        insuranceMonthly: 250,
        // Deliberately stale: monthly mode must not print this as the input.
        insurancePct: 0.5,
      },
      generatedAt: NOW,
    });

    expect(report.expenses.insuranceMonthlyBill).toBe(250);
    expect(report.expenses.insurancePct).toBeCloseTo(1.25, 10);
    expect(formatReportInsuranceAssumption(report.expenses)).toBe(
      "$250/mo (monthly amount)",
    );
  });

  it("marks zero-cash CoC as not applicable in base and downside report data", () => {
    const report = buildCanonicalReportData({
      values: {
        ...SAMPLE_DEAL_VALUES,
        downPaymentPct: 0,
        closingCostsPct: 0,
        rehabBudget: 0,
        strFurnishingCost: 0,
        monthlyRent: 8_000,
      },
      generatedAt: NOW,
    });

    expect(report.performance.cocReturn).toBe(0);
    expect(report.performance.cocApplicable).toBe(false);
    expect(report.downsideScenario?.cocApplicable).toBe(false);
  });

  it("recomputes every deterministic section instead of rendering forged client results", () => {
    const expected = canonical();
    const forged: ReportData = {
      ...expected,
      methodologyVersion: "forged-methodology",
      methodologyLabel: "Forged underwriting standard",
      property: {
        ...expected.property,
        address: "999 Forged St",
        purchasePrice: 99_999_999,
      },
      financing: {
        ...expected.financing,
        downPayment: 7_777_777,
        closingCosts: 7_777_777,
      },
      expenses: { ...expected.expenses, propertyTaxPct: 777_777 },
      performance: {
        recommendation: "Strong Buy",
        dealScore: 100,
        risk: "No Risk",
        rationale: "forged-rationale-sentinel",
        monthlyCashFlow: 7_777_777,
        cocReturn: 7_777_777,
        capRate: 7_777_777,
        dscr: 7_777_777,
        taxSavings: 7_777_777,
        afterTaxCF: 7_777_777,
      },
      inputConfidence: {
        score: 100,
        stageLabel: "Everything verified",
        sensitivityRisk: "low",
        methodVersion: "forged",
        verifiedAssumptions: ["forged verification"],
        unverifiedAssumptions: [],
      },
      comps: {
        valueEstimate: 7_777_777,
        valueRange: null,
        rentEstimate: 7_777_777,
        rentRange: null,
        saleComps: [],
        rentComps: [],
        fetchedAt: "forged-rentcast-provenance",
      },
      operatingStatement: expected.operatingStatement
        ? { ...expected.operatingStatement, noi: 7_777_777 }
        : null,
      maxOffer: expected.maxOffer
        ? { ...expected.maxOffer, maxPrice: 7_777_777 }
        : null,
      downsideScenario: expected.downsideScenario
        ? { ...expected.downsideScenario, monthlyCashFlow: 7_777_777 }
        : undefined,
      projection10y: {
        ...expected.projection10y,
        cumulativeCF: 7_777_777,
        rows: expected.projection10y.rows.map((row) => ({
          ...row,
          net: 7_777_777,
        })),
      },
      taxStrategy: {
        ...expected.taxStrategy,
        totalBenefit10y: 7_777_777,
        rows: expected.taxStrategy.rows.map((row) => ({
          ...row,
          benefit: 7_777_777,
        })),
      },
      exitScenarios: {
        ...expected.exitScenarios,
        year10Profit: 7_777_777,
        rows: expected.exitScenarios.rows.map((row) => ({
          ...row,
          profit: 7_777_777,
        })),
      },
    };

    const rebuilt = buildCanonicalReportData({
      values: { ...SAMPLE_DEAL_VALUES, browserOnlyResult: 7_777_777 },
      // Simulate a hostile action payload carrying a now-disallowed property.
      // Runtime object extras are ignored as firmly as the type rejects them.
      submittedReport: forged,
      maxOfferTarget: SAMPLE_DEAL_MAO_TARGET,
      maxOfferTargetSource: "buy-box",
      generatedAt: NOW,
    } as unknown as CanonicalReportBuildInput);

    expect(rebuilt.methodologyVersion).toBe(
      TRUECAP_UNDERWRITING_STANDARD_VERSION,
    );
    expect(rebuilt.methodologyLabel).toBe(
      `${TRUECAP_UNDERWRITING_STANDARD_NAME} v${TRUECAP_UNDERWRITING_STANDARD_VERSION}`,
    );
    expect(rebuilt.property).toEqual(expected.property);
    expect(rebuilt.financing).toEqual(expected.financing);
    expect(rebuilt.expenses).toEqual(expected.expenses);
    expect(rebuilt.performance).toEqual(expected.performance);
    expect(rebuilt.operatingStatement).toEqual(expected.operatingStatement);
    expect(rebuilt.maxOffer).toEqual(expected.maxOffer);
    expect(rebuilt.downsideScenario).toEqual(expected.downsideScenario);
    expect(rebuilt.projection10y).toEqual(expected.projection10y);
    expect(rebuilt.taxStrategy).toEqual(expected.taxStrategy);
    expect(rebuilt.exitScenarios).toEqual(expected.exitScenarios);
    expect(rebuilt.inputConfidence).toBeNull();
    expect(rebuilt.comps).toBeNull();
    expect(JSON.stringify(rebuilt)).not.toContain("forged-rationale-sentinel");
    expect(JSON.stringify(rebuilt)).not.toContain("forged-rentcast-provenance");
    expect(JSON.stringify(rebuilt)).not.toContain("7777777");
  });

  it("uses only the normalized target, never a submitted Max Offer result", () => {
    const forged = canonical();
    forged.maxOffer = forged.maxOffer
      ? { ...forged.maxOffer, maxPrice: 98_765_432 }
      : null;

    const rebuilt = buildCanonicalReportData({
      values: SAMPLE_DEAL_VALUES,
      maxOfferTarget: SAMPLE_DEAL_MAO_TARGET,
      generatedAt: NOW,
      submittedReport: forged,
    } as unknown as CanonicalReportBuildInput);

    expect(rebuilt.maxOffer?.maxPrice).toBe(canonical().maxOffer?.maxPrice);
    expect(rebuilt.maxOffer?.maxPrice).not.toBe(98_765_432);
  });

  it("makes the target-based decision primary and keeps Screening Index secondary", () => {
    const passAtThisPrice = buildCanonicalReportData({
      values: SAMPLE_DEAL_VALUES,
      maxOfferTarget: { monthlyCashFlow: 1_000_000 },
      maxOfferTargetSource: "selected-targets",
      generatedAt: NOW,
    });
    expect(passAtThisPrice.decision?.label).toBe(
      "Does not meet selected rules at asking"
    );
    expect(passAtThisPrice.decision?.clearsSelectedTargets).toBe(false);
    expect(passAtThisPrice.decision?.targetSource).toBe("selected-targets");
    expect(passAtThisPrice.decision?.rationale).toContain("does not clear");

    const screeningOnly = buildCanonicalReportData({
      values: SAMPLE_DEAL_VALUES,
      maxOfferTarget: { monthlyCashFlow: -1_000_000 },
      maxOfferTargetSource: "selected-targets",
      generatedAt: NOW,
    });
    expect(screeningOnly.decision?.label).toBe("Meets selected rules at asking");
    expect(screeningOnly.decision?.readiness).toBe("Screening only");
    expect(screeningOnly.maxOffer?.source).toBe("selected-targets");
  });

  it("keeps a report preliminary until acquisition targets are adopted", () => {
    const withoutTargets = buildCanonicalReportData({
      values: SAMPLE_DEAL_VALUES,
      generatedAt: NOW,
    });
    expect(withoutTargets.decision).toMatchObject({
      label: "Preliminary underwriting",
      clearsSelectedTargets: false,
      targetSource: "screening-defaults",
      targetBasis: "No acquisition targets adopted",
    });
    expect(withoutTargets.maxOffer).toBeNull();

    const withExamplesOnly = buildCanonicalReportData({
      values: SAMPLE_DEAL_VALUES,
      maxOfferTarget: SAMPLE_DEAL_MAO_TARGET,
      maxOfferTargetSource: "screening-defaults",
      generatedAt: NOW,
    });
    expect(withExamplesOnly.decision?.label).toBe("Preliminary underwriting");
    expect(withExamplesOnly.maxOffer).toBeNull();
  });

  it("prints canonical STR revenue and leaves a missing construction year unknown", () => {
    const rebuilt = buildCanonicalReportData({
      values: {
        ...SAMPLE_DEAL_VALUES,
        yearBuilt: undefined,
        monthlyRent: 1_000,
        avgDailyRate: 200,
        occupancyPct: 50,
      },
      generatedAt: NOW,
    });

    expect(rebuilt.property.yearBuilt).toBeNull();
    expect(rebuilt.units[0]?.rent).toBeCloseTo((200 * 365 * 0.5) / 12);
    expect(rebuilt.units[0]?.rent).not.toBe(1_000);
    expect(rebuilt.performance.monthlyCashFlow).not.toBe(7_777_777);
  });

  it("includes comps only through explicit server-trusted presentation data", () => {
    const trusted = canonical().comps ?? {
      valueEstimate: 265_000,
      valueRange: null,
      rentEstimate: 3_050,
      rentRange: null,
      saleComps: [],
      rentComps: [],
      fetchedAt: "2026-08-23T00:00:00.000Z",
    };
    const rebuilt = buildCanonicalReportData({
      values: SAMPLE_DEAL_VALUES,
      trustedPresentation: {
        comps: trusted,
        templateLabel: "Owner-scoped template",
      },
      generatedAt: NOW,
    });

    expect(rebuilt.comps).toEqual(trusted);
    expect(rebuilt.property.template).toBe("Owner-scoped template");
  });

  it("renders an owner-scoped saved PDF from its recorded result snapshot", () => {
    const result = calculateAnalysis(SAMPLE_DEAL_VALUES);
    const score = computeDealScore(
      buildDealScoreInputFromAnalysis(SAMPLE_DEAL_VALUES, result)
    );
    const { snapshotVersion, compareSnapshot } = buildCompareSnapshotPayload(
      result,
      SAMPLE_DEAL_VALUES
    );
    const recordedYear10Profit =
      compareSnapshot.exitScenarios.years.find((year) => year.year === 10)!
        .totalProfit + 1_234;
    const recordedCompareSnapshot = {
      ...compareSnapshot,
      exitScenarios: {
        ...compareSnapshot.exitScenarios,
        years: compareSnapshot.exitScenarios.years.map((year) =>
          year.year === 10
            ? { ...year, totalProfit: recordedYear10Profit }
            : year
        ),
      },
    };
    const capturedOffer = resolveOfferCeilingForAccess({
      values: SAMPLE_DEAL_VALUES,
      target: SAMPLE_DEAL_MAO_TARGET,
      source: "selected-targets",
      paidAccess: true,
    });
    expect(capturedOffer.access).toBe("exact");
    if (capturedOffer.access !== "exact") throw new Error("expected exact access");
    const report = buildCanonicalReportData({
      values: SAMPLE_DEAL_VALUES,
      maxOfferTarget: SAMPLE_DEAL_MAO_TARGET,
      maxOfferTargetSource: "selected-targets",
      generatedAt: NOW,
      trustedRecordedResult: {
        methodologyVersion: result.methodologyVersion,
        resultSnapshot: {
          ...result,
          score: score.score,
          recommendation: score.recommendation,
          riskLevel: score.riskLevel,
          breakdown: score.breakdown,
          explanation: score.explanation,
          snapshotVersion,
          compareSnapshot: recordedCompareSnapshot,
          maxOfferTarget: SAMPLE_DEAL_MAO_TARGET,
          maxOfferTargetSource: "selected-targets",
          offerCeilingExact: capturedOffer.exact,
        },
      },
    });

    expect(report.methodologyLabel).toBe(
      `Recorded ${TRUECAP_UNDERWRITING_STANDARD_NAME} v${result.methodologyVersion}`
    );
    expect(report.exitScenarios.year10Profit).toBe(recordedYear10Profit);
    expect(report.maxOffer?.maxPrice).toBe(
      capturedOffer.exact?.presentation.ceiling,
    );
    expect(report.maxOffer?.source).toBe("selected-targets");
    expect(report.downsideScenario).toBeUndefined();
  });
});
