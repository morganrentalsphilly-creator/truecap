import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sanitizeStringsForWinAnsi, toWinAnsiSafe } from "@/lib/pdf-generator";

/**
 * jsPDF's core Helvetica is WinAnsi-encoded: glyphs outside that set do not
 * drop — they MOJIBAKE. "DSCR ≥ 1.25" shipped in real customer reports as
 * `DSCR "e 1.25`, six times per document, because the buy-box criteria
 * strings are composed in the web app where ≥ is house style. The composer
 * now deep-maps every payload string to a WinAnsi-safe equivalent before
 * drawing; these pins keep that boundary in place.
 */

describe("PDF WinAnsi text safety", () => {
  it("maps the glyphs that mojibake in jsPDF core fonts", () => {
    expect(toWinAnsiSafe("break-even cash flow · DSCR ≥ 1.25")).toBe(
      "break-even cash flow · DSCR >= 1.25",
    );
    expect(toWinAnsiSafe("rent ≤ market")).toBe("rent <= market");
    expect(toWinAnsiSafe("−$210/mo → breakeven ≈ $2,167")).toBe(
      "-$210/mo -> breakeven ~ $2,167",
    );
    // WinAnsi-native punctuation passes through untouched.
    expect(toWinAnsiSafe("Philadelphia — 19125 · “quoted” – ok’s")).toBe(
      "Philadelphia — 19125 · “quoted” – ok’s",
    );
  });

  it("deep-walks payloads: strings map, Dates and numbers pass through", () => {
    const generatedAt = new Date("2026-09-01T12:00:00Z");
    const out = sanitizeStringsForWinAnsi({
      generatedAt,
      maxOffer: { basis: "DSCR ≥ 1.25", maxPrice: 198_000 },
      notes: ["cap ≥ 6%", null],
    });
    expect(out.generatedAt).toBe(generatedAt);
    expect(out.maxOffer.basis).toBe("DSCR >= 1.25");
    expect(out.maxOffer.maxPrice).toBe(198_000);
    expect(out.notes).toEqual(["cap >= 6%", null]);
  });

  it("the composer sanitizes payload AND branding strings before drawing", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/pdf-generator.ts"),
      "utf8",
    );
    expect(source).toContain("const d = sanitizeStringsForWinAnsi(data);");
    expect(source).toContain(
      "branding = branding ? sanitizeStringsForWinAnsi(branding) : branding;",
    );
  });

  it("the visual harness's sample carries the ≥ glyph so renders exercise the sanitizer", () => {
    const harness = readFileSync(
      join(process.cwd(), "scripts/pdf-visual-check.ts"),
      "utf8",
    );
    expect(harness).toContain("DSCR ≥ 1.25");
  });
});
