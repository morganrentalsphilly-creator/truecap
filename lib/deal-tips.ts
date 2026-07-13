/**
 * Deal-specific tips for the answer hero's Optimization Tips / Next Steps
 * block — derived from THIS deal's weakest Deal Score subscores instead of
 * the canned per-recommendation list, so every "Buy" on earth stops reading
 * the same three sentences.
 *
 * How it works: each breakdown subscore is compared against its component
 * max (lib/deal-score.ts COMPONENT_MAXES; owner-occupant cash flow uses the
 * engine's 30-pt scale). Subscores still inside their healthy tier are never
 * tipped — a strong deal gets NO alarmist tips (the caller falls back to the
 * canned list). The two lowest-ratio weak subscores each get one factual,
 * actionable sentence.
 *
 * The tier boundaries and thresholds quoted below MIRROR the scoring tiers
 * in lib/deal-score.ts (and the ScoreBreakdownReceipts labels built from
 * them): cash flow $500/mo strong band, CoC 5–7% healthy / 3% weak, cap rate
 * 5% fair floor, DSCR 1.20 lender threshold, total return 8%/yr solid bar,
 * owner-occupant $300/mo near-break-even band. They are display copy only —
 * never a new cutoff. If the engine's bands move, move these with them.
 */

import { COMPONENT_MAXES, type DealScoreBreakdown } from "@/lib/deal-score";

/** Mirrors getCashFlowScore's owner-occupant 30-pt max in lib/deal-score.ts. */
const OWNER_OCCUPANT_CASH_FLOW_MAX = 30;

export type DealTipsPropertyType = "single-family" | "multi-family" | "owner-occupant";

export interface DealTipsInput {
  /** Pro-tier score breakdown; null/undefined when not loaded (free / anon). */
  breakdown: DealScoreBreakdown | null | undefined;
  propertyType: DealTipsPropertyType;
  /** `monthlyPayment <= 0` = cash purchase — DSCR is N/A, never tipped. */
  isCashPurchase: boolean;
  /**
   * The deal's actual metric values (from AnalysisResult), used to quote the
   * deal's own numbers in the tip ("DSCR 1.12 is your thin spot"). Optional —
   * tips degrade to the tier phrasing without them.
   */
  metrics?: {
    netCashFlow?: number;
    cocReturn?: number;
    capRate?: number;
    dscr?: number;
  };
}

interface TipCandidate {
  /** subscore / component max — lower = weaker = tipped first. */
  ratio: number;
  tip: string;
}

const fmtMoney = (n: number) => `$${Math.abs(Math.round(n)).toLocaleString()}`;

/**
 * Returns 1–2 deal-specific tips for the weakest subscores, or null when
 * there is nothing to tip: no breakdown (free tier / score not loaded) or
 * every subscore is inside its healthy tier (strong deal). Callers fall
 * back to the canned per-recommendation tips on null.
 */
