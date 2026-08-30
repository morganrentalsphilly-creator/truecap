"use server";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { canonicalizeOwnedProfileAvatarUrl } from "@/lib/profile-avatar-url";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  expectedUserId: z.string().uuid(),
  firstName: z.string().trim().min(1, "First name is required").max(80, "First name is too long"),
  lastName: z.string().trim().max(80, "Last name is too long").optional().default(""),
  avatarUrl: z.string().url("Invalid avatar URL").optional().nullable(),
});

export type UpdateProfileResult =
  | { ok: true }
  | {
      ok: false;
      code: "UNAUTHORIZED" | "SESSION_CHANGED" | "VALIDATION" | "SERVER";
      message: string;
    };

export async function updateProfileAction(input: unknown): Promise<UpdateProfileResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      code: "VALIDATION",
      message:
        fields.firstName?.[0] ??
        fields.lastName?.[0] ??
        fields.avatarUrl?.[0] ??
        "Invalid profile data.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "UNAUTHORIZED", message: "Please sign in again." };
  }
  if (user.id !== parsed.data.expectedUserId) {
    return {
      ok: false,
      code: "SESSION_CHANGED",
      message:
        "Your signed-in account changed. Refresh this page before saving profile changes.",
    };
  }

  const { firstName, lastName, avatarUrl } = parsed.data;
  const canonicalAvatarUrl = avatarUrl
    ? canonicalizeOwnedProfileAvatarUrl({
        avatarUrl,
        userId: user.id,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      })
    : null;
  if (avatarUrl && !canonicalAvatarUrl) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Upload your profile photo through this account before saving it.",
    };
  }
  const fullName = `${firstName} ${lastName ?? ""}`.trim();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName || null,
      display_name: fullName,
      avatar_url: canonicalAvatarUrl,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    // Don't leak the raw Postgres error.message (table/column names) to the
    // client; send it to Sentry for triage instead.
    Sentry.captureException(error, { tags: { feature: "profile" } });
    return { ok: false, code: "SERVER", message: "We couldn't update your profile. Please try again." };
  }
  if (!data) {
    return {
      ok: false,
      code: "SERVER",
      message: "Profile row is missing for this user. Please contact support.",
    };
  }

  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      name: firstName,
      avatar_url: canonicalAvatarUrl,
    },
  });

  if (authUpdateError) {
    // Same reasoning as the profiles UPDATE above: don't leak the raw auth/
    // Postgres error.message to the client; capture it for triage instead.
    Sentry.captureException(authUpdateError, { tags: { feature: "profile" } });
    return { ok: false, code: "SERVER", message: "We couldn't update your profile. Please try again." };
  }

  return { ok: true };
}
