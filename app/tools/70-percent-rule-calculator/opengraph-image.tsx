/**
 * Dynamic OG image for /tools/70-percent-rule-calculator. Auto-detected
 * by Next.js App Router convention; overrides any images: [...] declared
 * in the route's metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/tool-og-template.tsx — this file is just the per-tool
 * config wrapper so all tool OG images stay visually consistent.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";

export const runtime = "edge";
export const alt = "70% rule calculator — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "70% rule calculator",
    tagline: "Offer Ceiling = 70% of ARV minus repairs, shown at 60 / 65 / 70 / 75% for screening.",
  });
}
