"use server";
import { toServerErrorResult } from "@/lib/db-error";

/**
 * Per-deal comment log (Phase 3 #15) — an append-only, dated journal on a saved
 * deal (seller updates, agent notes, your evolving reasoning). Distinct from
 * the single Deal Notes blob. Owner-scoped; entries are immutable (add/delete,
 * no edit). Tolerant of the 20260622150000_deal_comments migration being
 * unapplied (MIGRATION_PENDING).
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const MAX_BODY = 2_000;

export type DealComment = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
};

export type DealCommentsResult =
  | { ok: true; comments: DealComment[] }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "MIGRATION_PENDING" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR";
      message: string;
    };

function isMissingCommentsTable(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

function mapComment(row: Record<string, unknown>): DealComment {
  return {
    id: String(row.id),
    body: typeof row.body === "string" ? row.body : "",
    authorName: typeof row.author_name === "string" && row.author_name.trim() ? row.author_name : null,
    createdAt: String(row.created_at),
  };
}

async function ownsDeal(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  dealId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("saved_analyses")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  return Boolean(data);
}

export async function listDealCommentsAction(id: string): Promise<DealCommentsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  const dealId = id.trim();
  if (!dealId) return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal id." };
  if (!(await ownsDeal(supabase, dealId, user.id))) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }

  // Admin client: ownership is enforced in-action (ownsDeal above + the
  // user_id/analysis_id filters), so we don't depend on the deal_comments RLS
  // policy, which didn't take during the migration apply.
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("deal_comments")
    .select("id, body, author_name, created_at")
    .eq("analysis_id", dealId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingCommentsTable(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." };
    }
    return toServerErrorResult(error, "deal-comments");
  }
  return { ok: true, comments: (data ?? []).map((r) => mapComment(r as Record<string, unknown>)) };
}

export async function addDealCommentAction(id: string, body: string): Promise<DealCommentsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  const dealId = id.trim();
  if (!dealId) return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal id." };
  const trimmed = (body ?? "").trim().slice(0, MAX_BODY);
  if (!trimmed) return { ok: false, code: "VALIDATION_ERROR", message: "Comment is empty." };
  if (!(await ownsDeal(supabase, dealId, user.id))) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }

  // Denormalize a display name so the log reads nicely without a join.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  const p = (profile ?? {}) as Record<string, unknown>;
  const authorName =
    (typeof p.display_name === "string" && p.display_name.trim()) ||
    `${typeof p.first_name === "string" ? p.first_name : ""} ${typeof p.last_name === "string" ? p.last_name : ""}`.trim() ||
    user.email?.split("@")[0] ||
    null;

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("deal_comments").insert({
    analysis_id: dealId,
    user_id: user.id,
    body: trimmed,
    author_name: authorName,
  });
  if (error) {
    if (isMissingCommentsTable(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." };
    }
    return toServerErrorResult(error, "deal-comments");
  }
  return listDealCommentsAction(dealId);
}

export async function deleteDealCommentAction(id: string, commentId: string): Promise<DealCommentsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  const dealId = id.trim();
  const cId = commentId.trim();
  if (!dealId || !cId) return { ok: false, code: "VALIDATION_ERROR", message: "Invalid id." };

  // Admin client (RLS not relied on); the user_id + analysis_id filters scope
  // the delete to the owner's own comment on their own deal.
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("deal_comments")
    .delete()
    .eq("id", cId)
    .eq("user_id", user.id)
    .eq("analysis_id", dealId);
  if (error) {
    if (isMissingCommentsTable(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." };
    }
    return toServerErrorResult(error, "deal-comments");
  }
  return listDealCommentsAction(dealId);
}
