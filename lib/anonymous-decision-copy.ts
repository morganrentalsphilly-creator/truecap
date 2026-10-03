import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";

/**
 * What the analyzer page says about the no-signup decision's binding.
 *
 * The grant is bound to one exact input set (app/actions/anonymous-decision.ts
 * compares the resource key of the whole validated form). A changed input gets
 * LIMIT_REACHED and the coarse range; the original inputs match the grant
 * again and get the exact figure back. These sentences state that, and nothing
 * about the server action's own message changes: the page shows its own text
 * for the LIMIT_REACHED code.
 */
export const ANONYMOUS_DECISION_INPUT_BOUND_NOTE =
  "Without an account, the exact Offer Ceiling is tied to the inputs you first ran in this browser. Recalculating with changed inputs shows the Offer Ceiling as a range; restoring the original inputs brings the exact figure back.";

/** Toast body for the LIMIT_REACHED result of the anonymous claim. The trial
 *  counts render from the limit constants, never typed by hand. */
export function anonymousDecisionUsedDescription(): string {
  const comparisons = `${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison${
    PRODUCT_EVALUATION_COMPARISON_LIMIT === 1 ? "" : "s"
  }`;
  return `This browser's no-signup decision is tied to the inputs you first ran, so the exact Offer Ceiling is not shown for these inputs. Restore the original inputs to get it back, or create a free account for ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and ${comparisons}, no card.`;
}
