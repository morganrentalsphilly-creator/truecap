/**
 * Signed opt-out for account marketing and anonymous drip sequences.
 *
 * GET must stay side-effect free: the same signed URL sits as a plain href in
 * every message body, and mail-client link scanners (Outlook Safe Links,
 * corporate proxies, Gmail prefetch) issue GETs to those hrefs without a
 * click. GET therefore renders a one-button confirmation page whose form
 * POSTs the same token; POST is the only acting verb. RFC 8058 one-click
 * (List-Unsubscribe-Post) also POSTs to the header URL with body
 * `List-Unsubscribe=One-Click`, so header-driven unsubscribes keep working
 * through the query-token fallback. House pattern: app/api/testimonials/unpublish.
 */
import { NextResponse } from "next/server";
import { readSignedToken } from "@/lib/signed-token";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { UNSUBSCRIBE_TOKEN_SCOPE } from "@/lib/testimonials/feedback-email";
import { setMarketingOptOut } from "@/lib/testimonials/store";
import {
  DRIP_UNSUBSCRIBE_TOKEN_SCOPE,
  isDripEmailHash,
  suppressDripEmail,
} from "@/lib/email-drip-unsubscribe";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";

const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Robots-Tag": "noindex",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

function page(body: string, status: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Unsubscribe from TrueCap emails</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5">${body}</body></html>`;
  return new NextResponse(html, { status, headers: HTML_HEADERS });
}

function reply(message: string, status: number) {
  return page(`<p>${escapeHtml(message)}</p>`, status);
}

type Recipient = { kind: "drip"; emailHash: string } | { kind: "marketing"; userId: string };

/** Signature-checked, shape-checked recipient behind a token — or null. */
function readRecipient(token: string): Recipient | null {
  if (!token) return null;
  const emailHash = readSignedToken(DRIP_UNSUBSCRIBE_TOKEN_SCOPE, token)?.e;
  if (isDripEmailHash(emailHash)) return { kind: "drip", emailHash };
  const userId = readSignedToken(UNSUBSCRIBE_TOKEN_SCOPE, token)?.u;
  if (userId && /^[0-9a-f-]{36}$/i.test(userId)) return { kind: "marketing", userId };
  return null;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const recipient = readRecipient(token);
  if (!recipient) return reply("This unsubscribe link is not valid.", 400);
  const series =
    recipient.kind === "drip"
      ? "TrueCap checklist and playbook emails"
      : "TrueCap marketing emails";
  return page(
    `<h1 style="font-size:1.25rem">Unsubscribe from ${series}?</h1><p>Product and billing notices still arrive. Nothing changes until you confirm.</p><form method="post" action="/email/unsubscribe"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit" style="font:inherit;padding:.5rem 1rem">Unsubscribe</button></form>`,
    200,
  );
}

export async function POST(request: Request) {
  // The confirmation form carries the token in the body; RFC 8058 one-click
  // POSTs `List-Unsubscribe=One-Click` to the header URL, whose query carries it.
  let token = "";
  try {
    const form = await request.formData();
    const value = form.get("token");
    if (typeof value === "string") token = value;
  } catch {
    token = "";
  }
  if (!token) token = new URL(request.url).searchParams.get("token") ?? "";
  const recipient = readRecipient(token);
  if (!recipient) return reply("This unsubscribe link is not valid.", 400);
  try {
    const admin = createAdminSupabaseClient();
    if (recipient.kind === "drip") {
      const result = await suppressDripEmail(admin, recipient.emailHash, process.env.RESEND_API_KEY ?? null);
      if (!result.suppressed) return reply("Could not update your preference right now. Please try this link again.", 503);
      if (result.failed > 0) {
        return reply("Your opt-out is saved, but some queued emails could not be cancelled yet. Please try this link again.", 503);
      }
      return reply("You're unsubscribed from TrueCap checklist and playbook emails. Product and billing notices still arrive.", 200);
    }
    await setMarketingOptOut(admin, recipient.userId);
  } catch {
    return reply("Could not update your preference right now. Please try this link again.", 503);
  }
  return reply("You're unsubscribed from TrueCap marketing emails. Product and billing notices still arrive.", 200);
}
