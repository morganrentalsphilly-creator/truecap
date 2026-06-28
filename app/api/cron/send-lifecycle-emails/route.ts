/**
 * Lifecycle email cron — sends per-user lifecycle emails: welcome, the
 * onboarding drip (day 1..30 relative to signup), the free->Pro nudge,
 * and win-back. One email per user per run (highest priority), decided
 * by the pure engine in lib/lifecycle-emails.ts.
 *
 * SAFETY MODEL (mirrors send-rate-alerts + the weekly-digest cron):
 *  1. Auth-gated on `Authorization: Bearer ${CRON_SECRET}`.
 *  2. KILL SWITCH: LIFECYCLE_EMAILS_MODE env:
 *       - unset / "off" → no-op (DEFAULT — ships dormant)
 *       - "dry"         → full compute, returns a JSON preview of every
 *                         email that WOULD send (recipients masked, first
 *                         email's HTML included). Sends nothing, logs nothing.
 *       - "live"        → sends via Resend and records lifecycle_email_log rows.
 *     Flip off -> dry -> live after reviewing a dry run.
 *  3. Idempotency: lifecycle_email_log (unique on user_id+email_key) means
 *     each email goes out at most once per user, even across overlapping runs.
 *  4. Failures → Sentry.captureMessage tagged feature: lifecycle-emails;
 *     a single bad send never aborts the batch.
 *
 * Requires the lifecycle_email_log migration
 * (supabase/migrations/20260620170000_lifecycle_email_log.sql) to be applied.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  selectDueLifecycleEmail,
  type LifecycleUserState,
} from "@/lib/lifecycle-emails";
import { renderLifecycleEmail } from "@/lib/email/render-lifecycle";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const maxDuration = 120;

type Mode = "off" | "dry" | "live";

function resolveMode(): Mode {
  const raw = (process.env.LIFECYCLE_EMAILS_MODE ?? "off").trim().toLowerCase();
  if (raw === "live") return "live";
  if (raw === "dry" || raw === "dry-run") return "dry";
  return "off";
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}

/** All auth users (paginated). Solo-app scale; capped for safety. */
async function listAllUsers(
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<Array<{ id: string; email: string; created_at: string; confirmed: boolean }>> {
  const out: Array<{ id: string; email: string; created_at: string; confirmed: boolean }> = [];
  const perPage = 1000;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      if (!u.email) continue;
      out.push({
        id: u.id,
        email: u.email,
        created_at: u.created_at ?? new Date().toISOString(),
        confirmed: Boolean(u.email_confirmed_at),
      });
    }
    if (users.length < perPage) break;
  }
  return out;
}

const MAX_SENDS_PER_RUN = 500;

