/**
 * Shared template for per-post /blog/<slug>/opengraph-image.tsx dynamic
 * OG cards.
 *
 * Same constraints + visual conventions as lib/og/tool-og-template.tsx
 * and lib/og/vs-og-template.tsx:
 *   - edge runtime
 *   - next/og JSX subset (basic divs + inline styles + text)
 *   - No Tailwind, no custom fonts, no server-only imports
 *
 * Layout matches the hand-built anchor-post OG images (e.g.
 * app/blog/how-to-refinance-a-rental-property/opengraph-image.tsx):
 * brand bar, "Blog · <Section>" header label, a topic pill, the post
 * title as the headline, and a footer subline. Wrappers pass the title
 * string from the post's own metadata so the card and the page never
 * drift apart.
 *
 * Fail-safe (CLAUDE.md §3.6): rendering is wrapped in try/catch and
 * falls back to a minimal branded card — a bad config string must never
 * surface a 500 on a social crawler fetch.
 */

import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 } as const;

const BRAND_BLUE = "#0070c4";
const TEXT_INK = "#0F172A";
const TEXT_SUB = "#475569";

export type BlogOgConfig = {
  /** Header label after "Blog · " (e.g. "Financing", "Comparisons"). */
  section: string;
  /** Short uppercase topic pill above the headline (e.g. "DSCR"). */
  tag: string;
  /** Post title — pass the page's metadata title verbatim. */
  title: string;
  /** Short footer-left subline (the "what's inside" teaser). */
  subline: string;
};

/** Minimal branded card returned when the main render throws. */
function fallbackImage(): ImageResponse {
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
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 64px",
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.02em", display: "flex" }}>
            TrueCap<span style={{ color: BRAND_BLUE }}>.</span>
          </div>
          <div style={{ fontSize: 28, color: TEXT_SUB, marginTop: 16, display: "flex" }}>
            The rental property investing blog
          </div>
        </div>
        <div
          style={{
            padding: "0 64px 40px 64px",
            display: "flex",
            justifyContent: "flex-end",
            fontWeight: 700,
            color: BRAND_BLUE,
            fontSize: 20,
          }}
        >
          usetruecap.com/blog
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}

export function renderBlogOgImage(config: BlogOgConfig): ImageResponse {
  try {
    const { section, tag, title, subline } = config;

    // Long titles step down so they still fit the 1072px column at ~3 lines.
    const headlineSize = title.length > 84 ? 52 : title.length > 64 ? 58 : 64;

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
              {`Blog · ${section}`}
            </div>
          </div>

          {/* topic pill */}
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
              {tag}
            </div>
          </div>

          {/* headline — the post's own metadata title */}
          <div style={{ padding: "26px 64px 0 64px", display: "flex" }}>
            <div
              style={{
                fontSize: headlineSize,
                fontWeight: 800,
                lineHeight: 1.06,
                letterSpacing: "-0.025em",
                maxWidth: 1072,
                display: "flex",
              }}
            >
              {title}
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
            <div style={{ display: "flex" }}>{subline}</div>
            <div style={{ fontWeight: 700, color: BRAND_BLUE, display: "flex" }}>
              usetruecap.com/blog
            </div>
          </div>
        </div>
      ),
      { ...OG_SIZE }
    );
  } catch {
    return fallbackImage();
  }
}
