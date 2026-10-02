/**
 * Social card for /vs/rentredi. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/rentredi and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs RentRedi";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "RentRedi",
    tagline:
      "RentRedi collects rent. TrueCap models pre-purchase cash flow. Underwriting vs post-purchase operations.",
    slug: "rentredi",
  });
}
