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
 *  3. SEND GATE (lib/email/lifecycle-compliance.ts): `live` sends only when
 *     EMAIL_POSTAL_ADDRESS is set and the per-user unsubscribe link can be
 *     signed (SHARE_LINK_SECRET, https site URL). Otherwise the run reads
 *     nothing, writes nothing, sends nothing and logs ONE line that names the
 *     missing condition: "[lifecycle] BLOCKED — nothing sent: …". The address
 *     is set in the environment by the account owner; no address or
 *     placeholder exists in the code.
 *  4. Every email carries the signed unsubscribe link (footer and plain
 *     text), the postal address, and RFC 8058 List-Unsubscribe /
 *     List-Unsubscribe-Post headers pointing at /email/unsubscribe.
 *  5. Opt-outs: a user whose profiles.marketing_opt_out is true is skipped,
 *     and so is a user with no profile row (an opt-out could not be stored
 *     for them). If the opt-outs cannot be read, nothing is sent.
 *  6. Idempotency: lifecycle_email_log (unique on user_id+email_key) means
 *     each email goes out at most once per user, even across overlapping runs.
 *  7. Catch-up guard: drip day N only sends while the account is at most
 *     N + DRIP_CATCH_UP_GRACE_DAYS days old (lib/lifecycle-emails.ts).
 *     Past-window days are RETIRED — logged with
 *     resend_id = DRIP_SKIPPED_RESEND_ID instead of sent — so accounts
 *     older than the drip never receive it as a daily catch-up blast.
 *     The welcome has the same guard (WELCOME_MAX_AGE_DAYS): an account
 *     older than that never gets a late welcome, so opening the send gate
 *     after a long block releases no backlog.
 *  8. Pacing (lib/email/resend-pacing.ts): one Resend request every
 *     SEND_GAP_MS. A 429 releases the claim so the next run retries that
 *     email. A used-up daily or monthly quota, repeated rate limits, or the
 *     run's time budget stop the run with ONE Sentry alert.
 *  9. Other failures → Sentry.captureMessage tagged feature: lifecycle-emails;
 *     a single bad send never aborts the batch.
 *
 * Requires the lifecycle_email_log migration
 * (supabase/migrations/20260620170000_lifecycle_email_log.sql) to be applied,
 * and profiles.marketing_opt_out
 * (supabase/migrations/20260906180000_testimonials_pipeline.sql).
 */

import { NextResponse } from "next/server";
import { isValidCronBearer } from "@/lib/cron-auth";
import * as Sentry from "@sentry/nextjs";
import {
  selectDueLifecycleEmail,
  expiredDripKeys,
  DRIP_SKIPPED_RESEND_ID,
  type LifecycleUserState,
} from "@/lib/lifecycle-emails";
import { renderLifecycleEmail } from "@/lib/email/render-lifecycle";
import {
  buildLifecycleUnsubscribeHeaders,
  buildLifecycleUnsubscribeUrl,
  describeLifecycleBlock,
  lifecycleComplianceBlock,
  readEmailPostalAddress,
  resolveLifecycleMode,
  welcomeWindowPassed,
} from "@/lib/email/lifecycle-compliance";
import {
  MAX_RATE_LIMIT_HITS,
  RUN_BUDGET_MS,
  SEND_GAP_MS,
  classifyResend429,
  pacing,
  retryAfterMs,
} from "@/lib/email/resend-pacing";
import { getPaidUserIds } from "@/lib/paid-user-ids";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const maxDuration = 120;

const WELCOME_KEY = "welcome";

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

/**
 * Who may be emailed: `known` is every user with a profile row, `optedOut`
 * the ones whose marketing_opt_out is true. Null when the read fails; the
 * caller then sends nothing (an unreadable opt-out is never permission).
 */
async function readMarketingOptOuts(
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<{ known: Set<string>; optedOut: Set<string> } | null> {
  const known = new Set<string>();
  const optedOut = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; from < 1_000_000; from += pageSize) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, marketing_opt_out")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return null;
    const rows = (data ?? []) as Array<{ id: string; marketing_opt_out: boolean | null }>;
    for (const row of rows) {
      known.add(row.id);
      if (row.marketing_opt_out !== false) optedOut.add(row.id);
    }
    if (rows.length < pageSize) return { known, optedOut };
  }
  return null;
}

