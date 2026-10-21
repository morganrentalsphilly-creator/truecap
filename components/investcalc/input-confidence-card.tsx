"use client";

import { useEffect, useMemo, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { ScrollX } from "@/components/ui/scroll-x";

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

// The Sign rule: the risk level is a pass or a miss against the verified
// inputs, so it may carry green, the highlight text or red; nothing else on
// the card does.
const RISK_STYLE = {
  low: "border-positive/30 bg-positive-light text-positive",
  moderate: "border-caution/30 bg-caution-light text-caution-text",
  high: "border-negative/30 bg-negative/10 text-destructive-text",
} as const;

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

const SOURCE_TAG_CLASS =
  "inline-flex max-w-full items-center rounded-sm border border-border px-1.5 py-0.5 font-mono text-2xs leading-tight text-muted-foreground [overflow-wrap:anywhere]";

const VERIFY_TOGGLE_CLASS =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-[color,background-color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

function verifyToggleTone(verified: boolean): string {
  return verified
    ? "border-positive/30 bg-positive-light text-positive"
    : "border-input bg-card text-foreground hover:bg-band";
}

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
 *
 * Blueprint (2026-10): one heading in the display face, the score as a figure
 * on the 2px rule, the inputs to verify as rows on 1px lines (name, the
 * source as a Geist Mono tag, the state, one control), the scope line, and
 * the full ledger behind one disclosure. No stepper, no tiles, no cards in
 * the card.
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
  // The three readiness stages. The current one's detail is the one line
  // under the status; the ladder itself no longer renders as three boxes.
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
  const visibleQueue = confidence.verificationQueue.slice(0, 3).map((item) => ({
    ...item,
    sourceDisplay: inputSourceClassLabel(item.sourceClass),
  }));
  const verified = new Set(confidence.verifiedFields);
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
  const statusHeadline = showOfferReadyStatus
    ? confidence.stage === "offer-ready"
      ? "Offer-ready"
      : remaining <= 3 && remaining > 0
        ? "Almost offer-ready"
        : confidence.stage === "verified"
          ? "Assumptions reviewed"
          : "Preliminary screen"
    : "Input verification";
  const currentStageDetail = readinessSteps[readinessStep].detail;
  const summarySentence = showOfferReadyStatus
    ? confidence.stage === "offer-ready"
      ? "The required inputs have been explicitly confirmed for this underwrite. Re-check anything that changes before recording a decision."
      : `${remaining} required ${remaining === 1 ? "input" : "inputs"} still need confirmation before this analysis is Offer Ready.`
    : `${remaining} high-priority ${remaining === 1 ? "input" : "inputs"} still need confirmation before relying on this underwrite.`;

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
        className="rounded-lg border border-border bg-card shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <div className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <h2
            id="input-confidence-title"
            className="font-display text-xl text-foreground"
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
            className="mx-4 mb-3 rounded-md border border-caution/40 bg-caution-light px-3 py-2 text-xs font-medium leading-relaxed text-caution-text sm:mx-5"
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
                    <p className="text-sm font-semibold text-foreground">
                      {label} ·{" "}
                      <span className="font-figure">
                        {formatAssumptionLedgerValue(field.key, values)}
                      </span>
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
                    className="min-h-11 w-full rounded-md sm:w-auto"
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
                className="min-h-11 rounded-md"
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
      className="rounded-lg border border-border bg-card p-4 shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:p-6"
    >
      <h2
        id="input-confidence-title"
        className="font-display text-xl text-foreground"
      >
        Decision confidence
      </h2>

      {/* The one figure, on the 2px rule a result card keeps for its key
          figure's label row. */}
      <div className="mt-4 flex items-baseline justify-between gap-4 border-b-2 border-foreground pb-2">
        <p className="text-sm font-semibold text-foreground">
          Input confidence
          <span className="ml-2 text-2xs font-normal text-muted-foreground">
            Input readiness
          </span>
        </p>
        <p className="font-display font-figure text-2xl leading-none text-foreground sm:text-3xl">
          {confidence.score}%
        </p>
      </div>

      <div aria-live="polite" aria-atomic="true" className="mt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="text-base font-semibold text-foreground">
            {statusHeadline}
          </p>
          <span className="inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
            Sensitivity risk (unverified inputs)
            <span
              className={cn(
                "inline-flex rounded-sm border px-1.5 py-0.5 text-2xs font-semibold capitalize",
                RISK_STYLE[confidence.sensitivityRisk],
              )}
            >
              {confidence.sensitivityRisk}
            </span>
          </span>
        </div>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {summarySentence}
        </p>
        {showOfferReadyStatus ? (
          <p className="mt-1 text-2xs text-muted-foreground">
            {currentStageDetail}.
          </p>
        ) : null}
        <p className="mt-2 max-w-xl text-2xs leading-relaxed text-muted-foreground">
          Scope: rental base-case inputs. ARV, refinance, hold-time, and{" "}
          flip assumptions are outside this score.
        </p>
      </div>

      {visibleQueue.length > 0 ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 border-b border-foreground pb-2">
            <p className="text-sm font-semibold text-foreground">Verify next</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEditAssumptions}
              className="min-h-11 rounded-md text-xs"
            >
              {/* Deliberately NOT "Edit assumptions". The decision summary's
                  primary control already carries that name, and this row can
                  render at the same time — two buttons with one accessible
                  name pointing at the same handler is a screen-reader trap,
                  and it is what made the page-scoped e2e locator ambiguous. */}
              Edit inputs
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {visibleQueue.map((item, index) => {
              const isVerified = verified.has(item.key);
              return (
                <li
                  key={item.key}
                  className="grid gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {item.label}
                      </p>
                      <span className={SOURCE_TAG_CLASS}>
                        {item.sourceLabel}
                      </span>
                      <span
                        className={cn(
                          "text-2xs font-medium",
                          isVerified ? "text-positive" : "text-muted-foreground",
                        )}
                      >
                        {isVerified ? "Verified" : item.sourceDisplay}
                      </span>
                    </div>
                    <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
                      {item.reason}
                      {item.verifyAction ? ` ${item.verifyAction}.` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-input-confidence-queue-action
                    onClick={() => {
                      if (!isVerified) pendingQueueFocusIndex.current = index;
                      onToggleVerified(item.key, !isVerified);
                    }}
                    aria-pressed={isVerified}
                    aria-label={
                      isVerified
                        ? `Mark ${item.label} as unverified`
                        : `Confirm ${item.label} as verified`
                    }
                    className={cn(VERIFY_TOGGLE_CLASS, verifyToggleTone(isVerified))}
                  >
                    <Check aria-hidden className="size-3.5" />
                    {isVerified ? "Verified" : "Mark verified"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-5 border-t border-border pt-3 text-sm text-positive">
          {showOfferReadyStatus
            ? "Required inputs confirmed. Offer Ready is a data-readiness status, not a recommendation or guarantee."
            : "Priority inputs confirmed for this underwrite. Re-check anything that changes before relying on it."}
        </p>
      )}

      <details className="group mt-4 border-t border-border pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-xs font-semibold text-muted-foreground marker:content-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          See all input sources and scoring rules
          <ChevronDown
            aria-hidden
            className="size-4 transition-transform duration-150 group-open:rotate-180"
          />
        </summary>
        <div
          role="region"
          aria-label="All input sources and confidence scoring"
          tabIndex={0}
          className="mt-3 border-t border-border focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <ul className="divide-y divide-border sm:hidden">
            {confidence.fields.map((item) => (
              <li key={item.key} className="space-y-2 py-3 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {item.label}
                    </p>
                    <p
                      className="mt-0.5 break-words font-figure text-sm font-semibold text-foreground"
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
                      <span className="font-figure">
                        {item.maxPoints === 0
                          ? "not applicable"
                          : `${item.earnedPoints.toFixed(1)} of ${item.maxPoints}`}
                      </span>
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
                        VERIFY_TOGGLE_CLASS,
                        "text-xs",
                        verifyToggleTone(verified.has(item.key)),
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
          {/* No tabIndex or aria-label here: ScrollX names the region
              and makes it a tab stop only while it overflows. Passing
              them unconditionally left a role-less div with an aria-label
              (which assistive tech drops) and a tab stop on wide screens.
              cue + stickyFirstColumn: between 640 and about 860px the
              Confirmation column was off-screen with nothing to say so.
              The head is the solid band so the pinned first head matches
              its row; the wrapper pads the cue to the cells' px-3. */}
          <div className="[&>p]:px-3 [&>p]:pb-2">
          <ScrollX label="Input confidence table" cue stickyFirstColumn className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[760px] text-left text-xs">
              <caption className="sr-only">
                Input value, source, scoring points, and confirmation status
                for every underwriting input
              </caption>
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Input</th>
                  <th className="px-3 py-2 font-semibold">Value</th>
                  <th className="px-3 py-2 font-semibold">Source class</th>
                  <th className="px-3 py-2 font-semibold">Source</th>
                  <th className="px-3 py-2 text-right font-semibold">Points</th>
                  <th className="px-3 py-2 text-right font-semibold">
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
                      className="whitespace-nowrap px-3 py-2 font-figure font-semibold text-foreground"
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
                    <td className="px-3 py-2 text-right font-figure text-foreground">
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
                            VERIFY_TOGGLE_CLASS,
                            "text-xs",
                            verifyToggleTone(verified.has(item.key)),
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
          </ScrollX>
          </div>
          <p className="border-t border-border px-3 py-2 text-2xs leading-relaxed text-muted-foreground">
            {`Deterministic Input Confidence v${confidence.methodVersion}: verified 100%, property-specific 80%, local estimate 65%, user estimate 50%, market benchmark 45%, generic default 20%, missing 0%. Field weights reflect decision impact. The score is not statistical certainty. ARV, refinance, hold-time, and flip assumptions are outside this base score.`}
          </p>
        </div>
      </details>
    </section>
  );
}
