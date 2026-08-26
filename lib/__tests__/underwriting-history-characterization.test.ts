import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildCompareSnapshotPayload,
  recomputeCompareSnapshotFromForm,
} from "@/lib/compare-result-snapshot";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import { encodeShareLink, decodeShareLink } from "@/lib/share-link";
import {
  resolveSavedAnalysisResult,
  resolveSavedAnalysisSnapshot,
} from "@/lib/saved-analysis-methodology";
import { UNDERWRITING_V1_GOLDEN_CORPUS } from "@/lib/__tests__/fixtures/underwriting-v1-golden-corpus";

const FIXED_NOW = new Date("2026-08-24T12:00:00.000Z");

function baseline() {
  const entry = UNDERWRITING_V1_GOLDEN_CORPUS.find(
    (candidate) => candidate.id === "financed_sfr_standard",
  );
  if (!entry) throw new Error("Missing financed SFR golden case");
  const result = calculateAnalysis(entry.values);
  const score = computeDealScore(
    buildDealScoreInputFromAnalysis(entry.values, result),
  );
  const scoreExtras = {
    score: score.score,
    recommendation: score.recommendation,
    riskLevel: score.riskLevel,
    breakdown: score.breakdown,
    explanation: score.explanation,
  };
  return { values: entry.values, result, scoreExtras };
}

describe("saved underwriting history characterization", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("preserves same-v1 recorded fields and snapshot-only acquisition metadata", () => {
    const { result, scoreExtras } = baseline();
    const resolved = resolveSavedAnalysisResult({
      methodologyVersion: result.methodologyVersion,
      resultSnapshot: {
        ...result,
        ...scoreExtras,
        netCashFlow: -999_999,
        score: 1,
        maxOfferTarget: { monthlyCashFlow: 450, dscr: 1.25 },
        maxOfferTargetSource: "buy-box",
      },
      recomputedResult: result,
      recomputedExtras: scoreExtras,
    });
    const snapshot = resolved.result as unknown as Record<string, unknown>;

    expect(resolved.mode).toBe("same-version-recorded-snapshot");
    expect(resolved.didRecompute).toBe(false);
    expect(resolved.usesRecordedSnapshot).toBe(true);
    expect(snapshot.netCashFlow).toBe(-999_999);
    expect(snapshot.score).toBe(1);
    expect(snapshot.maxOfferTarget).toEqual({
      monthlyCashFlow: 450,
      dscr: 1.25,
    });
    expect(snapshot.maxOfferTargetSource).toBe("buy-box");
  });

  it("recomputes legacy-unversioned financial and score fields", () => {
    const { result, scoreExtras } = baseline();
    const resolved = resolveSavedAnalysisResult({
      methodologyVersion: "legacy-unversioned",
      resultSnapshot: {
        ...result,
        netCashFlow: -888_888,
        score: 2,
      },
      recomputedResult: result,
      recomputedExtras: scoreExtras,
    });
    const snapshot = resolved.result as unknown as Record<string, unknown>;

    expect(resolved.mode).toBe("legacy-recomputed");
    expect(resolved.shouldFreeze).toBe(false);
    expect(resolved.usesRecordedSnapshot).toBe(false);
    expect(snapshot.netCashFlow).toBe(result.netCashFlow);
    expect(snapshot.score).toBe(scoreExtras.score);
  });

  it("freezes a complete different-version result atomically", () => {
    const { result, scoreExtras } = baseline();
    const frozen = {
      ...result,
      methodologyVersion: "2.0",
      netCashFlow: 12_345,
      score: 91,
      recommendation: "Strong Buy",
      riskLevel: "Low Risk",
      breakdown: {
        cashFlowScore: 22,
        cocScore: 20,
        capRateScore: 16,
        dscrScore: 17,
        totalReturnScore: 25,
        riskPenalty: -9,
      },
      explanation: "Frozen future-version explanation",
    };
    const resolved = resolveSavedAnalysisResult({
      methodologyVersion: "2.0",
      resultSnapshot: frozen,
      recomputedResult: result,
      recomputedExtras: scoreExtras,
    });
    const snapshot = resolved.result as unknown as Record<string, unknown>;

    expect(resolved.mode).toBe("frozen-version-snapshot");
    expect(resolved.didRecompute).toBe(false);
    expect(snapshot.netCashFlow).toBe(12_345);
    expect(snapshot.score).toBe(91);
    expect(snapshot.recommendation).toBe("Strong Buy");
  });

  it("fails closed instead of mixing current math into an incomplete frozen snapshot", () => {
    const { result, scoreExtras } = baseline();
    const resolved = resolveSavedAnalysisResult({
      methodologyVersion: "2.0",
      resultSnapshot: {
        methodologyVersion: "2.0",
        netCashFlow: 12_345,
      },
      recomputedResult: result,
      recomputedExtras: scoreExtras,
    });

    expect(resolved.mode).toBe("frozen-version-snapshot");
    expect(resolved.result).toBeNull();
  });

  it("keeps every same-version recorded field without merging current output", () => {
    const resolved = resolveSavedAnalysisSnapshot({
      methodologyVersion: "1.0",
      resultSnapshot: {
        netCashFlow: -1,
        dscr: -1,
        targetLabel: "Captured rules",
      },
      recomputedSnapshot: {
        netCashFlow: 400,
        dscr: 1.3,
      },
      currentMethodologyVersion: "1.0",
    });

    expect(resolved.snapshot).toEqual({
      netCashFlow: -1,
      dscr: -1,
      targetLabel: "Captured rules",
    });
    expect(resolved.mode).toBe("same-version-recorded-snapshot");
    expect(resolved.didRecompute).toBe(false);
  });

  it("does not drift a saved property age across a calendar-year boundary", () => {
    vi.setSystemTime(new Date("2026-12-31T23:59:59.000Z"));
    const { values, scoreExtras } = baseline();
    const recordedResult = calculateAnalysis(values);
    vi.setSystemTime(new Date("2027-01-01T12:00:01.000Z"));
    const newlyComputed = calculateAnalysis(values);
    expect(newlyComputed.propertyAge).toBe(recordedResult.propertyAge);
    expect(newlyComputed.analysisDate).toBe(recordedResult.analysisDate);

    const resolved = resolveSavedAnalysisResult({
      methodologyVersion: recordedResult.methodologyVersion,
      resultSnapshot: { ...recordedResult, ...scoreExtras },
      recomputedResult: newlyComputed,
      recomputedExtras: scoreExtras,
    });

    expect(resolved.result?.propertyAge).toBe(recordedResult.propertyAge);
    expect(resolved.didRecompute).toBe(false);
    vi.setSystemTime(FIXED_NOW);
  });

  it("characterizes Compare as a current-engine recomputation from form inputs", () => {
    const { values, result } = baseline();
    const expected = buildCompareSnapshotPayload(result, values).compareSnapshot;

    expect(recomputeCompareSnapshotFromForm(values)).toEqual(expected);
  });

  it("characterizes legacy /d links as input-only and methodology-unpinned", () => {
    const { values } = baseline();
    const decoded = decodeShareLink(
      encodeShareLink({
        v: 1,
        values,
        meta: { title: "Legacy shared analysis" },
      }),
    );

    expect(decoded?.v).toBe(1);
    expect(decoded?.values).toEqual(values);
    expect(decoded).not.toHaveProperty("methodologyVersion");
    expect(decoded).not.toHaveProperty("maoTarget");
  });
});
