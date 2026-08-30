import {
  investmentFormSchema,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import {
  resolveScenarioAnalyzerStrategyKey,
  scenarioAnalyzerStrategyKey,
  type AnalyzerStrategyKey,
} from "@/lib/analyzer-strategy-persistence";
import { applyStrategyPreset } from "@/lib/scenario-presets";
import type { StrategyKind } from "@/lib/strategy-kinds";

export type ScenarioStrategyTransition = {
  values: InvestmentFormValues;
  analyzerStrategyKey: AnalyzerStrategyKey;
  intendedAnalyzerStrategyKey: AnalyzerStrategyKey;
  /** The destination lens needs explicit property/income setup in Analyzer. */
  setupRequired: boolean;
  /** A preset was unsafe without inventing a replacement required input. */
  presetDeferred: boolean;
};

/**
 * Build a strategy scenario without inventing property type, rent, ADR, or
 * occupancy. A compatible preset is applied immediately. If applying it would
 * remove the source's only valid income model (for example STR -> Buy & Hold
 * when no monthly rent has been entered), keep the valid source assumptions
 * and defer the transition to the visible Analyzer form.
 *
 * The scenario label records intent. The persisted analyzer key records only
 * the calculation lens the cloned values can honestly support today.
 */
export function buildScenarioStrategyTransition(input: {
  baseValues: InvestmentFormValues;
  strategyKind: StrategyKind;
  sourceResult: Record<string, unknown> | null;
}): ScenarioStrategyTransition {
  const presetCandidate = applyStrategyPreset(
    input.baseValues,
    input.strategyKind,
  );
  const presetChanged = presetCandidate !== input.baseValues;
  const presetIsValid =
    !presetChanged || investmentFormSchema.safeParse(presetCandidate).success;
  const values = presetIsValid ? presetCandidate : input.baseValues;
  const presetDeferred = presetChanged && !presetIsValid;
  const intendedAnalyzerStrategyKey = scenarioAnalyzerStrategyKey(
    input.strategyKind,
  );
  // Every StrategyKind is exhaustively mapped above. Keep the guard so this
  // pure boundary fails loudly if that vocabulary grows without a lens.
  if (!intendedAnalyzerStrategyKey) {
    throw new Error(`Unmapped scenario strategy: ${input.strategyKind}`);
  }
  const analyzerStrategyKey = resolveScenarioAnalyzerStrategyKey({
    strategyKind: input.strategyKind,
    sourceResult: input.sourceResult,
    values,
  });

  return {
    values,
    analyzerStrategyKey,
    intendedAnalyzerStrategyKey,
    setupRequired:
      presetDeferred || analyzerStrategyKey !== intendedAnalyzerStrategyKey,
    presetDeferred,
  };
}
