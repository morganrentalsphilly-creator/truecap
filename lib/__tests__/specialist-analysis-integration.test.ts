import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

describe("specialist snapshot integration guards", () => {
  it("persists the snapshot atomically after the final saved strategy identity", () => {
    const action = read("app/actions/saved-analyses.ts");
    expect(action).toContain("freezeSpecialistAnalysisIntoResult");
    expect(action).toContain("SPECIALIST_ANALYSIS_SNAPSHOT_FIELD");
    const finalKey = action.indexOf("const updatedAnalyzerStrategyKey");
    const updateFreeze = action.indexOf(
      "freezeSpecialistAnalysisIntoResult({",
      finalKey,
    );
    expect(finalKey).toBeGreaterThan(-1);
    expect(updateFreeze).toBeGreaterThan(finalKey);
    expect(action.slice(finalKey, updateFreeze)).toContain(
      "existingResultSnapshot: existingSnapshot",
    );
  });

  it("recomputes specialist share outputs and never copies saved result JSON", () => {
    const store = read("lib/public-share.ts");
    expect(store).toContain("buildSpecialistAnalysisSnapshot(");
    expect(store).not.toContain("readRecordedSpecialistAnalysisSnapshot({");
    expect(store).not.toContain("input.resultSnapshot");
    expect(store).toContain(
      "capturedResult.analyzerStrategyKey = analyzerStrategyKey",
    );
    expect(store).toContain(
      "...(specialistAnalysis ? { specialistAnalysis } : {})",
    );
    expect(store).toContain("Recompute at the read boundary too");
    // Superseded shares fail closed instead of recomputing specialist or core
    // outputs under a different standard.
    expect(store).toContain(
      "storedMethodologyVersion !== currentResult.methodologyVersion",
    );
    expect(store).not.toContain("storedMethodologyIsRenderable");
  });

  it("keeps public specialist data behind the server-authorized Pro boundary", () => {
    const route = read("app/s/[token]/page.tsx");
    const view = read("components/investcalc/read-only-analysis-view.tsx");
    expect(route).toContain("showProAnalysis");
    expect(route).toContain("specialistAnalysis={null}");
    expect(route).toContain("specialistAnalysisCaptured={false}");
    expect(route).toContain("recordedResult={false}");
    expect(route).toContain("outputsRecomputed");
    expect(view).toContain('analysis.access === "pro"');
    expect(view).toContain("proResult && !recordedResult");
  });

  it("reopens recorded specialist results without mounting current strategy math", () => {
    const page = read("components/investcalc/investcalc-page.tsx");
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    const outcome = read("components/investcalc/strategy-outcome-card.tsx");
    expect(page).toContain("setRecordedSpecialistAnalysis(");
    expect(page).toContain("readRecordedSpecialistAnalysisSnapshot({");
    expect(page).toContain("setRecordedSpecialistAnalysis(null)");
    expect(dashboard).toContain(
      "recordedSpecialistAnalysis={recordedSpecialistAnalysis}",
    );
    expect(dashboard).toContain("<RecordedSpecialistAnalysisCard");
    expect(outcome).toContain("if (recordedSpecialistAnalysis)");
    expect(outcome.indexOf("if (recordedSpecialistAnalysis)")).toBeLessThan(
      outcome.lastIndexOf("<FixFlipCard"),
    );
  });

  it("keeps scenario clones on the same atomic strategy/snapshot contract", () => {
    const scenarios = read("app/actions/scenarios.ts");
    expect(scenarios).toContain("buildScenarioStrategyTransition");
    expect(scenarios).toContain("transition.analyzerStrategyKey");
    expect(scenarios).toContain("analyzerStrategyKey,");
    expect(scenarios).toContain("buildSpecialistAnalysisSnapshot(");
    expect(scenarios).toContain("SPECIALIST_ANALYSIS_SNAPSHOT_FIELD");
    expect(scenarios).toContain("retargetUnchangedScenarioResultSnapshot({");
  });
});
