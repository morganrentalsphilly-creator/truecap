"use client";

/**
 * "What price makes this deal work?" - the Offer Ceiling surface.
 *
 * Answers two questions from the same targets:
 *   1. Forward - the HIGHEST price you should pay to still hit every target
 *      (cap rate, cash-on-cash, monthly cash flow, DSCR).
 *   2. Inverse - to make YOUR CURRENT price work, the rent or rate you'd need.
 *
 * Self-contained state - never touches the form. Reuses calculateAnalysis via
 * the solvers in lib/max-allowable-offer.ts so the math stays consistent.
 */

import { useEffect, useId, useMemo, useState, type ChangeEvent } from "react";
import { Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  calculateMaxAllowableOffer,
  solveRequiredMonthlyRent,
  solveRequiredInterestRate,
  type MaoTarget,
} from "@/lib/max-allowable-offer";
import {
  chooseMaoTargetFromBuyBox,
  describeMaoTarget,
  type BuyBoxReturnThresholds,
} from "@/lib/mao-targets";
import {
  applyMaoTargetInput,
  EMPTY_MAO_TARGET_ERROR,
  MAO_TARGET_BOUNDS,
  type MaoTargetField,
} from "@/lib/mao-target-editor";
import { NO_DEBT_SERVICE_DSCR_LABEL } from "@/lib/financial-presentation";
import {
  WhatNeedsToBeTrueCard,
  type ApplicableDecisionThreshold,
} from "@/components/investcalc/what-needs-to-be-true-card";
import { isFeatureEnabled } from "@/lib/feature-flags";

interface MaxOfferCardProps {
  values: InvestmentFormValues | null;
  /** The user's primary buy-box return thresholds (reported up by
   *  BuyBoxVerdictCard on the same surface). When set, they seed the
   *  solver targets — the user's criteria beat our canonical defaults
   *  (lib/mao-targets rule 2) — labeled "From your buy box". Absent/null
   *  = canonical default seeds. Every field stays user-editable. */
  buyBoxThresholds?: BuyBoxReturnThresholds | null;
  /** Applies an exact, rechecked one-variable boundary back to the live form. */
  onApplyThreshold?: (change: ApplicableDecisionThreshold) => void;
  /** Exact criteria carried by a sample or focused decision summary. */
  initialTarget?: MaoTarget | null;
  /** Keep the focused price-ceiling summary synchronized with edits. */
  onTargetChange?: (target: MaoTarget) => void;
}

