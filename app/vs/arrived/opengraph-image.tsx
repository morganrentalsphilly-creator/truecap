/**
 * Social card for /vs/arrived. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The competitor rows on /vs/arrived wait on a decision (report row P0-08),
 * so this card says only what TrueCap does.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Arrived";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Arrived",
    tagline:
      "TrueCap underwrites whole rental properties you buy and own directly, from assumptions you can edit.",
    slug: "arrived",
  });
}
