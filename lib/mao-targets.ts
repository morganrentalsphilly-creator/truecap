/**
 * The ONE canonical Max-Allowable-Offer target basis (CONFLICT #6).
 *
 * Two surfaces show "your max offer" (the deal-workspace line and the
 * wholesale StrategyOutcomeCard, plus the editable Stress Test solver they
 * both jump to). Before this module each picked its own default targets
 * ({capRate: 8, cocReturn: 8, monthlyCashFlow: 0} vs {monthlyCashFlow: 0,
 * dscr: 1.25}), so the same deal could carry two different "your max"
 * numbers — a truth-layer self-own. Every MAO call site now derives its
 * target from here and LABELS the basis inline via describeMaoTarget.
 *
 * Basis rules:
 *   1. Default: break-even cash flow + DSCR 1.25 (the lender-shaped floor).
 *   2. When the user's buy box carries numeric return thresholds, those ARE
 *      the basis (their criteria beat our defaults) — pass the box in.
 *   3. Cash purchases omit the DSCR target: calc-analysis returns dscr 0
 *      when monthlyPayment <= 0 (no debt service), so a DSCR floor would
 *      unfailably fail. If omission empties the target, fall back to
 *      break-even cash flow so the solver always has a real bar.
 *
 * Pure module (no IO, client-safe). lib/max-allowable-offer.ts is CONSUMED,
 * never modified — this only standardizes what call sites ask it for.
 */

import type { MaoTarget } from "@/lib/max-allowable-offer";
import type { BuyBoxCriteria } from "@/lib/buy-box";

/** Canonical default basis: break-even cash flow + DSCR 1.25. */
export const DEFAULT_MAO_TARGET: MaoTarget = { monthlyCashFlow: 0, dscr: 1.25 };

type BuyBoxReturnThresholds = Pick<
  BuyBoxCriteria,
  "minCapRatePct" | "minCocPct" | "minDscr" | "minCashFlowMonthly"
>;

/** Does this buy box set at least one numeric RETURN threshold the MAO
 *  solver can target? (Price/type/market rules don't translate to a
 *  return target.) */
export function buyBoxHasReturnTargets(box: BuyBoxReturnThresholds): boolean {
  return (
    box.minCapRatePct != null ||
    box.minCocPct != null ||
    box.minDscr != null ||
    box.minCashFlowMonthly != null
  );
}

/**
 * Does the box actually CONTRIBUTE to the resolved target for this deal?
 * A DSCR-only box on a cash purchase gets its sole threshold dropped and
 * buildMaoTarget falls back to the default floor — labeling that basis
 * "your buy box" would attribute a default to the user's criteria.
 */
export function buyBoxContributesToMaoTarget(
  box: BuyBoxReturnThresholds | null | undefined,
  opts: { isCashPurchase: boolean }
): boolean {
  if (!box || !buyBoxHasReturnTargets(box)) return false;
  if (!opts.isCashPurchase) return true;
  return (
    box.minCapRatePct != null || box.minCocPct != null || box.minCashFlowMonthly != null
  );
}

/**
 * Resolve the MAO target for a deal: the user's buy-box thresholds when
 * set, else the canonical default — with the DSCR target omitted for cash
 * purchases (see module doc, rule 3).
 */
export function buildMaoTarget(
  box: BuyBoxReturnThresholds | null | undefined,
  opts: { isCashPurchase: boolean }
): MaoTarget {
  const target: MaoTarget =
    box && buyBoxHasReturnTargets(box)
      ? {
          ...(box.minCapRatePct != null ? { capRate: box.minCapRatePct } : {}),
          ...(box.minCocPct != null ? { cocReturn: box.minCocPct } : {}),
          ...(box.minCashFlowMonthly != null
            ? { monthlyCashFlow: box.minCashFlowMonthly }
            : {}),
          ...(box.minDscr != null ? { dscr: box.minDscr } : {}),
        }
      : { ...DEFAULT_MAO_TARGET };

  if (opts.isCashPurchase) {
    delete target.dscr;
    // A DSCR-only buy box on a cash deal would leave nothing to solve for —
    // fall back to the universal floor so the solver still has a bar.
    if (
      target.capRate === undefined &&
      target.cocReturn === undefined &&
      target.monthlyCashFlow === undefined
    ) {
      target.monthlyCashFlow = DEFAULT_MAO_TARGET.monthlyCashFlow;
    }
  }

  return target;
}

function money(n: number): string {
  const abs = `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
  return n < 0 ? `-${abs}` : abs;
}

function num(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * Human label for the basis, rendered NEXT TO every MAO number so no
 * surface shows an unexplained "your max" (e.g. "break-even cash flow ·
 * DSCR ≥ 1.25"). Keep the wording in one place — that's the point.
 */
export function describeMaoTarget(target: MaoTarget): string {
  const parts: string[] = [];
  if (target.monthlyCashFlow !== undefined) {
    parts.push(
      target.monthlyCashFlow === 0
        ? "break-even cash flow"
        : `cash flow ≥ ${money(target.monthlyCashFlow)}/mo`
    );
  }
  if (target.dscr !== undefined) parts.push(`DSCR ≥ ${num(target.dscr)}`);
  if (target.capRate !== undefined) parts.push(`cap rate ≥ ${num(target.capRate)}%`);
  if (target.cocReturn !== undefined) parts.push(`cash-on-cash ≥ ${num(target.cocReturn)}%`);
  return parts.join(" · ");
}
