/**
 * Dynamic OG image for /vs/yardi-breeze. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Yardi Breeze — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Yardi Breeze",
    tagline:
      "Yardi Breeze is small-landlord PM software. TrueCap is the pre-purchase underwrite.",
    slug: "yardi-breeze",
  });
}
