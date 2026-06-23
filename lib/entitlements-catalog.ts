/**
 * FEATURE ENTITLEMENT CATALOG — the single source of truth for
 * "which tier gets which feature, and what do we CALL it" across the whole
 * product surface (pricing table, plan cards, persona pages, /vs comparison
 * rows, blog, and in-app upsell copy).
 *
 * Why this exists: feature/tier truth was historically split across three
 * places that drifted apart — the runtime gate (lib/entitlements.ts +
 * plans.entitlements JSON), and dozens of hand-typed marketing strings. The
 * worst symptom: Deal Score shows "Free" on /pricing but "Pro" on ~25 persona
 * /vs/blog surfaces. This module is the ONE place to edit a feature's tier or
 * label; every surface should read from here so copy and gating can't diverge.
 *
 * Relationship to lib/entitlements.ts:
 *   - lib/entitlements.ts stays the RUNTIME gate (reads plans.entitlements,
 *     hasPlanFeature(...), etc.). It decides what a logged-in user can DO.
 *   - This catalog is the MARKETING + policy truth: what each tier INCLUDES
 *     and how we describe it. `key` values match the runtime feature strings
 *     where one exists, so the two stay aligned.
 *
 * NOTE on `gate`: most features are gated by a real feature flag in
 * plans.entitlements (gate: "flag"). A few (MAO, sensitivity, strategies,
 * share links) are currently gated by paid-plan status with no feature key
 * (gate: "paid"). For marketing they're simply Pro; promoting them to real
 * flags is a tracked P2 cleanup (does not change what a user sees).
 */

export type Tier = "free" | "one_time_pdf" | "pro";

export type FeatureKey =
  | "cash_flow"
  | "address_autofill"
  | "deal_score"
  | "verdict"
  | "comps"
  | "save_deal"
  | "dashboard_access"
  | "dashboard_insights"
  | "compare_deals"
  | "mao"
  | "sensitivity"
  | "strategies"
  | "projections"
  | "tax_strategy"
  | "exit_scenarios"
  | "pdf_export"
  | "custom_branding"
  | "share_links"
  | "template_manage"
  | "buy_box"
  | "pipeline";

export type FeatureCategory = "core" | "analysis" | "reporting" | "pipeline" | "data";

export interface FeatureSpec {
  key: FeatureKey;
  /** The ONE marketing label. Edit copy here, nowhere else. */
  label: string;
  tiers: Tier[];
  /** Limit qualifier shown on the free tier (e.g. "up to 5", "1 lifetime"). */
  freeLimit?: string;
  /** Limit qualifier shown on the pro tier (e.g. "unlimited", "50/mo"). */
  proLimit?: string;
  category: FeatureCategory;
  /** How it's gated at runtime — "flag" = plans.entitlements feature string; "paid" = paid-plan status only; "always" = everyone; "stripe_one_time" = $5 checkout. */
  gate: "flag" | "paid" | "always" | "stripe_one_time";
}

/**
 * CANONICAL truth. Deal Score is FREE (score + breakdown) — confirmed by
 * Morgan 2026-06; the runtime already gives it to everyone, and migration
 * 20260621250000 adds `deal_score` to the free plan JSON so the data matches.
 */
