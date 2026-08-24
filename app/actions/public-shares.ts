"use server";

/**
 * Public-share server actions: create/list/revoke (signed-in owners only).
 *
 * Existing opaque shares remain publicly readable by capability token,
 * including historical rows whose owner_id is null. New rows, however, must
 * be attached to an authenticated owner so the product can accurately promise
 * revocation. Authentication therefore happens before the service-role mint.
 *
 * Revocation goes through the caller's OWN session client, so RLS — not this
 * code — is the boundary that stops cross-account revocation.
 */

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import {
  mintPublicShare,
  type PublicShareAddressVisibility,
  type PublicShareAudience,
} from "@/lib/public-share";
import { getSiteUrl } from "@/lib/site-url";
import { createIpRateLimit, getRequestIp } from "@/lib/ip-rate-limit";
import {
  normalizeMaoTarget,
  normalizeMaoTargetForFinancing,
} from "@/lib/mao-target-editor";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { captureServerEvent } from "@/lib/posthog-server";

export type CreatePublicShareResult =
  | { ok: true; url: string }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "VALIDATION_ERROR" | "NOT_CONFIGURED";
      message: string;
    };

/**
 * Creating a link remains a free capability, but requires a signed-in owner.
 * The service-role insert bypasses RLS, so the session check in the action and
 * the required owner id in mintPublicShare are both load-bearing boundaries.
 * The IP brake remains defense in depth above normal human pace.
 */
const shareRateLimit = createIpRateLimit({
  windowMs: 60 * 60 * 1000,
  maxPerWindow: 40,
});

export async function createPublicShareAction(input: unknown): Promise<CreatePublicShareResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Sign in to create a revocable share link.",
    };
  }

  const parsed = z
    .object({
      values: investmentFormSchema,
      title: z.string().trim().max(200).optional(),
      dealId: z.string().uuid().optional(),
      maoTarget: z.unknown().optional(),
      maoTargetSource: z
        .enum(["buy-box", "screening-defaults", "selected-targets"])
        .optional(),
      audience: z.enum(["investment-partner", "client", "lender-review"]).optional(),
      addressVisibility: z.enum(["hidden", "full"]).optional(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Couldn't read this analysis." };
  }
  const parsedMaoTarget =
    parsed.data.maoTarget === undefined ? undefined : normalizeMaoTarget(parsed.data.maoTarget);
  if (parsed.data.maoTarget !== undefined && !parsedMaoTarget) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Couldn't read these targets." };
  }
  const maoTarget = parsedMaoTarget
    ? normalizeMaoTargetForFinancing(parsedMaoTarget, {
        isCashPurchase: calculateAnalysis(parsed.data.values).monthlyPayment <= 0,
      }) ?? undefined
    : undefined;

  if (shareRateLimit.isOverLimit(await getRequestIp())) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Too many share links created. Please wait a few minutes and try again.",
    };
  }

  // dealId attribution is only honored for the deal's real owner — otherwise a
  // crafted call could attach someone else's saved comps/branding to a share.
  let dealId: string | undefined;
  if (parsed.data.dealId) {
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
    title:
      parsed.data.addressVisibility === "full"
        ? parsed.data.title || parsed.data.values.address || undefined
        : "Shared rental analysis",
    ownerId: user.id,
    dealId: dealId ?? null,
    maoTarget: maoTarget ?? undefined,
    maoTargetSource: parsed.data.maoTargetSource,
    audience: (parsed.data.audience ?? "investment-partner") as PublicShareAudience,
    addressVisibility: (parsed.data.addressVisibility ?? "hidden") as PublicShareAddressVisibility,
  });
  if (!path) {
    // Never fall back to a URL containing the analysis payload. Existing /d
    // links remain readable, but all newly minted links fail closed to opaque.
    return { ok: false, code: "NOT_CONFIGURED", message: "Secure sharing is temporarily unavailable." };
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
  await captureServerEvent({ distinctId: user.id, event: "share_revoked" });
  return { ok: true };
}

// Deliberately no "regenerate" that reuses a row: revoke + create is the same
// outcome with simpler invariants (one token per row, hash immutable).
