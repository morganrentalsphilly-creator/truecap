"use client";

/**
 * The homepage plans under the billing-cadence toggle (OVERHAUL.md §6.5). The
 * prices arrive resolved on the server (Stripe's display price, the public
 * catalog as the documented fallback) as numbers; the island only switches
 * which cadence shows. The toggle, the rolling per-month figure and the note
 * under it are the shared parts in components/marketing/cadence-toggle.tsx,
 * the same ones /pricing uses, so the two pages set a price one way. The
 * cards' answers and actions are rendered on the server and passed in, so no
 * copy lives here.
 */

import { useState, type ReactNode } from "react";
import {
  annualSavingFloorPct,
  paidPriceDisplay,
  CadenceToggle,
  PaidPlanPrice,
  paidPriceNote,
  type Cadence,
  type PaidPlanPrices,
} from "@/components/marketing/cadence-toggle";
import { PlanCard, type PlanCardAnswer } from "@/components/marketing/plan-card";
import { cn } from "@/lib/utils";

export type { PaidPlanPrices };

export type PlansToggleProps = {
  freeCard: { audience: string; priceNote: string; answers: PlanCardAnswer[]; action: ReactNode };
  proCard: { name: string; audience: string; answers: PlanCardAnswer[]; action: ReactNode; footnote: ReactNode; prices: PaidPlanPrices };
  agentProCard: { rootProps?: Record<`data-${string}`, string>; audience: string; answers: PlanCardAnswer[]; note: ReactNode; action: ReactNode; prices: PaidPlanPrices } | null;
};

export function PlansToggle({ freeCard, proCard, agentProCard }: PlansToggleProps) {
  const [cadence, setCadence] = useState<Cadence>("annual");
  const paidPlans = agentProCard ? [proCard.prices, agentProCard.prices] : [proCard.prices];
  return (
    <>
      <CadenceToggle
        className="mt-8"
        value={cadence}
        onChange={setCadence}
        annualSavingPct={annualSavingFloorPct(paidPlans)}
      />
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
          price={<PaidPlanPrice prices={proCard.prices} cadence={cadence} />}
          period={paidPriceDisplay(proCard.prices, cadence).period}
          priceNote={<span className="font-figure">{paidPriceNote(proCard.prices, cadence)}</span>}
          answers={proCard.answers}
          action={proCard.action}
          footnote={proCard.footnote}
        />
        {agentProCard ? (
          <PlanCard
            {...agentProCard.rootProps}
            name="Agent Pro"
            audience={agentProCard.audience}
            price={<PaidPlanPrice prices={agentProCard.prices} cadence={cadence} />}
            period={paidPriceDisplay(agentProCard.prices, cadence).period}
            priceNote={<span className="font-figure">{paidPriceNote(agentProCard.prices, cadence)}</span>}
            answers={agentProCard.answers}
            note={agentProCard.note}
            action={agentProCard.action}
          />
        ) : null}
      </div>
    </>
  );
}
