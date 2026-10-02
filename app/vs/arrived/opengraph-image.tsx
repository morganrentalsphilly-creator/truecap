/**
 * Social card for /vs/arrived. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The line restates the page's lede and its Open Graph description: what
 * Arrived sells (checked against arrived.com on 2026-10-02) and what TrueCap
 * does. It carries no minimum, fee or return figure.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Arrived";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Arrived",
    tagline:
      "Arrived sells shares of rental homes and of its funds. TrueCap underwrites whole rental properties you buy and own directly, from assumptions you can edit.",
    slug: "arrived",
  });
}
