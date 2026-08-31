/**
 * Which scenario strategies a given saved deal can actually accept — decided
 * BEFORE the user submits, with the same functions the server action uses to
 * reject afterwards.
 *
 * The defect this exists to prevent: the Add Scenario dialog listed every
 * strategy, let the user name the scenario, pick "House hack" on a
 * Single-Family deal, and press Add — then the server rejected it with a
 * five-step errand ("Open the source in the analyzer, choose this analysis
 * type, complete its visible inputs, run it, and then add the scenario").
 * The dialog's own description text already stated the requirement, so the
 * app knew the click could not succeed and let it happen anyway.
 *
 * Parity with the server is BY CONSTRUCTION, not by re-implementation:
 * eligibility here is applyStrategyPreset -> isAnalyzerStrategyCompatible,
 * exactly the pair app/actions/scenarios.ts runs, and the action imports
 * requiredAnalyzerStrategyKeyForScenario from this module so the two can
 * never drift. The post-preset evaluation matters: presets CLEAR short-term
 * income fields for non-STR strategies, so a single-family deal configured
 * as short-term is still a valid BRRRR source — a naive check on the raw
 * source values would wrongly block it.
 */
import {
  isAnalyzerStrategyCompatible,
  type AnalyzerStrategyCompatibilityValues,
  type AnalyzerStrategyKey,
} from "@/lib/analyzer-strategy-persistence";
import { applyStrategyPreset } from "@/lib/scenario-presets";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { StrategyKind } from "@/lib/strategy-kinds";

/** The one strategy-kind -> required analyzer lens mapping. The server
 *  action consumes this same function; do not inline a copy anywhere. */
export function requiredAnalyzerStrategyKeyForScenario(
  kind: string | null | undefined,
): AnalyzerStrategyKey | null {
  switch (kind) {
    case "brrrr":
      return "brrrr";
    case "flip":
      return "fix-flip";
    case "house_hack":
      return "house-hack";
    case "str":
      return "short-term";
    default:
      return null;
  }
}

const REASONS: Partial<Record<AnalyzerStrategyKey, string>> = {
  "house-hack": "needs an Owner-Occupant analysis",
  brrrr: "needs a Single-Family analysis",
  "fix-flip": "needs a Single-Family analysis",
  "short-term": "needs a Short-Term analysis with nightly rate and occupancy",
};

/**
 * Null when the strategy can be added to this source deal; otherwise a short
 * human reason ("needs an Owner-Occupant analysis"). Callers render it inline
 * on the disabled option so the rejected click never happens.
 */
export function scenarioStrategyDisabledReason(
  kind: string | null | undefined,
  sourceValues: AnalyzerStrategyCompatibilityValues | null | undefined,
): string | null {
  const required = requiredAnalyzerStrategyKeyForScenario(kind);
  if (!required) return null;
  // No source facts (legacy snapshot that fails validation): do not guess.
  // Leave the option enabled and let the server's check answer.
  if (!sourceValues || sourceValues.propertyType == null) return null;
  const adjusted = applyStrategyPreset(
    sourceValues as InvestmentFormValues,
    kind as StrategyKind,
  );
  return isAnalyzerStrategyCompatible(required, adjusted)
    ? null
    : (REASONS[required] ?? "needs its analyzer setup first");
}
