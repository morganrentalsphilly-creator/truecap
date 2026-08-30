import "server-only";

/**
 * Legacy Stripe-trial onboarding emails.
 *
 * Scheduled only when an older Checkout Session carries the historical
 * `trial_granted=true` marker. Current checkout uses `trialDays: 0`; the
 * current no-card product evaluation is separate, does not auto-renew, and
 * never enters this scheduler. Historical sessions use Resend `scheduled_at`:
 *   - trial_day1  (+1 day): activation nudge — the 10-deal guarantee habit
 *   - trial_day10 (+10 days): plain pre-billing reminder + guarantee restated
 *
 * Same estate rules as every lifecycle send: gated on
 * LIFECYCLE_EMAILS_MODE=live (Morgan's one flip for the whole lifecycle
 * program), idempotent via lifecycle_email_log (unique user_id+email_key —
 * webhook retries can't double-schedule), rendered through the shared
 * emails/lifecycle-email.tsx template from JSON content files, and
 * best-effort: a failure logs to Sentry and releases the claim so a Stripe
 * retry can try again; it never breaks webhook processing.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import * as Sentry from "@sentry/nextjs";
import { render } from "@react-email/render";
import type { SupabaseClient } from "@supabase/supabase-js";
import LifecycleEmail from "@/emails/lifecycle-email";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";

const CONTENT_DIR = path.join(process.cwd(), "emails", "lifecycle-content");

const TRIAL_EMAILS = [
  { emailKey: "trial_day1", file: "trial-day1.json", delayDays: 1 },
  { emailKey: "trial_day10", file: "trial-day10.json", delayDays: 10 },
] as const;

function lifecycleEmailsLive(): boolean {
  return (
    (process.env.LIFECYCLE_EMAILS_MODE ?? "off").trim().toLowerCase() === "live"
  );
}

type Content = {
  subject: string;
  preheader: string;
  headline: string;
  body: string[];
  cta_text: string;
  cta_url: string;
  signature_note?: string;
};

async function loadContent(file: string): Promise<Content | null> {
  try {
    const raw = JSON.parse(
      await fs.readFile(path.join(CONTENT_DIR, file), "utf8"),
    );
    if (
      typeof raw.subject !== "string" ||
      typeof raw.headline !== "string" ||
      typeof raw.cta_text !== "string" ||
      typeof raw.cta_url !== "string" ||
      !Array.isArray(raw.body) ||
      raw.body.length === 0
    ) {
      return null;
    }
    return raw as Content;
  } catch {
    return null;
  }
}

export type TrialEmailsResult = {
  scheduled: number;
  skipped: number;
  reason?: string;
};

export async function scheduleTrialOnboardingEmails(
  admin: SupabaseClient,
  input: { userId: string; email: string | null | undefined },
): Promise<TrialEmailsResult> {
  if (!lifecycleEmailsLive())
    return { scheduled: 0, skipped: 2, reason: "mode_off" };
  // Both approved lifecycle templates currently restate the optional refund
  // guarantee. Never schedule them while that separate marketing promise is
  // dark; a later guarantee-free template can replace this fail-closed gate.
  if (!getMarketingOfferConfig().guaranteeEnabled) {
    return { scheduled: 0, skipped: 2, reason: "guarantee_disabled" };
  }
  if (!input.email) return { scheduled: 0, skipped: 2, reason: "no_email" };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { scheduled: 0, skipped: 2, reason: "no_api_key" };

  const from = process.env.EMAIL_FROM || "TrueCap <hello@usetruecap.com>";
  const replyTo = process.env.EMAIL_REPLY_TO || "hello@usetruecap.com";
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://usetruecap.com"
  ).replace(/\/+$/, "");
  const manageUrl = `${siteUrl}/settings`;

  let scheduled = 0;
  let skipped = 0;

  for (const item of TRIAL_EMAILS) {
    // Claim first — the unique (user_id, email_key) row is the idempotency
    // contract shared with the lifecycle cron.
    const { error: claimError } = await admin
      .from("lifecycle_email_log")
      .insert({
        user_id: input.userId,
        email_key: item.emailKey,
      });
    if (claimError) {
      // 23505 = already scheduled by an earlier webhook delivery. Anything
      // else is unexpected — log it, but never fail the webhook.
      if (claimError.code !== "23505") {
        Sentry.captureMessage("Trial email claim failed", {
          level: "error",
          tags: { feature: "trial-emails" },
          extra: {
            email_key: item.emailKey,
            database_code: claimError.code ?? "unknown",
          },
        });
      }
      skipped += 1;
      continue;
    }

    const releaseClaim = async () => {
      await admin
        .from("lifecycle_email_log")
        .delete()
        .eq("user_id", input.userId)
        .eq("email_key", item.emailKey)
        .is("resend_id", null);
    };

    try {
      const content = await loadContent(item.file);
      if (!content) {
        Sentry.captureMessage("Trial email content missing/invalid", {
          level: "error",
          tags: { feature: "trial-emails" },
          extra: { file: item.file },
        });
        await releaseClaim();
        skipped += 1;
        continue;
      }
      const html = await render(
        LifecycleEmail({
          preheader: content.preheader ?? content.subject,
          headline: content.headline,
          body: content.body,
          ctaText: content.cta_text,
          ctaUrl: content.cta_url,
          signatureNote: content.signature_note ?? null,
          siteUrl,
          manageUrl,
        }),
      );
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: [input.email],
          subject: content.subject,
          html,
          reply_to: replyTo,
          scheduled_at: new Date(
            Date.now() + item.delayDays * 24 * 60 * 60 * 1000,
          ).toISOString(),
          tags: [{ name: "purpose", value: "lifecycle" }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        Sentry.captureMessage("Trial email schedule failed", {
          level: "error",
          tags: { feature: "trial-emails" },
          extra: { status: res.status, email_key: item.emailKey },
        });
        await releaseClaim();
        skipped += 1;
        continue;
      }
      const body = (await res.json().catch(() => null)) as {
        id?: string;
      } | null;
      if (body?.id) {
        await admin
          .from("lifecycle_email_log")
          .update({ resend_id: body.id })
          .eq("user_id", input.userId)
          .eq("email_key", item.emailKey);
      }
      scheduled += 1;
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: "trial-emails" } });
      await releaseClaim();
      skipped += 1;
    }
  }

  return { scheduled, skipped };
}
