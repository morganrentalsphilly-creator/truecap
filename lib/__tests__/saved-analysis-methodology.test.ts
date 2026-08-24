import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import { defaultValues, type InvestmentFormValues } from "../investcalc-schema";
import {
  resolveSavedAnalysisResult,
  resolveSavedAnalysisSnapshot,
  shouldFreezeSavedMethodology,
} from "../saved-analysis-methodology";

function currentResult() {
  return calculateAnalysis({
    ...defaultValues,
    propertyType: "single-family",
    address: "123 Test St, Philadelphia, PA",
    purchasePrice: 250_000,
    monthlyRent: 2_500,
    units: [],
  } as InvestmentFormValues);
}

describe("saved-analysis methodology resolution", () => {
  it("uses current math when there is no stored snapshot", () => {
    const current = currentResult();
    const resolved = resolveSavedAnalysisResult({
      methodologyVersion: current.methodologyVersion,
      resultSnapshot: null,
      recomputedResult: current,
      recomputedExtras: {},
    });
    expect(resolved.mode).toBe("current-computation");
    expect(resolved.result).toEqual(current);
  });

  it("preserves a complete same-version recorded result without recomputing", () => {
    const current = currentResult();
    const recorded = {
      ...current,
      netCashFlow: -999_999,
      score: 77,
    };
    const resolved = resolveSavedAnalysisResult({
      methodologyVersion: current.methodologyVersion,
      resultSnapshot: recorded,
      recomputedResult: current,
      recomputedExtras: { score: 55 },
    });

    expect(resolved.mode).toBe("same-version-recorded-snapshot");
    expect(resolved.usesRecordedSnapshot).toBe(true);
    expect(resolved.didRecompute).toBe(false);
    expect(resolved.result?.netCashFlow).toBe(-999_999);
    expect((resolved.result as unknown as { score: number }).score).toBe(77);
  });

  it("labels unversioned snapshots as legacy recomputations", () => {
    const current = currentResult();
    const resolved = resolveSavedAnalysisResult({
      methodologyVersion: "legacy-unversioned",
      resultSnapshot: { methodologyVersion: "999", netCashFlow: -999_999 },
      recomputedResult: current,
      recomputedExtras: {},
    });
    expect(resolved.mode).toBe("legacy-recomputed");
    expect(resolved.usesRecordedSnapshot).toBe(false);
    expect(resolved.result?.netCashFlow).toBe(current.netCashFlow);
  });

  it("freezes fields from a different methodology version", () => {
    const current = currentResult();
    const frozen = {
      ...current,
      methodologyVersion: "2.0",
      netCashFlow: 321,
      score: 88,
      recommendation: "Strong Buy",
      riskLevel: "Low Risk",
      breakdown: {
        cashFlowScore: 22,
        cocScore: 17,
        capRateScore: 13,
        dscrScore: 17,
        totalReturnScore: 25,
        riskPenalty: -6,
      },
      explanation: "Frozen score explanation",
    };
    const resolved = resolveSavedAnalysisResult({
      methodologyVersion: "2.0",
      resultSnapshot: frozen,
      recomputedResult: current,
      recomputedExtras: {
        score: 1,
        recommendation: "Avoid",
        riskLevel: "High Risk",
        breakdown: {},
        explanation: "Current score explanation",
      },
    });

    expect(resolved.mode).toBe("frozen-version-snapshot");
    expect(resolved.storedMethodologyVersion).toBe("2.0");
    expect(resolved.result?.netCashFlow).toBe(321);
    expect((resolved.result as unknown as { score: number }).score).toBe(88);
    expect(shouldFreezeSavedMethodology("2.0", current.methodologyVersion)).toBe(true);
    expect(shouldFreezeSavedMethodology(current.methodologyVersion, current.methodologyVersion)).toBe(false);
  });

  it("freezes Deal Score and every stored financial field atomically", () => {
    const current = currentResult();
    const resolved = resolveSavedAnalysisSnapshot({
      methodologyVersion: "2.0",
      resultSnapshot: {
        methodologyVersion: "1.0",
        netCashFlow: 111,
        capRate: 2.2,
        cocReturn: 3.3,
        dscr: 4.4,
        score: 88,
        recommendation: "Strong Buy",
      },
      recomputedSnapshot: {
        ...current,
        score: 1,
        recommendation: "Avoid",
      },
    });

    expect(resolved.shouldFreeze).toBe(true);
    expect(resolved.usesRecordedSnapshot).toBe(true);
    expect(resolved.didRecompute).toBe(false);
    expect(resolved.snapshot).toMatchObject({
      netCashFlow: 111,
      capRate: 2.2,
      cocReturn: 3.3,
      dscr: 4.4,
      score: 88,
      recommendation: "Strong Buy",
    });
  });

  it("fails closed when a future-version snapshot cannot satisfy the current UI shape", () => {
    const current = currentResult();
    const resolved = resolveSavedAnalysisResult({
      methodologyVersion: "2.0",
      resultSnapshot: { methodologyVersion: "2.0", netCashFlow: 321 },
      recomputedResult: current,
      recomputedExtras: {},
    });
    expect(resolved.result).toBeNull();
    expect(resolved.shouldFreeze).toBe(true);
  });

  it("fails closed when a same-version recorded snapshot is incomplete", () => {
    const current = currentResult();
    const resolved = resolveSavedAnalysisResult({
      methodologyVersion: current.methodologyVersion,
      resultSnapshot: {
        methodologyVersion: current.methodologyVersion,
        netCashFlow: 321,
      },
      recomputedResult: current,
      recomputedExtras: {},
    });

    expect(resolved.mode).toBe("same-version-recorded-snapshot");
    expect(resolved.usesRecordedSnapshot).toBe(true);
    expect(resolved.result).toBeNull();
  });
});
