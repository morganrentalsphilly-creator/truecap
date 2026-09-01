"use client";

/**
 * STRATEGY OUTCOME CARD - the strategy-aware headline for the results.
 *
 * When a non-cash-flow strategy is active (Wholesale, BRRRR, Fix & Flip), the
 * generic "Does not meet buy box / Screening Index" verdict is misleading - a
 * wholesaler offering below ask EXPECTS the asking-price underwrite to be
 * negative. This card replaces that verdict and leads with the number that
 * play actually came for:
 *   - Wholesale → Offer Ceiling (solved from the dashboard's exact
 *     active targets, with an inline editor that updates every other surface).
 *   - BRRRR / Fix & Flip → a jump into their model (the profit/cash-left-in
 *     math needs ARV + rehab, which live in the Strategies tab).
 *
 * Pro stays Pro: Offer Ceiling + BRRRR/Flip are paid, so free users see a clean upsell
 * here instead of being dumped on a paywall tab.
 */

import { useMemo, type ReactNode } from "react";
import {
  Hammer,
  Target,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import type { OfferCeilingExactResult } from "@/lib/offer-ceiling-access-contract";
import { describeMaoTarget } from "@/lib/mao-targets";
import type {
  InvestmentFormValues,
  StrategyInputErrors,
  StrategyInputField,
  StrategyInputs,
} from "@/lib/investcalc-schema";
import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import type { InvestorStrategy } from "@/lib/investor-strategies";
import { BrrrrCard } from "@/components/investcalc/brrrr-card";
import { FixFlipCard } from "@/components/investcalc/fix-flip-card";
import {
  RecordedSpecialistAnalysisCard,
  type RecordedSpecialistAnalysisState,
} from "@/components/investcalc/recorded-specialist-analysis-card";
import { isSpecialistStrategyEnabled } from "@/lib/feature-flags";

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

// The dashboard owns the active Offer Ceiling target. Wholesale reads that
// same object, while criteria edits return to the analyzer's authoritative
// pre-run editor so Save/Share/PDF cannot drift onto a second set of criteria.

export function StrategyOutcomeCard({
  strategy,
  values,
  result,
  canUseMaxOffer,
  canUseStrategies,
  activeMaoTarget,
  offerCeiling,
  isOfferCeilingLoading,
  hasExactOfferCeilingAccess,
  offerCeilingError,
  offerCeilingErrorCode = null,
  onTuneTargetsOpened,
  onReviewCriteria,
  onUpgrade,
  strategyInputs,
  strategyInputErrors,
  onStrategyInputChange,
  recordedSpecialistAnalysis = null,
}: {
  strategy: InvestorStrategy;
  values: InvestmentFormValues;
  result: AnalysisResult | null;
  canUseMaxOffer: boolean;
  canUseStrategies: boolean;
  activeMaoTarget: MaoTarget | null;
  offerCeiling: OfferCeilingExactResult | null;
  isOfferCeilingLoading: boolean;
  hasExactOfferCeilingAccess: boolean;
  offerCeilingError: boolean;
  /** RATE_LIMITED renders wait copy instead of retry advice. */
  offerCeilingErrorCode?:
    | "VALIDATION_ERROR"
    | "RATE_LIMITED"
    | "SERVER_ERROR"
    | "NETWORK"
    | null;
  onMaoTargetChange: (target: MaoTarget) => void;
  onTuneTargetsOpened?: () => void;
  onReviewCriteria?: () => void;
  onUpgrade?: () => void;
  strategyInputs?: Partial<StrategyInputs>;
  strategyInputErrors?: StrategyInputErrors;
  onStrategyInputChange?: (
    field: StrategyInputField,
    value: number | undefined,
  ) => void;
  /** Frozen state restored with a recorded saved analysis. Null means this is
   * a live/current result and the interactive cards may calculate normally. */
  recordedSpecialistAnalysis?: RecordedSpecialistAnalysisState;
}) {
  // ---- Wholesale → Offer Ceiling ----
  if (strategy.key === "wholesale-mao") {
    if (offerCeilingError && canUseMaxOffer) {
      return (
        <OutcomeShell
          icon={Target}
          eyebrow="Wholesale / Offer Ceiling"
          title={
            offerCeilingErrorCode === "RATE_LIMITED"
              ? "Hourly ceiling limit reached"
              : "Offer Ceiling temporarily unavailable"
          }
        >
          <p role="alert" className="text-sm text-muted-foreground">
            {offerCeilingErrorCode === "RATE_LIMITED"
              ? "You've reached the hourly limit for exact ceiling solves. It resets on its own — running the analysis again right now won't help, and the rest of your analysis is unaffected."
              : "The secure calculation could not be reached. Review the criteria and run the analysis again."}
          </p>
          <ReviewTargetCriteriaButton
            onOpened={onTuneTargetsOpened}
            onReviewCriteria={onReviewCriteria}
          />
        </OutcomeShell>
      );
    }
    if (!canUseMaxOffer) {
      return (
        <OutcomeShell
          icon={Target}
          eyebrow="Wholesale / Offer Ceiling"
          title="Unlock the Offer Ceiling"
        >
          <p className="text-sm text-muted-foreground">
            Set the return criteria that matter to you, then reverse-solve the
            highest price that clears all of them. The deal-specific ceiling
            stays locked until you choose Pro or a Pro PDF report.
          </p>
          {onUpgrade ? (
            <Button onClick={onUpgrade} className="mt-3 rounded-xl">
              Compare Pro plans
            </Button>
          ) : null}
        </OutcomeShell>
      );
    }
    if (!activeMaoTarget) {
      return (
        <OutcomeShell
          icon={Target}
          eyebrow="Wholesale / Offer Ceiling"
          title="Choose your Offer Ceiling criteria"
        >
          <p className="text-sm text-muted-foreground">
            Your Pro access is active. Choose at least one return criterion in
            the analysis before TrueCap calculates a modeled price threshold.
          </p>
          <ReviewTargetCriteriaButton
            onOpened={onTuneTargetsOpened}
            onReviewCriteria={onReviewCriteria}
          />
        </OutcomeShell>
      );
    }
    if (isOfferCeilingLoading) {
      return (
        <OutcomeShell
          icon={Target}
          eyebrow="Wholesale / Offer Ceiling"
          title="Calculating the Offer Ceiling"
        >
          <p role="status" className="text-sm text-muted-foreground">
            Checking access and solving the criteria attached to this analysis…
          </p>
        </OutcomeShell>
      );
    }
    if (!hasExactOfferCeilingAccess) {
      return (
        <OutcomeShell
          icon={Target}
          eyebrow="Wholesale / Offer Ceiling"
          title="Offer Ceiling unavailable"
        >
          <p role="status" className="text-sm text-muted-foreground">
            TrueCap could not verify exact Offer Ceiling access for this
            result. Review the criteria and run the analysis again; your
            existing Pro plan remains unchanged.
          </p>
          <ReviewTargetCriteriaButton
            onOpened={onTuneTargetsOpened}
            onReviewCriteria={onReviewCriteria}
          />
        </OutcomeShell>
      );
    }
    return (
      <WholesaleOutcome
        values={values}
        result={result}
        activeMaoTarget={activeMaoTarget}
        offerCeiling={offerCeiling}
        onTuneTargetsOpened={onTuneTargetsOpened}
        onReviewCriteria={onReviewCriteria}
      />
    );
  }

  // ---- BRRRR / Fix & Flip → the model lives in the Strategies tab ----
  if (!isSpecialistStrategyEnabled(strategy.key)) return null;
  const isFlip = strategy.key === "fix-flip";
  const Icon = isFlip ? Hammer : Wrench;

  if (!canUseStrategies) {
    return (
      <OutcomeShell
        icon={Icon}
        eyebrow={strategy.label}
        title={`Unlock your ${isFlip ? "flip" : "BRRRR"} numbers`}
      >
        <p className="text-sm text-muted-foreground">
          {isFlip
            ? "Model rehab budget, holding costs, and resale margin to see your projected profit and ROI."
            : "Model the rehab, refinance, and cash left in the deal after you pull your money back out."}
        </p>
        {onUpgrade ? (
          <Button onClick={onUpgrade} className="mt-3 rounded-xl">
            Compare Pro plans
          </Button>
        ) : null}
      </OutcomeShell>
    );
  }

  if (recordedSpecialistAnalysis) {
    return (
      <RecordedSpecialistAnalysisCard
        state={recordedSpecialistAnalysis}
        strategyKey={strategy.key}
      />
    );
  }

  // Pro: lead with the real interactive model so the play shows its actual
  // numbers (rehab/ARV → profit / cash-left-in), just like Wholesale's Offer Ceiling.
  return isFlip ? (
    <FixFlipCard
      values={values}
      result={result}
      defaultRehab={strategyInputs?.rehabBudget}
      strategyInputs={strategyInputs}
      strategyInputErrors={strategyInputErrors}
      onStrategyInputChange={onStrategyInputChange}
    />
  ) : (
    <BrrrrCard
      values={values}
      result={result}
      defaultRehab={strategyInputs?.rehabBudget}
      strategyInputs={strategyInputs}
      strategyInputErrors={strategyInputErrors}
      onStrategyInputChange={onStrategyInputChange}
    />
  );
}

function WholesaleOutcome({
  values,
  result,
  activeMaoTarget,
  offerCeiling,
  onTuneTargetsOpened,
  onReviewCriteria,
}: {
  values: InvestmentFormValues;
  result: AnalysisResult | null;
  activeMaoTarget: MaoTarget;
  offerCeiling: OfferCeilingExactResult | null;
  onTuneTargetsOpened?: () => void;
  onReviewCriteria?: () => void;
}) {
  const isCashPurchase = useMemo(() => {
    if (result) return result.monthlyPayment <= 0;
    try {
      return calculateAnalysis(values).monthlyPayment <= 0;
    } catch {
      return false;
    }
  }, [result, values]);

  // The parent target is authoritative. Cash deals omit DSCR, but this card
  // never invents a second/default target if that leaves the set empty.
  const maoTarget = useMemo(() => {
    const target = { ...activeMaoTarget };
    if (isCashPurchase) delete target.dscr;
    return target;
  }, [activeMaoTarget, isCashPurchase]);
  const hasTarget = Object.values(maoTarget).some(
    (value) => value !== undefined,
  );
  const targetsLabel = describeMaoTarget(maoTarget);
  const asking =
    typeof values.purchasePrice === "number" ? values.purchasePrice : null;

  if (!hasTarget) {
    return (
      <OutcomeShell
        icon={Target}
        eyebrow="Wholesale / Offer Ceiling"
        title="Set Offer Ceiling rules"
      >
        <p className="text-sm text-muted-foreground">
          Add at least one return criterion. TrueCap will then calculate the
          highest price that clears it using this deal&apos;s assumptions.
        </p>
        <ReviewTargetCriteriaButton
          onOpened={onTuneTargetsOpened}
          onReviewCriteria={onReviewCriteria}
        />
      </OutcomeShell>
    );
  }

  if (!offerCeiling) {
    return (
      <OutcomeShell
        icon={Target}
        eyebrow="Wholesale / Offer Ceiling"
        title="No price meets these rules"
      >
        <p className="text-sm text-muted-foreground">
          Even at the solver&apos;s lowest supported price,{" "}
          {usd(values.monthlyRent ?? 0)}/mo rent does not clear every selected
          criterion: {targetsLabel}. Verify the rent assumption or tune the
          criteria.
        </p>
        <ReviewTargetCriteriaButton
          onOpened={onTuneTargetsOpened}
          onReviewCriteria={onReviewCriteria}
        />
      </OutcomeShell>
    );
  }

  const maxPrice = offerCeiling.presentation.ceiling;
  const spread = asking != null ? asking - maxPrice : null;
  const spreadPct =
    asking && asking > 0 && spread != null
      ? Math.round((spread / asking) * 100)
      : null;

  return (
    <OutcomeShell
      icon={Target}
      eyebrow="Wholesale / Offer Ceiling"
      title="Offer Ceiling"
    >
      <p
        aria-live="polite"
        aria-atomic="true"
        className="text-4xl font-extrabold leading-none text-foreground sm:text-5xl"
      >
        {usd(maxPrice)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Criteria: {targetsLabel}.
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Highest modeled price that still meets the selected wholesale rules
        under the assumptions shown. This is not a recommended offer or an
        appraisal.
      </p>
      {asking != null ? (
        <div className="mt-4 rounded-xl border border-border bg-card/70 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Asking price</span>
            <span className="font-semibold tabular-nums text-foreground">
              {usd(asking)}
            </span>
          </div>
          <div className="relative my-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{
                width: `${Math.max(4, Math.min(100, asking > 0 ? (maxPrice / asking) * 100 : 100))}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-bold tabular-nums text-primary">
              Offer Ceiling {usd(maxPrice)}
            </span>
            {spread != null && spread > 0 ? (
              <span className="text-right font-medium text-muted-foreground">
                {usd(spread)}
                {spreadPct != null ? ` (${spreadPct}%)` : ""} below ask
              </span>
            ) : (
              <span className="text-right font-medium text-[var(--brand-green)]">
                Clears your targets
              </span>
            )}
          </div>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">
            {spread != null && spread > 0
              ? "The asking price exceeds the modeled ceiling. Review the gap and unresolved assumptions."
              : "At asking, the modeled economics meet the selected return rules."}
          </p>
        </div>
      ) : null}
      <ReviewTargetCriteriaButton
        onOpened={onTuneTargetsOpened}
        onReviewCriteria={onReviewCriteria}
      />
    </OutcomeShell>
  );
}

function ReviewTargetCriteriaButton({
  onOpened,
  onReviewCriteria,
}: {
  onOpened?: () => void;
  onReviewCriteria?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        onOpened?.();
        if (onReviewCriteria) {
          onReviewCriteria();
          return;
        }
        const trigger = document.getElementById(
          "offer-ceiling-criteria-trigger",
        ) as HTMLButtonElement | null;
        if (trigger?.getAttribute("aria-expanded") !== "true") {
          trigger?.click();
        }
        trigger?.focus({ preventScroll: true });
        trigger?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
      className="mt-4 min-h-11 rounded-xl"
    >
      Review criteria
    </Button>
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
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {eyebrow}
        </p>
      </div>
      <h2 className="mb-2 text-xl font-extrabold text-foreground sm:text-2xl">
        {title}
      </h2>
      {children}
    </div>
  );
}
