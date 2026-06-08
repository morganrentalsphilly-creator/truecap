/**
 * Dynamic OG image for /vs/dealmachine. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs DealMachine — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "DealMachine",
    tagline:
      "DealMachine is mobile lead generation. TrueCap underwrites the deals it surfaces.",
    slug: "dealmachine",
  });
}
