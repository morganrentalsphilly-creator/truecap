/**
 * Weekly summary cron — emails opted-in Pro users a compact recap of
 * their portfolio (pipeline totals, owned equity, biggest rate mover,
 * due-diligence deadlines, buy-box fit). Scheduled Fridays 15:00 UTC
 * (vercel.json) — after Thursday's FRED print, before the weekend
 * deal-hunting window.
 *
 * SAFETY MODEL (mirrors send-rate-alerts + the lifecycle cron):
 *  1. Auth-gated on `Authorization: Bearer ${CRON_SECRET}`.
 *  2. KILL SWITCH: WEEKLY_SUMMARY_MODE env controls everything:
 *       - unset / "off"  → no-op (DEFAULT — the feature ships dormant)
 *       - "dry"          → full compute, returns a JSON preview of every
 *                          email that WOULD send (recipients masked,
 *                          first email's HTML included). Sends NOTHING,
 *                          writes NOTHING.
 *       - "live"         → sends via Resend + records weekly_summary_log.
 *     Morgan flips off → dry → live after reviewing a dry run.
 *  3. DOUBLE-GATED consent: only paid users with
 *     profiles.weekly_summary_emails = true (default false) are considered
 *     — flipping the mode to "live" never emails someone who didn't opt in.
 *  4. Idempotency: weekly_summary_log (unique on user_id + iso_week) —
 *     at most ONE summary per user per ISO week. CLAIM-then-send (the
 *     stripe-events / lifecycle pattern): insert the log row first; a
 *     23505 means another run already claimed this week → skip. A claim
 *     followed by a send failure is at-most-once — the right default for
 *     a digest email.
 *  5. Users with nothing to say (no deals / only passed deals) are
 *     skipped entirely — buildWeeklySummary returns null.
 *  6. Failures → Sentry.captureMessage tagged feature: weekly-summary-cron.
 *
 * Requires the weekly_summary migration
 * (supabase/migrations/20260706120000_weekly_summary.sql) to be applied.
 * Pure logic in lib/weekly-summary.ts (unit-tested); template
 * emails/weekly-summary.tsx.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { render } from "@react-email/render";
import WeeklySummaryEmail from "@/emails/weekly-summary";
import {
  buildWeeklySummary,
  isoWeekKey,
  normalizeWeeklyBuyBoxRow,
  weeklySummarySubject,
  type WeeklySummaryDealRow,
  type WeeklySummaryDueDiligenceRow,
  type WeeklySummaryPayload,
} from "@/lib/weekly-summary";
import type { NamedBuyBox } from "@/lib/buy-box";
import { resolveWeeklySummaryMode } from "@/lib/weekly-summary-mode";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
// Recomputing many deals + per-user emails can exceed the default.
export const maxDuration = 120;

// Mode parse lives in lib/weekly-summary-mode.ts — SHARED with the Settings
// toggle copy derivation, so copy and sends can never disagree.
const resolveMode = resolveWeeklySummaryMode;

/** Safety ceiling per run (solo-app scale; mirrors the lifecycle cron). */
const MAX_SENDS_PER_RUN = 500;

const SENTRY_TAGS = { feature: "weekly-summary-cron" } as const;

/** Latest two weekly MORTGAGE30US observations, newest first. Null on any
 *  failure — the summary's rate section simply goes quiet (non-fatal). */
async function fetchRatePair(): Promise<{ current: number; previous: number } | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", "MORTGAGE30US");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "2");
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { observations?: Array<{ value: string }> };
    const [latest, prior] = json.observations ?? [];
    const current = Number(latest?.value);
    const previous = Number(prior?.value);
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
    return { current, previous };
  } catch {
    return null;
  }
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}

function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}

function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

/** Compact per-user preview line for the dry-run JSON. */
function previewSections(payload: WeeklySummaryPayload) {
  return {
    pipeline: payload.pipeline,
    owned: payload.owned,
    rateMover: payload.rateMover
      ? {
          weeklyMovePp: Number(payload.rateMover.weeklyMovePp.toFixed(3)),
          monitoredCount: payload.rateMover.monitoredCount,
          changedCount: payload.rateMover.changedCount,
          topDeal: payload.rateMover.topDeal?.label ?? null,
        }
      : null,
    dueItemCount: payload.dueItems.length,
    buyBox: payload.buyBox,
  };
}

