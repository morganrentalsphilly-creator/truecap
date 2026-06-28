"use server";

/**
 * Capture a lead from a co-branded shared deal page (/d/[encoded]).
 *
 * A VIEWER (anonymous — not the deal's owner) submits their contact on a Pro
 * user's branded share page. We store it for that owner (the agent) and, when
 * LEAD_NOTIFICATIONS_MODE=live, email the owner. Writes go through the
 * service-role admin client because the viewer has no session; deal_leads has
 * no anon insert policy, so this action is the only write path.
 *
 * Result follows the codebase discriminated-union convention (CLAUDE.md §3.2);
 * never throws to the client.
 */

import { z } from "zod";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";

export type CaptureLeadResult =
  | { ok: true }
  | {
      ok: false;
      code: "VALIDATION_ERROR" | "OWNER_NOT_ELIGIBLE" | "SERVER_ERROR";
      message: string;
    };

const leadSchema = z.object({
  ownerId: z.string().uuid("This share link can't receive messages."),
  email: z.string().email("Please enter a valid email."),
  name: z.string().trim().max(100).optional(),
  message: z.string().trim().max(1000).optional(),
  dealAddress: z.string().trim().max(200).optional(),
  /** Honeypot — a hidden field real users never see/fill. Bots that fill it
   *  get a fake success and are silently dropped (no insert, no notify). */
  website: z.string().optional(),
});

function notificationsLive(): boolean {
  return (process.env.LEAD_NOTIFICATIONS_MODE ?? "off").trim().toLowerCase() === "live";
}

// Best-effort per-IP submission limiter (in-memory, per serverless instance) —
// caps spam inserts (and, when live, owner-notify email cost) on the public
// lead form. Worst case under instance churn is a few extra rows; don't add a
// DB table for this.
const LEAD_WINDOW_MS = 60 * 60 * 1000;
const LEAD_MAX_PER_WINDOW = 15;
const leadBuckets = new Map<string, { windowStart: number; count: number }>();

function overLeadLimit(ip: string): boolean {
  const now = Date.now();
  const b = leadBuckets.get(ip);
  if (!b || now - b.windowStart > LEAD_WINDOW_MS) {
    leadBuckets.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  b.count += 1;
  if (leadBuckets.size > 5000) {
    for (const [k, v] of leadBuckets) if (now - v.windowStart > LEAD_WINDOW_MS) leadBuckets.delete(k);
  }
  return b.count > LEAD_MAX_PER_WINDOW;
}

export async function captureDealLeadAction(input: unknown): Promise<CaptureLeadResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
    };
  }
  // Honeypot tripped → pretend it worked, drop silently (no insert/notify).
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return { ok: true };
  }
  const { ownerId, email, name, message, dealAddress } = parsed.data;

  // Per-IP rate limit (best-effort). Returns a soft error rather than silently
  // dropping a legit user's message.
  let ip = "unknown";
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  } catch {
    /* headers() unavailable — fall through with the shared bucket */
  }
  if (overLeadLimit(ip)) {
    return { ok: false, code: "SERVER_ERROR", message: "Too many messages just now — please try again shortly." };
  }

  try {
    const admin = createAdminSupabaseClient();

    // Only Pro owners (those who can co-brand) accept leads. Guards a crafted
    // link pointing at a free/non-existent owner.
    const entitlements = await getEntitlementsForUser(admin, ownerId);
    if (!hasPlanFeature(entitlements, "custom_branding")) {
      return { ok: false, code: "OWNER_NOT_ELIGIBLE", message: "This deal isn't accepting messages." };
    }

    const { error: insertError } = await admin.from("deal_leads").insert({
      owner_user_id: ownerId,
      lead_email: email,
      lead_name: name || null,
      message: message || null,
      deal_address: dealAddress || null,
      source: "shared_deal",
    });

    if (insertError) {
      // Tolerate the table not existing yet (migration pending) without a 500.
      if (insertError.code === "42P01") {
        Sentry.captureMessage("deal_leads table missing — migration pending", {
          level: "warning",
          tags: { feature: "agent-lead-capture" },
        });
        return { ok: false, code: "SERVER_ERROR", message: "Couldn't send right now. Try again shortly." };
      }
      throw insertError;
    }

    // Owner-notification email — dormant until LEAD_NOTIFICATIONS_MODE=live.
    // Best-effort: a failed notification must never fail the capture.
    if (notificationsLive()) {
      await notifyOwner(admin, ownerId, { email, name, message, dealAddress }).catch((err) => {
        Sentry.captureMessage("lead owner-notify failed", {
          level: "warning",
          tags: { feature: "agent-lead-capture" },
          extra: { message: err instanceof Error ? err.message : String(err) },
        });
      });
    }

    return { ok: true };
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "agent-lead-capture" } });
    return { ok: false, code: "SERVER_ERROR", message: "Couldn't send right now. Try again shortly." };
  }
}

async function notifyOwner(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  ownerId: string,
  lead: { email: string; name?: string; message?: string; dealAddress?: string }
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const { data: userData } = await admin.auth.admin.getUserById(ownerId);
  const to = userData.user?.email;
  if (!to) return;

  const from = process.env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>";
  const esc = (s?: string) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:520px;margin:24px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
    <h2 style="margin:0 0 8px;font-size:18px;">New lead from your shared deal</h2>
    ${lead.dealAddress ? `<p style="margin:0 0 8px;color:#374151;">Deal: <strong>${esc(lead.dealAddress)}</strong></p>` : ""}
    <p style="margin:0 0 4px;color:#374151;">From: <strong>${esc(lead.name) || "—"}</strong></p>
    <p style="margin:0 0 4px;color:#374151;">Email: <a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></p>
    ${lead.message ? `<p style="margin:12px 0 0;color:#374151;">&ldquo;${esc(lead.message)}&rdquo;</p>` : ""}
    <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">Captured via your co-branded TrueCap share link. Reply directly to reach them.</p>
  </div></body></html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      reply_to: lead.email,
      subject: `New lead${lead.dealAddress ? ` · ${lead.dealAddress}` : ""}`,
      html,
      tags: [{ name: "purpose", value: "agent-lead" }],
    }),
    signal: AbortSignal.timeout(10_000),
  });
}
