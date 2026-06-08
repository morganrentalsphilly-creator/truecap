/** Dynamic OG image for /vs/dealcheck-for-fix-and-flip. Template at lib/og/vs-og-template.tsx. */
import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs DealCheck (Flip) — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "DealCheck (Flip)",
    tagline:
      "Fix-and-flip cut of TrueCap vs DealCheck — ARV, rehab, holding costs, break-even ARV.",
    slug: "dealcheck-for-fix-and-flip",
  });
}
