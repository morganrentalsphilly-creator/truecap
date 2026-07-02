"use server";
import { toServerErrorResult } from "@/lib/db-error";

/**
 * Per-user email preferences. Currently just the rate-alert opt-in
 * (profiles.rate_alert_emails) — the consent toggle the send-rate-alerts
 * cron honors. Tolerant of the migration not being applied yet so the
 * Settings page never breaks before the column exists.
 */
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateAlertEmailsLive } from "@/lib/rate-alerts-mode";

export type EmailPrefsResult =
  | {
      ok: true;
      rateAlertEmails: boolean;
      /**
       * True only when the send-rate-alerts cron will ACTUALLY send emails
       * (RATE_ALERTS_MODE === "live"). Server-derived here so every consent
       * surface (Settings card, inline analyzer nudge) softens its copy to
       * "launching soon" while the cron is dormant — no surface promises an
       * email the system won't send, and the promises come back with zero
       * code changes when the env var flips.
       */
      alertsLive: boolean;
    }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "MIGRATION_PENDING" | "SERVER_ERROR";
      message: string;
    };

function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}

export async function getEmailPreferencesAction(): Promise<EmailPrefsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("rate_alert_emails")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    if (isMissingColumn(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return toServerErrorResult(error, "email-preferences");
  }
  return {
    ok: true,
    rateAlertEmails: Boolean((data as { rate_alert_emails?: boolean } | null)?.rate_alert_emails),
    alertsLive: rateAlertEmailsLive(),
  };
}

export async function setRateAlertEmailsAction(enabled: boolean): Promise<EmailPrefsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ rate_alert_emails: enabled })
    .eq("id", user.id);
  if (error) {
    if (isMissingColumn(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return toServerErrorResult(error, "email-preferences");
  }
  return { ok: true, rateAlertEmails: enabled, alertsLive: rateAlertEmailsLive() };
}
