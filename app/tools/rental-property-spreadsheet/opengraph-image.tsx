/**
 * Dynamic OG image for /tools/rental-property-spreadsheet. Auto-detected by
 * Next.js App Router convention; overrides any images: [...] declared in
 * the route's metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/tool-og-template.tsx — this file is just the per-tool
 * config wrapper so all tool OG images stay visually consistent.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";

export const runtime = "edge";
export const alt = "Free rental property spreadsheet (Excel) — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "Rental property spreadsheet",
    tagline: "A free Excel deal analyzer — cash flow, cap rate, cash-on-cash, DSCR, and a 10-year projection. Direct download, no email gate.",
  });
}
