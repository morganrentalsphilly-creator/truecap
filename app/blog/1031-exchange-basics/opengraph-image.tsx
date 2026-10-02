/**
 * Social card for /blog/1031-exchange-basics, on the shared blog template
 * (lib/og/blog-og-template.tsx, the Newsprint frame). Next serves it as the
 * post's og:image and twitter:image because the page's metadata sets no
 * images of its own.
 *
 * Every line restates the post as it reads today. When the post's title,
 * figures or sections change, change this card in the same commit
 * (lib/__tests__/blog-social-card-truth.test.ts checks the figures).
 */

import { renderBlogOgImage, OG_SIZE } from "@/lib/og/blog-og-template";

export const alt = "1031 exchange basics for individual rental investors — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Tax",
    tag: "1031 exchange",
    title: "1031 exchange basics for individual rental investors",
    subline: "45-day and 180-day periods · QI safe harbor · like-kind · boot",
  });
}
