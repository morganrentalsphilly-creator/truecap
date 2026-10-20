"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

/**
 * True while the visitor asks for reduced motion.
 *
 * The global rule in app/globals.css stops CSS animations and transitions,
 * but Recharts draws its bars, lines and areas in from JavaScript, so the
 * analysis charts kept animating for about 1.5 seconds under
 * prefers-reduced-motion. The chart files pass
 * `isAnimationActive={!reducedMotion}` to every mark.
 *
 * The server snapshot is false; the charts mount only after a row is opened
 * in the browser, so their first render already has the real value.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Whether a Recharts mark should animate right now: its first draw only
 * (OVERHAUL.md §4: "animate the first draw only"), never under reduced
 * motion. Recharts re-runs a mark's entrance on every data change while
 * `isAnimationActive` is true, so after the entrance has had time to finish
 * (Recharts' default 1,500ms) this turns false and later updates (a scenario
 * toggle, a tab) simply redraw.
 */
export function useChartDrawAnimation(): boolean {
  const reducedMotion = usePrefersReducedMotion();
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setDrawn(true), 1600);
    return () => window.clearTimeout(id);
  }, []);
  return !reducedMotion && !drawn;
}
