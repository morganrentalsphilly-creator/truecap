"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Check,
  ChevronDown,
  CircleAlert,
  Database,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  inputSourceClassLabel,
  type InputConfidenceField,
  type InputConfidenceFieldKey,
  type InputConfidenceResult,
} from "@/lib/input-confidence";
import { computeAssumptionImpact } from "@/lib/assumption-impact";
import { formatAssumptionLedgerValue } from "@/lib/assumption-ledger-value";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { AnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import {
  buildAssumptionLedger,
  type AssumptionConfirmationType,
  type AssumptionSourceClass,
} from "@/lib/decision-contract";
import { cn } from "@/lib/utils";

type Props = {
  confidence: InputConfidenceResult;
  /** Frozen values used for the displayed analysis, never live form edits. */
  values: InvestmentFormValues;
  showOfferReadyStatus?: boolean;
  advocacyContractEnabled?: boolean;
  onEditAssumptions: () => void;
  onReviewInput?: (key: InputConfidenceFieldKey) => void;
  onToggleVerified: (key: InputConfidenceFieldKey, verified: boolean) => void;
  analyzerStrategyKey?: AnalyzerStrategyKey;
  actionsBlocked?: boolean;
  actionsBlockedReason?: string;
};

const RISK_STYLE = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  moderate: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-red-200 bg-red-50 text-red-700",
} as const;

const SOURCE_CLASS_LABEL: Record<AssumptionSourceClass, string> = {
  "direct-property-evidence": "Direct property evidence",
  "third-party-property-estimate": "Third-party property estimate",
  "geographic-benchmark": "Geographic benchmark",
  "scenario-assumption": "Scenario assumption",
  interpretation: "Interpretation",
  unknown: "Unknown",
};

const CONFIRMATION_LABEL: Record<AssumptionConfirmationType, string> = {
  unreviewed: "Unreviewed",
  "user-confirmed": "User confirmed",
  "evidence-attached-cited": "Evidence attached/cited",
  "third-party-verified": "Third-party verified",
};

const IMPACT_FIELD_KEY: Readonly<Record<string, InputConfidenceFieldKey>> = {
  rent: "rent",
  interestRate: "interestRate",
  purchasePrice: "purchasePrice",
  vacancyPct: "vacancy",
  mgmtPct: "management",
  maintenancePct: "maintenance",
  capexPct: "capex",
  propertyTaxPct: "propertyTax",
};

const EDIT_ACTION_LABEL: Record<InputConfidenceFieldKey, string> = {
  purchasePrice: "Edit price",
  yearBuilt: "Edit year built",
  rent: "Edit rent",
  propertyTax: "Edit taxes",
  insurance: "Edit insurance",
  interestRate: "Edit rate",
  downPayment: "Edit financing",
  closingCosts: "Edit closing costs",
  maintenance: "Edit maintenance",
  capex: "Edit CapEx",
  vacancy: "Edit vacancy",
  management: "Edit management",
  utilities: "Edit utilities",
  hoa: "Edit HOA",
  rehabBudget: "Edit rehab budget",
};

const CHECK_INSTRUCTION: Record<InputConfidenceFieldKey, string> = {
  purchasePrice: "Confirm against the current asking price or contract.",
  yearBuilt: "Confirm with the property record.",
  rent: "Compare with current nearby rentals.",
  propertyTax: "Replace estimates with the current parcel tax bill.",
  insurance: "Replace estimates with an insurance quote.",
  interestRate: "Replace benchmarks with your lender quote.",
  downPayment: "Confirm the loan-to-value with your lender.",
  closingCosts: "Confirm with your lender and title estimate.",
  maintenance: "Adjust for the property's age and condition.",
  capex: "Check that reserves cover the roof, HVAC, and other big systems.",
  vacancy: "Adjust to the local market and lease-up plan.",
  management: "Confirm your property manager's fee, or use 0% if self-managing.",
  utilities: "Confirm which utilities the owner pays.",
  hoa: "Confirm the current HOA amount.",
  rehabBudget: "Confirm the scope and contractor budget.",
};

