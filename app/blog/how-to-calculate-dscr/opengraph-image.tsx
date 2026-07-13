/**
 * Dynamic OG image for /blog/how-to-calculate-dscr. Auto-detected by the
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
export const alt = "How to calculate DSCR (debt service coverage ratio) — 2026 guide — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "How-to",
    tag: "DSCR",
    title: "How to calculate DSCR (debt service coverage ratio) — 2026 guide",
    subline: "Formula · lender thresholds · worked examples",
  });
}
