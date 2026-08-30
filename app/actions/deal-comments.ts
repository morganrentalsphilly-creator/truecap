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
import { z } from "zod";

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

type DealCommentsFailure = Exclude<DealCommentsResult, { ok: true }>;

export type AddDealCommentResult =
  | { ok: true; comment: DealComment }
  | DealCommentsFailure;

export type DeleteDealCommentResult =
  | { ok: true; deletedCommentId: string }
  | DealCommentsFailure;

const dealIdSchema = z.string().trim().uuid();
const addCommentSchema = z.object({
  id: dealIdSchema,
  body: z.string(),
  // Optional only for rolling-deploy compatibility with an older client.
  // The current client always supplies and retains this across retries.
  clientRequestId: z.string().uuid().optional(),
});
const deleteCommentSchema = z.object({
  id: dealIdSchema,
  commentId: z.string().trim().uuid(),
});

function isMissingCommentsSchema(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    /relation .* does not exist|column .* does not exist/i.test(
      error.message ?? "",
    )
  );
}

function mapComment(row: Record<string, unknown>): DealComment {
  return {
    id: String(row.id),
    body: typeof row.body === "string" ? row.body : "",
    authorName: typeof row.author_name === "string" && row.author_name.trim() ? row.author_name : null,
    createdAt: String(row.created_at),
  };
}

