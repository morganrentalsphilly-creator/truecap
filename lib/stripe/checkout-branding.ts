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

export function buildTrueCapCheckoutBranding(
  assetBaseUrl: string = TRUECAP_STRIPE_ASSET_BASE_URL
): NonNullable<Stripe.Checkout.SessionCreateParams["branding_settings"]> {
  const baseUrl = assetBaseUrl.replace(/\/$/, "");
  return {
    display_name: "TrueCap",
    background_color: "#F7FAFC",
    button_color: "#0B3B60",
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
