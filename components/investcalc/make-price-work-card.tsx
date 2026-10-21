"use client";

/**
 * "Make your current price work": the inverse of the Offer Ceiling.
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
 *
 * Blueprint (2026-10): a ruled row, not a dashed box. The heading sits on a
 * 1px line; the two required figures are rows on soft lines in the figure
 * face.
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
    <div className="border-t border-foreground pt-3">
      <p className="text-sm font-semibold text-foreground">
        Or make your current price work
      </p>
      {result.currentMeets ? (
        <p className="mt-1.5 text-sm text-positive">
          Your current price (
          <span className="font-figure">{money(currentPrice)}</span>) already
          clears these targets.
        </p>
      ) : (
        <div className="mt-1.5">
          <p className="text-sm text-muted-foreground">
            At <span className="font-figure">{money(currentPrice)}</span>,
            you&apos;d need:
          </p>
          <dl className="mt-2 divide-y divide-rule-soft border-t border-rule-soft text-sm">
            <div className="flex items-baseline justify-between gap-4 py-1.5">
              <dt className="text-muted-foreground">Rent</dt>
              <dd className="text-right">
                {reqRent && !reqRent.unreachable ? (
                  <span className="font-figure font-semibold text-foreground">
                    ≥ {money(reqRent.value)}/mo
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Not reachable by rent alone
                  </span>
                )}
              </dd>
            </div>
            {reqRate === null ? null : (
              <div className="flex items-baseline justify-between gap-4 py-1.5">
                <dt className="text-muted-foreground">or rate</dt>
                <dd className="text-right">
                  {!reqRate.unreachable ? (
                    <span className="font-figure font-semibold text-foreground">
                      ≤ {reqRate.value}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Not reachable by rate alone
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
