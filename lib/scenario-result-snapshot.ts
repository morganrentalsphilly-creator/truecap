import type { AnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import {
  isSpecialistAnalyzerStrategyKey,
  readRecordedSpecialistAnalysisSnapshot,
  SPECIALIST_ANALYSIS_SNAPSHOT_FIELD,
} from "@/lib/specialist-analysis-snapshot";

/**
 * Retarget an unchanged scenario without pretending that a frozen specialist
 * result belongs to a different analysis lens. Core rental numbers may be
 * copied because no financial inputs changed; specialist outcomes are kept
 * only when the source and target identities match and the recorded payload
 * validates against the same core methodology.
 */
export function retargetUnchangedScenarioResultSnapshot(input: {
  sourceResult: Record<string, unknown> | null;
  sourceStrategyKey: AnalyzerStrategyKey;
  targetStrategyKey: AnalyzerStrategyKey;
}): Record<string, unknown> | null {
  if (!input.sourceResult) return null;

  const retargeted: Record<string, unknown> = {
    ...input.sourceResult,
    analyzerStrategyKey: input.targetStrategyKey,
  };
  delete retargeted[SPECIALIST_ANALYSIS_SNAPSHOT_FIELD];

  if (
    input.sourceStrategyKey === input.targetStrategyKey &&
    isSpecialistAnalyzerStrategyKey(input.targetStrategyKey)
  ) {
    const recorded = readRecordedSpecialistAnalysisSnapshot({
      resultSnapshot: input.sourceResult,
      strategyKey: input.targetStrategyKey,
      coreMethodologyVersion: input.sourceResult.methodologyVersion,
    });
    if (recorded) {
      retargeted[SPECIALIST_ANALYSIS_SNAPSHOT_FIELD] = recorded;
    }
  }

  return retargeted;
}
