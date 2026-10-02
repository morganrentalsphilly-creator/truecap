/**
 * Social card for /blog/capex-maintenance-reserves-rental-property, on the shared blog template
 * (lib/og/blog-og-template.tsx, the Newsprint frame). Next serves it as the
 * post's og:image and twitter:image because the page's metadata sets no
 * images of its own.
 *
 * Every line restates the post as it reads today. When the post's title,
 * figures or sections change, change this card in the same commit
 * (lib/__tests__/blog-social-card-truth.test.ts checks the figures).
 */

import { renderBlogOgImage, OG_SIZE } from "@/lib/og/blog-og-template";

export const alt = "CapEx and maintenance reserves for rentals — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBlogOgImage({
    section: "Underwriting",
    tag: "CapEx",
    title: "CapEx and maintenance reserves: how much to actually budget for a rental (2026)",
    subline: "Component lifespans · reserve math · NOI and DSCR impact",
  });
}
