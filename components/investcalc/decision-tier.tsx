"use client";

/**
 * TIER 1 — THE DECISION. The only thing above the fold on a results page.
 *
 * WHAT THIS REPLACES (Aug-2026 hierarchy rebuild): the Offer Ceiling — the thing
 * the product is sold on — used to render 9th, gated behind a four-input
 * targets form, and then AGAIN ~10 blocks lower as a hero. The two agreed on
 * first paint and silently diverged the moment a user edited a target: the
 * card re-solved on the edited targets while the hero stayed on the canonical
 * basis. Six action buttons competed beneath them, two of them filled-primary.
 *
 * THE MERGE (not a deletion): there is now ONE Offer Ceiling. The four targets
 * moved into the collapsed "Tune targets" disclosure below it, and editing
 * them recomputes THIS number in place. That removes the divergence rather
 * than picking a winner between the two old numbers.
 *
 * Offer Ceiling resolves with ZERO user input: targets seed from the user's buy
 * box when they have one, else the canonical basis (break-even cash flow +
 * DSCR 1.25 — lib/mao-targets).
 *
 * COMPUTE: this component calls calculateMaxAllowableOffer exactly the way
 * MaxOfferCard did, with the same target-building rules. It introduces no
 * math of its own — same engine, same basis, one caller instead of two.
 */

