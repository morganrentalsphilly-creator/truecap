/**
 * Social card for /analyze, on the shared card the persona pages use
 * (lib/og/persona-og-template.tsx). Next serves it as the page's og:image and
 * twitter:image because the page's metadata sets no `images`.
 *
 * The headline is the page's social title without the brand suffix. The line
 * under it is the page's own Open Graph description without its address
 * clause: an address alone fills no numbers for a visitor with no account
 * (the form then asks for the price and the bedrooms), and how that promise
 * is worded site-wide is an open product decision. Until it is settled the
 * card states only what holds either way.
 * lib/__tests__/public-metadata-contract.test.ts holds the card to the page's
 * words and keeps the address clause off it.
 */

import { renderPersonaOgImage, OG_SIZE } from "@/lib/og/persona-og-template";

export const alt = "Analyze a rental property free with TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderPersonaOgImage({
    label: "Rental analyzer",
    headline: "Analyze a rental property free.",
    subhead:
      "Cash flow, DSCR, and the highest price that still meets your targets. No account.",
    path: "/analyze",
  });
}
