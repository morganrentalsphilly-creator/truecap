import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_ENV_KEYS,
  FEATURE_FLAG_KEYS,
  isFeatureEnabled,
  hasAnySpecialistStrategyEnabled,
  isSpecialistStrategyEnabled,
  resolveFeatureFlags,
  type FeatureFlagKey,
} from "@/lib/feature-flags";

describe("product feature flags", () => {
  /**
   * Two KINDS of flag now live here, and the distinction is load-bearing:
   *
   *   ROLLOUT flags gate unreleased behavior and MUST default off, so an
   *   unset env can never expose half-built work.
   *
   *   KILL-SWITCH flags gate behavior that is already shipped (the Aug-2026
   *   information hierarchy). They default ON — the product IS the new
   *   layout. A NEXT_PUBLIC change still requires a rebuild/redeploy.
   *   Defaulting these off would ship the rebuild dark and silently keep the
   *   old layout live.
   */
  const KILL_SWITCH_FLAGS: FeatureFlagKey[] = [
    "input_confidence",
    "offer_ready_status",
    "new_homepage_positioning",
    "decision_first_results",
    "focused_dashboard",
  ];

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
      "brrrr_strategy_model",
      "fix_flip_strategy_model",
      "owned_portfolio_actuals",
      "advocacy_decision_contract",
      "testimonial_collection",
      "decision_first_results",
      "focused_dashboard",
    ]);
    expect(Object.keys(DEFAULT_FEATURE_FLAGS).sort()).toEqual(
      [...FEATURE_FLAG_KEYS].sort(),
    );

    for (const key of FEATURE_FLAG_KEYS) {
      expect(DEFAULT_FEATURE_FLAGS[key], key).toBe(
        KILL_SWITCH_FLAGS.includes(key),
      );
    }
  });

  it("kill-switch flags can be turned OFF by an explicit build-time env value", () => {
    for (const key of KILL_SWITCH_FLAGS) {
      expect(
        isFeatureEnabled(key, resolveFeatureFlags({ [key]: "0" })),
        key,
      ).toBe(false);
      expect(
        isFeatureEnabled(key, resolveFeatureFlags({ [key]: "false" })),
        key,
      ).toBe(false);
      // Unset env must NOT disable them — that is the whole difference.
      expect(isFeatureEnabled(key, resolveFeatureFlags({})), key).toBe(true);
    }
  });

  it.each(["1", "true", "TRUE", " yes ", "on", "enabled"])(
    "accepts the explicit enabled value %j",
    (value) => {
      const flags = resolveFeatureFlags({ financing_profiles: value });
      expect(isFeatureEnabled("financing_profiles", flags)).toBe(true);
    },
  );

  it.each(["0", "false", "FALSE", " no ", "off", "disabled"])(
    "accepts the explicit disabled value %j",
    (value) => {
      const flags = resolveFeatureFlags({ financing_profiles: value });
      expect(isFeatureEnabled("financing_profiles", flags)).toBe(false);
    },
  );

  it("falls back to each flag's safe release default for empty or unrecognized configuration", () => {
    expect(resolveFeatureFlags({ input_confidence: "" }).input_confidence).toBe(
      true,
    );
    expect(
      resolveFeatureFlags({ input_confidence: "tru" }).input_confidence,
    ).toBe(true);
    expect(
      resolveFeatureFlags({ input_confidence: undefined }).input_confidence,
    ).toBe(true);
    expect(resolveFeatureFlags().input_confidence).toBe(true);
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

  it("keeps both specialist finance models dark unless independently released", () => {
    const dark = resolveFeatureFlags();
    expect(hasAnySpecialistStrategyEnabled(dark)).toBe(false);
    expect(isSpecialistStrategyEnabled("brrrr", dark)).toBe(false);
    expect(isSpecialistStrategyEnabled("fix-flip", dark)).toBe(false);
    expect(isSpecialistStrategyEnabled("buy-hold", dark)).toBe(true);

    const brrrrOnly = resolveFeatureFlags({ brrrr_strategy_model: true });
    expect(hasAnySpecialistStrategyEnabled(brrrrOnly)).toBe(true);
    expect(isSpecialistStrategyEnabled("brrrr", brrrrOnly)).toBe(true);
    expect(isSpecialistStrategyEnabled("fix-flip", brrrrOnly)).toBe(false);
  });

  it("keeps modeled owned-portfolio performance off every customer summary", () => {
    expect(resolveFeatureFlags().owned_portfolio_actuals).toBe(false);
    const dashboard = readFileSync(
      join(process.cwd(), "components/dashboard/DashboardHome.tsx"),
      "utf8",
    );
    const weeklyRoute = readFileSync(
      join(process.cwd(), "app/api/cron/send-weekly-summary/route.ts"),
      "utf8",
    );
    expect(dashboard).toContain('isFeatureEnabled("owned_portfolio_actuals")');
    expect(weeklyRoute).toContain(
      'isFeatureEnabled(\n          "owned_portfolio_actuals",',
    );
  });

  it("maps every flag to a unique, public build-time environment variable", () => {
    const keys = FEATURE_FLAG_KEYS.map(
      (flag: FeatureFlagKey) => FEATURE_FLAG_ENV_KEYS[flag],
    );
    expect(new Set(keys).size).toBe(FEATURE_FLAG_KEYS.length);
    expect(keys.every((key) => key.startsWith("NEXT_PUBLIC_TRUECAP_"))).toBe(
      true,
    );
  });
});
