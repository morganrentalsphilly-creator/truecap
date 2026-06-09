/**
 * Dynamic OG image for the metric-comparison blog post.
 * Mirrors the design language of the first post's OG image.
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Cap rate vs cash-on-cash vs DSCR — TrueCap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND_BLUE = "#2563EB";
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
            Blog · Comparison
          </div>
        </div>

        {/* Metric pills row */}
        <div style={{ padding: "40px 64px 0 64px", display: "flex", gap: 14 }}>
          <MetricPill label="Cap rate" />
          <span
            style={{
              alignSelf: "center",
              fontSize: 24,
              color: TEXT_SUB,
              fontWeight: 700,
              display: "flex",
            }}
          >
            vs
          </span>
          <MetricPill label="Cash-on-cash" />
          <span
            style={{
              alignSelf: "center",
              fontSize: 24,
              color: TEXT_SUB,
              fontWeight: 700,
              display: "flex",
            }}
          >
            vs
          </span>
          <MetricPill label="DSCR" />
        </div>

        <div style={{ padding: "32px 64px 0 64px", display: "flex" }}>
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
            Which one actually matters?
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
            Three different metrics. Three different jobs. The plain-English
            guide to when each one matters, and the 2026 trap most investors
            walk into.
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
            usetruecap.com/blog
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

function MetricPill({ label }: { label: string }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `2px solid ${SUCCESS}`,
        color: TEXT_INK,
        fontSize: 22,
        fontWeight: 800,
        padding: "12px 22px",
        borderRadius: 14,
        display: "flex",
        boxShadow: "0 4px 16px rgba(15,23,42,0.06)",
      }}
    >
      {label}
    </div>
  );
}
