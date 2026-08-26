/**
 * Calendar anchor for the released v1 screening model.
 *
 * Historical v1 payloads did not store an analysis date. Using the process
 * clock for those payloads made Property Age (and therefore the Screening
 * Index) change every January even though the serialized underwriting had not
 * changed. Keep their compatibility behavior anchored to the date this
 * deterministic correction shipped. New interactive runs persist their real
 * UTC date before calculation instead (see InvestCalcPage).
 */
export const V1_LEGACY_ANALYSIS_DATE_FALLBACK = "2026-08-25" as const;

const ANALYSIS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidAnalysisDate(value: unknown): value is string {
  if (typeof value !== "string" || !ANALYSIS_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/** Resolve a v1 engine input without ever consulting the wall clock. */
export function resolveV1AnalysisDate(value: unknown): string {
  return isValidAnalysisDate(value)
    ? value
    : V1_LEGACY_ANALYSIS_DATE_FALLBACK;
}

/** UTC date stamped when a user explicitly re-underwrites a v1 analysis. */
export function analysisDateForNewRun(now: Date = new Date()): string {
  if (!Number.isFinite(now.getTime())) return V1_LEGACY_ANALYSIS_DATE_FALLBACK;
  return now.toISOString().slice(0, 10);
}

/**
 * Resolve the audit date for an explicit v1 run.
 *
 * Real-property re-underwrites always receive today's UTC date. The one
 * exception is a versioned synthetic fixture: preserving its explicit date is
 * what makes the homepage preview and the opened demo the same analysis in a
 * future calendar year. Callers must opt into that exception deliberately.
 */
export function analysisDateForExplicitV1Run(input: {
  existingAnalysisDate?: unknown;
  preserveExisting?: boolean;
  now?: Date;
}): string {
  if (
    input.preserveExisting === true &&
    isValidAnalysisDate(input.existingAnalysisDate)
  ) {
    return input.existingAnalysisDate;
  }
  return analysisDateForNewRun(input.now);
}
