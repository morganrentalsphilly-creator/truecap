/**
 * Social card for /blog/gross-rent-multiplier-explained, on the shared blog template
 * (lib/og/blog-og-template.tsx, the Newsprint frame). Next serves it as the
 * post's og:image and twitter:image because the page's metadata sets no
 * images of its own.
 *
 * Every line restates the post as it reads today. When the post's title,
 * figures or sections change, change this card in the same commit
 * (lib/__tests__/blog-social-card-truth.test.ts checks the figures).
 */

import { renderBlogOgImage, OG_SIZE } from "@/lib/og/blog-og-template";

export const alt = "Gross rent multiplier (GRM) explained — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Metrics",
    tag: "GRM",
    title: "Gross rent multiplier (GRM) explained: how to screen rentals fast (2026)",
    subline: "Price ÷ annual gross rent · GRM vs cap rate · the 1% rule",
  });
}
