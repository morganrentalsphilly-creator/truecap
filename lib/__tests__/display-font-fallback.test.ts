import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fallbackFaceCss, fallbackStack } from "../../scripts/font-fallback-metrics.mjs";

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

  it("adds only the generated fallback faces, after next/font's own, in every family declaration", () => {
    // Re-anchored 2026-10-21 (audit A4): next/font's fallback is local("Arial"),
    // which Android and most Linux machines lack, so the live swap shifted
    // (CLS 0.181 on /). The intent stays (no line moves at the swap); the
    // anchor moves to the faces scripts/font-fallback-metrics.mjs computes
    // with next/font's own formula, for Roboto and Liberation Sans.
    const generated = fallbackFaceCss();
    expect(css).toContain(generated);
    expect(css.match(/@font-face\s*\{/g) ?? []).toHaveLength(generated.match(/@font-face\s*\{/g)?.length ?? -1);
    expect(css).not.toMatch(/Archivo|DM Mono/);
    expect(css).toContain(
      `--font-sans: var(--font-sans-variable), ${fallbackStack("Hanken Grotesk")}, "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif;`,
    );
    expect(css).toContain(
      `--font-mono: var(--font-mono-variable), ${fallbackStack("Geist Mono")}, "Geist Mono", ui-monospace, monospace;`,
    );
    // The two dashboard scopes re-declare the family; both carry the stack.
    expect(
      css.split(`font-family: var(--font-sans-variable), ${fallbackStack("Hanken Grotesk")}, "Hanken Grotesk"`).length - 1,
    ).toBe(2);
  });

  it("matches next/font's own numbers for the Arial-compatible face", () => {
    // Liberation Sans shares Arial's metrics, so its overrides must equal the
    // ones next/font generates against Arial (seen in the built CSS).
    const generated = fallbackFaceCss();
    const liberation = generated.match(/"Hanken Grotesk Fallback Liberation Sans";[\s\S]*?\}/)?.[0] ?? "";
    expect(liberation).toContain("ascent-override: 99.07%;");
    expect(liberation).toContain("descent-override: 30.02%;");
    expect(liberation).toContain("size-adjust: 100.94%;");
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
