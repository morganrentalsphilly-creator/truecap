"use client";

/**
 * Live instant-verdict preview panel — EXTRACTED verbatim from
 * investcalc-page.tsx (the dashed live-preview card + its persistent
 * sr-only live region). Pure presentational: all state (livePreview,
 * the debounced livePreviewMsg, and the show/hide gate) stays in
 * investcalc-page.tsx and arrives as props. The compact snapshot type
 * is exported so the sticky verdict dock can share it.
 */

import type { DealTier } from "@/lib/verdict";
import { cn } from "@/lib/utils";
import { GlossaryTip } from "./glossary-tip";

/** The lightweight pre-run verdict snapshot computed by the form watcher. */
export type LivePreviewSnapshot = {
  tier: DealTier;
  score: number;
  netCashFlow: number;
  capRate: number;
  dscr: number;
  monthlyPayment: number;
  /** Paid-only break-even purchase price (cash flow ≥ $0), solved only
   *  when the preview is negative. Null for Free, positive, or unsolvable. */
  breakEvenPrice: number | null;
  /** One-line "what's dragging this" for MIXED/MARGINAL tiers (computed
   *  by lib/limiting-factor.ts alongside the tier). Null for every other
   *  tier and for negative cash flow, where the break-even hint above
   *  already names the next move. */
  limitingFactor: string | null;
};

type Props = {
  /**
   * The combined visibility gate, computed at the call site exactly as
   * before extraction: `!showResults && !analysisResult && !isCalculating`.
   * Gates the SR live region; the visible card additionally requires a
   * non-null livePreview.
   */
  active: boolean;
  livePreview: LivePreviewSnapshot | null;
  /** Debounced screen-reader announcement (owned by investcalc-page). */
  livePreviewMsg: string;
};

export function LiveVerdictPanel({ active, livePreview, livePreviewMsg }: Props) {
  return (
    <>
      {/* Live instant-verdict preview - forms as the user types, before
          they ever click Run. The "60 seconds" promise made literal:
          the answer is already on screen. Pure client math; the full
          dashboard still lives behind the explicit Run below. */}
      {/* Persistent SR live region (always mounted, sibling to the
          conditional card) so the verdict-forming announcement is
          reliable and concise - mirrors the what-if-sliders pattern.
          The visible card is NOT a live region (it would churn the whole
          verbose card on every keystroke). */}
      {active ? (
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {livePreviewMsg}
        </span>
      ) : null}
      {active && livePreview ? (
        // data-live-verdict: observed by StickyCalculateBar so the dock
        // readout suppresses itself while this card is on screen — the same
        // answer must never render twice on one phone viewport (BROWSER-4).
        <div
          data-live-verdict=""
          // lg-only "forms as you type" affordance for the desktop cockpit's
          // sticky rail: the card fades/rises in when the preview first
          // parses (mount-time animation from tw-animate-css), consistent
          // with the dashed live-preview styling it already carries. Guarded
          // by motion-safe; below lg no class applies, so the mobile card is
          // byte-identical.
          className="rounded-2xl border-2 border-dashed border-primary/30 bg-[var(--brand-blue-light)] p-4 sm:p-5 lg:motion-safe:animate-in lg:motion-safe:fade-in lg:motion-safe:slide-in-from-bottom-2 lg:motion-safe:duration-300"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--brand-blue-text)]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Live screening preview
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide",
                livePreview.tier === "Strong" && "bg-[var(--brand-green)] text-white",
                livePreview.tier === "Solid" && "bg-primary text-primary-foreground",
                livePreview.tier === "Mixed" && "bg-amber-500 text-white",
                livePreview.tier === "Marginal" && "bg-orange-500 text-white",
                livePreview.tier === "Negative" && "bg-red-600 text-white"
              )}
            >
              {livePreview.tier}
            </span>
          </div>
          <div className="mb-3 flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-extrabold tabular-nums text-foreground">
              {livePreview.score}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              / 100 Screening Index
            </span>
          </div>
          <p className="-mt-2 mb-3 text-[10px] leading-snug text-muted-foreground">
            Secondary screening heuristic · not an investment recommendation.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Cash flow
              </div>
              <div
                className={cn(
                  "font-mono text-lg font-bold tabular-nums sm:text-xl",
                  // Sign + color keyed off the SAME rounded value so a
                  // sub-dollar negative (e.g. -$0.30) never renders "-$0".
                  Math.round(livePreview.netCashFlow) >= 0
                    ? "text-[var(--metric-positive)]"
                    : "text-[var(--metric-negative)]"
                )}
              >
                {Math.round(livePreview.netCashFlow) >= 0 ? "+" : "-"}$
                {Math.abs(Math.round(livePreview.netCashFlow)).toLocaleString()}
              </div>
            </div>
            <div>
              {/* GlossaryTip on the FIRST place this jargon ever appears —
                  the preview renders before the tipped metrics band exists,
                  so a first-timer meets "Cap rate"/"DSCR" here first. Same
                  no-underline treatment as the MetricCard labels. */}
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <GlossaryTip term="capRate" className="!no-underline">
                  Cap rate
                </GlossaryTip>
              </div>
              <div className="font-mono text-lg font-bold tabular-nums text-foreground sm:text-xl">
                {livePreview.capRate.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <GlossaryTip term="dscr" className="!no-underline">
                  DSCR
                </GlossaryTip>
              </div>
              <div className="font-mono text-lg font-bold tabular-nums text-foreground sm:text-xl">
                {livePreview.monthlyPayment <= 0 ? "—" : livePreview.dscr.toFixed(2)}
              </div>
            </div>
          </div>
          {/* Path out of a negative first number: most cold visitors' first
              address won't cash-flow at asking price, and "Negative · 0/100"
              with no next move invites a bounce. The break-even price turns
              it into an invitation to play with the one lever they control. */}
          {Math.round(livePreview.netCashFlow) < 0 && livePreview.breakEvenPrice != null ? (
            <p className="mt-2.5 rounded-lg bg-background/60 px-2.5 py-2 text-[11px] font-semibold leading-snug text-foreground">
              Breaks even near{" "}
              <span className="font-mono font-bold">
                ${Math.round(livePreview.breakEvenPrice).toLocaleString()}
              </span>{" "}
              — review that modeled break-even point against the price assumption.
            </p>
          ) : Math.round(livePreview.netCashFlow) < 0 ? (
            <p className="mt-2.5 rounded-lg bg-background/60 px-2.5 py-2 text-[11px] font-semibold leading-snug text-foreground">
              Negative at these assumptions. Run the full analysis to review the price, rent, financing, and expense levers.
            </p>
          ) : livePreview.limitingFactor ? (
            // Mixed/Marginal get the same next-move treatment Negative
            // already has: name the one metric dragging the verdict (facts
            // only — thresholds mirror classifyDeal, see lib/limiting-factor.ts)
            // so the amber pill isn't a dead end.
            <p className="mt-2.5 rounded-lg bg-background/60 px-2.5 py-2 text-[11px] font-semibold leading-snug text-foreground">
              {livePreview.limitingFactor}
            </p>
          ) : null}
          <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
            Updating as you type — run the full analysis for projections, illustrative tax impact &amp; modeled exits.
          </p>
        </div>
      ) : null}
    </>
  );
}