type StopReason = "daily_quota" | "monthly_quota" | "rate_limit" | "time_budget";

export async function GET(request: Request) {
  const startedAt = Date.now();

  // 1. Auth.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    Sentry.captureMessage("lifecycle cron: CRON_SECRET not configured", {
      level: "error",
      tags: { feature: "lifecycle-emails" },
    });
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (!isValidCronBearer(request, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Kill switch.
  const mode = resolveLifecycleMode();
  if (mode === "off") {
    console.log("[lifecycle] LIFECYCLE_EMAILS_MODE is off — skipping (feature dormant)");
    return NextResponse.json({ skipped: true, reason: "mode_off" });
  }

  // 3. Send gate. A live run with no postal address, or with an unsubscribe
  //    link that cannot be signed, does nothing at all: no read, no claim, no
  //    retired row, no send. A dry run still computes its preview and reports
  //    the same condition as `sendBlocked`.
  const siteUrl = getSiteUrl();
  const complianceBlock = lifecycleComplianceBlock(siteUrl);
  if (mode === "live" && complianceBlock) {
    console.log(
      `[lifecycle] BLOCKED — nothing sent: ${describeLifecycleBlock(complianceBlock)}`
    );
    return NextResponse.json({ mode, blocked: true, reason: complianceBlock, sent: 0 });
  }
  const postalAddress = readEmailPostalAddress();

  try {
    const admin = createAdminSupabaseClient();

    // Opt-outs first: without them nothing may send, so a live run stops
    // here before it reads or writes anything else.
    const optOuts = await readMarketingOptOuts(admin);
    if (!optOuts && mode === "live") {
      console.log("[lifecycle] BLOCKED — nothing sent: marketing opt-outs could not be read");
      Sentry.captureMessage("lifecycle cron: marketing opt-outs unreadable, nothing sent", {
        level: "error",
        tags: { feature: "lifecycle-emails" },
      });
      return NextResponse.json({ mode, blocked: true, reason: "opt_out_unreadable", sent: 0 });
    }
    const sendBlocked = complianceBlock ?? (optOuts ? null : "opt_out_unreadable");

    // Plan: users the ENTITLEMENT layer considers paid — via the shared
    // plan-aware helper (joins plans, includes past_due, excludes rows
    // mapped to the free/no plan), so pro_nudge/winback targeting matches
    // what the product actually shows the user.
    const paid = new Set(await getPaidUserIds(admin));

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

    // Build per-user state once; both the due-email selection and the
    // catch-up guard read from it.
    const users = await listAllUsers(admin);
    const now = new Date();
    const states: LifecycleUserState[] = users.map((u) => ({
      userId: u.id,
      email: u.email,
      signupAt: u.created_at,
      confirmed: u.confirmed,
      lastActivityAt: lastActivity.get(u.id) ?? null,
      plan: paid.has(u.id) ? "paid" : "free",
      sentKeys: sentByUser.get(u.id) ?? [],
    }));

    // CATCH-UP GUARD: retire drip days whose onboarding window has passed
    // (never sent, never will be). The selection window below already
    // refuses to send them, so this write is hygiene, not the safety net —
    // a failed upsert can't cause a send. Rows reuse the log table with
    // resend_id = DRIP_SKIPPED_RESEND_ID (the prod schema has no status
    // column; sent_at records when the day was retired). ignoreDuplicates
    // keeps this idempotent against real sends and concurrent runs.
    const skipRows = states.flatMap((s) =>
      expiredDripKeys(s, now).map((key) => ({
        user_id: s.userId,
        email_key: key,
        resend_id: DRIP_SKIPPED_RESEND_ID,
      }))
    );

    // WELCOME AGE GUARD: a confirmed account older than WELCOME_MAX_AGE_DAYS
    // that never got its welcome will not get one now. The key is added to
    // the in-memory state, which is what keeps it from being selected (the
    // engine then moves on to the user's next email), and it is retired in
    // the log the same way as a past-window drip day. Like the drip write,
    // the log row is hygiene: a failed upsert cannot cause a send.
    const lateWelcomeRows: typeof skipRows = [];
    for (const s of states) {
      if (!s.confirmed || s.sentKeys.includes(WELCOME_KEY)) continue;
      if (!welcomeWindowPassed(s.signupAt, now)) continue;
      s.sentKeys = [...s.sentKeys, WELCOME_KEY];
      lateWelcomeRows.push({
        user_id: s.userId,
        email_key: WELCOME_KEY,
        resend_id: DRIP_SKIPPED_RESEND_ID,
      });
    }

    let dripDaysRetired = 0;
    let welcomesRetired = 0;
    if (mode === "live") {
      const retire = async (rows: typeof skipRows): Promise<number> => {
        let retired = 0;
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          const { error: skipErr } = await admin
            .from("lifecycle_email_log")
            .upsert(chunk, { onConflict: "user_id,email_key", ignoreDuplicates: true });
          if (skipErr) {
            Sentry.captureMessage("lifecycle cron: past-window skip-mark failed", {
              level: "warning",
              tags: { feature: "lifecycle-emails" },
              extra: { code: skipErr.code, message: skipErr.message },
            });
          } else {
            retired += chunk.length;
          }
        }
        return retired;
      };
      dripDaysRetired = await retire(skipRows);
      welcomesRetired = await retire(lateWelcomeRows);
    }

    // Opted-out users, and users with no profile row to hold an opt-out,
    // are dropped before selection. (A dry run that could not read the
    // opt-outs previews everyone and says so in `sendBlocked`.)
    const mayEmail = (userId: string): boolean =>
      !optOuts || (optOuts.known.has(userId) && !optOuts.optedOut.has(userId));
    const skippedOptedOut = optOuts
      ? states.filter((s) => optOuts.optedOut.has(s.userId)).length
      : 0;
    const skippedNoProfile = optOuts
      ? states.filter((s) => !optOuts.known.has(s.userId)).length
      : 0;

    const due = states
      .filter((state) => mayEmail(state.userId))
      .map((state) => selectDueLifecycleEmail(state, now))
      .filter((d): d is NonNullable<typeof d> => d !== null)
      // Drop promotional kinds for users who haven't opted into marketing.
      .filter((d) => !PROMO_KINDS.has(d.kind) || marketingConsent.has(d.userId))
      .slice(0, MAX_SENDS_PER_RUN);

    const dryRunLine = (wouldSend: number) =>
      `[lifecycle] DRY RUN — ${wouldSend} emails would send, ${skipRows.length} past-window drip days and ${lateWelcomeRows.length} late welcomes would be retired` +
      (sendBlocked
        ? ` (a live run would send nothing: ${
            sendBlocked === "opt_out_unreadable"
              ? "marketing opt-outs could not be read"
              : describeLifecycleBlock(sendBlocked)
          })`
        : "");
    const liveLine = (sentCount: number, dueCount: number, stoppedBy: StopReason | null) =>
      `[lifecycle] LIVE — sent ${sentCount}/${dueCount}, retired ${dripDaysRetired} past-window drip days and ${welcomesRetired} late welcomes` +
      (stoppedBy ? `, stopped early: ${stoppedBy}` : "");

    if (due.length === 0) {
      // One line per run, also when nothing is due, so the log shows the run
      // happened and in which mode.
      console.log(mode === "dry" ? dryRunLine(0) : liveLine(0, 0, null));
      return NextResponse.json({
        mode,
        skipped: true,
        reason: "nothing_due",
        skippedOptedOut,
        skippedNoProfile,
        ...(mode === "dry"
          ? {
              wouldRetireDripDays: skipRows.length,
              wouldRetireWelcomes: lateWelcomeRows.length,
              sendBlocked,
            }
          : { dripDaysRetired, welcomesRetired }),
      });
    }

    const from = process.env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>";
    const resendKey = process.env.RESEND_API_KEY;
    if (mode === "live" && !resendKey) {
      Sentry.captureMessage("lifecycle cron: RESEND_API_KEY missing in live mode", {
        level: "error",
        tags: { feature: "lifecycle-emails" },
      });
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    const preview: Array<{ to: string; kind: string; key: string; subject: string }> = [];
    let firstHtml: string | null = null;
    let sent = 0;
    let attempted = 0;
    let released = 0;
    let rateLimitHits = 0;
    let skippedNoUnsubscribeLink = 0;
    let stopped: StopReason | null = null;

    const releaseClaim = async (userId: string, key: string) => {
      const { error: releaseErr } = await admin
        .from("lifecycle_email_log")
        .delete()
        .eq("user_id", userId)
        .eq("email_key", key)
        .is("resend_id", null);
      if (releaseErr) {
        Sentry.captureMessage("lifecycle cron: claim release failed", {
          level: "warning",
          tags: { feature: "lifecycle-emails" },
          extra: { key, code: releaseErr.code },
        });
      } else {
        released += 1;
      }
    };

    for (const item of due) {
      // One signed link per recipient. No link, no email: the user is left
      // unclaimed so a later run can send once the link can be built.
      const unsubscribeUrl = buildLifecycleUnsubscribeUrl(siteUrl, item.userId);
      if (mode === "live" && (!unsubscribeUrl || !postalAddress)) {
        skippedNoUnsubscribeLink += 1;
        continue;
      }

      if (mode === "live" && Date.now() - startedAt > RUN_BUDGET_MS) {
        stopped = "time_budget";
        break;
      }

      const rendered = await renderLifecycleEmail(item, siteUrl, {
        unsubscribeUrl,
        postalAddress,
      });
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

      // live. Both values were checked above (the link per recipient, the
      // key before the loop); this line only tells the compiler so.
      if (!unsubscribeUrl || !resendKey) continue;

      // CLAIM before sending: insert the log row FIRST. 23505 (unique on
      // user_id+email_key) means another run already claimed/sent this → skip.
      // This closes the double-send window where a send succeeded but the
      // post-send log write was lost. Trade-off: a claim followed by a send
      // failure is at-most-once (skipped, not retried) — the right default
      // for marketing email. The one exception is a 429: Resend refused the
      // request, nothing was sent, so the claim is released and the next run
      // retries it.
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

      // PACING: keep a fixed gap between Resend requests.
      if (attempted > 0) await pacing.wait(SEND_GAP_MS);
      attempted += 1;

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
            headers: buildLifecycleUnsubscribeHeaders(unsubscribeUrl),
            tags: [
              { name: "purpose", value: "lifecycle" },
              { name: "lifecycle_kind", value: item.kind },
            ],
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.status === 429) {
          const body = await res.text().catch(() => "");
          await releaseClaim(item.userId, item.key);
          const kind = classifyResend429(body);
          if (kind !== "rate_limit") {
            stopped = kind;
            break;
          }
          rateLimitHits += 1;
          if (rateLimitHits >= MAX_RATE_LIMIT_HITS) {
            stopped = "rate_limit";
            break;
          }
          await pacing.wait(retryAfterMs(res.headers.get("retry-after")));
          continue;
        }
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
      console.log(dryRunLine(preview.length));
      return NextResponse.json({
        mode: "dry",
        wouldSendCount: preview.length,
        wouldSend: preview,
        wouldRetireDripDays: skipRows.length,
        wouldRetireWelcomes: lateWelcomeRows.length,
        skippedOptedOut,
        skippedNoProfile,
        sendBlocked,
        firstEmailHtml: firstHtml,
      });
    }

    // ONE alert for a run that stopped early. What was not sent stays
    // unclaimed (or was released), so the next run picks it up while it is
    // still inside its window.
    if (stopped) {
      Sentry.captureMessage(`lifecycle cron: run stopped early (${stopped})`, {
        level: stopped === "time_budget" ? "warning" : "error",
        tags: { feature: "lifecycle-emails", stopped },
        extra: { sent, due: due.length, notSent: due.length - sent, released, rateLimitHits },
      });
    }

    console.log(liveLine(sent, due.length, stopped));
    return NextResponse.json({
      mode: "live",
      sent,
      due: due.length,
      dripDaysRetired,
      welcomesRetired,
      skippedOptedOut,
      skippedNoProfile,
      skippedNoUnsubscribeLink,
      released,
      stopped,
    });
  } catch (error) {
    Sentry.captureMessage("lifecycle cron: unhandled failure", {
      level: "error",
      tags: { feature: "lifecycle-emails" },
      extra: { message: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
