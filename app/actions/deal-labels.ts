"use server";
import { toServerErrorResult } from "@/lib/db-error";

/**
 * Per-deal investor labels (Phase 2 #11): nickname / market / neighborhood.
 * All free-text, user-entered, optional — no geo lookup. Owner-scoped reads +
 * writes on saved_analyses (RLS already restricts rows to the owner).
 *
 * Tolerant of the 20260622140000_saved_analyses_labels migration being
 * unapplied (MIGRATION_PENDING), so the editor degrades gracefully like the
 * due-diligence card rather than erroring.
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  cleanDealLabel,
  normalizeDealLabelsPatch,
  type DealLabels,
} from "@/lib/deal-labels";

export type { DealLabels } from "@/lib/deal-labels";

export type DealLabelsResult =
  | { ok: true; labels: DealLabels }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "MIGRATION_PENDING" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR";
      message: string;
    };

function isMissingLabelColumn(error: { code?: string; message?: string }): boolean {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}

function readLabels(row: Record<string, unknown>): DealLabels {
  return {
    nickname:
      typeof row.nickname === "string" ? cleanDealLabel(row.nickname) : null,
    market: typeof row.market === "string" ? cleanDealLabel(row.market) : null,
    neighborhood:
      typeof row.neighborhood === "string"
        ? cleanDealLabel(row.neighborhood)
        : null,
  };
}

export async function getDealLabelsAction(id: string): Promise<DealLabelsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  const dealId = id.trim();
  if (!dealId) return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal id." };

  const { data, error } = await supabase
    .from("saved_analyses")
    .select("nickname, market, neighborhood")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    if (isMissingLabelColumn(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return toServerErrorResult(error, "deal-labels");
  }
  if (!data) return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  return { ok: true, labels: readLabels(data as Record<string, unknown>) };
}

export async function updateDealLabelsAction(
  id: string,
  input: unknown,
): Promise<DealLabelsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  const dealId = id.trim();
  if (!dealId) return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal id." };

  // PARTIAL update — only touch the keys actually provided, so editing one
  // field on blur never clobbers another field the caller didn't send.
  const normalized = normalizeDealLabelsPatch(input);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Invalid deal details.",
    };
  }
  const patch = normalized.patch;
  if (Object.keys(patch).length === 0) {
    return getDealLabelsAction(dealId);
  }
  const { data, error } = await supabase
    .from("saved_analyses")
    .update(patch)
    .eq("id", dealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("nickname, market, neighborhood")
    .maybeSingle();
  if (error) {
    if (isMissingLabelColumn(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return toServerErrorResult(error, "deal-labels");
  }
  if (!data) return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  return { ok: true, labels: readLabels(data as Record<string, unknown>) };
}
