/**
 * Social card for /blog/break-even-occupancy-rental-property, on the shared blog template
 * (lib/og/blog-og-template.tsx, the Newsprint frame). Next serves it as the
 * post's og:image and twitter:image because the page's metadata sets no
 * images of its own.
 *
 * Every line restates the post as it reads today. When the post's title,
 * figures or sections change, change this card in the same commit
 * (lib/__tests__/blog-social-card-truth.test.ts checks the figures).
 */

import { renderBlogOgImage, OG_SIZE } from "@/lib/og/blog-og-template";

export const alt = "Break-even occupancy for rental property — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Underwriting",
    tag: "Margin of safety",
    title: "Break-even occupancy: how much vacancy a rental can survive (2026)",
    subline: "The formula · break-even rent · the DSCR 1.0 line",
  });
}
