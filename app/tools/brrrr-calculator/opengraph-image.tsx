/**
 * Dynamic OG image for /tools/brrrr-calculator. Auto-detected by Next.js
 * App Router convention; overrides any images: [...] declared in
 * the route's metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/tool-og-template.tsx — this file is just the per-tool
 * config wrapper so all 9 tool OG images stay visually consistent.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";

export const runtime = "edge";
export const alt = "BRRRR planning model not currently released — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "BRRRR planning",
    tagline:
      "The integrated acquisition, rehab, refinance, and stabilized-rental model is not currently released.",
  });
}
