import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "@/lib/calc-analysis";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import { retargetUnchangedScenarioResultSnapshot } from "@/lib/scenario-result-snapshot";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import {
  buildSpecialistAnalysisSnapshot,
  SPECIALIST_ANALYSIS_SNAPSHOT_FIELD,
} from "@/lib/specialist-analysis-snapshot";

function recordedFlipResult() {
  const values = investmentFormSchema.parse({
    ...SAMPLE_DEAL_VALUES,
    strategyArv: 400_000,
    rehabBudget: 30_000,
    strategyHoldMonths: 6,
  });
  const result = calculateAnalysis(values);
  const specialist = buildSpecialistAnalysisSnapshot(
    values,
    result,
    "fix-flip",
  );
  if (!specialist) throw new Error("Expected a recorded flip result");
  return {
    ...result,
    analyzerStrategyKey: "fix-flip",
    [SPECIALIST_ANALYSIS_SNAPSHOT_FIELD]: specialist,
  };
}

describe("unchanged scenario result retargeting", () => {
  it("removes a specialist result when switching from flip to buy and hold", () => {
    const retargeted = retargetUnchangedScenarioResultSnapshot({
      sourceResult: recordedFlipResult(),
      sourceStrategyKey: "fix-flip",
      targetStrategyKey: "buy-hold",
    });

    expect(retargeted?.analyzerStrategyKey).toBe("buy-hold");
    expect(retargeted).not.toHaveProperty(SPECIALIST_ANALYSIS_SNAPSHOT_FIELD);
  });

  it("does not relabel a buy-and-hold result as a recorded flip outcome", () => {
    const source = recordedFlipResult();
    source.analyzerStrategyKey = "buy-hold";

    const retargeted = retargetUnchangedScenarioResultSnapshot({
      sourceResult: source,
      sourceStrategyKey: "buy-hold",
      targetStrategyKey: "fix-flip",
    });

    expect(retargeted?.analyzerStrategyKey).toBe("fix-flip");
    expect(retargeted).not.toHaveProperty(SPECIALIST_ANALYSIS_SNAPSHOT_FIELD);
  });

  it("preserves only a valid same-lens frozen specialist result", () => {
    const source = recordedFlipResult();
    const retargeted = retargetUnchangedScenarioResultSnapshot({
      sourceResult: source,
      sourceStrategyKey: "fix-flip",
      targetStrategyKey: "fix-flip",
    });

    expect(retargeted?.analyzerStrategyKey).toBe("fix-flip");
    expect(retargeted?.[SPECIALIST_ANALYSIS_SNAPSHOT_FIELD]).toEqual(
      source[SPECIALIST_ANALYSIS_SNAPSHOT_FIELD],
    );
    expect(retargeted).not.toBe(source);
  });

  it("fails closed when the same-lens specialist result is malformed", () => {
    const source = {
      ...recordedFlipResult(),
      [SPECIALIST_ANALYSIS_SNAPSHOT_FIELD]: { strategy: "fix-flip" },
    };
    const retargeted = retargetUnchangedScenarioResultSnapshot({
      sourceResult: source,
      sourceStrategyKey: "fix-flip",
      targetStrategyKey: "fix-flip",
    });

    expect(retargeted).not.toHaveProperty(SPECIALIST_ANALYSIS_SNAPSHOT_FIELD);
  });

  it("handles a missing recorded result without inventing one", () => {
    expect(
      retargetUnchangedScenarioResultSnapshot({
        sourceResult: null,
        sourceStrategyKey: "buy-hold",
        targetStrategyKey: "fix-flip",
      }),
    ).toBeNull();
  });
});
