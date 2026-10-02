/**
 * Social card for /vs/mashvisor. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/mashvisor and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Mashvisor";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Mashvisor",
    tagline:
      "Mashvisor is rental data for finding markets and properties, with its own property analysis. TrueCap is the deal decision once you've picked an address.",
    slug: "mashvisor",
  });
}
