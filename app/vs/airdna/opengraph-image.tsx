/**
 * Dynamic OG image for /vs/airdna. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs AirDNA — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "AirDNA",
    tagline:
      "AirDNA estimates STR revenue. TrueCap underwrites the full deal. Often used together.",
    slug: "airdna",
  });
}
