/**
 * Social card for /vs/privy. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/privy and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs Privy";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Privy",
    tagline:
      "Privy is a real estate investment platform: deal sourcing and property analysis from MLS feeds and public records. TrueCap underwrites the deals Privy surfaces.",
    slug: "privy",
  });
}
