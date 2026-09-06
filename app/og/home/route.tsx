import { ImageResponse } from "next/og";
import { findProductShot } from "@/components/marketing/product-shot";

/**
 * GET /og/home — the homepage OG card: the wordmark, the headline, and the
 * REAL verdict screenshot from the sample flow (public/product/
 * verdict-desktop.png, produced by scripts/capture-screenshots.ts). If the
 * screenshot cannot be loaded the card degrades to wordmark + headline —
 * never a placeholder. /home.jpg stays the static fallback for surfaces
 * that do not use this route (Twitter card, other pages).
 *
 * A route handler rather than the app/opengraph-image file convention on
 * purpose: a root-level file image is inherited by every child segment and
 * would override the per-page OG images the tools, blog, and /vs pages set.
 */

export const runtime = "edge";
const size = { width: 1200, height: 630 };

const BLUE = "#0070c4";

export async function GET() {
  const shot = findProductShot("verdict", "desktop");
  let shotSrc: string | null = null;
  if (shot) {
    try {
      const response = await fetch(new URL("../../../public/product/verdict-desktop.png", import.meta.url));
      if (response.ok) {
        const bytes = await response.arrayBuffer();
        shotSrc = `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
      }
    } catch {
      shotSrc = null;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #eaf4fc 0%, #ffffff 55%)",
          fontFamily: "Helvetica, Arial, sans-serif",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: shotSrc ? 520 : 1200,
            padding: "56px 48px 48px 56px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", fontSize: 34, fontWeight: 800 }}>
            TrueCap<span style={{ color: BLUE }}>.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: shotSrc ? 44 : 64, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>
              Know your walk-away price before you make the offer.
            </div>
            <div style={{ marginTop: 20, fontSize: shotSrc ? 20 : 26, color: "#475569", lineHeight: 1.35 }}>
              Paste a listing. See the cash flow, DSCR, and the highest price that still hits your targets.
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 18, color: BLUE, fontWeight: 700 }}>
            usetruecap.com · Free. No account.
          </div>
        </div>
        {shotSrc ? (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              width: 680,
              height: 630,
              overflow: "hidden",
              paddingTop: 40,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 660,
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid #dbe4ee",
                boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
                background: "#fff",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shotSrc} alt="" width={660} style={{ width: 660, height: "auto" }} />
            </div>
          </div>
        ) : null}
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
