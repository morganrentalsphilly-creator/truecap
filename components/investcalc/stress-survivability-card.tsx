"use client";

/**
 * StressSurvivabilityCard - the plain-English answer under the stress
 * tools: "does the deal still cash-flow under this stress?"
 *
 * Renders whenever ANY what-if adjustment is active (the one-tap worst
 * case or a hand-dragged slider) and disappears at base case. Pure
 * presentation; the math lives in lib/stress-survivability.ts and is
 * derived entirely from two calculateAnalysis results — base + stressed
 * — so it can never disagree with the metric tiles above it.
 *
 * Free for everyone: this is a calculator trust feature ("I don't need
 * Excel to stress it"), not a Pro gate.
 */

import { useEffect, useMemo, useState } from "react";
import type { AnalysisResult } from "@/lib/calc-analysis";
import { buildStressSurvivability } from "@/lib/stress-survivability";

interface Props {
  base: AnalysisResult;
  stressed: AnalysisResult;
  /** "rent −10% · vacancy +5pp · rate +1pp" style scenario echo. */
  adjustmentLabel?: string;
}

export function StressSurvivabilityCard({ base, stressed, adjustmentLabel }: Props) {
  const s = useMemo(() => buildStressSurvivability(base, stressed), [base, stressed]);

  // Debounced SR announcement (mirrors WhatIfSliders' 350ms live region):
  // announcing the full card on every deferred slider tick floods the
  // screen-reader queue during a drag. The visible card updates live; the
  // sr-only status region settles 350ms after the last change.
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setAnnounced(`Survivability: ${s.headline}`), 350);
    return () => clearTimeout(t);
  }, [s.headline]);

  const good = s.survives;

  return (
    // A ruled row under the sliders, not a tinted card with an icon tile:
    // the headline carries the Sign rule's green or red, nothing else does.
    <div className="border-t border-border pt-3">
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announced}
      </span>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-xs font-medium text-muted-foreground">
            Survivability
          </span>
          {adjustmentLabel ? (
            <span className="font-figure text-2xs text-muted-foreground">
              under {adjustmentLabel}
            </span>
          ) : null}
        </div>
        <p
          className={`text-sm font-semibold ${
            good ? "text-positive" : "text-destructive-text"
          }`}
        >
          {s.headline}
        </p>
        {s.breakEven.sentence ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {s.breakEven.sentence}
          </p>
        ) : null}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {s.dscr.band === "cash" ? "DSCR: " : ""}
          {s.dscr.label}
        </p>
      </div>
    </div>
  );
}
