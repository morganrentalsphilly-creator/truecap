/**
 * Social card for /tools/2-percent-rule-calculator. Next serves this file as the page's
 * og:image and twitter:image because the page's metadata sets no `images`
 * (a page that sets one keeps its own; lib/__tests__/public-metadata-contract.test.ts).
 *
 * The drawing is the shared template (lib/og/tool-og-template.tsx). The chips
 * are passed here and say only what is true of this tool: it is free and it
 * needs no account. The template's default chips include "Live data", which
 * no tool on this template shows.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";

export const alt = "2% rule calculator — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "2% rule calculator",
    tagline:
      "Rent ÷ price against the 2% and 1% bars, with a guide to what a ratio above 2% can signal.",
    pills: ["Free", "No signup"],
  });
}
