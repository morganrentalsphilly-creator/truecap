/**
 * Next action — the single recommended next step for a deal, derived from its
 * underwrite (cash flow + DSCR) and buy-box fit. Centralizes logic that was
 * previously inline in the dashboard so saved-deal cards, the decision center,
 * and My Deals can all show ONE consistent "what do I do next" per deal.
 *
 * Stage-aware: when the caller passes the deal's pipeline stage, the advice
 * matches where the deal actually is — a closed deal is told to track equity,
 * a passed deal to revisit if the price drops, and an offer/under-contract
 * deal gets its blocker/ready copy rephrased (you don't "make your offer"
 * twice). No stage (or a still-shopping stage) reads exactly as before.
 *
 * Pure: numbers in, a {label, reason, tone} out. Tested in lib/__tests__.
 */

import type { PipelineStage } from "./pipeline";

export type NextActionTone = "blocked" | "review" | "ready";

export type NextAction = {
  /** Imperative next step, e.g. "Lower your offer or raise rent". */
  label: string;
  /** One-phrase reason, e.g. "cash flow is negative at these assumptions". */
  reason: string;
  tone: NextActionTone;
};

export type NextActionInput = {
  /** Monthly net cash flow ($). */
  netCashFlow: number;
  /** DSCR (null for a cash purchase — no debt to cover). */
  dscr?: number | null;
  /** Monthly debt-service payment; <= 0 means a cash purchase (DSCR N/A). */
  monthlyPayment?: number | null;
  /** Whether the deal meets the user's (default) buy box. null = none set. */
  meetsBuyBox?: boolean | null;
  /** Where the deal sits in the saved-deal pipeline. Omitted = advise as if shopping. */
  stage?: PipelineStage;
  /** Closed deals only: whether a close date is already recorded. true =
   *  equity tracking is live (never instruct adding what's added); omitted/
   *  false = keep the add-a-close-date instruction. */
  hasCloseDate?: boolean;
};

/** Conventional DSCR floor lenders look for on investment property. */
export const LENDER_DSCR_BAR = 1.25;

/**
 * Terminal stages replace the underwrite advice entirely — the decision is
 * already made, so the next step is about living with it, not shopping.
 */
function terminalStageAction(
  stage: PipelineStage | undefined,
  hasCloseDate?: boolean
): NextAction | null {
  if (stage === "closed") {
    return {
      // "Track your equity" — no "actuals": actuals tracking doesn't exist in
      // the product yet, and the label must not promise more than the equity
      // card delivers. With a close date recorded, the banner must not
      // instruct adding one directly above the card that already shows it.
      label: "Track your equity",
      reason: hasCloseDate
        ? "this deal closed — your equity updates monthly below; revisit after a re-appraisal or rent change"
        : "this deal closed — add a close date to track your equity",
      tone: "ready",
    };
  }
  if (stage === "passed") {
    return {
      label: "Review only if inputs change",
      reason: "this deal is recorded as Passed; a future review should use updated price and assumptions",
      tone: "review",
    };
  }
  return null;
}

/**
 * Offer / under-contract deals keep the underwrite's verdict (tone + reason)
 * but the step is rephrased for where the deal is: a blocker means
 * renegotiate — not re-shop — and a clean underwrite means keep the deal
 * moving (chase the offer, work the due-diligence checklist in the deal
 * workspace). Review-tone advice (buy-box fit, lender bar) still applies
 * as written, so it passes through untouched.
 */
function applyInFlightStage(action: NextAction, stage: PipelineStage | undefined): NextAction {
  if (stage === "negotiating") {
    if (action.tone === "blocked") {
      return { label: "Review current terms and target gaps", reason: action.reason, tone: "blocked" };
    }
    if (action.tone === "ready") {
      return {
        label: "Recheck the negotiated terms",
        reason: "the current modeled terms clear the screening checks; the user retains the decision",
        tone: "ready",
      };
    }
  }
  if (stage === "offer") {
    if (action.tone === "blocked") {
      return { label: "Review the offer against current inputs", reason: action.reason, tone: "blocked" };
    }
    if (action.tone === "ready") {
      return { label: "Monitor offer status and verify inputs", reason: "the offer is recorded and the current screening checks clear", tone: "ready" };
    }
  }
  if (stage === "under_contract") {
    if (action.tone === "blocked") {
      return { label: "Review target gaps before contingency dates", reason: action.reason, tone: "blocked" };
    }
    if (action.tone === "ready") {
      return { label: "Work your due-diligence checklist", reason: "under contract — verify your assumptions before closing", tone: "ready" };
    }
  }
  return action;
}

