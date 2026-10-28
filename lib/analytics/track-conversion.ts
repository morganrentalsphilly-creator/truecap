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
 *   - Without current cookie consent: nothing is queued or sent
 *   - Ad blocker active: catches the error silently
 */

import { readStoredAnalyticsConsent } from "@/lib/analytics/site-events";

const GOOGLE_ADS_ID = "AW-8236119484";

/** Map your application-level event name → Google Ads conversion label.
 *
 * Replace the placeholders with the real labels from the Google Ads
 * Conversions screen. Without a label, a consented event is queued only
 * in dataLayer for an explicitly configured GTM mapping. */
const LABELS: Record<ConversionKey, string | null> = {
  calc_completed: null, // e.g. "AbC_DeFgHi-jKlM_NoP"
  // No label yet. When one is set: the only caller is the email sign-up form,
  // at the same moment as the `signup_completed` site event, so it would
  // count SUBMITTED email sign-ups (unconfirmed included) and no Google
  // sign-ups. See lib/analytics/site-events.ts.
  signup: null, // e.g. "AbC_DeFgHi-jKlM_NoP"
  paid_subscribed: "BCFeCPrZlqwcEIri_9JD", // Purchase conversion (AW-8236119484)
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
  /** Dollar value of the conversion. For paid_subscribed it is what the
   *  Checkout Session charged (amount_total), not the plan's list price. */
  value?: number;
  /** ISO currency, default USD. */
  currency?: string;
  /** Local-only deduplication key. Never forwarded to Google or dataLayer. */
  transactionId?: string;
  /** Called once Google's tags have run for this event: gtag's
   *  `event_callback` for a labeled conversion, GTM's `eventCallback` for the
   *  dataLayer push otherwise. Never called when no Google tag is running. */
  onDelivered?: () => void;
}

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

/**
 * Returns true once the event is handed to gtag or queued in dataLayer for an
 * unlabeled event; this is not proof of network delivery. Returns false without
 * current consent or when the handoff is unavailable. The Google loader is
 * consent-gated AND `lazyOnload`
 * (components/analytics/google-measurement.tsx), so a caller that must fire
 * exactly once — BillingConversionTracker — retries on `false` instead of
 * burning its dedup key on a transiently missing gtag.
 */
export function trackConversion(
  event: ConversionKey,
  options: ConversionOptions = {},
): boolean {
  // GTM replays its pre-load queue. Never record a pre-consent conversion for
  // a later grant, and never trust an already-loaded gtag after withdrawal.
  if (readStoredAnalyticsConsent() !== "granted") return false;
  const label = LABELS[event];
  if (!label) {
    // Still log the event to dataLayer so GA4 / GTM can pick it up.
    return pushDataLayerEvent(event, options);
  }
  try {
    const gtag = window.gtag;
    if (typeof gtag !== "function") return false;
    gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${label}`,
      value: options.value ?? 0,
      currency: options.currency ?? "USD",
      ...(options.onDelivered ? { event_callback: options.onDelivered } : {}),
    });
    pushDataLayerEvent(event, { ...options, onDelivered: undefined });
    return true;
  } catch {
    // never let analytics break the user flow
    return false;
  }
}

function pushDataLayerEvent(event: ConversionKey, options: ConversionOptions): boolean {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: `tc_${event}`,
      value: options.value ?? 0,
      currency: options.currency ?? "USD",
      ...(options.onDelivered ? { eventCallback: options.onDelivered } : {}),
    });
    return true;
  } catch {
    return false;
  }
}

/** gtag.js and gtm.js both define `google_tag_manager` once they run. Before
 *  that (no consent, the lazyOnload loader not run yet, dev) nothing pushed
 *  from this document will be sent by Google, so there is nothing to wait for. */
function googleTagsRunning(): boolean {
  return (
    typeof (window as { google_tag_manager?: unknown }).google_tag_manager ===
    "object"
  );
}

/**
 * `trackConversion` for a caller about to leave the document (the analyzer's
 * first save opens the saved deal in a new one). Resolves once Google reports
 * the event's tags ran, after `timeoutMs` at the latest, and at once when no
 * Google tag is running here.
 */
export function trackConversionBeforeLeaving(
  event: ConversionKey,
  options: Omit<ConversionOptions, "onDelivered"> = {},
  timeoutMs = 1500,
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      resolve();
    };
    const waitForGoogle = googleTagsRunning();
    // GTM calls eventCallback once per container; `done` is idempotent.
    const sent = trackConversion(event, {
      ...options,
      ...(waitForGoogle ? { onDelivered: done } : {}),
    });
    if (!waitForGoogle || !sent) {
      done();
      return;
    }
    timer = setTimeout(done, timeoutMs);
  });
}
