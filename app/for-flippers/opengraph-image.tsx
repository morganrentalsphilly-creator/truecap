/**
 * Dynamic OG image for /for-flippers: the page's own H1 and hero subhead on the
 * shared persona card (lib/og/persona-og-template.tsx).
 */

import { renderPersonaOgImage, OG_SIZE } from "@/lib/og/persona-og-template";

export const alt = "TrueCap for fix-and-flippers";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderPersonaOgImage({
    label: "For fix-and-flippers",
    headline: "Build the inputs before you trust a project return.",
    subhead: "TrueCap currently offers separate rehab, ARV, and 70% rule tools.",
    path: "/for-flippers",
  });
}
