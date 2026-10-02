/**
 * Social card for /vs/rentec-direct. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/rentec-direct and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Rentec Direct";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Rentec Direct",
    tagline:
      "Rentec Direct is property management software for landlords and property managers. TrueCap underwrites the deal before you buy. Different stages.",
    slug: "rentec-direct",
  });
}
