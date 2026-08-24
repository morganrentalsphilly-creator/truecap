/**
 * Weekly rent-alert cron — re-underwrites Pro users' saved SINGLE-FAMILY
 * deals against the current local market rent (RentCast) and emails the ones
 * whose story changed. Sibling to send-rate-alerts; same safety model, with an
 * extra cost guard because each deal costs a paid RentCast call.
 *
 * SAFETY MODEL (mirrors send-rate-alerts):
 *  1. Auth-gated on `Authorization: Bearer ${CRON_SECRET}`.
 *  2. KILL SWITCH: RENT_ALERTS_MODE env controls everything:
 *       - unset / "off"  → no-op (DEFAULT — the feature ships dormant).
 *       - "dry"          → audience + cost SCALE preview, NO RentCast calls
 *                          and NO sends (zero cost). Set RENT_ALERTS_DRY_FETCH=1
 *                          to do a real (paid, capped) fetched preview instead.
 *       - "live"         → fetch (capped) + send via Resend.
 *     Morgan flips off → dry → live after reviewing.
 *  3. COST GUARD: each re-priced deal = ONE RentCast rent lookup. We share the
 *     SAME global monthly RentCast budget as live comps (app_counters key
 *     `rentcast_enrichments_${month}`, cap RENTCAST_MONTHLY_ENRICHMENT_CAP) so
 *     this cron can never blow the plan limit, plus a per-run ceiling
 *     (RENT_ALERTS_MAX_LOOKUPS_PER_RUN). Single-family deals only (the rent
 *     core handles one rent figure) — we never spend a call on a deal we can't
 *     price.
 *  4. Per-deal gating in lib/rent-alerts.ts (pure, tested): only STATE changes
 *     alert (tier / DSCR band / cash-flow sign).
 *  5. Consent: reuses profiles.rate_alert_emails — the existing "deal alert
 *     emails" opt-in — so no new toggle/column.
 *  6. Failures → Sentry.captureMessage tagged feature: rent-alerts.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { render } from "@react-email/render";
import RentAlertEmail from "@/emails/rent-alert";
import {
  buildRentAlertForDeal,
  RENT_ALERTS_MAX_DEALS_PER_EMAIL,
  rentAlertSubject,
  type RentAlertDeal,
} from "@/lib/rent-alerts";
import { fetchRentCastRentEstimate } from "@/lib/property-enrichment/rentcast";
import { normalizeReleasedInvestmentFormSnapshot } from "@/lib/underwriting-model-release";
import { getPaidUserIds } from "@/lib/paid-user-ids";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
// Re-underwriting + per-deal RentCast lookups + per-user emails can be slow.
export const maxDuration = 120;

type Mode = "off" | "dry" | "live";

function resolveMode(): Mode {
  const raw = (process.env.RENT_ALERTS_MODE ?? "off").trim().toLowerCase();
  if (raw === "live") return "live";
  if (raw === "dry" || raw === "dry-run") return "dry";
  return "off";
}

/** Shared global monthly RentCast budget (same counter live comps spends). */
const MONTHLY_ENRICHMENT_CAP = Number.parseInt(
  process.env.RENTCAST_MONTHLY_ENRICHMENT_CAP ?? "300",
  10
);
/** Per-run ceiling on lookups, independent of the monthly budget. */
const MAX_LOOKUPS_PER_RUN = Number.parseInt(
  process.env.RENT_ALERTS_MAX_LOOKUPS_PER_RUN ?? "100",
  10
);

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}

