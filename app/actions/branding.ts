"use server";

/**
 * Custom branding server actions for Pro+ users.
 *
 * Three actions:
 *   - getBranding(): fetches the current user's branding row (or null)
 *   - saveBranding(values): upserts the branding row
 *   - uploadBrandingLogo(formData): uploads a logo to Supabase Storage,
 *     returns the public URL ready to save to branding.logo_url
 *
 * All three follow the codebase's discriminated-union Result pattern
 * (see lib/supabase admin / saved-analyses for canonical examples).
 *
 * Entitlement gate: every action checks hasPlanFeature(custom_branding).
 * Free-tier users get ENTITLEMENT_REQUIRED. We still allow READ on a row
 * that exists (so a user who downgrades doesn't see a 403 if they re-
 * upgrade), but writes are gated.
 *
 * Storage: logos live in the public `branding-logos` bucket at the path
 * `<user_id>/<timestamp>-<safe_filename>`. The RLS policies on
 * storage.objects enforce the owner-only-write constraint server-side,
 * so a hostile client can't write to another user's path even if they
 * bypass this action.
 */

import * as Sentry from "@sentry/nextjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toServerErrorResult } from "@/lib/db-error";
import {
  brandingValuesSchema,
  type BrandingValues,
} from "@/lib/branding-values";
import {
  getEntitlementsForUser,
  hasPlanFeature,
} from "@/lib/entitlements";
import {
  accountSessionChangedResult,
  expectedAccountUserMatches,
} from "@/lib/account-session-binding";

export type { BrandingValues } from "@/lib/branding-values";

export type BrandingRow = BrandingValues & {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type GetBrandingResult =
  | { ok: true; branding: BrandingRow | null }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "SERVER_ERROR";
      message: string;
    };

export type SaveBrandingResult =
  | { ok: true; branding: BrandingRow }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "SESSION_CHANGED"
        | "ENTITLEMENT_REQUIRED"
        | "VALIDATION_ERROR"
        | "SERVER_ERROR";
      message: string;
    };

export type UploadBrandingLogoResult =
  | { ok: true; url: string; path: string }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "SESSION_CHANGED"
        | "ENTITLEMENT_REQUIRED"
        | "VALIDATION_ERROR"
        | "UPLOAD_FAILED";
      message: string;
    };

/**
 * Fetch the current user's branding row (or null if not configured yet).
 * Returns null branding for entitled users with no row — the caller is
 * expected to render an empty form state. Returns ENTITLEMENT_REQUIRED
 * only for unentitled users.
 */
export async function getBranding(): Promise<GetBrandingResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Sign in to manage branding.",
    };
  }

  // We intentionally DO NOT gate read on entitlement — a user who
  // downgraded should still be able to see their saved branding so
  // re-upgrade is friction-free. The PDF generator gates application
  // separately at export time.
  const { data, error } = await supabase
    .from("branding")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Couldn't load branding.",
    };
  }
  return { ok: true, branding: (data as BrandingRow | null) ?? null };
}

/**
 * Upsert the current user's branding row.
 * Gated behind the `custom_branding` Pro entitlement.
 */
export async function saveBranding(
  rawValues: unknown,
  expectedUserId: unknown,
): Promise<SaveBrandingResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Sign in to save branding.",
    };
  }
  if (!expectedAccountUserMatches(expectedUserId, user.id)) {
    return accountSessionChangedResult();
  }

  // Entitlement check
  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "custom_branding")) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Upgrade to Pro to customize report branding.",
    };
  }

  // Validate
  const parsed = brandingValuesSchema.safeParse(rawValues);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: first?.message ?? "Invalid input.",
    };
  }
  const values = parsed.data;

  // Upsert by user_id (unique constraint exists in schema)
  const { data, error } = await supabase
    .from("branding")
    .upsert(
      { user_id: user.id, ...values },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    return toServerErrorResult(error, "branding");
  }
  return { ok: true, branding: data as BrandingRow };
}

/**
 * Upload a logo to Supabase Storage. Returns the public URL on success.
 *
 * Constraints enforced server-side:
 *   - PNG or JPEG only (storage bucket also enforces via allowed_mime_types)
 *   - 1 MB hard cap (storage bucket enforces, we check upfront for UX)
 *   - File path = <user_id>/<timestamp>-<safe_filename>, which satisfies
 *     the storage.objects RLS policy that requires the first folder
 *     segment to match auth.uid().
 *
 * Caller is expected to pass formData with a "file" field. Returns the
 * public URL the caller can save into branding.logo_url via saveBranding.
 */
export async function uploadBrandingLogo(
  formData: FormData,
  expectedUserId: unknown,
): Promise<UploadBrandingLogoResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Sign in to upload a logo.",
    };
  }
  if (!expectedAccountUserMatches(expectedUserId, user.id)) {
    return accountSessionChangedResult();
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "custom_branding")) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Upgrade to Pro to upload a custom logo.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "No file received.",
    };
  }
  if (!["image/png", "image/jpeg"].includes(file.type)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Logo must be a PNG or JPEG image.",
    };
  }
  if (file.size > 1_048_576) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Logo must be 1 MB or smaller.",
    };
  }

  // Safe filename: strip path separators + spaces, prefix with timestamp
  // so re-uploads don't collide. Storage path includes the user_id folder
  // as the FIRST segment, which the RLS policy uses to verify ownership.
  const ext = file.type === "image/png" ? "png" : "jpg";
  const ts = Date.now();
  const path = `${user.id}/logo-${ts}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("branding-logos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    // Storage upload errors can carry bucket/policy internals — don't hand the
    // raw message to the client. Capture for triage and keep the distinct
    // UPLOAD_FAILED code (callers branch on it) with a generic message.
    Sentry.captureException(uploadError, { tags: { feature: "branding" } });
    return {
      ok: false,
      code: "UPLOAD_FAILED",
      message: "Upload failed. Please try again.",
    };
  }

  // Public bucket — the public URL is the canonical address. The caller
  // can save this directly into branding.logo_url.
  const { data: pub } = supabase.storage
    .from("branding-logos")
    .getPublicUrl(path);

  return { ok: true, url: pub.publicUrl, path };
}
