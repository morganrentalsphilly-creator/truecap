"use server";

import { z } from "zod";
import { toServerErrorResult } from "@/lib/db-error";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  financingProfileInputSchema,
  financingProfileToDbInput,
  rowToFinancingProfile,
  type FinancingProfile,
} from "@/lib/financing-profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_FINANCING_PROFILES = 20;
const PROFILE_COLUMNS =
  "id, name, loan_type, interest_rate_pct, down_payment_pct, ltv_pct, amortization_years, loan_term_years, points_pct, lender_fees, closing_costs_pct, interest_only_months, pmi_annual_rate_pct, pmi_no_cancel, lender_name, notes, last_verified_at, is_active, is_default, terms_version, created_at, updated_at";

export type FinancingProfilesActionResult =
  | { ok: true; profiles: FinancingProfile[] }
  | {
      ok: false;
      code:
        | "FEATURE_DISABLED"
        | "SIGN_IN_REQUIRED"
        | "MIGRATION_PENDING"
        | "VALIDATION_ERROR"
        | "LIMIT_REACHED"
        | "NOT_FOUND"
        | "SERVER_ERROR";
      message: string;
    };

function featureDisabled(): FinancingProfilesActionResult | null {
  return isFeatureEnabled("financing_profiles")
    ? null
    : {
        ok: false,
        code: "FEATURE_DISABLED",
        message: "Financing Profiles are not enabled yet.",
      };
}

function isMigrationPending(error: { code?: string; message?: string } | null): boolean {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "42703" ||
        /relation .* does not exist|column .* does not exist/i.test(error.message ?? ""))
  );
}

async function requireUser(
  supabase: SupabaseClient
): Promise<{ ok: true; userId: string } | { ok: false; result: FinancingProfilesActionResult }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      result: { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." },
    };
  }
  return { ok: true, userId: user.id };
}

async function fetchProfiles(
  supabase: SupabaseClient,
  userId: string
): Promise<FinancingProfilesActionResult> {
  const { data, error } = await supabase
    .from("financing_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    return isMigrationPending(error)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." }
      : toServerErrorResult(error, "financing-profiles");
  }

  return {
    ok: true,
    profiles: (data ?? []).map((row) =>
      rowToFinancingProfile(row as unknown as Record<string, unknown>)
    ),
  };
}

async function clearOtherDefaults(
  supabase: SupabaseClient,
  userId: string,
  exceptId?: string
): Promise<{ error: unknown | null }> {
  let query = supabase
    .from("financing_profiles")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);
  if (exceptId) query = query.neq("id", exceptId);
  const { error } = await query;
  return { error };
}

async function ensureDefault(
  supabase: SupabaseClient,
  userId: string
): Promise<FinancingProfilesActionResult> {
  const listed = await fetchProfiles(supabase, userId);
  if (!listed.ok || listed.profiles.length === 0 || listed.profiles.some((profile) => profile.isDefault)) {
    return listed;
  }
  const firstActive = listed.profiles.find((profile) => profile.isActive) ?? listed.profiles[0];
  if (!firstActive) return listed;
  const { error } = await supabase
    .from("financing_profiles")
    .update({ is_default: true, is_active: true })
    .eq("id", firstActive.id)
    .eq("user_id", userId);
  if (error) return toServerErrorResult(error, "financing-profiles");
  return fetchProfiles(supabase, userId);
}

export async function listFinancingProfilesAction(): Promise<FinancingProfilesActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;
  const supabase = await createServerSupabaseClient();
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.result;
  return fetchProfiles(supabase, auth.userId);
}

export async function createFinancingProfileAction(
  input: unknown
): Promise<FinancingProfilesActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;
  const parsed = financingProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid financing profile.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.result;

  const existing = await fetchProfiles(supabase, auth.userId);
  if (!existing.ok) return existing;
  if (existing.profiles.length >= MAX_FINANCING_PROFILES) {
    return {
      ok: false,
      code: "LIMIT_REACHED",
      message: `You can keep up to ${MAX_FINANCING_PROFILES} financing profiles.`,
    };
  }

  const shouldBeDefault = parsed.data.isDefault || existing.profiles.length === 0;
  if (shouldBeDefault) {
    const cleared = await clearOtherDefaults(supabase, auth.userId);
    if (cleared.error) return toServerErrorResult(cleared.error, "financing-profiles");
  }

  const { error } = await supabase.from("financing_profiles").insert({
    user_id: auth.userId,
    ...financingProfileToDbInput({
      ...parsed.data,
      isActive: shouldBeDefault ? true : parsed.data.isActive,
      isDefault: shouldBeDefault,
    }),
  });
  if (error) {
    if (shouldBeDefault && existing.profiles.length > 0) {
      // The clear + insert cannot be transactional through the generated
      // client. Repair the at-least-one-default invariant if the insert lost
      // a race or failed after the old default was cleared.
      await ensureDefault(supabase, auth.userId);
    }
    return isMigrationPending(error)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." }
      : toServerErrorResult(error, "financing-profiles");
  }
  return fetchProfiles(supabase, auth.userId);
}

