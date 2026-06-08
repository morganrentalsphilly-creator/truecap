/**
 * Dynamic OG image for /vs/rentec-direct. Auto-detected by Next.js App Router
 * convention; overrides any images: [...] declared in the route's
 * metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Rentec Direct — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Rentec Direct",
    tagline:
      "Rentec Direct manages 5-100 unit landlord ops. TrueCap underwrites the deal before. Different stages.",
    slug: "rentec-direct",
  });
}
