/**
 * Dynamic OG image for /vs/quickbooks-rental. Implementation in lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs QuickBooks — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "QuickBooks",
    tagline:
      "QuickBooks is general accounting many landlords default to. TrueCap is pre-purchase underwriting. Different stages.",
    slug: "quickbooks-rental",
  });
}
