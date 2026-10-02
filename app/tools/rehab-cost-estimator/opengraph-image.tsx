/**
 * Social card for /tools/rehab-cost-estimator. Next serves this file as the page's
 * og:image and twitter:image because the page's metadata sets no `images`
 * (a page that sets one keeps its own; lib/__tests__/public-metadata-contract.test.ts).
 *
 * The drawing is the shared template (lib/og/tool-og-template.tsx). The chips
 * are passed here and say only what is true of this tool: it is free and it
 * needs no account. The template's default chips include "Live data", which
 * no tool on this template shows.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";

export const alt = "Rehab cost estimator — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "Rehab cost estimator",
    tagline:
      "Editable planning defaults for cosmetic, kitchen, bath and systems work. Replace each line with your own bid.",
    pills: ["Free", "No signup"],
  });
}
