/**
 * Dynamic OG image for /for-buy-and-hold: the page's own H1 and hero subhead on the
 * shared persona card (lib/og/persona-og-template.tsx).
 */

import { renderPersonaOgImage, OG_SIZE } from "@/lib/og/persona-og-template";

export const alt = "TrueCap for buy-and-hold investors";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderPersonaOgImage({
    label: "For buy-and-hold investors",
    headline: "The numbers that decide whether to hold — in one screen.",
    subhead: "Screen cap rate, cash-on-cash, DSCR, and cash flow free. Pro adds Offer Ceiling, sensitivity, and 10-year cash-flow and equity projections using labeled, editable starting data.",
    path: "/for-buy-and-hold",
  });
}
