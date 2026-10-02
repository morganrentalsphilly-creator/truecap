/**
 * Social card for /vs/cozy. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The line restates the page: Cozy's own homepage said by August 2021 that
 * Cozy had moved to Apartments.com (report row P1-18). The year is written
 * mid-sentence because vs-social-card-guards reads a number with the full
 * stop that follows it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Cozy";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Cozy",
    tagline:
      "In mid-2021 Cozy moved to Apartments.com. TrueCap underwrites a rental before you buy it: cash flow, cap rate, cash-on-cash return and DSCR.",
    slug: "cozy",
  });
}
