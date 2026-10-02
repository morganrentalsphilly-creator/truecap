/**
 * Social card for /tools/rehab-cost-estimator. Next serves this file as the page's
 * og:image and twitter:image because the page's metadata sets no `images`
 * (a page that sets one keeps its own; lib/__tests__/public-metadata-contract.test.ts).
 *
 * The drawing is the shared template (lib/og/tool-og-template.tsx). The chips
 * are passed here and say only what is true of this tool: it is free and it
 * needs no account. The template's default chips include "Live data", which
 * no tool on this template shows.
 *
 * The line says what the tool on the page does: you tick work items, set the
 * square footage, the bath count and a contingency, and read a total. The
 * amounts per item are fixed defaults there (the page's estimator passes no
 * `overrides` to estimateRehab), so the card does not call them editable.
 * lib/__tests__/released-tool-surface-guards.test.ts holds it to that.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";

export const alt = "Rehab cost estimator — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "Rehab cost estimator",
    tagline:
      "Planning defaults for cosmetic, kitchen, bath and systems work. Pick the scope, add a contingency, and get contractor bids before you commit.",
    pills: ["Free", "No signup"],
  });
}
