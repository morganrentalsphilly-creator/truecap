"use client";

/**
 * Reusable "Why this score" breakdown — renders the six Deal Score factors
 * (the engine's DealScoreBreakdown) as labeled bars with points/max, plus
 * the risk adjustment and the resulting score. Pure presentation; drop it
 * anywhere a Deal Score is shown (popover on Top Deals / Compare, inline in
 * the analyzer). Uses the engine's COMPONENT_MAXES so the maxes never drift.
 *
 * On the Balanced lens (every list/dashboard/compare surface) the factor
 * points + risk adjustment sum to the displayed score; the footnote names
 * that so the math is legible.
 */

import { COMPONENT_MAXES, type DealScoreBreakdown } from "@/lib/deal-score";

const ROWS: { key: keyof DealScoreBreakdown; label: string; max: number }[] = [
  { key: "cashFlowScore", label: "Cash flow", max: COMPONENT_MAXES.cashFlow },
  { key: "cocScore", label: "Cash-on-cash", max: COMPONENT_MAXES.coc },
  { key: "capRateScore", label: "Cap rate", max: COMPONENT_MAXES.capRate },
  { key: "dscrScore", label: "DSCR", max: COMPONENT_MAXES.dscr },
  { key: "totalReturnScore", label: "10-yr total return", max: COMPONENT_MAXES.totalReturn },
];

export function ScoreBreakdown({
  breakdown,
  score,
}: {
  breakdown: DealScoreBreakdown;
  score: number;
}) {
  return (
    <div className="w-[min(20rem,78vw)] text-sm">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Why this score
      </p>
      <ul className="space-y-2">
        {ROWS.map((r) => {
          const v = Number(breakdown[r.key]) || 0;
          const pct = r.max > 0 ? Math.max(0, Math.min(100, (v / r.max) * 100)) : 0;
          return (
            <li key={r.key}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-foreground">{r.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(v)} / {r.max}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
        {breakdown.riskPenalty !== 0 ? (
          <li className="flex items-center justify-between gap-3 pt-0.5">
            <span className="text-foreground">Risk adjustments</span>
            <span className="tabular-nums font-semibold text-destructive">
              {Math.round(breakdown.riskPenalty)}
            </span>
          </li>
        ) : null}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2 font-bold">
        <span>Deal Score</span>
        <span className="tabular-nums">{Math.round(score)} / 100</span>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Balanced scoring — each factor caps at the points shown; risk adjustments can subtract up to 30.
      </p>
    </div>
  );
}
