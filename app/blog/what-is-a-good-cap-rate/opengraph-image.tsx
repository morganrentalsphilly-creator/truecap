/**
 * Dynamic OG image for the "what's a good cap rate" post.
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "What's a good cap rate for rental property in 2026 — TrueCap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND_BLUE = "#0070c4";
const TEXT_INK = "#0F172A";
const TEXT_SUB = "#475569";
const SUCCESS = "#16A34A";

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
            Blog · Benchmarks
          </div>
        </div>

        {/* Range pills row */}
        <div style={{ padding: "44px 64px 0 64px", display: "flex", gap: 14, flexWrap: "wrap" }}>
          <RangePill range="6-10%" label="Cash-flow" color={SUCCESS} />
          <RangePill range="5-7%" label="Balanced" color={BRAND_BLUE} />
          <RangePill range="3-5%" label="Appreciation" color={TEXT_SUB} />
        </div>

        <div style={{ padding: "32px 64px 0 64px", display: "flex" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              maxWidth: 1072,
              display: "flex",
            }}
          >
            What&apos;s a good cap rate in 2026?
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
            Market-by-market benchmarks. Plus the negative-leverage trap
            most investors don&apos;t see coming.
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
            Cap rate vs Treasury · vs borrowing cost · by market type
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

function RangePill({ range, label, color }: { range: string; label: string; color: string }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `2px solid ${color}`,
        display: "flex",
        flexDirection: "column",
        padding: "10px 18px",
        borderRadius: 14,
        boxShadow: "0 4px 16px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800, color, display: "flex" }}>{range}</div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: TEXT_SUB,
          display: "flex",
        }}
      >
        {label}
      </div>
    </div>
  );
}
