"use server";

/**
 * Public-share server actions: create (any analyzer user, signed in or not),
 * list/revoke (owners only).
 *
 * Creation is deliberately open to anonymous users — the analyzer itself is
 * free and anonymous, and their legacy share (everything in the URL) needed no
 * account either. Anonymous shares carry owner_id null: nothing to list, no
 * revocation surface, they simply expire on schedule. Abuse is bounded by the
 * validated payload (the resulting row is exactly one analysis snapshot) and
 * the share only renders what the creator could already see.
 *
 * Revocation goes through the caller's OWN session client, so RLS — not this
 * code — is the boundary that stops cross-account revocation.
 */

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import { mintPublicShare } from "@/lib/public-share";
import { getSiteUrl } from "@/lib/site-url";

export type CreatePublicShareResult =
  | { ok: true; url: string }
  | { ok: false; code: "VALIDATION_ERROR" | "NOT_CONFIGURED"; message: string };

export async function createPublicShareAction(input: unknown): Promise<CreatePublicShareResult> {
  const parsed = z
    .object({
      values: investmentFormSchema,
      title: z.string().trim().max(200).optional(),
      dealId: z.string().uuid().optional(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Couldn't read this analysis." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // dealId attribution is only honored for the deal's real owner — otherwise a
  // crafted call could attach someone else's saved comps/branding to a share.
  let dealId: string | undefined;
  if (parsed.data.dealId && user) {
    const { data: deal } = await supabase
      .from("saved_analyses")
      .select("id")
      .eq("id", parsed.data.dealId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (deal) dealId = parsed.data.dealId;
  }

  const path = await mintPublicShare({
    values: parsed.data.values,
    title: parsed.data.title || parsed.data.values.address || undefined,
    ownerId: user?.id ?? null,
    dealId: dealId ?? null,
  });
  if (!path) {
    // Table not applied yet (migration pending) or insert failed — the caller
    // falls back to the legacy encoded link so sharing keeps working.
    return { ok: false, code: "NOT_CONFIGURED", message: "Opaque shares aren't enabled yet." };
  }
  return { ok: true, url: `${getSiteUrl()}${path}` };
}

export type PublicShareListItem = {
  id: string;
  label: string | null;
  title: string | null;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastViewedAt: string | null;
};

export type ListPublicSharesResult =
  | { ok: true; shares: PublicShareListItem[] }
  | { ok: false; code: "SIGN_IN_REQUIRED" | "NOT_CONFIGURED" | "SERVER_ERROR"; message: string };

export async function listPublicSharesAction(): Promise<ListPublicSharesResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };

  const { data, error } = await supabase
    .from("public_shares")
    .select("id, label, snapshot, created_at, expires_at, revoked_at, last_viewed_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    if (error.code === "42P01") {
      return { ok: false, code: "NOT_CONFIGURED", message: "Shares aren't enabled yet." };
    }
    Sentry.captureException(error, { tags: { feature: "public-shares" } });
    return { ok: false, code: "SERVER_ERROR", message: "Couldn't load your shares." };
  }
  return {
    ok: true,
    shares: ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      label: (row.label as string | null) ?? null,
      title:
        (((row.snapshot as Record<string, unknown> | null)?.meta as Record<string, unknown> | undefined)
          ?.title as string | undefined) ?? null,
      createdAt: String(row.created_at),
      expiresAt: (row.expires_at as string | null) ?? null,
      revokedAt: (row.revoked_at as string | null) ?? null,
      lastViewedAt: (row.last_viewed_at as string | null) ?? null,
    })),
  };
}

export type RevokePublicShareResult =
  | { ok: true }
  | { ok: false; code: "SIGN_IN_REQUIRED" | "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR"; message: string };

/** Revoke (kill the link) — RLS scopes the update to the caller's own rows. */
export async function revokePublicShareAction(input: unknown): Promise<RevokePublicShareResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR", message: "Invalid share." };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };

  const { data, error } = await supabase
    .from("public_shares")
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    Sentry.captureException(error, { tags: { feature: "public-shares" } });
    return { ok: false, code: "SERVER_ERROR", message: "Couldn't revoke the link." };
  }
  if (!data) return { ok: false, code: "NOT_FOUND", message: "That share no longer exists." };
  return { ok: true };
}

// Deliberately no "regenerate" that reuses a row: revoke + create is the same
// outcome with simpler invariants (one token per row, hash immutable).
