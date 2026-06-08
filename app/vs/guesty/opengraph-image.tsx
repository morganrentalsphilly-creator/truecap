/**
 * Dynamic OG image for /vs/guesty. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Guesty — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Guesty",
    tagline:
      "Guesty is enterprise STR PM for 50+ properties. TrueCap is solo STR underwriting. Different worlds.",
    slug: "guesty",
  });
}
