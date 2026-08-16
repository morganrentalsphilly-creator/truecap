"use server";

/**
 * Post-analysis email capture + drip scheduler.
 *
 * Triggered when a free user runs an analysis and submits their email.
 * Schedules a 5-email sequence via Resend's transactional API using its
 * `scheduled_at` field — no cron needed, Resend handles timing.
 *
 * Sequence (calibrated to the first ~12 days — the hottest conversion window):
 *   Day 0:  Underwriting checklist (the 7 numbers) — instant, delivers value
 *   Day 2:  "5 metrics most investors forget"
 *   Day 5:  "What does year 10 look like?" (Pro 10-year projection)
 *   Day 8:  Deal Decision Pack — lowest-friction paid step
 *   Day 12: "20% off your first month" (final nudge)
 *
 * Result shape follows the codebase convention from CLAUDE.md (§3.2):
 * discriminated union with ok: true/false. Never throws to the client.
 *
 * SECURITY — this action is unauthenticated by design (the prompt is shown to
 * anonymous users after an analysis), which makes it a public send path. Two
 * invariants must hold for every future edit:
 *   1. EVERY caller-supplied value that reaches an email body goes through
 *      `escapeHtml` (and, for the address, `sanitizeAddressText` first).
 *      Raw interpolation here = a phishing primitive signed with TrueCap's
 *      SPF/DKIM.
 *   2. NOTHING is sent before `claimEmailCaptureSlot` returns allowed:true.
 *      The guard is durable (Postgres) and fails CLOSED — five Resend sends
 *      per call to an arbitrary recipient is an open relay without it.
 */

import { z } from "zod";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { escapeHtml, sanitizeAddressText } from "@/lib/html-escape";
import {
  claimEmailCaptureSlot,
  releaseEmailCaptureSlot,
} from "@/lib/email-capture-guard";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";

const SINGLE_DEAL_PRICE_LABEL = getMarketingOfferConfig().singleDeal.priceLabel;

export type CaptureResult =
  | { ok: true; scheduledCount: number }
  | {
      ok: false;
      code:
        | "VALIDATION_ERROR"
        | "CONFIG_MISSING"
        | "RATE_LIMITED"
        | "SEND_FAILED";
      message: string;
    };

const captureSchema = z.object({
  // 254 = RFC 5321 max; without a cap an oversized string rides along into
  // Resend's `to`.
  email: z.string().trim().max(254).email("Please enter a valid email."),
  address: z
    .string()
    .trim()
    .min(2)
    .max(200)
    // An address is data, not markup. Anything carrying a tag delimiter is an
    // injection attempt, not a street address — reject the whole request
    // rather than quietly cleaning it. (Belt: sanitizeAddressText + escapeHtml
    // still run on whatever gets through.)
    .regex(/^[^<>]*$/, "That doesn't look like a property address.")
    .optional(),
  /** Honeypot — hidden field real users never see. Filled → silent no-op. */
  website: z.string().max(200).optional(),
});

type SequenceEmail = {
  delayDays: number;
  subject: string;
  /**
   * NOTE: every field on this context is ALREADY HTML-escaped (or URL-encoded
   * for `couponCodeUrl`). Templates interpolate them directly — do not add a
   * raw, unescaped value to this type.
   */
  build: (ctx: {
    addressHtml: string;
    siteUrlHtml: string;
    couponCodeHtml: string;
    couponCodeUrl: string;
  }) => string;
};