export async function updateFinancingProfileAction(
  idInput: unknown,
  input: unknown
): Promise<FinancingProfilesActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;
  const idParsed = z.string().uuid().safeParse(idInput);
  const parsed = financingProfileInputSchema.safeParse(input);
  if (!idParsed.success || !parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.success
        ? "Invalid financing profile id."
        : parsed.error.issues[0]?.message ?? "Invalid financing profile.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.result;

  const { data: owned, error: ownershipError } = await supabase
    .from("financing_profiles")
    .select("id, is_default")
    .eq("id", idParsed.data)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (ownershipError) {
    return isMigrationPending(ownershipError)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." }
      : toServerErrorResult(ownershipError, "financing-profiles");
  }
  if (!owned) {
    return { ok: false, code: "NOT_FOUND", message: "That financing profile no longer exists." };
  }

  if (parsed.data.isDefault) {
    const cleared = await clearOtherDefaults(supabase, auth.userId, idParsed.data);
    if (cleared.error) return toServerErrorResult(cleared.error, "financing-profiles");
  }

  const { data, error } = await supabase
    .from("financing_profiles")
    .update(
      financingProfileToDbInput({
        ...parsed.data,
        isActive: parsed.data.isDefault ? true : parsed.data.isActive,
      })
    )
    .eq("id", idParsed.data)
    .eq("user_id", auth.userId)
    .select("id")
    .maybeSingle();
  if (error) {
    if (parsed.data.isDefault) await ensureDefault(supabase, auth.userId);
    return toServerErrorResult(error, "financing-profiles");
  }
  if (!data) {
    if (parsed.data.isDefault) await ensureDefault(supabase, auth.userId);
    return { ok: false, code: "NOT_FOUND", message: "That financing profile no longer exists." };
  }
  return ensureDefault(supabase, auth.userId);
}

export async function setDefaultFinancingProfileAction(
  idInput: unknown
): Promise<FinancingProfilesActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;
  const id = z.string().uuid().safeParse(idInput);
  if (!id.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid financing profile id." };
  }

  const supabase = await createServerSupabaseClient();
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.result;

  const { data: owned, error: ownershipError } = await supabase
    .from("financing_profiles")
    .select("id")
    .eq("id", id.data)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (ownershipError) {
    return isMigrationPending(ownershipError)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." }
      : toServerErrorResult(ownershipError, "financing-profiles");
  }
  if (!owned) {
    return { ok: false, code: "NOT_FOUND", message: "That financing profile no longer exists." };
  }

  const cleared = await clearOtherDefaults(supabase, auth.userId, id.data);
  if (cleared.error) return toServerErrorResult(cleared.error, "financing-profiles");
  const { error } = await supabase
    .from("financing_profiles")
    .update({ is_default: true, is_active: true })
    .eq("id", id.data)
    .eq("user_id", auth.userId);
  if (error) {
    await ensureDefault(supabase, auth.userId);
    return toServerErrorResult(error, "financing-profiles");
  }
  return fetchProfiles(supabase, auth.userId);
}

export async function deleteFinancingProfileAction(
  idInput: unknown
): Promise<FinancingProfilesActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;
  const id = z.string().uuid().safeParse(idInput);
  if (!id.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid financing profile id." };
  }

  const supabase = await createServerSupabaseClient();
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.result;

  const { data, error } = await supabase
    .from("financing_profiles")
    .delete()
    .eq("id", id.data)
    .eq("user_id", auth.userId)
    .select("id")
    .maybeSingle();
  if (error) {
    return isMigrationPending(error)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." }
      : toServerErrorResult(error, "financing-profiles");
  }
  if (!data) {
    return { ok: false, code: "NOT_FOUND", message: "That financing profile no longer exists." };
  }
  return ensureDefault(supabase, auth.userId);
}
