import type { AnalysisResult } from "@/lib/calc-analysis";
import type {
  DealRecommendation,
  DealRiskLevel,
  DealScoreBreakdown,
  DealScoreResult,
} from "@/lib/deal-score";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";

export const LEGACY_UNVERSIONED_METHODOLOGY = "legacy-unversioned" as const;

export type SavedAnalysisResolutionMode =
  | "current-computation"
  | "legacy-recomputed"
  | "legacy-stored-fallback"
  | "same-version-recorded-snapshot"
  | "same-version-stored-fallback"
  | "frozen-version-snapshot";

export type SavedAnalysisSnapshotResolution = {
  /** The one canonical value every saved-deal surface must read. */
  snapshot: Record<string, unknown>;
  mode: SavedAnalysisResolutionMode;
  /** Authoritative value from saved_analyses.methodology_version. */
  storedMethodologyVersion: string | null;
  currentMethodologyVersion: string;
  /** True only for a non-legacy version different from the running standard. */
  shouldFreeze: boolean;
  /** True when the displayed financial result comes from the immutable
   * result_snapshot captured when the analysis was saved. This is broader
   * than shouldFreeze: same-version history must remain reproducible too. */
  usesRecordedSnapshot: boolean;
  /** True when current math (including Deal Score) won the merge. */
  didRecompute: boolean;
};

export type SavedAnalysisResultResolution = Omit<
  SavedAnalysisSnapshotResolution,
  "snapshot"
