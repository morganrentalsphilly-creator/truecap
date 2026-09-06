"use server";

/**
 * First Offer Playbook capture.
 *
 * The email-gated lead magnet for SEO pages: submit an email, get the public
 * playbook link immediately in the response AND a 3-email sequence (day 0
 * delivery, day 3 input-verification guide, day 5 case-for-Pro). The retired
 * Market Intelligence PDF is deliberately not distributed: its state tax and
 * landlord-law records remain high-risk/stale until official dependencies are
 * attached. Per-user transactional sends via Resend `scheduled_at` — this
 * deliberately does NOT touch the retired newsletter audience/broadcast
 * machinery (founder decision 2026-07-15).
 *
 * Security contract (same as post-analysis-email-capture.ts):
 *   - claimEmailCaptureSlot BEFORE any send — surface "mip" so this gate is
 *     independent of the post-analysis checklist's per-email cap, while IP
 *     and the sitewide hourly budget stay shared.
 *   - Honeypot field; every interpolated value escaped.
 *   - DUPLICATE pretends success (no subscription oracle) and still returns
 *     the download link — the asset is the reward either way.
 */

import { headers } from "next/headers";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import {
  claimEmailCaptureSlot,
  releaseEmailCaptureSlot,
} from "@/lib/email-capture-guard";
import { escapeHtml } from "@/lib/html-escape";

const RESOURCE_PATH = "/playbook";

const captureSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email.").max(254),
    source: z.string().trim().max(60).optional(),
    website: z.string().max(0).optional(),
  })
  .strict();

export type LeadMagnetCaptureResult =
  | { ok: true; scheduledCount: number; downloadUrl: string }
  | {
      ok: false;
      code:
        | "VALIDATION_ERROR"
        | "RATE_LIMITED"
        | "SEND_FAILED"
        | "CONFIG_MISSING";
      message: string;
    };

type SequenceCtx = { siteUrlHtml: string };

const SEQUENCE: Array<{
  delayDays: number;
  subject: string;
  build: (ctx: SequenceCtx) => string;
}> = [
  {
    delayDays: 0,
    subject: "Your First Offer Playbook",
    build: ({ siteUrlHtml }) => `
      <p>Here it is — an educational review path from a preliminary rental
      screen to a documented decision with independent verification:</p>
      <p><a href="${siteUrlHtml}${RESOURCE_PATH}"><strong>Read the First Offer Playbook</strong></a></p>
      <p>The playbook covers Buy Box criteria, input review, sensitivity, due
      diligence, and adviser questions. It's a model, not an appraisal, a
      lender decision, or investment advice.</p>
      <p><a href="${siteUrlHtml}/?utm_source=email&utm_campaign=mip-day0">Analyze any address free — Pro adds your Offer Ceiling →</a></p>
    `,
  },
  {
    delayDays: 3,
    subject: "How to verify a preliminary screen",
    build: ({ siteUrlHtml }) => `
      <p>Property-level rent, taxes, insurance, condition, financing, title, and
      contract protections still require current evidence. Area benchmarks and
      generic defaults are only starting assumptions.</p>
      <p><a href="${siteUrlHtml}/methodology"><strong>Review TrueCap's public methodology and source labels</strong></a></p>
      <p>Compare each input with a property-specific quote, record, comp, or
      inspection finding before anyone relies on the modeled result.</p>
    `,
  },
  {
    delayDays: 5,
    subject: "How the Offer Ceiling works",
    build: ({ siteUrlHtml }) => `
      <p>The Offer Ceiling is the highest price that still meets your targets
      under the assumptions shown.</p>
      <p>TrueCap Pro calculates it on compatible analyses, alongside the
      downside stress test, Buy Box fit, and a report built for review with
      advisers or a lender.</p>
      <p><a href="${siteUrlHtml}/pricing?utm_source=email&utm_campaign=mip-day5"><strong>See Pro plans</strong></a></p>
    `,
  },
];

function wrapHtml(inner: string, unsubscribeMailbox: string): string {
  return `<!doctype html><html><body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px 16px;">
    ${inner}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 12px" />
    <p style="font-size: 12px; color: #6b7280;">TrueCap · labeled, editable rental screening assumptions ·
    <a href="mailto:${unsubscribeMailbox}?subject=unsubscribe" style="color:#6b7280">unsubscribe</a></p>
  </body></html>`;
}

