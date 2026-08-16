import type { FreshnessClass, RiskClass, SeoMode } from "./types";

const positiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const enabled = (value: string | undefined): boolean => value?.trim().toLowerCase() === "true";

export const FRESHNESS_DAYS: Record<FreshnessClass, number> = {
  competitor: 10,
  rates: 7,
  "tax-law": 30,
  "market-data": 90,
  "annual-data": 365,
  "year-specific": 30,
  "evergreen-formula": 180,
};

export type SeoAutopilotConfig = {
  enabled: boolean;
  autopublishEnabled: boolean;
  mode: SeoMode;
  dailyMutationCap: number;
  weeklyPublicationCap: number;
  dailyLlmUsdCap: number;
  haltOnSourceFailure: boolean;
  haltOnQualityFailure: boolean;
};

export function getSeoAutopilotConfig(env: NodeJS.ProcessEnv = process.env): SeoAutopilotConfig {
  const requested = (env.SEO_AUTOPILOT_MODE ?? "observe").toLowerCase();
  const mode: SeoMode = requested === "auto" || requested === "recommend" ? requested : "observe";
  return {
    enabled: enabled(env.SEO_AUTOPILOT_ENABLED),
    autopublishEnabled: enabled(env.SEO_AUTOPUBLISH_ENABLED),
    mode,
    dailyMutationCap: positiveInt(env.SEO_DAILY_MUTATION_CAP, 3),
    weeklyPublicationCap: positiveInt(env.SEO_WEEKLY_PUBLICATION_CAP, 1),
    dailyLlmUsdCap: positiveInt(env.SEO_DAILY_LLM_USD_CAP, 5),
    haltOnSourceFailure: env.SEO_HALT_ON_SOURCE_FAILURE !== "false",
    haltOnQualityFailure: env.SEO_HALT_ON_QUALITY_FAILURE !== "false",
  };
}

export function mayExecuteRisk(config: SeoAutopilotConfig, risk: RiskClass): boolean {
  if (!config.enabled || config.mode !== "auto") return false;
  if (risk !== "low") return false;
  return true;
}

export function mayAutopublish(config: SeoAutopilotConfig, risk: RiskClass): boolean {
  return mayExecuteRisk(config, risk) && config.autopublishEnabled && config.weeklyPublicationCap > 0;
}
