/**
 * Dynamic OG image for /vs/arrived. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Arrived — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Arrived",
    tagline:
      "Arrived sells fractional rental shares. TrueCap underwrites whole properties you buy directly.",
    slug: "arrived",
  });
}
