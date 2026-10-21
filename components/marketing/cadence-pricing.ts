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

/** A Stripe display price as the page receives it; null when it did not resolve. */
export type ResolvedDisplayPrice = { amountLabel: string } | null | undefined;

/**
 * A paid plan's two prices: Stripe's display price, else the catalog
 * fallback, so a card follows its toggle even when Stripe's read failed.
 */
export function planPrices(
  monthly: ResolvedDisplayPrice,
  annual: ResolvedDisplayPrice,
  catalog: { monthly: number; annual: number },
): PaidPlanPrices {
  return {
    monthly: parsePriceLabel(monthly?.amountLabel) ?? catalog.monthly,
    annual: parsePriceLabel(annual?.amountLabel) ?? catalog.annual,
    monthlyLabel: monthly?.amountLabel ?? formatPublicUsd(catalog.monthly),
    annualLabel: annual?.amountLabel ?? formatPublicUsd(catalog.annual),
  };
}

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
 * The saving the cadence toggle names beside "Annual" (founder decision
 * 2026-10-21, audit A13, benchmarks P10): the whole percent that EVERY paid
 * plan on the page saves at least, from each plan's own two prices, so the
 * figure is true beside each card (Pro saves 16.6%, Agent Pro 18.0%: "16%+").
 * Null when any plan saves nothing.
 */
export function annualSavingFloorPct(
  plans: readonly Pick<PaidPlanPrices, "monthly" | "annual">[],
): number | null {
  if (!annualCostsLess(plans)) return null;
  const least = Math.min(...plans.map((p) => (1 - p.annual / (p.monthly * 12)) * 100));
  const floor = Math.floor(least);
  return floor > 0 ? floor : null;
}

/**
 * The figure a paid card shows at a cadence (founder decision 2026-10-21,
 * audit A13): the monthly price; on annual, the per-month equivalent when it
 * is whole dollars ($300 a year is $25/mo), else the annual charge itself
 * ($590/yr): never a cents figure ($49.17/mo) that no one is charged.
 */
export function paidPriceDisplay(
  prices: Pick<PaidPlanPrices, "monthly" | "annual">,
  cadence: Cadence,
): { value: number; period: "/mo" | "/yr" } {
  if (cadence === "monthly") return { value: prices.monthly, period: "/mo" };
  const perMonth = prices.annual / 12;
  return Number.isInteger(perMonth)
    ? { value: perMonth, period: "/mo" }
    : { value: prices.annual, period: "/yr" };
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
  // When the figure above is the annual charge, the note does not repeat it.
  const charge =
    paidPriceDisplay(prices, cadence).period === "/yr"
      ? "billed annually"
      : `billed annually (${prices.annualLabel})`;
  return saving > 0 ? `${charge} · Save ${formatPublicUsd(saving)}/yr` : charge;
}

/** The amount checkout charges today at a cadence, as the page shows it. */
export function paidChargeToday(prices: PaidPlanPrices, cadence: Cadence): string {
  return cadence === "annual" ? prices.annualLabel : prices.monthlyLabel;
}
