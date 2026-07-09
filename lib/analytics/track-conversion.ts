/**
 * Google Ads conversion event helpers.
 *
 * Layout already loads gtag.js with AW-8236119484 in production. This
 * module wraps the firing of conversion events so callers don't have
 * to know about window.gtag or the conversion IDs.
 *
 * USAGE:
 *   trackConversion("calc_completed");
 *   trackConversion("signup", { value: 0, currency: "USD" });
 *   trackConversion("paid_subscribed", { value: 99, currency: "USD" });
 *
 * SETUP IN GOOGLE ADS (do this once in the dashboard):
 *   1. Tools & Settings → Measurement → Conversions
 *   2. Create three actions matching the keys below, each Category=Sign-up
 *      / Purchase as appropriate
 *   3. Replace the `LABELS` map values with the conversion labels Google
 *      gives you (the part after the "/" in send_to)
 *
 * SAFE TO CALL AT ANY TIME:
 *   - SSR: window is undefined, the helper no-ops
 *   - Local dev: gtag not loaded, the helper no-ops
 *   - Ad blocker active: catches the error silently
 */

const GOOGLE_ADS_ID = "AW-8236119484";

/** Map your application-level event name → Google Ads conversion label.
 *
 * Replace the placeholders with the real labels from the Google Ads
 * Conversions screen. Until then the helper silently no-ops, which is
 * the right behavior (no spurious events fired). */
const LABELS: Record<ConversionKey, string | null> = {
  calc_completed: null,    // e.g. "AbC_DeFgHi-jKlM_NoP"
  signup: null,            // e.g. "AbC_DeFgHi-jKlM_NoP"
  paid_subscribed: "BCFeCPrZlqwcEIri_9JD",  // Purchase conversion (AW-8236119484)
  pdf_exported: null,
  deal_saved: null,
};

export type ConversionKey =
  | "calc_completed"
  | "signup"
  | "paid_subscribed"
  | "pdf_exported"
  | "deal_saved";

export interface ConversionOptions {
  /** Dollar value of the conversion (e.g. monthly Pro price). */
  value?: number;
  /** ISO currency, default USD. */
  currency?: string;
  /** Opaque transaction ID for deduplication. */
  transactionId?: string;
}

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

export function trackConversion(
  event: ConversionKey,
  options: ConversionOptions = {}
): void {
  if (typeof window === "undefined") return;
  const label = LABELS[event];
  if (!label) {
    // Still log the event to dataLayer so GA4 / GTM can pick it up.
    pushDataLayerEvent(event, options);
    return;
  }
  try {
    const gtag = window.gtag;
    if (typeof gtag !== "function") return;
    gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${label}`,
      value: options.value ?? 0,
      currency: options.currency ?? "USD",
      ...(options.transactionId ? { transaction_id: options.transactionId } : {}),
    });
    pushDataLayerEvent(event, options);
  } catch {
    // never let analytics break the user flow
  }
}

function pushDataLayerEvent(event: ConversionKey, options: ConversionOptions) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: `tc_${event}`,
      value: options.value ?? 0,
      currency: options.currency ?? "USD",
    });
  } catch {
    // ignore
  }
}
