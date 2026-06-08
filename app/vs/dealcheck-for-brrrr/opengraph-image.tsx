/** Dynamic OG image for /vs/dealcheck-for-brrrr. Template at lib/og/vs-og-template.tsx. */
import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs DealCheck (BRRRR) — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "DealCheck (BRRRR)",
    tagline:
      "DealCheck vs TrueCap for BRRRR investors — cash-out refi, ARV modeling, infinite-return detection.",
    slug: "dealcheck-for-brrrr",
  });
}
