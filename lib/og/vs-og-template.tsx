/**
 * Shared template for the per-competitor /vs/<slug>/opengraph-image.tsx
 * dynamic OG cards, on the Newsprint frame (lib/og/newsprint.tsx).
 *
 * Constraints (CLAUDE.md §3.6): the next/og JSX subset only, no Tailwind, no
 * server-only imports, and a card that always renders: the faces load per
 * card and fall back to next/og's sans, and a render error returns the plain
 * frame.
 *
 * Layout: the wordmark over a heavy rule with "Comparison" beside it,
 * "TrueCap vs <Competitor>" in the display voice, the positioning tagline
 * under it, and the page URL in DM Mono over a soft rule.
 */

import { ImageResponse } from "next/og";
import {
  loadNewsprintFonts,
  NEWSPRINT,
  NewsprintFrame,
  OG_SIZE,
  ogFamily,
} from "@/lib/og/newsprint";

export { OG_SIZE };

export type VsOgConfig = {
  /** Competitor name as it appears in the headline (e.g. "DealCheck"). */
  competitor: string;
  /** 1-sentence positioning tagline shown under the headline. */
  tagline: string;
  /** Path slug used for the footer-right URL (e.g. "dealcheck"). */
  slug: string;
};

export async function renderVsOgImage(config: VsOgConfig): Promise<ImageResponse> {
  const { competitor, tagline, slug } = config;
  const url = `usetruecap.com/vs/${slug}`;
  const fonts = await loadNewsprintFonts({
    display: `TrueCap. vs ${competitor}`,
    text: `${tagline} Comparison Honest comparison`,
    mono: url,
  });
  try {
    return new ImageResponse(
      (
        <NewsprintFrame label="Comparison" footerLeft="Honest comparison" footerRight={url}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flexGrow: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                fontFamily: ogFamily("display"),
                fontSize: 92,
                lineHeight: 1.02,
                letterSpacing: "-0.015em",
              }}
            >
              <span style={{ display: "flex" }}>TrueCap</span>
              <span style={{ display: "flex", color: NEWSPRINT.ink2, margin: "0 24px" }}>vs</span>
              <span style={{ display: "flex" }}>{competitor}</span>
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 28,
                maxWidth: 1000,
                fontSize: 30,
                lineHeight: 1.35,
                color: NEWSPRINT.ink2,
              }}
            >
              {tagline}
            </div>
          </div>
        </NewsprintFrame>
      ),
      { ...OG_SIZE, fonts },
    );
  } catch {
    return new ImageResponse(<NewsprintFrame label="Comparison">{null}</NewsprintFrame>, {
      ...OG_SIZE,
      fonts,
    });
  }
}
