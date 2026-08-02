/**
 * Dynamic OG image for the "How much money do you need to buy a rental
 * property?" post. Same design language as the other anchor posts.
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "How much money do you need to buy a rental property? — TrueCap";
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
            Blog · Financing
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
            How much cash to buy a rental?
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
            1.4x to 1.7x the down payment — not 20% plus a bit
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
            $150K / $300K / $500K worked · Reserves · The house-hack door
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
