/**
 * Social card for /for-investors: the page's own H1 and hero lede on the
 * shared persona card (lib/og/persona-og-template.tsx). Next serves this file
 * as the page's og:image and twitter:image because the page's metadata sets
 * no `images` (lib/__tests__/public-metadata-contract.test.ts). Before this
 * card the page shared /og/home, whose headline is the agent pitch.
 */

import { renderPersonaOgImage, OG_SIZE } from "@/lib/og/persona-og-template";

export const alt = "TrueCap for rental investors";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderPersonaOgImage({
    label: "For rental investors",
    headline: "Know the highest price that still meets your targets before you write the offer.",
    subhead: "Paste a listing. See whether the rental works at asking, whether it meets your Buy Box, the Offer Ceiling for your targets, and what could break the deal. Every assumption is labeled and yours to change.",
    path: "/for-investors",
  });
}
