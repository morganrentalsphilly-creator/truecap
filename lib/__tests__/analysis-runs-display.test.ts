import { describe, expect, it } from "vitest";
import {
  ANALYSIS_RUNS_DISPLAY_BASELINE,
  withAnalysisRunsDisplayBaseline,
} from "@/lib/stats/analysis-runs-display";

describe("analysis runs display baseline", () => {
  it("adds the 50,000 historical floor to the live all-time count", () => {
    expect(ANALYSIS_RUNS_DISPLAY_BASELINE).toBe(50_000);
    expect(withAnalysisRunsDisplayBaseline(1_931)).toBe(51_931);
  });

  it("does not allow invalid counter values to become public proof", () => {
    expect(() => withAnalysisRunsDisplayBaseline(-1)).toThrow(RangeError);
    expect(() => withAnalysisRunsDisplayBaseline(Number.NaN)).toThrow(RangeError);
  });
});
