/**
 * Social card for /vs/dealcheck-for-short-term-rentals. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/dealcheck-for-short-term-rentals and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs DealCheck for short-term rentals";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "DealCheck (STR)",
    tagline:
      "Short-term rentals: how TrueCap and DealCheck handle revenue you supply, occupancy assumptions, financing and tax-eligibility limits.",
    slug: "dealcheck-for-short-term-rentals",
  });
}
