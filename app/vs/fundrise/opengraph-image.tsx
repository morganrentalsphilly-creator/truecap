/**
 * Social card for /vs/fundrise. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The line restates the page's lede and its Open Graph description: what
 * Fundrise offers, in the words of fundrise.com as rendered on 2026-10-02,
 * and what TrueCap does. It carries no return, fee or minimum figure and
 * does not call Fundrise a REIT.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Fundrise";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Fundrise",
    tagline:
      "Fundrise offers funds that hold private real estate, private credit and venture capital. TrueCap underwrites whole rental properties you buy and own directly.",
    slug: "fundrise",
  });
}
