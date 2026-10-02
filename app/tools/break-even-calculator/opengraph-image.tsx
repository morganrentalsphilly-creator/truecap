/**
 * Social card for /tools/break-even-calculator. Next serves this file as the page's
 * og:image and twitter:image because the page's metadata sets no `images`
 * (a page that sets one keeps its own; lib/__tests__/public-metadata-contract.test.ts).
 *
 * The drawing is the shared template (lib/og/tool-og-template.tsx). The chips
 * are passed here and say only what is true of this tool: it is free and it
 * needs no account. The template has no default chips: a card that passes
 * none draws none.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";

export const alt = "Break-even calculator — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "Break-even calculator",
    tagline:
      "How many months until rental cash flow returns your initial cash, from four numbers you enter.",
    pills: ["Free", "No signup"],
  });
}
