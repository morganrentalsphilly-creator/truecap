/**
 * GET /api/cron/reconcile-stripe
 *
 * Weekly Stripe reconciliation cron — Sundays 16:00 UTC (vercel.json).
 * The safety net for the "paid in Stripe, free in app" failure class
 * (see the 2026-07 Stripe-account-switch incident): webhook-driven sync
 * is the fast path, this cron is the slow path that notices when the
 * fast path silently failed.
 *
 * SAFETY MODEL (mirrors the rate-alerts cron):
 *  1. Auth-gated on `Authorization: Bearer ${CRON_SECRET}` — same
 *     contract as send-weekly-digest. Missing secret → 500 + Sentry;
 *     bad bearer → 401 (silent; could be probing traffic).
 *  2. KILL SWITCH: RECONCILE_MODE env controls everything:
 *       - unset / "off" → no-op (DEFAULT — ships dormant)
 *       - "dry"         → detect + report to Sentry, heal nothing
 *       - "live"        → detect + report + heal via
 *                         upsertSubscriptionFromStripe (the standard
 *                         webhook sync path — plan resolution runs
 *                         through resolvePlanIdForPrice, so healing
 *                         also re-fires the unmapped-plan alarm)
 *  3. Failures → Sentry.captureMessage tagged feature: stripe-reconcile.
 *  4. NO emails, ever. IDs only in Sentry extras (pitfall #4).
 *
 * Pass 1 — stuck webhook events: stripe_webhook_events rows with
 * processed_at IS NULL older than 24h. REPORT ONLY in every mode —
 * pitfall #9 says replays must go through the webhook handler, so
 * healing stuck events stays a deliberate manual act, not a cron side
 * effect.
 *
 * Pass 2 — subscription truth check: list Stripe subscriptions (capped)
 * and diff against the subscriptions table. Detects: (a) paid in Stripe
 * with no local row, (b) local plan_id null (user resolves to FREE
 * entitlements while paying), (c) status disagreement — including the
 * inverse revenue-leak where Stripe says canceled but the local row
 * still grants paid (the listing uses status:'all', so canceled subs
 * appear in it), plus (d) local paid rows whose Stripe subscription
 * wasn't in the (capped) listing at all — confirmed via individual
 * retrieve so the listing cap can't cause false alarms. A retrieve
 * failure (e.g. 404) is reported, never guess-canceled.
 *
 * Pure classification logic lives in lib/stripe-reconcile.ts (unit-
 * tested); this route is IO only.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { upsertSubscriptionFromStripe } from "@/lib/stripe/subscription-sync";
import {
  classifyStripeSubscriptions,
  orphanNeedsHeal,
  partitionLocalPaidRows,
  resolveReconcileMode,
  summarizeStuckEvents,
  type LocalSubscriptionRow,
  type StuckWebhookEventRow,
} from "@/lib/stripe-reconcile";

export const runtime = "nodejs";
// Paginated Stripe listing + per-orphan retrieves can exceed the default.
export const maxDuration = 120;

/** Events unprocessed for longer than this are "stuck" (Stripe retries ~3 days; 24h means we alert before it gives up). */
const STUCK_EVENT_AGE_HOURS = 24;
/** Max stuck rows reported per run — keeps the Sentry payload bounded. */
const STUCK_EVENT_REPORT_CAP = 50;
/** Safety cap on the Stripe subscription listing (whole-account scan not needed at current scale). */
const STRIPE_LIST_CAP = 200;
/** Max individual stripe.subscriptions.retrieve calls per run for orphan confirmation. */
const ORPHAN_RETRIEVE_CAP = 25;

function reportFailure(message: string, extra: Record<string, unknown> = {}) {
  Sentry.captureMessage(`[cron/reconcile-stripe] ${message}`, {
    level: "error",
    tags: { feature: "stripe-reconcile", endpoint: "reconcile-stripe" },
    extra,
  });
}

