/**
 * Dynamic OG image for /vs/zillow-rent-estimate. Auto-detected by Next.js App Router
 * convention; overrides any images: [...] declared in the route's
 * metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/vs-og-template.tsx — this file is just the per-competitor
 * config wrapper so all 10 /vs OG images stay visually consistent.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Zillow Rent — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Zillow Rent",
    tagline:
      "Compare Zillow's property-specific starting estimate with TrueCap's editable HUD area benchmark and underwriting workflow.",
    slug: "zillow-rent-estimate",
  });
}
