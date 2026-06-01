"use client";

/**
 * Fires the PostHog `landing_view` funnel event once on mount.
 *
 * Why a dedicated component instead of capturing this from the
 * homepage page.tsx directly: the homepage is a server component
 * (server-side auth + entitlement loading), and analytics calls have
 * to run in the browser. This 12-line client island sits inside
 * app/page.tsx as the smallest possible client surface.
 *
 * Why a NAMED event instead of relying on PostHog's auto-pageview:
 * pageviews work great for general traffic analysis, but the funnel
 * builder in PostHog wants distinct named events for each step. Having
 * `landing_view` as the explicit top-of-funnel event lets you build
 * `landing_view → analyzer_started → analysis_completed → pro_checkout_started → pro_subscribed`
 * directly in the funnel UI without filtering on $current_url.
 */

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

export function TrackLandingView() {
  // useRef + early-return guard prevents double-firing under React 19's
  // dev-mode StrictMode (which mounts effects twice intentionally).
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent("landing_view", {
      // Useful for the funnel UI to filter by traffic source. Other
      // attribution-relevant props (utm_*, referrer) are captured by
      // PostHog's autocapture so we don't duplicate them here.
      path: typeof window !== "undefined" ? window.location.pathname : "/",
    });
  }, []);
  return null;
}
