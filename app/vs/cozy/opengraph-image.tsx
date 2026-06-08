/**
 * Dynamic OG image for /vs/cozy. Auto-detected by Next.js App Router
 * convention; overrides any images: [...] declared in the route's
 * metadata.
 *
 * Implementation lives in the shared template at
 * lib/og/vs-og-template.tsx.
 */

import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Cozy — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Cozy",
    tagline:
      "Cozy.co shut down in 2022. TrueCap underwrites deals; pair with TurboTenant for the ops Cozy used to do.",
    slug: "cozy",
  });
}
