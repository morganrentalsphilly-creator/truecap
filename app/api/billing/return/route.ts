/**
 * GET /api/billing/return?session_id=cs_…
 *
 * Stripe Checkout `success_url` target (app/actions/billing.ts). Moves the
 * Checkout Session id out of the document URL and into a short-lived httpOnly
 * cookie, then 303s to the clean in-shell analyzer landing. See
 * lib/stripe/checkout-return-cookie.ts for why the id must never be in the
 * URL the client tree mounts on.
 *
 * No auth here on purpose: the cookie only carries the id, and every consumer
 * (app/dashboard/new/page.tsx hint, verifyCheckoutReturnAction) re-binds the
 * Session to the signed-in user before trusting it. A malformed id sets no
 * cookie and lands on the analyzer without `billing=success`.
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  CHECKOUT_RETURN_COOKIE,
  CHECKOUT_RETURN_LANDING_PATH,
  checkoutReturnCookieOptions,
  isCheckoutSessionId,
} from "@/lib/stripe/checkout-return-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  // Same-origin redirect (the auth callback does the same): the host Stripe
  // returned to is the host the analyzer lives on.
  const { searchParams, origin } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  const response = isCheckoutSessionId(sessionId)
    ? NextResponse.redirect(`${origin}${CHECKOUT_RETURN_LANDING_PATH}`, 303)
    : NextResponse.redirect(`${origin}/dashboard/new`, 303);
  if (isCheckoutSessionId(sessionId)) {
    response.cookies.set(
      CHECKOUT_RETURN_COOKIE,
      sessionId,
      checkoutReturnCookieOptions(),
    );
  }
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}
