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

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Hammer, SlidersHorizontal, Target, Wrench, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import type { OfferCeilingExactResult } from "@/lib/offer-ceiling-access-contract";
import { describeMaoTarget } from "@/lib/mao-targets";
import {
  applyMaoTargetInput,
  EMPTY_MAO_TARGET_ERROR,
  MAO_TARGET_BOUNDS,
  type MaoTargetField,
} from "@/lib/mao-target-editor";
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

// The dashboard owns the active Offer Ceiling target. Wholesale consumes and edits that
// same object so its headline, Save/Share/PDF, and every other price-ceiling
// surface cannot drift onto a second set of criteria.

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
  onMaoTargetChange,
  onTuneTargetsOpened,
  onUpgrade,
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
  onMaoTargetChange: (target: MaoTarget) => void;
  onTuneTargetsOpened?: () => void;
  onUpgrade?: () => void;
}) {
  // ---- Wholesale → Offer Ceiling ----
  if (strategy.key === "wholesale-mao") {
    if (offerCeilingError && canUseMaxOffer) {
      return (
        <OutcomeShell icon={Target} eyebrow="Wholesale / Offer Ceiling" title="Offer Ceiling temporarily unavailable">
          <p role="alert" className="text-sm text-muted-foreground">
            The secure calculation could not be reached. Retry it from the decision summary above.
          </p>
        </OutcomeShell>
      );
    }
    if (!canUseMaxOffer || (!isOfferCeilingLoading && !hasExactOfferCeilingAccess)) {
      return (
        <OutcomeShell icon={Target} eyebrow="Wholesale / Offer Ceiling" title="Unlock the Offer Ceiling">
          <p className="text-sm text-muted-foreground">
            Set the return criteria that matter to you, then reverse-solve the highest price that
            clears all of them. The deal-specific ceiling stays locked until you choose Pro or a
            Pro PDF report.
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
        <OutcomeShell icon={Target} eyebrow="Wholesale / Offer Ceiling" title="Calculating the Offer Ceiling">
          <p role="status" className="text-sm text-muted-foreground">
            Resolving the criteria attached to this analysis…
          </p>
        </OutcomeShell>
      );
    }
    if (isOfferCeilingLoading) {
      return (
        <OutcomeShell icon={Target} eyebrow="Wholesale / Offer Ceiling" title="Calculating the Offer Ceiling">
          <p role="status" className="text-sm text-muted-foreground">
            Checking access and solving the criteria attached to this analysis…
          </p>
        </OutcomeShell>
      );
    }
    return (
      <WholesaleOutcome
        values={values}
        result={result}
        activeMaoTarget={activeMaoTarget}
        offerCeiling={offerCeiling}
        onMaoTargetChange={onMaoTargetChange}
        onTuneTargetsOpened={onTuneTargetsOpened}
      />
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
            Compare Pro plans
          </Button>
        ) : null}
      </OutcomeShell>
    );
  }

  // Pro: lead with the real interactive model so the play shows its actual
  // numbers (rehab/ARV → profit / cash-left-in), just like Wholesale's Offer Ceiling.
  return isFlip ? (
    <FixFlipCard values={values} result={result} />
  ) : (
    <BrrrrCard values={values} result={result} />
  );
}

