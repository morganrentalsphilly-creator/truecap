"use server";

import { computeDealScore, dealScoreInputSchema, DealScoreResult } from "@/lib/deal-score";
import { toServerErrorResult } from "@/lib/db-error";

export type DealScoreActionResult =
  | { ok: true; tier: "pro"; data: DealScoreResult }
  | { ok: true; tier: "free"; recommendation: DealScoreResult["recommendation"] }
  | { ok: false; code: "VALIDATION_ERROR" | "SERVER_ERROR"; message: string };

export async function getDealScoreAction(input: unknown): Promise<DealScoreActionResult> {
  const parsed = dealScoreInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid Screening Index input." };
  }

  // Screening Index is a FREE feature for every user (moved to the free tier in
  // June 2026 — see pricing-toggle-plans.tsx and canUseDealScore={true} on both
  // homepages). The full 0–100 score + breakdown is no longer gated, so we
  // return the complete payload to everyone.
  //
  // Previously this gated the full `data` behind the `deal_score` entitlement
  // and returned only `recommendation` (tier: "free") to anon/free users — but
  // once the card UI was unlocked, that left free users staring at the empty
  // "Run the analysis to view your live Screening Index" placeholder even after the
  // analysis ran. computeDealScore is a pure function (no secrets, no DB), so
  // there is nothing to protect and no reason to pay for a Supabase
  // auth/entitlement round-trip here — dropping it also makes the score appear
  // faster after the user clicks Run. The `tier: "free"` union member is kept
  // for backwards-compatible typing of existing callers but is no longer
  // returned.
  try {
    return { ok: true, tier: "pro", data: computeDealScore(parsed.data) };
  } catch (error) {
    return toServerErrorResult(error, "deal-score");
  }
}
