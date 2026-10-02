/**
 * Social card for /vs/rentspree. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/rentspree and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs RentSpree";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "RentSpree",
    tagline:
      "RentSpree screens tenants. TrueCap underwrites deals. Different jobs in the rental workflow.",
    slug: "rentspree",
  });
}
