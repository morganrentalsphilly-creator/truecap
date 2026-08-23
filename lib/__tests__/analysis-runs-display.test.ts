import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  toPublicAnalysisRunCount,
} from "@/lib/stats/analysis-runs-display";

const tickerSource = readFileSync(
  fileURLToPath(
    new URL("../../components/marketing/deals-analyzed-ticker.tsx", import.meta.url)
  ),
  "utf8"
);
const counterSource = readFileSync(
  fileURLToPath(new URL("../stats/total-analyses-run.ts", import.meta.url)),
  "utf8"
);
const reviewsSource = readFileSync(
  fileURLToPath(new URL("../../app/reviews/page.tsx", import.meta.url)),
  "utf8"
);

describe("analysis runs display baseline", () => {
  it("publishes only the raw persisted cumulative count", () => {
    expect(toPublicAnalysisRunCount(0)).toBe(0);
    expect(toPublicAnalysisRunCount(1_931)).toBe(1_931);
    expect(toPublicAnalysisRunCount(1_931.9)).toBe(1_931);
    expect(toPublicAnalysisRunCount(60_000)).toBe(60_000);
  });

  it("does not allow invalid counter values to become public proof", () => {
    expect(() => toPublicAnalysisRunCount(-1)).toThrow(RangeError);
    expect(() => toPublicAnalysisRunCount(Number.NaN)).toThrow(RangeError);
  });

  it("fails closed instead of substituting a display-only floor", () => {
    expect(tickerSource).toContain("if (rawCount == null) return null");
    expect(tickerSource).toContain("toPublicAnalysisRunCount(rawCount)");
    expect(tickerSource).not.toMatch(/display floor|rawCount \?\? 0/i);
    expect(counterSource).toContain("migration 20260823160000");
    expect(reviewsSource).not.toMatch(/50,000 historical|historical analyses attested/i);
  });

  it("does not call saved-analysis rows unique deals", () => {
    expect(tickerSource).toContain("analyses saved this week");
    expect(tickerSource).not.toContain("deals analyzed this week");
  });
});
