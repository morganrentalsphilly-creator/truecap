/**
 * Dynamic OG image for /blog/hostfully-vs-hostaway-vs-guesty. Auto-detected by the
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
export const alt = "Hostfully vs Hostaway vs Guesty: which STR PMS wins in 2026? — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Comparisons",
    tag: "STR PMS",
    title: "Hostfully vs Hostaway vs Guesty: which STR PMS wins in 2026?",
    subline: "Pricing · channel sync · automation compared",
  });
}
