/** Dynamic OG image for /vs/dealcheck-for-short-term-rentals. Template at lib/og/vs-og-template.tsx. */
import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs DealCheck (STR) — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "DealCheck (STR)",
    tagline:
      "STR cut of TrueCap vs DealCheck — ADR, seasonal occupancy, AirDNA, STR tax loophole.",
    slug: "dealcheck-for-short-term-rentals",
  });
}
