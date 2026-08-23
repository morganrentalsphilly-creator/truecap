import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ANALYSIS_RUNS_DISPLAY_FLOOR,
  withAnalysisRunsDisplayBaseline,
} from "@/lib/stats/analysis-runs-display";

const tickerSource = readFileSync(
  fileURLToPath(
    new URL("../../components/marketing/deals-analyzed-ticker.tsx", import.meta.url)
  ),
  "utf8"
);

describe("analysis runs display baseline", () => {
  it("applies a 51,900 minimum display floor", () => {
    expect(ANALYSIS_RUNS_DISPLAY_FLOOR).toBe(51_900);
    expect(withAnalysisRunsDisplayBaseline(0)).toBe(51_900);
    expect(withAnalysisRunsDisplayBaseline(1_931)).toBe(51_900);
    expect(withAnalysisRunsDisplayBaseline(1_931.9)).toBe(51_900);
    expect(withAnalysisRunsDisplayBaseline(60_000)).toBe(60_000);
  });

  it("does not allow invalid counter values to become public proof", () => {
    expect(() => withAnalysisRunsDisplayBaseline(-1)).toThrow(RangeError);
    expect(() => withAnalysisRunsDisplayBaseline(Number.NaN)).toThrow(RangeError);
  });

  it("renders the number bare, with the floor applied through the shared helper", () => {
    // The ticker shows only the number + suffix, with no composition
    // disclosure in visible text, a tooltip, or the aria-label.
    expect(tickerSource).toContain("withAnalysisRunsDisplayBaseline(rawCount ?? 0)");
    expect(tickerSource).not.toContain("(50,000 historical + live measured)");
    expect(tickerSource).not.toContain("Includes 50,000 historical");
    expect(tickerSource).not.toContain("title={");
  });

  it("does not call saved-analysis rows unique deals", () => {
    expect(tickerSource).toContain("analyses saved this week");
    expect(tickerSource).not.toContain("deals analyzed this week");
  });
});
