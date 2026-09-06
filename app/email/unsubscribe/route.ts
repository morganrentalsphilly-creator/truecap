/**
 * GET /email/unsubscribe?token=<signed>
 * One-click marketing opt-out: sets profiles.marketing_opt_out, honored by
 * every future marketing send. The token is signed (lib/signed-token.ts)
 * under the "marketing-unsubscribe" scope and carries only the user id.
 */
import { NextResponse } from "next/server";
import { readSignedToken } from "@/lib/signed-token";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { UNSUBSCRIBE_TOKEN_SCOPE } from "@/lib/testimonials/feedback-email";
import { setMarketingOptOut } from "@/lib/testimonials/store";

export const runtime = "nodejs";

async function handle(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const data = token ? readSignedToken(UNSUBSCRIBE_TOKEN_SCOPE, token) : null;
  const userId = data?.u;
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return new NextResponse("This unsubscribe link is not valid.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }
  try {
    await setMarketingOptOut(createAdminSupabaseClient(), userId);
  } catch {
    return new NextResponse("Could not update your preference right now.", { status: 500 });
  }
  return new NextResponse("You're unsubscribed from TrueCap marketing emails. Product and billing notices still arrive.", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

export const GET = handle;
export const POST = handle; // RFC 8058 one-click
