import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ANALYSIS_RUNS_DISPLAY_BASELINE,
  withAnalysisRunsDisplayBaseline,
} from "@/lib/stats/analysis-runs-display";

const tickerSource = readFileSync(
  fileURLToPath(
    new URL("../../components/marketing/deals-analyzed-ticker.tsx", import.meta.url)
  ),
  "utf8"
);

describe("analysis runs historical display baseline", () => {
  it("always adds the owner-attested 50,000 historical runs", () => {
    expect(ANALYSIS_RUNS_DISPLAY_BASELINE).toBe(50_000);
    expect(withAnalysisRunsDisplayBaseline(0)).toBe(50_000);
    expect(withAnalysisRunsDisplayBaseline(1_931)).toBe(51_931);
    expect(withAnalysisRunsDisplayBaseline(1_931.9)).toBe(51_931);
  });

  it("does not allow invalid counter values to become public proof", () => {
    expect(() => withAnalysisRunsDisplayBaseline(-1)).toThrow(RangeError);
    expect(() => withAnalysisRunsDisplayBaseline(Number.NaN)).toThrow(RangeError);
  });

  it("renders the number bare, with the baseline applied through the shared helper", () => {
    // Founder decision 2026-08-17: the ticker shows ONLY the number +
    // suffix — no composition disclosure visible, in the tooltip, or in the
    // aria-label. The baseline itself must still flow through the shared
    // helper (never hand-added), and the internal accounting rule stays:
    // real measured usage = displayed − 50,000.
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
