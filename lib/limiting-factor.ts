/**
 * One-line "limiting factor" for Mixed / Marginal live previews.
 *
 * A Mixed or Marginal tier means exactly one thing: the deal cleared the
 * Negative bar but failed at least one of the "Solid" gates in
 * `classifyDeal` (lib/verdict.ts). This helper names the FIRST failing
 * gate — in the same cash-flow → DSCR → CoC weighting order classifyDeal
 * uses — so the amber pill becomes "fix THIS number" instead of a
 * dead-end label. Negative previews keep their existing break-even hint.
 *
 * The thresholds below MIRROR classifyDeal in lib/verdict.ts (Solid gates:
 * cf ≥ $100, DSCR ≥ 1.15, CoC ≥ 6% financed / cap ≥ 5%, CoC ≥ 5% cash)
 * and the ≥1.25 lender threshold its dscrSentence already states in prose.
 * They are display copy only — never a new cutoff. If classifyDeal's
 * bands move, move these with them.
 */

import type { DealTier } from "@/lib/verdict";

export type LimitingFactorInputs = {
  netCashFlow: number;
  capRate: number;
  cocReturn: number;
  dscr: number;
  /** `monthlyPayment <= 0` = cash purchase (DSCR not applicable). */
  monthlyPayment: number;
};

/**
 * Returns the one-line limiting factor for a Mixed/Marginal preview, or
 * null for every other tier — and null for negative cash flow, where the
 * live panel's break-even "try $X as your offer" hint already owns the
 * explanation (two stacked hints would bury both).
 */
export function getLimitingFactor(
  tier: DealTier,
  metrics: LimitingFactorInputs
): string | null {
  if (tier !== "Mixed" && tier !== "Marginal") return null;

  const cf = metrics.netCashFlow;
  const cap = metrics.capRate;
  const coc = metrics.cocReturn;
  const dscr = metrics.dscr;
  const isCashPurchase = metrics.monthlyPayment <= 0;

  // Negative cash flow → the break-even hint is the next move; stay quiet.
  if (cf < 0) return null;

  // Marginal (financed) with positive cash flow can only mean DSCR < 1.0.
  if (!isCashPurchase && dscr < 1.0) {
    return `DSCR ${dscr.toFixed(2)} — rental income doesn't cover the mortgage payment.`;
  }

  // Mixed: name the first failing Solid gate, in classifyDeal's order.
  if (cf < 100) {
    return `Cash flow $${Math.round(cf).toLocaleString()}/mo — below the $100/mo Solid bar.`;
  }
  if (!isCashPurchase && dscr < 1.15) {
    return `DSCR ${dscr.toFixed(2)} — below the 1.25 lenders want.`;
  }
  if (isCashPurchase && cap < 5) {
    return `Cap rate ${cap.toFixed(1)}% — below the 5% Solid bar.`;
  }
  const cocBar = isCashPurchase ? 5 : 6;
  if (coc < cocBar) {
    return `Cash-on-cash ${coc.toFixed(1)}% — below the ${cocBar}% Solid bar.`;
  }

  // Shouldn't happen when the tier came from the same metrics, but the
  // contract is nullable — render nothing rather than a wrong reason.
  return null;
}
