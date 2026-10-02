/**
 * Social card for /vs/mashvisor-for-short-term-rentals. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/mashvisor-for-short-term-rentals and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Mashvisor for short-term rentals";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Mashvisor (STR)",
    tagline:
      "Short-term rentals: Mashvisor's market and property data compared with a TrueCap deal decision on your own numbers.",
    slug: "mashvisor-for-short-term-rentals",
  });
}
