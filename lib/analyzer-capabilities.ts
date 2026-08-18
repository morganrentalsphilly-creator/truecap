import "server-only";

/**
 * The analyzer's per-user capability bag.
 *
 * EXTRACTED (Aug-2026 shell-integrity pass) from app/home-authed/page.tsx so
 * the in-shell analyzer at /dashboard/new resolves the SAME flags from the
 * SAME queries. Two hand-maintained copies of ~14 entitlement derivations
 * would drift silently, and the failure mode is a user seeing a Pro feature
 * on one route and not the other.
 *
 * Entitlement flags only — no math, no analysis values.
 *
 * NOTE: app/page.tsx (the STATIC anon homepage) deliberately does NOT use
 * this: it must never read cookies/headers or it loses `revalidate = 3600`.
 * It passes hardcoded anon values, and lib/__tests__/homepage-lockstep.test.ts
 * keeps the two prop lists aligned.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import {
  getEntitlementsForUser,
  hasPaidPlanSubscription,
  hasPlanFeature,
  hasSavedDealCapacity,
} from "@/lib/entitlements";

export type AnalyzerCapabilities = {
  /** Returned so callers don't re-query for savedDealLimit etc. */
  entitlements: Awaited<ReturnType<typeof getEntitlementsForUser>> | null;
  savedDealCount: number;
  userAnalysisDefaults: Record<string, number> | null;
  canSaveDeals: boolean;
  canUpdateSavedDeals: boolean;
  saveDealLimitReached: boolean;
  canCompareDeals: boolean;
  canExportPdf: boolean;
  canUseProjections: boolean;
  canUseTaxStrategy: boolean;
  canUseExitScenarios: boolean;
  canUseDealScore: boolean;
  canUseMaxOffer: boolean;
  canUseSensitivity: boolean;
  canUseStrategies: boolean;
  canUseBuyBox: boolean;
};

export async function getAnalyzerCapabilities(
  supabase: SupabaseClient,
  user: User | null
): Promise<AnalyzerCapabilities> {
  const [entitlements, defaultsQuery, canUpdateSavedDeals, savedCountQuery] = user
    ? await Promise.all([
        getEntitlementsForUser(supabase, user.id),
        supabase
          .from("user_analysis_defaults")
          .select("preferences")
          .eq("user_id", user.id)
          .maybeSingle(),
        hasPaidPlanSubscription(supabase, user.id),
        supabase
          .from("saved_analyses")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null),
      ])
    : [null, null, false, null];

  // Sanitize the stored preferences bag: only finite numbers survive, so a
  // corrupted row can never inject a non-numeric default into the form.
  let userAnalysisDefaults: Record<string, number> | null = null;
  const prefs = (defaultsQuery?.data as { preferences?: unknown } | null)?.preferences;
  if (prefs && typeof prefs === "object" && !Array.isArray(prefs)) {
    const sanitized: Record<string, number> = {};
    for (const [k, v] of Object.entries(prefs as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) sanitized[k] = v;
    }
    if (Object.keys(sanitized).length > 0) userAnalysisDefaults = sanitized;
  }

  const savedDealCount = savedCountQuery?.count ?? 0;
  // Any paid plan unlocks these — derived from hasPaidPlanSubscription so a
  // new gate doesn't need a per-plan migration (see the original note in
  // app/home-authed/page.tsx).
  const isPaidPlan = canUpdateSavedDeals;

  return {
    entitlements,
    savedDealCount,
    userAnalysisDefaults,
    canSaveDeals: entitlements ? hasPlanFeature(entitlements, "save_deal") : false,
    canUpdateSavedDeals,
    saveDealLimitReached: entitlements
      ? !hasSavedDealCapacity(entitlements, savedDealCount ?? 0)
      : false,
    canCompareDeals: entitlements ? hasPlanFeature(entitlements, "compare_deals") : false,
    canExportPdf: entitlements ? hasPlanFeature(entitlements, "pdf_export") : false,
    canUseProjections: entitlements ? hasPlanFeature(entitlements, "projections") : false,
    canUseTaxStrategy: entitlements ? hasPlanFeature(entitlements, "tax_strategy") : false,
    canUseExitScenarios: entitlements ? hasPlanFeature(entitlements, "exit_scenarios") : false,
    // Deal Score is FREE for everyone — the headline 0-100 verdict converts
    // better given away than gated. Depth stays gated above/below.
    canUseDealScore: true,
    canUseMaxOffer: isPaidPlan,
    canUseSensitivity: isPaidPlan,
    canUseStrategies: isPaidPlan,
    canUseBuyBox: entitlements ? hasPlanFeature(entitlements, "buy_box") : false,
  };
}
