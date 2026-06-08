/**
 * Dynamic OG image for /vs/appfolio. Auto-detected by Next.js App Router
 * convention; overrides any images: [...] declared in the route's
 * metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs AppFolio — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "AppFolio",
    tagline:
      "AppFolio is enterprise PM software (1000+ units). TrueCap is solo-investor underwriting (1-30 doors). Different worlds.",
    slug: "appfolio",
  });
}
