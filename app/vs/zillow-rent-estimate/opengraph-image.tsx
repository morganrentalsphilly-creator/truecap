/**
 * Social card for /vs/zillow-rent-estimate. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/zillow-rent-estimate and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Zillow Rent Estimate";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Zillow Rent",
    tagline:
      "Compare Zillow's property-specific starting estimate with TrueCap's editable HUD area benchmark and underwriting workflow.",
    slug: "zillow-rent-estimate",
  });
}
