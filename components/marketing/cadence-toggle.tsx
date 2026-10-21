"use client";

/**
 * The one billing-cadence control for a row of plan cards (the homepage's
 * plans and /pricing): a radiogroup of two 44px segments, the checked one in
 * graphite ink, "Monthly" and "Annual" with a figure-free note ("costs less")
 * while every paid plan on the page costs less paid annually, so the note is
 * true beside each card without naming a saving that belongs to one of them.
 *
 * With it, the one way a paid plan's price is set at a cadence: the per-month
 * figure rolling through AnimatedNumber (annual shows the annual charge
 * divided by twelve, so the two cadences compare on one line) and the note
 * under it with the real charge and the saving to the cent. Every amount is
 * the catalog pair (lib/public-pricing.ts) or Stripe's display price, which
 * is shown only when it equals the catalog amount; nothing here types a
 * price.
 */

import { AnimatedNumber } from "@/components/motion/animated-number";
import { formatPublicUsd } from "@/lib/public-pricing";
import { cn } from "@/lib/utils";

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

/** The per-month figure at a cadence: the monthly price, or the annual charge over twelve months. */
export function PaidPlanPrice({ prices, cadence }: { prices: PaidPlanPrices; cadence: Cadence }) {
  const annualMonthlyEquivalent = prices.annual / 12;
  const value = cadence === "annual" ? annualMonthlyEquivalent : prices.monthly;
  // Two decimals only when the amount has cents ($25 from $300 a year, $29.99
  // month to month), as formatPublicUsd prints them.
  return <AnimatedNumber value={value} kind={Number.isInteger(value) ? "usd" : "usdCents"} />;
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

const SEGMENT =
  "inline-flex min-h-11 items-center gap-1.5 rounded-sm px-4 text-base font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]";

export function CadenceToggle({
  value,
  onChange,
  annualCostsLess: costsLess,
  "aria-label": ariaLabel = "Billing period",
  className,
}: {
  value: Cadence;
  onChange: (cadence: Cadence) => void;
  /** Show "costs less" beside Annual: true only while every paid card on the page saves annually. */
  annualCostsLess: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  const other = value === "monthly" ? "annual" : "monthly";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-md border border-input p-1", className)}
      // A radiogroup moves between its options with the arrow keys, checking
      // the one it lands on; both segments stay in the tab order, so a
      // visitor can also tab to either.
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        onChange(other);
        event.currentTarget.querySelector<HTMLButtonElement>(`[data-cadence="${other}"]`)?.focus();
      }}
    >
      {(["monthly", "annual"] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          data-cadence={option}
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            SEGMENT,
            value === option ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option === "monthly" ? (
            "Monthly"
          ) : (
            <>
              Annual{" "}
              {costsLess ? <span className="text-sm font-semibold">costs less</span> : null}
            </>
          )}
        </button>
      ))}
    </div>
  );
}
