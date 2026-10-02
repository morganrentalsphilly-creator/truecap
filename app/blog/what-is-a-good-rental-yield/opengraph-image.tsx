/**
 * Social card for /blog/what-is-a-good-rental-yield, on the shared blog template
 * (lib/og/blog-og-template.tsx, the Newsprint frame). Next serves it as the
 * post's og:image and twitter:image because the page's metadata sets no
 * images of its own.
 *
 * Every line restates the post as it reads today. When the post's title,
 * figures or sections change, change this card in the same commit
 * (lib/__tests__/blog-social-card-truth.test.ts checks the figures).
 */

import { renderBlogOgImage, OG_SIZE } from "@/lib/og/blog-og-template";

export const alt = "What is a good rental yield? A consistent comparison method";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Metrics",
    tag: "Rental yield",
    title: "What is a good rental yield? A consistent comparison method",
    subline: "Gross yield · net yield · a verification checklist",
  });
}
