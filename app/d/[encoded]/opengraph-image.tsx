/**
 * Privacy-safe social card for legacy encoded share links.
 *
 * The URL itself contains the old analysis snapshot. Social crawlers must not
 * decode or copy its address, price, metrics, or verdict into their long-lived
 * preview caches. New shares use opaque /s tokens; this generic image exists
 * only so historical /d links continue to unfurl without disclosing the deal.
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Rental analysis shared privately via TrueCap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B1220",
          color: "#FFFFFF",
          fontFamily: "system-ui",
          padding: "64px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 800, opacity: 0.8 }}>
          TrueCap<span style={{ color: "#0B66C3" }}>.</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 58, fontWeight: 850 }}>
          Private rental decision
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 24, color: "#CBD5E1" }}>
          Open the link to view the shared analysis. Property details are not shown in previews.
        </div>
      </div>
    ),
    { ...size }
  );
}
