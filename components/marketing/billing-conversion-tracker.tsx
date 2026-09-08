"use client";

/**
 * Tiny client-side helper that fires the "paid_subscribed" Google Ads
 * conversion event when the user lands on a page with ?billing=success.
 *
 * PRIMARY mount: the post-checkout /dashboard/new analyzer landing — Stripe's
 * success_url includes `?billing=success&session_id=…` and this tracker is
 * mounted through components/marketing/billing-success-banner.tsx. The static
 * /profile no longer mounts this tracker (2026-09-08): nothing produced
 * /profile?billing=success, and a subscription-id keyed mount could fire a
 * second purchase event for the same Checkout Session.
 *
 * Renders nothing; mounting is the side effect. The `value` should be
 * the dollar amount of the plan they just bought so Google can use
 * value-based bidding strategies (tROAS, value rules) effectively.
 */

import { useEffect } from "react";
import { trackConversion } from "@/lib/analytics/track-conversion";

interface Props {
  /** The billing query param value — only fires for "success". */
  billingStatus: string | undefined;
  /** Dollar amount of the plan to send as the conversion value (defaults 0). */
  value?: number;
  /** Stripe checkout SESSION id — the dedup key so a refresh doesn't
   *  double-fire (identical across every compatibility landing path). */
  transactionId?: string;
}

/** The Google loader is consent-gated and `lazyOnload`, and the banner only
 *  hands us "success" after a Stripe round trip — either can win the race.
 *  Poll for window.gtag for ~60s rather than dropping the one Purchase
 *  conversion the paid-ads account is bid against. */
const CONVERSION_RETRY_INTERVAL_MS = 500;
const CONVERSION_RETRY_MAX_ATTEMPTS = 120;

export function BillingConversionTracker({ billingStatus, value, transactionId }: Props) {
  useEffect(() => {
    if (billingStatus !== "success") return;
    // Use sessionStorage as a second dedup line in case the user refreshes
    // the ?billing=success landing after the conversion already fired.
    // The checkout SESSION id is the canonical transactionId (stable across
    // every return path, and available instantly
    // — unlike the subscription row, which waits on the Stripe webhook).
    const key = `tc_paid_${transactionId ?? "unknown"}`;
    try {
      if (window.sessionStorage.getItem(key) === "1") return;
    } catch {
      // sessionStorage may be unavailable in some browsers; fall through and fire anyway.
    }
    // The dedup key is burned only AFTER the conversion actually reached
    // gtag. Burning it first (the old order) permanently lost the event
    // whenever gtag was not defined yet.
    const fire = () => {
      const fired = trackConversion("paid_subscribed", {
        value: value ?? 0,
        currency: "USD",
        transactionId,
      });
      if (fired) {
        try {
          window.sessionStorage.setItem(key, "1");
        } catch {
          // Non-fatal: the event went out; only the refresh guard is weaker.
        }
      }
      return fired;
    };
    if (fire()) return;
    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      if (fire() || attempts >= CONVERSION_RETRY_MAX_ATTEMPTS) {
        window.clearInterval(intervalId);
      }
    }, CONVERSION_RETRY_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [billingStatus, value, transactionId]);
  return null;
}
