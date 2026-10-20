"use client";

/**
 * The homepage plans with a monthly / annual toggle (OVERHAUL.md §6.5). The
 * prices arrive resolved on the server (Stripe's display price, the public
 * catalog as the documented fallback) as numbers; the island only switches
 * which cadence shows and rolls the figure through NumberFlow. Annual shows
 * the per-month equivalent with the yearly charge under it, so the two
 * cadences compare on one line. The cards' answers and actions are rendered
 * on the server and passed in, so no copy lives here.
 */

import { useId, useState, type ReactNode } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { PlanCard, type PlanCardAnswer } from "@/components/marketing/plan-card";
import { cn } from "@/lib/utils";

export type PaidPlanPrices = {
  /** Dollars per month, month to month. */
  monthly: number;
  /** Dollars per year, billed annually. */
  annual: number;
  /** The formatted labels the page already shows (Stripe's or the catalog's). */
  monthlyLabel: string;
  annualLabel: string;
};

export type PlansToggleProps = {
  freeCard: { audience: string; priceNote: string; answers: PlanCardAnswer[]; action: ReactNode };
  proCard: { name: string; audience: string; answers: PlanCardAnswer[]; action: ReactNode; footnote: ReactNode; prices: PaidPlanPrices };
  agentProCard: { rootProps?: Record<`data-${string}`, string>; audience: string; answers: PlanCardAnswer[]; note: ReactNode; action: ReactNode; prices: PaidPlanPrices } | null;
};

function PaidPrice({ prices, cadence }: { prices: PaidPlanPrices; cadence: "monthly" | "annual" }) {
  const value = cadence === "annual" ? prices.annual / 12 : prices.monthly;
  return <AnimatedNumber value={value} kind={Number.isInteger(value) ? "usd" : "usdCents"} />;
}

function paidNote(prices: PaidPlanPrices, cadence: "monthly" | "annual"): string {
  return cadence === "annual" ? `${prices.annualLabel} billed annually` : `or ${prices.annualLabel} a year`;
}

export function PlansToggle({ freeCard, proCard, agentProCard }: PlansToggleProps) {
  const [cadence, setCadence] = useState<"monthly" | "annual">("annual");
  const id = useId();
  return (
    <>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="mt-8 inline-flex rounded-md border border-input p-1">
        <span id={`${id}-label`} className="sr-only">
          Billing cadence
        </span>
        {(["monthly", "annual"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={cadence === option}
            onClick={() => setCadence(option)}
            className={cn(
              "min-h-11 rounded-[6px] px-4 py-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)]",
              cadence === option ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option === "monthly" ? "Monthly" : "Annual · 2 months free"}
          </button>
        ))}
      </div>
      <div className={cn("mt-6 grid gap-4 sm:gap-5", agentProCard ? "md:grid-cols-3" : "md:grid-cols-2 lg:max-w-4xl")}>
        <PlanCard
          name="Free"
          audience={freeCard.audience}
          price="$0"
          priceNote={freeCard.priceNote}
          answers={freeCard.answers}
          action={freeCard.action}
        />
        <PlanCard
          name={proCard.name}
          audience={proCard.audience}
          price={<PaidPrice prices={proCard.prices} cadence={cadence} />}
          period="/mo"
          priceNote={paidNote(proCard.prices, cadence)}
          answers={proCard.answers}
          action={proCard.action}
          footnote={proCard.footnote}
        />
        {agentProCard ? (
          <PlanCard
            {...agentProCard.rootProps}
            name="Agent Pro"
            audience={agentProCard.audience}
            price={<PaidPrice prices={agentProCard.prices} cadence={cadence} />}
            period="/mo"
            priceNote={paidNote(agentProCard.prices, cadence)}
            answers={agentProCard.answers}
            note={agentProCard.note}
            action={agentProCard.action}
          />
        ) : null}
      </div>
    </>
  );
}
