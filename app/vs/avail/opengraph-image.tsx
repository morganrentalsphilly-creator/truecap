/**
 * Dynamic OG image for /vs/avail. Auto-detected by Next.js App Router
 * convention; overrides any images: [...] declared in the route's
 * metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/vs-og-template.tsx — this file is just the per-competitor
 * config wrapper so all 10 /vs OG images stay visually consistent.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Avail — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Avail",
    tagline:
      "Avail manages your rentals after closing. TrueCap underwrites them before. Different halves of the DIY-landlord lifecycle.",
    slug: "avail",
  });
}
