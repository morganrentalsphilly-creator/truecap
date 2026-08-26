import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

describe("canonical first-year results hierarchy", () => {
  it("keeps the primary numbers fixed on first-year economics", () => {
    const metrics = read("components/investcalc/metrics-band.tsx");

    expect(metrics).toContain(
      'const CORE_METRIC_KEYS = ["cashFlow", "capRate", "dscr"] as const;'
    );
    expect(metrics).not.toContain("DealStrategyToggle");
    expect(metrics).not.toContain("buildReturnMemberTiles");
    expect(metrics).not.toContain("Show me first");
  });

  it("uses factual metric context instead of investment or lender directives", () => {
    const metrics = read("components/investcalc/metrics-band.tsx");

    expect(metrics).toContain('label={sourcedLabel("Model DSCR", "scenario")}');
    expect(metrics).toContain("Positive before tax and after reserve");
    expect(metrics).toContain("At or above the 1.25 reference");
    expect(metrics).not.toMatch(/Bankable|Underwater|Strong \(≥|\bhealthy\b|\bweak\b|fair for market/i);
  });

  it("does not let a stored persona lens reorder or narrate the core result", () => {
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");

    expect(dashboard).not.toContain("StrategyLensOutcomeCard");
    expect(dashboard).not.toContain("DEAL_STRATEGY_STORAGE_KEY");
    expect(dashboard).not.toContain("pickStrategy");
  });

  it("renders assumption sensitivity once in the decision-first result", () => {
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");

    expect(dashboard.match(/<AssumptionImpactCard/g)).toHaveLength(1);
  });

  it("keeps save, share, compare, and repeat analysis in the focused result", () => {
    const summary = read("components/investcalc/focused-decision-summary.tsx");
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");

    expect(summary).toContain("Analyze another like this");
    expect(summary).toContain("New analysis");
    expect(summary).toContain("Compare deals");
    expect(summary).toContain("onCompareDeals");
    expect(dashboard).toContain("onAnalyzeAnotherLikeThis={onAnalyzeAnotherLikeThis}");
    expect(dashboard).toContain("onNewAnalysis={onNewAnalysis}");
    expect(dashboard).toContain("onCompareDeals={onCompareDeals}");
  });

  it("puts the complete first-year investment snapshot above secondary actions", () => {
    const summary = read("components/investcalc/focused-decision-summary.tsx");

    expect(summary).toContain("Cash needed");
    expect(summary).toContain("Annual NOI");
    expect(summary).toContain("Cap rate");
    expect(summary).toContain("Cash-on-cash");
    expect(summary).toContain("More actions");
    expect(summary.indexOf("Cash needed")).toBeLessThan(summary.indexOf("More actions"));
  });

  it("gives free users an actionable, honestly gated target-price path", () => {
    const summary = read("components/investcalc/focused-decision-summary.tsx");

    expect(summary).toContain("Unlock target price");
    expect(summary).toContain("onUpgrade");
    expect(summary).not.toContain('disabled>Set targets first</');
  });
});
