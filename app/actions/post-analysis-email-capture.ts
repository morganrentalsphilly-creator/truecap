"use server";

/**
 * Post-analysis email capture + drip scheduler.
 *
 * Triggered when a free user runs an analysis and submits their email.
 * Schedules a 4-email sequence via Resend's transactional API using its
 * `scheduled_at` field — no cron needed, Resend handles timing.
 *
 * Sequence (calibrated to first 12 days, hottest window for conversion):
 *   Day 0:  "Here's your analysis." (instant)
 *   Day 2:  "5 metrics most investors forget"
 *   Day 5:  "Pro unlocks the 10-year projection"
 *   Day 12: "Last chance: 20% off your first month"
 *
 * Result shape follows the codebase convention from CLAUDE.md (§3.2):
 * discriminated union with ok: true/false. Never throws to the client.
 */

import { z } from "zod";

export type CaptureResult =
  | { ok: true; scheduledCount: number }
  | {
      ok: false;
      code:
        | "VALIDATION_ERROR"
        | "CONFIG_MISSING"
        | "SEND_FAILED";
      message: string;
    };

const captureSchema = z.object({
  email: z.string().email("Please enter a valid email."),
  address: z.string().min(2).max(200).optional(),
});

type SequenceEmail = {
  delayDays: number;
  subject: string;
  build: (ctx: { address: string; siteUrl: string; couponCode: string }) => string;
};

const SEQUENCE: SequenceEmail[] = [
  {
    delayDays: 0,
    subject: "Your TrueCap analysis is saved",
    build: ({ address, siteUrl }) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<div style="max-width:560px;margin:32px auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
  <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;line-height:1.2;">Your analysis is saved.</h1>
  <p style="margin:0 0 16px 0;color:#374151;line-height:1.6;font-size:15px;">
    Thanks for running ${address ? `<strong>${address}</strong>` : "that deal"} through TrueCap.
    It's bookmarked — come back any time to re-open it.
  </p>
  <p style="margin:0 0 24px 0;color:#374151;line-height:1.6;font-size:15px;">
    Over the next few days I'll send you a couple of short emails about the metrics most investors miss
    (and what changes when you upgrade to Pro). No fluff — unsubscribe anytime.
  </p>
  <div style="text-align:center;margin:24px 0;">
    <a href="${siteUrl}" style="display:inline-block;background:#5248D4;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;">Run another deal</a>
  </div>
  <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">— Morgan, founder · usetruecap.com</p>
</div></body></html>`,
  },
  {
    delayDays: 2,
    subject: "5 metrics most investors forget",
    build: ({ siteUrl }) => `<!DOCTYPE html>
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
    <a href="${siteUrl}" style="display:inline-block;background:#5248D4;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;">Re-run your deal</a>
  </div>
  <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">— Morgan · usetruecap.com</p>
</div></body></html>`,
  },
  {
    delayDays: 5,
    subject: "What does year 10 actually look like?",
    build: ({ siteUrl }) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<div style="max-width:560px;margin:32px auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
  <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;line-height:1.2;">What does year 10 actually look like?</h1>
  <p style="margin:0 0 16px 0;color:#374151;line-height:1.6;font-size:15px;">
    A deal that cash-flows <strong style="color:#16a34a;">+$749/mo</strong> today is probably
    <strong style="color:#16a34a;">+$2,100/mo</strong> by year 10. Rent grows. Your mortgage doesn't.
    That's the whole game.
  </p>
  <p style="margin:0 0 20px 0;color:#374151;line-height:1.6;font-size:15px;">
    TrueCap Pro shows you the full 10-year projection — cash flow, equity, after-tax dollars, and a recommended exit year.
    Same deal, complete picture.
  </p>
  <div style="text-align:center;margin:24px 0;">
    <a href="${siteUrl}/pricing" style="display:inline-block;background:#5248D4;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;">See Pro features</a>
  </div>
  <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">— Morgan · usetruecap.com</p>
</div></body></html>`,
  },
  {
    delayDays: 12,
    subject: "20% off your first month — ends soon",
    build: ({ siteUrl, couponCode }) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<div style="max-width:560px;margin:32px auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
  <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;line-height:1.2;">Last nudge — 20% off your first month</h1>
  <p style="margin:0 0 16px 0;color:#374151;line-height:1.6;font-size:15px;">
    You ran an analysis recently and never came back. No worries — here's a small thank-you for trying TrueCap.
  </p>
  <p style="margin:0 0 20px 0;color:#374151;line-height:1.6;font-size:15px;">
    Code <strong style="color:#5248D4;">${couponCode}</strong> takes <strong>20% off</strong> your first month of Pro.
    Auto-applies at checkout. Cancel anytime.
  </p>
  <div style="text-align:center;margin:24px 0;">
    <a href="${siteUrl}/pricing?coupon=${couponCode}" style="display:inline-block;background:#5248D4;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:14px;">Claim 20% off</a>
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
  const { email, address = "your saved property" } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      code: "CONFIG_MISSING",
      message: "Email sending isn't configured. Try again later.",
    };
  }
  const from = process.env.EMAIL_FROM || "TrueCap <hello@usetruecap.com>";
  const replyTo = process.env.EMAIL_REPLY_TO || "hello@usetruecap.com";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://usetruecap.com";
  const couponCode = process.env.POST_ANALYSIS_COUPON_CODE || "ANALYZE20";
  const buildCtx = { address, siteUrl, couponCode };

  // Schedule each email. Resend's `scheduled_at` accepts ISO 8601;
  // day 0 sends immediately (we just don't pass scheduled_at).
  let scheduledCount = 0;
  const failures: string[] = [];

  for (const item of SEQUENCE) {
    const payload: Record<string, unknown> = {
      from,
      to: [email],
      subject: item.subject,
      html: item.build(buildCtx),
      reply_to: replyTo,
    };
    if (item.delayDays > 0) {
      const future = new Date(Date.now() + item.delayDays * 24 * 60 * 60 * 1000);
      payload.scheduled_at = future.toISOString();
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        failures.push(`day-${item.delayDays} ${res.status}: ${text.slice(0, 200)}`);
        continue;
      }
      scheduledCount += 1;
    } catch (err) {
      failures.push(
        `day-${item.delayDays} threw: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (scheduledCount === 0) {
    return {
      ok: false,
      code: "SEND_FAILED",
      message: failures[0] ?? "Could not schedule any emails. Try again later.",
    };
  }

  return { ok: true, scheduledCount };
}
