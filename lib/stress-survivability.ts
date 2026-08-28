/**
 * Stress survivability — the plain-English readout under the what-if /
 * worst-case stress tools: "does the deal still cash-flow when things
 * go wrong, and if not, what closes the gap?"
 *
 * Pure compute over TWO AnalysisResult objects (base + stressed), both
 * produced by `calculateAnalysis` — this module never re-derives
 * cash-flow math from form inputs. Everything here is read off the
 * result objects:
 *
 *   - Survives / breaks: the sign of the STRESSED net cash flow.
 *   - Break-even gap: how much more rent (or how many pp less vacancy)
 *     would zero out the stressed shortfall. The rent path accounts for
 *     the rent-linked reserves (vacancy / management / maintenance /
 *     CapEx are all % of gross rent in calc-analysis), whose effective
 *     rates are derived from the stressed result's own line items —
 *     not re-computed from assumptions.
 *   - DSCR banding vs the 1.20 lender line. Display-only; the wording
 *     mirrors what's already on screen (the Deal Score breakdown's
 *     "Above 1.20 - clears lender threshold" / "thin coverage cushion"
 *     and the DSCR metric card's "Underwater" / "Cash purchase").
 *
 * No new financial assumptions (no reserves balance exists on
 * AnalysisResult, so no months-of-reserves figure is invented).
 */

import type { AnalysisResult } from "./calc-analysis";
import { NO_DEBT_SERVICE_DSCR_LABEL } from "./financial-presentation";

/** The lender coverage line quoted throughout the app (Deal Score
 *  breakdown: "Above 1.20 - clears lender threshold"). Display-only —
 *  verdict/deal-score thresholds live in lib/verdict.ts + lib/deal-score.ts
 *  and are NOT read from here. */
export const LENDER_DSCR_LINE = 1.2;

export type StressVerdict =
  /** Stressed cash flow is >= $0/mo — the deal keeps paying for itself. */
  | "survives"
  /** Base cash flow was positive (or zero) but the stress pushed it negative. */
  | "breaks"
  /** Cash flow was already negative before any stress was applied. */
  | "already-negative";

export type StressDscrBand = "clears" | "thin" | "underwater" | "cash";

export interface StressSurvivability {
  verdict: StressVerdict;
  /** Convenience: verdict === "survives". */
  survives: boolean;
  /** Stressed monthly cash flow, rounded to whole dollars. */
  stressedCashFlow: number;
  /** Base monthly cash flow, rounded to whole dollars. */
  baseCashFlow: number;
  /** stressedCashFlow − baseCashFlow (how much the stress cost per month). */
  deltaMonthly: number;
  /** One-line plain-English answer, e.g. "Survives — still +$112/mo." */
  headline: string;
  /** Break-even guidance. Populated only when stressed cash flow is negative. */
  breakEven: {
    /** Extra gross rent ($/mo) that would zero the stressed shortfall, or null
     *  when rent can't realistically close it (keep-rate collapsed). */
    extraRentMonthly: number | null;
    /** Vacancy reduction (pp) that would zero the shortfall, or null when the
     *  stressed vacancy allowance is smaller than the gap (can't go below 0%). */
    vacancyPpReduction: number | null;
    /** Ready-made sentence, e.g. "Needs about $180/mo more rent or 2.3pp
     *  lower vacancy to break even." Null when nothing to say. */
    sentence: string | null;
  };
  /** DSCR under stress, banded against the 1.20 lender line. Display-only. */
  dscr: {
    /** Stressed DSCR, or null for cash purchases (monthlyPayment <= 0). */
    value: number | null;
    band: StressDscrBand;
    label: string;
  };
}

function fmtMoney(n: number): string {
  const rounded = Math.round(Math.abs(n));
  return `${n < 0 ? "-" : "+"}$${rounded.toLocaleString("en-US")}`;
}

/**
 * Build the survivability readout from a base and a stressed analysis.
 * Both must come from `calculateAnalysis` (same deal, different inputs).
 */
