"use client";

/**
 * Scroll-depth tracker.
 *
 * Fires GA dataLayer events at 25 / 50 / 75 / 100 % page-scroll
 * thresholds. Mount once per page (typically on the homepage and any
 * long-form landing page).
 *
 * WHY THIS EXISTS:
 *   Newer Google Ads accounts have a chicken-and-egg problem: bidding
 *   strategies like Maximize Conversions and Target CPA need conversion
 *   data to optimize against, but until conversions arrive, the algo
 *   spends inefficiently. Scroll-depth events give Google a richer
 *   "engagement" signal to learn from in the meantime — visitors who
 *   scroll past 50% are far more likely to convert later than those
 *   who bounce. Importing the scroll-depth audience into Google Ads
 *   as a custom audience also enables proper remarketing.
 *
 * SAFETY:
 *   - SSR-safe: no work outside the useEffect.
 *   - Pure passive listener (passive: true) — never blocks scroll.
 *   - Each threshold fires at most once per page load.
 *   - Throttled via requestAnimationFrame — won't thrash the main thread.
 *   - Catches all errors so analytics never break the UI.
 */

import { useEffect } from "react";

type Threshold = 25 | 50 | 75 | 100;
const THRESHOLDS: Threshold[] = [25, 50, 75, 100];

declare global {
  interface Window {
    /* dataLayer is already declared in track-conversion.ts */
  }
}

export function ScrollDepthTracker() {
  useEffect(() => {
    // Set of thresholds we've already fired so we don't double-count
    // when the user scrolls back and forth. Local to this mount.
    const fired = new Set<Threshold>();
    let rafPending = false;

    const handleScroll = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        try {
          const doc = document.documentElement;
          // scrollableDistance = total scrollable pixels below the fold.
          // If a page is shorter than the viewport this is 0 — short-
          // circuit so we don't divide by zero and immediately fire
          // 100% on every page load.
          const scrollableDistance = Math.max(0, doc.scrollHeight - doc.clientHeight);
          if (scrollableDistance <= 0) return;
          const scrolled = window.scrollY + doc.clientHeight;
          const pct = Math.min(100, (scrolled / doc.scrollHeight) * 100);

          for (const t of THRESHOLDS) {
            if (pct >= t && !fired.has(t)) {
              fired.add(t);
              try {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                  event: `scroll_depth_${t}`,
                  scrollDepthPct: t,
                  page: window.location.pathname,
                });
              } catch {
                /* never let analytics break the UI */
              }
            }
          }

          // Once we've fired all thresholds, detach the listener — no
          // point burning CPU on every scroll for the rest of the
          // session.
          if (fired.size === THRESHOLDS.length) {
            window.removeEventListener("scroll", handleScroll);
          }
        } catch {
          /* swallow */
        }
      });
    };

    // Fire an initial measurement in case the page loads with content
    // already scrolled (e.g. anchor link, browser back-button restore).
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return null;
}
