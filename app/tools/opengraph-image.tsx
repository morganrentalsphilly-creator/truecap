/**
 * Dynamic OG image for the /tools landing page.
 * Uses the shared template with a "collection" framing.
 */

import { renderToolOgImage, OG_SIZE } from "@/lib/og/tool-og-template";
import { CALCULATOR_COUNT } from "@/lib/calculator-registry";

export const runtime = "edge";
export const alt = "Free real estate calculators — TrueCap";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage({
    name: "Free real estate calculators",
    tagline: `${CALCULATOR_COUNT} single-purpose educational tools — mortgage, GRM, vacancy, closing costs, rehab, ARV, rent-to-price rules, and more. No signup.`,
    sectionLabel: "Collection",
    pills: [`${CALCULATOR_COUNT} calculators`, "No signup", "Free forever"],
    footerLeft: "Mortgage · GRM · vacancy · rehab · ARV · rent-to-price",
  });
}
