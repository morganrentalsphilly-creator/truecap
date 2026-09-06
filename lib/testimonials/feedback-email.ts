import type { SupabaseClient } from "@supabase/supabase-js";
import { mintSignedToken } from "@/lib/signed-token";
import {
  claimFeedbackEmailSend,
  recordFeedbackEmailProviderId,
  selectFeedbackEmailAudience,
  type FeedbackRecipient,
} from "@/lib/testimonials/store";

/**
 * The ONE guarded feedback-request email (docs/site-overhaul.md Phase 5.7).
 *
 *   - plain text, from the existing sender, subject "One question about TrueCap"
 *   - links to a signed URL that opens the same consent form
 *   - one-click unsubscribe (signed) that sets profiles.marketing_opt_out
 *   - postal address only when EMAIL_POSTAL_ADDRESS is configured
 *   - recorded in feedback_email_sends BEFORE sending, so it can never go twice
 *
 * Transport is injected so the whole path is testable without Resend.
 */

export const FEEDBACK_EMAIL_SUBJECT = "One question about TrueCap";
export const UNSUBSCRIBE_TOKEN_SCOPE = "marketing-unsubscribe";

export type FeedbackEmailMode = "off" | "dry" | "live";

export function resolveFeedbackEmailMode(raw: string | null | undefined): FeedbackEmailMode {
  const value = (raw ?? "off").trim().toLowerCase();
  if (value === "live") return "live";
  if (value === "dry" || value === "dry-run") return "dry";
  return "off";
}

export type EmailTransport = (message: {
  from: string;
  to: string;
  subject: string;
  text: string;
  headers?: Record<string, string>;
}) => Promise<{ ok: boolean; id?: string | null; status?: number }>;

export function renderFeedbackEmail(input: {
  siteUrl: string;
  formToken: string;
  unsubscribeUrl: string;
  postalAddress?: string | null;
}): { subject: string; text: string; formUrl: string } {
  const formUrl = `${input.siteUrl}/feedback/testimonial?token=${encodeURIComponent(input.formToken)}`;
  const lines = [
    "Hi,",
    "",
    "You saved a deal in TrueCap recently, so one question:",
    "",
    "What did TrueCap change about how you evaluate deals? One sentence is plenty.",
    "",
    `Answer here (30 seconds, and you choose whether it can be published with your first name, role, and market): ${formUrl}`,
    "",
    "Thanks — every answer goes straight to me.",
    "",
    "Morgan Page",
    "TrueCap",
    "",
    "---",
    `Don't want emails like this? One click: ${input.unsubscribeUrl}`,
  ];
  if (input.postalAddress) lines.push(input.postalAddress);
  return { subject: FEEDBACK_EMAIL_SUBJECT, text: lines.join("\n"), formUrl };
}

export function buildUnsubscribeUrl(siteUrl: string, userId: string): string | null {
  const token = mintSignedToken(UNSUBSCRIBE_TOKEN_SCOPE, { u: userId });
  return token ? `${siteUrl}/email/unsubscribe?token=${encodeURIComponent(token)}` : null;
}

export type FeedbackEmailJobSummary = {
  mode: FeedbackEmailMode;
  audience: number;
  sent: number;
  skipped_already_claimed: number;
  skipped_no_unsubscribe_link: number;
  failed: number;
};

export async function runFeedbackEmailJob(deps: {
  admin: SupabaseClient;
  mode: FeedbackEmailMode;
  transport: EmailTransport;
  siteUrl: string;
  from: string;
  postalAddress?: string | null;
  now?: Date;
  maxSends?: number;
}): Promise<FeedbackEmailJobSummary> {
  const { admin, mode, transport, siteUrl, from, postalAddress = null, now = new Date(), maxSends = 500 } = deps;
  const summary: FeedbackEmailJobSummary = {
    mode,
    audience: 0,
    sent: 0,
    skipped_already_claimed: 0,
    skipped_no_unsubscribe_link: 0,
    failed: 0,
  };
  if (mode === "off") return summary;

  const audience: FeedbackRecipient[] = await selectFeedbackEmailAudience(admin, now);
  summary.audience = audience.length;
  if (mode === "dry") return summary;

  for (const recipient of audience.slice(0, maxSends)) {
    const unsubscribeUrl = buildUnsubscribeUrl(siteUrl, recipient.userId);
    if (!unsubscribeUrl) {
      // No signing secret → no compliant unsubscribe link → never send.
      summary.skipped_no_unsubscribe_link += 1;
      continue;
    }
    const claim = await claimFeedbackEmailSend(admin, recipient.userId);
    if (!claim) {
      summary.skipped_already_claimed += 1;
      continue;
    }
    const rendered = renderFeedbackEmail({ siteUrl, formToken: claim.formToken, unsubscribeUrl, postalAddress });
    const result = await transport({
      from,
      to: recipient.email,
      subject: rendered.subject,
      text: rendered.text,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.ok) {
      summary.sent += 1;
      await recordFeedbackEmailProviderId(admin, recipient.userId, result.id ?? null);
    } else {
      // The claim stays: a failed provider call is not retried automatically
      // — "send once" beats "send until it works".
      summary.failed += 1;
    }
  }
  return summary;
}

/** Resend transport (raw fetch, same shape lib/email/send-lifecycle.ts uses). */
export function createResendTransport(apiKey: string): EmailTransport {
  return async (message) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        headers: message.headers,
        tags: [{ name: "purpose", value: "feedback_request" }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id ?? null, status: res.status };
  };
}
