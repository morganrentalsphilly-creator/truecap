/**
 * Dynamic OG image for /vs/batchleads. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs BatchLeads — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "BatchLeads",
    tagline:
      "BatchLeads is lead gen + skip-tracing. TrueCap underwrites the deals. Different jobs.",
    slug: "batchleads",
  });
}
