"use server";

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

const MAX_LABEL = 80;

export type DealLabels = {
  nickname: string | null;
  market: string | null;
  neighborhood: string | null;
};

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

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_LABEL);
  return trimmed.length > 0 ? trimmed : null;
}

function readLabels(row: Record<string, unknown>): DealLabels {
  return {
    nickname: clean(row.nickname),
    market: clean(row.market),
    neighborhood: clean(row.neighborhood),
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
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }
  if (!data) return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  return { ok: true, labels: readLabels(data as Record<string, unknown>) };
}

export async function updateDealLabelsAction(
  id: string,
  input: { nickname?: string | null; market?: string | null; neighborhood?: string | null }
): Promise<DealLabelsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  const dealId = id.trim();
  if (!dealId) return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal id." };

  const patch = {
    nickname: clean(input.nickname),
    market: clean(input.market),
    neighborhood: clean(input.neighborhood),
  };
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
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }
  if (!data) return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  return { ok: true, labels: readLabels(data as Record<string, unknown>) };
}