export async function GET(request: Request) {
  // 1. Auth — same contract as the weekly digest cron.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/reconcile-stripe] CRON_SECRET is not set — rejecting.");
    reportFailure("CRON_SECRET env var not set");
    return NextResponse.json({ ok: false, message: "CRON_SECRET not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  // 2. Kill switch — off by default; the cron ships dormant.
  const mode = resolveReconcileMode(process.env.RECONCILE_MODE);
  if (mode === "off") {
    console.log("[cron/reconcile-stripe] RECONCILE_MODE is off — skipping (feature dormant)");
    return NextResponse.json({ ok: true, skipped: true, reason: "mode_off" });
  }

  try {
    const admin = createAdminSupabaseClient();

    // ─────────────────────────────────────────────────────────
    // Pass 1 — stuck webhook events (REPORT ONLY, every mode).
    // Healing means replaying through the webhook handler (pitfall
    // #9), which stays a manual decision — never a cron side effect.
    // ─────────────────────────────────────────────────────────
    const stuckCutoff = new Date(Date.now() - STUCK_EVENT_AGE_HOURS * 3_600_000).toISOString();
    const { data: stuckData, error: stuckError } = await admin
      .from("stripe_webhook_events")
      .select("stripe_event_id, type, received_at, error_message")
      .is("processed_at", null)
      .lt("received_at", stuckCutoff)
      .order("received_at", { ascending: true })
      .limit(STUCK_EVENT_REPORT_CAP);
    if (stuckError) throw stuckError;

    const stuckEvents = summarizeStuckEvents((stuckData ?? []) as StuckWebhookEventRow[], new Date());
    if (stuckEvents.length > 0) {
      Sentry.captureMessage(
        `[cron/reconcile-stripe] ${stuckEvents.length} webhook event(s) stuck unprocessed >${STUCK_EVENT_AGE_HOURS}h`,
        {
          level: "error",
          tags: { feature: "stripe-reconcile", pass: "stuck-events" },
          extra: {
            count: stuckEvents.length,
            capped_at: STUCK_EVENT_REPORT_CAP,
            // Event ids, types, ages, error snippets — no PII.
            events: stuckEvents,
            hint: "Stripe stops retrying after ~3 days. Replay MANUALLY through the webhook handler (pitfall #9) — do not flip processed_at by hand.",
          },
        }
      );
    }

    // ─────────────────────────────────────────────────────────
    // Pass 2 — subscription truth check. Stripe is the source of
    // truth; the subscriptions table must agree with it.
    // ─────────────────────────────────────────────────────────
    const stripe = getStripe();

    const stripeSubsById = new Map<string, Stripe.Subscription>();
    let listingTruncated = false;
    for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
      stripeSubsById.set(sub.id, sub);
      if (stripeSubsById.size >= STRIPE_LIST_CAP) {
        listingTruncated = true;
        break;
      }
    }

    // Paginate the local read: `subscriptions` is append-mostly (cancels
    // mark, never delete), so past PostgREST's default 1000-row cap an
    // unbounded select would SILENTLY truncate — and this is the safety
    // net's own source of truth, so a missed row would false-alarm "paid
    // in Stripe, no local row". Exhaustive .range() scan, mirroring the
    // Stripe listing's intent; a hard page ceiling keeps it bounded.
    const LOCAL_PAGE = 1000;
    const LOCAL_MAX_PAGES = 50; // 50k rows — a hard stop, far above real scale
    const localRows: LocalSubscriptionRow[] = [];
    let localTruncated = false;
    for (let page = 0; page < LOCAL_MAX_PAGES; page += 1) {
      const from = page * LOCAL_PAGE;
      const { data: pageData, error: localError } = await admin
        .from("subscriptions")
        .select("id, user_id, plan_id, status, stripe_subscription_id")
        .order("id", { ascending: true })
        .range(from, from + LOCAL_PAGE - 1);
      if (localError) throw localError;
      const rows = (pageData ?? []) as LocalSubscriptionRow[];
      localRows.push(...rows);
      if (rows.length < LOCAL_PAGE) break;
      if (page === LOCAL_MAX_PAGES - 1) localTruncated = true;
    }

    // (a)/(b)/(c): paid Stripe subscriptions vs local rows.
    const mismatches = classifyStripeSubscriptions(
      [...stripeSubsById.values()].map((s) => ({ id: s.id, status: s.status })),
      localRows
    );

    // (d) inverse: local paid rows whose Stripe sub wasn't in the
    // listing. Confirm each via retrieve — the cap makes "not listed"
    // inconclusive on its own.
    const partition = partitionLocalPaidRows(localRows, new Set(stripeSubsById.keys()));
    const orphanMismatches: Array<{
      stripe_subscription_id: string;
      local_status: string;
      stripe_status: string;
    }> = [];
    const orphanRetrieveFailures: Array<{ stripe_subscription_id: string; message: string }> = [];
    /** Orphan subs confirmed drifted — healed via the same upsert path in live mode. */
    const orphanSubsToHeal: Stripe.Subscription[] = [];
    const orphanCandidatesChecked = partition.orphanCandidates.slice(0, ORPHAN_RETRIEVE_CAP);
    for (const row of orphanCandidatesChecked) {
      const subscriptionId = row.stripe_subscription_id;
      if (!subscriptionId) continue; // partition guarantees non-null; satisfies the type
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (orphanNeedsHeal(row, sub.status)) {
          orphanMismatches.push({
            stripe_subscription_id: subscriptionId,
            local_status: row.status,
            stripe_status: sub.status,
          });
          orphanSubsToHeal.push(sub);
        }
      } catch (error) {
        // 404 (deleted/wrong-account sub) or transient failure. Do NOT
        // guess-cancel the local row — report and leave it for a human.
        orphanRetrieveFailures.push({
          stripe_subscription_id: subscriptionId,
          message: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
        });
      }
    }

    // ─────────────────────────────────────────────────────────
    // Heal (live mode only) — every category goes through
    // upsertSubscriptionFromStripe, the exact same code path the
    // webhook uses: plan resolution via resolvePlanIdForPrice (so an
    // unmapped price re-fires the entitlement-mismatch alarm), the
    // one-active-per-user deactivation sweep, and the user-binding
    // verification that refuses to write unverifiable rows.
    // ─────────────────────────────────────────────────────────
    const subsToHeal = new Map<string, Stripe.Subscription>();
    if (mode === "live") {
      for (const id of mismatches.missingLocal) {
        const sub = stripeSubsById.get(id);
        if (sub) subsToHeal.set(id, sub);
      }
      for (const id of mismatches.nullPlan) {
        const sub = stripeSubsById.get(id);
        if (sub) subsToHeal.set(id, sub);
      }
      for (const m of mismatches.statusMismatch) {
        const sub = stripeSubsById.get(m.stripe_subscription_id);
        if (sub) subsToHeal.set(m.stripe_subscription_id, sub);
      }
      for (const sub of orphanSubsToHeal) {
        subsToHeal.set(sub.id, sub);
      }
    }

    let healed = 0;
    const healFailures: Array<{ stripe_subscription_id: string; message: string }> = [];
    for (const sub of subsToHeal.values()) {
      try {
        const result = await upsertSubscriptionFromStripe(admin, sub);
        if (result.synced) {
          healed += 1;
        } else {
          // Intentional skip (e.g. user binding could not be verified).
          // The upsert already fired its own Sentry error for the skip;
          // counting it as a heal failure keeps the summary honest —
          // the drift persists and will re-report next week.
          healFailures.push({ stripe_subscription_id: sub.id, message: result.reason });
        }
      } catch (error) {
        healFailures.push({
          stripe_subscription_id: sub.id,
          message: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
        });
      }
    }
    if (healFailures.length > 0) {
      reportFailure(`live heal failed for ${healFailures.length} subscription(s)`, {
        failures: healFailures,
      });
    }

    // ─────────────────────────────────────────────────────────
    // ONE Sentry summary for Pass 2 if anything drifted. Level is
    // "error" when a paying user is (or was) locked out of what they
    // paid for — categories (a)/(b) — otherwise "warning".
    // ─────────────────────────────────────────────────────────
    const anyDrift =
      mismatches.missingLocal.length > 0 ||
      mismatches.nullPlan.length > 0 ||
      mismatches.statusMismatch.length > 0 ||
      orphanMismatches.length > 0 ||
      partition.missingStripeId.length > 0 ||
      orphanRetrieveFailures.length > 0;
    if (anyDrift) {
      const paidUserImpact = mismatches.missingLocal.length > 0 || mismatches.nullPlan.length > 0;
      Sentry.captureMessage(
        `[cron/reconcile-stripe] subscription drift detected (mode=${mode}${mode === "live" ? `, healed=${healed}` : ""})`,
        {
          level: paidUserImpact ? "error" : "warning",
          tags: { feature: "stripe-reconcile", pass: "subscription-truth", mode },
          // IDs only — subscription ids + local row/user uuids, no PII.
          extra: {
            missing_local: mismatches.missingLocal,
            null_plan: mismatches.nullPlan,
            status_mismatch: mismatches.statusMismatch,
            local_paid_stripe_disagrees: orphanMismatches,
            local_paid_without_stripe_id: partition.missingStripeId.map((r) => r.id),
            orphan_retrieve_failures: orphanRetrieveFailures,
            orphan_candidates_unchecked: Math.max(
              0,
              partition.orphanCandidates.length - orphanCandidatesChecked.length
            ),
            stripe_listing_truncated: listingTruncated,
            local_read_truncated: localTruncated,
            healed,
            heal_failures: healFailures.length,
          },
        }
      );
    }

    const summary = {
      ok: true as const,
      mode,
      stuck_events: {
        count: stuckEvents.length,
        capped_at: STUCK_EVENT_REPORT_CAP,
      },
      subscription_check: {
        stripe_subscriptions_scanned: stripeSubsById.size,
        stripe_listing_truncated: listingTruncated,
        local_read_truncated: localTruncated,
        missing_local: mismatches.missingLocal.length,
        null_plan: mismatches.nullPlan.length,
        status_mismatch: mismatches.statusMismatch.length,
        local_paid_stripe_disagrees: orphanMismatches.length,
        local_paid_without_stripe_id: partition.missingStripeId.length,
        orphan_retrieve_failures: orphanRetrieveFailures.length,
        healed,
        heal_failures: healFailures.length,
      },
    };
    console.log(
      `[cron/reconcile-stripe] ${mode.toUpperCase()} — stuck=${stuckEvents.length}, scanned=${stripeSubsById.size}, drift=${anyDrift ? "yes" : "no"}, healed=${healed}`
    );
    return NextResponse.json(summary);
  } catch (error) {
    reportFailure("unhandled failure", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, message: "Internal error" }, { status: 500 });
  }
}
