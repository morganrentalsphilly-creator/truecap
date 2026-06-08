/**
 * Dynamic OG image for /vs/crexi. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Crexi — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Crexi",
    tagline:
      "Crexi is the commercial RE marketplace. TrueCap is residential underwriting. Different asset classes.",
    slug: "crexi",
  });
}
