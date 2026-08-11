/**
 * The "what to offer" line for a saved deal — the retention centerpiece the
 * homepage repositioning points at ("asking $329,000 · your max offer
 * $297,400 · needs −$31,600 to pass your buy box").
 *
 * This mirrors the offer-solve logic that lives inline in the deal workspace
 * (app/dashboard/saved-analyses/[id]/page.tsx), so the SAME "your number is
 * $X" can render on the My Deals list without opening every deal — a saved
 * deal becomes a live object you glance at, not a static row.
 *
 * It is a SEPARATE function rather than a shared refactor of the workspace on
 * purpose: the workspace evaluates buy-box FIT against a possibly
 * rate-alert-adjusted recompute (`fresh`) while solving the offer against the
 * saved snapshot, whereas the list has no rate-preview context and correctly
 * evaluates BOTH against the snapshot. Collapsing them would silently change
 * the workspace's previewed-rate behavior. The shared floor that keeps them
 * honest is that both go through the same lib/mao-targets + calculateAnalysis
 * primitives — the numbers can't drift, only the metrics source differs.
 *
 * Pure and IO-free: recomputes from the form snapshot via calculateAnalysis
 * (the single source of truth) and the user's active buy boxes. A solver
 * failure or a legacy/unparseable snapshot simply yields `offer: null`, and
 * the caller hides the line — never a crash, never a wrong number.
 */
import { calculateAnalysis } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  type BuyBoxDealMetrics,
  type BuyBoxFitSummary,
  type BuyBoxPropertyType,
  type NamedBuyBox,
  type NamedBuyBoxResult,
  deriveStateFromAddress,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
} from "@/lib/buy-box";
import {
  buildMaoTarget,
  chooseMaoTargetFromBuyBox,
  describeMaoTarget,
  solveBuyBoxClearingPrice,
} from "@/lib/mao-targets";
import { calculateMaxAllowableOffer, meetsTarget } from "@/lib/max-allowable-offer";

/**
 * The offer line for a shopping-stage deal:
 *   - "cut"    — the deal misses at asking; `maxPrice` is the highest price
 *                that clears the target, `discountPct` how far below asking.
 *   - "clears" — the deal already clears at asking; `maxPrice` is the ceiling
 *                (headroom), null if the solver couldn't bound it.
 * `null` when there is no offer to make (owned/closed/passed deal, no usable
 * buy box + no numeric target, or an unparseable snapshot).
 */
/**
 * What the number is measured against. The distinction is load-bearing: the
 * UI may only say "your buy box" when it really IS the user's box.
 *   - "buy-box" — solved against the user's own criteria.
 *   - "default" — solved against TrueCap's canonical bar (break-even cash flow
 *     + DSCR 1.25) because the user's boxes set no price-solvable target.
 */
export type DealOfferBasis = "buy-box" | "default";

export type DealOfferLine =
  | { kind: "cut"; maxPrice: number; asking: number | null; discountPct: number | null; basis: DealOfferBasis }
  | { kind: "clears"; maxPrice: number | null; basis: DealOfferBasis }
  /**
   * The deal misses on criteria NO price can fix (wrong market, wrong property
   * type). Quoting a dollar figure here would be a lie — a $1 house in the
   * wrong state still fails. `reasons` are the failing check labels.
   */
  | { kind: "blocked"; reasons: string[] };

export type DealOfferResult = {
  offer: DealOfferLine | null;
  /** The one number-carrying line from the deciding box, e.g.
   *  "Biggest gap — Cap rate: 5.2% vs ≥ 6.0% (0.8pp short)". */
  personalLine: string | null;
  /** Aggregate pass/fail across the user's active boxes. */
  fit: BuyBoxFitSummary | null;
  /** Human label for the target basis, e.g. `your "Cash-flow" buy box — …`. */
  basisLabel: string;
};

function toBuyBoxPropertyType(pt: unknown): BuyBoxPropertyType | null {
  return pt === "single-family" || pt === "multi-family" || pt === "owner-occupant" ? pt : null;
}

/**
 * Compute the offer line + buy-box fit for a deal from its form snapshot.
 *
 * @param formValues  the persisted form snapshot (already schema-validated by
 *                    the caller — pass a value that parsed).
 * @param activeBuyBoxes  the user's active boxes that actually carry criteria
 *                    (caller filters with buyBoxHasCriteria + isActive).
 * @param opts.isShoppingStage  false for owned/closed/passed deals, which have
 *                    no offer to make — the offer line is suppressed but the
 *                    fit/personalLine still compute.
 */
