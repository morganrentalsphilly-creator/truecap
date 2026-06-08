/**
 * Dynamic OG image for /vs/reonomy. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Reonomy — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Reonomy",
    tagline:
      "Reonomy is commercial RE intelligence + owner data. TrueCap is residential underwriting. Different asset classes.",
    slug: "reonomy",
  });
}
