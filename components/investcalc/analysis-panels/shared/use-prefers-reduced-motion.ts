"use client";

import { useSyncExternalStore } from "react";

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
