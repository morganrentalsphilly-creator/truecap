/**
 * Dynamic OG image for /blog/1-percent-rule-rental-property. Auto-detected by
 * the Next.js App Router convention; overrides the images: [...] fallback in
 * the route's metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/blog-og-template.tsx (the Newsprint frame) — this file is just the
 * per-post config wrapper so all blog OG images stay visually consistent. The
 * title string mirrors the post's own metadata title (SERP_TITLE).
 */

import { renderBlogOgImage, OG_SIZE } from "@/lib/og/blog-og-template";

export const alt = "The 1% rule for rental property — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Metrics",
    tag: "1% rule",
    title: "The 1% rule for rental property in 2026",
    subline: "Rent-to-price · GRM · break-even · cash-on-cash",
  });
}
