/**
 * Shared template for the per-calculator /tools/<slug>/opengraph-image.tsx
 * dynamic OG cards, on the Newsprint frame (lib/og/newsprint.tsx). Each tool
 * wrapper passes its config and exports the next/og ImageResponse to satisfy
 * the Next.js convention.
 *
 * Constraints (CLAUDE.md §3.6): the next/og JSX subset only, no Tailwind, no
 * server-only imports, and a card that always renders (fonts fall back to
 * next/og's sans; a render error returns the plain frame).
 *
 * Layout: the wordmark over a heavy rule with "Tools · <label>", the tool's
 * short facts as 2px chips, the tool name in the display voice, the tagline,
 * and the tools URL in DM Mono over a soft rule.
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

export type ToolOgConfig = {
  /** Tool name as it appears in the headline (e.g. "Cap rate calculator"). */
  name: string;
  /** 1-sentence tagline that fits under the headline. */
  tagline: string;
  /** Section label shown in the top-right corner (e.g. "Free tool"). */
  sectionLabel?: string;
  /** 3-4 short facts shown as chips above the headline. */
  pills?: string[];
  /** Bottom footer text — typically the route or a category list. */
  footerLeft?: string;
};

const URL_TEXT = "usetruecap.com/tools";

export async function renderToolOgImage(config: ToolOgConfig): Promise<ImageResponse> {
  const {
    name,
    tagline,
    sectionLabel = "Free tool",
    pills = ["Live data", "No signup", "60 seconds"],
    footerLeft = "Free real estate calculators",
  } = config;
  const label = `Tools · ${sectionLabel}`;
  const fonts = await loadNewsprintFonts({
    display: `TrueCap. ${name}`,
    text: `${label} ${pills.join(" ")} ${tagline} ${footerLeft}`,
    mono: URL_TEXT,
  });
  const headlineSize = name.length > 34 ? 72 : 84;
  try {
    return new ImageResponse(
      (
        <NewsprintFrame label={label} footerLeft={footerLeft} footerRight={URL_TEXT}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1 }}>
            {pills.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 26 }}>
                {pills.map((pill) => (
                  <div
                    key={pill}
                    style={{
                      display: "flex",
                      padding: "6px 12px",
                      border: `1px solid ${NEWSPRINT.rule}`,
                      borderRadius: 2,
                      fontSize: 22,
                      color: NEWSPRINT.ink2,
                    }}
                  >
                    {pill}
                  </div>
                ))}
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                fontFamily: ogFamily("display"),
                fontSize: headlineSize,
                lineHeight: 1.02,
                letterSpacing: "-0.015em",
                maxWidth: 1072,
              }}
            >
              {name}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 24,
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
    return new ImageResponse(<NewsprintFrame label={label}>{null}</NewsprintFrame>, { ...OG_SIZE, fonts });
  }
}
