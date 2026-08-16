/**
 * Normalize the measured all-time run counter for public display.
 *
 * This intentionally returns only the stored measurement. Public proof must
 * never add a presentation baseline or otherwise imply analyses that were not
 * recorded by `app_counters.analysis_runs`.
 */
export function measuredAnalysisRunsDisplayCount(rawCount: number): number {
  if (!Number.isFinite(rawCount) || rawCount < 0) {
    throw new RangeError("Analysis run count must be a finite, non-negative number.");
  }

  return Math.floor(rawCount);
}
