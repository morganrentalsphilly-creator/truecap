import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  VERDICT_DISPLAY,
  signalDisplay,
  verdictDisplay,
  verdictLabel,
  verdictScreeningLabel,
} from "@/lib/verdict-display";
import { buildVerdictSentence } from "@/lib/verdict-sentence";
import { RECOMMENDATION_DISPLAY_LABELS, recommendationLabel } from "@/lib/deal-score";

/**
 * Guards for the Aug-2026 verdict-vocabulary unification.
 *
 * The defect class: five declarations of the same enum, four independently
 * maintained label tables, three surfaces printing the raw internal value to
 * users, and "Pass" meaning both "reject it" and "it clears". These tests
 * pin the single-source contract so the duplication cannot grow back.
 */

const ROOT = process.cwd();
const readRaw = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
/**
 * Source WITHOUT comments. These guards assert on what the app renders, and
 * the fixes themselves left explanatory comments quoting the old strings —
 * scanning raw text would match the very comments that document the fix.
 */
const read = (rel: string) =>
  readRaw(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const tracked = (globs: string[]) =>
  execFileSync("git", ["ls-files", ...globs], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);

const ALL_RECOMMENDATIONS = ["Strong Buy", "Buy", "Neutral", "Risky", "Avoid"] as const;

describe("verdict display — single source of wording", () => {
  it("maps every internal recommendation value", () => {
    for (const rec of ALL_RECOMMENDATIONS) {
      const d = verdictDisplay(rec);
      expect(d.label.length, rec).toBeGreaterThan(0);
      expect(d.shortLabel.length, rec).toBeGreaterThan(0);
      expect(d.srLabel.toLowerCase(), rec).toContain("screening result");
    }
    expect(Object.keys(VERDICT_DISPLAY).sort()).toEqual([...ALL_RECOMMENDATIONS].sort());
  });

  it("never renders a word that means the opposite elsewhere in the product", () => {
    // "Pass" collides with pipeline stage "Passed" (you walked away), the buy
    // box's per-criterion `pass: boolean` (it MEETS the bar), and the hero's
    // "clears at asking". It may not be a verdict label.
    for (const rec of ALL_RECOMMENDATIONS) {
      const d = verdictDisplay(rec);
      expect(d.label, rec).not.toBe("Pass");
      expect(d.shortLabel, rec).not.toBe("Pass");
    }
  });

  it("the negative tier remains a screening result, not an automatic decision", () => {
    expect(verdictLabel("Avoid")).toBe("Very weak screening result");
  });

  it("screening context keeps factual tier language", () => {
    expect(verdictScreeningLabel("Avoid")).toBe("Very weak screen");
    expect(verdictScreeningLabel("Strong Buy")).toBe(VERDICT_DISPLAY["Strong Buy"].shortLabel);
  });

  it("kebab signal slugs resolve through the same table", () => {
    expect(signalDisplay("strong-buy").label).toBe(verdictLabel("Strong Buy"));
    expect(signalDisplay("avoid").label).toBe(verdictLabel("Avoid"));
  });

  it("degrades to 'Not scored' rather than echoing an unknown value", () => {
    // Outside development the lookup must never echo its input back — the
    // tolerant echo is exactly how "strong-buy" and "Avoid" reached users.
    // (NODE_ENV is "test" here, so this exercises the non-throwing path;
    // the development throw is asserted by the source guard below.)
    expect(verdictDisplay("Hold").label).toBe("Not scored");
    expect(verdictDisplay(null).label).toBe("Not scored");
    expect(verdictDisplay("strong-buy").label).toBe("Not scored");
  });

  it("throws on an unmapped value in development", () => {
    const source = readRaw("lib/verdict-display.ts");
    expect(source).toContain('process.env.NODE_ENV === "development"');
    expect(source).toMatch(/throw new Error\(\s*\n?\s*`\[verdict-display\] Unmapped verdict value/);
  });

  it("deal-score's legacy exports delegate here instead of holding a second table", () => {
    for (const rec of ALL_RECOMMENDATIONS) {
      expect(recommendationLabel(rec)).toBe(verdictLabel(rec));
      expect(RECOMMENDATION_DISPLAY_LABELS[rec]).toBe(verdictLabel(rec));
    }
  });

  it("no surface declares its own copy of the label table", () => {
    // The four historical copies lived in lib/compare-metrics.ts,
    // saved-analyses-page-v2.tsx, the OG image, and deal-score.ts. Each must
    // now DERIVE. A literal "Excellent fit"/"Watchlist" is the fingerprint of
    // a resurrected copy.
    for (const file of [
      "lib/compare-metrics.ts",
      "components/investcalc/saved-analyses-page-v2.tsx",
      "app/d/[encoded]/opengraph-image.tsx",
      "lib/deal-score.ts",
    ]) {
      const source = read(file);
      expect(source, file).not.toMatch(/["']Excellent fit["']/);
      expect(source, file).not.toMatch(/["']Watchlist["']/);
    }
  });

  it("no user-facing surface prints a raw verdict enum", () => {
    // The three confirmed leaks: the deal workspace badge, the client portal
    // a buyer sees, and the compare picker row.
    // A bare {recommendation} as a CHILD (not as a prop value like
    // recommendation={recommendation}) is the leak signature.
    expect(read("app/dashboard/saved-analyses/[id]/page.tsx")).not.toMatch(
      />\s*\{recommendation\}/
    );
    expect(read("app/portal/[token]/page.tsx")).not.toMatch(/\{deal\.recommendation\}/);
    expect(read("components/investcalc/compare-deal-picker.tsx")).not.toMatch(
      /\$\{deal\.signal\}/
    );
  });

  it("the public methodology cannot state wording the product has moved past", () => {
    const methodology = read("app/methodology/page.tsx");
    expect(methodology).toContain("VERDICT_DISPLAY");
    expect(methodology).not.toMatch(/75\+ Excellent fit/);
  });

  it("'Pass' is gone as a verdict word across every render surface", () => {
    const files = tracked([
      "components/investcalc/*.tsx",
      "components/dashboard/*.tsx",
      "components/marketing/marketing-hero.tsx",
      "app/portal/*/page.tsx",
    ]);
    for (const file of files) {
      const source = read(file);
      // Allowed: the pipeline stage "Passed", buy-box `pass` booleans, and
      // "passes"/"password" style words. Banned: a bare "Pass" string literal.
      expect(source, file).not.toMatch(/["'`]Pass["'`]/);
      expect(source, file).not.toMatch(/["']Pass at asking["']/);
    }
  });
});

describe("verdict sentence — the results headline states the modeled relationship", () => {
  it("states when asking is above the Offer Ceiling", () => {
    const s = buildVerdictSentence({
      recommendation: "Avoid",
      purchasePrice: 310_000,
      maxOffer: 214_000,
    });
    expect(s.text).toBe("Asking is $96,000 above the modeled Offer Ceiling of $214,000.");
    expect(s.hasOffer).toBe(true);
  });

  it("does not infer an offer directive from a positive Screening Index", () => {
    const s = buildVerdictSentence({
      recommendation: "Buy",
      purchasePrice: 310_000,
      maxOffer: 214_000,
    });
    expect(s.text).toBe("Asking is $96,000 above the modeled Offer Ceiling of $214,000.");
  });

  it("says so plainly when the deal clears at asking", () => {
    const s = buildVerdictSentence({
      recommendation: "Strong Buy",
      purchasePrice: 200_000,
      maxOffer: 240_000,
    });
    expect(s.text).toBe("Asking is $40,000 below the modeled Offer Ceiling of $240,000.");
  });

  it("degrades without an Offer Ceiling without inventing a decision", () => {
    expect(
      buildVerdictSentence({ recommendation: "Avoid", purchasePrice: 310_000, maxOffer: null }).text
    ).toBe("Review your targets and assumptions at the $310,000 asking price.");
    expect(
      buildVerdictSentence({ recommendation: "Buy", purchasePrice: 310_000, maxOffer: null }).text
    ).toBe("Review your targets and assumptions at the $310,000 asking price.");
  });

  it("degrades to the label alone when nothing else is known", () => {
    expect(
      buildVerdictSentence({ recommendation: "Neutral", purchasePrice: null, maxOffer: null }).text
    ).toBe("Review your targets and assumptions.");
  });
});
