/**
 * Social card for /vs/baselane. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The competitor rows on /vs/baselane wait on a decision (report row P0-05),
 * so this card says only what TrueCap does.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Baselane";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Baselane",
    tagline:
      "TrueCap is the pre-purchase underwrite: cash flow, cap rate, cash-on-cash return and DSCR before you make an offer.",
    slug: "baselane",
  });
}
