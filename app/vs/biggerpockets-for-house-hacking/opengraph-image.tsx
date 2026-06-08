/** Dynamic OG image for /vs/biggerpockets-for-house-hacking. Template at lib/og/vs-og-template.tsx. */
import { renderVsOgImage, OG_SIZE } from "@/lib/og/vs-og-template";

export const runtime = "edge";
export const alt = "TrueCap vs BiggerPockets (House Hack) — honest comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderVsOgImage({
    competitor: "BiggerPockets (House Hack)",
    tagline:
      "BiggerPockets vs TrueCap for house hackers — owner-occupant unit modeling, FHA, effective rent saved.",
    slug: "biggerpockets-for-house-hacking",
  });
}
