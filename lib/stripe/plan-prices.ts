/**
 * Plan ↔ Stripe-price resolution, centralized.
 *
 * `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_ANNUAL` may hold a
 * COMMA-SEPARATED list of Stripe price ids:
 *
 *   STRIPE_PRICE_PRO_MONTHLY="price_current,price_grandfathered_old"
 *
 * - The FIRST id is the CURRENT/primary price — what checkout sells and what
 *   the pricing page displays.
 * - EVERY id is recognized when mapping a webhook's price back to a plan, so
 *   legacy / grandfathered prices (e.g. subscribers on an old $20/mo price
 *   after the list price moved to $29.99/mo) still resolve to Pro instead of
 *   silently falling through to Free.
 *
 * That grandfathering gap — a subscription whose price matched neither the
 * single env var nor plans.stripe_price_id resolving to Free — is exactly the
 * 2026-07 entitlement incident. A single un-comma'd value behaves identically
 * to before, so this is backward-compatible.
 *
 * Price ids are not secrets, but these env vars are server-side (no
 * NEXT_PUBLIC prefix), so every caller runs on the server.
 */

export type PaidPlanSlug = "pro_monthly" | "pro_annual";

function envForSlug(slug: PaidPlanSlug): string | undefined {
  return slug === "pro_monthly"
    ? process.env.STRIPE_PRICE_PRO_MONTHLY
    : process.env.STRIPE_PRICE_PRO_ANNUAL;
}

/** All configured price ids for a plan (order preserved; primary first). */
export function getAllPlanPriceIds(slug: PaidPlanSlug): string[] {
  return (envForSlug(slug) ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/**
 * The current/primary price id for a plan — the FIRST configured id. Used for
 * CHECKOUT and price DISPLAY: new subscribers get exactly one price, and we
 * show the price we're actually selling.
 */
export function getPrimaryPlanPriceId(slug: PaidPlanSlug): string | null {
  return getAllPlanPriceIds(slug)[0] ?? null;
}

/**
 * Map a Stripe price id back to its plan slug, matching ANY configured price
 * (current or grandfathered). Returns null when the price belongs to neither
 * plan's list.
 */
export function planSlugFromPriceId(priceId: string | null | undefined): PaidPlanSlug | null {
  if (!priceId) return null;
  if (getAllPlanPriceIds("pro_monthly").includes(priceId)) return "pro_monthly";
  if (getAllPlanPriceIds("pro_annual").includes(priceId)) return "pro_annual";
  return null;
}
