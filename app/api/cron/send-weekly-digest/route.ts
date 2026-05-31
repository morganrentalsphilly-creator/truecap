/**
 * GET /api/cron/send-weekly-digest
 *
 * Vercel Cron endpoint — fires every Monday at 13:00 UTC (9am ET in
 * winter, 9am ET in DST too because Vercel cron is UTC and Monday is
 * Monday in both). Schedule lives in vercel.json.
 *
 * What it does:
 *   1. Auth check — only Vercel cron (or a request with CRON_SECRET)
 *      can trigger it. Public hits get 401.
 *   2. Compute "this Monday's" date.
 *   3. Look up /emails/content/YYYY-MM-DD.json.
 *   4. If found, render the email and POST a Broadcast to Resend
 *      targeting the configured audience.
 *   5. If not found, log + return 200 (no-op weeks are fine).
 *
 * Resend Broadcasts API auto-fans-out to every contact in the audience
 * AND auto-substitutes the {{{RESEND_UNSUBSCRIBE_URL}}} placeholder
 * with a unique per-recipient unsubscribe link. So one POST = one
 * broadcast = many emails sent.
 *
 * Note: Broadcasts have a "create" step + a separate "send" step
 * in Resend's API. The create step returns a broadcast ID; the send
 * step uses that ID. We do both back-to-back here.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { currentSendDate, loadContent, renderWeeklyDigest } from "@/lib/email/render-weekly";

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>";

/**
 * Centralized error-reporting for cron failures. Goes to Sentry so
 * a failed Tuesday send produces an alert instead of silently missing
 * a week. Tags help filter cron-specific errors from other noise.
 */
function reportCronFailure(message: string, context: Record<string, unknown> = {}) {
  Sentry.captureMessage(`[cron/weekly-digest] ${message}`, {
    level: "error",
    tags: { feature: "newsletter-cron", endpoint: "send-weekly-digest" },
    extra: context,
  });
}

