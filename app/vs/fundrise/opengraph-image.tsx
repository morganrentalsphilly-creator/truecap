/**
 * Dynamic OG image for /vs/fundrise. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Fundrise — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Fundrise",
    tagline:
      "Fundrise sells non-traded REIT shares (passive). TrueCap underwrites whole rentals you buy directly.",
    slug: "fundrise",
  });
}
