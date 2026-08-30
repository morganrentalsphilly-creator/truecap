"use client";

/**
 * Fires the canonical `shared_analysis_opened` event once when a shared
 * analysis renders. The source is a coarse route class, never a token or id.
 *
 * This is the entry to the recipient loop:
 * `shared_analysis_opened` → `shared_analysis_copied` (when the recipient
 * authenticates and a new record is actually inserted). The ratio measures
 * how often a shared view becomes a private, recipient-owned analysis.
 *
 * A dedicated client island because /d/[encoded]/page.tsx is a server
 * component, and analytics has to run in the browser (mirrors
 * components/analytics/track-landing-view.tsx).
 */

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

export function TrackSharedDealView({
  referralSource,
}: {
  referralSource: "opaque_share" | "legacy_share" | "portal_share";
}) {
  // useRef guard prevents double-firing under React 19 StrictMode (effects
  // mount twice in dev).
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent("shared_analysis_opened", {
      referral_source: referralSource,
    });
  }, [referralSource]);
  return null;
}
