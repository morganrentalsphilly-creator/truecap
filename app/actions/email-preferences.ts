"use server";
import { toServerErrorResult } from "@/lib/db-error";

/**
 * Per-user email preferences: the rate-alert opt-in
 * (profiles.rate_alert_emails — the consent the send-rate-alerts cron
 * honors) and the weekly summary opt-in (profiles.weekly_summary_emails —
 * the send-weekly-summary cron's consent; a SEPARATE surface, never
 * shared). Tolerant of either migration not being applied yet so the
 * Settings page never breaks before a column exists.
 */
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateAlertEmailsLive } from "@/lib/rate-alerts-mode";
import { weeklySummaryEmailsLive } from "@/lib/weekly-summary-mode";

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
      /**
       * Weekly summary opt-in. ABSENT (undefined) when the
       * weekly_summary_emails migration isn't applied yet — the weekly
       * toggle self-hides on undefined while the rate-alert toggle keeps
       * working (per-column MIGRATION_PENDING tolerance).
       */
      weeklySummaryEmails?: boolean;
      /** Same alertsLive contract for the weekly summary cron
       *  (WEEKLY_SUMMARY_MODE === "live"). */
      weeklySummaryLive?: boolean;
    }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "MIGRATION_PENDING" | "SERVER_ERROR";
      message: string;
    };

/** Result for the weekly-summary write (its own narrow shape — the ok arm
 *  of EmailPrefsResult requires rate-alert fields this write doesn't know). */
export type WeeklySummaryPrefResult =
  | { ok: true; weeklySummaryEmails: boolean; weeklySummaryLive: boolean }
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
    .select("rate_alert_emails, weekly_summary_emails")
    .eq("id", user.id)
    .maybeSingle();
  if (!error) {
    const row = data as { rate_alert_emails?: boolean; weekly_summary_emails?: boolean } | null;
    return {
      ok: true,
      rateAlertEmails: Boolean(row?.rate_alert_emails),
      alertsLive: rateAlertEmailsLive(),
      weeklySummaryEmails: Boolean(row?.weekly_summary_emails),
      weeklySummaryLive: weeklySummaryEmailsLive(),
    };
  }
  if (isMissingColumn(error)) {
    // The weekly_summary_emails migration may be the missing one — retry
    // with just the rate-alert column so the existing toggle keeps working;
    // the weekly fields stay absent (its toggle self-hides).
    const retry = await supabase
      .from("profiles")
      .select("rate_alert_emails")
      .eq("id", user.id)
      .maybeSingle();
    if (!retry.error) {
      return {
        ok: true,
        rateAlertEmails: Boolean(
          (retry.data as { rate_alert_emails?: boolean } | null)?.rate_alert_emails
        ),
        alertsLive: rateAlertEmailsLive(),
      };
    }
    if (isMissingColumn(retry.error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return toServerErrorResult(retry.error, "email-preferences");
  }
  return toServerErrorResult(error, "email-preferences");
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

export async function setWeeklySummaryEmailsAction(
  enabled: boolean
): Promise<WeeklySummaryPrefResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ weekly_summary_emails: enabled })
    .eq("id", user.id);
  if (error) {
    if (isMissingColumn(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return toServerErrorResult(error, "email-preferences");
  }
  return { ok: true, weeklySummaryEmails: enabled, weeklySummaryLive: weeklySummaryEmailsLive() };
}
