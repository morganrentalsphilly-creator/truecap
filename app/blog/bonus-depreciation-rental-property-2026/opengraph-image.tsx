/**
 * Dynamic OG image for /blog/bonus-depreciation-rental-property-2026. Auto-detected by the
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
export const alt = "Bonus depreciation on rental property in 2026: what changed, what's left, and how to use it — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Tax",
    tag: "Depreciation",
    title: "Bonus depreciation on rental property in 2026: what changed, what's left, and how to use it",
    subline: "Cost segregation · phase-down schedule · 2026 rules",
  });
}
