/**
 * Social card for /vs/propstream. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/propstream and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs PropStream";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "PropStream",
    tagline:
      "PropStream finds the leads. TrueCap underwrites the deals. Different jobs in the same investor workflow.",
    slug: "propstream",
  });
}