export const FEATURE_CATALOG: Record<FeatureKey, FeatureSpec> = {
  cash_flow: { key: "cash_flow", label: "Cap rate · CoC · DSCR · cash flow", tiers: ["free", "one_time_pdf", "pro"], category: "core", gate: "flag" },
  address_autofill: { key: "address_autofill", label: "Auto-fill defaults from the address (HUD rent · FRED rate · state tax)", tiers: ["free", "one_time_pdf", "pro"], category: "data", gate: "always" },
  deal_score: { key: "deal_score", label: "Deal Score 0–100 with subscore breakdown", tiers: ["free", "one_time_pdf", "pro"], category: "core", gate: "flag" },
  verdict: { key: "verdict", label: "Plain-English deal verdict", tiers: ["free", "one_time_pdf", "pro"], category: "core", gate: "always" },
  comps: { key: "comps", label: "Sale + rent comps from the address", tiers: ["free", "pro"], freeLimit: "1 lifetime lookup", proLimit: "50/mo", category: "data", gate: "flag" },
  save_deal: { key: "save_deal", label: "Save deals", tiers: ["free", "pro"], freeLimit: "up to 5", proLimit: "unlimited", category: "pipeline", gate: "flag" },
  dashboard_access: { key: "dashboard_access", label: "Dashboard access", tiers: ["free", "pro"], category: "pipeline", gate: "flag" },
  dashboard_insights: { key: "dashboard_insights", label: "Portfolio insights & analytics", tiers: ["pro"], category: "pipeline", gate: "flag" },
  compare_deals: { key: "compare_deals", label: "Compare deals side-by-side", tiers: ["pro"], proLimit: "up to 4", category: "analysis", gate: "flag" },
  mao: { key: "mao", label: "MAO solver — max offer for your targets", tiers: ["pro"], category: "analysis", gate: "paid" },
  sensitivity: { key: "sensitivity", label: "Sensitivity grid — stress-test the deal", tiers: ["pro"], category: "analysis", gate: "paid" },
  strategies: { key: "strategies", label: "BRRRR + fix-and-flip + rehab estimator", tiers: ["pro"], category: "analysis", gate: "paid" },
  projections: { key: "projections", label: "10-year cash flow & equity projection", tiers: ["pro"], category: "analysis", gate: "flag" },
  tax_strategy: { key: "tax_strategy", label: "Tax strategy — depreciation & interest", tiers: ["pro"], category: "analysis", gate: "flag" },
  exit_scenarios: { key: "exit_scenarios", label: "Exit scenarios — best year to sell", tiers: ["pro"], category: "analysis", gate: "flag" },
  pdf_export: { key: "pdf_export", label: "Lender-ready PDF report with sale + rent comps", tiers: ["one_time_pdf", "pro"], freeLimit: "$5 one-time per deal", proLimit: "unlimited", category: "reporting", gate: "flag" },
  custom_branding: { key: "custom_branding", label: "Custom branding — PDFs + co-branded lead-capture share pages", tiers: ["pro"], category: "reporting", gate: "flag" },
  // Sharing is FREE for everyone (the growth loop): basic links are TrueCap-branded.
  // Pro adds co-branded share pages + lead capture via `custom_branding` (separate key).
  share_links: { key: "share_links", label: "Shareable read-only deal links", tiers: ["free", "pro"], category: "reporting", gate: "always" },
  template_manage: { key: "template_manage", label: "Strategy Profiles (saved assumption sets)", tiers: ["pro"], category: "pipeline", gate: "flag" },
  buy_box: { key: "buy_box", label: "Buy Box — auto-screen every deal to your criteria", tiers: ["pro"], category: "pipeline", gate: "flag" },
  pipeline: { key: "pipeline", label: "Deal pipeline + tags (CRM)", tiers: ["pro"], category: "pipeline", gate: "flag" },
};

/** Does a tier include a feature? Use for marketing AND as a cross-check in tests. */
export function tierHas(tier: Tier, key: FeatureKey): boolean {
  return FEATURE_CATALOG[key].tiers.includes(tier);
}

/** The ONE marketing label for a feature. */
export function featureLabel(key: FeatureKey): string {
  return FEATURE_CATALOG[key].label;
}

/** All features a tier includes, in catalog order. */
export function featuresForTier(tier: Tier): FeatureSpec[] {
  return (Object.keys(FEATURE_CATALOG) as FeatureKey[])
    .map((k) => FEATURE_CATALOG[k])
    .filter((f) => f.tiers.includes(tier));
}

/** The tier-appropriate limit qualifier ("up to 5" on free, "unlimited" on pro), if any. */
export function featureLimit(key: FeatureKey, tier: Tier): string | undefined {
  const f = FEATURE_CATALOG[key];
  if (tier === "free") return f.freeLimit;
  if (tier === "pro") return f.proLimit;
  return undefined;
}
