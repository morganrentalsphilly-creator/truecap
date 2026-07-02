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

import { useEffect, useState } from "react";
import { ArrowUpRight, Calculator, Loader2 } from "lucide-react";

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
};

export function StickyCalculateBar({ isCalculating, hasResults = false, contextLabel }: Props) {
  const [pastFold, setPastFold] = useState(false);
  const [formInView, setFormInView] = useState(true);
  const [submitInView, setSubmitInView] = useState(false);
  const [resultsInView, setResultsInView] = useState(false);

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
    // Three retirement signals the scroll threshold can't see:
    // 1. The calculator form itself off screen → hide (on the homepage
    //    the marketing sections above/below the form get the funnel bar
    //    instead — a "Run analysis" CTA there is out of context).
    // 2. The real in-form submit button on screen → hide (never render
    //    two identical "Run analysis" buttons 80px apart).
    // 3. The results section on screen after a run → hide (the CTA is
    //    stale while the user reads the verdict). Re-observed when
    //    hasResults flips because the results section mounts then.
    const formEl = document.querySelector('[data-calc-form="true"]');
    const submitEl = document.querySelector('[data-inform-submit="true"]');
    const resultsEl = hasResults
      ? document.querySelector('[data-analysis-results="true"]')
      : null;
    const observers: IntersectionObserver[] = [];
    if (formEl) {
      const o = new IntersectionObserver(([e]) => setFormInView(e?.isIntersecting ?? false));
      o.observe(formEl);
      observers.push(o);
    } else {
      setFormInView(true);
    }
    if (submitEl) {
      const o = new IntersectionObserver(([e]) => setSubmitInView(e?.isIntersecting ?? false));
      o.observe(submitEl);
      observers.push(o);
    }
    if (resultsEl) {
      const o = new IntersectionObserver(([e]) => setResultsInView(e?.isIntersecting ?? false));
      o.observe(resultsEl);
      observers.push(o);
    } else {
      setResultsInView(false);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [hasResults]);

  const visible = pastFold && formInView && !submitInView && !(hasResults && resultsInView);
  const rendered = visible || isCalculating;

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
      <button
        type="submit"
        disabled={isCalculating}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/95 disabled:opacity-70"
      >
        {isCalculating ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Running analysis…
          </>
        ) : (
          <>
            <Calculator className="size-4" />
            Run analysis
            <ArrowUpRight className="size-4" />
          </>
        )}
      </button>
    </div>
  );
}
