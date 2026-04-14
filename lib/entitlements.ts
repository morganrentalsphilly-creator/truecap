import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export const planEntitlementsSchema = z.object({
  max_saved_deals: z.number(),
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
