/**
 * Social card for /vs/baselane. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The line restates the page's lede and its Open Graph description: what
 * Baselane is (checked against baselane.com on 2026-10-02) and what TrueCap
 * does. It carries no price, limit or coverage figure.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Baselane";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Baselane",
    tagline:
      "Baselane is banking and bookkeeping for rentals you own. TrueCap is the pre-purchase underwrite: cash flow, cap rate and DSCR before you offer.",
    slug: "baselane",
  });
}