const SEQUENCE: SequenceEmail[] = [
  {
    delayDays: 0,
    subject: "Your rental underwriting checklist (the 7 numbers)",
    build: ({ addressHtml, siteUrlHtml }) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<div style="max-width:560px;margin:32px auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
  <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;line-height:1.2;">The 7 numbers I run before any offer</h1>
  <p style="margin:0 0 16px 0;color:#374151;line-height:1.6;font-size:15px;">
    Thanks for running ${addressHtml ? `<strong>${addressHtml}</strong>` : "that deal"} through TrueCap. Here's the checklist it's built on — the numbers that decide whether a rental actually makes money. Steal it for every deal:
  </p>
  <ol style="margin:0 0 20px 0;padding-left:20px;color:#374151;line-height:1.7;font-size:15px;">
    <li><strong>Cap rate</strong> — NOI &divide; price (NOI <em>after</em> vacancy + management).</li>
    <li><strong>Cash-on-cash</strong> — the return on the cash you actually put in.</li>
    <li><strong>DSCR</strong> — what the lender checks. Under ~1.2 is a hard conversation.</li>
    <li><strong>Cash flow after reserves</strong> — only real once CapEx + vacancy + maintenance are set aside.</li>
    <li><strong>Sensitivity</strong> — does it survive a 10% rent drop or a 1-point rate bump?</li>
    <li><strong>10-year projection</strong> — year-1 cash flow lies; model rent + expense growth.</li>
    <li><strong>The exit</strong> — modeled profit across hold years, after assumed selling costs and taxes.</li>
  </ol>
  <p style="margin:0 0 20px 0;color:#374151;line-height:1.6;font-size:15px;">
    TrueCap runs all seven from a single address — free. Over the next few days I'll send a couple of short notes on the ones investors miss most.
  </p>
  <div style="text-align:center;margin:24px 0;">
    <a href="${siteUrlHtml}" style="display:inline-block;background:#0070c4;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;">Run a deal in 60 seconds</a>
  </div>
  <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">— Morgan, founder · usetruecap.com</p>
</div></body></html>`,
  },
  {
    delayDays: 2,
    subject: "5 metrics most investors forget",
    build: ({ siteUrlHtml }) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<div style="max-width:560px;margin:32px auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
  <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;line-height:1.2;">5 metrics most investors forget</h1>
  <p style="margin:0 0 16px 0;color:#374151;line-height:1.6;font-size:15px;">
    Quick read — the 5 lines that turn a "decent deal" into a money-loser, ranked by how often I see them missed:
  </p>
  <ol style="margin:0 0 20px 0;padding-left:20px;color:#374151;line-height:1.7;font-size:15px;">
    <li><strong>Vacancy reserve</strong> — 5–8% of rent. Most spreadsheets pretend it's 0.</li>
    <li><strong>CapEx reserve</strong> — 5–10% of rent. Roof, HVAC, water heater compound.</li>
    <li><strong>Real maintenance</strong> — 5–10%, more on older properties.</li>
    <li><strong>Property management</strong> — 8–10% even if you self-manage (your time isn't free).</li>
    <li><strong>Property tax reassessment</strong> — many counties bump it on sale.</li>
  </ol>
  <p style="margin:0 0 20px 0;color:#374151;line-height:1.6;font-size:15px;">
    TrueCap bakes all five in automatically. Re-run your deal and look at the real cash flow.
  </p>
  <div style="text-align:center;margin:24px 0;">
    <a href="${siteUrlHtml}" style="display:inline-block;background:#0070c4;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;">Re-run your deal</a>
  </div>
  <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">— Morgan · usetruecap.com</p>
</div></body></html>`,
  },
  {
    delayDays: 5,
    subject: "What does year 10 actually look like?",
    build: ({ siteUrlHtml }) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<div style="max-width:560px;margin:32px auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
  <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;line-height:1.2;">What does year 10 actually look like?</h1>
  <p style="margin:0 0 16px 0;color:#374151;line-height:1.6;font-size:15px;">
    Year-one cash flow is only one part of the acquisition decision. Rent and
    expenses can change, debt pays down, and the exit assumption can dominate
    the long-term result.
  </p>
  <p style="margin:0 0 20px 0;color:#374151;line-height:1.6;font-size:15px;">
    TrueCap Pro shows you the full 10-year projection — cash flow, equity, illustrative after-tax dollars, and modeled exit-year comparisons.
    Same deal, complete picture.
  </p>
  <div style="text-align:center;margin:24px 0;">
    <a href="${siteUrlHtml}/pricing" style="display:inline-block;background:#0070c4;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;">See Pro features</a>
  </div>
  <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">— Morgan · usetruecap.com</p>
</div></body></html>`,
  },
  {
    delayDays: 8,
    subject: `One complete deal underwrite for ${SINGLE_DEAL_PRICE_LABEL}, no subscription`,
    build: ({ addressHtml, siteUrlHtml }) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<div style="max-width:560px;margin:32px auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
  <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;line-height:1.2;">Need one complete underwrite? ${SINGLE_DEAL_PRICE_LABEL}.</h1>
  <p style="margin:0 0 16px 0;color:#374151;line-height:1.6;font-size:15px;">
    Taking ${addressHtml ? `<strong>${addressHtml}</strong>` : "a deal"} to a lender, partner, or seller? The Deal Decision Pack packages the verdict, walk-away price, downside scenario, 10-year projection, illustrative tax impact, modeled exit comparisons, and Deal Score into a polished report for a one-time <strong>${SINGLE_DEAL_PRICE_LABEL}</strong>. No account, no subscription.
  </p>
  <p style="margin:0 0 20px 0;color:#374151;line-height:1.6;font-size:15px;">
    Re-run your deal, click <strong>Export PDF</strong>, and choose the Deal Decision Pack option.
  </p>
  <div style="text-align:center;margin:24px 0;">
    <a href="${siteUrlHtml}" style="display:inline-block;background:#0070c4;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;">Get your PDF</a>
  </div>
  <p style="margin:0 0 0 0;color:#6b7280;line-height:1.6;font-size:13px;text-align:center;">Want the full decision workflow instead? Pro adds Max Offer, Buy Box screening, stress testing, unlimited reports, saved deals, and comparison.</p>
  <p style="margin:12px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">— Morgan · usetruecap.com</p>
</div></body></html>`,
  },
  {
    delayDays: 12,
    subject: "A first-month TrueCap Pro offer",
    build: ({ siteUrlHtml, couponCodeHtml, couponCodeUrl }) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<div style="max-width:560px;margin:32px auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
  <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;line-height:1.2;">Last nudge — 20% off your first month</h1>
  <p style="margin:0 0 16px 0;color:#374151;line-height:1.6;font-size:15px;">
    You ran an analysis recently and never came back. No worries — here's a small thank-you for trying TrueCap.
  </p>
  <p style="margin:0 0 20px 0;color:#374151;line-height:1.6;font-size:15px;">
    Code <strong style="color:#0070c4;">${couponCodeHtml}</strong> takes <strong>20% off</strong> your first month of Pro.
    Auto-applies at checkout. Cancel anytime.
  </p>
  <div style="text-align:center;margin:24px 0;">
    <a href="${siteUrlHtml}/pricing?coupon=${couponCodeUrl}" style="display:inline-block;background:#0070c4;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:14px;">Claim 20% off</a>
  </div>
  <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">
    Not interested? Just ignore this — no follow-up.<br>— Morgan · usetruecap.com
  </p>
</div></body></html>`,
  },
];

export async function capturePostAnalysisEmail(input: {
  email: string;
  address?: string;
  website?: string;
}): Promise<CaptureResult> {
  const parsed = captureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message:
        parsed.error.issues[0]?.message ?? "Please enter a valid email.",
    };
  }
  // Honeypot tripped → pretend it worked, send nothing. Never tell a bot why.
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return { ok: true, scheduledCount: 0 };
  }
  // Send to the address as typed (a local-part is case-sensitive in principle);
  // the guard normalises case itself for bucketing, so "A@x.com" and "a@x.com"
  // still share one dedup slot.
  const email = parsed.data.email;
  // Address is data, not markup: strip to an address character set, then
  // escape. Empty result = treat as "no address" (templates have a fallback).
  const addressHtml = escapeHtml(sanitizeAddressText(parsed.data.address));

  // Source IP for the per-source cap. `headers()` is always available inside a
  // server action on Vercel; the "unknown" fallback shares one bucket, which
  // is intentionally the restrictive choice.
  let ip = "unknown";
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  } catch {
    /* headers() unavailable — fall through to the shared bucket */
  }

  // Durable, cross-instance claim. MUST come before any send. Fails closed:
  // reason UNAVAILABLE means we could not meter, so we do not send.
  const claim = await claimEmailCaptureSlot({ email, ip });
  if (!claim.allowed) {
    if (claim.reason === "DUPLICATE") {
      // Already enrolled. Report success (they have the checklist, and this
      // avoids turning the endpoint into an "is this address subscribed?"
      // oracle) but schedule nothing.
      return { ok: true, scheduledCount: 0 };
    }
    if (claim.reason === "UNAVAILABLE") {
      Sentry.captureMessage("email-capture guard unavailable — send blocked", {
        level: "error",
        tags: { feature: "post-analysis-email-capture", guard: "unavailable" },
        extra: { detail: claim.detail },
      });
      return {
        ok: false,
        code: "SEND_FAILED",
        message: "We couldn't send your checklist right now. Please try again in a minute.",
      };
    }
    // IP_LIMIT / GLOBAL_LIMIT. The guard charges the global budget only for
    // captures that actually send, so GLOBAL_LIMIT means the site genuinely
    // enrolled 200 addresses in an hour — either a rotating-source attack or
    // the cap is now too low for real traffic. Either way it needs eyes.
    if (claim.reason === "GLOBAL_LIMIT") {
      Sentry.captureMessage("email-capture global hourly cap hit", {
        level: "warning",
        tags: { feature: "post-analysis-email-capture", guard: "global_limit" },
      });
    }
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many requests just now — please try again shortly.",
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // CONFIG_MISSING is a Sentry-level alert — if the env var ever
    // drops out in production we want to see it immediately because
    // every email-capture submit silently fails until it's restored.
    Sentry.captureMessage("RESEND_API_KEY missing — email capture disabled", {
      level: "error",
      tags: { feature: "post-analysis-email-capture" },
    });
    // Nothing was sent — give the address its slot back so the user isn't
    // locked out once the key is restored.
    await releaseEmailCaptureSlot(claim.emailBucketKey);
    return {
      ok: false,
      code: "CONFIG_MISSING",
      message: "Email sending isn't configured. Try again later.",
    };
  }
  const from = process.env.EMAIL_FROM || "TrueCap <hello@usetruecap.com>";
  const replyTo = process.env.EMAIL_REPLY_TO || "hello@usetruecap.com";
  // EMAIL_REPLY_TO may carry a display name ("TrueCap <hello@…>"); the
  // List-Unsubscribe mailto: needs the bare address.
  const unsubscribeMailbox = (replyTo.match(/<([^>]+)>/)?.[1] ?? replyTo).trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://usetruecap.com";
  const couponCode = process.env.POST_ANALYSIS_COUPON_CODE || "ANALYZE20";
  // Env values are trusted, but escape them anyway — a template author reading
  // the ctx type should never have to ask which fields are safe.
  const buildCtx = {
    addressHtml,
    siteUrlHtml: escapeHtml(siteUrl.replace(/\/+$/, "")),
    couponCodeHtml: escapeHtml(couponCode),
    couponCodeUrl: encodeURIComponent(couponCode),
  };

  // Schedule each email. Resend's `scheduled_at` accepts ISO 8601;
  // day 0 sends immediately (we just don't pass scheduled_at).
  let scheduledCount = 0;
  let day0Sent = false;
  const failures: Array<{ delayDays: number; status: number | "thrown"; body: string }> = [];

  for (const item of SEQUENCE) {
    const payload: Record<string, unknown> = {
      from,
      to: [email],
      subject: item.subject,
      html: item.build(buildCtx),
      reply_to: replyTo,
      // Unsolicited-mail defence for the recipient AND for our sending
      // reputation: mailbox providers weigh a visible opt-out far more kindly
      // than a spam complaint, and someone who receives this sequence without
      // asking for it needs a way out. mailto: form only — RFC 8058 one-click
      // needs an HTTPS endpoint we don't have, and EMAIL_REPLY_TO is already
      // a monitored inbox.
      headers: {
        "List-Unsubscribe": `<mailto:${unsubscribeMailbox}?subject=unsubscribe>`,
      },
    };
    if (item.delayDays > 0) {
      const future = new Date(Date.now() + item.delayDays * 24 * 60 * 60 * 1000);
      payload.scheduled_at = future.toISOString();
    }
    try {
      // 10s timeout — Resend usually returns in <1s; >10s is almost
      // certainly a network issue, not a slow API response. Without
      // this the server action can hang and the user sees nothing.
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        failures.push({ delayDays: item.delayDays, status: res.status, body: text.slice(0, 500) });
        continue;
      }
      scheduledCount += 1;
      if (item.delayDays === 0) day0Sent = true;
    } catch (err) {
      failures.push({
        delayDays: item.delayDays,
        status: "thrown",
        body: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Telemetry: log any failure pattern to Sentry so we can see them in
  // production. Without this, the user gets a friendly toast and we
  // have zero visibility into what Resend actually rejected.
  if (failures.length > 0) {
    Sentry.captureMessage(
      `post-analysis-email-capture: ${failures.length}/${SEQUENCE.length} email(s) failed`,
      {
        level: scheduledCount === 0 ? "error" : "warning",
        tags: {
          feature: "post-analysis-email-capture",
          all_failed: String(scheduledCount === 0),
          day0_failed: String(!day0Sent),
        },
        extra: {
          failures,
          scheduledCount,
          totalAttempts: SEQUENCE.length,
          fromAddress: from,
          // Email + address intentionally omitted to keep PII out of
          // Sentry; the failure pattern (status code + body) is what
          // we need to debug.
        },
      }
    );
  }

  if (scheduledCount === 0) {
    // Nothing went out, so the address keeps its enrolment slot. Only the
    // EMAIL bucket is refunded — the IP and global buckets stay spent, so this
    // can't be farmed as a limit bypass by forcing Resend failures.
    await releaseEmailCaptureSlot(claim.emailBucketKey);
    return {
      ok: false,
      code: "SEND_FAILED",
      // User-facing message — friendly, no raw status codes. The real
      // detail is in Sentry per the captureMessage above.
      message: "We couldn't send your analysis right now. Please try again in a minute.",
    };
  }

  // Edge case: at least one email scheduled but day-0 (the instant
  // "Here's your analysis") was NOT sent. The user thinks they got the
  // email immediately but actually only the day-2/5/12 sequence is
  // queued. Surface this so the user knows to expect it later (and
  // the Sentry warning above tells us to investigate the day-0 path).
  if (!day0Sent) {
    return {
      ok: false,
      code: "SEND_FAILED",
      message:
        "Your follow-up emails are queued, but we couldn't send today's instant copy. Please try again in a minute.",
    };
  }

  return { ok: true, scheduledCount };
}
