"use client";

/**
 * Tiny client island for the hero "scroll to the calculator" affordances.
 *
 * Why: the parent <MarketingHero /> is otherwise pure rendering — no
 * client state, no hooks. Pulling this single onClick out lets the
 * hero ship as a server component (zero JS for the static markup),
 * which improves LCP on every page load. This island is the smallest
 * possible client surface.
 */

import type { ReactNode } from "react";
import { scrollBehavior } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

type Props = {
  /** Element ID to scroll to (defaults to "main"). */
  targetId?: string;
  /** Sticky-nav offset compensation in pixels. */
  offsetPx?: number;
  /** Pass-through className for styling parity with the prior <button>. */
  className?: string;
  /** Accessible label. */
  "aria-label"?: string;
  /** Optional homepage CTA attribution label. */
  analyticsSource?: string;
  children: ReactNode;
};

export function ScrollToFormButton({
  targetId = "main",
  offsetPx = 64,
  className,
  "aria-label": ariaLabel,
  analyticsSource,
  children,
}: Props) {
  const handleClick = () => {
    if (analyticsSource) {
      trackEvent("homepage_primary_cta", { source: analyticsSource });
    }
    // Safe-guard — server-rendered first paint may briefly render this
    // before hydration; window is always defined by the time onClick can
    // actually fire, but the typeof check costs nothing and protects
    // future SSR scenarios.
    if (typeof window === "undefined") return;
    const el = document.getElementById(targetId);
    if (!el) return;
    window.scrollTo({ top: el.offsetTop - offsetPx, behavior: scrollBehavior() });
  };

  return (
    <button type="button" onClick={handleClick} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
