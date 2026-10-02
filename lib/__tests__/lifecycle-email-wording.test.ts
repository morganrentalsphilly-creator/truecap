/**
 * Wording guards for the lifecycle email content (report row P2-32) and for
 * the trial's numbers as the emails type them (fix-plan item 5.19).
 *
 * The content JSON is read as text by two operator scripts as well as by the
 * renderer, so the numbers stay typed in the files; this test is what keeps
 * them equal to the constants in lib/product-access.ts.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";

describe("lifecycle content wording", () => {
  const ROOT = process.cwd();
  const contentFiles = ["emails/daily-campaign-content", "emails/lifecycle-content"].flatMap((directory) =>
    readdirSync(join(ROOT, directory))
      .filter((name) => name.endsWith(".json"))
      .map((name) => `${directory}/${name}`),
  );
  const read = (file: string) => readFileSync(join(ROOT, file), "utf8");

  it("reads all 35 content files", () => {
    expect(contentFiles).toHaveLength(35);
  });

  it.each([
    ["calls the trial an evaluation", /\bevaluations?\b/i],
    ["says released or unreleased", /\b(?:un)?released\b/i],
    ["says 'a Offer Ceiling'", /\ba Offer Ceiling\b/],
    ["mentions a Stripe Price or the catalog check", /Stripe Price|catalog-verified/i],
    ["sells a 10-deal habit or 'full Pro'", /10-deal|\bfull Pro\b/i],
    ["uses the build word 'entitled'", /\bentitled\b/i],
    // Live /pricing (2026-10-02) has no immediate-charge or campaign-offer
    // wording; it says checkout shows the exact charge before you confirm.
    ["points at immediate-charge terms or a campaign offer on /pricing", /immediate-charge|campaign offer/i],
  ])("no email %s", (_label, pattern) => {
    const hits = contentFiles.filter((file) => pattern.test(read(file)));
    expect(hits).toEqual([]);
  });

  it("types the trial's numbers as the product constants have them", () => {
    const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
    const asNumber = (value: string) => words[value.toLowerCase()] ?? Number(value);
    const days: number[] = [];
    const limits: Array<[number, number]> = [];
    for (const file of contentFiles) {
      const text = read(file);
      for (const match of text.matchAll(/(\d+)-day,? no-card free trial/g)) days.push(Number(match[1]));
      for (const match of text.matchAll(
        /free trial for (?:up to )?(\w+) (?:complete Pro deals|Pro deal analyses) and (\w+) (?:full )?comparison/g,
      )) {
        limits.push([asNumber(match[1]!), asNumber(match[2]!)]);
      }
    }
    // Six emails state the length of the trial and four state its limits. A
    // new mention has to be written so these patterns still find it.
    expect(days).toHaveLength(6);
    expect(limits).toHaveLength(4);
    expect(new Set(days)).toEqual(new Set([PRODUCT_EVALUATION_DAYS]));
    for (const [deals, comparisons] of limits) {
      expect(deals).toBe(PRODUCT_EVALUATION_DEAL_LIMIT);
      expect(comparisons).toBe(PRODUCT_EVALUATION_COMPARISON_LIMIT);
    }
    // No other "N-day ... trial" phrasing slipped past the pattern above.
    const otherTrialLengths = contentFiles.flatMap((file) =>
      [...read(file).matchAll(/(\d+)[- ]day[^.]{0,40}\btrial\b/g)].map((match) => Number(match[1])),
    );
    expect(new Set(otherTrialLengths)).toEqual(new Set([PRODUCT_EVALUATION_DAYS]));
  });

  it("keeps the retired tagline and 'institutional-grade' out of the Supabase template copies", () => {
    const directory = "email-templates/supabase";
    const templates = readdirSync(join(ROOT, directory)).filter((name) => name.endsWith(".html"));
    expect(templates).toHaveLength(5);
    for (const name of templates) {
      const html = read(`${directory}/${name}`);
      expect(html, name).not.toMatch(/Professional real estate investment/i);
      expect(html, name).not.toMatch(/institutional-grade/i);
      expect(html, name).toContain("TrueCap · Rental property underwriting");
    }
  });
});
