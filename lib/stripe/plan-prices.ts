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

export type PaidPlanSlug = "pro_monthly" | "pro_annual" | "agent_pro_monthly" | "agent_pro_annual";

/** Every paid slug, checkout-display order. Single list so no resolver can forget one. */
export const PAID_PLAN_SLUGS: readonly PaidPlanSlug[] = [
  "pro_monthly",
  "pro_annual",
  "agent_pro_monthly",
  "agent_pro_annual",
] as const;

function envForSlug(slug: PaidPlanSlug): string | undefined {
  switch (slug) {
    case "pro_monthly":
      return process.env.STRIPE_PRICE_PRO_MONTHLY;
    case "pro_annual":
      return process.env.STRIPE_PRICE_PRO_ANNUAL;
    case "agent_pro_monthly":
      return process.env.STRIPE_PRICE_AGENT_PRO_MONTHLY;
    case "agent_pro_annual":
      return process.env.STRIPE_PRICE_AGENT_PRO_ANNUAL;
  }
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
  // Iterate the canonical slug list so a future tier CANNOT be forgotten here —
  // this resolver falling through to null is exactly how the 2026-07 incident
  // downgraded paying subscribers to Free.
  for (const slug of PAID_PLAN_SLUGS) {
    if (getAllPlanPriceIds(slug).includes(priceId)) return slug;
  }
  return null;
}

/**
 * Is the Agent Pro tier configured on this deployment? True only when a
 * checkout-able price exists. The tier ships fully plumbed but INERT: until
 * STRIPE_PRICE_AGENT_PRO_MONTHLY is set (and the plans rows are migrated),
 * no pricing surface shows it and checkout rejects it as PLAN_NOT_FOUND.
 */
export function isAgentProConfigured(): boolean {
  return getPrimaryPlanPriceId("agent_pro_monthly") != null;
}
