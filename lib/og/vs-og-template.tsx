/**
 * Shared template for the per-competitor /vs/<slug>/opengraph-image.tsx
 * dynamic OG cards.
 *
 * Same constraints + visual conventions as lib/og/tool-og-template.tsx:
 *   - edge runtime
 *   - next/og JSX subset (basic divs + inline styles + text)
 *   - No Tailwind, no custom fonts
 *
 * Visual difference vs tools: section label says "Comparison" and the
 * headline is split into two lines — "TrueCap vs <Competitor>" big on
 * top, the short positioning tagline below. This is the format
 * comparison-shoppers expect when scanning SERP cards.
 */

import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 } as const;

const BRAND_BLUE = "#2563EB";
const TEXT_INK = "#0F172A";
const TEXT_SUB = "#475569";

export type VsOgConfig = {
  /** Competitor name as it appears in the headline (e.g. "DealCheck"). */
  competitor: string;
  /** 1-sentence positioning tagline shown under the headline. */
  tagline: string;
  /** Path slug used for the footer-right URL (e.g. "dealcheck"). */
  slug: string;
};

export function renderVsOgImage(config: VsOgConfig): ImageResponse {
  const { competitor, tagline, slug } = config;

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
        {/* top accent bar */}
        <div style={{ height: 12, background: BRAND_BLUE, display: "flex" }} />

        {/* header row: brand + section label */}
        <div
          style={{
            padding: "40px 64px 0 64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              display: "flex",
            }}
          >
            Truecap<span style={{ color: BRAND_BLUE }}>.</span>
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
            Honest comparison
          </div>
        </div>

        {/* "vs" pill — small uppercase tag above the headline so the
            page identity reads instantly even at SERP thumbnail size. */}
        <div
          style={{
            padding: "44px 64px 0 64px",
            display: "flex",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: `1.5px solid ${BRAND_BLUE}33`,
              color: BRAND_BLUE,
              fontSize: 16,
              fontWeight: 700,
              padding: "8px 16px",
              borderRadius: 999,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Side-by-side
          </div>
        </div>

        {/* headline — "TrueCap vs <Competitor>" */}
        <div style={{ padding: "30px 64px 0 64px", display: "flex" }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              maxWidth: 1072,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "flex" }}>TrueCap</span>
            <span style={{ display: "flex", color: BRAND_BLUE, margin: "0 22px" }}>
              vs
            </span>
            <span style={{ display: "flex" }}>{competitor}</span>
          </div>
        </div>

        {/* tagline */}
        <div style={{ padding: "26px 64px 0 64px", display: "flex" }}>
          <div
            style={{
              fontSize: 26,
              color: TEXT_SUB,
              lineHeight: 1.35,
              maxWidth: 1000,
              display: "flex",
            }}
          >
            {tagline}
          </div>
        </div>

        {/* footer */}
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
            Honest comparison · No fluff
          </div>
          <div
            style={{
              fontWeight: 700,
              color: BRAND_BLUE,
              display: "flex",
            }}
          >
            usetruecap.com/vs/{slug}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
