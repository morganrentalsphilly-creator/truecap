/**
 * Pure helpers for the /pricing checkout-resume flow.
 *
 * A cold visitor who clicks a Pro CTA is routed to
 * /auth/sign-up?next=/pricing?checkout=<plan>#plans; when they return
 * authenticated, PricingPlanButtons auto-fires the checkout they started.
 * The encode/decide logic lives here (no imports, no window) so it can be
 * unit-tested without dragging the "use server" billing action into vitest.
 */

export const CHECKOUT_PLAN_SLUGS = ["pro_monthly", "pro_annual"] as const;

export type CheckoutPlanSlug = (typeof CHECKOUT_PLAN_SLUGS)[number];

export function isCheckoutPlanSlug(value: string | null): value is CheckoutPlanSlug {
  return value != null && (CHECKOUT_PLAN_SLUGS as readonly string[]).includes(value);
}

/**
 * The ?next= return path handed to /auth/sign-up: back to the plan cards
 * with the chosen plan encoded (and the campaign coupon preserved) so the
 * purchase continues where it left off.
 */
export function buildCheckoutReturnPath(slot: CheckoutPlanSlug, couponCode: string): string {
  const params = new URLSearchParams({ checkout: slot });
  if (couponCode) params.set("coupon", couponCode);
  return `/pricing?${params.toString()}#plans`;
}

export type CheckoutResume = {
  plan: CheckoutPlanSlug;
  coupon: string | undefined;
  /** location.search with the checkout param removed ("" or "?…"). */
  strippedSearch: string;
};

/**
 * Decide whether a just-mounted, authenticated-free /pricing visit should
 * auto-resume checkout. Returns null (silently) for absent/unknown plan
 * values, and — critically — for returns from an abandoned Stripe session:
 * billing.ts points cancel_url at /pricing?billing=checkout_cancelled#plans,
 * and bouncing that user straight back into Stripe would trap them in a
 * loop. The two params are mutually exclusive by construction, but a stale
 * or hand-edited URL could carry both, so the cancel signal always wins.
 */
export function resolveCheckoutResume(search: string): CheckoutResume | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  const requested = params.get("checkout");
  if (!isCheckoutPlanSlug(requested)) return null;
  if (params.get("billing") === "checkout_cancelled") return null;
  params.delete("checkout");
  const remaining = params.toString();
  return {
    plan: requested,
    coupon: params.get("coupon") ?? undefined,
    strippedSearch: remaining ? `?${remaining}` : "",
  };
}
