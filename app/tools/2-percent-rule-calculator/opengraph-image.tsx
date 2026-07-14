/**
 * Dynamic OG image for /tools/2-percent-rule-calculator. Auto-detected
 * by Next.js App Router convention; overrides any images: [...] declared
 * in the route's metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/tool-og-template.tsx — this file is just the per-tool
 * config wrapper so all tool OG images stay visually consistent.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";

export const runtime = "edge";
export const alt = "2% rule calculator — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "2% rule calculator",
    tagline: "Rent ÷ price against the strict 2% bar. The cash-flow-market screen — with the honest read on what 2%+ ratios really signal.",
  });
}
