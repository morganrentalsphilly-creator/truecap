/**
 * Dynamic OG image for /blog/best-free-rental-property-calculator-2026. Auto-detected by the
 * Next.js App Router convention; overrides the images: [...] fallback in
 * the route's metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/blog-og-template.tsx — this file is just the per-post config
 * wrapper so all blog OG images stay visually consistent. The title
 * string mirrors the post's own metadata title.
 */

import { renderBlogOgImage, OG_SIZE } from "@/lib/og/blog-og-template";

export const runtime = "edge";
export const alt = "Best free rental property calculator 2026: 5 tools that actually work for free — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Comparisons",
    tag: "Free tools",
    title: "Best free rental property calculator 2026: 5 tools that actually work for free",
    subline: "5 free calculators · what free actually gets you",
  });
}
