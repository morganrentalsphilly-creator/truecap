import { describe, expect, it } from "vitest";
import { measuredAnalysisRunsDisplayCount } from "@/lib/stats/analysis-runs-display";

describe("measured analysis runs display", () => {
  it("shows only the measured counter without a presentation baseline", () => {
    expect(measuredAnalysisRunsDisplayCount(1_931)).toBe(1_931);
    expect(measuredAnalysisRunsDisplayCount(1_931.9)).toBe(1_931);
  });

  it("does not allow invalid counter values to become public proof", () => {
    expect(() => measuredAnalysisRunsDisplayCount(-1)).toThrow(RangeError);
    expect(() => measuredAnalysisRunsDisplayCount(Number.NaN)).toThrow(RangeError);
  });
});