export function buildDealTips(input: DealTipsInput): string[] | null {
  const { breakdown, isCashPurchase, metrics } = input;
  if (!breakdown) return null;

  const isOwnerOccupant = input.propertyType === "owner-occupant";
  const candidates: TipCandidate[] = [];

  // Cash flow — investor tiers: 18 = "Above $500/mo - strong"; 8 = positive
  // but modest; below 8 = negative. Owner-occupant: 25 = within $300/mo of
  // break-even (typical for a house-hack, not a weakness).
  if (isOwnerOccupant) {
    if (breakdown.cashFlowScore < 25) {
      candidates.push({
        ratio: breakdown.cashFlowScore / OWNER_OCCUPANT_CASH_FLOW_MAX,
        tip:
          metrics?.netCashFlow != null
            ? `Owner cost runs ${fmtMoney(metrics.netCashFlow)}/mo above break-even — past the $300/mo house-hack band; negotiate the price or add rental income to close the gap.`
            : `Owner cost is meaningfully above break-even — past the $300/mo house-hack band; negotiate the price or add rental income to close the gap.`,
      });
    }
  } else if (breakdown.cashFlowScore < 18) {
    const cf = metrics?.netCashFlow;
    candidates.push({
      ratio: breakdown.cashFlowScore / COMPONENT_MAXES.cashFlow,
      tip:
        breakdown.cashFlowScore >= 8
          ? cf != null
            ? `Cash flow ${fmtMoney(cf)}/mo is positive but under the $500/mo strong band — trim operating expenses or validate rent comps to close the gap.`
            : `Monthly cash flow is positive but under the $500/mo strong band — trim operating expenses or validate rent comps to close the gap.`
          : cf != null
            ? `Cash flow is negative (-${fmtMoney(cf)}/mo), leaning on appreciation and tax benefits — negotiate the price or financing until the monthly math turns positive.`
            : `Cash flow is negative, leaning on appreciation and tax benefits — negotiate the price or financing until the monthly math turns positive.`,
    });
  }

  // Cash-on-cash — 13 = "5–7% - healthy"; 8 = 3–5% modest; below = weak.
  if (breakdown.cocScore < 13) {
    const coc = metrics?.cocReturn;
    const modest = breakdown.cocScore >= 8;
    // Quote the deal's own number only when its ROUNDED display still sits
    // inside the band the sentence claims — the engine tiers on the raw
    // value, so a 2.96% that displays as "3.0%" must not read "3.0% is
    // below the 3% weak bar".
    const cocShown = coc != null ? Number(coc.toFixed(1)) : null;
    const cocQuotable = cocShown != null && (modest ? cocShown < 5 : cocShown < 3);
    const cocLabel = cocQuotable ? `Cash-on-cash ${cocShown.toFixed(1)}%` : "Cash-on-cash";
    candidates.push({
      ratio: breakdown.cocScore / COMPONENT_MAXES.coc,
      tip: modest
        ? `${cocLabel} sits in the modest 3–5% band, under the 5–7% healthy range — a lower purchase price lifts CoC and cap rate together.`
        : `${cocLabel} is below the 3% weak bar — a lower purchase price or better financing terms is needed for the cash going in.`,
    });
  }

  // Cap rate — 9 = "5–6.5% - fair for the market"; below 5% returns rely on
  // price growth.
  if (breakdown.capRateScore < 9) {
    const cap = metrics?.capRate;
    // Same rounded-display guard as CoC: never quote "5.0%" beside "below
    // the 5% market bar".
    const capShown = cap != null ? Number(cap.toFixed(1)) : null;
    candidates.push({
      ratio: breakdown.capRateScore / COMPONENT_MAXES.capRate,
      tip: `Cap rate ${capShown != null && capShown < 5 ? `${capShown.toFixed(1)}% ` : ""}is below the 5% market bar, so returns rely on price growth — a lower offer lifts it directly.`,
    });
  }

  // DSCR — 13 = "Above 1.20 - clears lender threshold"; 7 = 1.10–1.20 thin;
  // 3 = 1.00–1.10 very tight; 0 = under water. Cash purchases carry a
  // synthetic full-credit 17 (no debt to cover) — never tip DSCR for them.
  if (!isCashPurchase && breakdown.dscrScore < 13) {
    const dscr = metrics?.dscr;
    // Rounded-display guard: a raw 1.196 scores "thin" but displays as
    // "1.20" — quoting it beside "below the 1.20 lender threshold" would
    // self-contradict, so fall back to the bare metric name.
    const dscrShown = dscr != null ? Number(dscr.toFixed(2)) : null;
    const dscrLabel =
      dscrShown != null && dscrShown < 1.2 ? `DSCR ${dscrShown.toFixed(2)}` : "DSCR";
    candidates.push({
      ratio: breakdown.dscrScore / COMPONENT_MAXES.dscr,
      tip:
        breakdown.dscrScore >= 7
          ? `${dscrLabel} is your thin spot — below the 1.20 lender threshold; a lower offer or better financing terms widens the coverage cushion.`
          : breakdown.dscrScore >= 3
            ? `${dscrLabel} covers the debt with almost no cushion — below the 1.20 lender threshold; a lower offer or better financing terms widens it.`
            : `${dscrLabel} means rent doesn't cover the debt service — lenders fund above 1.20; the price or the terms need to move first.`,
    });
  }

  // Total return — 14 = "8–11%/yr projected - solid". Below that, long-term
  // upside is the weak dimension.
  if (breakdown.totalReturnScore < 14) {
    candidates.push({
      ratio: breakdown.totalReturnScore / COMPONENT_MAXES.totalReturn,
      tip:
        breakdown.totalReturnScore >= 8
          ? `Projected 10-year total return is modest (5–8%/yr), under the 8%/yr solid bar — a lower purchase price lifts every return metric at once.`
          : `Projected 10-year total return is under the 5%/yr line — limited long-term upside; revisit the price, rent, or appreciation assumptions.`,
    });
  }

  if (candidates.length === 0) return null;

  // Two lowest ratios lead; sort is stable so ties keep breakdown order.
  return candidates
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 2)
    .map((c) => c.tip);
}
