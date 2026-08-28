import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("comparison neutrality guards", () => {
  const comparison = read("../../components/investcalc/compare-deals-client.tsx");
  const comparePage = read("../../app/dashboard/compare/page.tsx");
  const compareAction = read("../../app/actions/compare.ts");
  const evaluationAction = read("../../app/actions/product-evaluation.ts");
  const chart = read("../../components/dashboard/RiskReturn.tsx");
  const metrics = read("../compare-metrics.ts");
  const analyticsDictionary = read("../analytics-event-dictionary.ts");

  it("frames relative metric positions as modeled comparisons, not investment directives", () => {
    expect(comparison).toContain("Relative modeled comparison only");
    expect(comparison).toContain("does not establish safety or make an investment recommendation");
    expect(comparison).toContain("subtle row shading marks the highest or lowest displayed value");
    expect(comparison).toContain("Tied values share the same shading");
    expect(comparison).toContain("no hidden tie-breaker uses Screening Index, ROI, save date, or source order");

    expect(comparison).not.toMatch(/Most metric wins|Relative leader|Metric leader|Strongest DSCR|Comparison reference/);
    expect(comparison).not.toMatch(/Near-term score|Long-term score|lead count/);
    expect(comparison).not.toContain("Trophy");
    expect(comparison).not.toContain("{SIGNAL_LABELS[deal.signal]}");
    expect(comparison).not.toContain("getBadgeClasses(deal.signal)");
  });

  it("offers scale-aware review and makes assumption differences inspectable", () => {
    expect(comparison).toContain("Comparison scale");
    expect(comparison).toContain("As saved");
    expect(comparison).toContain("Per $100k purchase price");
    expect(comparison).toContain("normalizeComparisonValue");
    expect(comparison).toContain('aria-pressed={normalizationMode === mode}');
    expect(comparison).toContain("Saved assumptions differ");
    expect(comparison).toContain("Review assumption matrix");
    expect(comparison).toContain("scaling dollar values does not align the underlying assumptions");
    expect(comparison).toContain('role={hasDifferences ? "alert" : "note"}');
  });

  it("gates unreleased tax and exit surfaces and records one privacy-safe evaluation use", () => {
    expect(comparePage).toContain('isFeatureReleased("tax_strategy")');
    expect(comparePage).toContain('isFeatureReleased("exit_scenarios")');
    expect(comparePage).toContain("showTaxComparison={showTaxComparison}");
    expect(comparePage).toContain("showExitComparison={showExitComparison}");
    expect(comparison).toContain('row.subsection !== "FROM ILLUSTRATIVE TAX IMPACT"');
    expect(comparison).toContain('row.subsection !== "FROM EXIT SCENARIOS"');
    expect(compareAction).toContain("consumeProductEvaluationUsageAction");
    expect(compareAction).toContain('kind: "comparison"');
    expect(
      compareAction.indexOf(
        "const usageError = await consumeComparisonSelection(selectedIds)",
      ),
    ).toBeLessThan(
      compareAction.indexOf("await setCompareCookie(selectedIds)"),
    );
    expect(comparePage).toContain(
      "activeMeteredEvaluationComparisonGrantsAccess",
    );
    expect(comparePage).not.toContain("consumeProductEvaluationUsageAction");
    expect(evaluationAction).toContain("buildEvaluationComparisonResourceKey");
    expect(evaluationAction).toContain("wasNewUsage");
    expect(evaluationAction).toContain('event: "evaluation_comparison_used"');
    expect(analyticsDictionary).toContain(
      'evaluation_comparison_used: define("product", "account-aggregate", ["count_bucket"])',
    );
  });

  it("describes the chart axes without calling model DSCR a safety verdict or target", () => {
    expect(chart).toContain("Return vs model DSCR");
    expect(chart).toContain("Neither direction establishes safety or recommends a deal");
    expect(chart).toContain("Above both references");
    expect(chart).toContain("Below both references");
    expect(chart).toContain("fixed comparison references, not your adopted targets");
    expect(metrics).toContain('label: "Model DSCR"');

    expect(chart).not.toMatch(/safe \+ strong return|Target ✓|Higher risk|DSCR \(safer/);
  });

  it("makes extreme modeled returns a visible sensitivity warning, not an endorsement", () => {
    expect(comparison).toContain("Extreme modeled 10-year ROI");
    expect(comparison).toContain("highly sensitive to saved rent growth");
    expect(comparison).toContain("a higher projection is not a recommendation");
  });
});
