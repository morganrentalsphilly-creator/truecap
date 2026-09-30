/**
 * WCAG contrast for the OKLCH tokens in app/globals.css, so a guard can assert
 * the measured ratio instead of pinning a token's literal value (a literal pin
 * passes on a wrong color and fails on a better one). Same conversion as
 * marketing-accessibility-guards.test.ts: OKLCH → linear sRGB (clamped), then
 * WCAG relative luminance.
 */

export type LinearRgb = [number, number, number];

export const WHITE: LinearRgb = [1, 1, 1];

export function oklchToLinearRgb(
  lightness: number,
  chroma: number,
  hue: number,
): LinearRgb {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.max(0, Math.min(1, channel))) as LinearRgb;
}

/** The first `--name: oklch(L C H)` in the stylesheet (the light :root). */
export function cssToken(source: string, name: string): LinearRgb {
  const match = source.match(
    new RegExp(`--${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`),
  );
  if (!match) throw new Error(`missing --${name} OKLCH token`);
  return oklchToLinearRgb(Number(match[1]), Number(match[2]), Number(match[3]));
}

function relativeLuminance([red, green, blue]: LinearRgb): number {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrast(foreground: LinearRgb, background: LinearRgb): number {
  const f = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05);
}
