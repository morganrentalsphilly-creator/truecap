/**
 * Shared template for the persona pages' opengraph-image.tsx cards
 * (/for-investors, /for-buy-and-hold, /for-house-hackers, /for-brrrr,
 * /for-flippers), on the
 * Newsprint frame (lib/og/newsprint.tsx). Each wrapper passes its page's own
 * H1 and hero subhead, so the card cannot drift from the page (the old cards
 * had: one still advertised a retired capability, others said "released").
 *
 * Constraints (CLAUDE.md §3.6): the next/og JSX subset only, no Tailwind, no
 * server-only imports, and a card that always renders (fonts fall back to
 * next/og's sans; a render error returns the plain frame).
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

export type PersonaOgConfig = {
  /** Sentence-case audience label beside the wordmark ("For house hackers"). */
  label: string;
  /** The page's H1, verbatim. */
  headline: string;
  /** The page's hero subhead, verbatim or its first sentence. */
  subhead: string;
  /** The page path for the footer URL ("/for-house-hackers"). */
  path: string;
};

export async function renderPersonaOgImage(config: PersonaOgConfig): Promise<ImageResponse> {
  const { label, headline, subhead, path } = config;
  const url = `usetruecap.com${path}`;
  const fonts = await loadNewsprintFonts({
    display: `TrueCap. ${headline}`,
    text: `${label} ${subhead} Free first decision. No card.`,
    mono: url,
  });
  const headlineSize = headline.length > 60 ? 68 : 80;
  try {
    return new ImageResponse(
      (
        <NewsprintFrame label={label} footerLeft="Free first decision. No card." footerRight={url}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1 }}>
            <div
              style={{
                display: "flex",
                fontFamily: ogFamily("display"),
                fontSize: headlineSize,
                lineHeight: 1.02,
                letterSpacing: "-0.012em",
                maxWidth: 1072,
              }}
            >
              {headline}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 26,
                maxWidth: 1000,
                fontSize: 28,
                lineHeight: 1.35,
                color: NEWSPRINT.ink2,
              }}
            >
              {subhead}
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
