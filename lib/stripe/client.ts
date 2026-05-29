import "server-only";

import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(key, {
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
