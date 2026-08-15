/**
 * Historical display floor for the public all-time analysis counter.
 *
 * Product decision (Morgan, 2026-08-15): the public counter starts at 50,000
 * and continues climbing with the live `app_counters.analysis_runs` value.
 * This is presentation-only: the stored counter is never mutated, and saved
 * deal / rolling-window counters never receive this baseline.
 */
export const ANALYSIS_RUNS_DISPLAY_BASELINE = 50_000;

export function withAnalysisRunsDisplayBaseline(rawCount: number): number {
  if (!Number.isFinite(rawCount) || rawCount < 0) {
    throw new RangeError("Analysis run count must be a finite, non-negative number.");
  }

  return Math.floor(rawCount) + ANALYSIS_RUNS_DISPLAY_BASELINE;
}
