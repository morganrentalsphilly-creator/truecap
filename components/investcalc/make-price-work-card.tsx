"use client";

/**
 * "Or — make your current price work": the inverse of the Max Offer.
 *
 * Max Offer answers "what should I pay?". This answers the question every
 * buyer asks next — "but what if I still want THIS house at THIS price?" —
 * by solving the rent or the rate that would make the asking price clear the
 * same targets. It is the most negotiation-useful output on the page.
 *
 * EXTRACTED from max-offer-card.tsx (Aug-2026). It lived inside that card, so
 * when the Decision-tier merge suppressed the card the panel vanished from
 * the DOM entirely — a real regression, restored here as its own component so
 * it can live under "Why this number" independent of the card's fate.
 *
 * COMPUTE: calls solveRequiredMonthlyRent / solveRequiredInterestRate exactly
 * as the original did, on the same target. No math changed — the solvers are
 * untouched and this component owns no thresholds.
 */

import { useMemo } from "react";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  meetsTarget,
  solveRequiredMonthlyRent,
  solveRequiredInterestRate,
  type MaoTarget,
} from "@/lib/max-allowable-offer";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function MakePriceWorkCard({
  values,
  target,
}: {
  values: InvestmentFormValues | null;
  /** The SAME effective target the Decision tier solved Max Offer with. */
  target: MaoTarget;
}) {
  const currentPrice = values?.purchasePrice ?? null;

  const { currentMeets, reqRent, reqRate } = useMemo(() => {
    if (!values || !currentPrice) {
      return { currentMeets: false, reqRent: null, reqRate: null };
    }
    try {
      const current = calculateAnalysis(values);
      return {
        currentMeets: meetsTarget(current, target),
        reqRent: solveRequiredMonthlyRent(values, target),
        reqRate: solveRequiredInterestRate(values, target),
      };
    } catch {
      return { currentMeets: false, reqRent: null, reqRate: null };
    }
  }, [values, currentPrice, target]);

  const hasTarget =
    target.capRate !== undefined ||
    target.cocReturn !== undefined ||
    target.monthlyCashFlow !== undefined ||
    target.dscr !== undefined;

  if (!values || !currentPrice || !hasTarget) return null;

  return (
    <div className="rounded-xl border border-dashed border-border p-4 sm:p-5">
      <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Or — make your current price work
      </div>
      {currentMeets ? (
        <p className="mt-1.5 text-sm text-foreground">
          Your current price ({money(currentPrice)}) already clears these targets. ✓
        </p>
      ) : (
        <div className="mt-1.5 space-y-1 text-sm text-foreground">
          <p className="text-xs text-muted-foreground">At {money(currentPrice)}, you&apos;d need:</p>
          <p>
            Rent{" "}
            {reqRent && !reqRent.unreachable ? (
              <>
                ≥ <span className="font-bold text-primary">{money(reqRent.value)}/mo</span>
              </>
            ) : (
              <span className="text-muted-foreground">— not reachable by rent alone</span>
            )}
          </p>
          {reqRate === null ? null : (
            <p>
              or rate{" "}
              {!reqRate.unreachable ? (
                <>
                  ≤ <span className="font-bold text-primary">{reqRate.value}%</span>
                </>
              ) : (
                <span className="text-muted-foreground">— not reachable by rate alone</span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
