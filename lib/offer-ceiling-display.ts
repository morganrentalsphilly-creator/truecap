/**
 * When the Offer Ceiling is shown as a number (audit A7; founder decision
 * 2026-10-21). DISPLAY ONLY: the engine's solve is untouched and still
 * recorded, exported and explained in full.
 *
 * Under targets that barely bind (a cash purchase screened on break-even cash
 * flow alone), the highest price that still meets them can run to several
 * times the asking price: the audit's $250,000 house showed an Offer Ceiling
 * of $1,296,500 on the highlight stroke. The engine is right; presenting that
 * figure as the answer is not. Past this multiple of asking the result says
 * there is no price limit under these targets instead.
 */
export const OFFER_CEILING_NO_LIMIT_MULTIPLE = 2;

export const NO_PRICE_LIMIT_HEADLINE = "No price limit under these targets";
export const NO_PRICE_LIMIT_HINT =
  "Add a cap-rate or cash-on-cash target to set one.";

export function isOfferCeilingUnbounded(
  ceiling: number | null | undefined,
  asking: number | null | undefined,
): boolean {
  return (
    typeof ceiling === "number" &&
    typeof asking === "number" &&
    Number.isFinite(ceiling) &&
    Number.isFinite(asking) &&
    asking > 0 &&
    ceiling > asking * OFFER_CEILING_NO_LIMIT_MULTIPLE
  );
}
