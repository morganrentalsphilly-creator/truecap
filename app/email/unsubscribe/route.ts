/** Signed opt-out for account marketing and anonymous drip sequences. */
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

export const runtime = "nodejs";

function reply(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function handle(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const emailHash = token ? readSignedToken(DRIP_UNSUBSCRIBE_TOKEN_SCOPE, token)?.e : null;
  const userId = token ? readSignedToken(UNSUBSCRIBE_TOKEN_SCOPE, token)?.u : null;
  if (!isDripEmailHash(emailHash) && (!userId || !/^[0-9a-f-]{36}$/i.test(userId))) {
    return reply("This unsubscribe link is not valid.", 400);
  }
  try {
    const admin = createAdminSupabaseClient();
    if (isDripEmailHash(emailHash)) {
      const result = await suppressDripEmail(admin, emailHash, process.env.RESEND_API_KEY ?? null);
      if (!result.suppressed) return reply("Could not update your preference right now. Please try this link again.", 503);
      if (result.failed > 0) {
        return reply("Your opt-out is saved, but some queued emails could not be cancelled yet. Please try this link again.", 503);
      }
      return reply("You're unsubscribed from TrueCap checklist and playbook emails. Product and billing notices still arrive.", 200);
    }
    await setMarketingOptOut(admin, userId!);
  } catch {
    return reply("Could not update your preference right now. Please try this link again.", 503);
  }
  return reply("You're unsubscribed from TrueCap marketing emails. Product and billing notices still arrive.", 200);
}

export const GET = handle;
export const POST = handle; // RFC 8058 one-click; the signed query token authorizes either verb.
