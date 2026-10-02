/**
 * Social card for /vs/roofstock. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The line restates the page and its Open Graph description: Roofstock's
 * "Explore Properties" link opens Stessa's marketplace, titled "Investment
 * Properties Powered by Roofstock" (roofstock.com and stessa.com, rendered
 * 2026-10-02; report row P1-31).
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Roofstock";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Roofstock",
    tagline:
      "Roofstock's property listings now open on Stessa's marketplace. TrueCap models the purchase from assumptions you can inspect and replace.",
    slug: "roofstock",
  });
}
