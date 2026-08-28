import { afterEach, describe, expect, it, vi } from "vitest";

import {
  analysisDateForExplicitV1Run,
  analysisDateForNewRun,
  V1_LEGACY_ANALYSIS_DATE_FALLBACK,
} from "@/lib/analysis-date";
import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import {
  investmentFormSchema,
  normalizeInvestmentFormDraft,
  normalizeInvestmentFormSnapshot,
} from "@/lib/investcalc-schema";
import { UNDERWRITING_V1_GOLDEN_CORPUS } from "@/lib/__tests__/fixtures/underwriting-v1-golden-corpus";

function serializedBaseline(analysisDate?: string) {
  const fixture = UNDERWRITING_V1_GOLDEN_CORPUS.find(
    (entry) => entry.id === "financed_sfr_standard"
  );
  if (!fixture) throw new Error("Missing financed SFR golden fixture");
  return JSON.stringify({ ...fixture.values, ...(analysisDate ? { analysisDate } : {}) });
}

function calculateSerialized(serialized: string) {
  const values = JSON.parse(serialized);
  const result = calculateAnalysis(values);
  const score = computeDealScore(buildDealScoreInputFromAnalysis(values, result));
  return { result, score };
}

describe("v1 analysis-date determinism", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps identical explicit-date inputs and scores stable across calendar years", () => {
    const serialized = serializedBaseline("2026-12-31");

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T23:59:59.000Z"));
    const before = calculateSerialized(serialized);
    vi.setSystemTime(new Date("2032-01-01T00:00:01.000Z"));
    const after = calculateSerialized(serialized);

    expect(after).toEqual(before);
    expect(after.result.analysisDate).toBe("2026-12-31");
    expect(after.result.propertyAge).toBe(21);
    expect(after.score.scoreMethodologyVersion).toBe("1.3");
  });

  it("anchors legacy/direct calls with no date instead of reading the wall clock", () => {
    const serialized = serializedBaseline();

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const before = calculateSerialized(serialized);
    vi.setSystemTime(new Date("2040-12-31T23:59:59.000Z"));
    const after = calculateSerialized(serialized);

    expect(after).toEqual(before);
    expect(after.result.analysisDate).toBe(V1_LEGACY_ANALYSIS_DATE_FALLBACK);
    expect(after.result.propertyAge).toBe(21);
  });

  it("uses a changed explicit date—not system time—to advance property age", () => {
    const original = calculateSerialized(serializedBaseline("2026-08-25"));
    const reunderwritten = calculateSerialized(serializedBaseline("2027-08-25"));

    expect(reunderwritten.result.propertyAge).toBe(original.result.propertyAge + 1);
  });

  it("keeps v1 Year Built validation anchored to the serialized as-of date", () => {
    const valid = JSON.parse(serializedBaseline("2026-08-25"));
    valid.yearBuilt = 2031;
    const invalid = { ...valid, yearBuilt: 2032 };

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T12:00:00.000Z"));
    const validBefore = investmentFormSchema.safeParse(valid);
    const invalidBefore = investmentFormSchema.safeParse(invalid);
    vi.setSystemTime(new Date("2040-08-25T12:00:00.000Z"));
    const validAfter = investmentFormSchema.safeParse(valid);
    const invalidAfter = investmentFormSchema.safeParse(invalid);

    expect(validBefore.success).toBe(true);
    expect(validAfter.success).toBe(true);
    expect(invalidBefore.success).toBe(false);
    expect(invalidAfter.success).toBe(false);
  });

  it("preserves the explicit date through strict saved snapshots and lenient drafts", () => {
    const saved = JSON.parse(serializedBaseline("2026-08-25"));
    expect(normalizeInvestmentFormSnapshot(saved)?.analysisDate).toBe("2026-08-25");

    const draft = normalizeInvestmentFormDraft({
      underwritingModelVersion: "1.0",
      propertyType: "single-family",
      address: "In-progress draft",
      analysisDate: "2026-08-25",
    });
    expect(draft?.analysisDate).toBe("2026-08-25");
  });

  it("stamps new runs in UTC with a deterministic invalid-clock fallback", () => {
    expect(analysisDateForNewRun(new Date("2027-01-01T00:30:00.000Z"))).toBe(
      "2027-01-01"
    );
    expect(analysisDateForNewRun(new Date(Number.NaN))).toBe(
      V1_LEGACY_ANALYSIS_DATE_FALLBACK
    );
  });

  it("preserves an explicit synthetic-fixture date without preserving ordinary stale dates", () => {
    const futureRun = new Date("2032-01-01T00:30:00.000Z");

    expect(
      analysisDateForExplicitV1Run({
        existingAnalysisDate: "2026-08-25",
        preserveExisting: true,
        now: futureRun,
      })
    ).toBe("2026-08-25");
    expect(
      analysisDateForExplicitV1Run({
        existingAnalysisDate: "2026-08-25",
        preserveExisting: false,
        now: futureRun,
      })
    ).toBe("2032-01-01");
  });
});
