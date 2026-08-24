import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("saved-deal decision handoff", () => {
  it("selects the owner-scoped pipeline stage and carries it only in edit handoffs", () => {
    const action = source("app/actions/saved-analyses.ts");
    const handoff = source("components/investcalc/open-saved-deal-in-analyzer.tsx");

    expect(action).toContain("methodology_version, pipeline_stage, form_snapshot");
    expect(action).toContain("pipelineStage: dbString");
    expect(handoff).toMatch(
      /SAVED_ANALYSIS_EDIT_DRAFT_KEY,[\s\S]*pipelineStage: result\.pipelineStage/
    );
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
    expect(analyzer).toContain("typeof parsed.pipelineStage === \"string\"");
    expect(dashboard).toContain("userDecision={userDecision}");
  });
});
