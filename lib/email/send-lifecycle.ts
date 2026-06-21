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
 * Best-effort: never throws. Gated by LIFECYCLE_EMAILS_MODE=live, same as
 * the cron, so it stays dormant until the lifecycle system is switched on.
 */

import * as Sentry from "@sentry/nextjs";
import { renderLifecycleEmail } from "@/lib/email/render-lifecycle";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { DueLifecycleEmail } from "@/lib/lifecycle-emails";

function modeIsLive(): boolean {
  return (process.env.LIFECYCLE_EMAILS_MODE ?? "off").trim().toLowerCase() === "live";
}

export type SendNowResult = { sent: boolean; reason?: string };

export async function sendLifecycleEmailNow(
  due: DueLifecycleEmail,
  siteUrl: string
): Promise<SendNowResult> {
  try {
    if (!modeIsLive()) return { sent: false, reason: "mode_not_live" };
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return { sent: false, reason: "no_resend_key" };

    const admin = createAdminSupabaseClient();

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
    const rendered = await renderLifecycleEmail(due, siteUrl);
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
