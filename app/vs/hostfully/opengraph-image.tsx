/**
 * Social card for /vs/hostfully. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/hostfully and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Hostfully";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Hostfully",
    tagline:
      "Hostfully manages STRs after closing. TrueCap underwrites the deal before. Different STR lifecycle stages.",
    slug: "hostfully",
  });
}
