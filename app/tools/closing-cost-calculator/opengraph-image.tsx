/**
 * Dynamic OG image for /tools/closing-cost-calculator. Auto-detected by Next.js
 * App Router convention; overrides any images: [...] declared in
 * the route's metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/tool-og-template.tsx — this file is just the per-tool
 * config wrapper so all 14 tool OG images stay visually consistent.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";

export const runtime = "edge";
export const alt = "Closing cost calculator — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "Closing cost calculator",
    tagline: "Origination, title, transfer tax, escrow, prepaids — every line item on a rental purchase, plus a typical total.",
  });
}
