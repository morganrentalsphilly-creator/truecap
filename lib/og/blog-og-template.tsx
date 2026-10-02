/**
 * Shared template for per-post /blog/<slug>/opengraph-image.tsx dynamic OG
 * cards, on the Newsprint frame (lib/og/newsprint.tsx). A wrapper restates
 * its post and nothing else: a title the post carries and only figures the
 * post prints. lib/__tests__/blog-social-card-truth.test.ts fails when the
 * two drift apart, so a rewrite of a post updates its card in the same
 * commit. The SEO loop writes new wrappers against this interface, so
 * BlogOgConfig and the function name stay stable.
 *
 * Constraints (CLAUDE.md §3.6): the next/og JSX subset only, no Tailwind, no
 * server-only imports. Fail-safe: fonts fall back to next/og's sans and a
 * render error returns the plain frame, so a bad config string never surfaces
 * a 500 on a social crawler fetch.
 *
 * Layout: the wordmark over a heavy rule with "Blog · <Section>", the topic
 * as a 2px chip, the post title in the display voice (stepping down for long
 * titles), and the subline and the blog URL over a soft rule.
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

export type BlogOgConfig = {
  /** Header label after "Blog · " (e.g. "Financing", "Comparisons"). */
  section: string;
  /** Short topic shown as a chip above the headline (e.g. "DSCR"). */
  tag: string;
  /** Post title — pass the page's metadata title verbatim. */
  title: string;
  /** Short footer-left subline (the "what's inside" teaser). */
  subline: string;
};

const URL_TEXT = "usetruecap.com/blog";

export async function renderBlogOgImage(config: BlogOgConfig): Promise<ImageResponse> {
  const { section, tag, title, subline } = config;
  const label = `Blog · ${section}`;
  const fonts = await loadNewsprintFonts({
    display: `TrueCap. ${title}`,
    text: `${label} ${tag} ${subline}`,
    mono: URL_TEXT,
  });
  // Long titles step down so they still fit the 1072px column in three lines.
  const headlineSize = title.length > 84 ? 54 : title.length > 64 ? 60 : 68;
  try {
    return new ImageResponse(
      (
        <NewsprintFrame label={label} footerLeft={subline} footerRight={URL_TEXT}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1 }}>
            {tag ? (
              <div style={{ display: "flex", marginBottom: 24 }}>
                <div
                  style={{
                    display: "flex",
                    padding: "6px 12px",
                    border: `1px solid ${NEWSPRINT.rule}`,
                    borderRadius: 2,
                    fontSize: 22,
                    color: NEWSPRINT.ink2,
                  }}
                >
                  {tag}
                </div>
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                fontFamily: ogFamily("display"),
                fontSize: headlineSize,
                lineHeight: 1.04,
                letterSpacing: "-0.012em",
                maxWidth: 1072,
              }}
            >
              {title}
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
