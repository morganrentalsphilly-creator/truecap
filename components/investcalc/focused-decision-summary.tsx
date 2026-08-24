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
import {
  buildAssumptionLedger,
  buildDecisionTargetContext,
  buildSafeNextAction,
  deriveRuleFit,
  offerCeilingHelperCopy,
  offerCeilingSemanticStatus,
  ruleFitLabel,
  userDecisionLabel,
  type AssumptionSensitivity,
  type UserDecision,
} from "@/lib/decision-contract";

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
  targetProfileId?: string | null;
  targetProfileVersion?: string | null;
  buyBoxName?: string | null;
  buyBoxFit?: boolean | null;
  buyBoxHasUnknownRules?: boolean;
  userDecision?: UserDecision;
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
  isAuthenticated: boolean;
  onPrepareAuthShare?: () => void;
  targetResolutionState?: "loading" | "ready" | "error";
  targetResolutionMessage?: string;
  advocacyContractEnabled?: boolean;
};

type TargetDeltaNotice = {
  previousRulesSnapshotVersion: string;
  delta: number | null;
  message: string;
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

const IMPACT_TO_CONFIDENCE_KEY = {
  rent: "rent",
  interestRate: "interestRate",
  purchasePrice: "purchasePrice",
  vacancyPct: "vacancy",
  mgmtPct: "management",
  maintenancePct: "maintenance",
  capexPct: "capex",
  propertyTaxPct: "propertyTax",
} as const;

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
  targetProfileId = null,
  targetProfileVersion = null,
  buyBoxName = null,
  buyBoxFit = null,
  buyBoxHasUnknownRules = false,
  userDecision = "undecided",
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
  isAuthenticated,
  onPrepareAuthShare,
  targetResolutionState = "ready",
  targetResolutionMessage,
  advocacyContractEnabled = false,
}: Props) {
  const allDrivers = useMemo(() => computeAssumptionImpact(values), [values]);
  const drivers = allDrivers.slice(0, 3);
  const assumptionSensitivity = useMemo(
    () =>
      Object.fromEntries(
        allDrivers.flatMap((driver) => {
          const key =
            IMPACT_TO_CONFIDENCE_KEY[
              driver.key as keyof typeof IMPACT_TO_CONFIDENCE_KEY
            ];
          return key
            ? [
                [
                  key,
                  {
                    cashFlowSwing: driver.cashFlowSwing,
                    dscrSwing: driver.dscrSwing,
                    deltaLabel: driver.deltaLabel,
                  } satisfies AssumptionSensitivity,
                ],
              ]
            : [];
        })
      ),
    [allDrivers]
  );
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
  const legacyReadinessLabel =
    inputConfidence?.stage === "offer-ready"
      ? "Ready"
      : inputConfidence?.stage === "verified"
        ? "Verify first"
        : "Screening only";
  const legacyDecisionLabel =
    !clearsTargets || buyBoxFit === false
      ? "Does not meet selected rules at asking"
      : "Meets selected rules at asking";
  const targetContext = useMemo(
    () =>
      buildDecisionTargetContext({
        target,
        source: targetSource,
        profileId: targetProfileId,
        profileName: buyBoxName,
        profileVersion: targetProfileVersion,
        inherited: targetSource === "buy-box" && !targetProfileId,
      }),
    [buyBoxName, target, targetProfileId, targetProfileVersion, targetSource]
  );
  const evidenceLedger = useMemo(
    () =>
      inputConfidence
        ? buildAssumptionLedger(inputConfidence, {
            sensitivity: assumptionSensitivity,
          })
        : null,
    [assumptionSensitivity, inputConfidence]
  );
  const targetVersionLabel = targetContext.profileVersion
    ? `profile v${targetContext.profileVersion}`
    : targetContext.identityStatus === "captured-rules-only"
      ? "captured rules · schema v1"
      : "profile version unavailable · schema v1";
  const ruleFit = deriveRuleFit({
    result,
    target,
    targetResolutionState,
    targetSource,
    buyBoxFit,
    hasUnevaluableSelectedRules: buyBoxHasUnknownRules,
  });
  const readinessLabel = advocacyContractEnabled
    ? evidenceLedger?.readinessLabel ?? "Screening"
    : legacyReadinessLabel;
  const decisionLabel = advocacyContractEnabled
    ? ruleFitLabel(ruleFit)
    : legacyDecisionLabel;
  const breakpointLabels = [
    ...exactBreakpointLabels,
    ...drivers.map(
      (driver) =>
        `${driver.label} ${driver.deltaLabel} moves cash flow about ±${money(driver.cashFlowSwing / 2)}/mo`
    ),
  ].filter((label, index, all) => all.indexOf(label) === index).slice(0, 3);
  const nextVerification = inputConfidence?.verificationQueue[0];
  const legacyResolvedNextAction =
    !clearsTargets
      ? offerCeiling
        ? {
            label: "Review the binding target rule",
            reason:
              offerCeiling.listPriceGap > 0
                ? `The asking price is ${money(offerCeiling.listPriceGap)} above the Offer Ceiling under the selected rules. Record the investment decision yourself.`
                : "The current price misses at least one selected rule. Record the investment decision yourself.",
          }
        : {
            label: "Review the active target rules",
            reason: "No qualifying Offer Ceiling was found under the current assumptions. Record the investment decision yourself.",
          }
      : legacyReadinessLabel !== "Ready" && nextVerification
      ? {
          label: nextVerification.verifyAction ?? `Verify ${nextVerification.label}`,
          reason: `${nextVerification.label} is a material ${nextVerification.sourceLabel.toLowerCase()} input`,
        }
      : nextAction;
  const resolvedNextAction = advocacyContractEnabled
    ? buildSafeNextAction({ ruleFit, evidence: evidenceLedger, userDecision })
    : legacyResolvedNextAction;
  const ceilingSemanticStatus = offerCeilingSemanticStatus({
    presentation: offerCeiling,
    target,
  });
  const targetBlocked = targetResolutionState !== "ready";
  const lastResolvedTargetRef = useRef<{
    rulesSnapshotVersion: string;
    ceiling: number | null;
  } | null>(null);
  const [targetDeltaNotice, setTargetDeltaNotice] =
    useState<TargetDeltaNotice | null>(null);
  const decisionAnalysisKey = `${values.address.trim().toLowerCase()}|${values.purchasePrice}`;
  useEffect(() => {
    lastResolvedTargetRef.current = null;
    setTargetDeltaNotice(null);
  }, [decisionAnalysisKey]);
  useEffect(() => {
    if (
      !advocacyContractEnabled ||
      targetBlocked ||
      isOfferCeilingLoading ||
      offerCeilingError
    ) {
      return;
    }
    const currentCeiling = offerCeiling?.ceiling ?? null;
    const previous = lastResolvedTargetRef.current;
    if (
      previous &&
      previous.rulesSnapshotVersion !== targetContext.rulesSnapshotVersion
    ) {
      const delta =
        previous.ceiling != null && currentCeiling != null
          ? currentCeiling - previous.ceiling
          : null;
      setTargetDeltaNotice({
        previousRulesSnapshotVersion: previous.rulesSnapshotVersion,
        delta,
        message:
          delta != null
            ? `Offer Ceiling ${delta >= 0 ? "increased" : "decreased"} by ${money(
                Math.abs(delta)
              )} versus the prior resolved rules.`
            : canShowPriceCeiling
              ? "The target rules changed, and one of the two rule sets has no feasible finite Offer Ceiling for comparison."
              : "The target rules changed. An exact delta is unavailable in range-preview access.",
      });
    }
    lastResolvedTargetRef.current = {
      rulesSnapshotVersion: targetContext.rulesSnapshotVersion,
      ceiling: currentCeiling,
    };
  }, [
    advocacyContractEnabled,
    canShowPriceCeiling,
    isOfferCeilingLoading,
    offerCeiling?.ceiling,
    offerCeilingError,
    targetBlocked,
    targetContext.rulesSnapshotVersion,
  ]);
  const lastTargetContextTelemetryRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !advocacyContractEnabled ||
      targetBlocked ||
      lastTargetContextTelemetryRef.current === targetContext.rulesSnapshotVersion
    ) {
      return;
    }
    lastTargetContextTelemetryRef.current = targetContext.rulesSnapshotVersion;
    trackEvent("target_context_set", {
      model_version: result.methodologyVersion ?? "current",
      rule_set_version:
        targetContext.profileVersion ?? targetContext.identityStatus,
      target_source: targetContext.source,
      surface: "focused_decision_summary",
    });
  }, [
    advocacyContractEnabled,
    result.methodologyVersion,
    targetBlocked,
    targetContext.identityStatus,
    targetContext.profileVersion,
    targetContext.rulesSnapshotVersion,
    targetContext.source,
  ]);
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
            Asking {money(Number(values.purchasePrice))}
            {advocacyContractEnabled
              ? ` · Underwriting model v${result.methodologyVersion ?? "current"}`
              : ` · ${tier} fundamentals`}
            {score != null && !(advocacyContractEnabled && result.monthlyPayment <= 0)
              ? advocacyContractEnabled
                ? ` · Screening Index ${score}/100 — secondary heuristic (v${result.methodologyVersion ?? "current"})`
                : ` · Screening Index ${score}/100 (v${result.methodologyVersion ?? "current"})`
              : ""}
          </p>
          {advocacyContractEnabled && result.monthlyPayment <= 0 && score != null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Screening Index is withheld in this decision view because Methodology v1 assigns synthetic DSCR credit to cash acquisitions. DSCR is N/A.
            </p>
          ) : null}
          {advocacyContractEnabled ? (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              User decision: {userDecisionLabel(userDecision)}. TrueCap reports rule fit; it does not record Pursue or Pass from the metrics.
            </p>
          ) : null}
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
              ? advocacyContractEnabled
                ? "Loading target rules…"
                : "Loading your Buy Box…"
              : targetResolutionState === "error"
                ? advocacyContractEnabled
                  ? "Target rules unavailable"
                  : "Buy Box unavailable"
                : isOfferCeilingLoading
                  ? "Calculating…"
                : offerCeilingError
                  ? "Temporarily unavailable"
                : canShowPriceCeiling
                  ? advocacyContractEnabled &&
                    ceilingSemanticStatus === "no-finite-ceiling-in-supported-range"
                    ? "No finite ceiling found"
                    : offerCeiling
                      ? money(offerCeiling.ceiling)
                      : "Not reachable"
                  : rangePreview
                    ? `${money(rangePreview.lower)}–${money(rangePreview.upper)}`
                    : "No feasible range"}
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground">
            {targetBlocked
              ? targetResolutionMessage
              : advocacyContractEnabled
                ? `${targetContext.profileName} · ${targetContext.origin.replaceAll("-", " ")} · ${targetVersionLabel}`
                : `${targetSource === "buy-box" && buyBoxName ? `Under Buy Box: ${buyBoxName}` : offerCeiling?.sourceLabel ?? (targetSource === "screening-defaults" ? "Under screening defaults" : targetSource === "buy-box" ? "Under your Buy Box" : "Under your selected targets")} · ${canShowPriceCeiling ? "Exact ceiling" : "Coarse range preview"}`}
          </p>
          {!targetBlocked ? (
            <p className="mt-1 text-[11px] leading-relaxed text-foreground">
              Targets: {targetLabel}
            </p>
          ) : null}
          {advocacyContractEnabled && targetDeltaNotice ? (
            <p className="mt-2 rounded-md border border-primary/20 bg-background/70 px-2 py-1.5 text-[11px] leading-relaxed text-foreground">
              {targetDeltaNotice.message} The prior target criteria remain preserved in the previous snapshot.
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
            {advocacyContractEnabled
              ? offerCeilingHelperCopy(targetContext)
              : "Calculated from the targets shown above. This is not a recommended offer."}
          </p>
          {advocacyContractEnabled ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Model output—not an appraisal, market value, acceptance prediction, or recommended offer.
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={`mt-4 grid grid-cols-2 gap-3 ${advocacyContractEnabled ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}
      >
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {advocacyContractEnabled ? "Target profile" : "Buy Box Fit"}
          </p>
          <p className="mt-1 text-sm font-extrabold text-foreground">
            {advocacyContractEnabled
              ? targetContext.profileName
              : targetSource !== "buy-box"
                ? "No Buy Box selected"
                : buyBoxFit == null
                  ? "Checking…"
                  : buyBoxFit
                    ? "Meets"
                    : "Misses"}
          </p>
          {advocacyContractEnabled ? (
            <>
              <p className="mt-1 break-all text-[10px] text-muted-foreground">
                {targetVersionLabel}
              </p>
              <p className="mt-1 break-all text-[10px] text-muted-foreground">
                Exact criteria are shown with the Offer Ceiling.
              </p>
            </>
          ) : null}
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {advocacyContractEnabled ? "Evidence readiness" : "Decision Readiness"}
          </p>
          <p className="mt-1 text-sm font-extrabold text-foreground">{readinessLabel}</p>
          {advocacyContractEnabled && evidenceLedger ? (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {evidenceLedger.evidenceVerifiedCount} of {evidenceLedger.materialInputCount} material inputs evidence-verified
            </p>
          ) : nextVerification ? (
            <p className="mt-1 text-[10px] text-muted-foreground">Weakest material input: {nextVerification.label}</p>
          ) : null}
          {advocacyContractEnabled && evidenceLedger?.highestImpactUnresolved ? (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {evidenceLedger.highestImpactUnresolved.materialityScore != null
                ? "Highest-impact unresolved"
                : "Next unresolved input"}
              : {evidenceLedger.highestImpactUnresolved.label}
            </p>
          ) : null}
        </div>
        {advocacyContractEnabled ? (
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">User decision</p>
            <p className="mt-1 text-sm font-extrabold text-foreground">
              {userDecisionLabel(userDecision)}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">Never inferred from model outputs</p>
          </div>
        ) : null}
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
          isAuthenticated={isAuthenticated}
          savedDealId={savedDealId}
          maoTarget={target}
          maoTargetSource={targetSource}
          disabled={targetBlocked}
          disabledReason={targetResolutionMessage}
          onPrepareAuth={onPrepareAuthShare}
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
            <legend className="text-sm font-bold text-foreground">
              Offer Ceiling rules
            </legend>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Change any target and the Offer Ceiling above updates immediately. Leave a field blank to ignore it.
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
