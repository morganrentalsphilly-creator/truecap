/**
 * The OTHER billing period's figure for a paid plan on /pricing, shown on
 * phones beside the one already on screen.
 *
 * Why (audit row P2-40): the hero's stage chooser quotes the monthly price
 * ("Agent Pro $59.99 /month") while the plan cards open on Annual ("$49.17
 * /month, billed annually ($590)"). From 768px the Monthly/Annual toggle sits
 * right above the card row and explains the difference. Below that the cards
 * stack, the Agent Pro card is the third one down and the toggle was 1,592px
 * above it, so a visitor read two different figures for one plan with nothing
 * in view to say why. Each place now carries the other period's figure under
 * its own, on phones only: the chooser adds the annual one, each paid card
 * adds whichever period the toggle is not on.
 *
 * Nothing here is an amount, a default or a checkout target. Every figure is
 * the Stripe display price the page already loaded, else the catalog fallback
 * the caller passes from lib/public-pricing.ts, read exactly as the cards
 * read them: monthly is "$X /month, billed monthly"; annual is the effective
 * monthly figure with the real charge beside it, "$Y /month, billed annually
 * ($Z)". The cards keep their own expressions for the figure they show
 * (pricing-toggle-plans.tsx); lib/__tests__/pricing-other-period.test.tsx
 * renders the cards in every period and price-source state and fails if the
 * two ever read differently.
 *
 * No "use client": the page (a server component) and the toggle (a client
 * component) both import it.
 */

import { LedgerFigure } from "@/components/ledger/ledger-parts";
import { formatPublicUsd } from "@/lib/public-pricing";
import { cn } from "@/lib/utils";

/** A Stripe display price as the pricing surfaces receive it, or null. */
export type PlanDisplayPrice = { amountLabel: string; period: string } | null;

export type PlanPeriodFigures = {
  /** The headline figure: the monthly price, or annual's monthly equivalent. */
  priceTop: string;
  /** "/month". */
  priceSub: string;
  /** "billed monthly", or "billed annually" with the annual charge. */
  subline: string;
};

function displayAmount(price: PlanDisplayPrice): number | null {
  if (!price) return null;
  const match = price.amountLabel.match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

/**
 * A paid plan's figures for both periods. A Stripe read that failed this
 * request falls back to the catalog amount for THAT period, never to the
 * other period's price.
 */
export function paidPlanFigures(
  monthly: PlanDisplayPrice,
  annual: PlanDisplayPrice,
  catalog: { monthlyUsd: number; annualUsd: number },
): { monthly: PlanPeriodFigures; annual: PlanPeriodFigures } {
  const annualAmount = displayAmount(annual);
  const annualMonthlyEquivalent = annualAmount != null ? annualAmount / 12 : null;
  return {
    monthly: {
      priceTop: monthly?.amountLabel ?? formatPublicUsd(catalog.monthlyUsd),
      priceSub: `/${monthly?.period ?? "month"}`,
      subline: "billed monthly",
    },
    annual: {
      priceTop:
        annualMonthlyEquivalent != null
          ? `$${annualMonthlyEquivalent.toFixed(annualMonthlyEquivalent % 1 === 0 ? 0 : 2)}`
          : formatPublicUsd(catalog.annualUsd / 12),
      priceSub: "/month",
      subline: `billed annually (${annual?.amountLabel ?? formatPublicUsd(catalog.annualUsd)})`,
    },
  };
}

/**
 * One line under the figure already shown: "or", the other period's figure
 * in DM Mono (it is compared with the price above it), its period and its
 * billing term. Phones only: hidden from 768px, where the cards share a row
 * and the toggle that switches them sits right above it.
 */
export function OtherPeriodLine({
  figures,
  className,
}: {
  figures: PlanPeriodFigures;
  className?: string;
}) {
  return (
    <span data-pricing-other-period="" className={cn("block md:hidden", className)}>
      or <LedgerFigure>{figures.priceTop}</LedgerFigure>
      {figures.priceSub} {figures.subline}
    </span>
  );
}
