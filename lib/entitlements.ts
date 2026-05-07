import type { SupabaseClient } from "@supabase/supabase-js";
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
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plans(entitlements)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plansRow = sub?.plans as { entitlements: unknown } | null | undefined;
  const fromSub = plansRow?.entitlements != null ? parseEntitlements(plansRow.entitlements) : null;
  if (fromSub) return fromSub;

  const { data: free } = await supabase.from("plans").select("entitlements").eq("slug", "free").single();

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
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plans(slug)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plansRow = sub?.plans as { slug?: unknown } | null | undefined;
  const slug = typeof plansRow?.slug === "string" ? plansRow.slug : null;
  return Boolean(slug && slug !== "free");
}

