"use client";

/**
 * Fires the PostHog `shared_deal_viewed` event once when someone opens a
 * public /d/[encoded] share link.
 *
 * This is the other half of the share loop: `share_link_copied` (the
 * sharer) → `shared_deal_viewed` (the recipient). The ratio between them
 * is the loop's reach — how many new visitors each shared deal brings in —
 * and the top of a `shared_deal_viewed → analyzer_started →
 * pro_checkout_started` funnel for traffic that arrives via a share.
 *
 * A dedicated client island because /d/[encoded]/page.tsx is a server
 * component, and analytics has to run in the browser (mirrors
 * components/analytics/track-landing-view.tsx).
 */

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

export function TrackSharedDealView({ hasAddress }: { hasAddress: boolean }) {
  // useRef guard prevents double-firing under React 19 StrictMode (effects
  // mount twice in dev).
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent("shared_deal_viewed", { has_address: hasAddress });
    trackEvent("share_viewed", {
      address_included: hasAddress,
      share_format: "opaque_or_legacy",
    });
  }, [hasAddress]);
  return null;
}
