/**
 * Social card for /blog/dealcheck-vs-stessa-vs-truecap, on the shared blog template
 * (lib/og/blog-og-template.tsx, the Newsprint frame). Next serves it as the
 * post's og:image and twitter:image because the page's metadata sets no
 * images of its own.
 *
 * Every line restates the post as it reads today. When the post's title,
 * figures or sections change, change this card in the same commit
 * (lib/__tests__/blog-social-card-truth.test.ts checks the figures).
 */

import { renderBlogOgImage, OG_SIZE } from "@/lib/og/blog-og-template";

export const alt = "DealCheck vs Stessa vs TrueCap: which one do you actually need? — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Comparisons",
    tag: "3-way comparison",
    title: "DealCheck vs Stessa vs TrueCap: which one do you actually need?",
    subline: "Acquisition depth and operations breadth",
  });
}
