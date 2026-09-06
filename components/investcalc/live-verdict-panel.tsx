"use client";

/**
 * Live instant-verdict preview panel — EXTRACTED verbatim from
 * investcalc-page.tsx (the dashed live-preview card + its persistent
 * sr-only live region). Pure presentational: all state (livePreview,
 * the debounced livePreviewMsg, and the show/hide gate) stays in
 * investcalc-page.tsx and arrives as props. The compact snapshot type
 * is exported so the sticky verdict dock can share it.
 */

import { cn } from "@/lib/utils";
import { formatDscr } from "@/lib/financial-presentation";
import { useCookieBannerOpen } from "@/lib/use-cookie-banner";
import { GlossaryTip } from "./glossary-tip";
import { useEffect, useState, type ReactNode } from "react";

/** The lightweight pre-run verdict snapshot computed by the form watcher. */
export type LivePreviewSnapshot = {
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
  /** Three high-impact assumptions shown as a concise preview summary. */
  assumptionBasis?: string;
  /** Desktop cockpit action placed directly beneath the live preview. */
  desktopAction?: ReactNode;
};

function DesktopAction({ children }: { children: ReactNode }) {
  const [submitInView, setSubmitInView] = useState(false);
  const cookieBannerOpen = useCookieBannerOpen();

  useEffect(() => {
    const submit = document.querySelector<HTMLElement>(
      '[data-inform-submit="true"]',
    );
    if (!submit) {
      setSubmitInView(false);
      return;
    }

    let frame = 0;
    const update = () => {
      const rect = submit.getBoundingClientRect();
      const cookieBanner = cookieBannerOpen
        ? document.querySelector<HTMLElement>(
            '[role="dialog"][aria-label="Cookie consent"]',
          )
        : null;
      const unobscuredBottom =
        cookieBanner?.getBoundingClientRect().top ?? window.innerHeight;

      // IntersectionObserver reports elements behind fixed overlays as
      // visible. Retire the cockpit action only when the canonical form CTA
      // is fully usable between the sticky header and any consent banner.
      setSubmitInView(
        rect.width > 0 &&
          rect.height > 0 &&
          rect.top >= 72 &&
          rect.bottom <= unobscuredBottom - 12,
      );
    };
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleUpdate);
    resizeObserver?.observe(submit);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    update();
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [cookieBannerOpen]);

  if (submitInView) return null;
  return <div className="mt-3 hidden lg:block">{children}</div>;
}

export function LiveVerdictPanel({
  active,
  livePreview,
  livePreviewMsg,
  assumptionBasis,
  desktopAction,
}: Props) {
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
        <span
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {livePreviewMsg}
        </span>
      ) : null}
      {active && !livePreview ? (
        <aside
          data-live-verdict-empty=""
          aria-label="Live screening preview guidance"
          className="hidden min-h-56 items-center rounded-2xl border border-dashed border-border/80 bg-card/60 p-6 lg:flex"
        >
          <div className="max-w-sm">
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-primary/35"
              />
              Live screening preview
            </p>
            <p className="mt-3 text-base font-semibold text-foreground">
              Your preliminary numbers will appear here
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Enter the price and expected monthly rent to see a live screening
              preview. Add the address when you&apos;re ready to run the full
              analysis.
            </p>
          </div>
        </aside>
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
            <span className="rounded-full border border-primary/25 bg-card px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-primary">
              Preliminary
            </span>
          </div>
          <p className="mb-1 text-sm font-bold leading-snug text-foreground">
            {Math.round(livePreview.netCashFlow) >= 0
              ? `About $${Math.abs(Math.round(livePreview.netCashFlow)).toLocaleString()}/month positive at these assumptions.`
              : `About $${Math.abs(Math.round(livePreview.netCashFlow)).toLocaleString()}/month negative at these assumptions.`}
          </p>
          {assumptionBasis ? (
            <p className="mb-3 text-[11px] leading-snug text-muted-foreground">
              Key assumptions shown: {assumptionBasis}. Price, rent, financing,
              taxes, and all expenses are included; review them before relying
              on this screen.
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-2 min-[320px]:grid-cols-3 sm:gap-3">
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
                    : "text-[var(--metric-negative)]",
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
                {formatDscr(
                  livePreview.dscr,
                  livePreview.monthlyPayment > 0,
                )}
              </div>
            </div>
          </div>
          {/* Path out of a negative first number: most cold visitors' first
              address won't cash-flow at asking price, and "Negative · 0/100"
              with no next move invites a bounce. The break-even price turns
              it into an invitation to play with the one lever they control. */}
          {Math.round(livePreview.netCashFlow) < 0 &&
          livePreview.breakEvenPrice != null ? (
            <p className="mt-2.5 rounded-lg bg-background/60 px-2.5 py-2 text-[11px] font-semibold leading-snug text-foreground">
              Breaks even near{" "}
              <span className="font-mono font-bold">
                ${Math.round(livePreview.breakEvenPrice).toLocaleString()}
              </span>{" "}
              — review that modeled break-even point against the price
              assumption.
            </p>
          ) : Math.round(livePreview.netCashFlow) < 0 ? (
            <p className="mt-2.5 rounded-lg bg-background/60 px-2.5 py-2 text-[11px] font-semibold leading-snug text-foreground">
              Negative at these assumptions. Run the full analysis to review the
              price, rent, financing, and expense levers.
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
            Updating as you type — run the full analysis for your
            Offer Ceiling, sensitivity, and 10-year cash-flow and equity projections.
          </p>
        </div>
      ) : null}
      {active && desktopAction ? (
        <DesktopAction>{desktopAction}</DesktopAction>
      ) : null}
    </>
  );
}
