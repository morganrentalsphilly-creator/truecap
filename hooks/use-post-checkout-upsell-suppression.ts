"use client";

import { useSyncExternalStore } from "react";

/**
 * Post-checkout upsell suppression — a window-level signal set by
 * BillingSuccessBanner while it polls for the Stripe webhook to land the
 * new subscription row (billing=success landings only). While the signal
 * is on, MomentOfValueUpsell and ProInlineGate render nothing, so a buyer
 * never sees a "start your free trial" pitch seconds after paying.
 *
 * Fail-OPEN by design: the default is `false` (upsells behave exactly as
 * today), every window access is wrapped in try/catch, and the banner
 * clears the signal on poll timeout AND on unmount — a non-buyer, an
 * errored poll, or a crashed banner all leave the upsells untouched.
 *
 * The signal only ever HIDES upsell chrome; it never grants entitlements.
 * The server gates are unchanged — the banner's router.refresh() is what
 * actually re-reads them once the subscription row lands.
 *
 * Window-event (not React context) on purpose: the banner lives in the
 * page shell while the consumers live deep inside the analysis dashboard,
 * and both homepage variants mount them independently — a provider would
 * have to touch files outside this feature.
 */

const EVENT_NAME = "truecap:post-checkout-upsell-suppression";

type SignalWindow = Window & { __tcPostCheckoutSuppressUpsells?: boolean };

export function setPostCheckoutUpsellSuppression(suppressed: boolean): void {
  try {
    (window as SignalWindow).__tcPostCheckoutSuppressUpsells = suppressed;
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // No window (SSR) or a blocked dispatch — fail open, do nothing.
  }
}

export function getPostCheckoutUpsellSuppressionSnapshot(): boolean {
  try {
    return (window as SignalWindow).__tcPostCheckoutSuppressUpsells === true;
  } catch {
    return false;
  }
}

export function subscribeToPostCheckoutUpsellSuppression(onChange: () => void): () => void {
  try {
    window.addEventListener(EVENT_NAME, onChange);
    return () => {
      try {
        window.removeEventListener(EVENT_NAME, onChange);
      } catch {
        // Fail open — nothing left to clean up.
      }
    };
  } catch {
    return () => {};
  }
}

const getServerSnapshot = () => false;

export function usePostCheckoutUpsellSuppression(): boolean {
  return useSyncExternalStore(
    subscribeToPostCheckoutUpsellSuppression,
    getPostCheckoutUpsellSuppressionSnapshot,
    getServerSnapshot
  );
}
