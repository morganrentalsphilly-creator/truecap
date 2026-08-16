"use client";

/**
 * STRATEGY OUTCOME CARD - the strategy-aware headline for the results.
 *
 * When a non-cash-flow strategy is active (Wholesale, BRRRR, Fix & Flip), the
 * generic "Does not meet buy box / Deal Score" verdict is misleading - a
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

import { TRIAL_LABEL } from "@/lib/trial";
import type { ReactNode } from "react";
import { ArrowUpRight, Hammer, Target, Wrench, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateMaxAllowableOffer } from "@/lib/max-allowable-offer";
import { buildMaoTarget, describeMaoTarget } from "@/lib/mao-targets";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import type { InvestorStrategy } from "@/lib/investor-strategies";
import { BrrrrCard } from "@/components/investcalc/brrrr-card";
import { FixFlipCard } from "@/components/investcalc/fix-flip-card";

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

// MAO target basis comes from lib/mao-targets (CONFLICT #6): the same
// break-even-cash-flow + DSCR-1.25 default the deal workspace and the Stress
// Test tab's initial inputs use, so every "your max offer" number in the app
// solves against ONE labeled basis.

export function StrategyOutcomeCard({
  strategy,
  values,
  result,
  canUseMaxOffer,
  canUseStrategies,
  onJumpToTab,
  onUpgrade,
}: {
  strategy: InvestorStrategy;
  values: InvestmentFormValues;
  result: AnalysisResult | null;
  canUseMaxOffer: boolean;
  canUseStrategies: boolean;
  onJumpToTab: (tab: "stress-test" | "strategies") => void;
  onUpgrade?: () => void;
}) {
  // ---- Wholesale → Max Allowable Offer ----
  if (strategy.key === "wholesale-mao") {
    // Cash purchases omit the DSCR target (calc-analysis returns dscr 0 with
    // no debt service, so a DSCR floor could never pass). Same call-site rule
    // as the deal workspace; the solver itself is untouched.
    const isCashPurchase =
      result != null
        ? result.monthlyPayment <= 0
        : (() => {
            try {
              return calculateAnalysis(values).monthlyPayment <= 0;
            } catch {
              return false;
            }
          })();
    const maoTarget = buildMaoTarget(null, { isCashPurchase });
    const targetsLabel = describeMaoTarget(maoTarget);

    if (!canUseMaxOffer) {
      return (
        <OutcomeShell icon={Target} eyebrow="Wholesale / MAO" title="Unlock your max allowable offer">
          <p className="text-sm text-muted-foreground">
            See the highest price you can offer and still hit {targetsLabel} - reverse-solved from
            this address.
          </p>
          {onUpgrade ? (
            <Button onClick={onUpgrade} className="mt-3 rounded-xl">
              Start your {TRIAL_LABEL}
            </Button>
          ) : null}
        </OutcomeShell>
      );
    }

    const mao = calculateMaxAllowableOffer(values, maoTarget);
    const asking = typeof values.purchasePrice === "number" ? values.purchasePrice : null;

    if (!mao) {
      return (
        <OutcomeShell icon={Target} eyebrow="Wholesale / MAO" title="Rent's too low for these targets">
          <p className="text-sm text-muted-foreground">
            Even at a low purchase price, {usd(values.monthlyRent ?? 0)}/mo rent doesn&apos;t reach{" "}
            {targetsLabel}. Raise the rent assumption or loosen the targets in Stress Test.
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
          The most you can pay and still hit your targets — {targetsLabel}.
        </p>
        {asking != null ? (
          <div className="mt-4 rounded-xl border border-border bg-card/70 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Asking price</span>
              <span className="font-semibold tabular-nums text-foreground">{usd(asking)}</span>
            </div>
            <div className="relative my-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                style={{
                  width: `${Math.max(4, Math.min(100, asking > 0 ? (mao.maxPrice / asking) * 100 : 100))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold tabular-nums text-primary">Your max {usd(mao.maxPrice)}</span>
              {spread != null && spread > 0 ? (
                <span className="font-medium text-muted-foreground">
                  {usd(spread)}
                  {spreadPct != null ? ` (${spreadPct}%)` : ""} below ask
                </span>
              ) : (
                <span className="font-medium text-[var(--brand-green)]">Clears your targets</span>
              )}
            </div>
            <p className="mt-2 text-xs leading-snug text-muted-foreground">
              {spread != null && spread > 0
                ? "Offer at or below your max - negotiate down or pass."
                : "At the asking price this already hits your return targets."}
            </p>
          </div>
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
            Start your {TRIAL_LABEL}
          </Button>
        ) : null}
      </OutcomeShell>
    );
  }

  // Pro: lead with the real interactive model so the play shows its actual
  // numbers (rehab/ARV → profit / cash-left-in), just like Wholesale's MAO.
  return isFlip ? (
    <FixFlipCard values={values} result={result} />
  ) : (
    <BrrrrCard values={values} result={result} />
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
