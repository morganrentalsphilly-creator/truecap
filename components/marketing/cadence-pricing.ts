/**
 * The billing-cadence arithmetic the plan cards share (the homepage's plans
 * and /pricing), kept apart from the toggle component so a server component
 * can call it: a "use client" module's exports are client references on the
 * server, and the homepage computes its paid plans' prices on the server.
 * Every amount is the catalog pair (lib/public-pricing.ts) or Stripe's
 * display price; nothing here types a price.
 */

import { formatPublicUsd } from "@/lib/public-pricing";

export type Cadence = "monthly" | "annual";

export type PaidPlanPrices = {
  /** Dollars per month, month to month. */
  monthly: number;
  /** Dollars per year, billed annually. */
  annual: number;
  /** The formatted labels the page already shows (Stripe's or the catalog's). */
  monthlyLabel: string;
  annualLabel: string;
};

/** A Stripe display label ("$29.99") as a number; null when it is not a plain amount. */
export function parsePriceLabel(label: string | null | undefined): number | null {
  if (!label) return null;
  const n = Number(label.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** What a year on the annual price saves over twelve monthly charges, to the cent. */
export function annualSavingUsd(prices: Pick<PaidPlanPrices, "monthly" | "annual">): number {
  return Math.max(0, Math.round((prices.monthly * 12 - prices.annual) * 100) / 100);
}

/** True while every paid plan given costs less paid annually: the toggle's note may show. */
export function annualCostsLess(plans: readonly Pick<PaidPlanPrices, "monthly" | "annual">[]): boolean {
  return plans.length > 0 && plans.every((plan) => annualSavingUsd(plan) > 0);
}

/**
 * The line under the price: the real charge and, on annual, the saving to
 * the cent from the plan's own two prices ("billed annually ($300) · Save
 * $59.88/yr"). Plain text: its figures arrive with the cadence rather than
 * change value, so they are set as figures, not rolled.
 */
export function paidPriceNote(prices: PaidPlanPrices, cadence: Cadence): string {
  if (cadence === "monthly") return "billed monthly";
  const saving = annualSavingUsd(prices);
  const charge = `billed annually (${prices.annualLabel})`;
  return saving > 0 ? `${charge} · Save ${formatPublicUsd(saving)}/yr` : charge;
}

/** The amount checkout charges today at a cadence, as the page shows it. */
export function paidChargeToday(prices: PaidPlanPrices, cadence: Cadence): string {
  return cadence === "annual" ? prices.annualLabel : prices.monthlyLabel;
}
