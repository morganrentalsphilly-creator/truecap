import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function sourceSection(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  expect(startIndex, `missing source marker: ${start}`).toBeGreaterThanOrEqual(0);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(endIndex, `missing source marker: ${end}`).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("specialist result hierarchy", () => {
  const dashboard = read("components/investcalc/analysis-dashboard.tsx");
  const specialistCard = read(
    "components/investcalc/strategy-outcome-card.tsx",
  );

  it("uses the strategy outcome as the only primary hero for specialist strategies", () => {
    expect(dashboard.match(/<FocusedDecisionSummary/g)).toHaveLength(1);
    expect(dashboard.match(/<StrategyOutcomeCard/g)).toHaveLength(1);
    expect(dashboard).toMatch(
      /\) : decisionFirst &&\s*!strategyLeadsOutput &&\s*result &&\s*values &&\s*activeMaoTarget \? \(/,
    );
    expect(dashboard).toContain(
      "{strategyLeadsOutput ? (\n        targetActionsBlocked ? null : activeStrategy && values ? (\n          <StrategyOutcomeCard",
    );
  });

  it("keeps all daily result actions reachable below the specialist hero", () => {
    const actions = sourceSection(
      dashboard,
      "The focused decision summary owns these actions for the default",
      '"What decides this deal"',
    );

    expect(actions).toContain("!decisionFirst || strategyLeadsOutput");
    expect(actions).toContain("handleSaveClick");
    expect(actions).toContain("<ShareLinkButton");
    expect(actions).toContain("handleExportPdf");
    expect(actions).toContain("onCompareDeals");
    expect(actions).toContain("onAnalyzeAnotherLikeThis");
    expect(actions).toContain("onNewAnalysis");
  });

  it("keeps first-year metrics available as secondary disclosure", () => {
    expect(dashboard).not.toContain(
      'cn("space-y-3", strategyLeadsOutput && "hidden")',
    );
    expect(dashboard).toContain(
      '<ResultsRegionOrFragment\n        enabled={decisionFirst}\n        id="the-numbers"',
    );
    expect(dashboard).toContain('<div className="space-y-3">');
  });

  it("routes Wholesale criteria review to the authoritative analyzer editor", () => {
    expect(dashboard).toContain("onReviewCriteria={() => {");
    expect(dashboard).toContain("onEditAssumptions();");
    expect(dashboard).toContain('document.getElementById("decision-criteria")');
    expect(specialistCard).toContain("onReviewCriteria?: () => void;");
    expect(specialistCard).toContain("if (onReviewCriteria) {");
    expect(specialistCard).toContain("onReviewCriteria();");
    expect(specialistCard).not.toContain("decision summary above");
    expect(specialistCard).not.toContain("Decision card above");
    expect(specialistCard).not.toContain("Review criteria in Decision");
  });
});
