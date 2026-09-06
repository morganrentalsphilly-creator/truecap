/**
 * GET /api/cron/billing-reconcile
 *
 * Daily (vercel.json) Stripe ↔ user binding reconcile — the slow path behind
 * the webhook's ordered resolver. Logic lives in lib/billing/reconcile.ts;
 * this route is auth + mode + reporting.
 *
 * SAFETY MODEL
 *  1. Auth-gated on `Authorization: Bearer ${CRON_SECRET}` (same contract as
 *     every other cron here). Missing secret → 500 + Sentry; bad bearer → 401.
 *  2. BILLING_RECONCILE_MODE: `dry` (DEFAULT — counts only, writes nothing),
 *     `apply` (bind + backfill through upsertSubscriptionFromStripe, record
 *     unresolvables), `off` (no-op). Dry is the default on purpose: the run
 *     that established the baseline had no way to set env, and a read-only
 *     report is the conservative choice for an unattended cron.
 *  3. Reporting is COUNTS ONLY — one console line (Vercel runtime logs), one
 *     Sentry message (warning when anything is unresolved, info otherwise),
 *     and the JSON response. No emails, no ids, no addresses.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getStripe } from "@/lib/stripe/client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  resolveBillingReconcileMode,
  runBillingReconcile,
} from "@/lib/billing/reconcile";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    Sentry.captureMessage("[cron/billing-reconcile] CRON_SECRET env var not set", {
      level: "error",
      tags: { feature: "billing-reconcile" },
    });
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET not configured." },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const mode = resolveBillingReconcileMode(process.env.BILLING_RECONCILE_MODE);
  if (mode === "off") {
    return NextResponse.json({ ok: true, skipped: true, reason: "mode_off" });
  }

  try {
    const summary = await runBillingReconcile({
      stripe: getStripe(),
      admin: createAdminSupabaseClient(),
      mode,
      log: (line) => console.error(line),
    });
    console.log(`[cron/billing-reconcile] ${JSON.stringify(summary)}`);
    Sentry.captureMessage(
      `[cron/billing-reconcile] ${mode}: unresolved=${summary.unresolved}, applied=${summary.applied}`,
      {
        level: summary.unresolved > 0 || summary.errors > 0 ? "warning" : "info",
        tags: { feature: "billing-reconcile", mode },
        extra: summary,
      },
    );
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    Sentry.captureMessage("[cron/billing-reconcile] unhandled failure", {
      level: "error",
      tags: { feature: "billing-reconcile", mode },
      extra: { message: error instanceof Error ? error.message.slice(0, 200) : "unknown" },
    });
    return NextResponse.json({ ok: false, message: "Internal error" }, { status: 500 });
  }
}
