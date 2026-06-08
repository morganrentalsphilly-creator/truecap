/**
 * Dynamic OG image for /vs/privy. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Privy — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Privy",
    tagline:
      "Privy is investor MLS search. TrueCap underwrites the deals. Different jobs in the same workflow.",
    slug: "privy",
  });
}
