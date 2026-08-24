"use client";

/**
 * "Or — make your current price work": the inverse of the Offer Ceiling.
 *
 * Offer Ceiling answers "what should I pay?". This answers the question every
 * buyer asks next — "but what if I still want THIS house at THIS price?" —
 * by solving the rent or the rate that would make the asking price clear the
 * same targets. It is the most negotiation-useful output on the page.
 *
 * EXTRACTED from max-offer-card.tsx (Aug-2026). It lived inside that card, so
 * when the Decision-tier merge suppressed the card the panel vanished from
 * the DOM entirely — a real regression, restored here as its own component so
 * it can live under "Why this number" independent of the card's fate.
 *
 * COMPUTE: the exact inverse results arrive from the same entitlement-aware
 * server boundary as Offer Ceiling. This component is presentation-only, so
 * Free browsers never receive or calculate the paid thresholds.
 */

import type { OfferCeilingExactResult } from "@/lib/offer-ceiling-access-contract";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function MakePriceWorkCard({
  currentPrice,
  result,
}: {
  currentPrice: number;
  result: OfferCeilingExactResult["makePriceWork"];
}) {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;
  const reqRent = result.requiredMonthlyRent;
  const reqRate = result.requiredInterestRate;

  return (
    <div className="rounded-xl border border-dashed border-border p-4 sm:p-5">
      <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Or — make your current price work
      </div>
      {result.currentMeets ? (
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
