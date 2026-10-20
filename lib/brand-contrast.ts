/**
 * Which text color to put on an agent's brand color: white or graphite,
 * whichever clears the higher WCAG contrast. Used by the share page's banner
 * (lib/agent-share.ts brand color) and the homepage's co-branding preview, so
 * a light brand color never gets white text.
 */

const GRAPHITE = "#26292e";
const WHITE = "#ffffff";

/** Relative luminance of a #rrggbb (or #rgb) color; null when it is not one. */
export function hexLuminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const channel = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

export function contrastRatio(l1: number, l2: number): number {
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** White or graphite text for the given brand color; white for a color that cannot be parsed. */
export function textOnBrand(hex: string | null | undefined): typeof WHITE | typeof GRAPHITE {
  const l = hex ? hexLuminance(hex) : null;
  if (l == null) return WHITE;
  const white = contrastRatio(1, l);
  const graphite = contrastRatio(hexLuminance(GRAPHITE)!, l);
  return white >= graphite ? WHITE : GRAPHITE;
}
