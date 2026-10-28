import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { findProductShot } from "@/components/marketing/product-shot";
import {
  loadNewsprintFonts,
  NEWSPRINT,
  NewsprintFrame,
  OG_SIZE,
  ogFamily,
} from "@/lib/og/newsprint";

/**
 * GET /og/for-agents — the agent landing page's OG card: the agent headline
 * beside a capture of the sample decision memo page
 * (public/product/memo-desktop.png, shot from /sample-decision-memo), shown
 * as a printed page (a 1px rule, no radius, no shadow). It is the sample
 * page, not the co-branded share link or PDF a client receives, which are
 * laid out differently; the page's og:image alt says the same. Degrades to
 * the headline alone if the capture cannot be loaded, never to a placeholder.
 *
 * A route handler rather than app/for-agents/opengraph-image.tsx because the
 * old file card's copy had drifted from the page; the page's metadata points
 * og:image and twitter:image at this URL.
 */

const HEADLINE = "One listing. Each client's numbers.";
const SUBHEAD =
  "Screen a listing against each client's Buy Box, show their Offer Ceiling, and send a co-branded decision memo.";
const URL_TEXT = "usetruecap.com/for-agents";

export async function GET() {
  const shot = findProductShot("memo", "desktop");
  let shotSrc: string | null = null;
  if (shot) {
    // The shot's bytes: from the project's public/ directory where the file
    // system has it (the local production server, the Node card renderer),
    // else over HTTP from the site's own static assets (a serverless deploy,
    // whose function bundle does not carry public/). The relative URL against
    // import.meta.url that was here resolved to nothing on the built server,
    // so the card shipped without its shot. Either way a failure leaves the
    // card on its headline alone.
    try {
      const fromDisk = await readFile(path.join(process.cwd(), "public", "product", "memo-desktop.png")).catch(() => null);
      let bytes: ArrayBuffer | null = fromDisk ? fromDisk.buffer.slice(fromDisk.byteOffset, fromDisk.byteOffset + fromDisk.byteLength) : null;
      if (!bytes) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://usetruecap.com";
        const response = await fetch(new URL(shot.png, siteUrl));
        if (response.ok) bytes = await response.arrayBuffer();
      }
      if (bytes) shotSrc = `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
    } catch {
      shotSrc = null;
    }
  }
  const fonts = await loadNewsprintFonts({
    display: `TrueCap. ${HEADLINE}`,
    text: `For real estate agents ${SUBHEAD} Free first decision. No card.`,
    mono: URL_TEXT,
  });

  return new ImageResponse(
    (
      <NewsprintFrame
        label="For real estate agents"
        footerLeft="Free first decision. No card."
        footerRight={URL_TEXT}
      >
        <div style={{ display: "flex", flexGrow: 1, gap: 48, alignItems: shotSrc ? "flex-start" : "center", paddingTop: shotSrc ? 32 : 0, overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", width: shotSrc ? 470 : 1072 }}>
            <div
              style={{
                display: "flex",
                fontFamily: ogFamily("display"),
                fontSize: shotSrc ? 56 : 76,
                lineHeight: 1.02,
                letterSpacing: "-0.012em",
              }}
            >
              {HEADLINE}
            </div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 26, lineHeight: 1.35, color: NEWSPRINT.ink2 }}>
              {SUBHEAD}
            </div>
          </div>
          {shotSrc ? (
            <div
              style={{
                display: "flex",
                width: 560,
                height: 420,
                overflow: "hidden",
                border: `1px solid ${NEWSPRINT.rule}`,
                background: NEWSPRINT.raised,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shotSrc} alt="" width={560} style={{ width: 560, height: "auto" }} />
            </div>
          ) : null}
        </div>
      </NewsprintFrame>
    ),
    { ...OG_SIZE, fonts, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
