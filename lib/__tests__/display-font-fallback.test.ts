import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/**
 * Headings and text share one variable face, Hanken Grotesk (DESIGN.md
 * "Typography", 2026-10-20). Until the font file lands they are set in the
 * fallback next/font generates from the face's own metrics, so the swap
 * gains or loses no line (the go-to-market audit's P2-159 found a 0.199
 * layout shift when the old display cut had no matched fallback). These
 * cases pin the three options that make the swap shift-free and the two
 * utilities that set the display and figure voices from the same face.
 */
describe("the type faces and their fallback", () => {
  const css = read("app/globals.css");
  const layout = read("app/layout.tsx");

  it("loads Hanken Grotesk with next/font's size-adjusted fallback, swapped and preloaded", () => {
    const font = layout.match(/const hankenGrotesk = Hanken_Grotesk\(\{[\s\S]*?\n\}\);/)?.[0] ?? "";
    expect(font).toContain('variable: "--font-sans-variable"');
    expect(font).toContain("adjustFontFallback: true");
    expect(font).toContain('display: "swap"');
    // The homepage H1 is the LCP element; the face that draws it preloads.
    expect(font).toContain("preload: true");
    // One width: no `axes`, so the generated fallback serves display and text.
    expect(font).not.toContain("axes:");
  });

  it("loads Geist Mono for metadata only, at the two weights the figures never use", () => {
    const mono = layout.match(/const geistMono = Geist_Mono\(\{[\s\S]*?\n\}\);/)?.[0] ?? "";
    expect(mono).toContain('variable: "--font-mono-variable"');
    expect(mono).toContain('weight: ["400", "500"]');
    expect(mono).toContain("preload: false");
    expect(layout).toContain("${hankenGrotesk.variable} ${geistMono.variable} font-sans");
  });

  it("needs no hand-written @font-face: the fallback is next/font's own", () => {
    expect(css.match(/@font-face\s*\{/g) ?? []).toHaveLength(0);
    expect(css).not.toMatch(/Archivo|DM Mono/);
    expect(css).toContain('--font-sans: var(--font-sans-variable), "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif;');
    expect(css).toContain('--font-mono: var(--font-mono-variable), "Geist Mono", ui-monospace, monospace;');
  });

  it("sets the display voice at 750 and tight, in the text face, with no width axis", () => {
    const utility = css.match(/@utility font-display \{[^}]*\}/)?.[0] ?? "";
    expect(utility).toContain("font-family: var(--font-sans);");
    expect(utility).toContain("font-weight: 750;");
    expect(utility).toContain("letter-spacing: -0.025em;");
    expect(utility).not.toContain("font-stretch");
  });

  it("sets figures in the text face with tabular numerals", () => {
    const utility = css.match(/@utility font-figure \{[^}]*\}/)?.[0] ?? "";
    expect(utility).toContain("font-family: var(--font-sans);");
    expect(utility).toContain("font-variant-numeric: tabular-nums;");
    expect(utility).toContain('font-feature-settings: "tnum" 1;');
  });

  it("joins a family next/font really generates, named '<family> Fallback'", () => {
    // next/font names its fallback "<font family> Fallback" and the CSS
    // variable carries both; if a Next upgrade changes the naming, the
    // --font-sans stack above still resolves because it lists the family
    // itself, but the fallback metrics would be lost: pin the loader.
    const loader = read("node_modules/next/dist/build/webpack/loaders/next-font-loader/postcss-next-font.js");
    expect(loader).toContain("formatFamily(`${fontFamily} Fallback`)");
  });
});
