/**
 * Public display floor for the all-time analysis counter.
 *
 * The live `app_counters.analysis_runs` value is shown when it exceeds this
 * floor; otherwise the counter renders the consistent 51,900 minimum.
 */
export const ANALYSIS_RUNS_DISPLAY_FLOOR = 51_900;

export function withAnalysisRunsDisplayBaseline(rawCount: number): number {
  if (!Number.isFinite(rawCount) || rawCount < 0) {
    throw new RangeError("Analysis run count must be a finite, non-negative number.");
  }

  const runCount = Math.floor(rawCount);
  return Math.max(runCount, ANALYSIS_RUNS_DISPLAY_FLOOR);
}
