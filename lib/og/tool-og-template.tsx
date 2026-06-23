/**
 * Shared template for the per-tool dynamic OG images.
 *
 * Why this exists: every /tools/<slug>/opengraph-image.tsx needs to
 * export the next/og ImageResponse to satisfy the Next.js convention.
 * Without this helper each of 9 files would be 100+ lines of nearly-
 * identical JSX. With it, each is ~15 lines.
 *
 * The helper RETURNS the ImageResponse directly so the per-tool file
 * is the smallest possible wrapper.
 *
 * Constraints from next/og:
 *   - JSX subset (basic divs + inline styles + text)
 *   - No Tailwind classes
 *   - No custom fonts unless we fetch them in the handler
 *
 * Design parity with the blog OG image template — same brand bar,
 * same typography, same usetruecap.com footer line.
 */

import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 } as const;

const BRAND_BLUE = "#0070c4";
const TEXT_INK = "#0F172A";
const TEXT_SUB = "#475569";

export type ToolOgConfig = {
  /** Tool name as it appears in the headline (e.g. "Cap rate calculator"). */
  name: string;
  /** 1-sentence tagline that fits under the headline. */
  tagline: string;
  /** Section label shown in the top-right corner (e.g. "Free tool"). */
  sectionLabel?: string;
  /** 3-4 short pills above the headline (e.g. ["Live data", "No signup", "60 seconds"]). */
  pills?: string[];
  /** Bottom footer text — typically the route or a category list. */
  footerLeft?: string;
};

export function renderToolOgImage(config: ToolOgConfig): ImageResponse {
  const {
    name,
    tagline,
    sectionLabel = "Free tool",
    pills = ["Live data", "No signup", "60 seconds"],
    footerLeft = "Free real estate calculators",
  } = config;

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
            Tools · {sectionLabel}
          </div>
        </div>

        {/* feature pills row */}
        <div
          style={{
            padding: "44px 64px 0 64px",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {pills.map((p) => (
            <div
              key={p}
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
              {p}
            </div>
          ))}
        </div>

        {/* headline */}
        <div style={{ padding: "30px 64px 0 64px", display: "flex" }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              maxWidth: 1072,
              display: "flex",
            }}
          >
            {name}
          </div>
        </div>

        {/* tagline */}
        <div style={{ padding: "22px 64px 0 64px", display: "flex" }}>
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
          <div style={{ display: "flex" }}>{footerLeft}</div>
          <div
            style={{
              fontWeight: 700,
              color: BRAND_BLUE,
              display: "flex",
            }}
          >
            usetruecap.com/tools
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