export function computeDealOfferLine(
  formValues: InvestmentFormValues,
  activeBuyBoxes: NamedBuyBox[],
  opts: { isShoppingStage: boolean } = { isShoppingStage: true },
): DealOfferResult {
  let analysis;
  try {
    analysis = calculateAnalysis(formValues);
  } catch {
    // Unparseable/legacy snapshot — nothing to show, never throw to the caller.
    return { offer: null, personalLine: null, fit: null, basisLabel: "" };
  }

  const isCashPurchase = analysis.monthlyPayment <= 0;

  let fit: BuyBoxFitSummary | null = null;
  let personalLine: string | null = null;
  /**
   * The box the offer line speaks for: the one the deal PASSES when it passes
   * any (that is the box the "clears" claim refers to), otherwise the
   * highest-priority active box it misses. Solving against a different box
   * than the verdict describes is what produced the contradiction this
   * function now guards against.
   */
  let decidingBox: NamedBuyBoxResult | null = null;

  if (activeBuyBoxes.length > 0) {
    const metrics: BuyBoxDealMetrics = {
      capRatePct: analysis.capRate,
      cocPct: analysis.cocReturn,
      dscr: analysis.dscr,
      cashFlowMonthly: analysis.netCashFlow,
      purchasePrice: typeof formValues.purchasePrice === "number" ? formValues.purchasePrice : null,
      propertyType: toBuyBoxPropertyType(formValues.propertyType),
      state: deriveStateFromAddress(formValues.address),
      isCashPurchase,
    };
    const boxResults = evaluateBuyBoxes(activeBuyBoxes, metrics).filter((r) => r.result.active);
    if (boxResults.length > 0) {
      fit = summarizeBuyBoxFit(boxResults);
      // evaluateBuyBoxes returns priority order, so the first passing box (or
      // the first box overall) is the one the user would reason about.
      decidingBox = boxResults.find((r) => r.result.passes) ?? boxResults[0] ?? null;
      personalLine = decidingBox?.result.personalLine ?? null;
    }
  }

  let offer: DealOfferLine | null = null;
  let basisLabel = "";
  if (opts.isShoppingStage) {
    const asking =
      typeof formValues.purchasePrice === "number" && formValues.purchasePrice > 0
        ? formValues.purchasePrice
        : null;

    // THE VERDICT COMES FROM THE REAL FIT, not from the MAO target. A MaoTarget
    // can only carry return thresholds (cap rate / CoC / cash flow / DSCR), so
    // deciding "clears" from meetsTarget() would ignore the box's own budget
    // cap, property types and markets — and cheerfully report "clears your buy
    // box" on a deal the very same card marks as missing it.
    if (fit && decidingBox) {
      const target = chooseMaoTargetFromBuyBox(decidingBox.box, { isCashPurchase });
      basisLabel = target
        ? `your “${decidingBox.box.name}” buy box — ${describeMaoTarget(target)}`
        : `your “${decidingBox.box.name}” buy box`;

      if (fit.anyPass) {
        // Genuinely passes a box. The ceiling is that box's clearing price
        // (budget-capped), so headroom can never exceed what the user allows.
        const ceiling = solveBuyBoxClearingPrice(formValues, decidingBox.box, { isCashPurchase });
        offer = { kind: "clears", maxPrice: ceiling, basis: "buy-box" };
      } else {
        // Misses. Is price even the blocker? A wrong market or property type
        // is not fixable at ANY price, so we must not quote one.
        const failedUnsolvable = decidingBox.result.checks.filter(
          (c) => c.pass === false && (c.id === "propertyType" || c.id === "state")
        );
        if (failedUnsolvable.length > 0) {
          offer = { kind: "blocked", reasons: failedUnsolvable.map((c) => c.label) };
        } else {
          const clearing = solveBuyBoxClearingPrice(formValues, decidingBox.box, { isCashPurchase });
          if (clearing != null) {
            const discountPct =
              asking != null && asking > clearing
                ? Math.round(((asking - clearing) / asking) * 100)
                : null;
            offer = { kind: "cut", maxPrice: clearing, asking, discountPct, basis: "buy-box" };
          }
        }
      }
    } else {
      // No usable box shaped a target — fall back to TrueCap's canonical bar,
      // and mark the basis so the UI never calls this "your buy box".
      const maoTarget = buildMaoTarget(null, { isCashPurchase });
      basisLabel = describeMaoTarget(maoTarget);
      let clearsAtAsking = false;
      try {
        clearsAtAsking = meetsTarget(analysis, maoTarget);
      } catch {
        // fall through to the solver alone
      }
      const mao = calculateMaxAllowableOffer(formValues, maoTarget);
      if (clearsAtAsking) {
        offer = { kind: "clears", maxPrice: mao?.maxPrice ?? null, basis: "default" };
      } else if (mao) {
        const discountPct =
          asking != null && asking > mao.maxPrice
            ? Math.round(((asking - mao.maxPrice) / asking) * 100)
            : null;
        offer = { kind: "cut", maxPrice: mao.maxPrice, asking, discountPct, basis: "default" };
      }
    }
  }

  return { offer, personalLine, fit, basisLabel };
}
