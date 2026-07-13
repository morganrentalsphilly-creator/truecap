/**
 * Dynamic OG image for /blog/how-truecap-verdict-engine-works. Auto-detected by the
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
export const alt = "How TrueCap's verdict engine decides Strong Buy vs Avoid — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Product",
    tag: "Verdict engine",
    title: "How TrueCap's verdict engine decides Strong Buy vs Avoid",
    subline: "The exact thresholds behind every verdict",
  });
}
