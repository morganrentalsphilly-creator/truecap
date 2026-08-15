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

/**
 * "agent_pro" (2026-08, Morgan-approved at $59/mo): everything in Pro plus the
 * agent toolkit — client rosters, client-scoped buy boxes, the client portal,
 * and white-label embeds (the Phase 6 decision: embed white-labeling ships as
 * an Agent Pro entitlement rather than a standalone subscription, because only
 * one subscription can be active per user).
 */
export type Tier = "free" | "one_time_pdf" | "pro" | "agent_pro";

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
  | "pipeline"
  | "client_buy_box"
  | "agent_portal"
  | "embed_whitelabel";

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
  /** Limit qualifier shown on the $5 one-time tier (e.g. "One deal", "In the PDF"). */
  oneTimeLimit?: string;
  category: FeatureCategory;
  /** How it's gated at runtime — "flag" = plans.entitlements feature string; "paid" = paid-plan status only; "always" = everyone; "stripe_one_time" = $5 checkout. */
  gate: "flag" | "paid" | "always" | "stripe_one_time";
  /**
   * false = the entitlement exists in the plan JSON but the FEATURE isn't built
   * yet, so marketing must NOT advertise it. Keeps the tier's entitlement bag
   * forward-compatible (flip to true when the feature ships — no migration)
   * without selling vapor on the pricing card. Defaults to shipped.
   */
  shipped?: boolean;
}

/**
 * CANONICAL truth. Deal Score is FREE (score + breakdown) — confirmed by
 * Morgan 2026-06; the runtime already gives it to everyone, and migration
 * 20260621250000 adds `deal_score` to the free plan JSON so the data matches.
 */