function offerCheckLabel(
  field: InputConfidenceField,
  strategy: AnalyzerStrategyKey,
  propertyType: InvestmentFormValues["propertyType"],
): string {
  if (field.key !== "rent") return field.label;
  if (strategy === "short-term") return "Nightly rate and occupancy";
  if (propertyType === "owner-occupant") return "Rental-unit rents";
  if (propertyType === "multi-family") return "Unit rents";
  return field.label;
}

function offerCheckSource(
  field: InputConfidenceField,
  strategy: AnalyzerStrategyKey,
  propertyType: InvestmentFormValues["propertyType"],
): string {
  if (field.key !== "rent" || field.sourceLabel !== "Your entered rent") {
    return field.sourceLabel;
  }
  if (strategy === "short-term") {
    return "Your entered nightly rate and occupancy";
  }
  if (propertyType === "owner-occupant") {
    return "Your entered rental-unit rents";
  }
  if (propertyType === "multi-family") return "Your entered unit rents";
  return field.sourceLabel;
}

function offerCheckInstruction(
  field: InputConfidenceField,
  strategy: AnalyzerStrategyKey,
  propertyType: InvestmentFormValues["propertyType"],
): string {
  if (field.sourceClass === "missing") {
    return `Add ${offerCheckLabel(field, strategy, propertyType).toLowerCase()} before relying on the result.`;
  }
  if (field.key === "rent" && strategy === "short-term") {
    return "Check the nightly rate and occupancy against recent local performance.";
  }
  if (field.key === "rent" && propertyType !== "single-family") {
    return "Compare each rented unit with current nearby rentals.";
  }
  return CHECK_INSTRUCTION[field.key];
}

function offerCheckActionLabel(
  field: InputConfidenceField,
  strategy: AnalyzerStrategyKey,
  propertyType: InvestmentFormValues["propertyType"],
): string {
  const label = offerCheckLabel(field, strategy, propertyType);
  if (field.sourceClass === "missing") return `Add ${label.toLowerCase()}`;
  if (field.key !== "rent") return EDIT_ACTION_LABEL[field.key];
  if (strategy === "short-term") return "Edit rate & occupancy";
  if (propertyType === "owner-occupant") return "Edit rental-unit rents";
  if (propertyType === "multi-family") return "Edit unit rents";
  return EDIT_ACTION_LABEL.rent;
}

/**
 * Decision-trust summary. The advocacy cohort gets a compact offer check
 * because the current product has no owner-scoped evidence ingestion path; it
 * must not imply that browser edits can complete evidence review. The legacy
 * Input Confidence score remains available only outside that cohort.
 */
