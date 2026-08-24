"use client";

/**
 * Reusable "Why this score" breakdown - renders the six Screening Index factors
 * (the engine's DealScoreBreakdown) as labeled bars with points/max, plus
 * the risk adjustment and the resulting score. Pure presentation; drop it
 * anywhere a Screening Index is shown (popover on Top Deals / Compare, inline in
 * the analyzer). Uses the engine's COMPONENT_MAXES so the maxes never drift.
 * Pass the deal's propertyType: owner-occupant (house-hack) deals score cash
 * flow on a 30-pt max (OWNER_OCCUPANT_CASH_FLOW_MAX) vs the investor 22.
 *
 * On the Balanced lens (every list/dashboard/compare surface) the factor
 * points + risk adjustment sum to the displayed score - UNLESS the engine's
 * appreciation-play floor held the score up, in which case an explicit floor
 * line reconciles the arithmetic (components sum lower; floor holds at 40).
 */

import {
  COMPONENT_MAXES,
  getCashFlowComponentMax,
  getScoreBreakdownSum,
  isAppreciationFloorApplied,
  type DealScoreBreakdown,
  type DealScoreInput,
} from "@/lib/deal-score";

/**
 * ⚠️ THIS COMPONENT SETS ITS OWN WIDTH: w-[min(20rem,78vw)].
 *
 * It is FIXED, not fluid, so it will NOT shrink to fit a container. Render it
 * inside a popover clamped narrower than 20rem and it paints outside the card,
 * over whatever is behind it — `max-w-*` bounds the box, it does not shrink a
 * fixed-width child.
 *
 * That shipped once: two call sites in saved-analyses-page-v2.tsx wrapped it in
 * max-w-[300px] / max-w-[280px], and the score values rendered ~44px past the
 * popover edge. The other call sites (compare-deals-client, TopDeals) get it
 * right with a plain `w-auto p-3`.
 *
 * So: give it `w-auto` and let it size itself. The min(20rem, 78vw) already IS
 * the responsive behaviour — 78vw keeps it inside a phone viewport — which is
 * exactly what a clamp on the container would be trying to add.
 */
export function ScoreBreakdown({
  breakdown,
  score,
  propertyType,
}: {
  breakdown: DealScoreBreakdown;
  score: number;
  /** Owner-occupant deals score cash flow on a 30-pt max (vs investor 22) -
   *  pass the deal's property type so the denominator matches the engine.
   *  Omitted/null falls back to the investor scale. */
  propertyType?: DealScoreInput["propertyType"] | null;
}) {
  const rows: { key: keyof DealScoreBreakdown; label: string; max: number }[] = [
    { key: "cashFlowScore", label: "Cash flow", max: getCashFlowComponentMax(propertyType) },
    { key: "cocScore", label: "Cash-on-cash", max: COMPONENT_MAXES.coc },
    { key: "capRateScore", label: "Cap rate", max: COMPONENT_MAXES.capRate },
    { key: "dscrScore", label: "DSCR", max: COMPONENT_MAXES.dscr },
    { key: "totalReturnScore", label: "10-yr total return", max: COMPONENT_MAXES.totalReturn },
  ];
  const floorApplied = isAppreciationFloorApplied(breakdown, score);
  return (
    <div className="w-[min(20rem,78vw)] text-sm">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Screening Index factors
      </p>
      <ul className="space-y-2">
        {rows.map((r) => {
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
        {floorApplied ? (
          <li className="flex items-center justify-between gap-3 pt-0.5">
            <span className="text-foreground">Appreciation-play floor</span>
            <span className="tabular-nums font-semibold text-foreground">
              held at {Math.round(score)}
            </span>
          </li>
        ) : null}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2 font-bold">
        <span>Screening Index</span>
        <span className="tabular-nums">{Math.round(score)} / 100</span>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        {floorApplied ? (
          <>
            The factors above sum to {Math.round(getScoreBreakdownSum(breakdown))}, but this deal
            is an appreciation play - strong projected 10-yr total return with non-negative
            after-tax cash flow - so the score is held at {Math.round(score)} instead of reading
            as weak fundamentals.
          </>
        ) : (
          <>
            Balanced scoring - each factor caps at the points shown; risk adjustments can subtract
            up to 30.
          </>
        )}
      </p>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Secondary model summary only—not evidence readiness, Buy Box fit, advice, or a recorded decision.
      </p>
    </div>
  );
}