function WholesaleOutcome({
  values,
  result,
  activeMaoTarget,
  offerCeiling,
  onMaoTargetChange,
  onTuneTargetsOpened,
}: {
  values: InvestmentFormValues;
  result: AnalysisResult | null;
  activeMaoTarget: MaoTarget;
  offerCeiling: OfferCeilingExactResult | null;
  onMaoTargetChange: (target: MaoTarget) => void;
  onTuneTargetsOpened?: () => void;
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
  const hasTarget = Object.values(maoTarget).some((value) => value !== undefined);
  const targetsLabel = describeMaoTarget(maoTarget);
  const asking = typeof values.purchasePrice === "number" ? values.purchasePrice : null;

  if (!hasTarget) {
    return (
      <OutcomeShell icon={Target} eyebrow="Wholesale / Offer Ceiling" title="Set Offer Ceiling rules">
        <p className="text-sm text-muted-foreground">
          Add at least one return criterion below. TrueCap will then calculate the highest price
          that clears it using this deal&apos;s assumptions.
        </p>
        <WholesaleTargetEditor
          key="wholesale-target-editor"
          target={maoTarget}
          isCashPurchase={isCashPurchase}
          onTargetChange={onMaoTargetChange}
          onOpened={onTuneTargetsOpened}
        />
      </OutcomeShell>
    );
  }

  if (!offerCeiling) {
    return (
      <OutcomeShell icon={Target} eyebrow="Wholesale / Offer Ceiling" title="No price meets these rules">
        <p className="text-sm text-muted-foreground">
          Even at the solver&apos;s lowest supported price, {usd(values.monthlyRent ?? 0)}/mo rent
          does not clear every selected criterion: {targetsLabel}. Verify the rent assumption or
          tune the criteria below.
        </p>
        <WholesaleTargetEditor
          key="wholesale-target-editor"
          target={maoTarget}
          isCashPurchase={isCashPurchase}
          onTargetChange={onMaoTargetChange}
          onOpened={onTuneTargetsOpened}
        />
      </OutcomeShell>
    );
  }

  const maxPrice = offerCeiling.presentation.ceiling;
  const spread = asking != null ? asking - maxPrice : null;
  const spreadPct =
    asking && asking > 0 && spread != null ? Math.round((spread / asking) * 100) : null;

  return (
    <OutcomeShell icon={Target} eyebrow="Wholesale / Offer Ceiling" title="Offer Ceiling">
      <p
        aria-live="polite"
        aria-atomic="true"
        className="text-4xl font-extrabold leading-none text-foreground sm:text-5xl"
      >
        {usd(maxPrice)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Criteria: {targetsLabel}.</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Highest modeled price that still meets the selected wholesale rules under the assumptions shown.
        This is not a recommended offer or an appraisal.
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
      <WholesaleTargetEditor
        key="wholesale-target-editor"
        target={maoTarget}
        isCashPurchase={isCashPurchase}
        onTargetChange={onMaoTargetChange}
        onOpened={onTuneTargetsOpened}
      />
    </OutcomeShell>
  );
}

function targetInput(value: number | undefined): string {
  return value == null ? "" : String(value);
}

function inputsFromTarget(target: MaoTarget): Record<MaoTargetField, string> {
  return {
    capRate: targetInput(target.capRate),
    cocReturn: targetInput(target.cocReturn),
    monthlyCashFlow: targetInput(target.monthlyCashFlow),
    dscr: targetInput(target.dscr),
    maxPurchasePrice: targetInput(target.maxPurchasePrice),
  };
}

const WHOLESALE_TARGET_FIELDS = [
  ["capRate", "Target cap rate (%)"],
  ["cocReturn", "Target cash-on-cash (%)"],
  ["monthlyCashFlow", "Min cash flow ($/mo)"],
  ["dscr", "Min DSCR"],
  ["maxPurchasePrice", "Max purchase price ($)"],
] as const satisfies ReadonlyArray<readonly [MaoTargetField, string]>;

function WholesaleTargetEditor({
  target,
  isCashPurchase,
  onTargetChange,
  onOpened,
}: {
  target: MaoTarget;
  isCashPurchase: boolean;
  onTargetChange: (target: MaoTarget) => void;
  onOpened?: () => void;
}) {
  const editorId = useId();
  const [open, setOpen] = useState(false);
  const [inputs, setInputs] = useState<Record<MaoTargetField, string>>(() =>
    inputsFromTarget(target)
  );
  const [errors, setErrors] = useState<Partial<Record<MaoTargetField, string>>>({});
  const targetKey = JSON.stringify(target);
  const previousTargetKeyRef = useRef(targetKey);
  const lastLocallyCommittedTargetKeyRef = useRef(targetKey);

  // Another target editor (for example the focused Decision card) may update
  // the shared parent target. Adopt that external change, but preserve a local
  // invalid draft until this editor's user fixes it.
  useEffect(() => {
    if (previousTargetKeyRef.current === targetKey) return;
    previousTargetKeyRef.current = targetKey;
    if (lastLocallyCommittedTargetKeyRef.current === targetKey) return;
    setInputs(inputsFromTarget(target));
    setErrors({});
    lastLocallyCommittedTargetKeyRef.current = targetKey;
  }, [target, targetKey]);

  const updateField = (field: MaoTargetField, rawValue: string) => {
    const update = applyMaoTargetInput(target, field, rawValue);
    if (!update.ok) {
      // Never make the UI look as if the final criterion was removed while it
      // still participates in the price calculation.
      if (rawValue.trim()) {
        setInputs((current) => ({ ...current, [field]: rawValue }));
      }
      setErrors((current) => ({ ...current, [field]: update.error }));
      return;
    }

    setInputs((current) => ({ ...current, [field]: rawValue }));
    lastLocallyCommittedTargetKeyRef.current = JSON.stringify(update.target);
    setErrors((current) => {
      const next = { ...current, [field]: undefined };
      for (const key of Object.keys(next) as MaoTargetField[]) {
        if (next[key] === EMPTY_MAO_TARGET_ERROR) next[key] = undefined;
      }
      return next;
    });
    onTargetChange(update.target);
  };

  const toggleEditor = () => {
    if (!open) {
      onOpened?.();
    } else {
      setInputs(inputsFromTarget(target));
      setErrors({});
    }
    setOpen((current) => !current);
  };

  return (
    <div className="mt-4 border-t border-primary/15 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={toggleEditor}
        aria-expanded={open}
        aria-controls={editorId}
        className="h-11 gap-2 rounded-xl"
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        Tune Offer Ceiling rules
        <ChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </Button>
      <div id={editorId} hidden={!open} className="mt-4 rounded-xl border border-border bg-card/70 p-4">
        <fieldset>
          <legend className="text-sm font-bold text-foreground">Wholesale Offer Ceiling rules</legend>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Change a criterion and the ceiling updates immediately everywhere this analysis is used.
            Leave a field blank to ignore it.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {WHOLESALE_TARGET_FIELDS.map(([field, label]) => {
              const bounds = MAO_TARGET_BOUNDS[field];
              const inputId = `${editorId}-${field}`;
              const errorId = `${inputId}-error`;
              const cashDscr = isCashPurchase && field === "dscr";
              return (
                <div key={field}>
                  <Label htmlFor={inputId} className="text-xs">
                    {label}
                  </Label>
                  <Input
                    id={inputId}
                    type="number"
                    inputMode={
                      field === "monthlyCashFlow" || field === "maxPurchasePrice"
                        ? "numeric"
                        : "decimal"
                    }
                    min={bounds.min}
                    max={bounds.max}
                    step={bounds.step}
                    value={cashDscr ? "" : inputs[field]}
                    placeholder={cashDscr ? "N/A — cash" : "Any"}
                    disabled={cashDscr}
                    onChange={(event) => updateField(field, event.target.value)}
                    aria-invalid={Boolean(errors[field])}
                    aria-describedby={errors[field] ? errorId : undefined}
                    className="mt-1 h-11"
                  />
                  {errors[field] ? (
                    <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-destructive">
                      {errors[field]}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>
      </div>
    </div>
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
