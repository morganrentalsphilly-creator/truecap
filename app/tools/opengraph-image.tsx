/**
 * Dynamic OG image for the /tools landing page.
 * Uses the shared template with a "collection" framing.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";

export const runtime = "edge";
export const alt = "Free real estate calculators — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "Free real estate calculators",
    tagline: "9 single-purpose tools — cap rate, cash-on-cash, BRRRR, DSCR, NOI, mortgage, GRM, rehab, 1% rule. No signup.",
    sectionLabel: "Collection",
    pills: ["9 calculators", "No signup", "Free forever"],
    footerLeft: "Cap rate · CoC · DSCR · NOI · GRM · BRRRR · 1% rule",
  });
}
