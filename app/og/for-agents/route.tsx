import { ImageResponse } from "next/og";
import { findProductShot } from "@/components/marketing/product-shot";
import {
  loadNewsprintFonts,
  NEWSPRINT,
  NewsprintFrame,
  OG_SIZE,
  ogFamily,
} from "@/lib/og/newsprint";

/**
 * GET /og/for-agents — the agent landing page's OG card: the agent headline
 * beside the REAL decision memo screenshot from the sample flow
 * (public/product/memo-desktop.png), the artifact an investor client
 * receives, shown as a printed page (a 1px rule, no radius, no shadow).
 * Degrades to the headline alone if the screenshot cannot be loaded, never to
 * a placeholder.
 *
 * A route handler rather than app/for-agents/opengraph-image.tsx so the
 * page's metadata can point og:image AND twitter:image at one URL (the file
 * convention only sets og:image, and the old card's copy had drifted from
 * the page).
 */

const HEADLINE = "Send your investor clients deals that already pencil.";
const SUBHEAD =
  "Screen a listing against each client's Buy Box, show their Offer Ceiling, and send a co-branded decision memo.";
const URL_TEXT = "usetruecap.com/for-agents";

export async function GET() {
  const shot = findProductShot("memo", "desktop");
  let shotSrc: string | null = null;
  if (shot) {
    try {
      const response = await fetch(new URL("../../../public/product/memo-desktop.png", import.meta.url));
      if (response.ok) {
        const bytes = await response.arrayBuffer();
        shotSrc = `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
      }
    } catch {
      shotSrc = null;
    }
  }
  const fonts = await loadNewsprintFonts({
    display: `TrueCap. ${HEADLINE}`,
    text: `For real estate agents ${SUBHEAD} Free first decision. No card.`,
    mono: URL_TEXT,
  });

  return new ImageResponse(
    (
      <NewsprintFrame
        label="For real estate agents"
        footerLeft="Free first decision. No card."
        footerRight={URL_TEXT}
      >
        <div style={{ display: "flex", flexGrow: 1, gap: 48, alignItems: shotSrc ? "flex-start" : "center", paddingTop: shotSrc ? 32 : 0, overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", width: shotSrc ? 470 : 1072 }}>
            <div
              style={{
                display: "flex",
                fontFamily: ogFamily("display"),
                fontSize: shotSrc ? 56 : 76,
                lineHeight: 1.02,
                letterSpacing: "-0.012em",
              }}
            >
              {HEADLINE}
            </div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 26, lineHeight: 1.35, color: NEWSPRINT.ink2 }}>
              {SUBHEAD}
            </div>
          </div>
          {shotSrc ? (
            <div
              style={{
                display: "flex",
                width: 560,
                height: 420,
                overflow: "hidden",
                border: `1px solid ${NEWSPRINT.rule}`,
                background: NEWSPRINT.raised,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shotSrc} alt="" width={560} style={{ width: 560, height: "auto" }} />
            </div>
          ) : null}
        </div>
      </NewsprintFrame>
    ),
    { ...OG_SIZE, fonts, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