export async function GET(request: Request) {
  // 1. Auth.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    Sentry.captureMessage("lifecycle cron: CRON_SECRET not configured", {
      level: "error",
      tags: { feature: "lifecycle-emails" },
    });
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Kill switch.
  const mode = resolveMode();
  if (mode === "off") {
    console.log("[lifecycle] LIFECYCLE_EMAILS_MODE is off — skipping (feature dormant)");
    return NextResponse.json({ skipped: true, reason: "mode_off" });
  }

  try {
    const admin = createAdminSupabaseClient();

    // Plan: users with an active/trialing subscription are "paid".
    const { data: subRows, error: subErr } = await admin
      .from("subscriptions")
      .select("user_id")
      .in("status", ["active", "trialing"]);
    if (subErr) throw subErr;
    const paid = new Set((subRows ?? []).map((r) => r.user_id as string));

    // Activity: latest saved-deal update per user (free users have none).
    const { data: dealRows, error: dealErr } = await admin
      .from("saved_analyses")
      .select("user_id, updated_at")
      .is("deleted_at", null);
    if (dealErr) throw dealErr;
    const lastActivity = new Map<string, string>();
    for (const r of dealRows ?? []) {
      const uid = r.user_id as string;
      const ts = r.updated_at as string | null;
      if (!ts) continue;
      const prev = lastActivity.get(uid);
      if (!prev || ts > prev) lastActivity.set(uid, ts);
    }

    // Already-sent keys per user.
    const { data: logRows, error: logErr } = await admin
      .from("lifecycle_email_log")
      .select("user_id, email_key");
    if (logErr) throw logErr;
    const sentByUser = new Map<string, string[]>();
    for (const r of logRows ?? []) {
      const uid = r.user_id as string;
      const list = sentByUser.get(uid) ?? [];
      list.push(r.email_key as string);
      sentByUser.set(uid, list);
    }

    // Marketing consent — the PROMOTIONAL kinds (pro_nudge, winback) only go to
    // users who explicitly opted in; welcome + drip are onboarding (allowed).
    // Resilient to the marketing_emails column not existing yet: if we can't
    // read consent, NO promo is sent (fail CLOSED — never market without it).
    const marketingConsent = new Set<string>();
    {
      const { data: consentRows, error: consentErr } = await admin
        .from("profiles")
        .select("id")
        .eq("marketing_emails", true);
      if (!consentErr) for (const r of consentRows ?? []) marketingConsent.add(r.id as string);
    }
    const PROMO_KINDS = new Set<string>(["pro_nudge", "winback"]);

    // Build per-user state + compute the one due email each.
    const users = await listAllUsers(admin);
    const now = new Date();
    const due = users
      .map((u) => {
        const state: LifecycleUserState = {
          userId: u.id,
          email: u.email,
          signupAt: u.created_at,
          confirmed: u.confirmed,
          lastActivityAt: lastActivity.get(u.id) ?? null,
          plan: paid.has(u.id) ? "paid" : "free",
          sentKeys: sentByUser.get(u.id) ?? [],
        };
        return selectDueLifecycleEmail(state, now);
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      // Drop promotional kinds for users who haven't opted into marketing.
      .filter((d) => !PROMO_KINDS.has(d.kind) || marketingConsent.has(d.userId))
      .slice(0, MAX_SENDS_PER_RUN);

    if (due.length === 0) {
      return NextResponse.json({ mode, skipped: true, reason: "nothing_due" });
    }

    const siteUrl = getSiteUrl();
    const from = process.env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>";
    const resendKey = process.env.RESEND_API_KEY;

    const preview: Array<{ to: string; kind: string; key: string; subject: string }> = [];
    let firstHtml: string | null = null;
    let sent = 0;

    for (const item of due) {
      const rendered = await renderLifecycleEmail(item, siteUrl);
      if (!rendered) {
        Sentry.captureMessage(`lifecycle cron: missing content for ${item.key}`, {
          level: "warning",
          tags: { feature: "lifecycle-emails" },
        });
        continue;
      }
      if (!firstHtml) firstHtml = rendered.html;

      if (mode === "dry") {
        preview.push({
          to: maskEmail(item.email),
          kind: item.kind,
          key: item.key,
          subject: rendered.subject,
        });
        continue;
      }

      // live
      if (!resendKey) {
        Sentry.captureMessage("lifecycle cron: RESEND_API_KEY missing in live mode", {
          level: "error",
          tags: { feature: "lifecycle-emails" },
        });
        return NextResponse.json({ error: "Not configured" }, { status: 500 });
      }

      // CLAIM before sending: insert the log row FIRST. 23505 (unique on
      // user_id+email_key) means another run already claimed/sent this → skip.
      // This closes the double-send window where a send succeeded but the
      // post-send log write was lost. Trade-off: a claim followed by a send
      // failure is at-most-once (skipped, not retried) — the right default
      // for marketing email.
      const { error: claimErr } = await admin
        .from("lifecycle_email_log")
        .insert({ user_id: item.userId, email_key: item.key, resend_id: null });
      if (claimErr) {
        if (claimErr.code === "23505") continue;
        Sentry.captureMessage("lifecycle cron: claim insert failed", {
          level: "error",
          tags: { feature: "lifecycle-emails" },
          extra: { key: item.key, code: claimErr.code, message: claimErr.message },
        });
        continue;
      }

      let resendId: string | null = null;
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: item.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            tags: [
              { name: "purpose", value: "lifecycle" },
              { name: "lifecycle_kind", value: item.kind },
            ],
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          Sentry.captureMessage(`lifecycle cron: Resend send failed (${res.status})`, {
            level: "error",
            tags: { feature: "lifecycle-emails" },
            extra: { key: item.key, body: body.slice(0, 300) },
          });
          continue; // keep going for other users
        }
        const json = (await res.json().catch(() => ({}))) as { id?: string };
        resendId = json.id ?? null;
      } catch (err) {
        Sentry.captureMessage("lifecycle cron: Resend network error", {
          level: "error",
          tags: { feature: "lifecycle-emails" },
          extra: { key: item.key, message: err instanceof Error ? err.message : String(err) },
        });
        continue;
      }

      // Already claimed above; best-effort stamp the Resend id for tracing.
      if (resendId) {
        await admin
          .from("lifecycle_email_log")
          .update({ resend_id: resendId })
          .eq("user_id", item.userId)
          .eq("email_key", item.key)
          .then(() => undefined, () => undefined);
      }
      sent += 1;
    }

    if (mode === "dry") {
      console.log(`[lifecycle] DRY RUN — ${preview.length} emails would send`);
      return NextResponse.json({
        mode: "dry",
        wouldSendCount: preview.length,
        wouldSend: preview,
        firstEmailHtml: firstHtml,
      });
    }

    console.log(`[lifecycle] LIVE — sent ${sent}/${due.length}`);
    return NextResponse.json({ mode: "live", sent, due: due.length });
  } catch (error) {
    Sentry.captureMessage("lifecycle cron: unhandled failure", {
      level: "error",
      tags: { feature: "lifecycle-emails" },
      extra: { message: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
