/**
 * Social card for /blog/2-percent-rule-vs-1-percent-rule, on the shared blog template
 * (lib/og/blog-og-template.tsx, the Newsprint frame). Next serves it as the
 * post's og:image and twitter:image because the page's metadata sets no
 * images of its own.
 *
 * Every line restates the post as it reads today. When the post's title,
 * figures or sections change, change this card in the same commit
 * (lib/__tests__/blog-social-card-truth.test.ts checks the figures).
 */

import { renderBlogOgImage, OG_SIZE } from "@/lib/og/blog-og-template";

export const alt = "2% rule vs 1% rule for rental property — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Screening",
    tag: "2% vs 1% rule",
    title: "2% rule vs 1% rule: which rental screen actually applies in 2026?",
    subline: "GRM and cap rate · worked $250,000 and $75,000 deals",
  });
}
