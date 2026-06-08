/**
 * Dynamic OG image for /vs/rentredi. Auto-detected by Next.js App Router
 * convention; overrides any images: [...] declared in the route's
 * metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/vs-og-template.tsx — this file is just the per-competitor
 * config wrapper so all 10 /vs OG images stay visually consistent.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs RentRedi — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "RentRedi",
    tagline:
      "RentRedi collects rent. TrueCap decides if the deal cash-flows. Pre-purchase underwrite vs post-purchase ops.",
    slug: "rentredi",
  });
}
