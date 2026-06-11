/**
 * Dynamic OG image for the /for-agents persona landing page.
 * Mirrors the design language of the blog post OG images.
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TrueCap for real estate agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND_BLUE = "#2563EB";
const TEXT_INK = "#0F172A";
const TEXT_SUB = "#475569";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#F8FAFC",
          fontFamily: "system-ui",
          color: TEXT_INK,
        }}
      >
        <div style={{ height: 12, background: BRAND_BLUE, display: "flex" }} />

        <div
          style={{
            padding: "40px 64px 0 64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.01em", display: "flex" }}>
            TrueCap<span style={{ color: BRAND_BLUE }}>.</span>
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: TEXT_SUB,
              display: "flex",
            }}
          >
            For real estate agents
          </div>
        </div>

        <div style={{ padding: "72px 64px 0 64px", display: "flex" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: "-0.025em",
              maxWidth: 1072,
              display: "flex",
            }}
          >
            Send clients a defensible analysis — at the showing
          </div>
        </div>

        <div style={{ padding: "22px 64px 0 64px", display: "flex" }}>
          <div
            style={{
              fontSize: 24,
              color: TEXT_SUB,
              lineHeight: 1.35,
              maxWidth: 1000,
              display: "flex",
            }}
          >
            Underwrite investor-client deals in 60 seconds. Share a branded
            read-only link instead of a spreadsheet. Free to start — no
            signup needed.
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            padding: "0 64px 40px 64px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: TEXT_SUB,
            fontSize: 20,
          }}
        >
          <div style={{ display: "flex" }}>
            Real estate investment analyzer
          </div>
          <div style={{ fontWeight: 700, color: BRAND_BLUE, display: "flex" }}>
            usetruecap.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
