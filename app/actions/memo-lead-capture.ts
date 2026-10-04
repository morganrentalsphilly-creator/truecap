"use server";

/**
 * "Email me this decision memo" — the anonymous free-decision capture
 * (docs/funnel-leaks-plan.md Phase A). Flag: FUNNEL_MEMO_CAPTURE=on.
 *
 * One call stores (or refreshes) a memo_leads row and sends ONE email, the
 * memo itself (sequence step L0). Follow-ups are not scheduled here: the
 * lifecycle cron owns them, so unsubscribe and conversion exits need no
 * provider-side cancellation.
 *
 * SECURITY — unauthenticated by design, so the same two invariants as
 * app/actions/post-analysis-email-capture.ts hold:
 *   1. Nothing caller-supplied reaches the email unescaped. The numbers are
 *      recomputed here from schema-validated inputs; the address is the only
 *      free text and lib/email/memo-email.ts sanitizes + escapes it.
 *   2. Nothing is sent before claimEmailCaptureSlot returns allowed:true
 *      (durable per-email / per-IP / site-wide caps, fails CLOSED).
 * Turnstile (when configured) and a honeypot sit in front of both.
 *
 * Result shape follows CLAUDE.md §3.2. The caller renders the analysis
 * regardless of the outcome — a failed send never hides the result.
 */

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { activeAnonymousDecisionGrantMatches } from "@/lib/anonymous-decision-grant";
import { trackServer } from "@/lib/analytics/site-events-server";
import {
  claimEmailCaptureSlot,
  releaseEmailCaptureSlot,
} from "@/lib/email-capture-guard";
import {
  buildDripUnsubscribeHeaders,
  buildDripUnsubscribeUrl,
  hashDripEmail,
  isDripEmailSuppressed,
  readResendMessageId,
} from "@/lib/email-drip-unsubscribe";
import { buildMemoEmail } from "@/lib/email/memo-email";
import { readEmailPostalAddress } from "@/lib/email/lifecycle-compliance";
import { isFunnelFlagOn } from "@/lib/funnel-flags";
import { INVESTCALC_SCHEMA_VERSION } from "@/lib/investcalc-schema";
import { getRequestIp } from "@/lib/ip-rate-limit";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import {
  MEMO_CONSENT_TEXT_VERSION,
  buildMemoPath,
  normalizeLeadEmail,
} from "@/lib/memo-lead";
import { buildMemoSummary } from "@/lib/memo-summary";
import { getSiteUrl } from "@/lib/site-url";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";

export type MemoLeadCaptureResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "DISABLED"
        | "VALIDATION_ERROR"
        | "CAPTCHA_FAILED"
        | "RATE_LIMITED"
        | "CONFIG_MISSING"
        | "SEND_FAILED";
      message: string;
    };

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const captureSchema = z.object({
  // 254 = RFC 5321 max.
  email: z.string().trim().max(254).email("Please enter a valid email."),
  /** Honeypot — hidden field real users never see. Filled → silent no-op. */
  website: z.string().max(200).optional(),
  captchaToken: z.string().max(2048).optional(),
  sourcePage: optionalText(200),
  referrer: optionalText(300),
  utm: z
    .object({
      source: optionalText(120),
      medium: optionalText(120),
      campaign: optionalText(120),
      term: optionalText(120),
      content: optionalText(120),
    })
    .optional(),
});

const SEND_FAILED_MESSAGE =
  "We couldn't email your memo right now. Your result is still here — please try again in a minute.";

