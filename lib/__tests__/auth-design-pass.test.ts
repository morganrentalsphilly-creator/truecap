/**
 * The sign-in, sign-up and password screens on the design pass's grammar
 * (DESIGN.md, "The Underwriter's Ledger").
 *
 * The 2026-09-30 design pass skipped these four screens: they kept a photo
 * aside under two gradients, a 22px card under a resting shadow, glowing icon
 * tiles and submit buttons, 10px uppercase labels and gray 8px fields. The
 * rules below are read from the source of the shell, the four forms and the
 * Google button, so the retired look fails here before it ships again.
 *
 * Source guards only: the rendered widths (375, 768, 1095, 1440), the error
 * state and the captcha area are looked at in the isolated build.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const SHELL = "components/auth/auth-shell.tsx";
const FORMS = [
  "components/auth/sign-up-form.tsx",
  "components/auth/login-form.tsx",
  "components/auth/forgot-password-form.tsx",
  "components/auth/update-password-form.tsx",
];
const GOOGLE = "components/auth/google-auth-button.tsx";
const SURFACE = [SHELL, ...FORMS, GOOGLE].map((file) => ({ file, source: read(file) }));

/** The opening tag of every `<Input`, attributes and all. */
const inputTags = (source: string) => source.match(/<Input\b[\s\S]*?\/>/g) ?? [];

describe("the auth screens are on the ledger tokens", () => {
  it.each(SURFACE)("$file has no photo, gradient, glow, raw color or arbitrary shadow", ({ source }) => {
    expect(source).not.toMatch(/home2|bg-\[url/);
    expect(source).not.toMatch(/gradient/i);
    expect(source).not.toMatch(/shadow-\[|rgba\(/);
    // A raw hex or arbitrary color in a class string. The Google "G" mark's
    // four brand fills are SVG attributes, not classes, and stay.
    expect(source).not.toMatch(/(?:bg|text|border|ring|from|to|via)-\[#/);
    expect(source).not.toMatch(/\bbg-white\b/);
    // A raw Tailwind palette class (CLAUDE.md section 9.3): colors come from
    // the tokens in app/globals.css, never from slate-500, blue-600 or white.
    expect(source).not.toMatch(
      /\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b/,
    );
  });

  it.each(SURFACE)("$file keeps sentence case and nothing under 12px", ({ source }) => {
    expect(source).not.toMatch(/\buppercase\b|tracking-(?:wide|wider|widest)\b/);
    expect(source).not.toMatch(/text-(?:3xs|2xs)\b|text-\[(?:9|10|11)px\]/);
  });

  it.each(SURFACE)("$file takes its radius from the role scale (4px controls, nothing rounder)", ({ source }) => {
    // Side and corner variants too (rounded-t-xl, rounded-tl-2xl), up to 4xl.
    expect(source).not.toMatch(/rounded-(?:[a-z]{1,2}-)?(?:lg|xl|[2-4]xl|full|\[)/);
  });

  it.each(SURFACE)("$file uses no green or orange for emphasis and the text-safe red for error titles", ({ source }) => {
    // The Sign Rule: green and red are earned by the sign of a number or a
    // pass/fail against a target. A sent email or a waiting draft is neither.
    expect(source).not.toMatch(/(?:bg|text|border)-(?:positive|success|caution)/);
    // --destructive is for borders and fills; small error text takes
    // --destructive-text (5:1 or better on the paper).
    expect(source).not.toMatch(/text-destructive(?!-text)/);
  });

  it("sets the shell on paper in the page container, with no card and no decorative icons", () => {
    const shell = read(SHELL);
    expect(shell).toContain('<main id="main" className="min-h-[100dvh] bg-background text-foreground">');
    expect(shell).toContain("<div className={PAGE_CONTAINER}>");
    expect(shell).not.toMatch(/lucide-react|bg-card|onDark/);
    // The H1 and the aside's heading take the display voice; the supporting
    // copy is a ruled list, not icon tiles.
    expect(shell).toMatch(/<h1 className="font-display text-balance text-section-sm text-foreground sm:text-section">/);
    expect(shell).toContain("<RuledList");
  });

  it.each(FORMS)("%s leaves the field white with the Ink 2 border, 48px tall at the control radius", (file) => {
    const tags = inputTags(read(file));
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      // The Input primitive is bg-field, border-input and rounded-md. A call
      // site that passes its own background, border or radius is how the
      // fields went gray (bg-background behind FormControl) and 8px.
      expect(tag).not.toMatch(/\bbg-|\bborder-|\brounded-|\bshadow-|placeholder:/);
      expect(tag).toMatch(/className="h-12 (?:px-4|pl-4 pr-12) text-base md:text-base"/);
    }
  });

  it.each(FORMS)("%s submits with the 48px primitive button, no glow", (file) => {
    const source = read(file);
    expect(source.match(/type="submit"\s+size="cta"\s+className="w-full"/g)).toHaveLength(1);
  });

  it("keeps the Google button a 48px secondary control", () => {
    const google = read(GOOGLE);
    expect(google).toContain(
      'className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-input px-5 py-2 text-base font-semibold text-foreground transition-colors duration-150 hover:bg-band disabled:cursor-not-allowed disabled:opacity-60"',
    );
  });

  it("puts no eyebrow above the trial summary's heading", () => {
    const signUp = read("components/auth/sign-up-form.tsx");
    const heading = signUp.indexOf('id="evaluation-summary-title"');
    const line = signUp.indexOf("$0 today · no card");
    expect(heading).toBeGreaterThan(-1);
    expect(line).toBeGreaterThan(heading);
  });

  it("whitens a bg-background field inside FormControl too", () => {
    // FormControl is a Slot: its data-slot="form-control" replaces the
    // Input's data-slot="input", so the white-field override has to name it.
    const css = read("app/globals.css");
    expect(css).toContain(
      ':is([data-slot="input"], [data-slot="select-trigger"], [data-slot="form-control"], textarea).bg-background {\n    background-color: var(--field);',
    );
  });
});
