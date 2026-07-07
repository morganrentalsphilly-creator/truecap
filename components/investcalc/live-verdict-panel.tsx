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

/** The lightweight pre-run verdict snapshot computed by the form watcher. */
export type LivePreviewSnapshot = {
  tier: DealTier;
  score: number;
  netCashFlow: number;
  capRate: number;
  dscr: number;
  monthlyPayment: number;
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
          className="rounded-2xl border-2 border-dashed border-primary/30 bg-[var(--brand-blue-light)] p-4 sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Live preview
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
              / 100 Deal Score
            </span>
          </div>
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
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Cap rate
              </div>
              <div className="font-mono text-lg font-bold tabular-nums text-foreground sm:text-xl">
                {livePreview.capRate.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                DSCR
              </div>
              <div className="font-mono text-lg font-bold tabular-nums text-foreground sm:text-xl">
                {livePreview.monthlyPayment <= 0 ? "—" : livePreview.dscr.toFixed(2)}
              </div>
            </div>
          </div>
          <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
            Updating as you type — run the full analysis for projections, tax strategy &amp; exit scenarios.
          </p>
        </div>
      ) : null}
    </>
  );
}
