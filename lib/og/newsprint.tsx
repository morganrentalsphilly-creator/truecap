/**
 * The shared frame for every TrueCap social card, on the Blueprint system
 * (DESIGN.md, 2026-10-20): the sheet with its faint cobalt grid, graphite
 * ink, one cobalt, the warm highlight as a stroke under a key figure,
 * Hanken Grotesk for display and text, Geist Mono for metadata. The module
 * keeps its historical name (CLAUDE.md §3.6 and the card files refer to it);
 * the values are the Blueprint tokens.
 *
 * Constraints (CLAUDE.md §3.6): the next/og JSX subset only (divs, inline
 * styles, text), no Tailwind, no server-only imports, and every card must
 * still render when something fails. next/og cannot read CSS variables or the
 * site's woff2 files, so the palette is the DESIGN.md tokens as hex, and the
 * faces are fetched from Google Fonts once per server process. A failed font
 * fetch falls back to next/og's built-in sans; the card still renders.
 */

import type { CSSProperties, ReactNode } from "react";

export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * DESIGN.md tokens as sRGB hex (converted from the OKLCH values in
 * app/globals.css). The keys keep their historical names so the templates
 * read the same: `paper` is the sheet, `ink` graphite, `blue` cobalt.
 */
export const NEWSPRINT = {
  paper: "#fbfaf7",
  raised: "#ffffff",
  band: "#f1f0ec",
  rule: "#d6d4ce",
  ruleSoft: "#e9e8e4",
  ink: "#26292e",
  ink2: "#585b61",
  blue: "#1853c6",
  positive: "#00792f",
  miss: "#bb4900",
  highlight: "#ec7c0e",
  navy: "#0f1828",
  navyForeground: "#e5e8ed",
} as const;

/** The faint cobalt grid behind the sheet, as `bg-sheet-grid` draws it. */
const GRID_LINE = "rgba(24, 83, 198, 0.09)";

export const OG_FONT = {
  display: "Hanken Grotesk Display",
  text: "Hanken Grotesk",
  mono: "Geist Mono",
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
 * The faces a card uses: Hanken Grotesk at 750 for the display voice (its
 * own family name, so a template need not set a weight), Hanken Grotesk at
 * 400 and 600 for text and labels, Geist Mono at 500 for metadata. The
 * `parts` say which faces the card draws (a card with no metadata skips the
 * mono face); the text is not used for subsetting any more.
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
  const [display, text, label, mono] = await Promise.all([
    loadGoogleFont("Hanken+Grotesk", "wght@750"),
    loadGoogleFont("Hanken+Grotesk", "wght@400"),
    loadGoogleFont("Hanken+Grotesk", "wght@600"),
    parts.mono ? loadGoogleFont("Geist+Mono", "wght@500") : Promise.resolve(null),
  ]);
  const fonts: OgFont[] = [];
  if (display) fonts.push({ name: OG_FONT.display, data: display, weight: 700, style: "normal" });
  if (text) fonts.push({ name: OG_FONT.text, data: text, weight: 400, style: "normal" });
  if (label) fonts.push({ name: OG_FONT.text, data: label, weight: 600, style: "normal" });
  if (mono) fonts.push({ name: OG_FONT.mono, data: mono, weight: 500, style: "normal" });
  return fonts.length ? fonts : undefined;
}

/** The font-family stack a card element uses, with next/og's sans behind it. */
export function ogFamily(face: keyof typeof OG_FONT): string {
  return `"${OG_FONT[face]}", sans-serif`;
}

/** A figure: the text face at 600 (the figure voice; next/og has no tabular numerals). */
export const OG_FIGURE: CSSProperties = { fontFamily: ogFamily("text"), fontWeight: 600 };

/** The warm highlighter stroke under a key figure: a fill behind the lower third of the glyphs. */
export const OG_HIGHLIGHT_STROKE: CSSProperties = {
  backgroundImage: `linear-gradient(transparent 62%, ${NEWSPRINT.highlight} 62%, ${NEWSPRINT.highlight} 88%, transparent 88%)`,
  padding: "0 0.06em",
};

/** A metadata tag: Geist Mono on a 1px line at the 4px tag radius. */
export const OG_TAG: CSSProperties = {
  display: "flex",
  padding: "5px 10px",
  border: `1px solid ${NEWSPRINT.rule}`,
  borderRadius: 4,
  fontFamily: ogFamily("mono"),
  fontSize: 20,
  color: NEWSPRINT.ink2,
};

/**
 * The frame: the sheet on its grid, the wordmark row over one graphite line,
 * the card's content, and a soft line over the footer. The wordmark is
 * typeset because next/og has no access to the logo's raster at build time
 * on every route.
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
        backgroundColor: NEWSPRINT.paper,
        backgroundImage: `linear-gradient(to right, ${GRID_LINE} 1px, transparent 1px), linear-gradient(to bottom, ${GRID_LINE} 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
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
          borderBottom: `1px solid ${NEWSPRINT.ink}`,
        }}
      >
        <div style={{ display: "flex", fontFamily: ogFamily("display"), fontSize: 34, letterSpacing: "-0.025em" }}>
          TrueCap<span style={{ color: NEWSPRINT.blue, marginLeft: -2 }}>.</span>
        </div>
        {label ? (
          <div style={{ display: "flex", fontFamily: ogFamily("mono"), fontSize: 20, color: NEWSPRINT.ink2 }}>{label}</div>
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
          <div style={{ display: "flex", color: NEWSPRINT.blue, fontFamily: ogFamily("mono"), fontSize: 20 }}>
            {footerRight ?? ""}
          </div>
        </div>
      ) : null}
    </div>
  );
}
