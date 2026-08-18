import "server-only";

/**
 * Pack-credit countdown emails (2026-08-17 offer rollout, flow 2).
 *
 * Scheduled once when a Deal Decision Pack claim is consumed AND its Pro
 * credit is granted (verifyOneTimePdfPaymentAction → best-effort extras):
 *   - day 0: the credit exists + honest expiry date
 *   - day 5: 2-days-left reminder (the 7-day window is real, so the
 *     countdown is honest — prompt rule: no manufactured urgency)
 *
 * Gating is structural: this only runs when the credit was actually
 * granted, which itself requires STRIPE_PACK_CREDIT_COUPON_ID. Idempotency
 * is the claim's atomic consumption — this function is reached exactly once
 * per claim. Buyer email comes from Stripe checkout (customer_details).
 * Best-effort: failures land in Sentry and never affect the PDF.
 */

import * as Sentry from "@sentry/nextjs";
import { escapeHtml } from "@/lib/html-escape";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { TRIAL_DAYS } from "@/lib/trial";

function wrapHtml(inner: string, unsubscribeMailbox: string): string {
  return `<!doctype html><html><body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px 16px;">
    ${inner}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 12px" />
    <p style="font-size: 12px; color: #6b7280;">TrueCap · sourced, editable rental underwriting ·
    <a href="mailto:${unsubscribeMailbox}?subject=unsubscribe" style="color:#6b7280">unsubscribe</a></p>
  </body></html>`;
}

export async function schedulePackCreditEmails(input: {
  email: string;
  amountCents: number;
  eligibleUntil: string;
}): Promise<{ scheduled: number }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { scheduled: 0 };

  const from = process.env.EMAIL_FROM || "TrueCap <hello@usetruecap.com>";
  const replyTo = process.env.EMAIL_REPLY_TO || "hello@usetruecap.com";
  const unsubscribeMailbox = (replyTo.match(/<([^>]+)>/)?.[1] ?? replyTo).trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://usetruecap.com").replace(/\/+$/, "");
  const siteUrlHtml = escapeHtml(siteUrl);

  const dollars = Math.round(input.amountCents / 100);
  const deadlineMs = Date.parse(input.eligibleUntil);
  if (!Number.isFinite(deadlineMs)) return { scheduled: 0 };
  const deadlineHtml = escapeHtml(
    new Date(deadlineMs).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    })
  );

  const emails: Array<{ delayDays: number; subject: string; html: string; sendAt?: string }> = [
    {
      delayDays: 0,
      subject: `Your $${dollars} Deal Decision Pack is credited toward Pro`,
      html: `
        <p>Your report is on your device — and the $${escapeHtml(String(dollars))} you just
        paid isn't spent yet.</p>
        <p><strong>Upgrade to TrueCap Pro by ${deadlineHtml}</strong> and this
        purchase is credited to your first Pro invoice automatically at
        checkout. No code to remember.</p>
        <p>Pro is the repeat version of the report you just bought: Max Offer,
        Buy Box verdict, downside stress test, and lender-ready exports on
        every deal — with a ${escapeHtml(String(TRIAL_DAYS))}-day free trial for new
        subscribers${
          getMarketingOfferConfig().guaranteeEnabled
            ? ` and the <a href="${siteUrlHtml}/guarantee">Never Overpay Guarantee</a> after that`
            : ""
        }.</p>
        <p><a href="${siteUrlHtml}/pricing?utm_source=email&utm_campaign=pack-credit-day0"><strong>See Pro plans</strong></a></p>
      `,
    },
    {
      delayDays: 5,
      subject: `2 days left on your $${dollars} Pro credit`,
      html: `
        <p>A plain reminder, not a countdown clock: the $${escapeHtml(String(dollars))}
        credit from your Deal Decision Pack expires on <strong>${deadlineHtml}</strong> —
        that's the real window, and it doesn't come back.</p>
        <p>If you've already upgraded, the credit applied automatically and
        you can ignore this. If not, it takes one checkout:</p>
        <p><a href="${siteUrlHtml}/pricing?utm_source=email&utm_campaign=pack-credit-day5"><strong>Use the credit toward Pro</strong></a></p>
        <p style="font-size: 13px; color: #6b7280;">Not the right time? That's
        fine — your report is yours forever either way.</p>
      `,
    },
  ];

  let scheduled = 0;
  for (const item of emails) {
    try {
      const payload: Record<string, unknown> = {
        from,
        to: [input.email],
        subject: item.subject,
        html: wrapHtml(item.html, escapeHtml(unsubscribeMailbox)),
        reply_to: replyTo,
        tags: [{ name: "purpose", value: "pack-credit" }],
        headers: {
          "List-Unsubscribe": `<mailto:${unsubscribeMailbox}?subject=unsubscribe>`,
        },
      };
      if (item.delayDays > 0) {
        payload.scheduled_at = new Date(
          Date.now() + item.delayDays * 24 * 60 * 60 * 1000
        ).toISOString();
      }
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) scheduled += 1;
      else {
        Sentry.captureMessage("Pack credit email send failed", {
          level: "error",
          tags: { feature: "pack-credit-emails" },
          extra: { status: res.status, delay_days: item.delayDays },
        });
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: "pack-credit-emails" } });
    }
  }
  return { scheduled };
}
