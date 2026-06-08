/**
 * Dynamic OG image for /vs/hostaway. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Hostaway — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Hostaway",
    tagline:
      "Hostaway manages STRs after closing. TrueCap underwrites the STR deal before.",
    slug: "hostaway",
  });
}
