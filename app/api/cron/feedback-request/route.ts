/**
 * GET /api/cron/feedback-request — daily (vercel.json), dormant by default.
 *
 * The ONE guarded feedback-request email (docs/site-overhaul.md Phase 5.7).
 * FEEDBACK_EMAIL_MODE: `off` (DEFAULT — nothing happens), `dry` (count the
 * audience, send nothing), `live` (send once per eligible user; each user is
 * claimed in feedback_email_sends before the provider call, so no user can
 * ever receive it twice). Requires RESEND_API_KEY and SHARE_LINK_SECRET (the
 * unsubscribe link is signed; without it nothing is sent).
 */
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import {
  createResendTransport,
  resolveFeedbackEmailMode,
  runFeedbackEmailJob,
} from "@/lib/testimonials/feedback-email";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    Sentry.captureMessage("[cron/feedback-request] CRON_SECRET env var not set", {
      level: "error",
      tags: { feature: "testimonials" },
    });
    return NextResponse.json({ ok: false, message: "CRON_SECRET not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const mode = resolveFeedbackEmailMode(process.env.FEEDBACK_EMAIL_MODE);
  if (mode === "off") return NextResponse.json({ ok: true, skipped: true, reason: "mode_off" });

  const resendKey = process.env.RESEND_API_KEY;
  if (mode === "live" && !resendKey) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_email_provider" });
  }
  try {
    const summary = await runFeedbackEmailJob({
      admin: createAdminSupabaseClient(),
      mode,
      transport: resendKey ? createResendTransport(resendKey) : async () => ({ ok: false }),
      siteUrl: getSiteUrl(),
      from: process.env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>",
      postalAddress: process.env.EMAIL_POSTAL_ADDRESS?.trim() || null,
    });
    console.log(`[cron/feedback-request] ${JSON.stringify(summary)}`);
    Sentry.captureMessage(`[cron/feedback-request] ${mode}: audience=${summary.audience} sent=${summary.sent}`, {
      level: "info",
      tags: { feature: "testimonials", stage: "feedback-email", mode },
      extra: summary,
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "testimonials", stage: "feedback-email" } });
    return NextResponse.json({ ok: false, message: "Internal error" }, { status: 500 });
  }
}
