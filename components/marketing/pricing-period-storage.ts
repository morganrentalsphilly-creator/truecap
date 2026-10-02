/**
 * The billing period a visitor picked on /pricing, kept for the tab's session.
 *
 * The Monthly/Annual toggle is React state that starts on its default, and
 * /pricing is served no-store, so every return to the page rendered it again
 * on Annual: Back from sign-up kept the scroll position and silently moved
 * the cards from the monthly prices the visitor had chosen to the annual
 * ones (measured, 8 of 8 runs); by the code, the return from Stripe's cancel
 * link did the same. The choice is now written here when the visitor presses
 * a segment and read back on mount
 * (components/marketing/pricing-toggle-plans.tsx).
 *
 * sessionStorage, not the URL: /pricing's query string already carries
 * ?billing=checkout_cancelled and ?checkout=<plan>, and the canonical URL
 * stays clean. It is a display preference only. It holds one of two words,
 * is never sent anywhere, changes no amount and selects nothing at checkout
 * beyond what the pressed segment already shows on the cards.
 *
 * Every access is wrapped: a browser that blocks storage keeps today's
 * behavior (the default period) and nothing throws.
 */

export type BillingPeriod = "monthly" | "annual";

export const PRICING_PERIOD_STORAGE_KEY = "truecap:pricing-billing-period:v1";

type PeriodStorage = Pick<Storage, "getItem" | "setItem">;

/** The tab's sessionStorage, or null on the server or when it is blocked. */
export function browserSessionStorage(): PeriodStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** The period the visitor last pressed in this tab, or null. */
export function readStoredBillingPeriod(
  storage: PeriodStorage | null | undefined,
): BillingPeriod | null {
  try {
    const value = storage?.getItem(PRICING_PERIOD_STORAGE_KEY);
    return value === "monthly" || value === "annual" ? value : null;
  } catch {
    return null;
  }
}

export function storeBillingPeriod(
  storage: PeriodStorage | null | undefined,
  period: BillingPeriod,
): void {
  try {
    storage?.setItem(PRICING_PERIOD_STORAGE_KEY, period);
  } catch {
    // Storage full or blocked: the toggle still works for this page view.
  }
}
