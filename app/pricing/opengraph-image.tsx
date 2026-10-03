/**
 * Social card for /pricing, on the shared card the persona pages use
 * (lib/og/persona-og-template.tsx). Next serves it as the page's og:image and
 * twitter:image because the page's metadata sets no `images`.
 *
 * The headline is the page's H1 in the same words, without the H1's dash, and
 * the line under it is the page's meta description, each built from the same
 * constants the page reads: the overpay
 * example from lib/public-pricing.ts and the trial's length and limits from
 * lib/product-access.ts. No plan price is printed, and no number is typed
 * here. lib/__tests__/public-metadata-contract.test.ts holds the card to the
 * page's wording.
 */

import { renderPersonaOgImage, OG_SIZE } from "@/lib/og/persona-og-template";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";
import { formatUsdWhole, PRICING_OUTCOME_EXAMPLE } from "@/lib/public-pricing";

export const alt = "TrueCap pricing";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderPersonaOgImage({
    label: "Pricing",
    headline: `Overpaying by ${PRICING_OUTCOME_EXAMPLE.overpayPct}% on a ${formatUsdWhole(PRICING_OUTCOME_EXAMPLE.purchasePriceUsd)} rental costs ${formatUsdWhole(PRICING_OUTCOME_EXAMPLE.overpayUsd)} before you collect a dollar of rent.`,
    subhead: `Complete a rental decision free, then create an account for a ${PRODUCT_EVALUATION_DAYS}-day free trial with ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison.`,
    path: "/pricing",
  });
}
