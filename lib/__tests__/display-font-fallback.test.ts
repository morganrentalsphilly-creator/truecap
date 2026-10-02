import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/**
 * Headings are set in Archivo's 82% display cut. Until the font file lands
 * they are set in a fallback, and next/font's generated fallback is matched
 * to Archivo at normal width, so the /pricing H1 took an extra line and gave
 * it back at the swap: a layout shift of 0.199 on a slow first visit (the
 * go-to-market audit, P2-159). app/globals.css adds a second face to the same
 * fallback family at font-stretch 82%. These cases pin the measured numbers
 * and the two assumptions the face rests on.
 */
describe("the display cut's fallback face", () => {
  const css = read("app/globals.css");
  const faces = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  const descriptor = (face: string, name: string) =>
    face.match(new RegExp(`(?:^|[;{\\s])${name}:\\s*([^;]+);`))?.[1].trim() ?? null;

  it("is the one @font-face in globals.css, in next/font's fallback family at the display cut's width and weight", () => {
    expect(faces).toHaveLength(1);
    const [face] = faces;
    expect(descriptor(face, "font-family")).toBe('"Archivo Fallback"');
    expect(descriptor(face, "font-stretch")).toBe("82%");
    expect(descriptor(face, "font-weight")).toBe("750");
    // A local bold face, so the browser never synthesises bold on top of it.
    expect(descriptor(face, "src")).toMatch(/^local\("Arial Bold"\)/);
    expect(descriptor(face, "src")).not.toMatch(/url\(/);
  });

  it("selects the same width and weight the font-display utility sets", () => {
    const utility = css.match(/@utility font-display \{[^}]*\}/)?.[0] ?? "";
    expect(utility).toContain("font-family: var(--font-sans);");
    expect(utility).toContain("font-stretch: 82%;");
    expect(utility).toContain("font-weight: 750;");
  });

  it("carries the measured size adjustment and Archivo's own ascent and descent", () => {
    const [face] = faces;
    // Archivo at 82% width and weight 750 against Arial Bold, measured over
    // the site's headings in Chromium: 0.853.
    expect(descriptor(face, "size-adjust")).toBe("85.3%");
    const metrics = (
      JSON.parse(read("node_modules/next/dist/server/capsize-font-metrics.json")) as Record<
        string,
        { ascent: number; descent: number; lineGap: number; unitsPerEm: number }
      >
    ).archivo;
    const adjust = 0.853;
    const percent = (value: string | null) => Number((value ?? "").replace("%", ""));
    expect(percent(descriptor(face, "ascent-override"))).toBeCloseTo((metrics.ascent / metrics.unitsPerEm / adjust) * 100, 1);
    expect(percent(descriptor(face, "descent-override"))).toBeCloseTo((Math.abs(metrics.descent) / metrics.unitsPerEm / adjust) * 100, 1);
    expect(percent(descriptor(face, "line-gap-override"))).toBe(metrics.lineGap);
  });

  it("joins a family next/font really generates: Archivo with an adjusted fallback", () => {
    const layout = read("app/layout.tsx");
    const archivo = layout.match(/const archivo = Archivo\(\{[\s\S]*?\n\}\);/)?.[0] ?? "";
    expect(archivo).toContain("adjustFontFallback: true");
    expect(archivo).toContain('display: "swap"');
    expect(archivo).toContain('axes: ["wdth"]');
    // next/font names that family "<font family> Fallback". If a Next upgrade
    // changes the name, the face above matches nothing and headings fall back
    // to the normal-width face again: update the family name with it.
    expect(read("node_modules/next/dist/build/webpack/loaders/next-font-loader/postcss-next-font.js")).toContain(
      "formatFamily(`${fontFamily} Fallback`)",
    );
  });
});
