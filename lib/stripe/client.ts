import "server-only";

import Stripe from "stripe";

export type StripeClientOptions = {
  /**
   * Per-request timeout in milliseconds. The SDK default (80 s) is right for
   * checkout and webhook sync, where giving up early costs money; it is wrong
   * for read-only display paths that render public pages, where a Stripe
   * incident should degrade to a fallback instead of holding every render.
   */
  timeout?: number;
  /** Network retries per request; the SDK default is 1. */
  maxNetworkRetries?: number;
};

export function getStripe(options: StripeClientOptions = {}): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(key, {
    ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
    ...(options.maxNetworkRetries !== undefined
      ? { maxNetworkRetries: options.maxNetworkRetries }
      : {}),
    // Pin to the API version the installed SDK type expects. The Stripe
    // package was bumped to a newer SDK that now declares the
    // 2026-04-22.dahlia API version as its expected default. Pinning
    // explicitly here keeps webhook signatures + payload shapes stable
    // across deploys — Stripe never silently changes behavior for a
    // pinned version. If/when we want to opt into newer features,
    // bump this string AND review the changelog at
    //   https://docs.stripe.com/changelog
    apiVersion: "2026-04-22.dahlia",
  });
}
