/**
 * GET /api/cron/publish-testimonials — daily (vercel.json).
 * Publishes every pending, consented quote whose rules all hold
 * (lib/testimonials/rules.ts) after its 24-hour hold. Counts only; no email
 * (hard limit). The founder can take any quote down with its unpublish link
 * (/api/testimonials/unpublish?token=…, token in the testimonials row).
 */
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { runPublishJob } from "@/lib/testimonials/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    Sentry.captureMessage("[cron/publish-testimonials] CRON_SECRET env var not set", {
      level: "error",
      tags: { feature: "testimonials" },
    });
    return NextResponse.json({ ok: false, message: "CRON_SECRET not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runPublishJob(createAdminSupabaseClient(), new Date());
    console.log(`[cron/publish-testimonials] ${JSON.stringify(summary)}`);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "testimonials", stage: "publish-cron" } });
    return NextResponse.json({ ok: false, message: "Internal error" }, { status: 500 });
  }
}
