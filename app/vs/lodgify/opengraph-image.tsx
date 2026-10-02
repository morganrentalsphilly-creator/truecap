/**
 * Social card for /vs/lodgify. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/lodgify and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Lodgify";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Lodgify",
    tagline:
      "Lodgify is vacation rental software: calendar sync, direct bookings and guest messaging. TrueCap underwrites the deal before you buy.",
    slug: "lodgify",
  });
}
