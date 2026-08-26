/**
 * Public catalog fallbacks used only when Stripe cannot resolve a display
 * price for the current request. Stripe Price IDs and live subscription data
 * remain authoritative for checkout, entitlements, and customer billing.
 *
 * Keep these values aligned with the published catalog and update them only as
 * part of an approved pricing release. They never reprice an existing customer.
 */
export const PUBLIC_PRO_MONTHLY_USD = 29.99;
export const PUBLIC_PRO_ANNUAL_USD = 300;

export function formatPublicUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
