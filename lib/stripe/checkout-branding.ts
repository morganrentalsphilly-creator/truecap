import type Stripe from "stripe";

/**
 * Public, production-hosted brand assets used by Stripe-hosted Checkout.
 *
 * Stripe fetches these URLs from its own servers, so a request-local site URL
 * such as http://localhost:3000 is not usable here. Keeping the assets on the
 * canonical domain also makes test-mode Checkout previews look like production
 * without exposing or uploading any credential.
 */
export const TRUECAP_STRIPE_ASSET_BASE_URL = "https://usetruecap.com";

/**
 * The site palette (DESIGN.md), as the hex values Stripe requires. Stripe's
 * `branding_settings` takes two colours only: the page background and the
 * button. It chooses the text colours itself (dark text on a light
 * background, white on a dark button), so Ink is not a value this file can
 * send. White on Signal Blue is 5.8:1.
 *
 * These are sent on every Checkout Session this repository creates, so they
 * apply whatever the Stripe account's Dashboard branding says. Archivo is not
 * one of Stripe's supported Checkout fonts, so the font stays Inter.
 */
export const TRUECAP_CHECKOUT_PAPER = "#EFECE8";
export const TRUECAP_CHECKOUT_SIGNAL_BLUE = "#0066BA";

export function buildTrueCapCheckoutBranding(
  assetBaseUrl: string = TRUECAP_STRIPE_ASSET_BASE_URL
): NonNullable<Stripe.Checkout.SessionCreateParams["branding_settings"]> {
  const baseUrl = assetBaseUrl.replace(/\/$/, "");
  return {
    display_name: "TrueCap",
    background_color: TRUECAP_CHECKOUT_PAPER,
    button_color: TRUECAP_CHECKOUT_SIGNAL_BLUE,
    font_family: "inter",
    border_style: "rounded",
    logo: {
      type: "url",
      url: `${baseUrl}/Logo-png-w.png`,
    },
    icon: {
      type: "url",
      url: `${baseUrl}/apple-icon.png`,
    },
  };
}

/**
 * Apply the shared TrueCap brand to any hosted Checkout Session payload.
 * Pure by design: tests can verify the exact payload without contacting Stripe.
 */
export function withTrueCapCheckoutBranding(
  params: Stripe.Checkout.SessionCreateParams,
  assetBaseUrl?: string
): Stripe.Checkout.SessionCreateParams {
  return {
    ...params,
    branding_settings: buildTrueCapCheckoutBranding(assetBaseUrl),
  };
}
