import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildCompareSnapshotPayload,
  recomputeCompareSnapshotFromForm,
} from "@/lib/compare-result-snapshot";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import {
  buildDecisionTargetContext,
  DECISION_CONTRACT_VERSION,
  offerCeilingHelperCopy,
} from "@/lib/decision-contract";
import { calculateMaxAllowableOffer } from "@/lib/max-allowable-offer";
import { maoTargetFingerprint } from "@/lib/mao-target-editor";
import { describeMaoTarget } from "@/lib/mao-targets";
import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";
import { buildCanonicalReportData } from "@/lib/report-data-builder";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { resolveSavedAnalysisResult } from "@/lib/saved-analysis-methodology";
import {
  TRUECAP_UNDERWRITING_STANDARD_NAME,
  TRUECAP_UNDERWRITING_STANDARD_VERSION,
} from "@/lib/underwriting-methodology";

const FIXED_NOW = new Date("2026-08-24T12:00:00.000Z");

describe("canonical decision output parity across safe adapters", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("keeps the sample, server ceiling, saved workspace, Compare, and PDF report aligned", () => {
    const values = SAMPLE_DEAL_FIXTURE.values;
    const target = SAMPLE_DEAL_FIXTURE.maoTarget;
    const targetSource = SAMPLE_DEAL_FIXTURE.targetProfile.source;
    const targetContext = buildDecisionTargetContext({
      target,
      source: targetSource,
      profileId: SAMPLE_DEAL_FIXTURE.targetProfile.id,
      profileName: SAMPLE_DEAL_FIXTURE.targetProfile.name,
      profileVersion: SAMPLE_DEAL_FIXTURE.targetProfile.version,
    });
    const direct = calculateAnalysis(values);
    const directScore = computeDealScore(
      buildDealScoreInputFromAnalysis(values, direct),
    );
    const directCeiling = calculateMaxAllowableOffer(values, target);
    const sample = calculateSampleDealOutcome();
    const server = resolveOfferCeilingForAccess({
      values,
      target,
      source: targetSource,
      // This is the exact public sample contract, so it must retain exact
      // parity without borrowing a paid entitlement in the test.
      paidAccess: false,
    });
    const report = buildCanonicalReportData({
      values,
      maxOfferTarget: target,
      maxOfferTargetSource: targetSource,
      generatedAt: FIXED_NOW,
    });
    const saved = resolveSavedAnalysisResult({
      methodologyVersion: direct.methodologyVersion,
      resultSnapshot: {
        ...direct,
        score: directScore.score,
        recommendation: directScore.recommendation,
        riskLevel: directScore.riskLevel,
        breakdown: directScore.breakdown,
        explanation: directScore.explanation,
        maxOfferTarget: target,
        maxOfferTargetSource: targetSource,
      },
      recomputedResult: direct,
      recomputedExtras: {
        score: directScore.score,
        recommendation: directScore.recommendation,
        riskLevel: directScore.riskLevel,
        breakdown: directScore.breakdown,
        explanation: directScore.explanation,
      },
    });
    const savedSnapshot = saved.result as unknown as Record<string, unknown>;

    expect(sample.analysis).toEqual(direct);
    expect(SAMPLE_DEAL_FIXTURE).toMatchObject({
      fixtureVersion: "synthetic-rental-v2",
      synthetic: true,
      targetProfile: {
        id: "truecap-synthetic-sample-target",
        name: "Synthetic sample targets",
        version: "1.0",
        source: "selected-targets",
      },
    });
    expect(values.address).toBe(
      "TrueCap Synthetic Sample, Philadelphia, PA 19140, USA",
    );
    expect(maoTargetFingerprint(target)).toBe(
      '{"monthlyCashFlow":750,"dscr":1.25}',
    );
    expect(targetContext).toEqual({
      contractVersion: DECISION_CONTRACT_VERSION,
      profileId: "truecap-synthetic-sample-target",
      profileName: "Synthetic sample targets",
      profileVersion: "1.0",
      rulesSnapshotVersion:
        "rules-v1:%7B%22monthlyCashFlow%22%3A750%2C%22dscr%22%3A1.25%7D",
      identityStatus: "identified-profile-versioned",
      source: "selected-targets",
      origin: "user-selected",
      rules: target,
      rulesLabel: "cash flow ≥ $750/mo · DSCR ≥ 1.25",
    });
    expect(offerCeilingHelperCopy(targetContext)).toBe(
      "Highest modeled price that still meets Synthetic sample targets under the assumptions shown.",
    );
    expect(sample.dealScore).toEqual(directScore);
    expect(sample.maxOffer).toEqual(directCeiling);
    expect(direct.methodologyVersion).toBe(
      TRUECAP_UNDERWRITING_STANDARD_VERSION,
    );
    expect(sample.analysis.methodologyVersion).toBe(
      TRUECAP_UNDERWRITING_STANDARD_VERSION,
    );
    expect(directCeiling?.achieved.methodologyVersion).toBe(
      TRUECAP_UNDERWRITING_STANDARD_VERSION,
    );
    expect(directCeiling?.maxPrice).toBe(236_000);
    expect((directCeiling?.maxPrice ?? -1) % 500).toBe(0);
    expect(savedSnapshot).toMatchObject({
      netCashFlow: direct.netCashFlow,
      capRate: direct.capRate,
      cocReturn: direct.cocReturn,
      dscr: direct.dscr,
      score: directScore.score,
      maxOfferTarget: target,
      maxOfferTargetSource: targetSource,
    });

    expect(server.access).toBe("exact");
    if (server.access !== "exact") return;
    expect(server.exact?.presentation.ceiling).toBe(directCeiling?.maxPrice);
    expect(server.exact?.presentation.source).toBe(targetSource);
    expect(server.exact?.presentation.sourceLabel).toBe(
      "Under your selected targets",
    );
    expect((server.exact?.presentation.ceiling ?? -1) % 500).toBe(0);
    expect(server.exact?.achieved).toEqual({
      netCashFlow: directCeiling?.achieved.netCashFlow,
      cocReturn: directCeiling?.achieved.cocReturn,
      capRate: directCeiling?.achieved.capRate,
      dscr: directCeiling?.achieved.dscr,
    });

    expect(report.methodologyVersion).toBe(direct.methodologyVersion);
    expect(report.methodologyLabel).toBe(
      `${TRUECAP_UNDERWRITING_STANDARD_NAME} v${TRUECAP_UNDERWRITING_STANDARD_VERSION}`,
    );
    expect(report.performance).toMatchObject({
      dealScore: directScore.score,
      monthlyCashFlow: direct.netCashFlow,
      cocReturn: direct.cocReturn,
      capRate: direct.capRate,
      dscr: direct.dscr,
    });
    expect(report.decision).toMatchObject({
      targetSource,
      targetBasis: describeMaoTarget(target),
    });
    expect(report.maxOffer).toMatchObject({
      maxPrice: directCeiling?.maxPrice,
      basis: describeMaoTarget(target),
      source: targetSource,
      sourceLabel: "Under your selected targets",
      achieved: {
        monthlyCashFlow: directCeiling?.achieved.netCashFlow,
        cocReturn: directCeiling?.achieved.cocReturn,
        capRate: directCeiling?.achieved.capRate,
        dscr: directCeiling?.achieved.dscr,
      },
    });

    const compare = buildCompareSnapshotPayload(direct, values).compareSnapshot;
    expect(recomputeCompareSnapshotFromForm(values)).toEqual(compare);
  });

  it("keeps rendered sample surfaces on the synthetic fixture and Offer Ceiling vocabulary", () => {
    const sampleSurfacePaths = [
      "components/marketing/marketing-hero.tsx",
      "app/sample-decision-memo/page.tsx",
    ];

    for (const path of sampleSurfacePaths) {
      const source = readFileSync(resolve(process.cwd(), path), "utf8");
      expect(source, `${path}: shared fixture`).toContain(
        "SAMPLE_DEAL_FIXTURE",
      );
      expect(source, `${path}: former property identity`).not.toContain(
        "1700 W Erie",
      );
    }

    const memo = readFileSync(
      resolve(process.cwd(), "app/sample-decision-memo/page.tsx"),
      "utf8",
    );
    expect(memo).toContain("Offer Ceiling");
    expect(memo).not.toContain("What should I offer?");
  });
});