async function requireOwnedActiveDeal(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  dealId: string,
  userId: string
): Promise<DealCommentsFailure | null> {
  const { data, error } = await supabase
    .from("saved_analyses")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return toServerErrorResult(error, "deal-comments");
  return data
    ? null
    : { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
}

export async function listDealCommentsAction(id: unknown): Promise<DealCommentsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  const parsedId = dealIdSchema.safeParse(id);
  if (!parsedId.success)
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal id." };
  const dealId = parsedId.data;
  const ownershipError = await requireOwnedActiveDeal(
    supabase,
    dealId,
    user.id,
  );
  if (ownershipError) return ownershipError;

  // Keep the read under the authenticated database identity. The explicit
  // owner filters make the boundary obvious here; RLS remains the authority if
  // the account changes or the parent is removed while this request is live.
  const { data, error } = await supabase
    .from("deal_comments")
    .select("id, body, author_name, created_at")
    .eq("analysis_id", dealId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingCommentsSchema(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return toServerErrorResult(error, "deal-comments");
  }
  return { ok: true, comments: (data ?? []).map((r) => mapComment(r as Record<string, unknown>)) };
}

export async function addDealCommentV2Action(
  id: unknown,
  body: unknown,
  clientRequestId?: unknown,
): Promise<AddDealCommentResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  const parsed = addCommentSchema.safeParse({ id, body, clientRequestId });
  if (!parsed.success)
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid comment." };
  const dealId = parsed.data.id;
  const trimmed = parsed.data.body.trim().slice(0, MAX_BODY);
  if (!trimmed) return { ok: false, code: "VALIDATION_ERROR", message: "Comment is empty." };
  const ownershipError = await requireOwnedActiveDeal(
    supabase,
    dealId,
    user.id,
  );
  if (ownershipError) return ownershipError;

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

  const requestId = parsed.data.clientRequestId ?? crypto.randomUUID();
  const { data: inserted, error } = await supabase
    .from("deal_comments")
    .insert({
      analysis_id: dealId,
      user_id: user.id,
      body: trimmed,
      author_name: authorName,
      client_request_id: requestId,
    })
    .select("id, body, author_name, created_at")
    .single();
  if (error) {
    if (isMissingCommentsSchema(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    // The browser deliberately reuses clientRequestId after an interrupted
    // response. If the INSERT committed but its response was lost, the retry
    // reaches this unique index. Return the exact existing immutable row only
    // when it still matches the same deal/body; never turn key reuse into an
    // UPDATE of another comment.
    if (
      (error.code === "23505" || error.code === "42501") &&
      parsed.data.clientRequestId
    ) {
      const { data: existing, error: existingError } = await supabase
        .from("deal_comments")
        .select("id, analysis_id, body, author_name, created_at")
        .eq("user_id", user.id)
        .eq("client_request_id", requestId)
        .maybeSingle();
      if (existingError) {
        return isMissingCommentsSchema(existingError)
          ? {
              ok: false,
              code: "MIGRATION_PENDING",
              message: "Schema migration pending.",
            }
          : toServerErrorResult(existingError, "deal-comments");
      }
      if (
        existing &&
        existing.analysis_id === dealId &&
        existing.body === trimmed
      ) {
        return {
          ok: true,
          comment: mapComment(existing as Record<string, unknown>),
        };
      }
    }
    // An active-parent RLS denial after the successful ownership preflight is
    // normally a concurrent soft-delete. Re-read so a real policy/grant fault
    // on a still-active deal remains observable as SERVER_ERROR.
    if (error.code === "42501") {
      const activeDealError = await requireOwnedActiveDeal(
        supabase,
        dealId,
        user.id,
      );
      if (activeDealError) return activeDealError;
    }
    return toServerErrorResult(error, "deal-comments");
  }
  return {
    ok: true,
    comment: mapComment(inserted as Record<string, unknown>),
  };
}

/**
 * Legacy response contract retained for already-open clients during a rolling
 * deployment. New code uses the V2 mutation result so a committed write never
 * depends on this follow-up list read.
 */
export async function addDealCommentAction(
  id: unknown,
  body: unknown,
): Promise<DealCommentsResult> {
  const result = await addDealCommentV2Action(id, body);
  if (!result.ok) return result;
  return listDealCommentsAction(id);
}

export async function deleteDealCommentV2Action(
  id: unknown,
  commentId: unknown,
): Promise<DeleteDealCommentResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  const parsed = deleteCommentSchema.safeParse({ id, commentId });
  if (!parsed.success)
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid id." };
  const dealId = parsed.data.id;
  const cId = parsed.data.commentId;
  const ownershipError = await requireOwnedActiveDeal(
    supabase,
    dealId,
    user.id,
  );
  if (ownershipError) return ownershipError;

  // The active-parent DELETE policy is evaluated in the same database
  // statement as the mutation, closing the preflight -> soft-delete race that
  // a service-role write would bypass.
  const { data: deleted, error } = await supabase
    .from("deal_comments")
    .delete()
    .eq("id", cId)
    .eq("user_id", user.id)
    .eq("analysis_id", dealId)
    .select("id")
    .maybeSingle();
  if (error) {
    if (isMissingCommentsSchema(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    if (error.code === "42501") {
      const activeDealError = await requireOwnedActiveDeal(
        supabase,
        dealId,
        user.id,
      );
      if (activeDealError) return activeDealError;
    }
    return toServerErrorResult(error, "deal-comments");
  }
  if (!deleted) {
    // A repeated delete after a lost response is success. If the row is still
    // owner-visible, however, RLS skipped it because the parent is no longer
    // active; report that stale workspace instead of claiming deletion.
    const { data: existing, error: existingError } = await supabase
      .from("deal_comments")
      .select("id")
      .eq("id", cId)
      .eq("user_id", user.id)
      .eq("analysis_id", dealId)
      .maybeSingle();
    if (existingError) {
      return isMissingCommentsSchema(existingError)
        ? {
            ok: false,
            code: "MIGRATION_PENDING",
            message: "Schema migration pending.",
          }
        : toServerErrorResult(existingError, "deal-comments");
    }
    if (existing) {
      return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
    }
  }
  // Deletion is idempotent. A lost response followed by a retry returns no
  // row, but the desired state is already true and must not be shown as a
  // failure that leaves a ghost row in the UI.
  return { ok: true, deletedCommentId: cId };
}

/** Legacy rolling-deploy response contract; see addDealCommentAction. */
export async function deleteDealCommentAction(
  id: unknown,
  commentId: unknown,
): Promise<DealCommentsResult> {
  const result = await deleteDealCommentV2Action(id, commentId);
  if (!result.ok) return result;
  return listDealCommentsAction(id);
}
