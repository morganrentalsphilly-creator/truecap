"use client";

/**
 * Tiny client island for the hero "scroll to the calculator" affordances.
 *
 * Why: the parent <MarketingHero /> is otherwise pure rendering — no
 * client state, no hooks. Pulling this single onClick out lets the
 * hero ship as a server component (zero JS for the static markup),
 * which improves LCP on every page load. This island is the smallest
 * possible client surface.
 *
 * Fallback contract: the decision "is there a form to scroll to?" is made
 * on the ADDRESS/CALCULATOR FORM, never on `#main`. Every page wraps its
 * body in <main id="main">, so an id lookup always succeeds and the click
 * silently scrolled 38 /vs pages to their own top instead of opening the
 * analyzer. Prefer <AnalyzeCtaLink> (a real link) on pages without a form.
 */

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { scrollBehavior } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

type Props = {
  /** Element ID to scroll to when a form is present (defaults to "main"). */
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
  const router = useRouter();
  const handleClick = () => {
    if (analyticsSource) {
      trackEvent("homepage_primary_cta", { source: analyticsSource });
    }
    // Safe-guard — server-rendered first paint may briefly render this
    // before hydration; window is always defined by the time onClick can
    // actually fire, but the typeof check costs nothing and protects
    // future SSR scenarios.
    if (typeof window === "undefined") return;
    // The analyzer lives at /analyze now; a marketing page without an
    // address or calculator form sends the visitor there instead of
    // scrolling to nothing (or, worse, to the top of the same page).
    const form = document.querySelector<HTMLElement>(
      'form[data-hero-address-form], form[data-calc-form="true"]',
    );
    if (!form) {
      router.push("/analyze");
      return;
    }
    const el = document.getElementById(targetId) ?? form;
    window.scrollTo({ top: el.offsetTop - offsetPx, behavior: scrollBehavior() });
    // Move focus with the scroll so keyboard and screen-reader users land
    // in the form the button named, not on the now off-screen button.
    form
      .querySelector<HTMLElement>('input:not([type="hidden"]), [tabindex="-1"]')
      ?.focus({ preventScroll: true });
  };

  return (
    <button type="button" onClick={handleClick} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
