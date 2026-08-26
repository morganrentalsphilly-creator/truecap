/** Initial token assigned to existing and newly inserted saved analyses. */
export const INITIAL_SAVED_ANALYSIS_REVISION = 1;

/**
 * Postgres bigint values can arrive from PostgREST as a number or decimal
 * string. Only positive safe integers are usable as browser concurrency
 * tokens; anything else fails closed instead of weakening the write guard.
 */
export function parseSavedAnalysisRevision(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const revision = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(revision) && revision >= INITIAL_SAVED_ANALYSIS_REVISION
    ? revision
    : null;
}
