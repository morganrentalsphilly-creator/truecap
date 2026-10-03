import "server-only";

/**
 * Send one funnel-sequence email (lib/funnel-sequences.ts) — the single send
 * path shared by the daily lifecycle cron and the instant T0 welcome.
 *
 * Same contract as the rest of the lifecycle estate:
 *   - CLAIM the lifecycle_email_log row first (unique per recipient + step),
 *     so a step goes out at most once however many runs overlap;
 *   - every send carries List-Unsubscribe (+ one-click) and a footer with the
 *     unsubscribe link and the postal address. Missing either → no send;
 *   - a failed send keeps the claim by default (at-most-once, the right
 *     default for marketing mail). `releaseOnFailure` is for the instant T0
 *     path, where the daily cron is the backstop.
 * Callers gate on LIFECYCLE_EMAILS_MODE and FUNNEL_SEQUENCES; this module
 * only sends.
 */

import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { trackServer } from "@/lib/analytics/site-events-server";
import { buildDripUnsubscribeUrl, hashDripEmail } from "@/lib/email-drip-unsubscribe";
import {
  renderSequenceEmail,
  type RenderedSequenceEmail,
  type SequenceTokens,
} from "@/lib/email/render-sequence";
import {
  selectDueSequenceStep,
  type SequenceId,
  type SequenceVariant,
} from "@/lib/funnel-sequences";
import {
  buildLifecycleUnsubscribeHeaders,
  buildLifecycleUnsubscribeUrl,
  lifecycleSendGate,
  readEmailPostalAddress,
} from "@/lib/email/lifecycle-compliance";
import { classifyResend429, retryAfterMs, type Resend429Kind } from "@/lib/email/resend-pacing";

export type SequenceRecipient =
  | { kind: "lead"; leadId: string; email: string }
  | { kind: "user"; userId: string; email: string };

export type DueSequenceEmail = {
  recipient: SequenceRecipient;
  sequence: SequenceId;
  stepKey: string;
  variant: SequenceVariant;
  tokens: SequenceTokens;
  hasDeal?: boolean;
};

export type PreparedSequenceEmail = {
  rendered: RenderedSequenceEmail;
  headers: Record<string, string>;
};

/** Leads unsubscribe by hashed address (email_suppressions); accounts by the
 *  signed account opt-out (profiles.marketing_opt_out), the same link every
 *  other lifecycle email carries (lib/email/lifecycle-compliance.ts). Both
 *  land on /email/unsubscribe and both builders refuse a non-https site. */
function unsubscribeUrlFor(recipient: SequenceRecipient, siteUrl: string): string | null {
  return recipient.kind === "lead"
    ? buildDripUnsubscribeUrl(siteUrl, recipient.email)
    : buildLifecycleUnsubscribeUrl(siteUrl, recipient.userId);
}

/** Render + compliance headers, or the reason this email must not be sent. */
export async function prepareSequenceEmail(
  due: DueSequenceEmail,
  siteUrl: string,
): Promise<{ ok: true; prepared: PreparedSequenceEmail } | { ok: false; reason: string }> {
  const postalAddress = readEmailPostalAddress();
  if (!postalAddress) return { ok: false, reason: "no_postal_address" };
  const unsubscribeUrl = unsubscribeUrlFor(due.recipient, siteUrl);
  if (!unsubscribeUrl) return { ok: false, reason: "no_unsubscribe_url" };
  const rendered = await renderSequenceEmail({
    sequence: due.sequence,
    stepKey: due.stepKey,
    variant: due.variant,
    siteUrl,
    unsubscribeUrl,
    postalAddress,
    tokens: due.tokens,
    hasDeal: due.hasDeal,
  });
  if (!rendered) return { ok: false, reason: "missing_content" };
  return {
    ok: true,
    prepared: { rendered, headers: buildLifecycleUnsubscribeHeaders(unsubscribeUrl) },
  };
}

const recipientColumn = (recipient: SequenceRecipient) =>
  recipient.kind === "lead"
    ? ({ column: "lead_id", id: recipient.leadId } as const)
    : ({ column: "user_id", id: recipient.userId } as const);

export type SequenceSendResult = {
  sent: boolean;
  reason?: string;
  /** Set when Resend answered 429. Nothing was sent and the claim was
   *  released, so a later run retries; the cron uses this to pace or stop. */
  rateLimited?: { kind: Resend429Kind; retryAfterMs: number };
};

