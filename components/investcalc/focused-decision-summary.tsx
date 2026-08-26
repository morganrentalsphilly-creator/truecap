"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  CopyPlus,
  Edit3,
  FileDown,
  ListTodo,
  Loader2,
  LockKeyhole,
  Save,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareLinkButton } from "@/components/investcalc/share-link-button";
import type { AnalysisResult } from "@/lib/calc-analysis";
import { computeAssumptionImpact } from "@/lib/assumption-impact";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import { meetsMaoTarget } from "@/lib/mao-target-evaluation";
import {
  applyMaoTargetInput,
  EMPTY_MAO_TARGET_ERROR,
  MAO_TARGET_BOUNDS,
  type MaoTargetField,
} from "@/lib/mao-target-editor";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type {
  OfferCeilingPresentation,
  OfferCeilingRangePreview,
  OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import type { InputConfidenceResult } from "@/lib/input-confidence";
import { trackEvent } from "@/lib/analytics";
import {
  buildAssumptionLedger,
  buildDecisionTargetContext,
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
  offerCeiling: OfferCeilingPresentation | null;
  exactBreakpointLabels?: string[];
  rangePreview?: OfferCeilingRangePreview | null;
  target: MaoTarget;
  targetLabel: string;
  targetSource: OfferCeilingTargetSource;
  targetAdopted: boolean;
  targetProfileId?: string | null;
  targetProfileVersion?: string | null;
  buyBoxName?: string | null;
  buyBoxFit?: boolean | null;
  buyBoxHasUnknownRules?: boolean;
  userDecision?: UserDecision;
  inputConfidence?: InputConfidenceResult | null;
  canShowPriceCeiling: boolean;
  canTunePriceCeiling: boolean;
  priceIsEstimated?: boolean;
  /** PDF export — the decision-first layout is the ONLY results surface, so
   *  the report the pricing page sells must be reachable from here (it was
   *  stranded in the flag-dead legacy toolbar). Click-through for non-
   *  entitled users opens the upgrade dialog upstream. */
  onExportPdf: () => void;
  isExporting?: boolean;
  isExportDisabled?: boolean;
  exportHint?: string;
  isOfferCeilingLoading?: boolean;
  offerCeilingError?: boolean;
  onRetryOfferCeiling?: () => void;
  isScenarioActive?: boolean;
  onTargetChange: (target: MaoTarget) => void;
  onAdoptTarget: () => void;
  onTuneTargetsOpened: () => void;
  onEditAssumptions: () => void;
  onSave: () => void;
  onCompareDeals: () => void | Promise<void>;
  onAnalyzeAnotherLikeThis: () => void;
  onNewAnalysis: () => void | Promise<void>;
  onUpgrade: () => void;
  isSaving: boolean;
  isComparing?: boolean;
  isSaved?: boolean;
  canCompareDeals?: boolean;
  persistedActionsBlockHint?: string;
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
  offerCeiling,
  exactBreakpointLabels = [],
  rangePreview = null,
  target,
  targetLabel,
  targetSource,
  targetAdopted,
  targetProfileId = null,
  targetProfileVersion = null,
  buyBoxName = null,
  buyBoxFit = null,
  buyBoxHasUnknownRules = false,
  userDecision = "undecided",
  inputConfidence = null,
  canShowPriceCeiling,
  canTunePriceCeiling,
  priceIsEstimated = false,
  onExportPdf,
  isExporting = false,
  isExportDisabled = false,
  exportHint,
  isOfferCeilingLoading = false,
  offerCeilingError = false,
  onRetryOfferCeiling,
  isScenarioActive = false,
  onTargetChange,
  onAdoptTarget,
  onTuneTargetsOpened,
  onEditAssumptions,
  onSave,
  onCompareDeals,
  onAnalyzeAnotherLikeThis,
  onNewAnalysis,
  onUpgrade,
  isSaving,
  isComparing = false,
  isSaved = false,
  canCompareDeals = false,
  persistedActionsBlockHint,
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
  const drivers = allDrivers.slice(0, 2);
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
    !targetAdopted
      ? "Preliminary underwriting"
      : !clearsTargets || buyBoxFit === false
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
  // Human phrasing only — the underlying contract identifiers (profileVersion,
  // rulesSnapshotVersion) are untouched. Raw slugs and schema-version suffixes
  // read as debug output on the main result, so they never render verbatim.
  const targetVersionLabel =
    targetContext.identityStatus === "screening-defaults"
      ? "example rules"
      : targetContext.profileVersion
        ? `profile v${targetContext.profileVersion}`
        : targetContext.identityStatus === "captured-rules-only"
          ? "rules recorded with this analysis"
          : "profile version unavailable";
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
  const rawDecisionLabel = !targetAdopted
    ? "Preliminary underwriting"
    : advocacyContractEnabled
      ? ruleFitLabel(ruleFit)
      : legacyDecisionLabel;
  // Render-time substitution only (the contract's ruleFitLabel identifiers are
  // pinned elsewhere): an estimated price can't be judged "at asking" in the
  // same card whose subtitle says "Est. price".
  const decisionLabel = priceIsEstimated
    ? rawDecisionLabel.replace(/ at asking\b/, " at the estimated price")
    : rawDecisionLabel;
  const breakpointLabels = [
    ...exactBreakpointLabels,
    ...drivers.map(
      (driver) =>
        `${driver.label} ${driver.deltaLabel} moves cash flow about ±${money(driver.cashFlowSwing / 2)}/mo`
    ),
  ].filter((label, index, all) => all.indexOf(label) === index).slice(0, 2);
  const nextVerification = inputConfidence?.verificationQueue[0];
  const legacyResolvedNextAction =
    !targetAdopted
      ? {
          label: "Review and adopt return targets",
          reason:
            "TrueCap only calculates a price threshold from targets you've applied — examples don't count.",
        }
      : !clearsTargets
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
      : {
          label: "Review downside and verification",
          reason:
            "The current assumptions clear the adopted rules; TrueCap does not infer the investment decision.",
        };
  const resolvedNextAction = legacyResolvedNextAction;
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
      !targetAdopted ||
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
    targetAdopted,
    targetContext.rulesSnapshotVersion,
  ]);
  const lastTargetContextTelemetryRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !advocacyContractEnabled ||
      !targetAdopted ||
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
    targetAdopted,
    targetBlocked,
    targetContext.identityStatus,
    targetContext.profileVersion,
    targetContext.rulesSnapshotVersion,
    targetContext.source,
  ]);
  const telemetryKey = offerCeiling
    ? `${targetSource}:${offerCeiling.ceiling}`
    : rangePreview
      ? `${targetSource}:${rangePreview.lower ?? "infeasible"}:${rangePreview.upper}:${rangePreview.downsideFeasible}`
      : `${targetSource}:none`;
  const lastOfferTelemetryKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!targetAdopted || targetBlocked || isOfferCeilingLoading || lastOfferTelemetryKeyRef.current === telemetryKey) return;
    lastOfferTelemetryKeyRef.current = telemetryKey;
    trackEvent("offer_ceiling_viewed", {
      target_source: targetSource,
      access_level: canShowPriceCeiling ? "exact" : "range_preview",
      decision_readiness: readinessLabel.toLowerCase().replaceAll(" ", "_"),
      has_feasible: Boolean(
        offerCeiling ||
          (rangePreview?.downsideFeasible && rangePreview.lower != null)
      ),
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
    targetAdopted,
    targetSource,
    telemetryKey,
  ]);

  const offerCeilingHeadline = !targetAdopted
    ? canTunePriceCeiling
      ? "Set targets first"
      : "Pro feature"
    : targetResolutionState === "loading"
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
              : rangePreview?.downsideFeasible && rangePreview.lower != null
                ? `${money(rangePreview.lower)}–${money(rangePreview.upper)}`
                : rangePreview
                  ? "No feasible downside case"
                  : "No feasible range";
  const offerCeilingAnnouncement = `${isScenarioActive ? "Base " : ""}Offer Ceiling: ${offerCeilingHeadline}.${
    targetAdopted && !targetBlocked ? ` Targets: ${targetLabel}.` : ""
  }`;

  return (
    <section
      aria-labelledby="decision-summary-title"
      className="rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)] sm:p-6"
    >
      <div className="space-y-4">
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
            {priceIsEstimated ? "Est. price" : "Asking"} {money(Number(values.purchasePrice))} ·
            Underwriting model v{result.methodologyVersion ?? "current"} · 10-year projection{" "}
            {result.tenYearProjectionVersion
              ? `method v${result.tenYearProjectionVersion}`
              : "method recorded-unversioned"}
          </p>
          {advocacyContractEnabled && targetAdopted ? (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              User decision: {userDecisionLabel(userDecision)}. TrueCap reports rule fit; it does not record Pursue or Pass from the metrics.
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-primary/25 bg-[var(--brand-blue-light)] p-4">
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {offerCeilingAnnouncement}
          </span>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--brand-blue-text)]">
            {isScenarioActive ? "Base Offer Ceiling" : "Offer Ceiling"}
          </p>
          <p className="mt-1 font-mono text-3xl font-extrabold tabular-nums text-primary">
            {offerCeilingHeadline}
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground">
            {!targetAdopted
              ? "Example targets are not adopted"
              : targetBlocked
              ? targetResolutionMessage
              : advocacyContractEnabled
                ? `${targetContext.profileName}${
                    targetContext.origin && targetContext.origin !== "user-selected"
                      ? ` · ${targetContext.origin.replaceAll("-", " ")}`
                      : ""
                  } · ${targetVersionLabel}`
                : `${targetSource === "buy-box" && buyBoxName ? `Under Buy Box: ${buyBoxName}` : offerCeiling?.sourceLabel ?? (targetSource === "screening-defaults" ? "Under screening defaults" : targetSource === "buy-box" ? "Under your Buy Box" : "Under your selected targets")} · ${canShowPriceCeiling ? "Exact ceiling" : "Coarse range preview"}`}
          </p>
          {!targetBlocked ? (
            <p className="mt-1 text-[11px] leading-relaxed text-foreground">
              {targetAdopted ? "Targets" : "Examples"}: {targetLabel}
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
            {!targetAdopted
              ? canTunePriceCeiling
                ? "Review or edit the example targets, then apply at least one before TrueCap calculates a modeled price threshold."
                : "TrueCap Pro calculates the highest modeled price that still meets rules you choose — like the examples above — plus the binding constraint and a screening range."
              : advocacyContractEnabled
              ? offerCeilingHelperCopy(targetContext)
              : "Calculated from the targets shown above. This is not a recommended offer."}
          </p>
          {!targetAdopted && canTunePriceCeiling && !targetBlocked ? (
            <button
              type="button"
              onClick={onAdoptTarget}
              className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-primary/30 bg-background px-3 text-xs font-bold text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Apply the example targets
            </button>
          ) : null}
          {targetAdopted ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              When price changes, percentage-based down payment, closing costs,
              tax, insurance, and debt scale with it. Rent and dollar-based
              tax, insurance, HOA, utilities, and repairs stay fixed.
            </p>
          ) : null}
          {advocacyContractEnabled ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Model output—not an appraisal, market value, acceptance prediction, or recommended offer.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="First-year investment snapshot">
          <div className="rounded-xl border border-primary/20 bg-[var(--brand-blue-light)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {isScenarioActive ? "Base cash flow after reserve" : "Cash flow after reserve"}
            </p>
            <p className="mt-1 font-mono text-xl font-extrabold tabular-nums text-foreground">
              {money(result.netCashFlow)}/mo
            </p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-[var(--brand-blue-light)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cash needed</p>
            <p className="mt-1 font-mono text-xl font-extrabold tabular-nums text-foreground">
              {money(result.totalCashRequired)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Model DSCR</p>
            <p className="mt-1 font-mono text-xl font-extrabold tabular-nums text-foreground">
              {result.monthlyPayment <= 0 ? "N/A" : result.dscr.toFixed(2)}
            </p>
            {result.monthlyPayment <= 0 ? (
              <p className="mt-1 text-[10px] text-muted-foreground">No modeled debt service</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {targetAdopted ? "Two assumptions most likely to move the decision" : "What can move the result"}
        </p>
        <ol className="mt-2 grid gap-1 text-sm font-semibold text-foreground sm:grid-cols-2">
          {breakpointLabels.map((label, index) => (
            <li key={label}><span className="text-muted-foreground">{index + 1}.</span> {label}</li>
          ))}
        </ol>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4" aria-label="Primary result actions">
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
            {targetAdopted ? "Tune targets" : "Set targets"}
            <ChevronDown className={`size-4 transition-transform ${tuneOpen ? "rotate-180" : ""}`} aria-hidden />
          </Button>
        ) : !targetAdopted ? (
          <Button
            type="button"
            onClick={onUpgrade}
            className="min-h-11 gap-2 rounded-xl"
          >
            <LockKeyhole className="size-4" aria-hidden />
            Unlock target price
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          disabled={isSaving || targetBlocked}
          title={isSaveLocked ? saveLockedHint : undefined}
          className="h-11 gap-2 rounded-xl"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          Save
          {isSaveLocked ? (
            <span className="ml-0.5 rounded-full bg-[var(--brand-orange)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
              PRO
            </span>
          ) : null}
        </Button>
        <ShareLinkButton
          values={values}
          isAuthenticated={isAuthenticated}
          savedDealId={savedDealId}
          priceIsEstimated={priceIsEstimated}
          maoTarget={targetAdopted ? target : undefined}
          maoTargetSource={targetAdopted ? targetSource : undefined}
          disabled={targetBlocked}
          disabledReason={targetResolutionMessage}
          onPrepareAuth={onPrepareAuthShare}
          className="h-11 rounded-xl px-4"
        />
      </div>

      <details className="group mt-2 rounded-xl border border-border bg-muted/20 px-2 py-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          Decision context and key numbers
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-3 border-t border-border px-2 py-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Secondary first-year metrics">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Annual NOI</p>
              <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-foreground">
                {money(result.noiAnnual)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cap rate</p>
              <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-foreground">
                {result.capRate.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cash-on-cash</p>
              <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-foreground">
                {result.cocReturn.toFixed(2)}%
              </p>
            </div>
          </div>

          <div
            className={`grid grid-cols-2 gap-3 ${advocacyContractEnabled ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
          >
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {advocacyContractEnabled ? "Target profile" : "Target rules"}
              </p>
              <p className="mt-1 text-sm font-extrabold text-foreground">
                {!targetAdopted
                  ? "Not adopted"
                  : advocacyContractEnabled
                    ? targetContext.profileName
                    : targetSource !== "buy-box"
                      ? "Selected targets"
                      : buyBoxFit == null
                        ? "Checking…"
                        : buyBoxFit
                          ? "Meets"
                          : "Misses"}
              </p>
              {advocacyContractEnabled ? (
                <>
                  {targetAdopted ? (
                    <p className="mt-1 break-all text-[10px] text-muted-foreground">
                      {targetVersionLabel}
                    </p>
                  ) : null}
                  <p className="mt-1 break-all text-[10px] text-muted-foreground">
                    Exact criteria are shown with the Offer Ceiling.
                  </p>
                </>
              ) : null}
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {advocacyContractEnabled ? "Evidence readiness" : "Assumption status"}
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
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">User decision</p>
                <p className="mt-1 text-sm font-extrabold text-foreground">
                  {userDecisionLabel(userDecision)}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">Never inferred from model outputs</p>
              </div>
            ) : null}
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Margin of Safety</p>
              <p className="mt-1 text-sm font-extrabold text-foreground">
                {!targetAdopted
                  ? "—"
                  : offerCeiling
                    ? offerCeiling.listPriceGap > 0
                      ? `${money(offerCeiling.listPriceGap)} above ceiling`
                      : offerCeiling.listPriceGap < 0
                        ? `${money(Math.abs(offerCeiling.listPriceGap))} below ceiling`
                        : "At the ceiling"
                    : rangePreview?.downsideFeasible && rangePreview.lower != null
                      ? Number(values.purchasePrice) > rangePreview.upper
                        ? `${money(Number(values.purchasePrice) - rangePreview.upper)} above preview`
                        : Number(values.purchasePrice) < rangePreview.lower
                          ? `${money(rangePreview.lower - Number(values.purchasePrice))} below preview`
                          : "Inside preview range"
                      : rangePreview
                        ? "Downside misses targets at every supported price"
                        : "Not available"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-[var(--brand-blue-light)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/80">Next action</p>
            <p className="mt-1 text-sm font-extrabold text-foreground">{resolvedNextAction?.label ?? "Verify the material assumptions"}</p>
            {resolvedNextAction?.reason ? (
              <p className="mt-1 text-[10px] leading-relaxed text-foreground/80">{resolvedNextAction.reason}</p>
            ) : null}
          </div>
        </div>
      </details>

      <details className="group mt-2 rounded-xl border border-border bg-muted/20 px-2 py-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          More actions
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="flex flex-wrap gap-2 border-t border-border px-2 py-3" aria-label="Secondary result actions">
        <Button
          type="button"
          variant="outline"
          onClick={onExportPdf}
          disabled={targetBlocked || isExportDisabled}
          title={exportHint}
          className="h-11 gap-2 rounded-xl"
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <FileDown className="size-4" aria-hidden />
          )}
          Export PDF
        </Button>
        <Button type="button" variant="ghost" onClick={onEditAssumptions} className="h-11 gap-2 rounded-xl">
          <Edit3 className="size-4" aria-hidden />
          Edit assumptions
        </Button>
        {canCompareDeals ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void onCompareDeals()}
            disabled={!isSaved || isComparing}
            aria-label={
              !isSaved
                ? "Compare deals — save this analysis first"
                : "Compare deals"
            }
            title={
              !isSaved
                ? persistedActionsBlockHint ?? "Save this analysis before comparing it."
                : undefined
            }
            className="min-h-11 gap-2 rounded-xl"
          >
            {isComparing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ListTodo className="size-4" aria-hidden />
            )}
            Compare deals
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={onUpgrade}
            className="min-h-11 gap-2 rounded-xl"
          >
            <ListTodo className="size-4" aria-hidden />
            Compare with Pro
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onAnalyzeAnotherLikeThis}
          className="min-h-11 gap-2 rounded-xl"
          title="Keeps reusable assumptions and clears property-specific values"
        >
          <CopyPlus className="size-4" aria-hidden />
          Analyze another like this
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void onNewAnalysis()}
          className="min-h-11 gap-2 rounded-xl"
        >
          <Sparkles className="size-4" aria-hidden />
          New analysis
        </Button>
        </div>
        {canCompareDeals && !isSaved ? (
          <p className="px-2 pb-3 text-xs text-muted-foreground" role="status">
            Save this analysis to compare it with another deal.
          </p>
        ) : null}
      </details>

      {canTunePriceCeiling ? (
        <div id={targetEditorId} hidden={!tuneOpen} className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
          <fieldset>
            <legend className="text-sm font-bold text-foreground">
              Offer Ceiling rules
            </legend>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {targetAdopted
                ? "Change any target and the Offer Ceiling above updates immediately. Leave a field blank to ignore it."
                : "These are product examples, not your targets. Review or change them, then apply the rule set to calculate a modeled threshold."}
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
            {!targetAdopted ? (
              <Button
                type="button"
                onClick={onAdoptTarget}
                disabled={Object.values(targetErrors).some(Boolean)}
                className="mt-4 min-h-11 rounded-xl"
              >
                Apply these targets
              </Button>
            ) : null}
          </fieldset>
        </div>
      ) : null}
    </section>
  );
}