export async function GET(request: Request) {
  // ─────────────────────────────────────────────────────────
  // 1. Auth — Vercel cron sends `Authorization: Bearer <CRON_SECRET>`
  //    when the env var is set. Manual triggers (e.g. testing from
  //    your terminal) also need to include this header.
  // ─────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret) {
    console.error("[cron/weekly-digest] CRON_SECRET is not set — rejecting.");
    reportCronFailure("CRON_SECRET env var not set", { hasAuth: Boolean(auth) });
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET not configured." },
      { status: 500 }
    );
  }
  if (auth !== `Bearer ${cronSecret}`) {
    // Don't alert on 401s — could be probing traffic. Only logged.
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  // ─────────────────────────────────────────────────────────
  // 1b. Manual kill switch — set NEWSLETTER_PAUSED=1 in Vercel env vars
  //     to pause sends without a redeploy. To resume: unset (or set to
  //     "0"/"false"). Logs every paused invocation so you can see the
  //     cron is firing but intentionally bailing out — much safer than
  //     deleting the cron from vercel.json (which is easy to forget to
  //     re-add). Note: this does NOT cancel broadcasts already
  //     pre-scheduled at Resend via `npm run schedule-broadcasts` —
  //     cancel those manually in the Resend dashboard.
  // ─────────────────────────────────────────────────────────
  const pausedRaw = (process.env.NEWSLETTER_PAUSED ?? "").trim().toLowerCase();
  const isPaused = pausedRaw === "1" || pausedRaw === "true" || pausedRaw === "yes";
  if (isPaused) {
    console.info("[cron/weekly-digest] NEWSLETTER_PAUSED=%s — skipping send.", pausedRaw);
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "paused",
      message: "Newsletter sends are paused (NEWSLETTER_PAUSED env var). Unset to resume.",
    });
  }

  // ─────────────────────────────────────────────────────────
  // 2. Required Resend env vars
  // ─────────────────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    console.error("[cron/weekly-digest] Missing Resend env vars.");
    reportCronFailure("Missing Resend env vars", {
      hasApiKey: Boolean(apiKey),
      hasAudienceId: Boolean(audienceId),
    });
    return NextResponse.json(
      { ok: false, message: "Resend not configured." },
      { status: 500 }
    );
  }

  // ─────────────────────────────────────────────────────────
  // 3. Look up this Monday's content
  // ─────────────────────────────────────────────────────────
  const today = currentSendDate();
  const content = await loadContent(today);
  if (!content) {
    console.info("[cron/weekly-digest] No content for %s — skipping send.", today);
    return NextResponse.json({
      ok: true,
      skipped: true,
      date: today,
      message: `No content file for ${today}. Skipped — fine for off-weeks.`,
    });
  }

  // ─────────────────────────────────────────────────────────
  // 4. Idempotency — skip if a broadcast for this date already
  //    exists in Resend. Prevents duplicate sends when a date was
  //    pre-scheduled via `npm run schedule-broadcasts` (Resend's 28-day
  //    pre-scheduling window can overlap with the weekly cron's fire
  //    schedule on the same Tuesday).
  //
  //    We match on the broadcast name we use everywhere else:
  //    `Weekly digest · ${today}`. If any broadcast with that exact
  //    name exists (any status: draft, scheduled, sent), skip.
  // ─────────────────────────────────────────────────────────
  const expectedName = `Weekly digest · ${today}`;
  try {
    const listRes = await fetch("https://api.resend.com/broadcasts", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (listRes.ok) {
      const listBody = (await listRes.json().catch(() => ({}))) as {
        data?: Array<{ id: string; name: string; status: string }>;
      };
      const existing = (listBody.data ?? []).find((b) => b.name === expectedName);
      if (existing) {
        console.info(
          "[cron/weekly-digest] Broadcast already exists for %s (id=%s, status=%s) — skipping to avoid duplicate.",
          today,
          existing.id,
          existing.status
        );
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: "already_exists",
          date: today,
          broadcast_id: existing.id,
          existing_status: existing.status,
        });
      }
    } else {
      // Non-fatal: if we can't verify, log and proceed. Worst case
      // is a manual duplicate cleanup. Better than silently missing a send.
      console.warn(
        "[cron/weekly-digest] Could not list existing broadcasts (%s) — proceeding without idempotency check.",
        listRes.status
      );
    }
  } catch (error) {
    console.warn("[cron/weekly-digest] Idempotency check failed (proceeding):", error);
  }

  // ─────────────────────────────────────────────────────────
  // 5. Render the email. Use Resend's substitution placeholder so the
  //    per-recipient unsubscribe link gets dropped in by Resend.
  // ─────────────────────────────────────────────────────────
  const { html, text, subject } = await renderWeeklyDigest(content, {
    unsubscribeUrl: "{{{RESEND_UNSUBSCRIBE_URL}}}",
  });

  // ─────────────────────────────────────────────────────────
  // 6. Create the broadcast in Resend
  // ─────────────────────────────────────────────────────────
  try {
    const createRes = await fetch("https://api.resend.com/broadcasts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audience_id: audienceId,
        from: FROM_ADDRESS,
        subject,
        html,
        text,
        // Friendly internal name so Morgan can find it in the dashboard.
        name: `Weekly digest · ${today}`,
        // reply_to lets Resend route inbox replies to a human address.
        reply_to: process.env.EMAIL_REPLY_TO ?? "hello@usetruecap.com",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const createBody = (await createRes.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!createRes.ok || !createBody.id) {
      console.error("[cron/weekly-digest] Create broadcast failed:", createRes.status, createBody);
      reportCronFailure("Resend create broadcast failed", {
        date: today,
        subject,
        resendStatus: createRes.status,
        resendMessage: createBody.message,
      });
      return NextResponse.json(
        {
          ok: false,
          message: createBody.message ?? `Resend create returned ${createRes.status}.`,
        },
        { status: 502 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // 7. Send the broadcast we just created.
    // ─────────────────────────────────────────────────────────
    const sendRes = await fetch(
      `https://api.resend.com/broadcasts/${encodeURIComponent(createBody.id)}/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(15_000),
      }
    );
    const sendBody = (await sendRes.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!sendRes.ok) {
      console.error("[cron/weekly-digest] Send broadcast failed:", sendRes.status, sendBody);
      reportCronFailure("Resend send broadcast failed", {
        date: today,
        subject,
        broadcastId: createBody.id,
        resendStatus: sendRes.status,
        resendMessage: sendBody.message,
      });
      return NextResponse.json(
        {
          ok: false,
          message: sendBody.message ?? `Resend send returned ${sendRes.status}.`,
          broadcast_id: createBody.id,
        },
        { status: 502 }
      );
    }

    console.info(
      "[cron/weekly-digest] Sent broadcast %s for %s — subject: %s",
      createBody.id,
      today,
      subject
    );
    return NextResponse.json({
      ok: true,
      broadcast_id: createBody.id,
      date: today,
      subject,
    });
  } catch (error) {
    console.error("[cron/weekly-digest] Network error:", error);
    Sentry.captureException(error, {
      tags: { feature: "newsletter-cron", endpoint: "send-weekly-digest" },
      extra: { date: today, subject },
    });
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Network error.",
      },
      { status: 502 }
    );
  }
}
