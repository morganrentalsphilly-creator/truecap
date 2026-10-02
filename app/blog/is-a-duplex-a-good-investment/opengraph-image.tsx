/**
 * Social card for /blog/is-a-duplex-a-good-investment, on the shared blog template
 * (lib/og/blog-og-template.tsx, the Newsprint frame). Next serves it as the
 * post's og:image and twitter:image because the page's metadata sets no
 * images of its own.
 *
 * Every line restates the post as it reads today. When the post's title,
 * figures or sections change, change this card in the same commit
 * (lib/__tests__/blog-social-card-truth.test.ts checks the figures).
 */

import { renderBlogOgImage, OG_SIZE } from "@/lib/og/blog-og-template";

export const alt = "Is a duplex a good investment? — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Strategy",
    tag: "Duplex",
    title: "Is a duplex a good investment? The same $400,000 building, underwritten as a rental and as a house hack",
    subline: "Cash needed: $138,140 as a rental, $58,129 owner-occupied",
  });
}
