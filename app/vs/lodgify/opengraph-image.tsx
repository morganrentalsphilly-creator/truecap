/**
 * Dynamic OG image for /vs/lodgify. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Lodgify — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Lodgify",
    tagline:
      "Lodgify is small-operator STR software. TrueCap underwrites the STR deal before. Different stages.",
    slug: "lodgify",
  });
}
