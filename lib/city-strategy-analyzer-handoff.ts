import type { StrategyKey } from "@/lib/city-strategy-combos";
import {
  buildAnalyzerHandoffUrl,
  type HandoffStrategyKey,
} from "@/lib/analyzer-handoff";

/**
 * Map SEO strategy language onto the finite set of analyzer strategies.
 * Strategies without a dedicated analyzer mode intentionally land on the
 * buy-and-hold screen instead of passing an unsupported query value.
 */
export const CITY_STRATEGY_ANALYZER_STRATEGY = {
  brrrr: "brrrr",
  "house-hack": "house-hack",
  "cash-flow": "buy-hold",
  "section-8": "buy-hold",
  turnkey: "buy-hold",
  appreciation: "buy-hold",
} satisfies Record<StrategyKey, HandoffStrategyKey>;

export function buildCityStrategyAnalyzerHref(strategy: StrategyKey): string {
  return `${buildAnalyzerHandoffUrl(
    { strategy: CITY_STRATEGY_ANALYZER_STRATEGY[strategy] },
    { utmSource: `city-strategy-${strategy}` }
  )}#main`;
}