export function buildStressSurvivability(
  base: AnalysisResult,
  stressed: AnalysisResult
): StressSurvivability {
  const baseCashFlow = Math.round(base.netCashFlow);
  const stressedCashFlow = Math.round(stressed.netCashFlow);
  const deltaMonthly = stressedCashFlow - baseCashFlow;

  const verdict: StressVerdict =
    stressedCashFlow >= 0
      ? "survives"
      : baseCashFlow >= 0
        ? "breaks"
        : "already-negative";

  // ---- Break-even gap (only when the stressed deal loses money) ----
  let extraRentMonthly: number | null = null;
  let vacancyPpReduction: number | null = null;
  let sentence: string | null = null;

  if (stressedCashFlow < 0) {
    const shortfall = -stressed.netCashFlow;
    const income = stressed.monthlyRentalIncome;

    if (income > 0) {
      // Each extra $1/mo of gross rent also raises the rent-linked
      // reserves (vacancy, management, maintenance, CapEx — all % of
      // gross rent in calc-analysis). Derive the effective combined
      // rate from the stressed result's own line items.
      const rentLinked =
        stressed.vacancy + stressed.management + stressed.maintenance + stressed.capex;
      const keepRate = 1 - rentLinked / income;
      // A keep-rate this low means rent barely moves cash flow — a rent
      // number would be misleading (and enormous). Suppress it.
      if (keepRate > 0.05) {
        extraRentMonthly = Math.ceil(shortfall / keepRate);
      }

      // 1pp of vacancy costs income/100 per month. You can't cut vacancy
      // below 0%, so cap at the stressed vacancy allowance.
      const perPp = income / 100;
      const currentVacancyPp = (stressed.vacancy / income) * 100;
      const ppNeeded = shortfall / perPp;
      if (ppNeeded <= currentVacancyPp) {
        vacancyPpReduction = Math.ceil(ppNeeded * 10) / 10;
      }
    }

    const parts: string[] = [];
    if (extraRentMonthly != null) {
      parts.push(`about $${extraRentMonthly.toLocaleString("en-US")}/mo more rent`);
    }
    if (vacancyPpReduction != null) {
      parts.push(`${vacancyPpReduction}pp lower vacancy`);
    }
    sentence = parts.length > 0 ? `Needs ${parts.join(" or ")} to break even.` : null;
  }

  // ---- Headline ----
  let headline: string;
  if (verdict === "survives") {
    headline = `Survives — ${baseCashFlow >= 0 ? "still" : "now"} ${fmtMoney(stressedCashFlow)}/mo.`;
  } else if (verdict === "breaks") {
    headline = `Breaks — ${fmtMoney(stressedCashFlow)}/mo under this stress.`;
  } else {
    headline = `No cushion — already ${fmtMoney(baseCashFlow)}/mo before stress, ${fmtMoney(stressedCashFlow)}/mo under it.`;
  }

  // ---- DSCR banding (display-only; wording mirrors existing UI) ----
  let dscr: StressSurvivability["dscr"];
  if (stressed.monthlyPayment <= 0) {
    // Same convention as the DSCR metric card: cash purchase → N/A.
    dscr = {
      value: null,
      band: "cash",
      label: NO_DEBT_SERVICE_DSCR_LABEL,
    };
  } else {
    const v = stressed.dscr;
    const shown = v.toFixed(2);
    if (v >= LENDER_DSCR_LINE) {
      dscr = {
        value: v,
        band: "clears",
        label: `DSCR ${shown} under stress — clears the 1.20 lender threshold`,
      };
    } else if (v >= 1.0) {
      dscr = {
        value: v,
        band: "thin",
        label: `DSCR ${shown} under stress — below 1.20, thin coverage cushion`,
      };
    } else {
      dscr = {
        value: v,
        band: "underwater",
        label: `DSCR ${shown} under stress — underwater (rent doesn't cover debt service)`,
      };
    }
  }

  return {
    verdict,
    survives: verdict === "survives",
    stressedCashFlow,
    baseCashFlow,
    deltaMonthly,
    headline,
    breakEven: { extraRentMonthly, vacancyPpReduction, sentence },
    dscr,
  };
}