export async function GET(request: Request) {
  // 1. Auth — same contract as the other crons.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    Sentry.captureMessage("weekly-summary cron: CRON_SECRET not configured", {
      level: "error",
      tags: SENTRY_TAGS,
    });
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Kill switch.
  const mode = resolveMode();
  if (mode === "off") {
    console.log("[weekly-summary] WEEKLY_SUMMARY_MODE is off — skipping (feature dormant)");
    return NextResponse.json({ skipped: true, reason: "mode_off" });
  }

  try {
    const admin = createAdminSupabaseClient();

    // 3. Audience: paying users…
    const { data: subRows, error: subError } = await admin
      .from("subscriptions")
      .select("user_id")
      .in("status", ["active", "trialing"]);
    if (subError) throw subError;
    const userIds = [...new Set((subRows ?? []).map((r) => r.user_id as string))];
    if (userIds.length === 0) {
      return NextResponse.json({ skipped: true, reason: "no_paid_users" });
    }

    // …who have OPTED IN to the weekly summary (its OWN consent surface —
    // profiles.weekly_summary_emails, NOT the rate-alert flag). A missing
    // column (migration unapplied) fails closed: throw → Sentry + 500.
    const { data: prefRows, error: prefError } = await admin
      .from("profiles")
      .select("id")
      .in("id", userIds)
      .eq("weekly_summary_emails", true);
    if (prefError) throw prefError;
    const optedInIds = (prefRows ?? []).map((r) => r.id as string);
    if (optedInIds.length === 0) {
      return NextResponse.json({ skipped: true, reason: "no_opted_in_users" });
    }

    // 4. Their saved deals (all non-deleted; the pure lib buckets them into
    // pipeline / owned / passed by stage). close_date ships in its own
    // migration — retry without it on 42703 (equity simply stays hidden,
    // mirroring the dashboard's tolerance).
    const DEAL_COLS =
      "id, user_id, title, address, property_type, purchase_price, net_cash_flow_monthly, pipeline_stage, is_completed, is_archived, form_snapshot";
    let dealRows: Array<WeeklySummaryDealRow & { user_id: string }> | null = null;
    const dealResult = await admin
      .from("saved_analyses")
      .select(`${DEAL_COLS}, close_date`)
      .in("user_id", optedInIds)
      .is("deleted_at", null);
    if (!dealResult.error) {
      dealRows = (dealResult.data ?? []) as unknown as Array<
        WeeklySummaryDealRow & { user_id: string }
      >;
    } else if (isMissingColumn(dealResult.error)) {
      const fallback = await admin
        .from("saved_analyses")
        .select(DEAL_COLS)
        .in("user_id", optedInIds)
        .is("deleted_at", null);
      if (fallback.error) throw fallback.error;
      dealRows = (fallback.data ?? []) as unknown as Array<
        WeeklySummaryDealRow & { user_id: string }
      >;
    } else {
      throw dealResult.error;
    }

    const dealsByUser = new Map<string, WeeklySummaryDealRow[]>();
    for (const row of dealRows ?? []) {
      const list = dealsByUser.get(row.user_id) ?? [];
      list.push(row);
      dealsByUser.set(row.user_id, list);
    }
    if (dealsByUser.size === 0) {
      return NextResponse.json({ skipped: true, reason: "no_deals" });
    }

    // 5. Context reads — each degrades to "section absent" on failure
    // (missing table = migration unapplied) rather than aborting the run.
    const [ratePair, ddResult, boxResult] = await Promise.all([
      fetchRatePair(),
      admin
        .from("deal_due_diligence")
        .select("analysis_id, user_id, items")
        .in("user_id", optedInIds),
      admin
        .from("user_buy_boxes")
        .select(
          "id, user_id, name, strategy_kind, min_cap_rate_pct, min_coc_pct, min_dscr, min_cash_flow_monthly, max_purchase_price, property_types, target_states, is_active, is_default, sort_order"
        )
        .in("user_id", optedInIds),
    ]);

    const dueByUser = new Map<string, WeeklySummaryDueDiligenceRow[]>();
    if (ddResult.error) {
      if (!isMissingTable(ddResult.error)) {
        Sentry.captureMessage("weekly-summary cron: due-diligence read failed — section omitted", {
          level: "warning",
          tags: SENTRY_TAGS,
          extra: { code: ddResult.error.code, message: ddResult.error.message },
        });
      }
    } else {
      for (const r of ddResult.data ?? []) {
        const uid = r.user_id as string;
        const list = dueByUser.get(uid) ?? [];
        list.push({ analysisId: r.analysis_id as string, items: r.items });
        dueByUser.set(uid, list);
      }
    }

    const boxesByUser = new Map<string, NamedBuyBox[]>();
    if (boxResult.error) {
      if (!isMissingTable(boxResult.error)) {
        Sentry.captureMessage("weekly-summary cron: buy-boxes read failed — section omitted", {
          level: "warning",
          tags: SENTRY_TAGS,
          extra: { code: boxResult.error.code, message: boxResult.error.message },
        });
      }
    } else {
      for (const r of boxResult.data ?? []) {
        const uid = (r as { user_id: string }).user_id;
        const box = normalizeWeeklyBuyBoxRow(r);
        if (!box) continue;
        const list = boxesByUser.get(uid) ?? [];
        list.push(box);
        boxesByUser.set(uid, list);
      }
    }

    // 6. Build per-user payloads. Users with nothing to say → skipped.
    const now = new Date();
    const isoWeek = isoWeekKey(now);
    const todayISO = now.toISOString().slice(0, 10);
    const summaries: Array<{ userId: string; payload: WeeklySummaryPayload }> = [];
    for (const [userId, deals] of dealsByUser) {
      const payload = buildWeeklySummary(deals, {
        ratePair,
        buyBoxes: boxesByUser.get(userId) ?? [],
        dueDiligence: dueByUser.get(userId) ?? [],
        todayISO,
        asOf: now,
      });
      if (payload) summaries.push({ userId, payload });
      if (summaries.length >= MAX_SENDS_PER_RUN) break;
    }
    if (summaries.length === 0) {
      return NextResponse.json({ skipped: true, reason: "nothing_to_say", isoWeek });
    }

    // 7. Build + (dry-preview | claim-then-send) one email per user.
    const siteUrl = getSiteUrl();
    const from = process.env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>";
    const resendKey = process.env.RESEND_API_KEY;
    const preview: Array<
      { to: string; subject: string } & ReturnType<typeof previewSections>
    > = [];
    let firstHtml: string | null = null;
    let sent = 0;
    let alreadySent = 0;

    for (const { userId, payload } of summaries) {
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (userError || !email) continue;

      const subject = weeklySummarySubject(payload);
      const html = await render(WeeklySummaryEmail({ payload, siteUrl }));
      if (!firstHtml) firstHtml = html;

      if (mode === "dry") {
        // ZERO sends, ZERO writes — preview only.
        preview.push({ to: maskEmail(email), subject, ...previewSections(payload) });
        continue;
      }

      if (!resendKey) {
        Sentry.captureMessage("weekly-summary cron: RESEND_API_KEY missing in live mode", {
          level: "error",
          tags: SENTRY_TAGS,
        });
        return NextResponse.json({ error: "Not configured" }, { status: 500 });
      }

      // CLAIM before sending (stripe-events / lifecycle pattern): insert the
      // log row FIRST. 23505 (unique on user_id + iso_week) means another run
      // already claimed/sent this week's summary → skip. This closes the
      // double-send window where a send succeeded but the post-send log write
      // was lost. Trade-off: claim + send-failure is at-most-once (skipped,
      // not retried) — the right default for a digest. Any OTHER claim error
      // (incl. the table's migration being unapplied) skips the user too:
      // NEVER send without the idempotency row.
      const { error: claimError } = await admin
        .from("weekly_summary_log")
        .insert({ user_id: userId, iso_week: isoWeek, resend_id: null });
      if (claimError) {
        if (claimError.code === "23505") {
          alreadySent += 1;
          continue;
        }
        Sentry.captureMessage("weekly-summary cron: claim insert failed", {
          level: "error",
          tags: SENTRY_TAGS,
          extra: { code: claimError.code, message: claimError.message },
        });
        continue;
      }

      let resendId: string | null = null;
      try {
        const sendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: email,
            subject,
            html,
            tags: [{ name: "purpose", value: "weekly-summary" }],
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!sendRes.ok) {
          const body = await sendRes.text().catch(() => "");
          Sentry.captureMessage(`weekly-summary cron: Resend send failed (${sendRes.status})`, {
            level: "error",
            tags: SENTRY_TAGS,
            extra: { body: body.slice(0, 300) },
          });
          continue; // keep sending to remaining users
        }
        const json = (await sendRes.json().catch(() => ({}))) as { id?: string };
        resendId = json.id ?? null;
      } catch (err) {
        Sentry.captureMessage("weekly-summary cron: Resend network error", {
          level: "error",
          tags: SENTRY_TAGS,
          extra: { message: err instanceof Error ? err.message : String(err) },
        });
        continue;
      }

      // Already claimed above; best-effort stamp the Resend id for tracing.
      if (resendId) {
        await admin
          .from("weekly_summary_log")
          .update({ resend_id: resendId })
          .eq("user_id", userId)
          .eq("iso_week", isoWeek)
          .then(() => undefined, () => undefined);
      }
      sent += 1;
    }

    if (mode === "dry") {
      console.log(`[weekly-summary] DRY RUN — ${preview.length} emails would send`);
      return NextResponse.json({
        mode: "dry",
        isoWeek,
        currentRate: ratePair?.current ?? null,
        previousRate: ratePair?.previous ?? null,
        wouldSendCount: preview.length,
        wouldSend: preview,
        firstEmailHtml: firstHtml,
      });
    }

    console.log(
      `[weekly-summary] LIVE — sent ${sent}/${summaries.length} (${alreadySent} already sent this week)`
    );
    return NextResponse.json({
      mode: "live",
      isoWeek,
      sent,
      eligibleUsers: summaries.length,
      alreadySent,
    });
  } catch (error) {
    Sentry.captureMessage("weekly-summary cron: unhandled failure", {
      level: "error",
      tags: SENTRY_TAGS,
      extra: { message: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