export function InputConfidenceCard({
  confidence,
  values,
  showOfferReadyStatus = true,
  advocacyContractEnabled = false,
  onEditAssumptions,
  onReviewInput,
  onToggleVerified,
  analyzerStrategyKey = "buy-hold",
  actionsBlocked = false,
  actionsBlockedReason,
}: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const pendingQueueFocusIndex = useRef<number | null>(null);
  const remaining = confidence.offerReadyRemaining.length;
  const ledger = buildAssumptionLedger(confidence);
  const readinessSteps = [
    {
      label: "Preliminary screen",
      detail: "Important inputs may still be estimates",
    },
    {
      label: "Assumptions reviewed",
      detail: "Core inputs have been explicitly reviewed",
    },
    {
      label: "Offer-ready",
      detail: "Every required input has been confirmed",
    },
  ] as const;
  const readinessStep =
    confidence.stage === "offer-ready"
      ? 2
      : confidence.stage === "verified"
        ? 1
        : 0;
  const visibleQueue = advocacyContractEnabled
    ? ledger.items
        .filter((item) => item.material && !item.evidenceVerified)
        .sort(
          (a, b) =>
            (b.materialityScore ?? -1) - (a.materialityScore ?? -1) ||
            b.weight - a.weight,
        )
        .slice(0, 3)
        .map((item) => ({
          ...item,
          sourceDisplay: SOURCE_CLASS_LABEL[item.sourceClass],
        }))
    : confidence.verificationQueue.slice(0, 3).map((item) => ({
        ...item,
        sourceDisplay: inputSourceClassLabel(item.sourceClass),
      }));
  const verified = new Set(confidence.verifiedFields);
  const ledgerByKey = new Map(ledger.items.map((item) => [item.key, item]));
  const offerChecks = useMemo(() => {
    if (!advocacyContractEnabled) return [];
    const impactKeys = computeAssumptionImpact(values)
      .map((driver) => IMPACT_FIELD_KEY[driver.key])
      .filter((key): key is InputConfidenceFieldKey => Boolean(key));
    const fallbackKeys = confidence.fields
      .filter(
        (field) =>
          field.offerReadyRequired &&
          field.sourceClass !== "not-applicable" &&
          field.sourceClass !== "verified",
      )
      .sort((a, b) => b.weight - a.weight)
      .map((field) => field.key);
    const orderedKeys = Array.from(new Set([...impactKeys, ...fallbackKeys]));

    return orderedKeys
      .map((key) => confidence.fields.find((field) => field.key === key))
      .filter(
        (field): field is InputConfidenceField =>
          Boolean(field) && field?.sourceClass !== "verified",
      )
      .slice(0, 2);
  }, [advocacyContractEnabled, confidence.fields, values]);
  const statusHeadline = advocacyContractEnabled
    ? ledger.readinessLabel
    : showOfferReadyStatus
      ? confidence.stage === "offer-ready"
        ? "Offer-ready"
        : remaining <= 3 && remaining > 0
          ? "Almost offer-ready"
          : confidence.stage === "verified"
            ? "Assumptions reviewed"
            : "Preliminary screen"
      : "Input verification";

  useEffect(() => {
    const requestedIndex = pendingQueueFocusIndex.current;
    if (requestedIndex == null) return;
    pendingQueueFocusIndex.current = null;
    const actions = cardRef.current?.querySelectorAll<HTMLButtonElement>(
      "[data-input-confidence-queue-action]",
    );
    const nextAction =
      actions?.[Math.min(requestedIndex, Math.max(0, actions.length - 1))];
    if (nextAction) nextAction.focus();
    else cardRef.current?.focus({ preventScroll: true });
  }, [confidence]);

  if (advocacyContractEnabled) {
    return (
      <section
        ref={cardRef}
        tabIndex={-1}
        aria-labelledby="input-confidence-title"
        data-verification-plan=""
        className="rounded-2xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <h2
            id="input-confidence-title"
            className="text-xs font-extrabold uppercase tracking-widest text-primary"
          >
            Before you offer
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Double-check the biggest cash-flow drivers. Edit anything that
            looks wrong.
          </p>
        </div>

        {actionsBlocked && actionsBlockedReason ? (
          <p
            role="status"
            className="mx-4 mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs font-medium leading-relaxed text-amber-900 sm:mx-5"
          >
            {actionsBlockedReason}
          </p>
        ) : null}

        {offerChecks.length > 0 ? (
          <ul className="divide-y divide-border border-t border-border">
            {offerChecks.map((field) => {
              const label = offerCheckLabel(
                field,
                analyzerStrategyKey,
                values.propertyType,
              );
              const actionLabel = offerCheckActionLabel(
                field,
                analyzerStrategyKey,
                values.propertyType,
              );
              return (
                <li
                  key={field.key}
                  className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {label} · {formatAssumptionLedgerValue(field.key, values)}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {offerCheckSource(
                        field,
                        analyzerStrategyKey,
                        values.propertyType,
                      )}
                      {" — "}
                      {offerCheckInstruction(
                        field,
                        analyzerStrategyKey,
                        values.propertyType,
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`${actionLabel}: ${label}`}
                    onClick={() =>
                      onReviewInput
                        ? onReviewInput(field.key)
                        : onEditAssumptions()
                    }
                    disabled={actionsBlocked}
                    title={actionsBlocked ? actionsBlockedReason : undefined}
                    className="min-h-11 w-full rounded-xl sm:w-auto"
                  >
                    {actionLabel}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <p className="text-sm text-muted-foreground">
              The key inputs were previously confirmed. Recheck them if the
              property or financing changes.
            </p>
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onEditAssumptions}
                disabled={actionsBlocked}
                title={actionsBlocked ? actionsBlockedReason : undefined}
                className="min-h-11 rounded-xl"
              >
                Edit assumptions
              </Button>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      ref={cardRef}
      tabIndex={-1}
      aria-labelledby="input-confidence-title"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Database aria-hidden className="size-4 text-primary" />
            <h2
              id="input-confidence-title"
              className="text-xs font-extrabold uppercase tracking-widest text-primary"
            >
              {advocacyContractEnabled
                ? "Evidence readiness"
                : "Decision confidence"}
            </h2>
          </div>
          <div aria-live="polite" aria-atomic="true">
            <p className="mt-2 text-lg font-extrabold text-foreground">
              {statusHeadline}
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {advocacyContractEnabled
                ? `${ledger.evidenceVerifiedCount} of ${ledger.materialInputCount} material inputs are evidence-verified. ${ledger.userConfirmedCount} are user-confirmed; self-confirmation does not count as evidence.`
                : showOfferReadyStatus
                  ? confidence.stage === "offer-ready"
                    ? "The required inputs have been explicitly confirmed for this underwrite. Re-check anything that changes before recording a decision."
                    : `${remaining} required ${remaining === 1 ? "input" : "inputs"} still need confirmation before this analysis is Offer Ready.`
                  : `${remaining} high-priority ${remaining === 1 ? "input" : "inputs"} still need confirmation before relying on this underwrite.`}
            </p>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
              Scope: rental base-case inputs. Strategy-specific ARV, refinance,
              hold-time, and flip assumptions are reviewed separately in their
              strategy panels.
            </p>
          </div>
        </div>

        <div
          role="group"
          // 2 columns in the default branch now that Deal Fit is gone (it
          // duplicated the Screening Index bar). The advocacy branch above
          // still renders three tiles, so the column count follows the branch.
          className={cn(
            "grid shrink-0 grid-cols-1 gap-2",
            advocacyContractEnabled ? "min-[360px]:grid-cols-3" : "min-[360px]:grid-cols-2",
          )}
          aria-label={
            advocacyContractEnabled
              ? "Evidence readiness summary"
              : "Decision confidence summary"
          }
        >
          {advocacyContractEnabled ? (
            <>
              <SummaryMetric
                label="Evidence verified"
                value={`${ledger.evidenceVerifiedCount}`}
                suffix={`/${ledger.materialInputCount}`}
                help="Material inputs"
              />
              <SummaryMetric
                label="User confirmed"
                value={`${ledger.userConfirmedCount}`}
                help="Not evidence"
              />
            </>
          ) : (
            <>
              {/* No "Deal Fit" tile. It rendered Math.round of the SAME
                  dealScore the full-width SCREENING INDEX bar shows ~89px
                  above, from the same payload behind the same gate — they
                  could never diverge and never appeared apart. Two names for
                  one number invites the reader to look for the difference and
                  find none. "Screening Index" is the canonical customer-facing
                  name (it is what /pricing sells), so the bar keeps the score
                  with its methodology caveat and this row keeps the two
                  measures that are genuinely distinct. */}
              <SummaryMetric
                label="Input Confidence"
                value={`${confidence.score}%`}
                help="Input readiness"
              />
            </>
          )}
          {advocacyContractEnabled ? (
            <SummaryMetric
              label="Readiness state"
              value={ledger.readinessLabel}
              help="Based on verified inputs"
            />
          ) : (
            <div className="min-w-0 rounded-xl border border-border bg-background p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
                Sensitivity risk
              </p>
              <span
                className={cn(
                  "mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold capitalize",
                  RISK_STYLE[confidence.sensitivityRisk],
                )}
              >
                {confidence.sensitivityRisk}
              </span>
              <p className="mt-1 text-[9px] text-muted-foreground">
                Unverified-input risk
              </p>
            </div>
          )}
        </div>
      </div>

      {showOfferReadyStatus ? (
        <ol
          aria-label="Underwriting readiness"
          className="mt-5 grid gap-2 sm:grid-cols-3"
        >
          {readinessSteps.map((step, index) => {
            const completed = index < readinessStep;
            const current = index === readinessStep;
            return (
              <li
                key={step.label}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "rounded-xl border p-3",
                  current
                    ? "border-primary/40 bg-primary/[0.06]"
                    : completed
                      ? "border-emerald-300/60 bg-emerald-50/60"
                      : "border-border bg-muted/20",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-extrabold",
                      completed
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : current
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {completed ? <Check className="size-3.5" /> : index + 1}
                  </span>
                  <span className="text-xs font-extrabold text-foreground">
                    {step.label}
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                  {step.detail}
                </p>
                <span className="sr-only">
                  {completed ? "Completed" : current ? "Current state" : "Not reached"}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {visibleQueue.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
              <CircleAlert aria-hidden className="size-3.5 text-amber-600" />
              {advocacyContractEnabled ? "Resolve next" : "Verify next"}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEditAssumptions}
              className="min-h-11 text-xs"
            >
              {/* Deliberately NOT "Edit assumptions". The decision summary's
                  primary control already carries that name, and this row can
                  render at the same time — two buttons with one accessible
                  name pointing at the same handler is a screen-reader trap,
                  and it is what made the page-scoped e2e locator ambiguous. */}
              Edit inputs
            </Button>
          </div>
          <ul className="grid gap-2 lg:grid-cols-3">
            {visibleQueue.map((item, index) => (
              <li
                key={item.key}
                className="rounded-xl border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.sourceDisplay}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-input-confidence-queue-action
                    onClick={() => {
                      if (!verified.has(item.key))
                        pendingQueueFocusIndex.current = index;
                      onToggleVerified(item.key, !verified.has(item.key));
                    }}
                    aria-pressed={verified.has(item.key)}
                    aria-label={
                      verified.has(item.key)
                        ? advocacyContractEnabled
                          ? `Remove user confirmation for ${item.label}`
                          : `Mark ${item.label} as unverified`
                        : advocacyContractEnabled
                          ? `Mark ${item.label} as reviewed and user-confirmed`
                          : `Confirm ${item.label} as verified`
                    }
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border px-3 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      verified.has(item.key)
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-border bg-background text-foreground hover:border-primary/40",
                    )}
                  >
                    <Check aria-hidden className="size-3" />
                    {advocacyContractEnabled
                      ? verified.has(item.key)
                        ? "User confirmed"
                        : "I reviewed this"
                      : verified.has(item.key)
                        ? "Verified"
                        : "I verified it"}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {item.reason}
                </p>
                {item.verifyAction ? (
                  <button
                    type="button"
                    onClick={onEditAssumptions}
                    className="mt-1 inline-flex min-h-11 items-center text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.verifyAction} →
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm">
            {advocacyContractEnabled
              ? "Every material input satisfies the disclosed evidence policy. Evidence complete is not an investment recommendation."
              : showOfferReadyStatus
                ? "Required inputs confirmed. Offer Ready is a data-readiness status, not a recommendation or guarantee."
                : "Priority inputs confirmed for this underwrite. Re-check anything that changes before relying on it."}
          </p>
        </div>
      )}

      <details className="group mt-4 border-t border-border pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-xs font-semibold text-muted-foreground marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {advocacyContractEnabled
            ? "Open the Assumption Ledger"
            : "See all input sources and scoring rules"}
          <ChevronDown
            aria-hidden
            className="size-4 transition-transform group-open:rotate-180"
          />
        </summary>
        <div
          role="region"
          aria-label={
            advocacyContractEnabled
              ? "Assumption sources, confirmation types, and evidence flags"
              : "All input sources and confidence scoring"
          }
          tabIndex={0}
          className="mt-3 rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {advocacyContractEnabled ? (
            <>
              <ul className="divide-y divide-border sm:hidden">
                {confidence.fields.map((item) => {
                  const ledgerItem = ledgerByKey.get(item.key)!;
                  return (
                    <li key={item.key} className="space-y-2 p-3 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-foreground">
                            {item.label}
                          </p>
                          <p
                            className="mt-0.5 break-words font-mono text-sm font-bold tabular-nums text-foreground"
                            data-assumption-ledger-value={item.key}
                          >
                            <span className="sr-only">Value: </span>
                            {formatAssumptionLedgerValue(item.key, values)}
                          </p>
                          <p className="mt-0.5 text-muted-foreground">
                            {SOURCE_CLASS_LABEL[ledgerItem.sourceClass]}
                          </p>
                        </div>
                        {item.sourceClass === "not-applicable" ? (
                          <span className="text-muted-foreground">N/A</span>
                        ) : (
                          <button
                            type="button"
                            aria-pressed={verified.has(item.key)}
                            aria-label={
                              verified.has(item.key)
                                ? `Remove user confirmation for ${item.label}`
                                : `Mark ${item.label} as reviewed and user-confirmed`
                            }
                            onClick={() =>
                              onToggleVerified(
                                item.key,
                                !verified.has(item.key),
                              )
                            }
                            className={cn(
                              "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border px-3 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              verified.has(item.key)
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border-border bg-background text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <Check aria-hidden className="size-3" />
                            {verified.has(item.key)
                              ? "User confirmed"
                              : "I reviewed this"}
                          </button>
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        Source: {item.sourceLabel}
                      </p>
                      <p className="text-muted-foreground">
                        Confirmation:{" "}
                        {CONFIRMATION_LABEL[ledgerItem.confirmationType]}
                      </p>
                      {ledgerItem.hardFlags.length > 0 ? (
                        <p className="font-semibold text-amber-800">
                          Flags:{" "}
                          {ledgerItem.hardFlags.join(", ").replaceAll("-", " ")}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <caption className="sr-only">
                    Assumption values, sources, confirmation types, evidence
                    flags, and review controls
                  </caption>
                  <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-bold">Input</th>
                      <th className="px-3 py-2 font-bold">Value</th>
                      <th className="px-3 py-2 font-bold">Source class</th>
                      <th className="px-3 py-2 font-bold">Source</th>
                      <th className="px-3 py-2 font-bold">Confirmation</th>
                      <th className="px-3 py-2 text-right font-bold">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {confidence.fields.map((item) => {
                      const ledgerItem = ledgerByKey.get(item.key)!;
                      return (
                        <tr key={item.key}>
                          <td className="px-3 py-2 font-semibold text-foreground">
                            {item.label}
                          </td>
                          <td
                            className="whitespace-nowrap px-3 py-2 font-mono font-semibold tabular-nums text-foreground"
                            data-assumption-ledger-value={item.key}
                          >
                            {formatAssumptionLedgerValue(item.key, values)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {SOURCE_CLASS_LABEL[ledgerItem.sourceClass]}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {item.sourceLabel}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {CONFIRMATION_LABEL[ledgerItem.confirmationType]}
                            {ledgerItem.hardFlags.length > 0
                              ? ` · ${ledgerItem.hardFlags.join(", ").replaceAll("-", " ")}`
                              : ""}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.sourceClass === "not-applicable" ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <button
                                type="button"
                                aria-pressed={verified.has(item.key)}
                                aria-label={
                                  verified.has(item.key)
                                    ? `Remove user confirmation for ${item.label}`
                                    : `Mark ${item.label} as reviewed and user-confirmed`
                                }
                                onClick={() =>
                                  onToggleVerified(
                                    item.key,
                                    !verified.has(item.key),
                                  )
                                }
                                className={cn(
                                  "inline-flex min-h-11 items-center gap-1 rounded-md border px-3 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  verified.has(item.key)
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                                )}
                              >
                                <Check aria-hidden className="size-3" />
                                {verified.has(item.key)
                                  ? "User confirmed"
                                  : "I reviewed this"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <ul className="divide-y divide-border sm:hidden">
                {confidence.fields.map((item) => (
                  <li key={item.key} className="space-y-2 p-3 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground">
                          {item.label}
                        </p>
                        <p
                          className="mt-0.5 break-words font-mono text-sm font-bold tabular-nums text-foreground"
                          data-assumption-ledger-value={item.key}
                        >
                          <span className="sr-only">Value: </span>
                          {formatAssumptionLedgerValue(item.key, values)}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {inputSourceClassLabel(item.sourceClass)} ·{" "}
                          {item.sourceLabel}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Confidence points:{" "}
                          {item.maxPoints === 0
                            ? "not applicable"
                            : `${item.earnedPoints.toFixed(1)} of ${item.maxPoints}`}
                        </p>
                      </div>
                      {item.sourceClass === "not-applicable" ? (
                        <span className="shrink-0 text-muted-foreground">
                          N/A
                        </span>
                      ) : (
                        <button
                          type="button"
                          aria-pressed={verified.has(item.key)}
                          aria-label={
                            verified.has(item.key)
                              ? `Mark ${item.label} as unverified`
                              : `Confirm ${item.label} as verified`
                          }
                          onClick={() =>
                            onToggleVerified(item.key, !verified.has(item.key))
                          }
                          className={cn(
                            "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border px-3 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            verified.has(item.key)
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-border bg-background text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Check aria-hidden className="size-3" />
                          {verified.has(item.key) ? "Confirmed" : "Confirm"}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div
                className="hidden overflow-x-auto sm:block"
                tabIndex={0}
                aria-label="Scrollable input confidence table"
              >
                <table className="w-full min-w-[760px] text-left text-xs">
                  <caption className="sr-only">
                    Input value, source, scoring points, and confirmation status
                    for every underwriting input
                  </caption>
                  <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-bold">Input</th>
                      <th className="px-3 py-2 font-bold">Value</th>
                      <th className="px-3 py-2 font-bold">Source class</th>
                      <th className="px-3 py-2 font-bold">Source</th>
                      <th className="px-3 py-2 text-right font-bold">Points</th>
                      <th className="px-3 py-2 text-right font-bold">
                        Confirmation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {confidence.fields.map((item) => (
                      <tr key={item.key}>
                        <td className="px-3 py-2 font-semibold text-foreground">
                          {item.label}
                        </td>
                        <td
                          className="whitespace-nowrap px-3 py-2 font-mono font-semibold tabular-nums text-foreground"
                          data-assumption-ledger-value={item.key}
                        >
                          {formatAssumptionLedgerValue(item.key, values)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {inputSourceClassLabel(item.sourceClass)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {item.sourceLabel}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                          {item.maxPoints === 0
                            ? "—"
                            : `${item.earnedPoints.toFixed(1)} / ${item.maxPoints}`}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {item.sourceClass === "not-applicable" ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <button
                              type="button"
                              aria-pressed={verified.has(item.key)}
                              aria-label={
                                verified.has(item.key)
                                  ? `Mark ${item.label} as unverified`
                                  : `Confirm ${item.label} as verified`
                              }
                              onClick={() =>
                                onToggleVerified(
                                  item.key,
                                  !verified.has(item.key),
                                )
                              }
                              className={cn(
                                "inline-flex min-h-11 items-center gap-1 rounded-md border px-3 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                verified.has(item.key)
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                  : "border-border bg-background text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <Check aria-hidden className="size-3" />
                              {verified.has(item.key) ? "Confirmed" : "Confirm"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p className="border-t border-border bg-muted/20 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            {advocacyContractEnabled
              ? `Legacy Input Confidence v${confidence.methodVersion} remains stored for compatibility, but its percentage and Offer Ready stages do not control this view. Browser self-confirmation remains “User confirmed”; only server-resolved, owner-scoped evidence may count as evidence-verified.`
              : `Deterministic Input Confidence v${confidence.methodVersion}: verified 100%, property-specific 80%, local estimate 65%, user estimate 50%, market benchmark 45%, generic default 20%, missing 0%. Field weights reflect decision impact. The score is not statistical certainty. Strategy-specific ARV, refinance, hold-time, and flip assumptions are outside this base score and must be verified separately in their strategy panels.`}
          </p>
        </div>
      </details>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  suffix,
  help,
}: {
  label: string;
  value: string;
  suffix?: string;
  help: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background p-3 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
        {label}
      </p>
      <p className="mt-1 break-words font-mono text-lg font-extrabold tabular-nums text-foreground sm:text-xl">
        {value}
        {suffix ? (
          <span className="text-xs text-muted-foreground">{suffix}</span>
        ) : null}
      </p>
      <p className="mt-0.5 text-[9px] text-muted-foreground">{help}</p>
    </div>
  );
}
