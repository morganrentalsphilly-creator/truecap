/**
 * Durable identity for the calculator's analysis lens. Financial form values
 * are deliberately strategy-agnostic, so BRRRR/flip/wholesale cannot be
 * reconstructed reliably from numbers alone. Persist this small, validated
 * key beside drafts and recorded results; never infer an advanced strategy.
 */

export const ANALYZER_STRATEGY_KEYS = [
  "buy-hold",
  "house-hack",
  "brrrr",
  "wholesale-mao",
  "fix-flip",
  "short-term",
] as const;

export type AnalyzerStrategyKey = (typeof ANALYZER_STRATEGY_KEYS)[number];

export type AnalyzerStrategyCompatibilityValues = {
  propertyType?: unknown;
  avgDailyRate?: unknown;
  occupancyPct?: unknown;
};

export const DRAFT_ANALYZER_STRATEGY_FIELD = "__truecapAnalyzerStrategyKey";

export function normalizeAnalyzerStrategyKey(
  value: unknown,
): AnalyzerStrategyKey | null {
  return typeof value === "string" &&
    (ANALYZER_STRATEGY_KEYS as readonly string[]).includes(value)
    ? (value as AnalyzerStrategyKey)
    : null;
}

export function persistedAnalyzerStrategyKey(
  explicitValue: unknown,
  values?: { avgDailyRate?: unknown },
): AnalyzerStrategyKey {
  const explicit = normalizeAnalyzerStrategyKey(explicitValue);
  if (explicit) return explicit;
  // Safe legacy inference: a positive ADR changes the income formula, so the
  // STR editor must be restored. Other strategies share overlapping values
  // and must not be guessed.
  const adr = Number(values?.avgDailyRate);
  return Number.isFinite(adr) && adr > 0 ? "short-term" : "buy-hold";
}

function positiveFinite(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** True only when the recorded lens agrees with the inputs that determine
 * which core income formula runs. Specialist/wholesale lenses additionally
 * require the single-family property model they render and describe. */
export function isAnalyzerStrategyCompatible(
  key: AnalyzerStrategyKey,
  values: AnalyzerStrategyCompatibilityValues,
): boolean {
  const propertyType = values.propertyType;
  const hasShortTermIncome =
    propertyType === "single-family" &&
    positiveFinite(values.avgDailyRate) &&
    positiveFinite(values.occupancyPct);

  if (key === "short-term") return hasShortTermIncome;
  if (hasShortTermIncome) return false;
  if (key === "house-hack") return propertyType === "owner-occupant";
  if (key === "brrrr" || key === "fix-flip" || key === "wholesale-mao") {
    return propertyType === "single-family";
  }
  return key === "buy-hold";
}

/** Resolve an untrusted/stale key to the safest lens that matches the formula
 * the supplied values will actually run. Never infer an advanced strategy. */
export function resolveCompatibleAnalyzerStrategyKey(
  keyInput: unknown,
  values: AnalyzerStrategyCompatibilityValues,
): AnalyzerStrategyKey {
  const requested = normalizeAnalyzerStrategyKey(keyInput);
  if (requested && isAnalyzerStrategyCompatible(requested, values)) {
    return requested;
  }
  return isAnalyzerStrategyCompatible("short-term", values)
    ? "short-term"
    : "buy-hold";
}

/** Scenario labels can describe a starting point before every required model
 * input exists. Persist a specialist lens only when the cloned form can
 * support it; otherwise keep the general compatible lens until setup is
 * completed explicitly in the analyzer. */
export function resolveScenarioAnalyzerStrategyKey(input: {
  strategyKind: string | null;
  sourceResult: Record<string, unknown> | null;
  values: AnalyzerStrategyCompatibilityValues;
}): AnalyzerStrategyKey {
  let requested: unknown;
  switch (input.strategyKind) {
    case "brrrr":
      requested = "brrrr";
      break;
    case "flip":
      requested = "fix-flip";
      break;
    case "house_hack":
      requested = "house-hack";
      break;
    case "str":
      requested = "short-term";
      break;
    case "buy_hold":
    case "section_8":
    case "mtr":
      requested = "buy-hold";
      break;
    default:
      requested = input.sourceResult?.analyzerStrategyKey;
      break;
  }
  return resolveCompatibleAnalyzerStrategyKey(requested, input.values);
}

/** Resolve the strategy identity for an insert or update. Callers that do
 * not understand this newer option must preserve the owned row's recorded
 * identity instead of silently resetting an advanced analysis to Buy & Hold. */
export function resolveAnalyzerStrategyForPersistence(input: {
  requestedKey: unknown;
  requestedKeyProvided: boolean;
  existingResultSnapshot?: unknown;
  values?: { avgDailyRate?: unknown };
}): AnalyzerStrategyKey {
  let source = input.requestedKey;
  if (
    !input.requestedKeyProvided &&
    input.existingResultSnapshot &&
    typeof input.existingResultSnapshot === "object" &&
    !Array.isArray(input.existingResultSnapshot)
  ) {
    source = (input.existingResultSnapshot as Record<string, unknown>)
      .analyzerStrategyKey;
  }
  const persisted = persistedAnalyzerStrategyKey(source, input.values);
  return input.values && "propertyType" in input.values
    ? resolveCompatibleAnalyzerStrategyKey(persisted, input.values)
    : persisted;
}

/** Parent state uses null for the effective Buy & Hold default so restoring
 * it cannot reapply starter assumptions. */
export function activeStrategyStateKey(
  persisted: AnalyzerStrategyKey,
): Exclude<AnalyzerStrategyKey, "buy-hold"> | null {
  return persisted === "buy-hold" ? null : persisted;
}

export function readDraftAnalyzerStrategyKey(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  return (value as Record<string, unknown>)[DRAFT_ANALYZER_STRATEGY_FIELD];
}
