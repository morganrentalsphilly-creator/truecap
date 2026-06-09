/**
 * Client-side analytics wrapper.
 *
 * Why a wrapper instead of importing posthog-js directly at call sites:
 *
 *   1. SAFE NO-OP — if `NEXT_PUBLIC_POSTHOG_KEY` isn't set (local dev,
 *      preview deploys without analytics, ad-blocked sessions),
 *      every capture call becomes a no-op instead of throwing.
 *   2. CONSENT-AWARE — even when PostHog is initialized, it stays
 *      opted-out until the user accepts cookies. These helpers respect
 *      that state automatically because they go through posthog-js's
 *      built-in opt-in/opt-out machinery.
 *   3. TYPED EVENT NAMES — the funnel events are an enum, not free
 *      text. Typos at call sites become TypeScript errors instead of
 *      silently fragmenting the funnel into 3 lookalike events in the
 *      PostHog dashboard.
 *
 * Server-side events (e.g. `pro_subscribed` from the Stripe webhook)
 * go through lib/posthog-server.ts, not this file.
 */

import posthog from "posthog-js";

/**
 * Named events tracked client-side. Adding a new one? Add it here AND
 * document the expected `properties` shape in the inline JSDoc so the
 * PostHog dashboard stays parseable.
 *
 * Server-side events (pro_checkout_started, pro_subscribed,
 * newsletter_subscribed, subscription_cancelled) are captured via
 * lib/posthog-server.ts and don't need to appear here.
 */
export type FunnelEvent =
  | "landing_view"
  | "analyzer_started"
  | "analysis_completed"
  | "pro_checkout_started"
  | "pro_subscribed"
  | "deal_saved"        // properties: property_type, purchase_price, cap_rate, monthly_cash_flow
  | "pdf_exported"      // properties: property_type, purchase_price, has_deal_score
  | "share_link_copied" // properties: has_address
  // ── Conversion-improvement events ──────────────────────────────
  // Fired by the 5 free-tier conversion improvements shipped after
  // the math audit. Each gives the funnel one more measurable step
  // so we can spot which improvement is actually moving the needle.
  | "email_capture_shown"     // properties: address_present
  | "email_capture_submitted" // properties: address_present, scheduled_count
  | "email_capture_dismissed"
  | "exit_intent_shown"
  | "exit_intent_clicked"     // properties: variant (always "50_off_annual" for now)
  | "exit_intent_dismissed"
  // Sample-deal Pro preview — fires when a non-Pro visitor runs the
  // sample deal and the full Pro report is unlocked for the demo.
  // Compare pro_checkout_started rates for sessions with vs without
  // this event to measure whether tasting Pro sells Pro.
  | "sample_pro_preview_viewed" // properties: property_type
  // One-time $5 lender PDF (Stripe Checkout `payment` mode).
  // started → user left for Stripe; purchased → verified paid on return.
  // The gap between the two = one-time checkout drop-off.
  | "one_time_pdf_checkout_started" // properties: property_type
  | "one_time_pdf_purchased"

/**
 * Safe capture. Use this everywhere instead of `posthog.capture(...)`
 * directly. Returns a boolean for the rare caller that wants to know
 * whether the event was actually dispatched (e.g. for debugging).
 */
export function trackEvent(
  event: FunnelEvent,
  properties?: Record<string, unknown>
): boolean {
  if (typeof window === "undefined") return false;
  try {
    // posthog-js exposes __loaded as a runtime signal that init() ran.
    // Guards against capture-before-init when called from a render
    // path that fires before the provider's useEffect has run.
    if (!posthog.__loaded) return false;
    posthog.capture(event, properties);
    return true;
  } catch (err) {
    // Analytics must never break user-facing flows. Console-warn only.
    console.warn("[analytics] trackEvent failed:", err);
    return false;
  }
}

/**
 * Identify the current user. Called from the PostHogProvider once the
 * Supabase session is known. PostHog associates all subsequent events
 * with this distinct_id, and back-fills earlier anonymous events from
 * the same browser session (anonymous → identified merge).
 *
 * The user-id is the Supabase auth.users.id (UUID). Email goes in
 * properties so PostHog can render it in the dashboard, but PII
 * propagation respects PostHog's account-level privacy settings.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    if (!posthog.__loaded) return;
    posthog.identify(userId, properties);
  } catch (err) {
    console.warn("[analytics] identifyUser failed:", err);
  }
}

/**
 * Reset the PostHog session — call on sign-out so subsequent events
 * from this browser aren't attributed to the previous user. Generates
 * a new anonymous distinct_id under the hood.
 */
export function resetAnalytics(): void {
  if (typeof window === "undefined") return;
  try {
    if (!posthog.__loaded) return;
    posthog.reset();
  } catch (err) {
    console.warn("[analytics] resetAnalytics failed:", err);
  }
}

/**
 * Sync cookie-consent state with PostHog. Called by the cookie banner
 * when the user makes a decision. Until consent is granted, PostHog
 * stays opted out (init defaults to opt_out_by_default).
 */
export function setAnalyticsConsent(granted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (!posthog.__loaded) return;
    if (granted) {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }
  } catch (err) {
    console.warn("[analytics] setAnalyticsConsent failed:", err);
  }
}
