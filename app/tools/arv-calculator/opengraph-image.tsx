/**
 * Dynamic OG image for /tools/arv-calculator. Auto-detected by Next.js
 * App Router convention; overrides any images: [...] declared in
 * the route's metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/tool-og-template.tsx — this file is just the per-tool
 * config wrapper so all tool OG images stay visually consistent.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";

export const runtime = "edge";
export const alt = "ARV calculator — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "ARV calculator",
    tagline: "After-repair value from renovated comps, plus the 70%-rule max offer — the two numbers every flip and BRRRR starts with.",
  });
}
