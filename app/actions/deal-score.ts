"use server";

import { computeDealScore, dealScoreInputSchema, DealScoreResult } from "@/lib/deal-score";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DealScoreActionResult =
  | { ok: true; tier: "pro"; data: DealScoreResult }
  | { ok: true; tier: "free"; recommendation: DealScoreResult["recommendation"] }
  | { ok: false; code: "VALIDATION_ERROR" | "SERVER_ERROR"; message: string };

export async function getDealScoreAction(input: unknown): Promise<DealScoreActionResult> {
  const parsed = dealScoreInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal score input." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = computeDealScore(parsed.data);
  if (!user) {
    return { ok: true, tier: "free", recommendation: result.recommendation };
  }

  try {
    const entitlements = await getEntitlementsForUser(supabase, user.id);
    const hasDealScore = entitlements.features.includes("deal_score");
    if (!hasDealScore) {
      return { ok: true, tier: "free", recommendation: result.recommendation };
    }
    return { ok: true, tier: "pro", data: result };
  } catch (error) {
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: error instanceof Error ? error.message : "Could not calculate deal score.",
    };
  }
}
