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
 * never modified — this only standardizes what call sites ask it for (and,
 * for the buy-box "your number" line, wraps ONE solve behind that standard
 * basis so the verdict card and the workspace can't diverge).
 */

import { calculateMaxAllowableOffer, type MaoTarget } from "@/lib/max-allowable-offer";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { BuyBoxCriteria } from "@/lib/buy-box";

/** Canonical default basis: break-even cash flow + DSCR 1.25. */
export const DEFAULT_MAO_TARGET: MaoTarget = { monthlyCashFlow: 0, dscr: 1.25 };

export type BuyBoxReturnThresholds = Pick<
  BuyBoxCriteria,
  | "minCapRatePct"
  | "minCocPct"
  | "minDscr"
  | "minCashFlowMonthly"
  | "minIrrPct"
  | "maxCashRequired"
  | "maxPurchasePrice"
>;

/** Does this buy box set at least one numeric RETURN threshold the MAO
 *  solver can target? (Price/type/market rules don't translate to a
 *  return target.) */
export function buyBoxHasReturnTargets(box: BuyBoxReturnThresholds): boolean {
  return (
    box.minCapRatePct != null ||
    (box.minCocPct != null && box.minCocPct >= 0) ||
    box.minDscr != null ||
    box.minCashFlowMonthly != null ||
    box.minIrrPct != null
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
  if (
    !box ||
    (!buyBoxHasReturnTargets(box) &&
      box.maxCashRequired == null &&
      box.maxPurchasePrice == null)
  ) {
    return false;
  }
  if (!opts.isCashPurchase) return true;
  return (
    box.minCapRatePct != null ||
    (box.minCocPct != null && box.minCocPct >= 0) ||
    box.minCashFlowMonthly != null ||
    box.minIrrPct != null ||
    box.maxCashRequired != null ||
    box.maxPurchasePrice != null
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
  const boxShapesCeiling =
    box &&
    (buyBoxHasReturnTargets(box) ||
      box.maxCashRequired != null ||
      box.maxPurchasePrice != null);
  const target: MaoTarget =
    boxShapesCeiling
      ? {
          ...(box.minCapRatePct != null ? { capRate: box.minCapRatePct } : {}),
          ...(box.minCocPct != null && box.minCocPct >= 0
            ? { cocReturn: box.minCocPct }
            : {}),
          ...(box.minCashFlowMonthly != null
            ? { monthlyCashFlow: box.minCashFlowMonthly }
            : {}),
          ...(box.minDscr != null ? { dscr: box.minDscr } : {}),
          ...(box.minIrrPct != null ? { minIrrPct: box.minIrrPct } : {}),
          ...(box.maxCashRequired != null
            ? { maxCashRequired: box.maxCashRequired }
            : {}),
          ...(box.maxPurchasePrice != null
            ? { maxPurchasePrice: box.maxPurchasePrice }
            : {}),
        }
      : { ...DEFAULT_MAO_TARGET };

  if (opts.isCashPurchase) {
    delete target.dscr;
    // A DSCR-only buy box on a cash deal would leave nothing to solve for —
    // fall back to the universal floor so the solver still has a bar.
    if (
      target.capRate === undefined &&
      target.cocReturn === undefined &&
      target.monthlyCashFlow === undefined &&
      target.minIrrPct === undefined &&
      target.maxCashRequired === undefined &&
      target.maxPurchasePrice === undefined
    ) {
      target.monthlyCashFlow = DEFAULT_MAO_TARGET.monthlyCashFlow;
    }
  }

  return target;
}

/**
 * The buy-box-shaped MAO target, or null when the box doesn't actually
 * shape one (no return thresholds, or a DSCR-only box on a cash deal).
 * Use this when the caller wants to solve against THE USER'S BOX
 * specifically — buildMaoTarget's default-basis fallback would silently
 * attribute the canonical defaults to "your buy box".
 */
export function chooseMaoTargetFromBuyBox(
  box: BuyBoxReturnThresholds | null | undefined,
  opts: { isCashPurchase: boolean }
): MaoTarget | null {
  if (!buyBoxContributesToMaoTarget(box, opts)) return null;
  return buildMaoTarget(box, opts);
}

type BuyBoxPriceCriteria = BuyBoxReturnThresholds;

/**
 * "Your number" — the highest purchase price that clears the box's
 * PRICE-SOLVABLE criteria: the return thresholds (via the MAO solver)
 * capped by the box's own max purchase price. Price can't fix a
 * property-type or market miss — callers decide separately whether price
 * is even the blocker. Returns null when the box sets no price-solvable
 * bar or no price in the solver's range clears it. Never throws:
 * degenerate inputs ($0 rent, unreachable targets) resolve to null.
 */
export function solveBuyBoxClearingPrice(
  values: InvestmentFormValues,
  box: BuyBoxPriceCriteria | null | undefined,
  opts: { isCashPurchase: boolean }
): number | null {
  if (!box) return null;
  const target = chooseMaoTargetFromBuyBox(box, opts);
  if (!target) return null;
  let solved: number | null;
  try {
    solved = calculateMaxAllowableOffer(values, target)?.maxPrice ?? null;
  } catch {
    return null;
  }
  if (solved == null) return null;
  return solved;
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
  if (target.minIrrPct !== undefined) {
    parts.push(`10-year pre-tax IRR ≥ ${num(target.minIrrPct)}%`);
  }
  if (target.maxCashRequired !== undefined) {
    parts.push(`cash required ≤ ${money(target.maxCashRequired)}`);
  }
  if (target.maxPurchasePrice !== undefined) {
    parts.push(`purchase price ≤ ${money(target.maxPurchasePrice)}`);
  }
  return parts.join(" · ");
}
