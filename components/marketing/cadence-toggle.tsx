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
 * divided by twelve, so the two cadences compare on one line); the note under
 * it and the parsing live in cadence-pricing.ts, a plain module a server
 * component may call. Every amount is the catalog pair (lib/public-pricing.ts)
 * or Stripe's display price; nothing here types a price.
 */

import { AnimatedNumber } from "@/components/motion/animated-number";
import type { Cadence, PaidPlanPrices } from "@/components/marketing/cadence-pricing";
import { cn } from "@/lib/utils";

export {
  annualCostsLess,
  annualSavingUsd,
  paidChargeToday,
  paidPriceNote,
  parsePriceLabel,
  type Cadence,
  type PaidPlanPrices,
} from "@/components/marketing/cadence-pricing";

/** The per-month figure at a cadence: the monthly price, or the annual charge over twelve months. */
export function PaidPlanPrice({ prices, cadence }: { prices: PaidPlanPrices; cadence: Cadence }) {
  const annualMonthlyEquivalent = prices.annual / 12;
  const value = cadence === "annual" ? annualMonthlyEquivalent : prices.monthly;
  // Two decimals only when the amount has cents ($25 from $300 a year, $29.99
  // month to month), as formatPublicUsd prints them.
  return <AnimatedNumber value={value} kind={Number.isInteger(value) ? "usd" : "usdCents"} />;
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