export function nextActionForDeal(input: NextActionInput): NextAction {
  const terminal = terminalStageAction(input.stage, input.hasCloseDate);
  if (terminal) return terminal;
  return applyInFlightStage(baseActionForDeal(input), input.stage);
}

/** The stage-agnostic underwrite advice — unchanged shopping-phase logic. */
function baseActionForDeal(input: NextActionInput): NextAction {
  const cf = Number(input.netCashFlow) || 0;
  const isCash = (Number(input.monthlyPayment) || 0) <= 0;
  const dscr = isCash ? null : typeof input.dscr === "number" && Number.isFinite(input.dscr) ? input.dscr : null;

  // 1) Hard blockers — the deal doesn't work as entered.
  if (cf < 0) {
    return {
      label: "Review price and rent assumptions",
      reason: "cash flow is negative at these assumptions",
      tone: "blocked",
    };
  }
  if (dscr != null && dscr < 1) {
    return {
      label: "Review financing assumptions",
      reason: "DSCR is under 1.0 — rent doesn't cover the debt",
      tone: "blocked",
    };
  }

  // 2) Misses the user's buy box.
  if (input.meetsBuyBox === false) {
    return {
      label: "Review the missed Buy Box rules",
      reason: "this deal misses your buy-box criteria",
      tone: "review",
    };
  }

  // 3) Bankable, but below the lender DSCR bar.
  if (dscr != null && dscr < LENDER_DSCR_BAR) {
    return {
      label: "Confirm written lender terms",
      reason: `DSCR is below the ${LENDER_DSCR_BAR} screening benchmark; lender criteria vary`,
      tone: "review",
    };
  }

  // 4) Positive screen — verification still comes before a user decision.
  if (input.meetsBuyBox === true) {
    return {
      label: "Verify material assumptions",
      reason: "the modeled economics meet your Buy Box; evidence is still separate",
      tone: "ready",
    };
  }
  return {
    label: "Verify material assumptions",
    reason: "the modeled cash flow and DSCR clear the screening thresholds",
    tone: "ready",
  };
}

export type DealVerdict = "Strong Buy" | "Buy" | "Neutral" | "Risky" | "Avoid";

/**
 * Next action from a saved deal's verdict tier + cash flow — for list surfaces
 * (My Deals) that carry the recommendation but not raw DSCR. The verdict
 * already folds in DSCR, CoC, and cash flow via the Deal Score, so this stays
 * consistent with nextActionForDeal without needing the result snapshot.
 */
export function nextActionFromVerdict(input: {
  recommendation: DealVerdict;
  netCashFlow: number;
  meetsBuyBox?: boolean | null;
  /** Where the deal sits in the saved-deal pipeline. Omitted = advise as if shopping. */
  stage?: PipelineStage;
  /** Closed deals only: a recorded close date suppresses the add-one advice. */
  hasCloseDate?: boolean;
}): NextAction {
  const terminal = terminalStageAction(input.stage, input.hasCloseDate);
  if (terminal) return terminal;
  return applyInFlightStage(baseActionFromVerdict(input), input.stage);
}

/** The stage-agnostic verdict-tier advice — unchanged shopping-phase logic. */
function baseActionFromVerdict(input: {
  recommendation: DealVerdict;
  netCashFlow: number;
  meetsBuyBox?: boolean | null;
}): NextAction {
  const cf = Number(input.netCashFlow) || 0;
  if (cf < 0) {
    return { label: "Review price and rent assumptions", reason: "cash flow is negative", tone: "blocked" };
  }
  if (input.recommendation === "Avoid") {
    return { label: "Review the failed economics", reason: "the numbers don't support it as entered", tone: "blocked" };
  }
  if (input.meetsBuyBox === false) {
    return { label: "Review the missed Buy Box rules", reason: "this deal misses your buy-box criteria", tone: "review" };
  }
  if (input.recommendation === "Risky") {
    return { label: "Verify the weak assumptions", reason: "thin margins — confirm rent, rate, and expenses", tone: "review" };
  }
  if (input.recommendation === "Neutral") {
    return { label: "Compare, then decide", reason: "a middling deal — weigh it against your others", tone: "review" };
  }
  return {
    label: "Verify material assumptions",
    reason: "the Deal score is positive, but it does not record a decision",
    tone: "ready",
  };
}
