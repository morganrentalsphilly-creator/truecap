"use client";

/**
 * BreakpointSuggestionCard — surfaces "what would make this Strong/Solid?"
 * inline next to the verdict for deals that come back Mixed / Marginal /
 * Negative.
 *
 * Turns a rejected deal into negotiating ammunition:
 *
 *   "This becomes Solid at $285K purchase price (currently $300K) or
 *    $2,650/mo rent (currently $2,400)."
 *
 * Pure presentation; the math lives in lib/breakpoint-solver.ts.
 *
 * Hides itself when:
 *   - Current tier is already Strong (nothing to solve toward).
 *   - Solver couldn't find a breakpoint within ±30% (deal is too far
 *     off to fix with rent or price alone — surfacing a 50% rent
 *     increase would be misleading).
 */

import { useMemo } from "react";
import { Target } from "lucide-react";
import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { solveBreakpoints } from "@/lib/breakpoint-solver";

interface Props {
  values: InvestmentFormValues;
  result: AnalysisResult;
}

export function BreakpointSuggestionCard({ values, result }: Props) {
  const breakpoint = useMemo(
    () => solveBreakpoints(values, result),
    [values, result]
  );

  if (breakpoint == null) return null; // Already at top tier.

  const { targetTier, currentTier, priceBreakpoint, currentPrice, rentBreakpointMonthly, currentRentMonthly, priceDeltaPct, rentDeltaPct } = breakpoint;

  // If NEITHER path found a breakpoint within ±30%, hide. A deal that
  // needs >30% in either dimension is broken structurally, not
  // negotiable, and surfacing a 50% rent jump would just look silly.
  if (priceBreakpoint == null && rentBreakpointMonthly == null) return null;

  return (
    <div
      className="rounded-2xl border border-primary/25 bg-primary/5 p-3 sm:p-4"
      aria-label={`Path to ${targetTier} tier`}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Target className="size-3.5 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
          Path to {targetTier}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-foreground">
        <span className="text-muted-foreground">
          Currently {currentTier}.
        </span>{" "}
        This becomes{" "}
        <strong className="text-foreground">{targetTier}</strong> at{" "}
        {priceBreakpoint != null && currentPrice != null ? (
          <PriceBreakpoint
            price={priceBreakpoint}
            current={currentPrice}
            deltaPct={priceDeltaPct ?? 0}
          />
        ) : null}
        {priceBreakpoint != null && rentBreakpointMonthly != null ? (
          <span className="text-muted-foreground"> or </span>
        ) : null}
        {rentBreakpointMonthly != null && currentRentMonthly != null ? (
          <RentBreakpoint
            rent={rentBreakpointMonthly}
            current={currentRentMonthly}
            deltaPct={rentDeltaPct ?? 0}
          />
        ) : rentBreakpointMonthly != null && currentRentMonthly == null ? (
          // Multi-unit case: we can't show a per-unit number cleanly,
          // so just communicate the percentage lift.
          <span>
            <strong className="text-foreground">
              +{rentDeltaPct ?? 0}% rents across units
            </strong>
          </span>
        ) : null}
        .
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Use this in negotiation: ask for a price cut, verify market rents,
        or walk if neither moves.
      </p>
    </div>
  );
}

function PriceBreakpoint({
  price,
  current,
  deltaPct,
}: {
  price: number;
  current: number;
  deltaPct: number;
}) {
  const savings = current - price;
  return (
    <span>
      <strong className="text-foreground">${price.toLocaleString("en-US")}</strong>
      <span className="text-muted-foreground">
        {" "}purchase price (currently ${current.toLocaleString("en-US")}, save $
        {savings.toLocaleString("en-US")} / −{deltaPct}%)
      </span>
    </span>
  );
}

function RentBreakpoint({
  rent,
  current,
  deltaPct,
}: {
  rent: number;
  current: number;
  deltaPct: number;
}) {
  const gain = rent - current;
  return (
    <span>
      <strong className="text-foreground">${rent.toLocaleString("en-US")}/mo</strong>
      <span className="text-muted-foreground">
        {" "}rent (currently ${current.toLocaleString("en-US")}/mo, +$
        {gain.toLocaleString("en-US")} / +{deltaPct}%)
      </span>
    </span>
  );
}
