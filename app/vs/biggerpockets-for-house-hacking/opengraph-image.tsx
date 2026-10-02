/**
 * Social card for /vs/biggerpockets-for-house-hacking. The page sets no images of its own, so Next
 * serves this file as its og:image and twitter:image. Drawn by the shared
 * template, lib/og/vs-og-template.tsx.
 *
 * The tagline restates what /vs/biggerpockets-for-house-hacking and the /vs hub say today. When the
 * page changes a fact, change this line with it.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const alt = "TrueCap vs BiggerPockets for House Hacking";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "BiggerPockets (House Hack)",
    tagline:
      "BiggerPockets vs TrueCap for house hackers: owner-occupant unit modeling, FHA financing, net monthly cost.",
    slug: "biggerpockets-for-house-hacking",
  });
}
