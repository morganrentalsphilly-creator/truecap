import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrast, oklchToLinearRgb, type LinearRgb } from "./helpers/oklch-contrast";

/**
 * The navy band's token scope (app/globals.css, `[data-tone="navy"]`) and its
 * reset for a white object set inside a band (`[data-tone="sheet"]`).
 *
 * keyboard-and-contrast-guards.test.ts holds the light pairs. This file holds
 * the pairs that exist only on navy, measured from the stylesheet's own
 * literals, so a value that is retuned below its threshold fails here whatever
 * it is retuned to. The thresholds are WCAG 2.1 AA: 4.5:1 for text, 3:1 for a
 * focus indicator and a control's border.
 */

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

/** The declarations of the first rule whose selector is exactly `selector`. */
function block(source: string, selector: string): Map<string, string> {
  const open = `${selector} {`;
  // At the start of a line: the unlayered rule, not a longer selector that
  // ends with the same text.
  const start = source.search(new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{`));
  if (start === -1) throw new Error(`no "${open}" rule in app/globals.css`);
  const from = source.indexOf(open, start) + open.length;
  const body = source.slice(from, source.indexOf("}", from)).replace(/\/\*[\s\S]*?\*\//g, "");
  const declarations = new Map<string, string>();
  for (const match of body.matchAll(/(--[\w-]+|[a-z-]+)\s*:\s*([^;]+);/g)) {
    declarations.set(match[1], match[2].trim());
  }
  return declarations;
}

/** An opaque `oklch(L C H)` literal as linear sRGB. */
function color(value: string | undefined, name: string): LinearRgb {
  const match = value?.match(/^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/);
  if (!match) throw new Error(`${name} is not an opaque OKLCH literal: ${value}`);
  return oklchToLinearRgb(Number(match[1]), Number(match[2]), Number(match[3]));
}

const customProperties = (declarations: Map<string, string>) =>
  [...declarations.keys()].filter((name) => name.startsWith("--"));

const root = block(css, ":root");
const navy = block(css, '[data-tone="navy"]');
const sheet = block(css, '[data-tone="sheet"]');

describe("the navy band's tokens", () => {
  const on = (name: string) => contrast(color(navy.get(name), name), color(navy.get("--background"), "--background"));

  it("is the navy the band paints, and sets its own text colour", () => {
    // bg-navy-grid writes the navy out for contrast tools; the scope's
    // --background is the same colour, so a ratio measured here is the ratio
    // on the painted band.
    const band = css.match(/@utility bg-navy-grid \{[^}]*?background-color:\s*([^;]+);/)?.[1].trim();
    expect(navy.get("--background")).toBe(band);
    expect(navy.get("--background")).toBe(root.get("--navy"));
    expect(navy.get("color")).toBe("var(--foreground)");
  });

  it.each([
    "--foreground",
    "--muted-foreground",
    "--success",
    "--brand-green",
    "--metric-positive",
    "--metric-negative",
    "--highlight-text",
    "--brand-orange-text",
  ])("keeps %s at 4.5:1 or better as text on navy", (name) => {
    expect(on(name)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["--ring", "--input"])("keeps %s at 3:1 or better against navy (focus ring, control border)", (name) => {
    expect(on(name)).toBeGreaterThanOrEqual(3);
  });

  it("keeps the inverted button readable: cobalt text on the white primary, at rest and on hover", () => {
    const text = color(navy.get("--primary-foreground"), "--primary-foreground");
    expect(contrast(text, color(navy.get("--primary"), "--primary"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(text, color(navy.get("--primary-deep"), "--primary-deep"))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps text readable on the band's raised surface (a hovered outline button, a row on the accent)", () => {
    for (const [text, surface] of [
      ["--accent-foreground", "--accent"],
      ["--secondary-foreground", "--secondary"],
      ["--foreground", "--band"],
      ["--muted-foreground", "--muted"],
    ] as const) {
      expect(
        contrast(color(navy.get(text), text), color(navy.get(surface), surface)),
        `${text} on ${surface}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("matches the documented ratios, so the numbers in DESIGN.md and the stylesheet stay true", () => {
    expect(on("--foreground")).toBeCloseTo(14.4, 0);
    expect(on("--muted-foreground")).toBeCloseTo(7.2, 0);
    expect(on("--ring")).toBeGreaterThanOrEqual(4.5);
  });

  it("gives the homepage close the same ring without the scope", () => {
    // FinalCta draws the band with bg-navy-grid alone (its address form sets
    // bg-card and bg-field, which the scope's light text would hide), so the
    // utility carries the lighter ring itself.
    const ring = css.match(/@utility bg-navy-grid \{[^}]*?--ring:\s*([^;]+);/)?.[1].trim();
    expect(ring).toBe(navy.get("--ring"));
  });
});

describe('the reset for a white object inside a band (data-tone="sheet")', () => {
  it("restates every property the navy scope sets, at the value :root has", () => {
    const set = customProperties(navy);
    expect(set.length).toBeGreaterThanOrEqual(20);
    expect(customProperties(sheet).sort()).toEqual([...set].sort());
    for (const name of set) {
      expect(sheet.get(name), name).toBe(root.get(name));
    }
    expect(sheet.get("color")).toBe("var(--foreground)");
  });

  it("leaves the white surfaces alone in both scopes, so a card in a band stays white", () => {
    for (const name of ["--card", "--popover", "--field"]) {
      expect(navy.has(name), name).toBe(false);
      expect(sheet.has(name), name).toBe(false);
    }
  });
});

describe("the band in print", () => {
  const print = css.slice(css.indexOf("@media print {"));
  // One rule for every navy surface: the scope, and the utility that paints
  // the navy (the homepage close draws its band with bg-navy-grid alone).
  const printed = block(print, '  [data-tone="navy"],\n  .bg-navy-grid');
  const white = oklchToLinearRgb(1, 0, 0);

  it("prints as the sheet: the same light values, on white, without the grid", () => {
    for (const name of customProperties(navy)) {
      expect(printed.get(name), name).toBe(root.get(name));
    }
    expect(printed.get("background-image")).toBe("none");
  });

  it("covers a band drawn with bg-navy-grid and no data-tone, with ink that reads on white paper", () => {
    // Paper is white whether or not the browser prints backgrounds, so the
    // band's own text colour has to be the ink, at 4.5:1 or better on white.
    expect(printed.get("background-color")).toBe("#fff");
    expect(printed.get("color")).toBe("var(--foreground)");
    for (const name of ["--foreground", "--muted-foreground", "--primary"]) {
      expect(contrast(color(printed.get(name), name), white), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("takes the ink for every navy class the homepage close writes by hand", () => {
    // FinalCta sets its text and its line by class (the navy tokens, and
    // white), which the token reset cannot reach: 1:1 and 2.5:1 on paper.
    const closeSource = readFileSync(join(process.cwd(), "components/marketing/landing-sections.tsx"), "utf8");
    const from = closeSource.indexOf("export function FinalCta()");
    const close = closeSource.slice(from, closeSource.indexOf("\nexport function ", from + 1));
    expect(close).toContain('className="bg-navy-grid text-navy-foreground"');
    expect(close).not.toContain("data-tone");

    const text = print.match(/\.bg-navy-grid :is\(([^)]+)\) \{\s*color: var\(--foreground\);/)?.[1].split(/,\s*/) ?? [];
    const line = print.match(/\.bg-navy-grid (\.border-navy-line) \{\s*border-color: var\(--border\);/)?.[1];
    const reset = new Set([...text, line]);
    const written = new Set(close.match(/\b(?:text|border)-(?:white|navy-[a-z]+)\b/g) ?? []);
    expect(written.size).toBeGreaterThanOrEqual(4);
    for (const name of written) {
      expect(reset.has(`.${name}`), `${name} has no print rule under .bg-navy-grid`).toBe(true);
    }
  });
});
