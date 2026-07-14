/**
 * Dynamic OG image for /tools/rental-cash-flow-calculator. Auto-detected by
 * Next.js App Router convention; overrides any images: [...] declared in
 * the route's metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/tool-og-template.tsx — this file is just the per-tool
 * config wrapper so all tool OG images stay visually consistent.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";

export const runtime = "edge";
export const alt = "Rental property cash flow calculator — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "Rental cash flow calculator",
    tagline: "Monthly cash flow after every operating expense and the mortgage — with the NOI / debt-service split lenders look at.",
  });
}
