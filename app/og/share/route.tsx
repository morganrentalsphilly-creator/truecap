import { ImageResponse } from "next/og";
import {
  loadNewsprintFonts,
  NEWSPRINT,
  NewsprintFrame,
  OG_SIZE,
  ogFamily,
} from "@/lib/og/newsprint";

/**
 * GET /og/share: the one link-preview card for every share link, /s/[token]
 * and the legacy /d/[encoded] (2026-10 audit row P2-135, the lowest-risk
 * option: one static, deal-free card).
 *
 * DEAL-FREE BY CONSTRUCTION. The handler takes no request, no params and no
 * query, imports nothing that can read a share, and draws only the constants
 * below. An unfurler caches what it reads outside TrueCap's access boundary,
 * so the card must never carry an address, a price, a metric, a verdict, or
 * the name of the person who shared. Every share link gets the same image.
 *
 * It lives outside /s/ and /d/ on purpose: robots.txt disallows both, and a
 * card served under them would be off limits to a preview crawler that
 * honors robots.txt. /og/ is allowed (lib/__tests__/share-link-preview.test.ts
 * holds that). It also keeps the image URL free of the token and of the
 * legacy link's encoded snapshot.
 */

const HEADLINE = "A rental analysis, shared with you.";
const SUBHEAD =
  "Open the link to read it. Property details are not shown in previews.";
const URL_TEXT = "usetruecap.com";

export async function GET() {
  const fonts = await loadNewsprintFonts({
    display: `TrueCap. ${HEADLINE}`,
    text: `Shared analysis ${SUBHEAD} Shared via TrueCap`,
    mono: URL_TEXT,
  });

  return new ImageResponse(
    (
      <NewsprintFrame label="Shared analysis" footerLeft="Shared via TrueCap" footerRight={URL_TEXT}>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              width: 960,
              fontFamily: ogFamily("display"),
              fontSize: 76,
              lineHeight: 1.02,
              letterSpacing: "-0.012em",
            }}
          >
            {HEADLINE}
          </div>
          <div
            style={{
              display: "flex",
              width: 960,
              marginTop: 24,
              fontSize: 28,
              lineHeight: 1.35,
              color: NEWSPRINT.ink2,
            }}
          >
            {SUBHEAD}
          </div>
        </div>
      </NewsprintFrame>
    ),
    { ...OG_SIZE, fonts, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
