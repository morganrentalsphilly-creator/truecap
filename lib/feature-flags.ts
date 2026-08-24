/**
 * Product-rollout flags for the acquisition-decision release.
 *
 * These flags are intentionally build-time, public configuration. Never put a
 * secret in a NEXT_PUBLIC_* variable. Every flag fails closed so a misspelled,
 * empty, or unexpected value cannot expose an unfinished workflow.
 *
 * Use `isFeatureEnabled` in product code. `resolveFeatureFlags` accepts typed
 * overrides so tests and server-side callers do not need to mutate process.env.
 */

export const FEATURE_FLAG_KEYS = [
  "input_confidence",
  "offer_ready_status",
  "what_needs_to_be_true_v2",
  "financing_profiles",
  "deal_decision_pack",
  "three_deal_guarantee",
  "saved_deal_watch",
  "batch_underwriting",
  "agent_client_matching",
  "new_homepage_positioning",
  // Owner: Product + Model Risk. Dark until the P0 parity/comprehension gates
  // pass. Roll back by setting the public env value to "0"/"false" and
  // rebuilding/redeploying (NEXT_PUBLIC values are build-time); no stored data,
  // formulas, prices, or entitlements depend on this presentation flag.
  "advocacy_decision_contract",
  // Aug-2026 hierarchy rebuild. Both default ON: they ARE the rebuild, and
  // the flags exist so a regression can be reverted without a redeploy.
  "decision_first_results",
  "focused_dashboard",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];
export type FeatureFlagState = Readonly<Record<FeatureFlagKey, boolean>>;
export type FeatureFlagOverride = boolean | string | null | undefined;

export const FEATURE_FLAG_ENV_KEYS = {
  input_confidence: "NEXT_PUBLIC_TRUECAP_INPUT_CONFIDENCE",
  offer_ready_status: "NEXT_PUBLIC_TRUECAP_OFFER_READY_STATUS",
  what_needs_to_be_true_v2: "NEXT_PUBLIC_TRUECAP_WHAT_NEEDS_TO_BE_TRUE_V2",
  financing_profiles: "NEXT_PUBLIC_TRUECAP_FINANCING_PROFILES",
  deal_decision_pack: "NEXT_PUBLIC_TRUECAP_DEAL_DECISION_PACK",
  three_deal_guarantee: "NEXT_PUBLIC_TRUECAP_THREE_DEAL_GUARANTEE",
  saved_deal_watch: "NEXT_PUBLIC_TRUECAP_SAVED_DEAL_WATCH",
  batch_underwriting: "NEXT_PUBLIC_TRUECAP_BATCH_UNDERWRITING",
  agent_client_matching: "NEXT_PUBLIC_TRUECAP_AGENT_CLIENT_MATCHING",
  new_homepage_positioning: "NEXT_PUBLIC_TRUECAP_NEW_HOMEPAGE_POSITIONING",
  advocacy_decision_contract: "NEXT_PUBLIC_TRUECAP_ADVOCACY_DECISION_CONTRACT",
  decision_first_results: "NEXT_PUBLIC_TRUECAP_DECISION_FIRST_RESULTS",
  focused_dashboard: "NEXT_PUBLIC_TRUECAP_FOCUSED_DASHBOARD",
} as const satisfies Record<FeatureFlagKey, `NEXT_PUBLIC_${string}`>;

/**
 * All new behavior starts dark. Flags can be enabled independently after the
 * migration and the corresponding UI/integration are deployed and verified.
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlagState = Object.freeze({
  input_confidence: false,
  offer_ready_status: false,
  what_needs_to_be_true_v2: false,
  financing_profiles: false,
  deal_decision_pack: false,
  three_deal_guarantee: false,
  saved_deal_watch: false,
  batch_underwriting: false,
  agent_client_matching: false,
  new_homepage_positioning: false,
  advocacy_decision_contract: false,
  // These two default TRUE, unlike every flag above. They are not new
  // behavior being introduced dark — they are the shipped Aug-2026
  // information hierarchy, and the flag exists so a regression can be
  // switched off in Vercel without a redeploy. Set the env to "0"/"false"
  // to fall back to the pre-rebuild layout.
  decision_first_results: true,
  focused_dashboard: true,
});

const TRUE_VALUES = new Set(["1", "true", "yes", "on", "enabled"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off", "disabled"]);

function parseFeatureFlagValue(value: FeatureFlagOverride, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return fallback;
}

export function resolveFeatureFlags(
  overrides: Partial<Record<FeatureFlagKey, FeatureFlagOverride>> = {}
): FeatureFlagState {
  return Object.freeze(
    Object.fromEntries(
      FEATURE_FLAG_KEYS.map((key) => [
        key,
        parseFeatureFlagValue(overrides[key], DEFAULT_FEATURE_FLAGS[key]),
      ])
    ) as Record<FeatureFlagKey, boolean>
  );
}

// Keep accesses explicit. Next.js only inlines statically referenced
// NEXT_PUBLIC_* values into browser bundles; dynamic process.env[key] lookups
// would make client and server flag behavior diverge.
const runtimeOverrides: Partial<Record<FeatureFlagKey, FeatureFlagOverride>> = {
  input_confidence: process.env.NEXT_PUBLIC_TRUECAP_INPUT_CONFIDENCE,
  offer_ready_status: process.env.NEXT_PUBLIC_TRUECAP_OFFER_READY_STATUS,
  what_needs_to_be_true_v2: process.env.NEXT_PUBLIC_TRUECAP_WHAT_NEEDS_TO_BE_TRUE_V2,
  financing_profiles: process.env.NEXT_PUBLIC_TRUECAP_FINANCING_PROFILES,
  deal_decision_pack: process.env.NEXT_PUBLIC_TRUECAP_DEAL_DECISION_PACK,
  three_deal_guarantee: process.env.NEXT_PUBLIC_TRUECAP_THREE_DEAL_GUARANTEE,
  saved_deal_watch: process.env.NEXT_PUBLIC_TRUECAP_SAVED_DEAL_WATCH,
  batch_underwriting: process.env.NEXT_PUBLIC_TRUECAP_BATCH_UNDERWRITING,
  agent_client_matching: process.env.NEXT_PUBLIC_TRUECAP_AGENT_CLIENT_MATCHING,
  new_homepage_positioning: process.env.NEXT_PUBLIC_TRUECAP_NEW_HOMEPAGE_POSITIONING,
  advocacy_decision_contract:
    process.env.NEXT_PUBLIC_TRUECAP_ADVOCACY_DECISION_CONTRACT,
  decision_first_results: process.env.NEXT_PUBLIC_TRUECAP_DECISION_FIRST_RESULTS,
  focused_dashboard: process.env.NEXT_PUBLIC_TRUECAP_FOCUSED_DASHBOARD,
};

export const featureFlags: FeatureFlagState = resolveFeatureFlags(runtimeOverrides);

export function isFeatureEnabled(
  key: FeatureFlagKey,
  state: FeatureFlagState = featureFlags
): boolean {
  return state[key];
}
