import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("deal comment mutation idempotency", () => {
  const action = read("app/actions/deal-comments.ts");
  const panel = read("components/investcalc/deal-comments-panel.tsx");
  const migration = read(
    "supabase/migrations/20260830130000_reconcile_workspace_write_policies.sql",
  );

  it("validates erased server-action inputs before string operations", () => {
    expect(action).toContain("id: unknown");
    expect(action).toContain("body: unknown");
    expect(action).toContain("clientRequestId?: unknown");
    expect(action).toContain("addCommentSchema.safeParse");
    expect(action).toContain("deleteCommentSchema.safeParse");
  });

  it("returns the committed insert row without a fallible second list action", () => {
    expect(action).toContain(
      '.select("id, body, author_name, created_at")',
    );
    expect(action).toContain("comment: mapComment(inserted");
    expect(action).not.toContain("return listDealCommentsAction(dealId)");
  });

  it("reuses the immutable row after a lost insert response", () => {
    expect(action).toContain('error.code === "23505" || error.code === "42501"');
    expect(action).toContain('.eq("client_request_id", requestId)');
    expect(action).toContain("existing.analysis_id === dealId");
    expect(action).toContain("existing.body === trimmed");
    expect(action).not.toContain(".upsert(");

    expect(panel).toContain("const addRequestRef = useRef");
    expect(panel).toContain("existingRequest?.body === body");
    expect(panel).toContain(
      "addDealCommentV2Action(dealAtSubmit, body, requestId)",
    );
    expect(panel).toContain("comment.id !== r.comment.id");
  });

  it("makes delete response loss idempotent without a second list read", () => {
    expect(action).toContain("deletedCommentId: cId");
    expect(action).toContain("if (!deleted)");
    expect(action).toContain('.from("deal_comments")');
    expect(panel).toContain(
      "deleteDealCommentV2Action(dealAtSubmit, commentId)",
    );
    expect(panel).toContain("comment.id !== r.deletedCommentId");
  });

  it("keeps legacy response contracts available during a rolling deploy", () => {
    expect(action).toContain("export async function addDealCommentAction(");
    expect(action).toContain("export async function deleteDealCommentAction(");
    expect(action).toContain("return listDealCommentsAction(id)");
    expect(panel).toContain("addDealCommentV2Action");
    expect(panel).toContain("deleteDealCommentV2Action");
  });

  it("gives every owner request key a database uniqueness authority", () => {
    expect(migration).toContain(
      "add column if not exists client_request_id uuid",
    );
    expect(migration).toContain(
      "deal_comments_user_client_request_uidx",
    );
    expect(migration).toContain("(user_id, client_request_id)");
  });

  it("keeps mutations under authenticated active-parent RLS", () => {
    expect(action).not.toContain("createAdminSupabaseClient");
    expect(action).toContain("const { data: inserted, error } = await supabase");
    expect(action).toContain("const { data: deleted, error } = await supabase");
    expect(action).toContain('if (error.code === "42501")');
    expect(migration).toContain(
      "grant select, insert, delete on table public.deal_comments to authenticated",
    );
    expect(migration).toContain(
      "grant all on table public.deal_comments to service_role",
    );
    expect(migration).not.toContain(
      "grant select, insert, update, delete on table public.deal_comments to authenticated",
    );
    expect(migration).toContain(
      "and public.truecap_owns_saved_analysis(analysis_id, true)",
    );
  });
});
