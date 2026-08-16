import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_ENV_KEYS,
  FEATURE_FLAG_KEYS,
  isFeatureEnabled,
  resolveFeatureFlags,
  type FeatureFlagKey,
} from "@/lib/feature-flags";

describe("product feature flags", () => {
  it("declares every requested rollout flag exactly once and defaults it off", () => {
    expect(FEATURE_FLAG_KEYS).toEqual([
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
    ]);
    expect(Object.keys(DEFAULT_FEATURE_FLAGS).sort()).toEqual([...FEATURE_FLAG_KEYS].sort());
    expect(Object.values(DEFAULT_FEATURE_FLAGS)).toEqual(FEATURE_FLAG_KEYS.map(() => false));
  });

  it.each(["1", "true", "TRUE", " yes ", "on", "enabled"])(
    "accepts the explicit enabled value %j",
    (value) => {
      const flags = resolveFeatureFlags({ financing_profiles: value });
      expect(isFeatureEnabled("financing_profiles", flags)).toBe(true);
    }
  );

  it.each(["0", "false", "FALSE", " no ", "off", "disabled"])(
    "accepts the explicit disabled value %j",
    (value) => {
      const flags = resolveFeatureFlags({ financing_profiles: value });
      expect(isFeatureEnabled("financing_profiles", flags)).toBe(false);
    }
  );

  it("fails closed for empty, missing, and unrecognized configuration", () => {
    expect(resolveFeatureFlags({ input_confidence: "" }).input_confidence).toBe(false);
    expect(resolveFeatureFlags({ input_confidence: "tru" }).input_confidence).toBe(false);
    expect(resolveFeatureFlags({ input_confidence: undefined }).input_confidence).toBe(false);
    expect(resolveFeatureFlags().input_confidence).toBe(false);
  });

  it("supports boolean overrides without changing unrelated defaults", () => {
    const flags = resolveFeatureFlags({
      input_confidence: true,
      three_deal_guarantee: false,
    });

    expect(flags.input_confidence).toBe(true);
    expect(flags.three_deal_guarantee).toBe(false);
    expect(flags.deal_decision_pack).toBe(false);
  });

  it("maps every flag to a unique, public build-time environment variable", () => {
    const keys = FEATURE_FLAG_KEYS.map((flag: FeatureFlagKey) => FEATURE_FLAG_ENV_KEYS[flag]);
    expect(new Set(keys).size).toBe(FEATURE_FLAG_KEYS.length);
    expect(keys.every((key) => key.startsWith("NEXT_PUBLIC_TRUECAP_"))).toBe(true);
  });
});
