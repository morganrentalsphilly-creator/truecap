import "server-only";

/**
 * Send a single lifecycle email immediately (used for instant
 * welcome-on-confirm from app/auth/callback). Reuses the same content +
 * renderer as the daily cron, and writes to the same lifecycle_email_log
 * table, so the two paths can never double-send.
 *
 * Once-only contract: we CLAIM the lifecycle_email_log row (unique on
 * user_id + email_key) BEFORE sending. If the claim conflicts (23505),
 * the cron or a prior confirm already handled it — skip. If rendering or
 * the Resend call fails, we RELEASE the claim so the daily cron backstops
 * it on its next run.
 *
 * Best-effort: never throws. Uses the same send gate as the cron
 * (lib/email/lifecycle-compliance.ts): LIFECYCLE_EMAILS_MODE=live AND
 * EMAIL_POSTAL_ADDRESS set AND a signable unsubscribe link. A closed gate
 * sends nothing; when the mode is live and something else is missing it logs
 * one line that names it.
 *
 * The auth callback calls this on every sign-in, not only the first one, so
 * the checks the cron makes per user are made here too, before the claim:
 *   - the welcome age guard: an account older than WELCOME_MAX_AGE_DAYS gets
 *     no late welcome when it next signs in (the cron retires the key);
 *   - the opt-out: profiles.marketing_opt_out true, an unreadable opt-out, or
 *     no profile row all mean "do not send".
 * The email carries the signed unsubscribe link, the postal address and the
 * RFC 8058 List-Unsubscribe headers.
 */

import * as Sentry from "@sentry/nextjs";
import { renderLifecycleEmail } from "@/lib/email/render-lifecycle";
import {
  buildLifecycleUnsubscribeHeaders,
  buildLifecycleUnsubscribeUrl,
  describeLifecycleBlock,
  lifecycleSendGate,
  welcomeWindowPassed,
} from "@/lib/email/lifecycle-compliance";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { DueLifecycleEmail } from "@/lib/lifecycle-emails";

export type SendNowResult = { sent: boolean; reason?: string };

export async function sendLifecycleEmailNow(
  due: DueLifecycleEmail,
  siteUrl: string
): Promise<SendNowResult> {
  try {
    const gate = lifecycleSendGate(siteUrl);
    if (!gate.open) {
      if (gate.reason === "mode_off" || gate.reason === "mode_dry") {
        return { sent: false, reason: "mode_not_live" };
      }
      console.log(
        `[lifecycle] BLOCKED — ${due.key} not sent: ${describeLifecycleBlock(gate.reason)}`
      );
      return { sent: false, reason: gate.reason };
    }
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return { sent: false, reason: "no_resend_key" };

    const unsubscribeUrl = buildLifecycleUnsubscribeUrl(siteUrl, due.userId);
    if (!unsubscribeUrl) return { sent: false, reason: "unsubscribe_unsignable" };

    const admin = createAdminSupabaseClient();

    // Welcome age guard. The sign-up date comes from the auth record, the
    // same source the cron uses.
    if (due.kind === "welcome") {
      const { data: userData, error: userErr } = await admin.auth.admin.getUserById(due.userId);
      const createdAt = userData?.user?.created_at;
      if (userErr || !createdAt) return { sent: false, reason: "signup_date_unavailable" };
      if (welcomeWindowPassed(createdAt)) return { sent: false, reason: "welcome_window_passed" };
    }

    // Opt-out. Anything other than a readable `false` is a no.
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("marketing_opt_out")
      .eq("id", due.userId)
      .maybeSingle();
    if (profileErr) return { sent: false, reason: "opt_out_unreadable" };
    if (!profile) return { sent: false, reason: "no_profile" };
    if ((profile as { marketing_opt_out?: boolean | null }).marketing_opt_out !== false) {
      return { sent: false, reason: "opted_out" };
    }

    // 1. Claim the row first — unique (user_id, email_key) guarantees the
    //    daily cron won't also send this.
    const { error: claimErr } = await admin
      .from("lifecycle_email_log")
      .insert({ user_id: due.userId, email_key: due.key });
    if (claimErr) {
      if (claimErr.code === "23505") return { sent: false, reason: "already_sent" };
      return { sent: false, reason: `claim_failed:${claimErr.code ?? "unknown"}` };
    }

    const release = async () => {
      await admin
        .from("lifecycle_email_log")
        .delete()
        .eq("user_id", due.userId)
        .eq("email_key", due.key);
    };

    // 2. Render.
    const rendered = await renderLifecycleEmail(due, siteUrl, {
      unsubscribeUrl,
      postalAddress: gate.postalAddress,
    });
    if (!rendered) {
      await release();
      return { sent: false, reason: "render_failed" };
    }

    // 3. Send via Resend.
    const from = process.env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: due.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers: buildLifecycleUnsubscribeHeaders(unsubscribeUrl),
        tags: [
          { name: "purpose", value: "lifecycle" },
          { name: "lifecycle_kind", value: due.kind },
          { name: "trigger", value: "instant" },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      await release(); // let the cron backstop it
      const body = await res.text().catch(() => "");
      Sentry.captureMessage(`instant lifecycle send failed (${res.status})`, {
        level: "warning",
        tags: { feature: "lifecycle-emails" },
        extra: { key: due.key, body: body.slice(0, 200) },
      });
      return { sent: false, reason: `resend_${res.status}` };
    }

    const json = (await res.json().catch(() => ({}))) as { id?: string };
    if (json.id) {
      await admin
        .from("lifecycle_email_log")
        .update({ resend_id: json.id })
        .eq("user_id", due.userId)
        .eq("email_key", due.key);
    }
    return { sent: true };
  } catch (err) {
    Sentry.captureMessage("instant lifecycle send error", {
      level: "warning",
      tags: { feature: "lifecycle-emails" },
      extra: { message: err instanceof Error ? err.message : String(err) },
    });
    return { sent: false, reason: "exception" };
  }
}
