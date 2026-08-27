"use client";

/**
 * Sticky bottom Calculate bar - MOBILE ONLY. Appears once the user has
 * scrolled past the PropertyDetailsSection (so we don't double up on
 * the in-form Calculate button when it's still on screen). Submits the
 * primary `<form>` it's nested under, mirroring the in-form button's
 * behavior. Hidden on desktop because the form column is short enough
 * to keep the in-form button reachable.
 *
 * Note: this component is rendered INSIDE the investcalc-page form so
 * the implicit `type="submit"` triggers the same submit handler the
 * in-form button does. No extra wiring needed.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Calculator, ChevronUp, Loader2 } from "lucide-react";

import type { LivePreviewSnapshot } from "./live-verdict-panel";
import { cn } from "@/lib/utils";

type Props = {
  isCalculating: boolean;
  /**
   * True once an analysis result is on the page. The bar retires while
   * the user is scrolled into the results section — a fixed "Run
   * analysis" CTA over the verdict readthrough is stale chrome that eats
   * ~12% of a phone viewport. Scrolling back up into the form (to tweak
   * inputs for a re-run) brings the bar back.
   */
  hasResults?: boolean;
  /**
   * Optional one-line context shown above the button when set - e.g.
   * "Auto-saved · 3s ago" or the property address being analyzed.
   * Keeps the sticky bar from feeling like dead chrome.
   */
  contextLabel?: string;
  /**
   * Optional pre-run live verdict snapshot. When set (the caller gates it
   * to the pre-results state), the bar becomes a verdict dock: a compact
   * readout (tier pill + score + monthly cash flow) renders alongside the
   * Run button, and tapping the readout expands a small sheet with the
   * cap rate + DSCR lines (tap again / swipe down closes). When absent —
   * results on screen, or a form too empty to preview — the bar renders
   * exactly as it did before this prop existed.
   */
  livePreview?: LivePreviewSnapshot | null;
  /** Role/property-aware label shared with the in-form primary action. */
  ctaLabel?: string;
  /** When supplied, the no-property action loads the shared sample. */
  onTrySample?: () => void;
  /** Optional deliberate run handler for pre-submit target/enrichment gates. */
  onCalculate?: () => void;
  /** Mirrors the in-form action's disabled state while criteria resolve. */
  isActionDisabled?: boolean;
};

