/**
 * Social card for /vs/rentometer. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/rentometer and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Rentometer";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Rentometer",
    tagline:
      "Rentometer is rent estimates and rental comps, with a Deal Worksheet on its Pro plan. TrueCap underwrites the deal and checks it against your targets.",
    slug: "rentometer",
  });
}
