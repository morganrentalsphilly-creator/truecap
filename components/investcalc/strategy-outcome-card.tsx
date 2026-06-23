"use client";

/**
 * STRATEGY OUTCOME CARD — the strategy-aware headline for the results.
 *
 * When a non-cash-flow strategy is active (Wholesale, BRRRR, Fix & Flip), the
 * generic "Does not meet buy box / Deal Score" verdict is misleading — a
 * wholesaler offering below ask EXPECTS the asking-price underwrite to be
 * negative. This card replaces that verdict and leads with the number that
 * play actually came for:
 *   - Wholesale → Max Allowable Offer (solved at the same default targets the
 *     Stress Test tab uses, so the headline equals the full solver).
 *   - BRRRR / Fix & Flip → a jump into their model (the profit/cash-left-in
 *     math needs ARV + rehab, which live in the Strategies tab).
 *
 * Pro stays Pro: MAO + BRRRR/Flip are paid, so free users see a clean upsell
 * here instead of being dumped on a paywall tab.
 */

import type { ReactNode } from "react";
import { ArrowUpRight, Hammer, Target, Wrench, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateMaxAllowableOffer, type MaoTarget } from "@/lib/max-allowable-offer";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { InvestorStrategy } from "@/lib/investor-strategies";

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

// Matches the Stress Test tab's default MAO targets so this headline equals
// what the user sees when they open the full solver (max-offer-card.tsx).
const DEFAULT_MAO_TARGET: MaoTarget = { capRate: 8, cocReturn: 8, monthlyCashFlow: 0 };

export function StrategyOutcomeCard({
  strategy,
  values,
  canUseMaxOffer,
  canUseStrategies,
  onJumpToTab,
  onUpgrade,
}: {
  strategy: InvestorStrategy;
  values: InvestmentFormValues;
  canUseMaxOffer: boolean;
  canUseStrategies: boolean;
  onJumpToTab: (tab: "stress-test" | "strategies") => void;
  onUpgrade?: () => void;
}) {
  // ---- Wholesale → Max Allowable Offer ----
  if (strategy.key === "wholesale-mao") {
    if (!canUseMaxOffer) {
      return (
        <OutcomeShell icon={Target} eyebrow="Wholesale / MAO" title="Unlock your max allowable offer">
          <p className="text-sm text-muted-foreground">
            See the highest price you can offer and still hit an 8% cap, 8% cash-on-cash, and
            break-even cash flow — reverse-solved from this address.
          </p>
          {onUpgrade ? (
            <Button onClick={onUpgrade} className="mt-3 rounded-xl">
              Start your 3-day free trial
            </Button>
          ) : null}
        </OutcomeShell>
      );
    }

    const mao = calculateMaxAllowableOffer(values, DEFAULT_MAO_TARGET);
    const asking = typeof values.purchasePrice === "number" ? values.purchasePrice : null;

    if (!mao) {
      return (
        <OutcomeShell icon={Target} eyebrow="Wholesale / MAO" title="Rent's too low for these targets">
          <p className="text-sm text-muted-foreground">
            Even at a low purchase price, {usd(values.monthlyRent ?? 0)}/mo rent doesn&apos;t reach an
            8% cap + 8% cash-on-cash. Raise the rent assumption or loosen the targets in Stress Test.
          </p>
          <JumpButton label="Adjust targets in Stress Test" onClick={() => onJumpToTab("stress-test")} />
        </OutcomeShell>
      );
    }

    const spread = asking != null ? asking - mao.maxPrice : null;
    const spreadPct =
      asking && asking > 0 && spread != null ? Math.round((spread / asking) * 100) : null;

    return (
      <OutcomeShell icon={Target} eyebrow="Wholesale / MAO" title="Max allowable offer">
        <p className="text-4xl sm:text-5xl font-extrabold leading-none text-foreground">
          {usd(mao.maxPrice)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          The most you can pay and still hit an 8% cap, 8% cash-on-cash, and break-even cash flow.
        </p>
        {asking != null ? (
          <p className="mt-1 text-sm font-medium text-foreground">
            {spread != null && spread > 0
              ? `Asking ${usd(asking)} — that's ${usd(spread)}${
                  spreadPct != null ? ` (${spreadPct}%)` : ""
                } above your max. Negotiate down or pass.`
              : `At the ${usd(asking)} ask this already clears your targets.`}
          </p>
        ) : null}
        <JumpButton label="Adjust targets in Stress Test" onClick={() => onJumpToTab("stress-test")} />
      </OutcomeShell>
    );
  }

  // ---- BRRRR / Fix & Flip → the model lives in the Strategies tab ----
  const isFlip = strategy.key === "fix-flip";
  const Icon = isFlip ? Hammer : Wrench;

  if (!canUseStrategies) {
    return (
      <OutcomeShell icon={Icon} eyebrow={strategy.label} title={`Unlock your ${isFlip ? "flip" : "BRRRR"} numbers`}>
        <p className="text-sm text-muted-foreground">
          {isFlip
            ? "Model rehab budget, holding costs, and resale margin to see your projected profit and ROI."
            : "Model the rehab, refinance, and cash left in the deal after you pull your money back out."}
        </p>
        {onUpgrade ? (
          <Button onClick={onUpgrade} className="mt-3 rounded-xl">
            Start your 3-day free trial
          </Button>
        ) : null}
      </OutcomeShell>
    );
  }

  return (
    <OutcomeShell icon={Icon} eyebrow={strategy.label} title={isFlip ? "Your flip model" : "Your BRRRR model"}>
      <p className="text-sm text-muted-foreground">
        {isFlip
          ? "Flips hinge on rehab budget and after-repair value — open the model to enter ARV + rehab and see your projected profit and ROI."
          : "BRRRR hinges on the rehab and refinance — open the model to enter ARV + rehab and see your cash left in after the cash-out."}
      </p>
      <JumpButton label={`Open ${isFlip ? "Flip" : "BRRRR"} analysis`} onClick={() => onJumpToTab("strategies")} />
    </OutcomeShell>
  );
}

function OutcomeShell({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-[var(--brand-blue-light)] p-5 sm:p-6">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
      </div>
      <h2 className="mb-2 text-xl font-extrabold text-foreground sm:text-2xl">{title}</h2>
      {children}
    </div>
  );
}

function JumpButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-2 hover:underline"
    >
      {label} <ArrowUpRight className="size-4" />
    </button>
  );
}