/** Claim → send → stamp. Never throws. */
export async function sendSequenceEmail(
  admin: SupabaseClient,
  due: DueSequenceEmail,
  prepared: PreparedSequenceEmail,
  options: { resendKey: string; trigger: "cron" | "instant"; releaseOnFailure?: boolean },
): Promise<SequenceSendResult> {
  const { column, id } = recipientColumn(due.recipient);
  try {
    const { error: claimErr } = await admin
      .from("lifecycle_email_log")
      .insert({ [column]: id, email_key: due.stepKey });
    if (claimErr) {
      if (claimErr.code === "23505") return { sent: false, reason: "already_sent" };
      Sentry.captureMessage("sequence email: claim failed", {
        level: "error",
        tags: { feature: "lifecycle-emails", sequence: due.sequence },
        extra: { step: due.stepKey, code: claimErr.code },
      });
      return { sent: false, reason: "claim_failed" };
    }
    const release = async () => {
      if (!options.releaseOnFailure) return;
      await admin
        .from("lifecycle_email_log")
        .delete()
        .eq(column, id)
        .eq("email_key", due.stepKey)
        .is("resend_id", null);
    };

    const env = process.env;
    let res: Response;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>",
          to: due.recipient.email,
          reply_to: env.EMAIL_REPLY_TO || "hello@usetruecap.com",
          subject: prepared.rendered.subject,
          text: prepared.rendered.text,
          html: prepared.rendered.html,
          headers: prepared.headers,
          tags: [
            { name: "purpose", value: "lifecycle" },
            { name: "lifecycle_kind", value: "sequence" },
            { name: "audience", value: due.sequence === "memo_lead" ? "memo_lead" : "trial" },
            { name: "sequence_step", value: due.stepKey },
            { name: "variant", value: due.variant },
            { name: "trigger", value: options.trigger },
          ],
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // A timeout may have delivered: keep the claim even on the instant path.
      Sentry.captureMessage("sequence email: Resend network error", {
        level: "error",
        tags: { feature: "lifecycle-emails", sequence: due.sequence },
        extra: { step: due.stepKey },
      });
      return { sent: false, reason: "network" };
    }
    if (res.status === 429) {
      // Refused, not sent: always release so the next run retries the step
      // while it is still inside its window.
      const body = await res.text().catch(() => "");
      await admin
        .from("lifecycle_email_log")
        .delete()
        .eq(column, id)
        .eq("email_key", due.stepKey)
        .is("resend_id", null)
        .then(() => undefined, () => undefined);
      return {
        sent: false,
        reason: "resend_429",
        rateLimited: {
          kind: classifyResend429(body),
          retryAfterMs: retryAfterMs(res.headers.get("retry-after")),
        },
      };
    }
    if (!res.ok) {
      await release();
      Sentry.captureMessage(`sequence email: Resend send failed (${res.status})`, {
        level: "error",
        tags: { feature: "lifecycle-emails", sequence: due.sequence },
        // Provider bodies can echo the recipient; keep only the status.
        extra: { step: due.stepKey },
      });
      return { sent: false, reason: `resend_${res.status}` };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    if (json.id) {
      await admin
        .from("lifecycle_email_log")
        .update({ resend_id: json.id })
        .eq(column, id)
        .eq("email_key", due.stepKey)
        .then(() => undefined, () => undefined);
    }
    await trackServer("sequence_email_sent", {
      sequence: due.sequence,
      step: due.stepKey,
      variant: due.variant,
    });
    return { sent: true };
  } catch {
    return { sent: false, reason: "exception" };
  }
}

/**
 * Instant T0 for a just-confirmed account (app/auth/callback). The callback
 * also runs on every later OAuth login, so this asks the scheduler whether T0
 * is actually due — a new trial, not yet welcomed — before sending anything.
 * A failed send releases the claim so the daily cron backstops it.
 * Best-effort: never throws.
 */
export async function sendTrialWelcomeNow(
  admin: SupabaseClient,
  user: { id: string; email: string; agentIntent: boolean },
  siteUrl: string,
): Promise<SequenceSendResult> {
  try {
    // The one lifecycle send gate: live mode, a postal address, a signable
    // unsubscribe link.
    const gate = lifecycleSendGate(siteUrl);
    if (!gate.open) return { sent: false, reason: gate.reason };
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return { sent: false, reason: "no_resend_key" };

    const [evaluation, log, profile, suppression] = await Promise.all([
      admin.from("product_evaluations").select("started_at").eq("user_id", user.id).maybeSingle(),
      admin.from("lifecycle_email_log").select("email_key").eq("user_id", user.id),
      admin.from("profiles").select("marketing_opt_out").eq("id", user.id).maybeSingle(),
      admin
        .from("email_suppressions")
        .select("email_hash")
        .eq("email_hash", hashDripEmail(user.email))
        .maybeSingle(),
    ]);
    // Any unreadable exit source → leave it to the cron, which fails closed.
    if (evaluation.error || log.error || profile.error || suppression.error) {
      return { sent: false, reason: "state_unavailable" };
    }
    const startAt = evaluation.data?.started_at as string | undefined;
    if (!startAt) return { sent: false, reason: "no_trial" };
    const step = selectDueSequenceStep({
      sequence: "trial",
      startAt,
      sentKeys: (log.data ?? []).map((r) => r.email_key as string),
      unsubscribed: profile.data?.marketing_opt_out === true || Boolean(suppression.data),
      // A brand-new account has no subscription; the cron re-checks daily.
      converted: false,
    });
    if (step?.key !== "T0") return { sent: false, reason: "not_due" };

    const due: DueSequenceEmail = {
      recipient: { kind: "user", userId: user.id, email: user.email },
      sequence: "trial",
      stepKey: "T0",
      variant: user.agentIntent ? "agent" : "investor",
      tokens: {},
    };
    const prepared = await prepareSequenceEmail(due, siteUrl);
    if (!prepared.ok) return { sent: false, reason: prepared.reason };
    return await sendSequenceEmail(admin, due, prepared.prepared, {
      resendKey,
      trigger: "instant",
      releaseOnFailure: true,
    });
  } catch {
    return { sent: false, reason: "exception" };
  }
}
