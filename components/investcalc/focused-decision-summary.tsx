"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Edit3, Loader2, Save, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareLinkButton } from "@/components/investcalc/share-link-button";
import type { AnalysisResult } from "@/lib/calc-analysis";
import { computeAssumptionImpact } from "@/lib/assumption-impact";
import type { DealScoreActionResult } from "@/app/actions/deal-score";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import { meetsMaoTarget } from "@/lib/mao-target-evaluation";
import {
  applyMaoTargetInput,
  EMPTY_MAO_TARGET_ERROR,
  MAO_TARGET_BOUNDS,
  type MaoTargetField,
} from "@/lib/mao-target-editor";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { getDealTier } from "@/lib/verdict";
import type {
  OfferCeilingPresentation,
  OfferCeilingRangePreview,
  OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import type { InputConfidenceResult } from "@/lib/input-confidence";
import type { NextAction } from "@/lib/next-action";
import { trackEvent } from "@/lib/analytics";

type Props = {
  values: InvestmentFormValues;
  result: AnalysisResult;
  dealScoreResult: DealScoreActionResult | null;
  offerCeiling: OfferCeilingPresentation | null;
  exactBreakpointLabels?: string[];
  rangePreview?: OfferCeilingRangePreview | null;
  target: MaoTarget;
  targetLabel: string;
  targetSource: OfferCeilingTargetSource;
  buyBoxName?: string | null;
  buyBoxFit?: boolean | null;
  inputConfidence?: InputConfidenceResult | null;
  nextAction?: NextAction | null;
  canShowPriceCeiling: boolean;
  canTunePriceCeiling: boolean;
  isOfferCeilingLoading?: boolean;
  offerCeilingError?: boolean;
  onRetryOfferCeiling?: () => void;
  isScenarioActive?: boolean;
  onTargetChange: (target: MaoTarget) => void;
  onTuneTargetsOpened: () => void;
  onEditAssumptions: () => void;
  onSave: () => void;
  isSaving: boolean;
  isSaveLocked?: boolean;
  saveLockedHint?: string;
  savedDealId?: string | null;
  targetResolutionState?: "loading" | "ready" | "error";
  targetResolutionMessage?: string;
};

function money(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? "-" : ""}$${Math.abs(rounded).toLocaleString("en-US")}`;
}

function scoreFrom(result: DealScoreActionResult | null): number | null {
  return result?.ok && result.tier === "pro" ? Math.round(result.data.score) : null;
}

function targetInput(value: number | undefined): string {
  return value == null ? "" : String(value);
}

/**
 * The decision viewport: one compact, factual answer before the deeper report.
 * All numbers come from the same frozen values/result snapshot as the rest of
 * the dashboard; no calculation logic lives in this component.
 */
export function FocusedDecisionSummary({
  values,
  result,
  dealScoreResult,
  offerCeiling,
  exactBreakpointLabels = [],
  rangePreview = null,
  target,
  targetLabel,
  targetSource,
  buyBoxName = null,
  buyBoxFit = null,
  inputConfidence = null,
  nextAction = null,
  canShowPriceCeiling,
  canTunePriceCeiling,
  isOfferCeilingLoading = false,
  offerCeilingError = false,
  onRetryOfferCeiling,
  isScenarioActive = false,
  onTargetChange,
  onTuneTargetsOpened,
  onEditAssumptions,
  onSave,
  isSaving,
  isSaveLocked = false,
  saveLockedHint,
  savedDealId,
  targetResolutionState = "ready",
  targetResolutionMessage,
}: Props) {
  const drivers = useMemo(() => computeAssumptionImpact(values).slice(0, 3), [values]);
  const score = scoreFrom(dealScoreResult);
  const tier = getDealTier(result);
  const targetEditorId = useId();
  const [tuneOpen, setTuneOpen] = useState(false);
  const [targetInputs, setTargetInputs] = useState<Record<MaoTargetField, string>>(() => ({
    capRate: targetInput(target.capRate),
    cocReturn: targetInput(target.cocReturn),
    monthlyCashFlow: targetInput(target.monthlyCashFlow),
    dscr: targetInput(target.dscr),
    maxPurchasePrice: targetInput(target.maxPurchasePrice),
  }));
  const [targetErrors, setTargetErrors] = useState<Partial<Record<MaoTargetField, string>>>({});
  const targetKey = JSON.stringify(target);
  const lastLocallyCommittedTargetKeyRef = useRef(targetKey);
  const previousTargetKeyRef = useRef(targetKey);

  // Buy-box or sample targets can resolve after first paint. Track actual prop
  // changes so a local invalid draft survives ordinary re-renders, while a
  // new target from another solver surface still replaces that stale draft.
  useEffect(() => {
    if (previousTargetKeyRef.current === targetKey) return;
    previousTargetKeyRef.current = targetKey;
    // This is the parent acknowledging our own valid edit. The visible raw
    // value already matches, so retain it (including user-friendly formatting)
    // and simply release the invalid-draft protection.
    if (targetKey === lastLocallyCommittedTargetKeyRef.current) {
      return;
    }
    // A sample/buy-box seed or the deeper solver changed the target. Replace
    // any stale local draft so every editor surface shows the same criteria.
    setTargetInputs({
      capRate: targetInput(target.capRate),
      cocReturn: targetInput(target.cocReturn),
      monthlyCashFlow: targetInput(target.monthlyCashFlow),
      dscr: targetInput(target.dscr),
      maxPurchasePrice: targetInput(target.maxPurchasePrice),
    });
    setTargetErrors({});
    lastLocallyCommittedTargetKeyRef.current = targetKey;
  }, [
    target.capRate,
    target.cocReturn,
    target.dscr,
    target.maxPurchasePrice,
    target.monthlyCashFlow,
    targetKey,
  ]);

  const updateTargetField = (field: MaoTargetField, rawValue: string) => {
    const update = applyMaoTargetInput(target, field, rawValue);
    if (!update.ok) {
      // Preserve the visible final criterion when blanking it is rejected;
      // otherwise the field would look empty while the unchanged criterion
      // still participates in the ceiling math. Out-of-range typed values do
      // remain visible so their connected error is actionable.
      if (rawValue.trim()) {
        setTargetInputs((current) => ({ ...current, [field]: rawValue }));
      }
      setTargetErrors((current) => ({
        ...current,
        [field]: update.error,
      }));
      return;
    }

    setTargetInputs((current) => ({ ...current, [field]: rawValue }));
    lastLocallyCommittedTargetKeyRef.current = JSON.stringify(update.target);
    setTargetErrors((current) => {
      const next = { ...current, [field]: undefined };
      for (const key of Object.keys(next) as MaoTargetField[]) {
        if (next[key] === EMPTY_MAO_TARGET_ERROR) next[key] = undefined;
      }
      return next;
    });
    onTargetChange(update.target);
  };
  // The verdict must reconcile with the exact ceiling shown beside it. A deal
  // can have positive cash flow and still miss the selected $/mo or DSCR bar.
  const clearsTargets = meetsMaoTarget(result, target);
  const readinessLabel =
    inputConfidence?.stage === "offer-ready"
      ? "Ready"
      : inputConfidence?.stage === "verified"
        ? "Verify first"
        : "Screening only";
  const decisionLabel =
    !clearsTargets || buyBoxFit === false
      ? "Pass at this price"
      : readinessLabel === "Ready" &&
          (targetSource !== "buy-box" || buyBoxFit === true)
        ? "Pursue"
        : "Conditional — verify first";
  const breakpointLabels = [
    ...exactBreakpointLabels,
    ...drivers.map(
      (driver) =>
        `${driver.label} ${driver.deltaLabel} moves cash flow about ±${money(driver.cashFlowSwing / 2)}/mo`
    ),
  ].filter((label, index, all) => all.indexOf(label) === index).slice(0, 3);
  const nextVerification = inputConfidence?.verificationQueue[0];
  const resolvedNextAction =
    !clearsTargets
      ? offerCeiling
        ? {
            label: `Negotiate to ${money(offerCeiling.ceiling)} or less — or pass`,
            reason:
              offerCeiling.listPriceGap > 0
                ? `${money(offerCeiling.listPriceGap)} above the ceiling for your selected targets`
                : "the current price misses at least one selected target",
          }
        : {
            label: "Change the price or assumptions before proceeding",
            reason: "the current assumptions miss your selected targets",
          }
      : readinessLabel !== "Ready" && nextVerification
      ? {
          label: nextVerification.verifyAction ?? `Verify ${nextVerification.label}`,
          reason: `${nextVerification.label} is a material ${nextVerification.sourceLabel.toLowerCase()} input`,
        }
      : nextAction;
  const targetBlocked = targetResolutionState !== "ready";
  const telemetryKey = offerCeiling
    ? `${targetSource}:${offerCeiling.ceiling}`
    : rangePreview
      ? `${targetSource}:${rangePreview.lower}:${rangePreview.upper}`
      : `${targetSource}:none`;
  const lastOfferTelemetryKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (targetBlocked || isOfferCeilingLoading || lastOfferTelemetryKeyRef.current === telemetryKey) return;
    lastOfferTelemetryKeyRef.current = telemetryKey;
    trackEvent("offer_ceiling_viewed", {
      target_source: targetSource,
      access_level: canShowPriceCeiling ? "exact" : "range_preview",
      decision_readiness: readinessLabel.toLowerCase().replaceAll(" ", "_"),
      has_feasible: Boolean(offerCeiling || rangePreview),
    });
    const bindingConstraint = offerCeiling?.bindingConstraints[0]?.key;
    if (bindingConstraint) {
      trackEvent("binding_constraint_viewed", {
        constraint: bindingConstraint,
        target_source: targetSource,
      });
    }
  }, [
    canShowPriceCeiling,
    isOfferCeilingLoading,
    offerCeiling,
    rangePreview,
    readinessLabel,
    targetBlocked,
    targetSource,
    telemetryKey,
  ]);

  return (
    <section
      aria-labelledby="decision-summary-title"
      className="rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)] sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-muted-foreground">{values.address}</p>
            {isScenarioActive ? (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                Base analysis
              </span>
            ) : null}
          </div>
          <h2 id="decision-summary-title" className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {decisionLabel}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Asking {money(Number(values.purchasePrice))} · {tier} fundamentals
            {score != null ? ` · Screening Index ${score}/100 (v${result.methodologyVersion ?? "current"})` : ""}
          </p>
        </div>

        <div
          aria-live="polite"
          aria-atomic="true"
          className="rounded-xl border border-primary/25 bg-[var(--brand-blue-light)] p-4 lg:min-w-80"
        >
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
            {isScenarioActive ? "Base Offer Ceiling" : "Offer Ceiling"}
          </p>
          <p className="mt-1 font-mono text-3xl font-extrabold tabular-nums text-primary">
            {targetResolutionState === "loading"
              ? "Loading your Buy Box…"
              : targetResolutionState === "error"
                ? "Buy Box unavailable"
                : isOfferCeilingLoading
                  ? "Calculating…"
                : offerCeilingError
                  ? "Temporarily unavailable"
                : canShowPriceCeiling
                  ? offerCeiling
                    ? money(offerCeiling.ceiling)
                    : "Not reachable"
                  : rangePreview
                    ? `${money(rangePreview.lower)}–${money(rangePreview.upper)}`
                    : "No feasible range"}
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground">
            {targetBlocked
              ? targetResolutionMessage
              : `${targetSource === "buy-box" && buyBoxName ? `Under Buy Box: ${buyBoxName}` : offerCeiling?.sourceLabel ?? (targetSource === "screening-defaults" ? "Under screening defaults" : targetSource === "buy-box" ? "Under your Buy Box" : "Under your selected targets")} · ${canShowPriceCeiling ? "Exact ceiling" : "Coarse range preview"}`}
          </p>
          {!targetBlocked ? (
            <p className="mt-1 text-[11px] leading-relaxed text-foreground">
              Targets: {targetLabel}
            </p>
          ) : null}
          {offerCeilingError && onRetryOfferCeiling ? (
            <button
              type="button"
              onClick={onRetryOfferCeiling}
              className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-primary/30 px-3 text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Retry Offer Ceiling
            </button>
          ) : null}
          {offerCeiling ? (
            <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
              <p>
                Binding: {offerCeiling.bindingConstraints.map((item) => item.criterion).join(" + ") || "No constraint resolved"}
              </p>
              {offerCeiling.nextConstraint ? (
                <p>Next constraint: {offerCeiling.nextConstraint.criterion}</p>
              ) : null}
              <p>
                Screening range: {offerCeiling.range.lower == null ? "no feasible downside price" : money(offerCeiling.range.lower)}
                {" – "}
                {offerCeiling.range.upper == null ? "no feasible upside price" : money(offerCeiling.range.upper)}
                {" "}if {offerCeiling.range.label}.
              </p>
            </div>
          ) : null}
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Calculated from the targets shown above. This is not a recommended offer.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Buy Box Fit</p>
          <p className="mt-1 text-sm font-extrabold text-foreground">
            {targetSource !== "buy-box"
              ? "No Buy Box selected"
              : buyBoxFit == null
                ? "Checking…"
                : buyBoxFit
                  ? "Meets"
                  : "Misses"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Decision Readiness</p>
          <p className="mt-1 text-sm font-extrabold text-foreground">{readinessLabel}</p>
          {nextVerification ? (
            <p className="mt-1 text-[10px] text-muted-foreground">Weakest material input: {nextVerification.label}</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Margin of Safety</p>
          <p className="mt-1 text-sm font-extrabold text-foreground">
            {offerCeiling
              ? offerCeiling.listPriceGap > 0
                ? `${money(offerCeiling.listPriceGap)} above ceiling`
                : offerCeiling.listPriceGap < 0
                  ? `${money(Math.abs(offerCeiling.listPriceGap))} below ceiling`
                  : "At the ceiling"
              : rangePreview
                ? Number(values.purchasePrice) > rangePreview.upper
                  ? `${money(Number(values.purchasePrice) - rangePreview.upper)} above preview`
                  : Number(values.purchasePrice) < rangePreview.lower
                    ? `${money(rangePreview.lower - Number(values.purchasePrice))} below preview`
                    : "Inside preview range"
                : "Not available"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{isScenarioActive ? "Base monthly cash flow" : "Monthly cash flow"}</p>
          <p className="mt-1 font-mono text-xl font-extrabold tabular-nums text-foreground">{money(result.netCashFlow)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{isScenarioActive ? "Base DSCR" : "DSCR"}</p>
          <p className="mt-1 font-mono text-xl font-extrabold tabular-nums text-foreground">
            {result.monthlyPayment <= 0 ? "N/A" : result.dscr.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top breakpoints</p>
          <ol className="mt-2 grid gap-1 text-sm font-semibold text-foreground sm:grid-cols-3">
            {breakpointLabels.map((label, index) => (
              <li key={label}><span className="text-muted-foreground">{index + 1}.</span> {label}</li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl border border-primary/20 bg-[var(--brand-blue-light)] p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Next action</p>
          <p className="mt-1 text-sm font-extrabold text-foreground">{resolvedNextAction?.label ?? "Verify the material assumptions"}</p>
          {resolvedNextAction?.reason ? (
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{resolvedNextAction.reason}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        {canTunePriceCeiling ? (
          <Button
            type="button"
            onClick={() => {
              if (!tuneOpen) onTuneTargetsOpened();
              if (tuneOpen) {
                setTargetInputs({
                  capRate: targetInput(target.capRate),
                  cocReturn: targetInput(target.cocReturn),
                  monthlyCashFlow: targetInput(target.monthlyCashFlow),
                  dscr: targetInput(target.dscr),
                  maxPurchasePrice: targetInput(target.maxPurchasePrice),
                });
                setTargetErrors({});
              }
              setTuneOpen(!tuneOpen);
            }}
            aria-expanded={tuneOpen}
            aria-controls={targetEditorId}
            disabled={targetBlocked}
            className="h-11 gap-2 rounded-xl"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Tune targets
            <ChevronDown className={`size-4 transition-transform ${tuneOpen ? "rotate-180" : ""}`} aria-hidden />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          disabled={isSaving || targetBlocked || isSaveLocked}
          title={isSaveLocked ? saveLockedHint : undefined}
          className="h-11 gap-2 rounded-xl"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          Save
        </Button>
        <ShareLinkButton
          values={values}
          savedDealId={savedDealId}
          maoTarget={target}
          maoTargetSource={targetSource}
          disabled={targetBlocked}
          disabledReason={targetResolutionMessage}
          className="h-11 rounded-xl px-4"
        />
        <Button type="button" variant="ghost" onClick={onEditAssumptions} className="h-11 gap-2 rounded-xl">
          <Edit3 className="size-4" aria-hidden />
          Edit assumptions
        </Button>
      </div>

      {canTunePriceCeiling ? (
        <div id={targetEditorId} hidden={!tuneOpen} className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
          <fieldset>
            <legend className="text-sm font-bold text-foreground">Price ceiling targets</legend>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Change any target and the price ceiling above updates immediately. Leave a field blank to ignore it.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {([
                ["capRate", "Target cap rate (%)"],
                ["cocReturn", "Target cash-on-cash (%)"],
                ["monthlyCashFlow", "Min cash flow ($/mo)"],
                ["dscr", "Min DSCR"],
                ["maxPurchasePrice", "Max purchase price ($)"],
              ] as const).map(([field, label]) => {
                const bounds = MAO_TARGET_BOUNDS[field];
                const inputId = `${targetEditorId}-${field}`;
                const errorId = `${inputId}-error`;
                const isCashDscr = field === "dscr" && result.monthlyPayment <= 0;
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
                      value={isCashDscr ? "" : targetInputs[field]}
                      placeholder={isCashDscr ? "N/A — cash" : "Any"}
                      disabled={isCashDscr}
                      onChange={(event) => updateTargetField(field, event.target.value)}
                      aria-invalid={Boolean(targetErrors[field])}
                      aria-describedby={targetErrors[field] ? errorId : undefined}
                      className="mt-1"
                    />
                    {targetErrors[field] ? (
                      <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-destructive">
                        {targetErrors[field]}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </div>
      ) : null}
    </section>
  );
}
