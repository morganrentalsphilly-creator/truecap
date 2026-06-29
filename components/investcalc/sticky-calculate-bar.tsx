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
   * Optional one-line context shown above the button when set - e.g.
   * "Auto-saved · 3s ago" or the property address being analyzed.
   * Keeps the sticky bar from feeling like dead chrome.
   */
  contextLabel?: string;
};

export function StickyCalculateBar({ isCalculating, contextLabel }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show once the user has scrolled past the first ~600px of the
    // form - enough that the in-form button is below the fold. Plain
    // scroll listener (no rAF needed) because the math is one branch
    // per scroll tick.
    const onScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // While calculating we always render - gives the user a visible
  // spinner anchor even if they've scrolled back to the top.
  if (!visible && !isCalculating) return null;

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
