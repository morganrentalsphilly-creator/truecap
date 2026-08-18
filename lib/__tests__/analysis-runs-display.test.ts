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

  it("discloses what the baseline and live count represent", () => {
    // Founder decision 2026-08-17: the visible parenthetical suffix was
    // removed — the pill shows the number alone. The composition disclosure
    // must still ship in the tooltip (title) and aria-label so the
    // attestation stays one hover/screen-reader step away.
    expect(tickerSource).not.toContain("(50,000 historical + live measured)");
    expect(tickerSource).toContain("withAnalysisRunsDisplayBaseline(rawCount ?? 0)");
    expect(tickerSource).toContain("historical analysis runs attested by TrueCap");
    expect(tickerSource).toContain("Includes 50,000 historical analysis runs");
    expect(tickerSource).toContain("not a unique property, user, report, purchase, or transaction");
  });

  it("does not call saved-analysis rows unique deals", () => {
    expect(tickerSource).toContain("analyses saved this week");
    expect(tickerSource).not.toContain("deals analyzed this week");
  });
});
