import { ImageResponse } from "next/og";
import { findProductShot } from "@/components/marketing/product-shot";

/**
 * GET /og/for-agents — the agent landing page's OG card: the wordmark, the
 * agent headline, and the REAL decision memo screenshot from the sample flow
 * (public/product/memo-desktop.png) — the artifact an investor client
 * receives. Mirrors app/og/home/route.tsx; degrades to wordmark + headline if
 * the screenshot cannot be loaded, never to a placeholder.
 *
 * A route handler rather than app/for-agents/opengraph-image.tsx so the
 * page's metadata can point og:image AND twitter:image at one URL (the file
 * convention only sets og:image, and the old card's copy had drifted from
 * the page).
 */

const size = { width: 1200, height: 630 };

const BLUE = "#0070c4";

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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>
              TrueCap<span style={{ color: BLUE }}>.</span>
            </div>
            <div style={{ display: "flex", fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#475569" }}>
              For real estate agents
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: shotSrc ? 44 : 64, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>
              Send your investor clients deals that already pencil.
            </div>
            <div style={{ marginTop: 20, fontSize: shotSrc ? 20 : 26, color: "#475569", lineHeight: 1.35 }}>
              Screen a listing against each client&apos;s Buy Box, show their Offer Ceiling, and send a co-branded decision memo.
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 18, color: BLUE, fontWeight: 700 }}>
            usetruecap.com/for-agents · Free first decision. No card.
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
