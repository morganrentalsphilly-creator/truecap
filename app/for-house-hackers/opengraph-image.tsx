/**
 * Dynamic OG image for /for-house-hackers: the page's own H1 and hero subhead on the
 * shared persona card (lib/og/persona-og-template.tsx).
 */

import { renderPersonaOgImage, OG_SIZE } from "@/lib/og/persona-og-template";

export const alt = "TrueCap for house hackers";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderPersonaOgImage({
    label: "For house hackers",
    headline: "Live in one, rent the others. Do the math first.",
    subhead: "TrueCap handles the math that makes house hacks unique: owner-occupant break-even bands, FHA 3.5% down, MIP, your-unit subsidy, with a separate-scenario workflow for a later move-out.",
    path: "/for-house-hackers",
  });
}