import { useEffect, useId, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { ChevronDown, Loader2, MoreHorizontal, Save, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { AnalysisResult } from "@/lib/calc-analysis";
import {
  calculateMaxAllowableOffer,
  type MaoTarget,
} from "@/lib/max-allowable-offer";
import {
  chooseMaoTargetFromBuyBox,
  describeMaoTarget,
  type BuyBoxReturnThresholds,
} from "@/lib/mao-targets";
import { buildVerdictSentence } from "@/lib/verdict-sentence";
import { Verdict } from "@/components/investcalc/verdict";
import { trackEvent } from "@/lib/analytics";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const numberOrUndefined = (s: string): number | undefined => {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

export type DecisionTierProps = {
  values: InvestmentFormValues | null;
  result: AnalysisResult | null;
  /** INTERNAL recommendation value; null while the Screening Index is loading. */
  recommendation: string | null;
  /** 0-100. Rendered as a small chip beside the verdict, never as the hero. */
  score: number | null;
  /** Analysis-level load. Gates the Offer Ceiling figure only. */
  isLoading: boolean;
  /** Screening Index load — gates ONLY the verdict sentence + score chip. The
   *  Offer Ceiling solve does not depend on it, so blocking the number behind
   *  it hid the product for the length of an unrelated fetch. */
  isScoreLoading?: boolean;
  /** Pro gate. When false the Offer Ceiling figure is not solved or shown. */
  canUseMaxOffer: boolean;
  buyBoxThresholds?: BuyBoxReturnThresholds | null;
  /** Sourcing/confidence disclosure — the single trust line's target. */
  trustLine: ReactNode;
  onSave: () => void;
  isSaving: boolean;
  isSaveLocked: boolean;
  saveLockedHint?: string;
  isSaved: boolean;
  hasUnsavedChanges: boolean;
  /** Everything that used to compete in the six-button row. */
  overflowActions: ReactNode;
  /**
   * Reports the EFFECTIVE target (seeded, then tuned) up to the dashboard so
   * "Or — make your current price work" solves the same targets this tier
   * solved Offer Ceiling with. Without this it would silently answer a different
   * question after any edit.
   */
  onTargetResolved?: (target: MaoTarget) => void;
};

export function DecisionTier({
  values,
  result,
  recommendation,
  score,
  isLoading,
  isScoreLoading = false,
  canUseMaxOffer,
  buyBoxThresholds,
  trustLine,
  onSave,
  isSaving,
  isSaveLocked,
  saveLockedHint,
  isSaved,
  hasUnsavedChanges,
  overflowActions,
  onTargetResolved,
}: DecisionTierProps) {
  const fieldId = useId();
  const isCashDeal = Boolean(result && result.monthlyPayment <= 0);

  // Buy-box seed beats our canonical defaults (lib/mao-targets rule 2).
  const seedTarget = useMemo(
    () => chooseMaoTargetFromBuyBox(buyBoxThresholds, { isCashPurchase: isCashDeal }),
    [buyBoxThresholds, isCashDeal]
  );

  const [capRateInput, setCapRateInput] = useState(() =>
    seedTarget?.capRate != null ? String(seedTarget.capRate) : ""
  );
  const [cocInput, setCocInput] = useState(() =>
    seedTarget?.cocReturn != null ? String(seedTarget.cocReturn) : ""
  );
  const [cashFlowInput, setCashFlowInput] = useState(() =>
    seedTarget ? (seedTarget.monthlyCashFlow != null ? String(seedTarget.monthlyCashFlow) : "") : "0"
  );
  const [dscrInput, setDscrInput] = useState(() =>
    seedTarget ? (seedTarget.dscr != null ? String(seedTarget.dscr) : "") : "1.25"
  );
  const [touched, setTouched] = useState(false);
  const [tuneOpen, setTuneOpen] = useState(false);

  // The buy-box report arrives async, so a late seed applies once — and never
  // clobbers targets the user already edited. (Same contract as MaxOfferCard.)
  const seedKey = seedTarget ? JSON.stringify(seedTarget) : null;
  useEffect(() => {
    if (touched || !seedTarget) return;
    setCapRateInput(seedTarget.capRate != null ? String(seedTarget.capRate) : "");
    setCocInput(seedTarget.cocReturn != null ? String(seedTarget.cocReturn) : "");
    setCashFlowInput(seedTarget.monthlyCashFlow != null ? String(seedTarget.monthlyCashFlow) : "");
    setDscrInput(seedTarget.dscr != null ? String(seedTarget.dscr) : "");
    // seedKey serializes the seed so a value-equal object doesn't re-fire.
  }, [seedKey, touched]); // eslint-disable-line react-hooks/exhaustive-deps

  const target: MaoTarget = useMemo(
    () => ({
      capRate: numberOrUndefined(capRateInput),
      cocReturn: numberOrUndefined(cocInput),
      monthlyCashFlow: numberOrUndefined(cashFlowInput),
      // Cash deals have no debt service — a DSCR floor could never pass.
      dscr: isCashDeal ? undefined : numberOrUndefined(dscrInput),
    }),
    [capRateInput, cocInput, cashFlowInput, dscrInput, isCashDeal]
  );

  const noTargetSet =
    target.capRate === undefined &&
    target.cocReturn === undefined &&
    target.monthlyCashFlow === undefined &&
    target.dscr === undefined;

  const mao = useMemo(() => {
    if (!values || !result || !canUseMaxOffer || noTargetSet) return null;
    return calculateMaxAllowableOffer(values, target);
  }, [values, result, canUseMaxOffer, noTargetSet, target]);

  const purchasePrice = values?.purchasePrice ?? null;
  const maxOffer = mao?.maxPrice ?? null;
  const gap = purchasePrice != null && maxOffer != null ? purchasePrice - maxOffer : null;
  const sentence = buildVerdictSentence({ recommendation, purchasePrice, maxOffer });

  useEffect(() => {
    onTargetResolved?.(target);
  }, [target, onTargetResolved]);

  // Did the decision actually reach the user? Fires once per solved offer.
  useEffect(() => {
    if (isLoading || !canUseMaxOffer) return;
    trackEvent("max_offer_viewed", { has_offer: maxOffer != null, tier: "decision" });
  }, [isLoading, canUseMaxOffer, maxOffer]);

  const onTargetChange =
    (setter: (v: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      setTouched(true);
      setter(event.target.value);
    };

  return (
    <section
      aria-label="Decision"
      data-decision-tier
      className="rounded-3xl border-2 border-primary/25 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-5 shadow-[0_12px_36px_rgba(0,112,196,0.10)] sm:p-7"
    >
      {/* 1 — what this is about */}
      {values?.address ? (
        <p className="truncate text-sm font-semibold text-muted-foreground" title={values.address}>
          {values.address}
        </p>
      ) : null}

      {/* 2 — THE number. Largest element on the page. */}
      {canUseMaxOffer ? (
        <div className="mt-3">
          {/* --brand-blue-text, not --primary: the label is small uppercase
              text and --primary measures 4.34:1 here, under the 4.5:1 AA bar.
              The codebase already ships this AA-safe sibling token. */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--brand-blue-text)]">
            Offer Ceiling
          </p>
          {isLoading ? (
            <div className="mt-1 h-14 w-56 animate-pulse rounded-xl bg-muted sm:h-16" />
          ) : maxOffer != null ? (
            <>
              <p className="font-mono text-5xl font-extrabold tabular-nums leading-none tracking-tight text-foreground sm:text-6xl">
                {money(maxOffer)}
              </p>
              {gap != null && purchasePrice != null ? (
                <p className="mt-2 text-sm font-semibold text-foreground sm:text-base">
                  {gap > 0
                    ? `${money(gap)} below the ${money(purchasePrice)} asking price`
                    : gap < 0
                      ? `${money(Math.abs(gap))} above the ${money(purchasePrice)} asking price`
                      : `Exactly the ${money(purchasePrice)} asking price`}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Highest modeled price that still meets the selected targets under the assumptions shown.
                Criteria: {describeMaoTarget(target)}. Not a recommended offer or appraisal.
              </p>
              {/* Tuning a target silently rewrote the page's headline number.
                  Announce it — this is the one value the product exists for. */}
              <span aria-live="polite" className="sr-only">
                Offer Ceiling {money(maxOffer)}, the highest modeled price that meets{" "}
                {describeMaoTarget(target)}.
              </span>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {noTargetSet
                ? "Set at least one target below to calculate an Offer Ceiling."
                : "No price clears these targets. Loosen one in Tune targets."}
            </p>
          )}
        </div>
      ) : null}

      {/* 3 — the verdict, as an instruction. Score is a CHIP, never the hero. */}
      {!isLoading && !isScoreLoading && recommendation ? (
        <div className="mt-5 flex flex-wrap items-start gap-x-3 gap-y-2">
          <h2 className="text-balance text-xl font-extrabold leading-tight text-foreground sm:text-2xl">
            {sentence.text}
          </h2>
          <span className="inline-flex shrink-0 items-center gap-2">
            <Verdict recommendation={recommendation} variant="compact" />
            {score != null ? (
              <span
                title="Secondary screening heuristic; not investment advice"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
              >
                <span>Screening Index · secondary</span>
                <span className="tabular-nums text-foreground">{score}</span>
                <span>/100</span>
              </span>
            ) : null}
          </span>
        </div>
      ) : null}

      {/* 4 — one trust line */}
      {trustLine ? <div className="mt-4">{trustLine}</div> : null}

      {/* 5 — ONE primary action; everything else behind More. */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          title={isSaveLocked ? saveLockedHint : undefined}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {isSaving ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden className="size-4" />
          )}
          {isSaved && !hasUnsavedChanges ? "Saved" : "Save deal"}
          {hasUnsavedChanges ? (
            <>
              <span aria-hidden className="size-1.5 rounded-full bg-[var(--brand-orange)]" />
              <span className="sr-only">(unsaved changes)</span>
            </>
          ) : null}
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <MoreHorizontal aria-hidden className="size-4" />
              More
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <div className="flex flex-col gap-1">{overflowActions}</div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 6 — Tune targets: the four inputs, demoted. Recomputes IN PLACE. */}
      {canUseMaxOffer ? (
        <div className="mt-5 border-t border-border/70 pt-4">
          <button
            type="button"
            onClick={() => {
              const next = !tuneOpen;
              setTuneOpen(next);
              if (next) trackEvent("tune_targets_opened");
            }}
            aria-expanded={tuneOpen}
            aria-controls={`${fieldId}-tune`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SlidersHorizontal aria-hidden className="size-4" />
            Tune targets
            <ChevronDown
              aria-hidden
              className={cn("size-4 transition-transform", tuneOpen && "rotate-180")}
            />
          </button>
          <div id={`${fieldId}-tune`} hidden={!tuneOpen} className="mt-3">
            <p className="mb-2 text-xs text-muted-foreground">
              The Offer Ceiling is the highest modeled price that still meets every target you set under the assumptions shown.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label htmlFor={`${fieldId}-cap`} className="text-xs">
                  Target cap rate
                </Label>
                <Input
                  id={`${fieldId}-cap`}
                  inputMode="decimal"
                  placeholder="Any"
                  value={capRateInput}
                  onChange={onTargetChange(setCapRateInput)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`${fieldId}-coc`} className="text-xs">
                  Target cash-on-cash
                </Label>
                <Input
                  id={`${fieldId}-coc`}
                  inputMode="decimal"
                  placeholder="Any"
                  value={cocInput}
                  onChange={onTargetChange(setCocInput)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`${fieldId}-cf`} className="text-xs">
                  Min cash flow / mo
                </Label>
                <Input
                  id={`${fieldId}-cf`}
                  inputMode="decimal"
                  placeholder="Any"
                  value={cashFlowInput}
                  onChange={onTargetChange(setCashFlowInput)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`${fieldId}-dscr`} className="text-xs">
                  Min DSCR
                </Label>
                <Input
                  id={`${fieldId}-dscr`}
                  inputMode="decimal"
                  placeholder={isCashDeal ? "N/A — cash" : "Any"}
                  value={isCashDeal ? "" : dscrInput}
                  disabled={isCashDeal}
                  onChange={onTargetChange(setDscrInput)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
