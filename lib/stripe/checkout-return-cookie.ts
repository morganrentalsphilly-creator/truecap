/**
 * Post-checkout return handoff.
 *
 * Stripe used to send subscribers straight to
 * `/dashboard/new?billing=success&session_id={CHECKOUT_SESSION_ID}`. That put
 * a bearer-ish Checkout Session id in the document URL, and `session_id` is
 * (correctly) on the sensitive-parameter list in lib/sensitive-url.ts — so
 * components/analytics/google-measurement.tsx refused to load GTM / the Ads
 * tag for the life of that document. The one real Google Ads Purchase
 * conversion (`paid_subscribed`) was therefore structurally unreachable on
 * the canonical post-checkout landing.
 *
 * Now Stripe returns to app/api/billing/return, which moves the id into a
 * short-lived httpOnly cookie and 303s to a clean `/dashboard/new?billing=success`
 * URL. The server (verifyCheckoutReturnAction) reads the cookie;
 * the browser never sees the id until the Stripe-bound verification succeeds.
 * The privacy gate itself is untouched: `session_id` stays sensitive.
 */

export const CHECKOUT_RETURN_COOKIE = "tc_checkout_return";

/** Long enough to survive a slow redirect chain; short enough that a stale
 *  id cannot resurface a success banner days later. */
export const CHECKOUT_RETURN_COOKIE_MAX_AGE_SECONDS = 10 * 60;

/** Clean landing: `billing=success` alone is not a sensitive parameter, so
 *  the Google loaders render there once consent is granted. */
export const CHECKOUT_RETURN_LANDING_PATH = "/dashboard/new?billing=success";

/** Stripe Checkout Session id shape (mirrors checkoutReturnSchema in
 *  app/actions/billing.ts). */
export const CHECKOUT_SESSION_ID_PATTERN = /^cs_[a-zA-Z0-9_]{8,240}$/;

export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === "string" && CHECKOUT_SESSION_ID_PATTERN.test(value);
}

export function checkoutReturnCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHECKOUT_RETURN_COOKIE_MAX_AGE_SECONDS,
  };
}
