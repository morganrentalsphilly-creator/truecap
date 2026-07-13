/**
 * Dynamic OG image for /blog/rental-property-insurance. Auto-detected by the
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
export const alt = "Rental property insurance: landlord coverage and cost in 2026 — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Underwriting",
    tag: "Insurance",
    title: "Rental property insurance: landlord coverage and cost in 2026",
    subline: "DP-3 vs HO-3 · coverage · what it costs",
  });
}