export async function captureLeadMagnetEmail(input: {
  email: string;
  source?: string;
  website?: string;
}): Promise<LeadMagnetCaptureResult> {
  const parsed = captureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Please enter a valid email.",
    };
  }
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://usetruecap.com"
  ).replace(/\/+$/, "");
  const downloadUrl = `${siteUrl}${RESOURCE_PATH}`;

  // Honeypot tripped → pretend it worked, send nothing.
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return { ok: true, scheduledCount: 0, downloadUrl };
  }
  const email = parsed.data.email;

  let ip = "unknown";
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  } catch {
    /* headers() unavailable — shared restrictive bucket */
  }

  const claim = await claimEmailCaptureSlot({ email, ip, surface: "mip" });
  if (!claim.allowed) {
    if (claim.reason === "DUPLICATE") {
      // Already have the pack — hand them the link again, schedule nothing.
      return { ok: true, scheduledCount: 0, downloadUrl };
    }
    if (claim.reason === "UNAVAILABLE") {
      Sentry.captureMessage(
        "email-capture guard unavailable — lead magnet blocked",
        {
          level: "error",
          tags: { feature: "lead-magnet-capture", guard: "unavailable" },
          extra: { detail: claim.detail },
        },
      );
      return {
        ok: false,
        code: "SEND_FAILED",
        message:
          "We couldn't send the pack right now. Please try again in a minute.",
      };
    }
    if (claim.reason === "GLOBAL_LIMIT") {
      Sentry.captureMessage(
        "email-capture global hourly cap hit (lead magnet)",
        {
          level: "warning",
          tags: { feature: "lead-magnet-capture", guard: "global_limit" },
        },
      );
    }
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many requests just now — please try again shortly.",
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    Sentry.captureMessage(
      "RESEND_API_KEY missing — lead magnet capture disabled",
      {
        level: "error",
        tags: { feature: "lead-magnet-capture" },
      },
    );
    await releaseEmailCaptureSlot(claim.emailBucketKey);
    return {
      ok: false,
      code: "CONFIG_MISSING",
      message: "Email sending isn't configured. Try again later.",
    };
  }

  const from = process.env.EMAIL_FROM || "TrueCap <hello@usetruecap.com>";
  const replyTo = process.env.EMAIL_REPLY_TO || "hello@usetruecap.com";
  const unsubscribeMailbox = (
    replyTo.match(/<([^>]+)>/)?.[1] ?? replyTo
  ).trim();
  const ctx: SequenceCtx = {
    siteUrlHtml: escapeHtml(siteUrl),
  };

  let scheduledCount = 0;
  let day0Sent = false;
  for (const item of SEQUENCE) {
    const payload: Record<string, unknown> = {
      from,
      to: [email],
      subject: item.subject,
      html: wrapHtml(item.build(ctx), escapeHtml(unsubscribeMailbox)),
      reply_to: replyTo,
      tags: [{ name: "purpose", value: "lead-magnet" }],
      headers: {
        "List-Unsubscribe": `<mailto:${unsubscribeMailbox}?subject=unsubscribe>`,
      },
    };
    if (item.delayDays > 0) {
      payload.scheduled_at = new Date(
        Date.now() + item.delayDays * 24 * 60 * 60 * 1000,
      ).toISOString();
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        scheduledCount += 1;
        if (item.delayDays === 0) day0Sent = true;
      } else {
        Sentry.captureMessage("Lead magnet email send failed", {
          level: "error",
          tags: { feature: "lead-magnet-capture" },
          extra: { status: res.status, delay_days: item.delayDays },
        });
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: "lead-magnet-capture" },
      });
    }
  }

  if (scheduledCount === 0) {
    // NOTHING went out — refund the email bucket so a Resend blip doesn't
    // lock this address out for 30 days (release contract: only when zero
    // emails were actually sent). They still get the direct link.
    await releaseEmailCaptureSlot(claim.emailBucketKey);
  } else if (!day0Sent) {
    // Follow-ups scheduled but the delivery email failed — keep the slot
    // (mail IS queued) and make the broken state visible.
    Sentry.captureMessage(
      "Lead magnet day-0 send failed but follow-ups scheduled",
      {
        level: "warning",
        tags: { feature: "lead-magnet-capture" },
        extra: { scheduled_count: scheduledCount },
      },
    );
  }
  return { ok: true, scheduledCount, downloadUrl };
}
