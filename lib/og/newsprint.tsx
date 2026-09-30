/**
 * The shared frame for every TrueCap social card (DESIGN.md "Token strategy":
 * the OG images move to Archivo, DM Mono and the Newsprint paper).
 *
 * Constraints (CLAUDE.md §3.6): the next/og JSX subset only (divs, inline
 * styles, text), no Tailwind, no server-only imports, and every card must
 * still render when something fails. next/og cannot read CSS variables or the
 * site's woff2 files, so the palette is the DESIGN.md tokens as hex, and the
 * faces are fetched from Google Fonts per card, subset to the card's own
 * text. A failed font fetch falls back to next/og's built-in sans; the card
 * still renders.
 */

import type { ReactNode } from "react";

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** DESIGN.md tokens as sRGB hex (converted from the OKLCH values). */
export const NEWSPRINT = {
  paper: "#efece8",
  raised: "#f6f5f2",
  band: "#e9e6e0",
  rule: "#bab7b0",
  ruleSoft: "#d8d5d0",
  ink: "#1b1b1b",
  ink2: "#51504c",
  blue: "#0066ba",
  positive: "#006d32",
  miss: "#a93800",
} as const;

export const OG_FONT = {
  display: "Archivo Display",
  text: "Archivo",
  mono: "DM Mono",
} as const;

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700 | 800;
  style: "normal";
};

/**
 * One face at one weight, fetched ONCE per server process and cached: a
 * build prerenders ~60 cards, and a request per card (the old `text=`
 * subsetting) was rate-limited on CI and Vercel, which failed the build.
 * Google serves a static TTF instance to a non-browser client when every
 * axis is pinned to one value; with several unicode-range subsets, the one
 * covering Basic Latin is used. Retries twice with a short backoff; null on
 * failure (the card then renders in next/og's built-in face).
 */
const fontCache = new Map<string, Promise<ArrayBuffer | null>>();

function latinSource(css: string): string | null {
  const faces = css.split("@font-face").slice(1);
  const coversLatin = (face: string) => {
    const range = /unicode-range:\s*([^;]+);/.exec(face)?.[1];
    if (!range) return true;
    return range.split(",").some((part) => {
      const [lo, hi] = part.trim().replace(/^U\+/i, "").split("-");
      const from = parseInt(lo, 16);
      const to = hi ? parseInt(hi, 16) : from;
      return from <= 0x41 && 0x7a <= to;
    });
  };
  const face = faces.find(coversLatin) ?? faces[0];
  return face ? /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(face)?.[1] ?? null : null;
}

async function fetchFont(family: string, axes: string): Promise<ArrayBuffer | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:${axes}`)).text();
      const src = latinSource(css);
      if (!src) continue;
      const response = await fetch(src);
      if (response.ok) return await response.arrayBuffer();
    } catch {
      // next attempt
    }
  }
  return null;
}

function loadGoogleFont(family: string, axes: string): Promise<ArrayBuffer | null> {
  const key = `${family}:${axes}`;
  let pending = fontCache.get(key);
  if (!pending) {
    pending = fetchFont(family, axes).then((font) => {
      // Don't pin a failure for the life of the process: the next card retries.
      if (!font) fontCache.delete(key);
      return font;
    });
    fontCache.set(key, pending);
  }
  return pending;
}

/**
 * The three faces a card uses: Archivo at 82% width and 750 for the display
 * voice, Archivo 400 for text, DM Mono 500 for figures. The `parts` say which
 * faces the card draws (a card with no figures skips the mono face).
 *
 * Returns undefined, never an empty list, when no face loads: next/og reads
 * `options.fonts || defaultFonts`, so an empty array is truthy, replaces its
 * built-in face and throws "No fonts are loaded" at render, which fails a
 * build that prerenders the card.
 */
export async function loadNewsprintFonts(parts: {
  display: string;
  text: string;
  mono?: string;
}): Promise<OgFont[] | undefined> {
  const [display, text, mono] = await Promise.all([
    loadGoogleFont("Archivo", "wdth,wght@82,750"),
    loadGoogleFont("Archivo", "wdth,wght@100,400"),
    parts.mono ? loadGoogleFont("DM+Mono", "wght@500") : Promise.resolve(null),
  ]);
  const fonts: OgFont[] = [];
  if (display) fonts.push({ name: OG_FONT.display, data: display, weight: 700, style: "normal" });
  if (text) fonts.push({ name: OG_FONT.text, data: text, weight: 400, style: "normal" });
  if (mono) fonts.push({ name: OG_FONT.mono, data: mono, weight: 500, style: "normal" });
  return fonts.length ? fonts : undefined;
}

/** The font-family stack a card element uses, with next/og's sans behind it. */
export function ogFamily(face: keyof typeof OG_FONT): string {
  return `"${OG_FONT[face]}", sans-serif`;
}

/**
 * The frame: paper, a heavy ink rule under the wordmark row (the way a
 * ledger opens), the card's content, and a soft rule over the footer. The
 * wordmark is typeset because next/og has no access to the logo's raster at
 * build time on every route.
 */
export function NewsprintFrame({
  label,
  footerLeft,
  footerRight,
  children,
}: {
  /** Sentence-case section name at the right of the wordmark row. */
  label?: string;
  footerLeft?: string;
  footerRight?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: NEWSPRINT.paper,
        color: NEWSPRINT.ink,
        fontFamily: ogFamily("text"),
        padding: "48px 64px 40px 64px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingBottom: 14,
          borderBottom: `3px solid ${NEWSPRINT.ink}`,
        }}
      >
        <div style={{ display: "flex", fontFamily: ogFamily("display"), fontSize: 34, letterSpacing: "-0.01em" }}>
          TrueCap<span style={{ color: NEWSPRINT.blue, marginLeft: -4 }}>.</span>
        </div>
        {label ? (
          <div style={{ display: "flex", fontSize: 22, color: NEWSPRINT.ink2 }}>{label}</div>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>{children}</div>
      {footerLeft || footerRight ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            paddingTop: 14,
            borderTop: `1px solid ${NEWSPRINT.rule}`,
            fontSize: 22,
            color: NEWSPRINT.ink2,
          }}
        >
          <div style={{ display: "flex" }}>{footerLeft ?? ""}</div>
          <div style={{ display: "flex", color: NEWSPRINT.blue, fontFamily: ogFamily("mono") }}>
            {footerRight ?? ""}
          </div>
        </div>
      ) : null}
    </div>
  );
}
