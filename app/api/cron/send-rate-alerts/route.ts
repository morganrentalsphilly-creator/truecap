/**
 * Weekly rate-alert cron — re-underwrites Pro users' saved deals when
 * the 30-year mortgage rate moves, and emails the ones whose story
 * changed. Scheduled Thursdays 18:00 UTC (vercel.json) — after FRED's
 * weekly PMMS print lands Thursday midday ET.
 *
 * SAFETY MODEL (mirrors the weekly-digest cron):
 *  1. Auth-gated on `Authorization: Bearer ${CRON_SECRET}`.
 *  2. KILL SWITCH: RATE_ALERTS_MODE env controls everything:
 *       - unset / "off"  → no-op (DEFAULT — the feature ships dormant)
 *       - "dry"          → full compute, returns a JSON preview of every
 *                          email that WOULD send (recipients masked,
 *                          first email's HTML included). Sends nothing.
 *       - "live"         → actually sends via Resend.
 *     Morgan flips off → dry → live after reviewing a dry run.
 *  3. Flat weeks are silent: requires the FRED print to have moved
 *     ≥ RATE_ALERTS_MIN_WEEKLY_MOVE_PP vs the previous print.
 *  4. Per-deal + per-user gating in lib/rate-alerts.ts (pure, tested):
 *     only STATE changes alert (tier / DSCR band / cash-flow sign).
 *  5. Failures → Sentry.captureMessage tagged feature: rate-alerts.
 *
 * Audience: users with an active/trialing subscription (rate alerts
 * are a Pro retention feature) and at least one financed, non-archived
 * saved deal whose form snapshot still validates.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { render } from "@react-email/render";
import RateAlertEmail from "@/emails/rate-alert";
import {
  buildRateAlertForDeal,
  RATE_ALERTS_MAX_DEALS_PER_EMAIL,
  RATE_ALERTS_MIN_WEEKLY_MOVE_PP,
  rateAlertSubject,
  type RateAlertDeal,
} from "@/lib/rate-alerts";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import { resolveRateAlertsMode } from "@/lib/rate-alerts-mode";
import { getPaidUserIds } from "@/lib/paid-user-ids";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
// Re-underwriting many deals + per-user emails can exceed the default.
export const maxDuration = 120;

// Mode parse lives in lib/rate-alerts-mode.ts — SHARED with every surface
// that promises an alert email, so copy and sends can never disagree.
const resolveMode = resolveRateAlertsMode;

/** Latest two weekly MORTGAGE30US observations, newest first. */
async function fetchRatePair(): Promise<{ current: number; previous: number } | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", "MORTGAGE30US");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "2");
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as { observations?: Array<{ value: string }> };
  const [latest, prior] = json.observations ?? [];
  const current = Number(latest?.value);
  const previous = Number(prior?.value);
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return { current, previous };
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}

