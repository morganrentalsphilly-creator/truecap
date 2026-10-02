/**
 * Social card for /analyze, on the shared card the persona pages use
 * (lib/og/persona-og-template.tsx). Next serves it as the page's og:image and
 * twitter:image because the page's metadata sets no `images`.
 *
 * The headline is the page's social title without the brand suffix and the
 * line under it is the page's own Open Graph description, so the card says
 * what the link's title and description already say.
 * lib/__tests__/public-metadata-contract.test.ts holds the two together.
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
      "Cash flow, DSCR, and the highest price that still meets your targets, from an address. No account.",
    path: "/analyze",
  });
}
