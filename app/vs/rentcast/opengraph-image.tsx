/**
 * Dynamic OG image for /vs/rentcast. Auto-detected by Next.js App Router
 * convention; overrides any images: [...] declared in the route's
 * metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs RentCast — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "RentCast",
    tagline:
      "RentCast estimates rent. TrueCap underwrites the full deal — including the rent. Often used together.",
    slug: "rentcast",
  });
}
