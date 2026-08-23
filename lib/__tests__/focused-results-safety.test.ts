import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("focused decision safety", () => {
  it("never reveals the price-ceiling number without entitlement or sample preview", () => {
    const summary = readFileSync(
      join(root, "components/investcalc/focused-decision-summary.tsx"),
      "utf8"
    );
    const dashboard = readFileSync(
      join(root, "components/investcalc/analysis-dashboard.tsx"),
      "utf8"
    );
    expect(summary).toContain("canShowPriceCeiling");
    expect(summary).toContain('"Decision Pack or Pro"');
    expect(summary).toContain("meetsTarget(result, target)");
    expect(dashboard).toContain("canShowPriceCeiling={canUseMaxOffer}");
  });

  it("keeps the marketing tail hidden while assumptions are edited post-analysis", () => {
    const calculator = readFileSync(
      join(root, "components/investcalc/investcalc-page.tsx"),
      "utf8"
    );
    expect(calculator).toContain(
      "const postAnalysisMode = Boolean(analysisResult) && showResults && !isCalculating"
    );
    expect(calculator).toContain("setAdvancedOpen(true)");
  });
});
