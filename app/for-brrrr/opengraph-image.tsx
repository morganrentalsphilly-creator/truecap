/**
 * Dynamic OG image for /for-brrrr: the page's own H1 and hero subhead on the
 * shared persona card (lib/og/persona-og-template.tsx).
 */

import { renderPersonaOgImage, OG_SIZE } from "@/lib/og/persona-og-template";

export const alt = "TrueCap for BRRRR operators";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderPersonaOgImage({
    label: "For BRRRR operators",
    headline: "Research each stage without pretending it is one finished model.",
    subhead: "TrueCap's analyzer covers rehab budget, ARV, DSCR, and stabilized rental returns as separate steps.",
    path: "/for-brrrr",
  });
}