export async function GET(request: Request) {
  // 1. Auth — same contract as the weekly digest cron.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    Sentry.captureMessage("rate-alerts cron: CRON_SECRET not configured", {
      level: "error",
      tags: { feature: "rate-alerts" },
    });
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Kill switch.
  const mode = resolveMode();
  if (mode === "off") {
    console.log("[rate-alerts] RATE_ALERTS_MODE is off — skipping (feature dormant)");
    return NextResponse.json({ skipped: true, reason: "mode_off" });
  }

  try {
    // 3. Rate gate — silent on flat weeks.
    const rates = await fetchRatePair();
    if (!rates) {
      Sentry.captureMessage("rate-alerts cron: could not fetch FRED rate pair", {
        level: "warning",
        tags: { feature: "rate-alerts" },
      });
      return NextResponse.json({ skipped: true, reason: "fred_unavailable" });
    }
    const weeklyMove = rates.current - rates.previous;
    if (Math.abs(weeklyMove) < RATE_ALERTS_MIN_WEEKLY_MOVE_PP) {
      console.log(
        `[rate-alerts] weekly move ${weeklyMove.toFixed(3)}pp below ${RATE_ALERTS_MIN_WEEKLY_MOVE_PP}pp — flat week, skipping`
      );
      return NextResponse.json({ skipped: true, reason: "flat_week", weeklyMove });
    }

    const admin = createAdminSupabaseClient();

    // 4. Audience: paying users — via the shared plan-aware helper so the
    // cron audience matches the entitlement layer exactly (includes
    // past_due, excludes active rows mapped to the free/no plan).
    const userIds = await getPaidUserIds(admin);
    if (userIds.length === 0) {
      return NextResponse.json({ skipped: true, reason: "no_paid_users" });
    }

    // …who have OPTED IN to rate-alert emails (consent gate — see
    // profiles.rate_alert_emails + the Settings toggle).
    const { data: prefRows, error: prefError } = await admin
      .from("profiles")
      .select("id")
      .in("id", userIds)
      .eq("rate_alert_emails", true);
    if (prefError) throw prefError;
    const optedInIds = (prefRows ?? []).map((r) => r.id as string);
    if (optedInIds.length === 0) {
      return NextResponse.json({ skipped: true, reason: "no_opted_in_users" });
    }

    // …with saved, non-archived deals.
    const { data: dealRows, error: dealError } = await admin
      .from("saved_analyses")
      .select("id, user_id, title, address, form_snapshot")
      .in("user_id", optedInIds)
      .is("deleted_at", null)
      .neq("is_archived", true);
    if (dealError) throw dealError;

    // 5. Re-underwrite per deal; group alerts per user.
    const alertsByUser = new Map<string, RateAlertDeal[]>();
    for (const row of dealRows ?? []) {
      const parsed = investmentFormSchema.safeParse(row.form_snapshot);
      if (!parsed.success) continue; // pre-snapshot or partial save — skip quietly
      const alert = buildRateAlertForDeal({
        id: row.id as string,
        title: row.title as string | null,
        address: row.address as string | null,
        values: parsed.data,
        currentRatePct: rates.current,
      });
      if (!alert) continue;
      const list = alertsByUser.get(row.user_id as string) ?? [];
      if (list.length < RATE_ALERTS_MAX_DEALS_PER_EMAIL) list.push(alert);
      alertsByUser.set(row.user_id as string, list);
    }

    if (alertsByUser.size === 0) {
      return NextResponse.json({
        skipped: true,
        reason: "no_state_changes",
        weeklyMove,
        currentRate: rates.current,
      });
    }

    // 6. Build + (dry-preview | send) one email per user.
    const siteUrl = getSiteUrl();
    const from = process.env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>";
    const resendKey = process.env.RESEND_API_KEY;
    const preview: Array<{ to: string; subject: string; dealCount: number; changes: string[] }> = [];
    let firstHtml: string | null = null;
    let sent = 0;

    for (const [userId, deals] of alertsByUser) {
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (userError || !email) continue;

      const fell = rates.current < rates.previous;
      const subject = rateAlertSubject(rates.current, deals.length, fell);
      const html = await render(
        RateAlertEmail({
          currentRatePct: rates.current,
          previousRatePct: rates.previous,
          deals,
          siteUrl,
        })
      );
      if (!firstHtml) firstHtml = html;

      if (mode === "dry") {
        preview.push({
          to: maskEmail(email),
          subject,
          dealCount: deals.length,
          changes: deals.flatMap((d) => d.changes),
        });
        continue;
      }

      // SEND IDEMPOTENCY. Vercel can retry a cron, and the endpoint is
      // callable directly with the bearer secret — without a claim, a second
      // invocation re-emails every opted-in paid user. Same primitive the
      // lifecycle cron uses: unique (user_id, email_key) on
      // lifecycle_email_log, claimed BEFORE the send. A duplicate key means
      // someone already sent today's alert to this user, so skip.
      const sendKey = `rate_alert_${new Date().toISOString().slice(0, 10)}`;
      const { error: claimError } = await admin
        .from("lifecycle_email_log")
        .insert({ user_id: userId, email_key: sendKey });
      if (claimError) {
        // 23505 = already claimed (the expected duplicate-run path).
        if (claimError.code !== "23505") {
          Sentry.captureMessage("rate-alerts cron: send-claim failed", {
            level: "error",
            tags: { feature: "rate-alerts" },
            extra: { database_code: claimError.code ?? "unknown" },
          });
        }
        continue;
      }

      if (!resendKey) {
        Sentry.captureMessage("rate-alerts cron: RESEND_API_KEY missing in live mode", {
          level: "error",
          tags: { feature: "rate-alerts" },
        });
        return NextResponse.json({ error: "Not configured" }, { status: 500 });
      }
      const sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: email, subject, html }),
      });
      if (!sendRes.ok) {
        const body = await sendRes.text().catch(() => "");
        Sentry.captureMessage(`rate-alerts cron: Resend send failed (${sendRes.status})`, {
          level: "error",
          tags: { feature: "rate-alerts" },
          extra: { body: body.slice(0, 300) },
        });
        continue; // keep sending to remaining users
      }
      sent += 1;
    }

    if (mode === "dry") {
      console.log(`[rate-alerts] DRY RUN — ${preview.length} emails would send`);
      return NextResponse.json({
        mode: "dry",
        currentRate: rates.current,
        previousRate: rates.previous,
        weeklyMove,
        wouldSend: preview,
        firstEmailHtml: firstHtml,
      });
    }

    console.log(`[rate-alerts] LIVE — sent ${sent}/${alertsByUser.size} alert emails`);
    return NextResponse.json({
      mode: "live",
      sent,
      eligibleUsers: alertsByUser.size,
      currentRate: rates.current,
      weeklyMove,
    });
  } catch (error) {
    Sentry.captureMessage("rate-alerts cron: unhandled failure", {
      level: "error",
      tags: { feature: "rate-alerts" },
      extra: { message: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
