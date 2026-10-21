"use client";

/**
 * ResultReveal: the analyzer's result arrives in a choreographed sequence
 * that plays once per run, about a second in all (OVERHAUL.md §7, DESIGN.md
 * "Motion"): the verdict headline, then the Offer Ceiling rolls in, then the
 * price track, then the metric tiles, then the target chips, then the next
 * step. Each child marks its place with `data-reveal-step="n"`; globals.css
 * eases step n in at n × 150ms once the root carries `data-result-reveal`.
 *
 * The root gets that attribute only on the client, after mount, and again
 * whenever `runKey` changes (a new run); the server and reduced motion show
 * every step at rest, and a rerun with the same inputs does not replay.
 */

import { useEffect, useState, type ReactNode } from "react";
import { isSamplePrerenderShown } from "@/lib/sample-prerender";

export function ResultReveal({
  runKey,
  children,
  className,
}: {
  /** Changes when a new run produced the result (the inputs' fingerprint). */
  runKey: string;
  children: ReactNode;
  className?: string;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => {
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    // The sample's server-rendered decision is already on screen with these
    // figures (audit A2): the live card takes its place without an entrance.
    if (isSamplePrerenderShown()) return;
    setPlaying(runKey);
    // After the sequence, drop the attribute so later layout changes (a tab,
    // a disclosure) never replay the entrance.
    const id = window.setTimeout(() => setPlaying(null), 1400);
    return () => window.clearTimeout(id);
  }, [runKey]);
  return (
    <div className={className} data-result-reveal={playing ? "play" : undefined} key={runKey}>
      {children}
    </div>
  );
}