export const FEATURE_CATALOG: Record<FeatureKey, FeatureSpec> = {
  cash_flow: { key: "cash_flow", label: "Cap rate · CoC · DSCR · cash flow", tiers: ["free", "one_time_pdf", "pro", "agent_pro"], category: "core", gate: "flag" },
  address_autofill: { key: "address_autofill", label: "Auto-fill defaults from the address (HUD rent · FRED rate · state tax)", tiers: ["free", "one_time_pdf", "pro", "agent_pro"], category: "data", gate: "always" },
  deal_score: { key: "deal_score", label: "Deal Score 0–100 with subscore breakdown", tiers: ["free", "one_time_pdf", "pro", "agent_pro"], category: "core", gate: "flag" },
  verdict: { key: "verdict", label: "Plain-English deal verdict", tiers: ["free", "one_time_pdf", "pro", "agent_pro"], category: "core", gate: "always" },
  comps: { key: "comps", label: "Sale + rent comps from the address", tiers: ["free", "pro", "agent_pro"], freeLimit: "1 lifetime lookup", proLimit: "50/mo", category: "data", gate: "flag" },
  save_deal: { key: "save_deal", label: "Save deals", tiers: ["free", "pro", "agent_pro"], freeLimit: "up to 5", proLimit: "unlimited", category: "pipeline", gate: "flag" },
  dashboard_access: { key: "dashboard_access", label: "Dashboard access", tiers: ["free", "pro", "agent_pro"], category: "pipeline", gate: "flag" },
  dashboard_insights: { key: "dashboard_insights", label: "Portfolio insights & analytics", tiers: ["pro", "agent_pro"], category: "pipeline", gate: "flag" },
  compare_deals: { key: "compare_deals", label: "Compare deals side-by-side", tiers: ["pro", "agent_pro"], proLimit: "up to 4", category: "analysis", gate: "flag" },
  mao: { key: "mao", label: "MAO solver — max offer for your targets", tiers: ["one_time_pdf", "pro", "agent_pro"], oneTimeLimit: "In the PDF", category: "analysis", gate: "paid" },
  sensitivity: { key: "sensitivity", label: "Sensitivity grid — stress-test the deal", tiers: ["pro", "agent_pro"], category: "analysis", gate: "paid" },
  strategies: { key: "strategies", label: "BRRRR + fix-and-flip + rehab estimator", tiers: ["pro", "agent_pro"], category: "analysis", gate: "paid" },
  projections: { key: "projections", label: "10-year cash flow & equity projection", tiers: ["one_time_pdf", "pro", "agent_pro"], oneTimeLimit: "In the PDF", category: "analysis", gate: "flag" },
  tax_strategy: { key: "tax_strategy", label: "Tax strategy — depreciation & interest", tiers: ["one_time_pdf", "pro", "agent_pro"], oneTimeLimit: "In the PDF", category: "analysis", gate: "flag" },
  exit_scenarios: { key: "exit_scenarios", label: "Exit scenarios — best year to sell", tiers: ["one_time_pdf", "pro", "agent_pro"], oneTimeLimit: "In the PDF", category: "analysis", gate: "flag" },
  pdf_export: { key: "pdf_export", label: "Lender-ready PDF report with sale + rent comps", tiers: ["one_time_pdf", "pro", "agent_pro"], freeLimit: "$5 one-time per deal", oneTimeLimit: "One deal", proLimit: "unlimited", category: "reporting", gate: "flag" },
  custom_branding: { key: "custom_branding", label: "Custom branding — PDFs + co-branded lead-capture share pages", tiers: ["pro", "agent_pro"], category: "reporting", gate: "flag" },
  // Sharing is FREE for everyone (the growth loop): basic links are TrueCap-branded.
  // Pro adds co-branded share pages + lead capture via `custom_branding` (separate key).
  share_links: { key: "share_links", label: "Shareable read-only deal links", tiers: ["free", "pro", "agent_pro"], category: "reporting", gate: "always" },
  template_manage: { key: "template_manage", label: "Strategy Profiles (saved assumption sets)", tiers: ["pro", "agent_pro"], category: "pipeline", gate: "flag" },
  buy_box: { key: "buy_box", label: "Buy Box — auto-screen every deal to your criteria", tiers: ["pro", "agent_pro"], category: "pipeline", gate: "flag" },
  pipeline: { key: "pipeline", label: "Deal pipeline + tags (CRM)", tiers: ["pro", "agent_pro"], category: "pipeline", gate: "flag" },
  client_buy_box: { key: "client_buy_box", label: "Client rosters — buy boxes per buyer, deals screened to each client's criteria", tiers: ["agent_pro"], category: "pipeline", gate: "flag" },
  agent_portal: { key: "agent_portal", label: "Client portal — co-branded deal pages your buyers revisit", tiers: ["agent_pro"], category: "reporting", gate: "flag" },
  embed_whitelabel: { key: "embed_whitelabel", label: "White-label embeds — calculators on your site, your brand only", tiers: ["agent_pro"], category: "reporting", gate: "flag" },
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
  if (tier === "one_time_pdf") return f.oneTimeLimit;
  if (tier === "pro") return f.proLimit;
  return undefined;
}

/** Tier order as the marketing ladder and /pricing table render them. */
export const LADDER_TIERS: readonly Tier[] = ["free", "one_time_pdf", "pro"] as const;

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

/**
 * One feature's row of ladder cells, in LADDER_TIERS order: `true` when the
 * tier includes it outright, the qualifier string when it includes it with a
 * limit ("Up to 5", "In the PDF"), and `false` when it doesn't.
 *
 * This is what makes the pricing matrices single-sourced. The rendered rows
 * used to hand-type these three cells, and that is precisely how the homepage
 * came to claim Free couldn't save deals (it can — 5) and that the $5 PDF
 * omitted projections (it doesn't) — both contradicting /pricing at the exact
 * moment someone decides to pay.
 */
export function ladderCellsForFeature(key: FeatureKey): (boolean | string)[] {
  const spec = FEATURE_CATALOG[key];
  return LADDER_TIERS.map((tier) => {
    if (!spec.tiers.includes(tier)) return false;
    const limit =
      tier === "free" ? spec.freeLimit : tier === "one_time_pdf" ? spec.oneTimeLimit : spec.proLimit;
    return limit ? capitalize(limit) : true;
  });
}
