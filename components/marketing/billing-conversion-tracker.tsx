"use client";

/**
 * Tiny client-side helper that fires the "paid_subscribed" Google Ads
 * conversion event when the user lands on /profile?billing=success.
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
  /** Stripe subscription ID — used as dedup key so a refresh doesn't double-fire. */
  transactionId?: string;
}

export function BillingConversionTracker({ billingStatus, value, transactionId }: Props) {
  useEffect(() => {
    if (billingStatus !== "success") return;
    // Use sessionStorage as a second dedup line in case the user refreshes
    // the /profile?billing=success page after the conversion already fired.
    const key = `tc_paid_${transactionId ?? "unknown"}`;
    try {
      if (window.sessionStorage.getItem(key) === "1") return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage may be unavailable in some browsers; fall through and fire anyway.
    }
    trackConversion("paid_subscribed", { value: value ?? 0, currency: "USD", transactionId });
  }, [billingStatus, value, transactionId]);
  return null;
}
