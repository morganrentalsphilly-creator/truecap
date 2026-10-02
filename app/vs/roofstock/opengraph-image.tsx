/**
 * Social card for /vs/roofstock. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The competitor rows on /vs/roofstock wait on a decision (report row P1-31),
 * so this card says only what TrueCap does.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Roofstock";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Roofstock",
    tagline:
      "TrueCap models a potential rental purchase from assumptions you can inspect and replace.",
    slug: "roofstock",
  });
}
