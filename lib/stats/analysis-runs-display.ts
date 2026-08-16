/**
 * Owner-attested historical analysis runs recorded before the live
 * `app_counters.analysis_runs` counter was introduced.
 *
 * This is presentation-only: the database remains the measured live counter,
 * and rolling saved-deal counts never receive this baseline.
 */
export const ANALYSIS_RUNS_DISPLAY_BASELINE = 50_000;

export function withAnalysisRunsDisplayBaseline(rawCount: number): number {
  if (!Number.isFinite(rawCount) || rawCount < 0) {
    throw new RangeError("Analysis run count must be a finite, non-negative number.");
  }

  return ANALYSIS_RUNS_DISPLAY_BASELINE + Math.floor(rawCount);
}