function inputsFromTarget(target: MaoTarget): Record<MaoTargetField, string> {
  return {
    capRate: target.capRate == null ? "" : String(target.capRate),
    cocReturn: target.cocReturn == null ? "" : String(target.cocReturn),
    monthlyCashFlow:
      target.monthlyCashFlow == null ? "" : String(target.monthlyCashFlow),
    dscr: target.dscr == null ? "" : String(target.dscr),
    minIrrPct: target.minIrrPct == null ? "" : String(target.minIrrPct),
    maxCashRequired:
      target.maxCashRequired == null ? "" : String(target.maxCashRequired),
    maxPurchasePrice:
      target.maxPurchasePrice == null ? "" : String(target.maxPurchasePrice),
  };
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function MaxOfferCard({
  values,
  buyBoxThresholds,
  onApplyThreshold,
  initialTarget = null,
  onTargetChange,
}: MaxOfferCardProps) {
  const showDecisionThresholds = isFeatureEnabled("what_needs_to_be_true_v2");
  // Cash purchases have no debt service: calc-analysis reports dscr 0, so a
  // DSCR floor could never pass. Omit that target at this call site (the
  // solver's documented contract) instead of showing "no price works".
  const isCashDeal = useMemo(() => {
    if (!values) return false;
    try {
      return calculateAnalysis(values).monthlyPayment <= 0;
    } catch {
      return false;
    }
  }, [values]);

  // Buy-box seed: when the user's box carries return thresholds, THOSE are
  // the initial targets (lib/mao-targets rule 2 — their criteria beat our
  // defaults). Null = seed the canonical basis instead.
  const seedTarget = useMemo(() => {
    if (initialTarget) {
      const target = { ...initialTarget };
      if (isCashDeal) delete target.dscr;
      return target;
    }
    return chooseMaoTargetFromBuyBox(buyBoxThresholds, { isCashPurchase: isCashDeal });
  }, [initialTarget, buyBoxThresholds, isCashDeal]);

  // Initial targets = the buy-box seed when present, else the canonical Offer Ceiling
  // basis. Keep a validated committed target separate from raw inputs: an
  // out-of-range draft or an attempt to remove the final criterion is shown
  // with an inline error but never reaches the solver, Save, Share, or PDF.
  const resolvedSeedTarget = useMemo<MaoTarget>(
    () =>
      seedTarget ??
      (isCashDeal ? { monthlyCashFlow: 0 } : { monthlyCashFlow: 0, dscr: 1.25 }),
    [isCashDeal, seedTarget]
  );
  const [target, setTarget] = useState<MaoTarget>(() => resolvedSeedTarget);
  const [targetInputs, setTargetInputs] = useState<Record<MaoTargetField, string>>(() =>
    inputsFromTarget(resolvedSeedTarget)
  );
  const [targetErrors, setTargetErrors] = useState<
    Partial<Record<MaoTargetField, string>>
  >({});

  // The box report arrives async (BuyBoxVerdictCard fetches it), so this
  // card can mount before the seed exists. Apply a late-arriving seed once
  // — and never clobber targets the user already edited. State (not a
  // ref) because the "From your buy box" label renders from it.
  const [touched, setTouched] = useState(false);
  const seedKey = JSON.stringify(resolvedSeedTarget);
  const [appliedSeedKey, setAppliedSeedKey] = useState(seedKey);
  useEffect(() => {
    if (seedKey === appliedSeedKey) return;
    setAppliedSeedKey(seedKey);
    setTarget(resolvedSeedTarget);
    setTargetInputs(inputsFromTarget(resolvedSeedTarget));
    setTargetErrors({});
  }, [appliedSeedKey, resolvedSeedTarget, seedKey]);

  // Label the seed source only while the inputs still ARE the seed — one
  // edit and the targets are the user's, not the box's.
  const showBuyBoxSeedLabel =
    !initialTarget && seedTarget != null && !touched && seedKey === appliedSeedKey;
  const targetProfileLabel = showBuyBoxSeedLabel
    ? "your Buy Box"
    : initialTarget
      ? "the captured selected targets"
      : touched
        ? "your selected targets"
        : "TrueCap screening defaults";

  const edit =
    (field: MaoTargetField) => (event: ChangeEvent<HTMLInputElement>) => {
      setTouched(true);
      const rawValue = event.target.value;
      const update = applyMaoTargetInput(target, field, rawValue);
      if (!update.ok) {
        if (rawValue.trim()) {
          setTargetInputs((current) => ({ ...current, [field]: rawValue }));
        }
        setTargetErrors((current) => ({ ...current, [field]: update.error }));
        return;
      }

      setTargetInputs((current) => ({ ...current, [field]: rawValue }));
      setTargetErrors((current) => {
        const next = { ...current, [field]: undefined };
        for (const key of Object.keys(next) as MaoTargetField[]) {
          if (next[key] === EMPTY_MAO_TARGET_ERROR) next[key] = undefined;
        }
        return next;
      });
      setTarget(update.target);
      onTargetChange?.(update.target);
    };

  const noneSet =
    target.capRate === undefined &&
    target.cocReturn === undefined &&
    target.monthlyCashFlow === undefined &&
    target.dscr === undefined &&
    target.minIrrPct === undefined &&
    target.maxCashRequired === undefined &&
    target.maxPurchasePrice === undefined;

  const active = Boolean(values) && !noneSet;
  const mao = useMemo(() => (active ? calculateMaxAllowableOffer(values!, target) : null), [active, values, target]);
  const reqRent = useMemo(
    () => (active && !showDecisionThresholds ? solveRequiredMonthlyRent(values!, target) : null),
    [active, showDecisionThresholds, values, target]
  );
  const reqRate = useMemo(
    () => (active && !showDecisionThresholds ? solveRequiredInterestRate(values!, target) : null),
    [active, showDecisionThresholds, values, target]
  );

  const currentPrice = values ? Number(values.purchasePrice) : null;
  const currentMeets = reqRent?.alreadyMet ?? reqRate?.alreadyMet ?? false;

  // A11Y: the target labels were bare <Label>s with no htmlFor, so clicking a
  // label did nothing and each <Input> had no accessible name (screen readers
  // announced "edit text" with no context). useId() gives stable, collision-
  // safe ids so multiple instances (e.g. compare view) never share an id.
  // This card also ships on the public /d/ share viewer, so the fields must be
  // usable on assistive tech.
  const uid = useId();
  const capRateId = `${uid}-cap-rate`;
  const cocId = `${uid}-coc`;
  const cashFlowId = `${uid}-cash-flow`;
  const dscrId = `${uid}-dscr`;
  const irrId = `${uid}-irr`;
  const maxCashRequiredId = `${uid}-max-cash-required`;
  const maxPurchasePriceId = `${uid}-max-purchase-price`;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1.5">
        <Target aria-hidden className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">
          Offer Ceiling
        </span>
        {showBuyBoxSeedLabel ? (
          <span className="rounded-full border border-primary/30 bg-[var(--brand-blue-light)] px-2 py-0.5 text-[10px] font-semibold text-primary">
            From your buy box
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Set your return targets - we solve the Offer Ceiling that still clears them, and what it&apos;d take to
        make your current price work. Uses your current rent, financing, and operating assumptions.
      </p>

      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        <div>
          <Label htmlFor={capRateId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Target Cap Rate <span className="sr-only">percent, </span><span className="font-normal lowercase tracking-normal">(opt)</span>
          </Label>
          <div className="relative">
            <Input
              id={capRateId}
              type="number"
              inputMode="decimal"
              min={MAO_TARGET_BOUNDS.capRate.min}
              max={MAO_TARGET_BOUNDS.capRate.max}
              step={MAO_TARGET_BOUNDS.capRate.step}
              value={targetInputs.capRate}
              onChange={edit("capRate")}
              placeholder="Any"
              aria-invalid={Boolean(targetErrors.capRate)}
              aria-describedby={targetErrors.capRate ? `${capRateId}-error` : undefined}
              className="h-11 border-input bg-background pr-7"
            />
            <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
          {targetErrors.capRate ? (
            <p id={`${capRateId}-error`} role="alert" className="mt-1 text-xs font-medium text-destructive">
              {targetErrors.capRate}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor={cocId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Target Cash-on-Cash <span className="sr-only">percent, </span><span className="font-normal lowercase tracking-normal">(opt)</span>
          </Label>
          <div className="relative">
            <Input
              id={cocId}
              type="number"
              inputMode="decimal"
              min={MAO_TARGET_BOUNDS.cocReturn.min}
              max={MAO_TARGET_BOUNDS.cocReturn.max}
              step={MAO_TARGET_BOUNDS.cocReturn.step}
              value={targetInputs.cocReturn}
              onChange={edit("cocReturn")}
              placeholder="Any"
              aria-invalid={Boolean(targetErrors.cocReturn)}
              aria-describedby={targetErrors.cocReturn ? `${cocId}-error` : undefined}
              className="h-11 border-input bg-background pr-7"
            />
            <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
          {targetErrors.cocReturn ? (
            <p id={`${cocId}-error`} role="alert" className="mt-1 text-xs font-medium text-destructive">
              {targetErrors.cocReturn}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor={cashFlowId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Min Cash Flow <span className="sr-only">dollars per month</span>
          </Label>
          <div className="relative">
            <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <Input
              id={cashFlowId}
              type="number"
              inputMode="numeric"
              min={MAO_TARGET_BOUNDS.monthlyCashFlow.min}
              max={MAO_TARGET_BOUNDS.monthlyCashFlow.max}
              step={MAO_TARGET_BOUNDS.monthlyCashFlow.step}
              value={targetInputs.monthlyCashFlow}
              onChange={edit("monthlyCashFlow")}
              placeholder="0"
              aria-invalid={Boolean(targetErrors.monthlyCashFlow)}
              aria-describedby={targetErrors.monthlyCashFlow ? `${cashFlowId}-error` : undefined}
              className="h-11 border-input bg-background pl-7"
            />
          </div>
          {targetErrors.monthlyCashFlow ? (
            <p id={`${cashFlowId}-error`} role="alert" className="mt-1 text-xs font-medium text-destructive">
              {targetErrors.monthlyCashFlow}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor={dscrId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Min DSCR{" "}
            <span className="font-normal lowercase tracking-normal">
              {isCashDeal ? NO_DEBT_SERVICE_DSCR_LABEL : "(opt)"}
            </span>
          </Label>
          <Input
            id={dscrId}
            type="number"
            inputMode="decimal"
            min={MAO_TARGET_BOUNDS.dscr.min}
            max={MAO_TARGET_BOUNDS.dscr.max}
            step={MAO_TARGET_BOUNDS.dscr.step}
            value={isCashDeal ? "" : targetInputs.dscr}
            onChange={edit("dscr")}
            placeholder={isCashDeal ? NO_DEBT_SERVICE_DSCR_LABEL : "1.25"}
            disabled={isCashDeal}
            aria-invalid={Boolean(targetErrors.dscr)}
            aria-describedby={targetErrors.dscr ? `${dscrId}-error` : undefined}
            className="h-11 border-input bg-background"
          />
          {targetErrors.dscr ? (
            <p id={`${dscrId}-error`} role="alert" className="mt-1 text-xs font-medium text-destructive">
              {targetErrors.dscr}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor={irrId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Min 10-Year Pre-Tax IRR <span className="sr-only">percent, </span><span className="font-normal lowercase tracking-normal">(opt)</span>
          </Label>
          <div className="relative">
            <Input
              id={irrId}
              type="number"
              inputMode="decimal"
              min={MAO_TARGET_BOUNDS.minIrrPct.min}
              max={MAO_TARGET_BOUNDS.minIrrPct.max}
              step={MAO_TARGET_BOUNDS.minIrrPct.step}
              value={targetInputs.minIrrPct}
              onChange={edit("minIrrPct")}
              placeholder="Any"
              aria-invalid={Boolean(targetErrors.minIrrPct)}
              aria-describedby={targetErrors.minIrrPct ? `${irrId}-error` : undefined}
              className="h-11 border-input bg-background pr-7"
            />
            <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
          {targetErrors.minIrrPct ? (
            <p id={`${irrId}-error`} role="alert" className="mt-1 text-xs font-medium text-destructive">
              {targetErrors.minIrrPct}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor={maxCashRequiredId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Max Cash Required <span className="font-normal lowercase tracking-normal">(opt)</span>
          </Label>
          <div className="relative">
            <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <Input
              id={maxCashRequiredId}
              type="number"
              inputMode="numeric"
              min={MAO_TARGET_BOUNDS.maxCashRequired.min}
              max={MAO_TARGET_BOUNDS.maxCashRequired.max}
              step={MAO_TARGET_BOUNDS.maxCashRequired.step}
              value={targetInputs.maxCashRequired}
              onChange={edit("maxCashRequired")}
              placeholder="Any"
              aria-invalid={Boolean(targetErrors.maxCashRequired)}
              aria-describedby={targetErrors.maxCashRequired ? `${maxCashRequiredId}-error` : undefined}
              className="h-11 border-input bg-background pl-7"
            />
          </div>
          {targetErrors.maxCashRequired ? (
            <p id={`${maxCashRequiredId}-error`} role="alert" className="mt-1 text-xs font-medium text-destructive">
              {targetErrors.maxCashRequired}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor={maxPurchasePriceId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Max Purchase Price <span className="font-normal lowercase tracking-normal">(opt)</span>
          </Label>
          <div className="relative">
            <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <Input
              id={maxPurchasePriceId}
              type="number"
              inputMode="numeric"
              min={MAO_TARGET_BOUNDS.maxPurchasePrice.min}
              max={MAO_TARGET_BOUNDS.maxPurchasePrice.max}
              step={MAO_TARGET_BOUNDS.maxPurchasePrice.step}
              value={targetInputs.maxPurchasePrice}
              onChange={edit("maxPurchasePrice")}
              placeholder="Any"
              aria-invalid={Boolean(targetErrors.maxPurchasePrice)}
              aria-describedby={
                targetErrors.maxPurchasePrice ? `${maxPurchasePriceId}-error` : undefined
              }
              className="h-11 border-input bg-background pl-7"
            />
          </div>
          {targetErrors.maxPurchasePrice ? (
            <p id={`${maxPurchasePriceId}-error`} role="alert" className="mt-1 text-xs font-medium text-destructive">
              {targetErrors.maxPurchasePrice}
            </p>
          ) : null}
        </div>
      </div>

      {/* Forward: modeled Offer Ceiling */}
      <div className="mt-5 rounded-xl border border-border bg-[var(--background)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Offer Ceiling</div>
            <div className={cn("mt-1 font-mono text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl", mao ? "text-primary" : "text-muted-foreground")}>
              {!values ? "—" : noneSet ? "Set a target" : mao ? money(mao.maxPrice) : "No price hits these targets"}
            </div>
          </div>
          {mao && (
            <div className="text-xs text-muted-foreground sm:text-right space-y-0.5">
              <div>At this price you&apos;d get:</div>
              <div>
                <span className="font-semibold text-foreground">{mao.achieved.capRate.toFixed(1)}%</span> cap ·{" "}
                <span className="font-semibold text-foreground">
                  {mao.achieved.totalCashRequired > 0 ? `${mao.achieved.cocReturn.toFixed(1)}%` : "N/A"}
                </span>{" "}
                CoC ·{" "}
                <span className="font-semibold text-foreground">${mao.achieved.netCashFlow.toLocaleString("en-US")}</span>/mo ·{" "}
                <span className="font-semibold text-foreground">
                  {isCashDeal
                    ? NO_DEBT_SERVICE_DSCR_LABEL
                    : mao.achieved.dscr.toFixed(2)}
                </span>{" "}
                DSCR
              </div>
              {target.minIrrPct !== undefined || target.maxCashRequired !== undefined ? (
                <div>
                  {target.minIrrPct !== undefined ? (
                    <>
                      <span className="font-semibold text-foreground">
                        {mao.achievedIrr?.status === "unique" && mao.achievedIrr.primaryIrrPct != null
                          ? `${mao.achievedIrr.primaryIrrPct.toFixed(1)}%`
                          : "Unsupported"}
                      </span>{" "}
                      10-year pre-tax IRR
                    </>
                  ) : null}
                  {target.minIrrPct !== undefined && target.maxCashRequired !== undefined
                    ? " · "
                    : null}
                  {target.maxCashRequired !== undefined ? (
                    <>
                      <span className="font-semibold text-foreground">
                        {money(mao.achieved.totalCashRequired)}
                      </span>{" "}
                      cash required
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
        {!mao && !noneSet && values && (
          <p className="text-xs text-muted-foreground mt-2">
            Try loosening one of your targets - these returns aren&apos;t reachable at any reasonable price given the rent and expenses entered.
          </p>
        )}
        {!noneSet ? (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs font-semibold text-foreground">Criteria: {describeMaoTarget(target)}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              The highest price that still meets {targetProfileLabel} under the assumptions shown.
            </p>
          </div>
        ) : null}
      </div>

      {/* Inverse: make the current price work */}
      {!showDecisionThresholds && active && currentPrice ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Or - make your current price work
          </div>
          {currentMeets ? (
            <p className="mt-1.5 text-sm text-foreground">
              Your current price ({money(currentPrice)}) already clears these targets. ✓
            </p>
          ) : (
            <div className="mt-1.5 space-y-1 text-sm text-foreground">
              <p className="text-xs text-muted-foreground">At {money(currentPrice)}, you&apos;d need:</p>
              <p>
                Rent{" "}
                {reqRent && !reqRent.unreachable ? (
                  <>
                    ≥ <span className="font-bold text-primary">{money(reqRent.value)}/mo</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">— not reachable by rent alone</span>
                )}
              </p>
              {reqRate === null ? null : (
                <p>
                  or rate{" "}
                  {!reqRate.unreachable ? (
                    <>
                      ≤ <span className="font-bold text-primary">{reqRate.value}%</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">— not reachable by rate alone</span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}

      {showDecisionThresholds && values && active ? (
        <div className="mt-4">
          <WhatNeedsToBeTrueCard
            values={values}
            target={target}
            targetSource={showBuyBoxSeedLabel ? "buy-box" : touched ? "custom" : "default"}
            onApply={onApplyThreshold}
          />
        </div>
      ) : null}
    </div>
  );
}
