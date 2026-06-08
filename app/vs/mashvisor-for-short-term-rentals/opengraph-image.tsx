/** Dynamic OG image for /vs/mashvisor-for-short-term-rentals. Template at lib/og/vs-og-template.tsx. */
import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs Mashvisor (STR) — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "Mashvisor (STR)",
    tagline:
      "STR cut of TrueCap vs Mashvisor — market scoring vs per-deal underwriting.",
    slug: "mashvisor-for-short-term-rentals",
  });
}
