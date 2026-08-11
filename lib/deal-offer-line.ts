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
  deriveStateFromAddress,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
} from "@/lib/buy-box";
import {
  buildMaoTarget,
  buyBoxContributesToMaoTarget,
  buyBoxHasReturnTargets,
  describeMaoTarget,
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
export type DealOfferLine =
  | { kind: "cut"; maxPrice: number; asking: number | null; discountPct: number | null }
  | { kind: "clears"; maxPrice: number | null };

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
  let maoBasisBox: NamedBuyBox | null = null;

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
      const lead = boxResults.find((r) => r.result.passes) ?? boxResults[0];
      personalLine = lead?.result.personalLine ?? null;
      maoBasisBox = boxResults.map((r) => r.box).find(buyBoxHasReturnTargets) ?? null;
    }
  }

  let offer: DealOfferLine | null = null;
  let basisLabel = "";
  if (opts.isShoppingStage) {
    const maoTarget = buildMaoTarget(maoBasisBox, { isCashPurchase });
    basisLabel = buyBoxContributesToMaoTarget(maoBasisBox, { isCashPurchase })
      ? `your “${maoBasisBox!.name}” buy box — ${describeMaoTarget(maoTarget)}`
      : describeMaoTarget(maoTarget);

    let clearsAtAsking = false;
    try {
      clearsAtAsking = meetsTarget(analysis, maoTarget);
    } catch {
      // fall through to the solver alone
    }
    const mao = calculateMaxAllowableOffer(formValues, maoTarget);
    if (clearsAtAsking) {
      offer = { kind: "clears", maxPrice: mao?.maxPrice ?? null };
    } else if (mao) {
      const asking =
        typeof formValues.purchasePrice === "number" && formValues.purchasePrice > 0
          ? formValues.purchasePrice
          : null;
      const discountPct =
        asking != null && asking > mao.maxPrice
          ? Math.round(((asking - mao.maxPrice) / asking) * 100)
          : null;
      offer = { kind: "cut", maxPrice: mao.maxPrice, asking, discountPct };
    }
  }

  return { offer, personalLine, fit, basisLabel };
}