export async function captureMemoLeadAction(input: {
  email: string;
  /** Current analyzer inputs; re-validated against the released schema. */
  values: unknown;
  /** The acquisition targets behind the Offer Ceiling on screen, if any. */
  maoTarget?: unknown;
  website?: string;
  captchaToken?: string;
  sourcePage?: string;
  referrer?: string;
  utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
}): Promise<MemoLeadCaptureResult> {
  if (!isFunnelFlagOn("FUNNEL_MEMO_CAPTURE")) {
    return { ok: false, code: "DISABLED", message: "Memo email isn't available right now." };
  }

  const parsed = captureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Please enter a valid email.",
    };
  }
  const values = releasedInvestmentFormSchema.safeParse(input.values);
  if (!values.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Run the analysis again, then request the memo.",
    };
  }
  // Honeypot tripped → pretend it worked, send nothing. Never tell a bot why.
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return { ok: true };
  }

  const ip = await getRequestIp();
  const captcha = await verifyTurnstileToken(parsed.data.captchaToken, ip);
  if (captcha === "misconfigured") {
    Sentry.captureMessage("memo capture: memo Turnstile site key set without MEMO_TURNSTILE_SECRET_KEY", {
      level: "error",
      tags: { feature: "memo-lead-capture" },
    });
    return { ok: false, code: "CONFIG_MISSING", message: SEND_FAILED_MESSAGE };
  }
  if (captcha === "failed" || captcha === "unavailable") {
    return {
      ok: false,
      code: "CAPTCHA_FAILED",
      message: "We couldn't verify the request. Please try again.",
    };
  }

  const email = parsed.data.email;
  const emailHash = hashDripEmail(email);
  let admin: ReturnType<typeof createAdminSupabaseClient>;
  try {
    admin = createAdminSupabaseClient();
    // An address that unsubscribed stays unsubscribed. Report success so the
    // endpoint is not an "is this address suppressed?" oracle.
    if (await isDripEmailSuppressed(admin, emailHash)) return { ok: true };
  } catch {
    Sentry.captureMessage("memo capture: suppression unavailable — send blocked", {
      level: "error",
      tags: { feature: "memo-lead-capture" },
    });
    return { ok: false, code: "SEND_FAILED", message: SEND_FAILED_MESSAGE };
  }

  const siteUrl = getSiteUrl();
  const unsubscribeUrl = buildDripUnsubscribeUrl(siteUrl, email);
  const apiKey = process.env.RESEND_API_KEY;
  if (!unsubscribeUrl || !apiKey) {
    Sentry.captureMessage("memo capture: email configuration missing", {
      level: "error",
      tags: {
        feature: "memo-lead-capture",
        missing: !apiKey ? "resend_key" : "signed_https_unsubscribe",
      },
    });
    return { ok: false, code: "CONFIG_MISSING", message: SEND_FAILED_MESSAGE };
  }

  // Durable, cross-instance claim. MUST come before the row write and the
  // send; UNAVAILABLE means we could not meter, so we do neither.
  const claim = await claimEmailCaptureSlot({ email, ip, surface: "memo" });
  if (!claim.allowed) {
    // Already sent twice in 30 days: they have the memo.
    if (claim.reason === "DUPLICATE") return { ok: true };
    if (claim.reason === "UNAVAILABLE") {
      Sentry.captureMessage("memo capture: guard unavailable — send blocked", {
        level: "error",
        tags: { feature: "memo-lead-capture", guard: "unavailable" },
        extra: { detail: claim.detail },
      });
      return { ok: false, code: "SEND_FAILED", message: SEND_FAILED_MESSAGE };
    }
    if (claim.reason === "GLOBAL_LIMIT") {
      Sentry.captureMessage("memo capture: global hourly cap hit", {
        level: "warning",
        tags: { feature: "memo-lead-capture", guard: "global_limit" },
      });
    }
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many requests just now — please try again shortly.",
    };
  }

  const maoTarget = normalizeMaoTarget(input.maoTarget);
  const now = new Date().toISOString();
  let leadId: string;
  try {
    // Dedupe by address: a repeat request refreshes the snapshot and the
    // link's clock but keeps created_at, so the follow-up sequence never
    // restarts, and never clears an unsubscribe or a conversion.
    const { data, error } = await admin
      .from("memo_leads")
      .upsert(
        {
          email,
          email_normalized: normalizeLeadEmail(email),
          email_hash: emailHash,
          snapshot: {
            values: values.data,
            maoTarget,
            schemaVersion: INVESTCALC_SCHEMA_VERSION,
          },
          // Agent framing for the follow-ups when the visit came through
          // the agent pages. A copy preference only.
          ...(/\/for-agents\b/.test(parsed.data.referrer ?? "") ||
          /agent/i.test(parsed.data.utm?.campaign ?? "")
            ? { intent: "agent" }
            : {}),
          source_page: parsed.data.sourcePage,
          utm_source: parsed.data.utm?.source ?? null,
          utm_medium: parsed.data.utm?.medium ?? null,
          utm_campaign: parsed.data.utm?.campaign ?? null,
          utm_term: parsed.data.utm?.term ?? null,
          utm_content: parsed.data.utm?.content ?? null,
          referrer: parsed.data.referrer,
          consent_text_version: MEMO_CONSENT_TEXT_VERSION,
          memo_requested_at: now,
        },
        { onConflict: "email_normalized" },
      )
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.code ?? "no row");
    leadId = data.id as string;
  } catch (err) {
    Sentry.captureMessage("memo capture: lead write failed", {
      level: "error",
      tags: { feature: "memo-lead-capture" },
      extra: { code: err instanceof Error ? err.message : "unknown" },
    });
    await releaseEmailCaptureSlot(claim.emailBucketKey);
    return { ok: false, code: "SEND_FAILED", message: SEND_FAILED_MESSAGE };
  }

  const memoPath = buildMemoPath(leadId);
  if (!memoPath) {
    Sentry.captureMessage("memo capture: SHARE_LINK_SECRET missing — memo link unavailable", {
      level: "error",
      tags: { feature: "memo-lead-capture" },
    });
    await releaseEmailCaptureSlot(claim.emailBucketKey);
    return { ok: false, code: "CONFIG_MISSING", message: SEND_FAILED_MESSAGE };
  }

  // The exact Offer Ceiling is part of the free decision only for the deal
  // this browser's signed grant is bound to; any other inputs get the memo
  // without it rather than a free solver endpoint.
  const includeOfferCeiling = await activeAnonymousDecisionGrantMatches(values.data);
  const summary = buildMemoSummary(values.data, { maoTarget, includeOfferCeiling });
  const memoUrl = `${siteUrl}${memoPath}?utm_source=lifecycle&utm_medium=email&utm_campaign=memo_lead&utm_content=l0`;
  const message = buildMemoEmail({
    summary,
    address: values.data.address,
    memoUrl,
    unsubscribeUrl,
    postalAddress: readEmailPostalAddress(),
  });

  const from = process.env.EMAIL_FROM || "TrueCap <hello@usetruecap.com>";
  const replyTo = process.env.EMAIL_REPLY_TO || "hello@usetruecap.com";
  const unsubscribeMailbox = (replyTo.match(/<([^>]+)>/)?.[1] ?? replyTo).trim();

  // A timeout may still have delivered; only a definite failure refunds the slot.
  let deliveryUncertain = true;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [email],
        subject: message.subject,
        text: message.text,
        html: message.html,
        reply_to: replyTo,
        headers: buildDripUnsubscribeHeaders({ unsubscribeUrl, mailbox: unsubscribeMailbox }),
        tags: [
          { name: "purpose", value: "lifecycle" },
          { name: "audience", value: "memo_lead" },
          { name: "sequence_step", value: "L0" },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    deliveryUncertain = false;
    if (!res.ok) throw new Error(`resend_${res.status}`);
    const resendId = await readResendMessageId(res);
    // Record L0 in the shared send log. A repeat request re-sends the memo
    // (the guard caps that at two per 30 days), so a conflict here is fine.
    await admin
      .from("lifecycle_email_log")
      .insert({ lead_id: leadId, email_key: "L0", resend_id: resendId })
      .then(() => undefined, () => undefined);
  } catch (err) {
    Sentry.captureMessage("memo capture: send failed", {
      level: "error",
      tags: { feature: "memo-lead-capture" },
      // Provider bodies can echo the recipient; keep only the status.
      extra: { status: err instanceof Error ? err.message : "thrown" },
    });
    if (!deliveryUncertain) await releaseEmailCaptureSlot(claim.emailBucketKey);
    return { ok: false, code: "SEND_FAILED", message: SEND_FAILED_MESSAGE };
  }

  await trackServer("memo_sent", { has_ceiling: Boolean(summary.offerCeiling) });
  return { ok: true };
}
