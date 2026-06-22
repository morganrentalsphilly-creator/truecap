/**
 * Next action — the single recommended next step for a deal, derived from its
 * underwrite (cash flow + DSCR) and buy-box fit. Centralizes logic that was
 * previously inline in the dashboard so saved-deal cards, the decision center,
 * and My Deals can all show ONE consistent "what do I do next" per deal.
 *
 * Pure: numbers in, a {label, reason, tone} out. Tested in lib/__tests__.
 */

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
};

/** Conventional DSCR floor lenders look for on investment property. */
export const LENDER_DSCR_BAR = 1.25;

export function nextActionForDeal(input: NextActionInput): NextAction {
  const cf = Number(input.netCashFlow) || 0;
  const isCash = (Number(input.monthlyPayment) || 0) <= 0;
  const dscr = isCash ? null : typeof input.dscr === "number" && Number.isFinite(input.dscr) ? input.dscr : null;

  // 1) Hard blockers — the deal doesn't work as entered.
  if (cf < 0) {
    return {
      label: "Lower your offer or raise rent",
      reason: "cash flow is negative at these assumptions",
      tone: "blocked",
    };
  }
  if (dscr != null && dscr < 1) {
    return {
      label: "Restructure the financing",
      reason: "DSCR is under 1.0 — rent doesn't cover the debt",
      tone: "blocked",
    };
  }

  // 2) Misses the user's buy box.
  if (input.meetsBuyBox === false) {
    return {
      label: "Adjust to hit your buy box",
      reason: "this deal misses your buy-box criteria",
      tone: "review",
    };
  }

  // 3) Bankable, but below the lender DSCR bar.
  if (dscr != null && dscr < LENDER_DSCR_BAR) {
    return {
      label: "Line up DSCR financing",
      reason: `DSCR is below the ${LENDER_DSCR_BAR} lender bar`,
      tone: "review",
    };
  }

  // 4) Clears the bar — move toward an offer.
  if (input.meetsBuyBox === true) {
    return {
      label: "Make your offer",
      reason: "meets your buy box and clears the lender bar",
      tone: "ready",
    };
  }
  return {
    label: "Line up financing and make your offer",
    reason: "positive cash flow and clears the lender bar",
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
}): NextAction {
  const cf = Number(input.netCashFlow) || 0;
  if (cf < 0) {
    return { label: "Lower your offer or raise rent", reason: "cash flow is negative", tone: "blocked" };
  }
  if (input.recommendation === "Avoid") {
    return { label: "Pass or restructure the deal", reason: "the numbers don't support it as entered", tone: "blocked" };
  }
  if (input.meetsBuyBox === false) {
    return { label: "Adjust to hit your buy box", reason: "this deal misses your buy-box criteria", tone: "review" };
  }
  if (input.recommendation === "Risky") {
    return { label: "Verify the weak assumptions", reason: "thin margins — confirm rent, rate, and expenses", tone: "review" };
  }
  if (input.recommendation === "Neutral") {
    return { label: "Compare, then decide", reason: "a middling deal — weigh it against your others", tone: "review" };
  }
  return { label: "Line up financing and make your offer", reason: "clears your targets", tone: "ready" };
}
