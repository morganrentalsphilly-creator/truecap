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
  | "same-version-recomputed"
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
  /** True when current math (including Deal Score) won the merge. */
  didRecompute: boolean;
};

export type SavedAnalysisResultResolution = Omit<
  SavedAnalysisSnapshotResolution,
  "snapshot"
> & {
  /** Null means a version-mismatched frozen snapshot was incomplete. The
   * caller must fail closed instead of filling missing outputs with new math. */
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
 * - Current and explicitly legacy rows may be recomputed. The recomputed
 *   object wins every overlapping field, including Deal Score.
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
      didRecompute: false,
    };
  }

  const isLegacy = isLegacySavedMethodologyVersion(storedMethodologyVersion);
  if (!recomputedSnapshot) {
    return {
      snapshot: frozenSnapshot,
      mode: isLegacy ? "legacy-stored-fallback" : "same-version-stored-fallback",
      storedMethodologyVersion,
      currentMethodologyVersion,
      shouldFreeze: false,
      didRecompute: false,
    };
  }

  return {
    // Snapshot-only metadata survives. Every result/score field emitted by the
    // current contract wins, preventing a mixed old-score/new-financial view.
    snapshot: { ...frozenSnapshot, ...recomputedSnapshot },
    mode:
      Object.keys(frozenSnapshot).length === 0
        ? "current-computation"
        : isLegacy
          ? "legacy-recomputed"
          : "same-version-recomputed",
    storedMethodologyVersion,
    currentMethodologyVersion,
    shouldFreeze: false,
    didRecompute: true,
  };
}

/**
 * AnalysisResult-shaped adapter for the analyzer and PDF surfaces. A frozen
 * version must contain every field the current UI expects; otherwise return
 * null rather than quietly backfilling missing financial outputs with current
 * arithmetic.
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

  if (resolved.shouldFreeze) {
    // Compare against the current result's complete enumerable shape. This is
    // a compatibility check only; none of its VALUES flow into the output.
    // Score metadata is part of the same atomic methodology contract, so a
    // future snapshot missing any requested score field also fails closed.
    const requiredKeys = new Set([
      ...Object.keys(input.recomputedResult),
      ...Object.keys(input.recomputedExtras),
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

  return {
    score,
    recommendation: recommendation as DealRecommendation,
    riskLevel: riskLevel as DealRiskLevel,
    breakdown,
    explanation:
      typeof snapshot.explanation === "string" && snapshot.explanation.trim()
        ? snapshot.explanation
        : "This score is preserved from the saved underwriting standard.",
  };
}
