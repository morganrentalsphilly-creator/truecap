"use client";

import { useEffect, useRef } from "react";
import { Check, ChevronDown, CircleAlert, Database, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  inputSourceClassLabel,
  type InputConfidenceFieldKey,
  type InputConfidenceResult,
} from "@/lib/input-confidence";
import { cn } from "@/lib/utils";

type Props = {
  confidence: InputConfidenceResult;
  dealFitScore?: number | null;
  showOfferReadyStatus?: boolean;
  onEditAssumptions: () => void;
  onToggleVerified: (key: InputConfidenceFieldKey, verified: boolean) => void;
};

const RISK_STYLE = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  moderate: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-red-200 bg-red-50 text-red-700",
} as const;

/**
 * Decision-trust summary. Deal Fit answers "are the economics attractive?";
 * Input Confidence answers "how decision-ready are the assumptions?". They
 * intentionally never blend into one score.
 */
export function InputConfidenceCard({
  confidence,
  dealFitScore,
  showOfferReadyStatus = true,
  onEditAssumptions,
  onToggleVerified,
}: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const pendingQueueFocusIndex = useRef<number | null>(null);
  const remaining = confidence.offerReadyRemaining.length;
  const visibleQueue = confidence.verificationQueue.slice(0, 3);
  const verified = new Set(confidence.verifiedFields);
  const statusHeadline = showOfferReadyStatus
    ? confidence.stage === "offer-ready"
      ? "Offer Ready"
      : remaining <= 3 && remaining > 0
        ? "Almost Offer Ready"
        : confidence.stageLabel
    : "Input verification";

  useEffect(() => {
    const requestedIndex = pendingQueueFocusIndex.current;
    if (requestedIndex == null) return;
    pendingQueueFocusIndex.current = null;
    const actions = cardRef.current?.querySelectorAll<HTMLButtonElement>(
      "[data-input-confidence-queue-action]"
    );
    const nextAction = actions?.[Math.min(requestedIndex, Math.max(0, actions.length - 1))];
    if (nextAction) nextAction.focus();
    else cardRef.current?.focus({ preventScroll: true });
  }, [confidence]);

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
            <h2 id="input-confidence-title" className="text-xs font-extrabold uppercase tracking-widest text-primary">
              Decision confidence
            </h2>
          </div>
          <div aria-live="polite" aria-atomic="true">
            <p className="mt-2 text-lg font-extrabold text-foreground">{statusHeadline}</p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {showOfferReadyStatus
                ? confidence.stage === "offer-ready"
                  ? "The required inputs have been explicitly confirmed for this underwrite. Re-check anything that changes before you offer."
                  : `${remaining} required ${remaining === 1 ? "input" : "inputs"} still need confirmation before this analysis is Offer Ready.`
                : `${remaining} high-priority ${remaining === 1 ? "input" : "inputs"} still need confirmation before relying on this underwrite.`}
            </p>
          </div>
        </div>

        <div
          role="group"
          className="grid shrink-0 grid-cols-1 gap-2 min-[360px]:grid-cols-3"
          aria-label="Decision confidence summary"
        >
          <SummaryMetric
            label="Deal Fit"
            value={dealFitScore == null ? "—" : `${Math.round(dealFitScore)}`}
            suffix={dealFitScore == null ? undefined : "/100"}
            help="Economics"
          />
          <SummaryMetric
            label="Input Confidence"
            value={`${confidence.score}%`}
            help="Readiness, not probability"
          />
          <div className="min-w-0 rounded-xl border border-border bg-background p-3 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
              Sensitivity risk
            </p>
            <span
              className={cn(
                "mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold capitalize",
                RISK_STYLE[confidence.sensitivityRisk]
              )}
            >
              {confidence.sensitivityRisk}
            </span>
            <p className="mt-1 text-[9px] text-muted-foreground">Unverified-input risk</p>
          </div>
        </div>
      </div>

      {visibleQueue.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
              <CircleAlert aria-hidden className="size-3.5 text-amber-600" />
              Verify next
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={onEditAssumptions} className="min-h-11 text-xs">
              Edit assumptions
            </Button>
          </div>
          <ul className="grid gap-2 lg:grid-cols-3">
            {visibleQueue.map((item, index) => (
              <li key={item.key} className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {inputSourceClassLabel(item.sourceClass)}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-input-confidence-queue-action
                    onClick={() => {
                      if (!verified.has(item.key)) pendingQueueFocusIndex.current = index;
                      onToggleVerified(item.key, !verified.has(item.key));
                    }}
                    aria-pressed={verified.has(item.key)}
                    aria-label={
                      verified.has(item.key)
                        ? `Mark ${item.label} as unverified`
                        : `Confirm ${item.label} as verified`
                    }
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border px-3 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      verified.has(item.key)
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-border bg-background text-foreground hover:border-primary/40"
                    )}
                  >
                    <Check aria-hidden className="size-3" />
                    {verified.has(item.key) ? "Verified" : "I verified it"}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>
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
            {showOfferReadyStatus
              ? "Required inputs confirmed. Offer Ready is a data-readiness status, not a recommendation or guarantee."
              : "Priority inputs confirmed for this underwrite. Re-check anything that changes before relying on it."}
          </p>
        </div>
      )}

      <details className="group mt-4 border-t border-border pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-xs font-semibold text-muted-foreground marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          See all input sources and scoring rules
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div
          role="region"
          aria-label="All input sources and confidence scoring"
          tabIndex={0}
          className="mt-3 overflow-x-auto rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <table className="w-full min-w-[760px] text-left text-xs">
            <caption className="sr-only">
              Input source, scoring points, and confirmation status for every underwriting input
            </caption>
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-bold">Input</th>
                <th className="px-3 py-2 font-bold">Source class</th>
                <th className="px-3 py-2 font-bold">Source</th>
                <th className="px-3 py-2 text-right font-bold">Points</th>
                <th className="px-3 py-2 text-right font-bold">Confirmation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {confidence.fields.map((item) => (
                <tr key={item.key}>
                  <td className="px-3 py-2 font-semibold text-foreground">{item.label}</td>
                  <td className="px-3 py-2 text-muted-foreground">{inputSourceClassLabel(item.sourceClass)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{item.sourceLabel}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                    {item.maxPoints === 0 ? "—" : `${item.earnedPoints.toFixed(1)} / ${item.maxPoints}`}
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
                        onClick={() => onToggleVerified(item.key, !verified.has(item.key))}
                        className={cn(
                          "inline-flex min-h-11 items-center gap-1 rounded-md border px-3 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          verified.has(item.key)
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
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
          <p className="border-t border-border bg-muted/20 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            Deterministic Input Confidence v{confidence.methodVersion}: verified 100%, property-specific 80%, local estimate 65%, user estimate 50%, market benchmark 45%, generic default 20%, missing 0%. Field weights reflect decision impact. The score is not statistical certainty.
            Strategy-specific ARV, refinance, hold-time, and flip assumptions are outside this base score and must be verified separately in their strategy panels.
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
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">{label}</p>
      <p className="mt-1 font-mono text-xl font-extrabold tabular-nums text-foreground sm:text-2xl">
        {value}
        {suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
      </p>
      <p className="mt-0.5 text-[9px] text-muted-foreground">{help}</p>
    </div>
  );
}