> & {
  /** Null means a recorded snapshot was incomplete. The caller must fail
   * closed instead of filling missing historical outputs with new math. */
  result: AnalysisResult | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function normalizeSavedMethodologyVersion(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function isLegacySavedMethodologyVersion(value: unknown): boolean {
  const normalized = normalizeSavedMethodologyVersion(value);
  return normalized === null || normalized === LEGACY_UNVERSIONED_METHODOLOGY;
}

export function shouldFreezeSavedMethodology(
  storedMethodologyVersion: unknown,
  currentMethodologyVersion: string = TRUECAP_UNDERWRITING_STANDARD_VERSION
): boolean {
  const stored = normalizeSavedMethodologyVersion(storedMethodologyVersion);
  return Boolean(
    stored &&
      stored !== LEGACY_UNVERSIONED_METHODOLOGY &&
      stored !== currentMethodologyVersion
  );
}

/**
 * Canonical saved-analysis resolver.
 *
 * `saved_analyses.methodology_version` is authoritative. The similarly named
 * value inside result_snapshot is deliberately ignored for version routing:
 * JSON is a payload, while the top-level column is the database contract that
 * migrations and release audits can query reliably.
 *
 * - A same-version saved snapshot is historical evidence. It is returned
 *   field-for-field rather than being silently recalculated by a newer
 *   deployment that happens to carry the same public version string.
 * - Explicitly legacy rows retain their compatibility recompute. They were
 *   never pinned to a formula contract, so the UI labels that recomputation.
 * - Any other version is frozen. The stored snapshot is returned field-for-
 *   field; current math is never used as a fill-in.
 * - When current math cannot be produced, the stored snapshot remains a
 *   graceful fallback and the mode says so honestly.
 */
export function resolveSavedAnalysisSnapshot(input: {
  methodologyVersion: unknown;
  resultSnapshot: unknown;
  recomputedSnapshot?: unknown;
  currentMethodologyVersion?: string;
}): SavedAnalysisSnapshotResolution {
  const storedMethodologyVersion = normalizeSavedMethodologyVersion(
    input.methodologyVersion
  );
  const currentMethodologyVersion =
    input.currentMethodologyVersion ?? TRUECAP_UNDERWRITING_STANDARD_VERSION;
  const frozenSnapshot = asRecord(input.resultSnapshot) ?? {};
  const recomputedSnapshot = asRecord(input.recomputedSnapshot);
  const shouldFreeze = shouldFreezeSavedMethodology(
    storedMethodologyVersion,
    currentMethodologyVersion
  );

  if (shouldFreeze) {
    return {
      snapshot: frozenSnapshot,
      mode: "frozen-version-snapshot",
      storedMethodologyVersion,
      currentMethodologyVersion,
      shouldFreeze: true,
      usesRecordedSnapshot: true,
      didRecompute: false,
    };
  }

  const isLegacy = isLegacySavedMethodologyVersion(storedMethodologyVersion);
  if (!isLegacy && Object.keys(frozenSnapshot).length > 0) {
    return {
      snapshot: frozenSnapshot,
      mode: "same-version-recorded-snapshot",
      storedMethodologyVersion,
      currentMethodologyVersion,
      shouldFreeze: false,
      usesRecordedSnapshot: true,
      didRecompute: false,
    };
  }

  if (!recomputedSnapshot) {
    return {
      snapshot: frozenSnapshot,
      mode: isLegacy ? "legacy-stored-fallback" : "same-version-stored-fallback",
      storedMethodologyVersion,
      currentMethodologyVersion,
      shouldFreeze: false,
      usesRecordedSnapshot: Object.keys(frozenSnapshot).length > 0,
      didRecompute: false,
    };
  }

  return {
    // Snapshot-only metadata survives. Every result/score field emitted by the
    // current contract wins, preventing a mixed old-score/new-financial view.
    snapshot: { ...frozenSnapshot, ...recomputedSnapshot },
    mode: isLegacy ? "legacy-recomputed" : "current-computation",
    storedMethodologyVersion,
    currentMethodologyVersion,
    shouldFreeze: false,
    usesRecordedSnapshot: false,
    didRecompute: true,
  };
}

/**
 * AnalysisResult-shaped adapter for analyzer and PDF surfaces. Any recorded
 * result must contain every field the current UI expects; otherwise return
 * null rather than quietly backfilling historical outputs with current math.
 */
export function resolveSavedAnalysisResult(input: {
  methodologyVersion: unknown;
  resultSnapshot: unknown;
  recomputedResult: AnalysisResult;
  /** Deal Score and other versioned result metadata that must switch in the
   * same atomic merge as the financial outputs. */
  recomputedExtras: Record<string, unknown>;
}): SavedAnalysisResultResolution {
  const resolved = resolveSavedAnalysisSnapshot({
    methodologyVersion: input.methodologyVersion,
    resultSnapshot: input.resultSnapshot,
    recomputedSnapshot: {
      ...input.recomputedResult,
      ...input.recomputedExtras,
    },
    currentMethodologyVersion: input.recomputedResult.methodologyVersion,
  });

  if (resolved.usesRecordedSnapshot) {
    // Compare against the current result's complete enumerable shape. This is
    // a compatibility check only; none of its VALUES flow into the output.
    // Score metadata is part of the same atomic methodology contract, so a
    // recorded snapshot missing any requested score field also fails closed.
    // The projection sub-version was introduced after recorded v1.0 snapshots
    // already existed. Its absence means "recorded-unversioned" provenance,
    // not an incomplete financial result; the embedded projection rows remain
    // immutable and are never filled from current math.
    const backwardCompatibleOptionalResultKeys = new Set([
      // Persisted before the deterministic Property Age correction. Absence
      // means the result used the legacy, unrecorded calendar convention; it
      // must not make an otherwise complete historical result unreadable and
      // must never be filled with today's date.
      "analysisDate",
      "tenYearProjectionVersion",
    ]);
    // A key whose CURRENT value is `undefined` can never appear in a persisted
    // snapshot: result rows are stored as jsonb, and JSON.stringify drops
    // undefined-valued keys on the way in. Requiring such a key is therefore
    // not a compatibility check, it is an impossible condition — every saved
    // deal fails it and reopens as a blank form with the assumptions restored
    // and no decision.
    //
    // This is exactly what happened when the renovation/valuation result
    // fields landed: `operatingScenario: "current"` (what resetToNewAnalysis
    // sets on every new analysis) leaves rentBasis, renovationStartMonth,
    // renovationDurationMonths, renovationRentLossPct, currentPropertyValue,
    // stabilizedPropertyValue and balloonMonth undefined, so no deal saved in
    // that scenario could be reopened at all.
    //
    // Skipping them does NOT weaken the check: a key carrying a real value is
    // still required, and this closes the whole class rather than allow-listing
    // seven names that the next optional field would reopen.
    const isPersistableKey = (bag: Record<string, unknown>, key: string) =>
      bag[key] !== undefined;
    const recomputedBag = input.recomputedResult as unknown as Record<
      string,
      unknown
    >;
    const requiredKeys = new Set([
      ...Object.keys(input.recomputedResult).filter(
        (key) =>
          !backwardCompatibleOptionalResultKeys.has(key) &&
          isPersistableKey(recomputedBag, key)
      ),
      ...Object.keys(input.recomputedExtras).filter((key) =>
        isPersistableKey(input.recomputedExtras, key)
      ),
    ]);
    const expectsDealScore = [
      "score",
      "recommendation",
      "riskLevel",
      "breakdown",
      "explanation",
    ].every((key) => Object.prototype.hasOwnProperty.call(input.recomputedExtras, key));
    const isComplete =
      [...requiredKeys].every((key) =>
        Object.prototype.hasOwnProperty.call(resolved.snapshot, key)
      ) && (!expectsDealScore || parseFrozenDealScore(resolved.snapshot) !== null);
    return {
      ...resolved,
      result: isComplete ? (resolved.snapshot as unknown as AnalysisResult) : null,
    };
  }

  return {
    ...resolved,
    result: resolved.snapshot as unknown as AnalysisResult,
  };
}

const SAVED_RECOMMENDATIONS: readonly DealRecommendation[] = [
  "Strong Buy",
  "Buy",
  "Neutral",
  "Risky",
  "Avoid",
];
const SAVED_RISK_LEVELS: readonly DealRiskLevel[] = [
  "Low Risk",
  "Medium Risk",
  "High Risk",
  "Moderate",
  "Balanced",
  "Low Return",
];
const BREAKDOWN_KEYS: readonly (keyof DealScoreBreakdown)[] = [
  "cashFlowScore",
  "cocScore",
  "capRateScore",
  "dscrScore",
  "totalReturnScore",
  "riskPenalty",
];

/** Strictly recover the saved Deal Score contract without invoking the score
 * engine. Used only for a frozen future version; missing detail fails closed. */
export function parseFrozenDealScore(snapshotInput: unknown): DealScoreResult | null {
  const snapshot = asRecord(snapshotInput);
  const breakdownRecord = asRecord(snapshot?.breakdown);
  const score = snapshot?.score;
  const recommendation = snapshot?.recommendation;
  const riskLevel = snapshot?.riskLevel;
  if (
    !snapshot ||
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    !SAVED_RECOMMENDATIONS.includes(recommendation as DealRecommendation) ||
    !SAVED_RISK_LEVELS.includes(riskLevel as DealRiskLevel) ||
    !breakdownRecord
  ) {
    return null;
  }

  const breakdown = {} as DealScoreBreakdown;
  for (const key of BREAKDOWN_KEYS) {
    const value = breakdownRecord[key];
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    breakdown[key] = value;
  }
  const applicabilityAdjustment = breakdownRecord.applicabilityAdjustment;
  if (applicabilityAdjustment != null) {
    if (
      typeof applicabilityAdjustment !== "number" ||
      !Number.isFinite(applicabilityAdjustment)
    ) {
      return null;
    }
    breakdown.applicabilityAdjustment = applicabilityAdjustment;
  }

  return {
    scoreMethodologyVersion:
      typeof snapshot.scoreMethodologyVersion === "string" &&
      snapshot.scoreMethodologyVersion.trim()
        ? snapshot.scoreMethodologyVersion
        : "recorded-unversioned",
    score,
    recommendation: recommendation as DealRecommendation,
    riskLevel: riskLevel as DealRiskLevel,
    breakdown,
    explanation:
      typeof snapshot.explanation === "string" && snapshot.explanation.trim()
        ? snapshot.explanation
        : "This score is preserved from the saved underwriting standard.",
    ...(breakdown.applicabilityAdjustment != null
      ? { cashOnCashApplicable: false as const }
      : {}),
  };
}
