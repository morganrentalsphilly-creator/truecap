import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const normalizeSource = (value: string) =>
  value.replace(/\s+/g, "").replace(/,([)}\]])/g, "$1");

describe("saved-deal decision handoff", () => {
  it("selects the owner-scoped pipeline stage and carries it only in edit handoffs", () => {
    const action = source("app/actions/saved-analyses.ts");
    const dashboardAnalyzer = source("app/dashboard/new/page.tsx");
    const analyzer = source("components/investcalc/investcalc-page.tsx");
    const handoff = source("components/investcalc/open-saved-deal-in-analyzer.tsx");

    expect(action).toContain(
      "methodology_version, underwriting_revision, pipeline_stage, form_snapshot"
    );
    expect(normalizeSource(action)).toContain(
      normalizeSource("pipelineStage: dbString"),
    );
    expect(dashboardAnalyzer).toContain("initialSavedDeal={initialSavedDeal}");
    expect(analyzer).toContain("pipelineStage: initialSavedDeal.pipelineStage");
    expect(handoff).not.toMatch(
      /SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY,[\s\S]{0,500}pipelineStage/
    );
  });

  it("maps the restored stage at the decision boundary and fails closed when detached", () => {
    const analyzer = source("components/investcalc/investcalc-page.tsx");
    const dashboard = source("components/investcalc/analysis-dashboard.tsx");

    expect(analyzer).toContain(
      "savedDealId ? loadedPipelineStage : null"
    );
    expect(analyzer).toContain('typeof parsed.pipelineStage === "string"');
    expect(dashboard).toContain("userDecision={userDecision}");
  });
});
