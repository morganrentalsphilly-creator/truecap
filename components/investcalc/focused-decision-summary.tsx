"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
  EMPTY_MAO_TARGET_ERROR,
  MAO_TARGET_BOUNDS,
  maoTargetFingerprint,
  type MaoTargetField,
} from "@/lib/mao-target-editor";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { AnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import type { OfferCeilingDecisionBasis } from "@/lib/offer-ceiling-decision-basis";
import type {
  OfferCeilingPresentation,
  OfferCeilingRangePreview,
  OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import type { InputConfidenceResult } from "@/lib/input-confidence";
import { trackEvent } from "@/lib/analytics";
import { scrollBehavior } from "@/lib/utils";
import { NO_DEBT_SERVICE_DSCR_LABEL } from "@/lib/financial-presentation";
import {
  buildDecisionTargetContext,
  deriveRuleFit,
  offerCeilingSemanticStatus,
  ruleFitLabel,
  userDecisionLabel,
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
  /** Failure shape from the resolver; null while ok/loading. RATE_LIMITED
   *  must not render retry advice — waiting is the only thing that works. */
  offerCeilingErrorCode?:
    | "VALIDATION_ERROR"
    | "RATE_LIMITED"
    | "SERVER_ERROR"
    | "NETWORK"
    | null;
  onRetryOfferCeiling?: () => void;
  isScenarioActive?: boolean;
  onTargetChange: (target: MaoTarget) => void;
  onAdoptTarget: () => void;
  onTuneTargetsOpened: () => void;
  /** Keep lower result actions from bypassing unapplied/invalid criteria. */
  onTargetDraftBlockingChange?: (blocked: boolean) => void;
  onEditAssumptions: () => void;
  onSave: () => void;
  onCompareDeals: (
    maoTarget?: MaoTarget,
    source?: OfferCeilingTargetSource,
  ) => void | Promise<void>;
  onAnalyzeAnotherLikeThis: () => void;
  onNewAnalysis: () => void | Promise<void>;
  onUpgrade: () => void;
  isSaving: boolean;
  isComparing?: boolean;
  isSaved?: boolean;
  canCompareDeals?: boolean;
  isSaveLocked?: boolean;
  saveLockedHint?: string;
  savedDealId?: string | null;
  isAuthenticated: boolean;
  onPrepareAuthShare?: () => void;
  targetResolutionState?: "loading" | "ready" | "error";
  targetResolutionMessage?: string;
  advocacyContractEnabled?: boolean;
  analyzerStrategyKey?: AnalyzerStrategyKey;
  adoptedDecisionBasis?: OfferCeilingDecisionBasis | null;
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

const TARGET_FIELDS = [
  ["capRate", "Target cap rate (%)"],
  ["cocReturn", "Target cash-on-cash (%)"],
  ["monthlyCashFlow", "Min cash flow ($/mo)"],
  ["dscr", "Min DSCR"],
  ["minIrrPct", "Min 10-year pre-tax IRR (%)"],
  ["maxCashRequired", "Max cash required ($)"],
  ["maxPurchasePrice", "Max purchase price ($)"],
] as const satisfies ReadonlyArray<readonly [MaoTargetField, string]>;

export type TargetInputs = Record<MaoTargetField, string>;
type TargetDraftValidation = {
  target: MaoTarget | null;
  errors: Partial<Record<MaoTargetField, string>>;
  formError: string | null;
};

function inputsFromTarget(target: MaoTarget): TargetInputs {
  return {
    capRate: targetInput(target.capRate),
    cocReturn: targetInput(target.cocReturn),
    monthlyCashFlow: targetInput(target.monthlyCashFlow),
    dscr: targetInput(target.dscr),
    minIrrPct: targetInput(target.minIrrPct),
    maxCashRequired: targetInput(target.maxCashRequired),
    maxPurchasePrice: targetInput(target.maxPurchasePrice),
  };
}

/** Validate the whole draft atomically. Field-by-field commits made it
 * possible for the visible editor to disagree with Save/Share/PDF. */
export function validateTargetDraft(
  inputs: TargetInputs,
  options: { isCashPurchase: boolean },
): TargetDraftValidation {
  const target: MaoTarget = {};
  const errors: Partial<Record<MaoTargetField, string>> = {};

  for (const [field] of TARGET_FIELDS) {
    if (options.isCashPurchase && field === "dscr") continue;
    const rawValue = inputs[field].trim();
    if (!rawValue) continue;

    const value = Number(rawValue);
    const bounds = MAO_TARGET_BOUNDS[field];
    if (!Number.isFinite(value) || value < bounds.min || value > bounds.max) {
      errors[field] =
        `${bounds.label} must be between ${bounds.min.toLocaleString()} and ${bounds.max.toLocaleString()}.`;
      continue;
    }
    const stepCount = (value - bounds.min) / bounds.step;
    if (Math.abs(stepCount - Math.round(stepCount)) > 1e-8) {
      errors[field] = `${bounds.label} must use increments of ${bounds.step}.`;
      continue;
    }
    target[field] = value;
  }

  if (Object.keys(errors).length > 0) {
    return { target: null, errors, formError: null };
  }
  if (!Object.values(target).some((value) => value !== undefined)) {
    return { target: null, errors, formError: EMPTY_MAO_TARGET_ERROR };
  }
  return { target, errors, formError: null };
}

/**
 * Says whether one metric clears its target, in words as well as colour.
 *
 * Without this the two tiles rendered identically whether the number passed or
 * failed, so a reader had to hold "$554 vs $750" and "1.52 vs 1.25" in their
 * head to work out WHICH rule the deal missed — on the card whose whole job is
 * to answer that. Colour alone would not fix it either: the pass/fail word is
 * what carries the meaning for a colour-blind reader and for a screen reader.
 */
function TargetFit({ meets, target }: { meets: boolean; target: string }) {
  return (
    <p
      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        meets ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
      }`}
    >
      {meets ? "Meets" : "Misses"} {target}
    </p>
  );
}

function FirstYearSnapshot({
  result,
  isScenarioActive,
  target,
}: {
  result: AnalysisResult;
  isScenarioActive: boolean;
  /** Adopted targets, when any. Absent on the no-criteria path. */
  target?: MaoTarget;
}) {
  const cashFlowTarget = target?.monthlyCashFlow;
  const dscrTarget = target?.dscr;
  // A cash purchase has no debt service, so DSCR is N/A rather than failing.
  const dscrApplies = result.monthlyPayment > 0;
  return (
    <div
      className="grid grid-cols-1 gap-3 min-[280px]:grid-cols-2"
      aria-label="First-year investment snapshot"
    >
      <div className="rounded-xl border border-primary/20 bg-[var(--brand-blue-light)] p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {isScenarioActive
            ? "Base cash flow after reserve"
            : "Cash flow after reserve"}
        </p>
        <p className="mt-1 font-mono text-xl font-extrabold tabular-nums text-foreground">
          {money(result.netCashFlow)}/mo
        </p>
        {typeof cashFlowTarget === "number" ? (
          <TargetFit
            meets={result.netCashFlow >= cashFlowTarget}
            target={`${money(cashFlowTarget)}/mo target`}
          />
        ) : null}
      </div>
      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Model DSCR
        </p>
        <p className="mt-1 font-mono text-xl font-extrabold tabular-nums text-foreground">
          {dscrApplies ? result.dscr.toFixed(2) : NO_DEBT_SERVICE_DSCR_LABEL}
        </p>
        {!dscrApplies ? (
          <p className="mt-1 text-[10px] text-muted-foreground">
            No modeled debt service
          </p>
        ) : typeof dscrTarget === "number" ? (
          <TargetFit
            meets={result.dscr >= dscrTarget}
            target={`${dscrTarget.toFixed(2)} target`}
          />
        ) : null}
      </div>
    </div>
  );
}

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
  offerCeilingErrorCode = null,
  onRetryOfferCeiling,
  isScenarioActive = false,
  onTargetChange,
  onAdoptTarget,
  onTuneTargetsOpened,
  onTargetDraftBlockingChange,
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
  isSaveLocked = false,
  saveLockedHint,
  savedDealId,
  isAuthenticated,
  onPrepareAuthShare,
  targetResolutionState = "ready",
  targetResolutionMessage,
  advocacyContractEnabled = false,
  analyzerStrategyKey = "buy-hold",
  adoptedDecisionBasis,
}: Props) {
  const allDrivers = useMemo(() => computeAssumptionImpact(values), [values]);
  const drivers = allDrivers.slice(0, 2);
  const targetEditorId = useId();
  const targetEditorRef = useRef<HTMLDivElement | null>(null);
  const [tuneOpen, setTuneOpen] = useState(false);
  const [targetInputs, setTargetInputs] = useState<TargetInputs>(() =>
    inputsFromTarget(target),
  );
  const targetKey = JSON.stringify(target);
  const previousTargetKeyRef = useRef(targetKey);

  // Buy-box, sample, or another visible target surface can resolve after first
  // paint. The parent is authoritative after an explicit commit, so replace
  // this draft only when that committed target actually changes.
  useEffect(() => {
    if (previousTargetKeyRef.current === targetKey) return;
    previousTargetKeyRef.current = targetKey;
    setTargetInputs(inputsFromTarget(target));
  }, [target, targetKey]);

  // Keep the interaction anchored to the control that opened it. The editor
  // used to render after every decision card and the secondary action panel,
  // so Tune criteria appeared to do nothing on a phone and forced desktop
  // users to hunt below the fold. Reveal, scroll, and focus as one action.
  useEffect(() => {
    if (!tuneOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const editor = targetEditorRef.current;
      if (!editor) return;
      editor.scrollIntoView({
        behavior: scrollBehavior(),
        block: "nearest",
      });
      editor
        .querySelector<HTMLInputElement>("input:not([disabled])")
        ?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tuneOpen]);

  const isCashPurchase = result.monthlyPayment <= 0;
  const targetDraftValidation = useMemo(
    () => validateTargetDraft(targetInputs, { isCashPurchase }),
    [isCashPurchase, targetInputs],
  );
  const draftTargetFingerprint = targetDraftValidation.target
    ? maoTargetFingerprint(targetDraftValidation.target)
    : null;
  const committedTargetFingerprint = maoTargetFingerprint(target);
  const canonicalInputsKey = JSON.stringify(inputsFromTarget(target));
  const targetDraftDirty = targetDraftValidation.target
    ? draftTargetFingerprint !== committedTargetFingerprint
    : JSON.stringify(targetInputs) !== canonicalInputsKey;
  const targetDraftInvalid = Boolean(
    targetDraftValidation.formError ||
    Object.values(targetDraftValidation.errors).some(Boolean),
  );
  const targetDraftBlocksActions = targetDraftDirty || targetDraftInvalid;

  useEffect(() => {
    onTargetDraftBlockingChange?.(targetDraftBlocksActions);
  }, [onTargetDraftBlockingChange, targetDraftBlocksActions]);
  useEffect(
    () => () => onTargetDraftBlockingChange?.(false),
    [onTargetDraftBlockingChange],
  );

  const resetTargetDraft = () => {
    setTargetInputs(inputsFromTarget(target));
  };

  const applyTargetDraft = () => {
    const nextTarget = targetDraftValidation.target;
    if (!nextTarget) return;
    if (
      !targetAdopted &&
      maoTargetFingerprint(nextTarget) === committedTargetFingerprint
    ) {
      onAdoptTarget();
    } else {
      onTargetChange(nextTarget);
    }
    setTargetInputs(inputsFromTarget(nextTarget));
    setTuneOpen(false);
  };
  // The verdict must reconcile with the exact ceiling shown beside it. A deal
  // can have positive cash flow and still miss the selected $/mo or DSCR bar.
  const clearsTargets = meetsMaoTarget(result, target, values);
  const legacyReadinessLabel =
    inputConfidence?.stage === "offer-ready"
      ? "Ready"
      : inputConfidence?.stage === "verified"
        ? "Verify first"
        : "Screening only";
  const legacyDecisionLabel = !targetAdopted
    ? result.netCashFlow >= 0
      ? "Positive operating screen at entered assumptions"
      : "Negative operating screen at entered assumptions"
    : !clearsTargets || buyBoxFit === false
      ? targetSource === "starter-criteria"
        ? "Does not meet TrueCap starter criteria at asking"
        : "Does not meet selected rules at asking"
      : targetSource === "starter-criteria"
        ? "Meets TrueCap starter criteria at asking"
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
    [buyBoxName, target, targetProfileId, targetProfileVersion, targetSource],
  );
  const isSampleCriteria =
    targetProfileId === "truecap-synthetic-sample-target";
  const displayAddress = isSampleCriteria
    ? "Philadelphia rental example"
    : values.address;
  // Human phrasing only — the underlying contract identifiers (profileVersion,
  // rulesSnapshotVersion) are untouched. Raw slugs and schema-version suffixes
  // read as debug output on the main result, so they never render verbatim.
  const targetVersionLabel = isSampleCriteria
    ? "example criteria profile"
    : targetSource === "starter-criteria"
      ? "TrueCap starter criteria"
      : targetContext.identityStatus === "screening-defaults"
        ? "example rules"
        : targetContext.profileVersion
          ? `profile v${targetContext.profileVersion}`
          : targetContext.identityStatus === "captured-rules-only"
            ? "rules recorded with this analysis"
            : "profile version unavailable";
  const ruleFit = deriveRuleFit({
    result,
    values,
    target,
    targetResolutionState,
    targetSource,
    buyBoxFit,
    hasUnevaluableSelectedRules: buyBoxHasUnknownRules,
  });
  const readinessLabel = advocacyContractEnabled
    ? "Screening only"
    : legacyReadinessLabel;
  const rawDecisionLabel = !targetAdopted
    ? result.netCashFlow >= 0
      ? "Positive operating screen at entered assumptions"
      : "Negative operating screen at entered assumptions"
    : advocacyContractEnabled
      ? isSampleCriteria
        ? ruleFitLabel(ruleFit).replace("selected rules", "sample criteria")
        : targetSource === "starter-criteria"
          ? ruleFitLabel(ruleFit).replace(
              "selected rules",
              "TrueCap starter criteria",
            )
          : ruleFitLabel(ruleFit)
      : legacyDecisionLabel;
  // Render-time substitution only (the contract's ruleFitLabel identifiers are
  // pinned elsewhere): an estimated price can't be judged "at asking" in the
  // same card whose subtitle says "Est. price".
  const sourceAwareDecisionLabel = isSampleCriteria
    ? rawDecisionLabel.replace("selected rules", "sample criteria")
    : rawDecisionLabel;
  const decisionLabel = priceIsEstimated
    ? sourceAwareDecisionLabel.replace(
        / at asking\b/,
        " at the estimated price",
      )
    : sourceAwareDecisionLabel;
  const viabilityLabels = exactBreakpointLabels.slice(0, 2);
  const sensitivityLabels = drivers
    .map(
      (driver) =>
        `${driver.label} ${driver.deltaLabel} moves cash flow about ±${money(driver.cashFlowSwing / 2)}/mo`,
    )
    .filter((label, index, all) => all.indexOf(label) === index)
    .slice(0, 2);
  const nextVerification = inputConfidence?.verificationQueue[0];
  // The disclosure further down already prints "Binding: Cash flow ≥ $750/mo"
  // from this exact data — but it lives inside a collapsed accordion. The
  // next-step block, which is the line the user actually reads, said "Review
  // the binding target rule" and never named it. The single most
  // decision-relevant fact was one click away from the sentence telling you to
  // go look at it.
  const bindingCriterionLabel =
    offerCeiling?.bindingConstraints
      ?.map((item) => item.criterion)
      .filter(Boolean)
      .join(" + ") ?? "";

  const legacyResolvedNextAction = !targetAdopted
    ? canTunePriceCeiling
      ? {
          label: "Choose the criteria for your Offer Ceiling",
          reason:
            "The operating screen is complete. Apply at least one return criterion only if you want TrueCap to calculate a modeled price threshold.",
        }
      : advocacyContractEnabled
        ? {
            label: "Review the operating screen",
            reason:
              "No investor criteria are attached, so TrueCap is showing the entered economics without inferring a Pursue or Pass decision.",
          }
      : {
          label:
            nextVerification?.verifyAction ??
            "Review risks and verify the assumptions",
          reason: nextVerification
            ? `${nextVerification.label} is the next material input to verify before making your own decision.`
            : "The operating economics above are available now. Review the downside and verify the assumptions before making your own decision.",
        }
    : !clearsTargets
      ? offerCeiling
        ? {
            label: bindingCriterionLabel
              ? `Review the binding rule: ${bindingCriterionLabel}`
              : "Review the binding target rule",
            reason:
              offerCeiling.listPriceGap > 0
                ? `${bindingCriterionLabel ? `${bindingCriterionLabel} is what caps the price. ` : ""}The asking price is ${money(offerCeiling.listPriceGap)} above the Offer Ceiling under the selected rules. Record the investment decision yourself.`
                : `${bindingCriterionLabel ? `${bindingCriterionLabel} is the rule being missed. ` : ""}The current price misses at least one selected rule. Record the investment decision yourself.`,
          }
        : // Mirror the headline's own logic. This branch used to test only
          // `offerCeiling` — the EXACT solve — and declare "No qualifying Offer
          // Ceiling was found" whenever it was null. But exact and preview are
          // mutually exclusive access modes: on the free path offerCeiling is
          // always null and a coarse RANGE is what renders. So the card printed
          // "$250,000–$350,000" while this block, ~330px below in the same
          // viewport, said no ceiling existed. Same payload, opposite claims,
          // on the default path most visitors are on.
          rangePreview?.downsideFeasible && rangePreview.lower != null
          ? {
              label: "Review the active target rules",
              reason: `A modeled range of ${money(rangePreview.lower)}–${money(rangePreview.upper)} still meets the selected rules; the exact Offer Ceiling is not part of this preview. Record the investment decision yourself.`,
            }
          : rangePreview
            ? {
                label: "Review the active target rules",
                reason:
                  "No feasible downside case was found under the current assumptions. Record the investment decision yourself.",
              }
            : {
                label: "Review the active target rules",
                reason:
                  "No qualifying Offer Ceiling was found under the current assumptions. Record the investment decision yourself.",
              }
      : !advocacyContractEnabled &&
          legacyReadinessLabel !== "Ready" &&
          nextVerification
        ? {
            label:
              nextVerification.verifyAction ??
              `Verify ${nextVerification.label}`,
            // sourceLabel is a full provenance PHRASE ("Your entered rent",
            // "HUD rent benchmark (county)", "TrueCap estimate"), not an
            // adjective. Interpolating it as one produced "Rent is a material
            // your entered rent input" on every passing verdict — and
            // "Rent is a material hud rent benchmark (county) input" whenever
            // the value auto-filled. Keep the provenance in its own clause and
            // preserve the label's own capitalisation.
            reason: `${nextVerification.label} is a material input — current source: ${nextVerification.sourceLabel}.`,
          }
        : {
            label: advocacyContractEnabled
              ? "Double-check the biggest cash-flow drivers"
              : "Review downside and verification",
            reason: advocacyContractEnabled
              ? "Review the current values and sources below before recording your decision."
              : "The current assumptions clear the adopted rules; TrueCap does not infer the investment decision.",
          };
  const resolvedNextAction = legacyResolvedNextAction;
  const nextVerificationAction = nextVerification
    ? (nextVerification.verifyAction ?? `Verify ${nextVerification.label}`)
    : null;
  const nextActionCoversVerification = Boolean(
    nextVerificationAction &&
    (resolvedNextAction?.label
      .toLocaleLowerCase()
      .includes(nextVerificationAction.toLocaleLowerCase()) ||
      resolvedNextAction?.label
        .toLocaleLowerCase()
        .includes(nextVerification?.label.toLocaleLowerCase() ?? "")),
  );
  const ceilingSemanticStatus = offerCeilingSemanticStatus({
    presentation: offerCeiling,
    target,
  });
  const targetBlocked = targetResolutionState !== "ready";
  const targetDraftBlockMessage =
    "Apply or cancel the criteria edits before taking another action.";
  const resultActionsBlocked = targetBlocked || targetDraftBlocksActions;
  const resultActionsBlockedReason = targetBlocked
    ? targetResolutionMessage
    : targetDraftBlocksActions
      ? targetDraftBlockMessage
      : undefined;
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
                Math.abs(delta),
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
      lastTargetContextTelemetryRef.current ===
        targetContext.rulesSnapshotVersion
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
    if (
      !targetAdopted ||
      targetBlocked ||
      isOfferCeilingLoading ||
      lastOfferTelemetryKeyRef.current === telemetryKey
    )
      return;
    lastOfferTelemetryKeyRef.current = telemetryKey;
    trackEvent("offer_ceiling_viewed", {
      target_source: targetSource,
      access_level: canShowPriceCeiling ? "exact" : "range_preview",
      decision_readiness: readinessLabel.toLowerCase().replaceAll(" ", "_"),
      has_feasible: Boolean(
        offerCeiling ||
        (rangePreview?.downsideFeasible && rangePreview.lower != null),
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
      ? "Choose criteria"
      : "Available with Pro"
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
            ? offerCeilingErrorCode === "RATE_LIMITED"
              ? "Hourly limit reached"
              : "Temporarily unavailable"
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
      className="rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)] max-[250px]:p-3 sm:p-6"
    >
      <div className="space-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words text-sm font-semibold leading-snug text-muted-foreground">
              {displayAddress}
            </p>
            {isScenarioActive ? (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                Base analysis
              </span>
            ) : null}
          </div>
          <h2
            id="decision-summary-title"
            className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
          >
            {decisionLabel}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {priceIsEstimated ? "Est. price" : "Asking"}{" "}
            {money(Number(values.purchasePrice))}
          </p>
        </div>

        {!targetAdopted ? (
          <FirstYearSnapshot
            result={result}
            isScenarioActive={isScenarioActive}
          />
        ) : null}

        <div className="rounded-xl border border-primary/25 bg-[var(--brand-blue-light)] p-4">
          <span
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {offerCeilingAnnouncement}
          </span>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--brand-blue-text)]">
            {!targetAdopted
              ? "Optional decision criteria"
              : isScenarioActive
                ? "Base Offer Ceiling"
                : "Offer Ceiling"}
          </p>
          <p className="mt-1 font-mono text-3xl font-extrabold tabular-nums text-primary max-[250px]:text-2xl">
            {offerCeilingHeadline}
          </p>
          {targetBlocked ? (
            <p className="mt-1 text-xs font-semibold text-foreground">
              {targetResolutionMessage}
            </p>
          ) : null}
          {!targetBlocked ? (
            <p className="mt-1 text-xs leading-relaxed text-foreground">
              {targetAdopted ? "Criteria" : "Example criteria"}: {targetLabel}
            </p>
          ) : null}
          {advocacyContractEnabled && targetDeltaNotice ? (
            <p className="mt-2 rounded-md border border-primary/20 bg-background/70 px-2 py-1.5 text-[11px] leading-relaxed text-foreground">
              {targetDeltaNotice.message} This comparison is session-only; Save
              to record the current criteria with the analysis.
            </p>
          ) : null}
          {offerCeilingError && offerCeilingErrorCode === "RATE_LIMITED" ? (
            <p className="mt-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
              You&apos;ve reached the hourly limit for exact ceiling solves.
              It resets on its own — no need to retry; the rest of this
              analysis is unaffected.
            </p>
          ) : offerCeilingError && onRetryOfferCeiling ? (
            <button
              type="button"
              onClick={onRetryOfferCeiling}
              className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-primary/30 px-3 text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Retry Offer Ceiling
            </button>
          ) : null}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {!targetAdopted
              ? canTunePriceCeiling
                ? "Choose at least one criterion to calculate a modeled price threshold."
                : "TrueCap Pro calculates the highest modeled price that still meets rules you choose — like the examples above — plus the binding constraint and a screening range."
              : "Highest modeled price that still meets the criteria shown. This is not a recommended offer."}
          </p>
          <details className="group mt-2 border-t border-primary/15 pt-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              How this ceiling was calculated
              <ChevronDown
                aria-hidden
                className="size-4 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="space-y-1.5 pb-1 text-[11px] leading-relaxed text-muted-foreground">
              <p>
                {advocacyContractEnabled
                  ? `${isSampleCriteria ? "Example criteria" : targetContext.profileName}${
                      targetContext.origin &&
                      targetContext.origin !== "user-selected"
                        ? ` · ${targetContext.origin.replaceAll("-", " ")}`
                        : ""
                    } · ${targetVersionLabel}`
                  : `${isSampleCriteria ? "Under sample criteria" : targetSource === "buy-box" && buyBoxName ? `Under Buy Box: ${buyBoxName}` : (offerCeiling?.sourceLabel ?? (targetSource === "screening-defaults" ? "Under screening defaults" : targetSource === "starter-criteria" ? "Under TrueCap starter criteria" : targetSource === "buy-box" ? "Under your Buy Box" : "Under your selected targets"))} · ${canShowPriceCeiling ? "Exact ceiling" : "Coarse range preview"}`}
              </p>
              <p>
                Underwriting model v{result.methodologyVersion ?? "current"} ·
                10-year projection{" "}
                {result.tenYearProjectionVersion
                  ? `method v${result.tenYearProjectionVersion}`
                  : "method recorded-unversioned"}
              </p>
              {advocacyContractEnabled && targetAdopted ? (
                <p>
                  User decision: {userDecisionLabel(userDecision)}. TrueCap
                  reports rule fit; it does not record Pursue or Pass from the
                  metrics.
                </p>
              ) : null}
              {offerCeiling ? (
                <>
                  <p>
                    Binding:{" "}
                    {offerCeiling.bindingConstraints
                      .map((item) => item.criterion)
                      .join(" + ") || "No constraint resolved"}
                  </p>
                  {offerCeiling.nextConstraint ? (
                    <p>
                      Next constraint: {offerCeiling.nextConstraint.criterion}
                    </p>
                  ) : null}
                  <p>
                    Screening range:{" "}
                    {offerCeiling.range.lower == null
                      ? "no feasible downside price"
                      : money(offerCeiling.range.lower)}
                    {" – "}
                    {offerCeiling.range.upper == null
                      ? "no feasible upside price"
                      : money(offerCeiling.range.upper)}{" "}
                    if {offerCeiling.range.label}.
                  </p>
                </>
              ) : null}
              {targetAdopted ? (
                <p>
                  When price changes, percentage-based down payment, closing
                  costs, tax, insurance, and debt scale with it. Rent and
                  dollar-based tax, insurance, HOA, utilities, and repairs stay
                  fixed.
                </p>
              ) : null}
              {!targetAdopted && canTunePriceCeiling && !targetBlocked ? (
                <p>
                  Save reusable criteria in your{" "}
                  {targetDraftBlocksActions ? (
                    <span
                      aria-disabled="true"
                      title={targetDraftBlockMessage}
                      className="font-semibold text-muted-foreground"
                    >
                      Buy Box
                    </span>
                  ) : (
                    <Link
                      href="/settings#buy-boxes"
                      className="font-semibold text-primary underline underline-offset-2"
                    >
                      Buy Box
                    </Link>
                  )}
                  .
                </p>
              ) : null}
              {advocacyContractEnabled ? (
                <p>
                  Model output—not an appraisal, market value, acceptance
                  prediction, or recommended offer.
                </p>
              ) : null}
            </div>
          </details>
        </div>

        {targetAdopted ? (
          <FirstYearSnapshot
            result={result}
            isScenarioActive={isScenarioActive}
            target={target}
          />
        ) : null}
      </div>

      <div
        className="mt-4 grid grid-cols-1 gap-2 border-t border-border pt-4 min-[320px]:grid-cols-2 sm:flex sm:flex-wrap"
        aria-label="Primary result actions"
      >
        {canTunePriceCeiling ? (
          <Button
            id="offer-ceiling-criteria-trigger"
            type="button"
            onClick={() => {
              if (tuneOpen) {
                resetTargetDraft();
              } else {
                onTuneTargetsOpened();
              }
              setTuneOpen(!tuneOpen);
            }}
            aria-expanded={tuneOpen}
            aria-controls={targetEditorId}
            disabled={targetBlocked}
            className="h-11 w-full gap-2 rounded-xl sm:w-auto"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            {tuneOpen
              ? "Cancel criteria edits"
              : targetAdopted
                ? "Tune criteria"
                : "Set criteria"}
            <ChevronDown
              className={`size-4 transition-transform ${tuneOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </Button>
        ) : !targetAdopted ? (
          <Button
            type="button"
            onClick={onUpgrade}
            className="min-h-11 w-full gap-2 rounded-xl sm:w-auto"
          >
            <LockKeyhole className="size-4" aria-hidden />
            Unlock target price
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={onEditAssumptions}
          disabled={resultActionsBlocked}
          title={resultActionsBlockedReason}
          className="h-11 w-full gap-2 rounded-xl max-[250px]:h-auto max-[250px]:whitespace-normal max-[250px]:py-2 max-[250px]:text-center max-[250px]:leading-tight sm:w-auto"
        >
          <Edit3 className="size-4" aria-hidden />
          Edit assumptions
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          disabled={isSaving || resultActionsBlocked}
          title={
            resultActionsBlockedReason ??
            (isSaveLocked ? saveLockedHint : undefined)
          }
          className="h-11 w-full gap-2 rounded-xl max-[250px]:h-auto max-[250px]:whitespace-normal max-[250px]:py-2 max-[250px]:text-center max-[250px]:leading-tight sm:w-auto"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          {isSaving ? "Saving…" : isSaved ? "Saved" : "Save"}
          {isSaveLocked ? (
            <span className="ml-0.5 rounded-full bg-[var(--brand-orange)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
              PRO
            </span>
          ) : null}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onAnalyzeAnotherLikeThis}
          disabled={resultActionsBlocked}
          className="h-auto min-h-11 w-full gap-2 whitespace-normal rounded-xl py-2 text-center leading-tight sm:h-11 sm:w-auto sm:whitespace-nowrap sm:py-0"
          title={
            resultActionsBlockedReason ??
            "Keep reusable financing and operating assumptions, then enter the next property"
          }
        >
          <CopyPlus className="size-4" aria-hidden />
          Next deal · keep assumptions
        </Button>
      </div>
      {targetDraftBlocksActions ? (
        <p
          role="status"
          className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200"
        >
          {targetDraftBlockMessage}
        </p>
      ) : null}

      {canTunePriceCeiling ? (
        <div
          ref={targetEditorRef}
          id={targetEditorId}
          hidden={!tuneOpen}
          data-offer-criteria-editor=""
          className="mt-3 scroll-mt-24 rounded-xl border border-primary/25 bg-primary/[0.035] p-4"
        >
          <fieldset>
            <legend className="text-sm font-bold text-foreground">
              Offer criteria
            </legend>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {targetAdopted
                ? "Edit the criteria, then choose Update criteria. The Offer Ceiling and saved outputs do not change while you type. Leave a field blank to ignore it."
                : "These are product examples, not your targets. Review or change them, then explicitly apply the criteria to calculate a modeled threshold."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {TARGET_FIELDS.map(([field, label]) => {
                const bounds = MAO_TARGET_BOUNDS[field];
                const inputId = `${targetEditorId}-${field}`;
                const errorId = `${inputId}-error`;
                const isCashDscr =
                  field === "dscr" && result.monthlyPayment <= 0;
                return (
                  <div key={field}>
                    <Label htmlFor={inputId} className="text-xs">
                      {label}
                    </Label>
                    <Input
                      id={inputId}
                      type="number"
                      inputMode={
                        field === "monthlyCashFlow" ||
                        field === "maxCashRequired" ||
                        field === "maxPurchasePrice"
                          ? "numeric"
                          : "decimal"
                      }
                      min={bounds.min}
                      max={bounds.max}
                      step={bounds.step}
                      value={isCashDscr ? "" : targetInputs[field]}
                      placeholder={isCashDscr ? NO_DEBT_SERVICE_DSCR_LABEL : "Any"}
                      disabled={isCashDscr}
                      onChange={(event) =>
                        setTargetInputs((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                      aria-invalid={Boolean(
                        targetDraftValidation.errors[field],
                      )}
                      aria-describedby={
                        targetDraftValidation.errors[field]
                          ? errorId
                          : undefined
                      }
                      className="mt-1 h-11"
                    />
                    {targetDraftValidation.errors[field] ? (
                      <p
                        id={errorId}
                        role="alert"
                        className="mt-1 text-xs font-medium text-destructive"
                      >
                        {targetDraftValidation.errors[field]}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {targetDraftValidation.formError ? (
              <p
                role="alert"
                className="mt-3 text-xs font-medium text-destructive"
              >
                {targetDraftValidation.formError}
              </p>
            ) : null}
            <div
              data-offer-criteria-actions=""
              className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-4 grid grid-cols-2 gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:flex sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
            >
              <Button
                type="button"
                onClick={applyTargetDraft}
                disabled={
                  targetDraftInvalid || (targetAdopted && !targetDraftDirty)
                }
                className="min-h-11 rounded-xl"
              >
                {targetAdopted ? "Update criteria" : "Apply criteria"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  resetTargetDraft();
                  setTuneOpen(false);
                }}
                className="min-h-11 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </fieldset>
        </div>
      ) : null}

      <div
        className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5"
        data-result-next-action=""
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/75">
          Best next step
        </p>
        <p className="mt-1 text-sm font-extrabold text-foreground">
          {resolvedNextAction?.label ?? "Verify the material assumptions"}
        </p>
        {resolvedNextAction?.reason ? (
          <p className="mt-1 text-xs leading-relaxed text-foreground/80">
            {resolvedNextAction.reason}
          </p>
        ) : null}
      </div>

      {!advocacyContractEnabled &&
      nextVerification &&
      !nextActionCoversVerification ? (
        <p
          className="mt-3 rounded-lg border border-border bg-muted/25 px-3 py-2 text-xs leading-relaxed text-foreground"
          data-result-next-verification=""
        >
          <span className="font-extrabold">Verify next:</span>{" "}
          {nextVerification.verifyAction ?? `Verify ${nextVerification.label}`}.
          Current source: {nextVerification.sourceLabel}.
        </p>
      ) : null}

      {viabilityLabels.length > 0 ? (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Fastest paths to meet your criteria
          </p>
          <ol className="mt-2 grid gap-1 text-sm font-semibold text-foreground sm:grid-cols-2">
            {viabilityLabels.map((label, index) => (
              <li key={label}>
                <span className="text-muted-foreground">{index + 1}.</span>{" "}
                {label}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {!advocacyContractEnabled && sensitivityLabels.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {targetAdopted
              ? "Two assumptions most likely to move the decision"
              : "What can move the result"}
          </p>
          <ol className="mt-2 grid gap-1 text-sm font-semibold text-foreground sm:grid-cols-2">
            {sensitivityLabels.map((label, index) => (
              <li key={label}>
                <span className="text-muted-foreground">{index + 1}.</span>{" "}
                {label}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <details className="group mt-2 rounded-xl border border-border bg-muted/20 px-2 py-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          Decision context and key numbers
          <ChevronDown
            className="size-4 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="space-y-3 border-t border-border px-2 py-3">
          <div
            className="grid grid-cols-1 gap-3 min-[280px]:grid-cols-2 lg:grid-cols-4"
            aria-label="Secondary first-year metrics"
          >
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Cash needed
              </p>
              <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-foreground">
                {money(result.totalCashRequired)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Annual NOI
              </p>
              <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-foreground">
                {money(result.noiAnnual)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Cap rate
              </p>
              <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-foreground">
                {result.capRate.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Cash-on-cash
              </p>
              <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-foreground">
                {result.cocReturn.toFixed(2)}%
              </p>
            </div>
          </div>

          <div
            className="grid grid-cols-1 gap-3 min-[280px]:grid-cols-2 lg:grid-cols-3"
          >
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {advocacyContractEnabled
                  ? "Criteria profile"
                  : "Offer criteria"}
              </p>
              <p className="mt-1 text-sm font-extrabold text-foreground">
                {!targetAdopted
                  ? "Not adopted"
                  : advocacyContractEnabled
                    ? targetContext.profileName
                    : targetSource !== "buy-box"
                      ? "Selected criteria"
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
            {!advocacyContractEnabled ? (
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Assumption status
                </p>
                <p className="mt-1 text-sm font-extrabold text-foreground">
                  {readinessLabel}
                </p>
                {nextVerification ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Weakest material input: {nextVerification.label}
                  </p>
                ) : null}
              </div>
            ) : null}
            {advocacyContractEnabled ? (
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  User decision
                </p>
                <p className="mt-1 text-sm font-extrabold text-foreground">
                  {userDecisionLabel(userDecision)}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Never inferred from model outputs
                </p>
              </div>
            ) : null}
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Margin of Safety
              </p>
              <p className="mt-1 text-sm font-extrabold text-foreground">
                {!targetAdopted
                  ? "—"
                  : offerCeiling
                    ? offerCeiling.listPriceGap > 0
                      ? `${money(offerCeiling.listPriceGap)} above ceiling`
                      : offerCeiling.listPriceGap < 0
                        ? `${money(Math.abs(offerCeiling.listPriceGap))} below ceiling`
                        : "At the ceiling"
                    : rangePreview?.downsideFeasible &&
                        rangePreview.lower != null
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
        </div>
      </details>

      <details className="group mt-2 rounded-xl border border-border bg-muted/20 px-2 py-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          More actions
          <ChevronDown
            className="size-4 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div
          className="flex flex-wrap gap-2 border-t border-border px-2 py-3"
          aria-label="Secondary result actions"
        >
          <Button
            type="button"
            variant="outline"
            onClick={onExportPdf}
            disabled={resultActionsBlocked || isExportDisabled}
            title={resultActionsBlockedReason ?? exportHint}
            className="h-11 gap-2 rounded-xl"
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileDown className="size-4" aria-hidden />
            )}
            Export PDF
          </Button>
          <ShareLinkButton
            values={values}
            analyzerStrategyKey={analyzerStrategyKey}
            isAuthenticated={isAuthenticated}
            savedDealId={savedDealId}
            priceIsEstimated={priceIsEstimated}
            maoTarget={targetAdopted ? target : undefined}
            maoTargetSource={targetAdopted ? targetSource : undefined}
            adoptedDecisionBasis={
              targetAdopted ? adoptedDecisionBasis : undefined
            }
            disabled={resultActionsBlocked}
            disabledReason={resultActionsBlockedReason}
            onPrepareAuth={onPrepareAuthShare}
            className="h-11 rounded-xl px-4"
          />
          {savedDealId ? (
            resultActionsBlocked ? (
              <Button
                type="button"
                variant="outline"
                disabled
                title={resultActionsBlockedReason}
                className="h-11 gap-2 rounded-xl"
              >
                <ListTodo className="size-4" aria-hidden />
                Deal workspace
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="h-11 gap-2 rounded-xl"
              >
                <Link href={`/dashboard/saved-analyses/${savedDealId}`}>
                  <ListTodo className="size-4" aria-hidden />
                  Deal workspace
                </Link>
              </Button>
            )
          ) : null}
          {canCompareDeals ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void onCompareDeals(
                  targetAdopted ? target : undefined,
                  targetAdopted ? targetSource : undefined,
                )
              }
              disabled={resultActionsBlocked || isSaving || isComparing}
              aria-label={!isSaved ? "Save and compare deals" : "Compare deals"}
              title={
                resultActionsBlocked
                  ? resultActionsBlockedReason
                  : !isSaved
                    ? "Save this analysis and add it to the compare workspace."
                    : undefined
              }
              className="min-h-11 gap-2 rounded-xl max-[250px]:w-full max-[250px]:whitespace-normal max-[250px]:py-2 max-[250px]:text-center max-[250px]:leading-tight"
            >
              {isComparing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : !isSaved ? (
                <Save className="size-4" aria-hidden />
              ) : (
                <ListTodo className="size-4" aria-hidden />
              )}
              {!isSaved ? "Save & compare" : "Compare deals"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={onUpgrade}
              disabled={resultActionsBlocked}
              title={resultActionsBlockedReason}
              className="min-h-11 gap-2 rounded-xl max-[250px]:w-full max-[250px]:whitespace-normal max-[250px]:py-2 max-[250px]:text-center max-[250px]:leading-tight"
            >
              <ListTodo className="size-4" aria-hidden />
              Compare with Pro
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => void onNewAnalysis()}
            disabled={resultActionsBlocked}
            title={resultActionsBlockedReason}
            className="min-h-11 gap-2 rounded-xl max-[250px]:w-full max-[250px]:whitespace-normal max-[250px]:py-2 max-[250px]:text-center max-[250px]:leading-tight"
          >
            <Sparkles className="size-4" aria-hidden />
            New analysis
          </Button>
        </div>
        {canCompareDeals && !isSaved ? (
          <p className="px-2 pb-3 text-xs text-muted-foreground" role="status">
            Your current analysis and Offer criteria will be saved before it is
            added to Compare.
          </p>
        ) : null}
      </details>
    </section>
  );
}