export function StickyCalculateBar({
  isCalculating,
  hasResults = false,
  contextLabel,
  livePreview = null,
  ctaLabel = "Run analysis",
  onTrySample,
  onCalculate,
  isActionDisabled = false,
}: Props) {
  const [pastFold, setPastFold] = useState(false);
  const [formInView, setFormInView] = useState(true);
  const [submitInView, setSubmitInView] = useState(false);
  const [resultsInView, setResultsInView] = useState(false);
  // The in-form LiveVerdictPanel card on screen → suppress the dock READOUT
  // (the plain Run bar stays): at the natural typing scroll position the
  // panel + dock otherwise showed the identical verdict twice ~600px apart
  // on one 375px viewport (BROWSER-4).
  const [livePanelInView, setLivePanelInView] = useState(false);
  // Verdict-dock sheet open/closed. Collapses automatically whenever the
  // readout itself goes away (results land, preview clears) so the sheet
  // can never reappear stale on the next form session.
  const [dockExpanded, setDockExpanded] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const hasLivePreview = Boolean(livePreview);

  useEffect(() => {
    // Show once the user has scrolled past the first ~600px of the
    // form - enough that the in-form button is below the fold. Plain
    // scroll listener (no rAF needed) because the math is one branch
    // per scroll tick.
    const onScroll = () => {
      setPastFold(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Four signals the scroll threshold can't see (1-3 retire the whole
    // bar; 4 suppresses only the verdict readout):
    // 1. The calculator form itself off screen → hide (on the homepage
    //    the marketing sections above/below the form get the funnel bar
    //    instead — a "Run analysis" CTA there is out of context).
    // 2. The real in-form submit button on screen → hide (never render
    //    two identical "Run analysis" buttons 80px apart).
    // 3. The results section on screen after a run → hide (the CTA is
    //    stale while the user reads the verdict). Re-observed when
    //    hasResults flips because the results section mounts then.
    // 4. The in-form LiveVerdictPanel card on screen → suppress the dock
    //    readout it mirrors (never the same verdict twice on one viewport).
    //    The panel mounts exactly when the caller passes a livePreview, so
    //    re-query when that flips.
    const formEl = document.querySelector('[data-calc-form="true"]');
    const submitEl = document.querySelector('[data-inform-submit="true"]');
    const resultsEl = hasResults
      ? document.querySelector('[data-analysis-results="true"]')
      : null;
    const livePanelEl = hasLivePreview
      ? document.querySelector("[data-live-verdict]")
      : null;
    const observers: IntersectionObserver[] = [];
    if (formEl) {
      const o = new IntersectionObserver(([e]) =>
        setFormInView(e?.isIntersecting ?? false),
      );
      o.observe(formEl);
      observers.push(o);
    } else {
      setFormInView(true);
    }
    if (submitEl) {
      const o = new IntersectionObserver(([e]) =>
        setSubmitInView(e?.isIntersecting ?? false),
      );
      o.observe(submitEl);
      observers.push(o);
    }
    if (resultsEl) {
      const o = new IntersectionObserver(([e]) =>
        setResultsInView(e?.isIntersecting ?? false),
      );
      o.observe(resultsEl);
      observers.push(o);
    } else {
      setResultsInView(false);
    }
    if (livePanelEl) {
      const o = new IntersectionObserver(([e]) =>
        setLivePanelInView(e?.isIntersecting ?? false),
      );
      o.observe(livePanelEl);
      observers.push(o);
    } else {
      setLivePanelInView(false);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [hasResults, hasLivePreview]);

  const visible =
    pastFold && formInView && !submitInView && !(hasResults && resultsInView);
  const rendered = visible || isCalculating;

  // Compact verdict readout: pre-results only (caller also gates the prop),
  // never while the spinner has taken over the bar, and never while the
  // in-form LiveVerdictPanel it mirrors is on screen (BROWSER-4).
  const showReadout =
    hasLivePreview && !hasResults && !isCalculating && !livePanelInView;

  useEffect(() => {
    if (!showReadout) setDockExpanded(false);
  }, [showReadout]);

  // Publish visibility on <html> so the marketing StickyConversionBar
  // yields (globals.css hides it while data-calc-bar is up). Inside the
  // form the PRODUCT action outranks the funnel CTA — the old rule had
  // the priority backwards and made people fill the form under a
  // permanent "Analyze free" banner.
  useEffect(() => {
    const root = document.documentElement;
    if (rendered) root.setAttribute("data-calc-bar", "1");
    else root.removeAttribute("data-calc-bar");
    return () => root.removeAttribute("data-calc-bar");
  }, [rendered]);

  // While calculating we always render - gives the user a visible
  // spinner anchor even if they've scrolled back to the top.
  if (!rendered) return null;

  return (
    <div
      data-sticky-calc-bar=""
      className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-12px_28px_rgba(15,23,42,0.10)] backdrop-blur supports-[backdrop-filter]:bg-card/85"
      role="presentation"
    >
      {contextLabel ? (
        <p className="mb-1.5 truncate text-center text-[11px] text-muted-foreground">
          {contextLabel}
        </p>
      ) : null}
      {showReadout && livePreview ? (
        // Expanded dock sheet: the two metrics the collapsed readout can't
        // fit. Tap the readout again (or swipe down on the sheet) to close.
        // Mounted-but-hidden while collapsed so the readout button's
        // aria-controls always references an existing element (ARIA
        // validity — a dangling reference trips axe even though
        // aria-expanded alone would convey the state).
        <div
          id="verdict-dock-sheet"
          hidden={!dockExpanded}
          className="mb-2 rounded-xl border border-dashed border-primary/30 bg-[var(--brand-blue-light)] px-3 py-2.5"
          onTouchStart={(e) => {
            touchStartYRef.current = e.touches[0]?.clientY ?? null;
          }}
          onTouchEnd={(e) => {
            const startY = touchStartYRef.current;
            touchStartYRef.current = null;
            const endY = e.changedTouches[0]?.clientY;
            // Swipe down (finger moved ≥40px toward the bottom) closes.
            if (
              startY !== null &&
              typeof endY === "number" &&
              endY - startY >= 40
            ) {
              setDockExpanded(false);
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Cap rate
            </span>
            <span className="font-mono text-sm font-bold tabular-nums text-foreground">
              {livePreview.capRate.toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              DSCR
            </span>
            <span className="font-mono text-sm font-bold tabular-nums text-foreground">
              {livePreview.monthlyPayment <= 0
                ? "—"
                : livePreview.dscr.toFixed(2)}
            </span>
          </div>
        </div>
      ) : null}
      {showReadout && livePreview ? (
        // Verdict dock: compact live readout + Run, sharing the row. The
        // readout is a button (not a live region) - tapping it toggles the
        // cap-rate/DSCR sheet above.
        <div className="flex flex-col items-stretch gap-2 min-[280px]:flex-row">
          <button
            type="button"
            onClick={() => setDockExpanded((v) => !v)}
            aria-expanded={dockExpanded}
            aria-controls="verdict-dock-sheet"
            aria-label={`Live underwriting preview: cash flow ${Math.round(livePreview.netCashFlow)} dollars per month. ${dockExpanded ? "Hide" : "Show"} cap rate and DSCR`}
            className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-muted/40 px-2.5 py-2 text-left"
          >
            <span className="shrink-0 rounded-full border border-primary/25 bg-background px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary">
              Preview
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block truncate font-mono text-sm font-bold leading-tight tabular-nums",
                  // Sign + color keyed off the SAME rounded value so a
                  // sub-dollar negative never renders "-$0" (mirrors the
                  // in-form live preview card).
                  Math.round(livePreview.netCashFlow) >= 0
                    ? "text-[var(--metric-positive)]"
                    : "text-[var(--metric-negative)]",
                )}
              >
                {Math.round(livePreview.netCashFlow) >= 0 ? "+" : "-"}$
                {Math.abs(Math.round(livePreview.netCashFlow)).toLocaleString()}
                /mo
              </span>
            </span>
            <ChevronUp
              className={cn(
                "ml-auto size-4 shrink-0 text-muted-foreground transition-transform",
                dockExpanded && "rotate-180",
              )}
            />
          </button>
          <button
            type={onTrySample || onCalculate ? "button" : "submit"}
            onClick={onTrySample ?? onCalculate}
            disabled={isCalculating || isActionDisabled}
            className="flex min-h-12 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/95 disabled:opacity-70 min-[280px]:w-auto"
          >
            <Calculator className="size-4" />
            {ctaLabel}
            <ArrowUpRight className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type={onTrySample || onCalculate ? "button" : "submit"}
          onClick={onTrySample ?? onCalculate}
          disabled={isCalculating || isActionDisabled}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-2 py-2 text-center text-sm font-bold leading-snug text-primary-foreground shadow-md hover:bg-primary/95 disabled:opacity-70"
        >
          {isCalculating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Running analysis…
            </>
          ) : (
            <>
              <Calculator className="size-4" />
              {ctaLabel}
              <ArrowUpRight className="size-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
