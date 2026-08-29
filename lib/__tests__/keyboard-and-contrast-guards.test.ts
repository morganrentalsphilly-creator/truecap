import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Three accessibility defects measured on the live site, 2026-08-28.
 *
 * They share a shape: each was invisible to every automated check the project
 * already ran, because each is about what happens to a PERSON operating the
 * page — where focus goes, whether a key works, whether text can be read at
 * the size it is actually rendered.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

/** WCAG relative luminance / contrast, so the thresholds are checked not asserted. */
function luminance(hex: string): number {
  const v = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

describe("contrast on the states that carry the verdict", () => {
  it("the measured failures really were failures (guards the premise)", () => {
    // White on the old saturated fills, at 10px/800 where AA demands 4.5:1.
    expect(contrast("#FFFFFF", "#FE9A00")).toBeLessThan(4.5); // old Mixed
    expect(contrast("#FFFFFF", "#FF6900")).toBeLessThan(4.5); // old Marginal
    expect(contrast("#FFFFFF", "#268E57")).toBeLessThan(4.5); // old Solid, /85 composited
  });

  it("the replacement dark-on-tint pairs clear AA", () => {
    // Tailwind amber-100/amber-900, orange-100/orange-900, emerald-100/emerald-900.
    expect(contrast("#78350F", "#FEF3C7")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#7C2D12", "#FFEDD5")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#064E3B", "#D1FAE5")).toBeGreaterThanOrEqual(4.5);
  });

  it("the What-If pill no longer uses white on a mid-saturation fill", () => {
    const source = read("components/investcalc/what-if-sliders.tsx");
    expect(source).not.toContain('Mixed: "bg-amber-500 text-white"');
    expect(source).not.toContain('Marginal: "bg-orange-500 text-white"');
    expect(source).not.toContain('Solid: "bg-[var(--brand-green)]/85 text-white"');
  });

  it("the glossary permalink uses the full token, not a 60% opacity of it", () => {
    // #9CA4AD (the /60 composite) is 2.52:1 on white; #596877 is 5.72:1.
    expect(contrast("#9CA4AD", "#FFFFFF")).toBeLessThan(4.5);
    expect(contrast("#596877", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    const glossary = read("app/glossary/page.tsx");
    expect(glossary).not.toContain("tracking-widest text-muted-foreground/60");
  });
});

describe("the cookie banner is escapable and does not strand focus", () => {
  const banner = read("components/marketing/cookie-consent-banner.tsx");

  it("still deliberately takes focus on appear", () => {
    // Guards the premise for the two tests below: because the banner grabs
    // focus on every page, its exit path is load-bearing rather than cosmetic.
    expect(banner).toContain("bannerRef.current?.focus({ preventScroll: true })");
  });

  it("Escape dismisses it", () => {
    expect(banner).toContain("onKeyDown");
    expect(banner).toMatch(/event\.key !== "Escape"/);
    // Escape must record the same outcome as the X, which already counts as
    // reject — it must not silently grant consent.
    const handler = banner.slice(banner.indexOf("onKeyDown"), banner.indexOf("className=", banner.indexOf("onKeyDown")));
    expect(handler).toContain("handleReject()");
    expect(handler).not.toContain("handleAccept");
  });

  it("moves focus somewhere meaningful on dismiss instead of to <body>", () => {
    expect(banner).toContain("restoreFocusAfterDismiss");
    // Both exits, not just one.
    const accept = banner.slice(banner.indexOf("const handleAccept"), banner.indexOf("const handleReject"));
    const reject = banner.slice(banner.indexOf("const handleReject"), banner.indexOf("HIDE_ON_PATHS.some"));
    expect(accept).toContain("restoreFocusAfterDismiss()");
    expect(reject).toContain("restoreFocusAfterDismiss()");
  });
});
