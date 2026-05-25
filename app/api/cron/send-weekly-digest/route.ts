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
import { currentSendDate, loadContent, renderWeeklyDigest } from "@/lib/email/render-weekly";

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>";

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
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET not configured." },
      { status: 500 }
    );
  }
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  // ─────────────────────────────────────────────────────────
  // 2. Required Resend env vars
  // ─────────────────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    console.error("[cron/weekly-digest] Missing Resend env vars.");
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
  // 4. Render the email. Use Resend's substitution placeholder so the
  //    per-recipient unsubscribe link gets dropped in by Resend.
  // ─────────────────────────────────────────────────────────
  const { html, text, subject } = await renderWeeklyDigest(content, {
    unsubscribeUrl: "{{{RESEND_UNSUBSCRIBE_URL}}}",
  });

  // ─────────────────────────────────────────────────────────
  // 5. Create the broadcast in Resend
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
      return NextResponse.json(
        {
          ok: false,
          message: createBody.message ?? `Resend create returned ${createRes.status}.`,
        },
        { status: 502 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // 6. Send the broadcast we just created.
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
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Network error.",
      },
      { status: 502 }
    );
  }
}