export async function GET(request: Request) {
  // 1. Auth — same contract as the other crons.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    Sentry.captureMessage("rent-alerts cron: CRON_SECRET not configured", {
      level: "error",
      tags: { feature: "rent-alerts" },
    });
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Kill switch.
  const mode = resolveMode();
  if (mode === "off") {
    console.log("[rent-alerts] RENT_ALERTS_MODE is off — skipping (feature dormant)");
    return NextResponse.json({ skipped: true, reason: "mode_off" });
  }
  const dryFetch = (process.env.RENT_ALERTS_DRY_FETCH ?? "").trim() === "1";

  try {
    const admin = createAdminSupabaseClient();

    // 3. Audience: paying users — via the shared plan-aware helper so the
    // cron audience matches the entitlement layer exactly (includes
    // past_due, excludes active rows mapped to the free/no plan). Also
    // stops burning paid RentCast lookups on users the app treats as free.
    const userIds = await getPaidUserIds(admin);
    if (userIds.length === 0) {
      return NextResponse.json({ skipped: true, reason: "no_paid_users" });
    }

    // …who opted in to deal-alert emails (reuses the rate-alert consent)…
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

    // 4. Keep only single-family deals that validate + have an address to
    // look up. We never spend a RentCast call on a deal the rent core can't
    // price (multi-family) or that has no address.
    const priceable = (dealRows ?? []).flatMap((row) => {
      // NORMALIZE, don't raw-parse. investmentFormSchema requires fields added
      // after some saved deals were written (insuranceInputMode has no
      // .default()), so a raw safeParse REJECTS every pre-v9 snapshot and this
      // filter dropped those deals in silence — a paying customer simply never
      // received a rent alert, with nothing logged. Every other read path
      // already goes through normalizeInvestmentFormSnapshot.
      const values = normalizeReleasedInvestmentFormSnapshot(row.form_snapshot);
      if (!values) return []; // genuinely unreadable, not merely old
      if (values.propertyType !== "single-family") return [];
      const address = (row.address as string | null)?.trim();
      if (!address) return [];
      return [{
        id: row.id as string,
        userId: row.user_id as string,
        title: row.title as string | null,
        address,
        values,
      }];
    });

    if (priceable.length === 0) {
      return NextResponse.json({ skipped: true, reason: "no_priceable_deals" });
    }

    // 5. Cost budget — read the shared monthly counter; never exceed it.
    const month = new Date().toISOString().slice(0, 7);
    const monthKey = `rentcast_enrichments_${month}`;
    const { data: counterRow } = await admin
      .from("app_counters")
      .select("count")
      .eq("key", monthKey)
      .maybeSingle();
    const used = Number((counterRow as { count?: number } | null)?.count ?? 0);
    const capFinite = Number.isFinite(MONTHLY_ENRICHMENT_CAP) && MONTHLY_ENRICHMENT_CAP > 0;
    const budgetRemaining = capFinite
      ? Math.max(0, MONTHLY_ENRICHMENT_CAP - used)
      : Number.POSITIVE_INFINITY;
    const lookupBudget = Math.max(0, Math.min(MAX_LOOKUPS_PER_RUN, budgetRemaining, priceable.length));

    // 5a. Truly-free dry preview: report scale + cost WITHOUT any RentCast
    // calls, unless RENT_ALERTS_DRY_FETCH=1 opts into a real (paid) preview.
    if (mode === "dry" && !dryFetch) {
      return NextResponse.json({
        mode: "dry",
        fetched: false,
        note: "Scale preview only — no RentCast calls made. Set RENT_ALERTS_DRY_FETCH=1 for a real (paid, capped) preview.",
        eligibleUsers: optedInIds.length,
        priceableDeals: priceable.length,
        monthlyBudgetUsed: used,
        monthlyBudgetCap: MONTHLY_ENRICHMENT_CAP,
        wouldLookUp: lookupBudget,
      });
    }

    // 6. Re-price up to the budget; group state-change alerts per user.
    const alertsByUser = new Map<string, RentAlertDeal[]>();
    let lookups = 0;
    let rpcMissing = false;
    for (const deal of priceable) {
      if (lookups >= lookupBudget) break;
      // RESERVE one unit of the shared monthly budget BEFORE the (billable)
      // call — atomic, so a failed or duplicate run can't re-read a stale-low
      // counter and overshoot the cap (the previous fire-and-forget increment
      // could). NULL = at cap → stop; reserveErr = the atomic RPC isn't
      // deployed → fail SAFE by stopping (a background cron should under-send
      // rather than risk overspending the RentCast budget).
      if (capFinite) {
        const { data: reserved, error: reserveErr } = await admin.rpc(
          "increment_app_counter_if_under",
          { counter_key: monthKey, max_value: MONTHLY_ENRICHMENT_CAP, amount: 1 }
        );
        if (reserveErr) {
          rpcMissing = true;
          break;
        }
        if (reserved == null) break; // monthly cap reached
      }
      lookups += 1;
      const marketRent = await fetchRentCastRentEstimate({
        address: deal.address,
        propertyType: "Single Family",
        bedrooms: typeof deal.values.bedrooms === "number" ? deal.values.bedrooms : null,
        bathrooms: typeof deal.values.bathrooms === "number" ? deal.values.bathrooms : null,
        squareFootage: typeof deal.values.sqft === "number" ? deal.values.sqft : null,
      });
      // A null/<=0 result (no API key, or address un-indexed) is NOT a billable
      // RentCast call — refund the unit we reserved so phantom lookups don't
      // drain the shared monthly budget.
      if (marketRent == null || marketRent <= 0) {
        if (capFinite) {
          await admin
            .rpc("decrement_app_counter", { counter_key: monthKey, amount: 1 })
            .then(() => undefined, () => undefined);
        }
        continue;
      }

      const alert = buildRentAlertForDeal({
        id: deal.id,
        title: deal.title,
        address: deal.address,
        values: deal.values,
        currentMarketRentMonthly: marketRent,
      });
      if (!alert) continue;
      const list = alertsByUser.get(deal.userId) ?? [];
      if (list.length < RENT_ALERTS_MAX_DEALS_PER_EMAIL) list.push(alert);
      alertsByUser.set(deal.userId, list);
    }

    if (rpcMissing) {
      // The atomic-counter migration (20260628150000) isn't applied in this
      // env, so we stopped early to avoid overspending. Surface it rather than
      // silently degrade (the cron will under-send until the migration lands).
      Sentry.captureMessage(
        "rent-alerts cron: atomic counter RPC missing — stopped early to avoid overspend (apply migration 20260628150000)",
        { level: "warning", tags: { feature: "rent-alerts" } }
      );
    }

    if (alertsByUser.size === 0) {
      return NextResponse.json({
        skipped: true,
        reason: "no_state_changes",
        lookups,
        lookupBudget,
      });
    }

    // 7. Build + (dry-preview | send) one email per user.
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

      const subject = rentAlertSubject(deals.length);
      const html = await render(RentAlertEmail({ deals, siteUrl }));
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

      // SEND IDEMPOTENCY — same reasoning as the rate-alert cron: a retried
      // or re-triggered run would otherwise re-email every opted-in paid
      // user. Claim on the shared (user_id, email_key) unique index BEFORE
      // sending; a 23505 means today's rent alert already went out.
      const sendKey = `rent_alert_${new Date().toISOString().slice(0, 10)}`;
      const { error: claimError } = await admin
        .from("lifecycle_email_log")
        .insert({ user_id: userId, email_key: sendKey });
      if (claimError) {
        if (claimError.code !== "23505") {
          Sentry.captureMessage("rent-alerts cron: send-claim failed", {
            level: "error",
            tags: { feature: "rent-alerts" },
            extra: { database_code: claimError.code ?? "unknown" },
          });
        }
        continue;
      }
      if (!resendKey) {
        Sentry.captureMessage("rent-alerts cron: RESEND_API_KEY missing in live mode", {
          level: "error",
          tags: { feature: "rent-alerts" },
        });
        return NextResponse.json({ error: "Not configured" }, { status: 500 });
      }
      const sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: email, subject, html }),
      });
      if (!sendRes.ok) {
        const body = await sendRes.text().catch(() => "");
        Sentry.captureMessage(`rent-alerts cron: Resend send failed (${sendRes.status})`, {
          level: "error",
          tags: { feature: "rent-alerts" },
          extra: { body: body.slice(0, 300) },
        });
        continue; // keep sending to remaining users
      }
      sent += 1;
    }

    if (mode === "dry") {
      console.log(`[rent-alerts] DRY RUN (fetched) — ${preview.length} emails would send`);
      return NextResponse.json({
        mode: "dry",
        fetched: true,
        lookups,
        wouldSend: preview,
        firstEmailHtml: firstHtml,
      });
    }

    console.log(`[rent-alerts] LIVE — sent ${sent}/${alertsByUser.size} alert emails (${lookups} lookups)`);
    return NextResponse.json({ mode: "live", sent, eligibleUsers: alertsByUser.size, lookups });
  } catch (error) {
    Sentry.captureMessage("rent-alerts cron: unhandled failure", {
      level: "error",
      tags: { feature: "rent-alerts" },
      extra: { message: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
