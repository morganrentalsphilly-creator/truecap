import type { SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

const unlimitedSavedDealsValues = new Set(["unlimited", "none", "null"]);

export const planEntitlementsSchema = z.object({
  max_saved_deals: z.preprocess((value) => {
    if (value === null) return null;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (unlimitedSavedDealsValues.has(normalized)) return null;
      if (normalized === "") return undefined;
      return Number(normalized);
    }
    return value;
  }, z.number().int().nonnegative().nullable()),
  features: z.array(z.string()),
});

export type PlanEntitlements = z.infer<typeof planEntitlementsSchema>;

const defaultFree: PlanEntitlements = {
  max_saved_deals: 0,
  features: ["cash_flow"],
};

function parseEntitlements(raw: unknown): PlanEntitlements | null {
  const parsed = planEntitlementsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Effective entitlements for a user: active/trialing/past_due subscription plan, else `free` plan row.
 */
export async function getEntitlementsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanEntitlements> {
  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("plans(entitlements)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Fail CLOSED to free (safer than granting), but never silently: a DB
  // blip here downgrades a paying Pro user to free for the request, which
  // is indistinguishable from a webhook-sync bug when triaging. A burst of
  // these in Sentry says "DB problem", not "sync problem". IDs only —
  // never emails/addresses (sendDefaultPii is on).
  if (subError) {
    Sentry.captureException(subError, {
      tags: { feature: "entitlements" },
      extra: { userId, query: "subscriptions_plans_join" },
    });
  }

  const plansRow = sub?.plans as { entitlements: unknown } | null | undefined;
  const fromSub = plansRow?.entitlements != null ? parseEntitlements(plansRow.entitlements) : null;
  if (fromSub) return fromSub;

  const { data: free, error: freeError } = await supabase
    .from("plans")
    .select("entitlements")
    .eq("slug", "free")
    .single();
  // Same deal: a missing/errored free-plan row hard-falls to defaultFree
  // (max_saved_deals 0) — visible symptom, invisible cause without this.
  if (freeError) {
    Sentry.captureException(freeError, {
      tags: { feature: "entitlements" },
      extra: { userId, query: "free_plan_lookup" },
    });
  }

  return parseEntitlements(free?.entitlements) ?? defaultFree;
}

export function hasPlanFeature(entitlements: Pick<PlanEntitlements, "features">, feature: string): boolean {
  return entitlements.features.includes(feature);
}

export function hasSavedDealCapacity(
  entitlements: Pick<PlanEntitlements, "max_saved_deals">,
  currentSavedDealCount: number
): boolean {
  return entitlements.max_saved_deals === null || currentSavedDealCount < entitlements.max_saved_deals;
}

export function getSavedDealLimitLabel(entitlements: Pick<PlanEntitlements, "max_saved_deals">): string {
  return entitlements.max_saved_deals === null ? "unlimited" : String(entitlements.max_saved_deals);
}

export function hasDashboardAccess(entitlements: Pick<PlanEntitlements, "features">): boolean {
  return hasPlanFeature(entitlements, "dashboard_access") && hasPlanFeature(entitlements, "save_deal");
}

export function hasDashboardInsightsAccess(entitlements: Pick<PlanEntitlements, "features">): boolean {
  return hasDashboardAccess(entitlements) && hasPlanFeature(entitlements, "dashboard_insights");
}

export function getDashboardNavAccess(entitlements: Pick<PlanEntitlements, "features">) {
  return {
    dashboard: hasDashboardAccess(entitlements),
    myDeals: hasPlanFeature(entitlements, "save_deal"),
    compareDeals: hasPlanFeature(entitlements, "compare_deals"),
    templates: hasPlanFeature(entitlements, "template_manage"),
  };
}

export async function hasPaidPlanSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("plans(slug)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Fail closed to "not paid", but surface the query failure — see
  // getEntitlementsForUser above for the rationale.
  if (subError) {
    Sentry.captureException(subError, {
      tags: { feature: "entitlements" },
      extra: { userId, query: "has_paid_plan_subscription" },
    });
  }

  const plansRow = sub?.plans as { slug?: unknown } | null | undefined;
  const slug = typeof plansRow?.slug === "string" ? plansRow.slug : null;
  return Boolean(slug && slug !== "free");
}

/**
 * Has this user EVER had a subscription row — any status, including
 * canceled/incomplete? Mirrors the repeat-trial guard in
 * app/actions/billing.ts (`grantTrial = !priorSubscription`, deliberately
 * status-unfiltered), which denies the free trial to anyone with prior
 * subscription history. Marketing surfaces pair this with
 * willCheckoutGrantTrial() from lib/trial.ts so trial-promising copy never
 * shows to a returning ex-subscriber whose checkout would charge
 * immediately. Head query — existence only, no row payload.
 */
export async function hasAnySubscriptionHistory(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  // Fail open to "no history": worst case the trial copy shows and the
  // checkout guard in billing.ts (the authority) still withholds the trial —
  // the status-quo behavior. Failing closed would hide a real first-time
  // offer from a new subscriber. Surface the query failure either way.
  if (error) {
    Sentry.captureException(error, {
      tags: { feature: "entitlements" },
      extra: { userId, query: "has_any_subscription_history" },
    });
  }
  return (count ?? 0) > 0;
}

