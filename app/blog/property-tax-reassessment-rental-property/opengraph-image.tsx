/**
 * Dynamic OG image for the "property tax reassessment" post. Same design
 * language as the other anchor posts.
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Property tax reassessment for rental property — TrueCap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND_BLUE = "#0070c4";
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
            Blog · Underwriting
          </div>
        </div>

        <div style={{ padding: "48px 64px 0 64px", display: "flex" }}>
          <div
            style={{
              background: BRAND_BLUE,
              color: "#FFFFFF",
              fontSize: 22,
              fontWeight: 800,
              padding: "12px 22px",
              borderRadius: 999,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Underwriting accuracy
          </div>
        </div>

        <div style={{ padding: "26px 64px 0 64px", display: "flex" }}>
          <div
            style={{
              fontSize: 62,
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: "-0.025em",
              maxWidth: 1072,
              display: "flex",
            }}
          >
            The tax bill on the listing is not your tax bill
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
            Reassessment on sale · the real number · what it does to DSCR
          </div>
          <div style={{ fontWeight: 700, color: BRAND_BLUE, display: "flex" }}>
            usetruecap.com/blog
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
