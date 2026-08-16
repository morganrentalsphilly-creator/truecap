"use server";

import { z } from "zod";
import { toServerErrorResult } from "@/lib/db-error";
import {
  getEntitlementsForUser,
  hasPaidPlanSubscription,
  hasPlanFeature,
} from "@/lib/entitlements";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const dealIdSchema = z.string().uuid();
const watchToggleSchema = z
  .object({
    savedAnalysisId: z.string().uuid(),
    enabled: z.boolean(),
  })
  .strict();
const watchPreferencesSchema = z
  .object({
    savedAnalysisId: z.string().uuid(),
    inAppNotificationsEnabled: z.boolean(),
    emailNotificationsEnabled: z.boolean(),
  })
  .strict();

type WatchErrorCode =
  | "FEATURE_DISABLED"
  | "SIGN_IN_REQUIRED"
  | "ENTITLEMENT_REQUIRED"
  | "MIGRATION_PENDING"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "SERVER_ERROR";

export type SavedDealWatchSettings = {
  subscriptionEnabled: boolean;
  enabledAt: string | null;
  inAppNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  providerLinked: boolean;
  lastObservedAt: string | null;
  /**
   * These remain literal false until a separately reviewed authorized
   * provider, scheduler, and delivery worker exist. The persisted opt-in is
   * not itself evidence that monitoring or notifications are operational.
   */
  automaticChecksActive: false;
  notificationsActive: false;
};

export type SavedDealWatchActionResult =
  | { ok: true; settings: SavedDealWatchSettings }
  | { ok: false; code: WatchErrorCode; message: string };

type WatchSubscriptionRow = {
  id: string;
  enabled: boolean;
  enabled_at: string | null;
  provider_id: string | null;
  provider_listing_id: string | null;
};

type WatchPreferencesRow = {
  in_app_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
};

function featureDisabled(): SavedDealWatchActionResult | null {
  return isFeatureEnabled("saved_deal_watch")
    ? null
    : {
        ok: false,
        code: "FEATURE_DISABLED",
        message: "Saved Deal Watch setup is not enabled yet.",
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

async function requireWatchUser(
  supabase: SupabaseClient
): Promise<
  | { ok: true; userId: string }
  | { ok: false; result: SavedDealWatchActionResult }
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      result: { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." },
    };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  const hasPaidPlan = await hasPaidPlanSubscription(supabase, user.id);
  if (!hasPlanFeature(entitlements, "save_deal") || !hasPaidPlan) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "ENTITLEMENT_REQUIRED",
        message: "Saved Deal Watch is available with Pro or Agent Pro.",
      },
    };
  }
  return { ok: true, userId: user.id };
}

async function requireOwnedDeal(
  supabase: SupabaseClient,
  userId: string,
  savedAnalysisId: string
): Promise<SavedDealWatchActionResult | null> {
  const { data, error } = await supabase
    .from("saved_analyses")
    .select("id")
    .eq("id", savedAnalysisId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return toServerErrorResult(error, "saved-deal-watch");
  return data
    ? null
    : { ok: false, code: "NOT_FOUND", message: "That saved deal no longer exists." };
}

async function loadSettings(
  supabase: SupabaseClient,
  userId: string,
  savedAnalysisId: string
): Promise<SavedDealWatchActionResult> {
  const [watchResult, preferencesResult] = await Promise.all([
    supabase
      .from("saved_deal_watch_subscriptions")
      .select("id, enabled, enabled_at, provider_id, provider_listing_id")
      .eq("saved_analysis_id", savedAnalysisId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("saved_deal_watch_preferences")
      .select("in_app_notifications_enabled, email_notifications_enabled")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (watchResult.error || preferencesResult.error) {
    const error = watchResult.error ?? preferencesResult.error;
    return isMigrationPending(error)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
      : toServerErrorResult(error, "saved-deal-watch");
  }

  const watch = watchResult.data as WatchSubscriptionRow | null;
  const preferences = preferencesResult.data as WatchPreferencesRow | null;
  let lastObservedAt: string | null = null;

  if (watch?.id) {
    const checkpointResult = await supabase
      .from("saved_deal_watch_checkpoints")
      .select("observed_at")
      .eq("watch_id", watch.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (checkpointResult.error) {
      return isMigrationPending(checkpointResult.error)
        ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
        : toServerErrorResult(checkpointResult.error, "saved-deal-watch");
    }
    const checkpoint = checkpointResult.data as { observed_at?: string | null } | null;
    lastObservedAt = checkpoint?.observed_at ?? null;
  }

  return {
    ok: true,
    settings: {
      subscriptionEnabled: Boolean(watch?.enabled),
      enabledAt: watch?.enabled_at ?? null,
      inAppNotificationsEnabled: Boolean(preferences?.in_app_notifications_enabled),
      emailNotificationsEnabled: Boolean(preferences?.email_notifications_enabled),
      providerLinked: Boolean(watch?.provider_id && watch?.provider_listing_id),
      lastObservedAt,
      automaticChecksActive: false,
      notificationsActive: false,
    },
  };
}

export async function getSavedDealWatchAction(
  savedAnalysisIdInput: unknown
): Promise<SavedDealWatchActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;

  const savedAnalysisId = dealIdSchema.safeParse(savedAnalysisIdInput);
  if (!savedAnalysisId.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid saved deal id." };
  }

  const supabase = await createServerSupabaseClient();
  const auth = await requireWatchUser(supabase);
  if (!auth.ok) return auth.result;
  const ownershipError = await requireOwnedDeal(supabase, auth.userId, savedAnalysisId.data);
  if (ownershipError) return ownershipError;
  return loadSettings(supabase, auth.userId, savedAnalysisId.data);
}

export async function setSavedDealWatchEnabledAction(
  input: unknown
): Promise<SavedDealWatchActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;

  const parsed = watchToggleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid watch preference.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const auth = await requireWatchUser(supabase);
  if (!auth.ok) return auth.result;
  const ownershipError = await requireOwnedDeal(
    supabase,
    auth.userId,
    parsed.data.savedAnalysisId
  );
  if (ownershipError) return ownershipError;

  const { error } = await supabase.from("saved_deal_watch_subscriptions").upsert(
    {
      user_id: auth.userId,
      saved_analysis_id: parsed.data.savedAnalysisId,
      enabled: parsed.data.enabled,
    },
    { onConflict: "saved_analysis_id" }
  );
  if (error) {
    return isMigrationPending(error)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
      : toServerErrorResult(error, "saved-deal-watch");
  }

  return loadSettings(supabase, auth.userId, parsed.data.savedAnalysisId);
}

export async function setSavedDealWatchPreferencesAction(
  input: unknown
): Promise<SavedDealWatchActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;

  const parsed = watchPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid notification preference.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const auth = await requireWatchUser(supabase);
  if (!auth.ok) return auth.result;
  const ownershipError = await requireOwnedDeal(
    supabase,
    auth.userId,
    parsed.data.savedAnalysisId
  );
  if (ownershipError) return ownershipError;

  const { error } = await supabase.from("saved_deal_watch_preferences").upsert(
    {
      user_id: auth.userId,
      in_app_notifications_enabled: parsed.data.inAppNotificationsEnabled,
      email_notifications_enabled: parsed.data.emailNotificationsEnabled,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    return isMigrationPending(error)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
      : toServerErrorResult(error, "saved-deal-watch");
  }

  return loadSettings(supabase, auth.userId, parsed.data.savedAnalysisId);
}
