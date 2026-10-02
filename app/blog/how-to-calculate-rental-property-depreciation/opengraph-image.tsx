/**
 * Social card for /blog/how-to-calculate-rental-property-depreciation, on the shared blog template
 * (lib/og/blog-og-template.tsx, the Newsprint frame). Next serves it as the
 * post's og:image and twitter:image because the page's metadata sets no
 * images of its own.
 *
 * Every line restates the post as it reads today. When the post's title,
 * figures or sections change, change this card in the same commit
 * (lib/__tests__/blog-social-card-truth.test.ts checks the figures).
 */

import { renderBlogOgImage, OG_SIZE } from "@/lib/og/blog-og-template";

export const alt = "How to calculate rental property depreciation — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "How-to",
    tag: "Depreciation",
    title: "How to calculate depreciation on a rental property: the 27.5-year math, step by step (2026)",
    subline: "27.5-year schedule · land split · mid-month convention",
  });
}
