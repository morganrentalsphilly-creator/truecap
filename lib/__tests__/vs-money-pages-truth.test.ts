/**
 * Truth guards for the three comparison pages about financial products:
 * /vs/baselane (a bank product), /vs/arrived and /vs/fundrise (securities).
 *
 * The 2026-10 go-to-market audit found each page stating things the vendor's
 * own site contradicted (report rows P0-05, P0-08, P1-20): a bank partner and
 * a coverage limit Baselane does not list, "ACH free" against a published
 * fee, a "lowest minimums" superlative, a payout cadence and a tax line
 * Arrived's help center contradicts, and a return range for Fundrise that its
 * own client-returns page does not show. The pages were corrected against the
 * vendors' pages as rendered on 2026-10-02.
 *
 * Most rules here are rules, not snapshots of a vendor's sentence: the weekly
 * SEO loop may refresh a /vs page and cannot edit this file. Two sentences
 * are pinned word for word because they are approved wording about deposit
 * insurance and tax, which only the owner changes: the Baselane FDIC answer
 * and the Arrived TL;DR line.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** Source as a reader meets it: comments out, entities decoded, JSX line wraps joined. */
const visible = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/\{"\s*"\}/g, " ")
    .replace(/&apos;|&rsquo;/g, "'")
    .replace(/\s+/g, " ");

const page = (slug: string) => visible(read(`app/vs/${slug}/page.tsx`));
const card = (slug: string) => visible(read(`app/vs/${slug}/opengraph-image.tsx`));
const SLUGS = ["baselane", "arrived", "fundrise"] as const;

/** Every percentage in the text, with the words that follow it ("0.15% annual advisory fee"). */
function percentages(text: string): string[] {
  return [...text.matchAll(/[-+±~]?\d[\d.,]*(?:\s?-\s?\d[\d.,]*)?\s?%/g)].map((match) =>
    text.slice(match.index, match.index + match[0].length + 45),
  );
}

/** A fee ("0.85% annual asset management fee") or a named rule of thumb ("1% rule calculator"). */
const FEE_OR_RULE = /^\S+%\s+(?:[\w-]+\s+){0,4}fees?\b|^\S+%[- ]rule\b/i;

describe("the comparison pages about financial products", () => {
  it("reads all three pages and their cards", () => {
    for (const slug of SLUGS) {
      expect(page(slug).length, slug).toBeGreaterThan(4000);
      expect(page(slug), slug).toContain("const MATRIX");
      expect(card(slug), slug).toContain("tagline:");
    }
  });

  it("does not grade its own comparison in the page or its metadata", () => {
    for (const slug of SLUGS) {
      expect(page(slug), slug).not.toMatch(/\bhonest (?:comparison|side-by-side|take)\b|\ba fair\b|\bunbiased\b/i);
    }
  });

  it("links the vendor page each competitor fact was checked against", () => {
    expect(page("baselane")).toContain("https://www.baselane.com/pricing");
    expect(page("baselane")).toContain("https://www.baselane.com/rental-property-roi-calculator");
    expect(page("arrived")).toContain("https://help.arrived.com/en/articles/10263157");
    expect(page("arrived")).toContain("https://help.arrived.com/en/articles/4496443");
    expect(page("fundrise")).toContain("https://fundrise.com/how-it-works");
    expect(page("fundrise")).toContain("https://fundrise.com/client-returns");
  });

  describe("/vs/baselane", () => {
    const text = page("baselane");

    it("keeps the retired Baselane claims out", () => {
      // Baselane's pages name one bank, list an ACH fee, price Smart at $20 a
      // month on an annual plan and publish a free ROI calculator.
      expect(text).not.toMatch(/Blue\s+Ridge/i);
      expect(text).not.toMatch(/ACH free|free ACH/i);
      expect(text).not.toMatch(/~\s?\$22/);
      expect(text).not.toMatch(/Not modeled/i);
      expect(text).not.toMatch(/We don't compete/i);
      expect(text).not.toMatch(/\$250k per depositor/i);
      // Baselane says it "is not an FDIC-insured bank": the accounts are
      // provided by a bank that is a member.
      expect(text).not.toMatch(/FDIC-insured (?:business|bank|checking|account)/i);
    });

    it("states deposit insurance in the approved wording and links Baselane's own article", () => {
      for (const sentence of [
        "Baselane is a financial technology company, not a bank.",
        "Banking is provided by Thread Bank, Member FDIC.",
        "Deposits can qualify for up to $3,000,000 in FDIC coverage through Thread Bank's deposit sweep program, up to $250,000 at each program bank.",
        "Baselane says the threshold can change.",
      ]) {
        expect(text).toContain(sentence);
      }
      expect(text).toContain(
        "https://support.baselane.com/hc/en-us/articles/25483539080603-Is-my-Baselane-account-FDIC-insured",
      );
      // The answer no longer opens with a bare "Yes": Baselane itself is not the insured bank.
      expect(text).not.toMatch(/question: "Is Baselane FDIC-insured\?", answer: \( <> Yes\b/);
    });

    it("admits Baselane's ROI calculator and does not score the 10-year row a TrueCap win", () => {
      expect(text).toMatch(/ROI calculator/);
      const row = /feature: "10-year projection",[^}]*winner: "(\w+)"/.exec(text);
      expect(row?.[1]).toBe("tie");
    });

    it("states the ACH fee with its waiver, never as free", () => {
      const row = /feature: "Rent collection \(ACH\)",[^}]*baselane: "([^"]*)"/.exec(text);
      expect(row?.[1]).toMatch(/\$\d/);
      expect(row?.[1]).toMatch(/waived/i);
    });
  });

  describe("/vs/arrived", () => {
    const text = page("arrived");

    it("keeps the retired Arrived claims out", () => {
      // Arrived's help center: investors get the tax benefits of depreciation,
      // dividends are monthly, the minimum is $100 in every offering, and the
      // fee is a sourcing fee plus a quarterly AUM fee that varies by product.
      expect(text).not.toMatch(/giving up depreciation/i);
      expect(text).not.toMatch(/\b(?:lowest|smallest|cheapest) minimums?\b/i);
      expect(text).not.toMatch(/quarterly (?:distributions|dividends)/i);
      expect(text).not.toMatch(/\$100 per share/i);
      expect(text).not.toMatch(/1% AUM/i);
      expect(text).not.toMatch(/\+ tax benefits/i);
    });

    it("carries the approved tax sentence and the neutral side-by-side sentence", () => {
      expect(text).toContain("You're fine without direct control of depreciation or a 1031 exchange.");
      expect(text).toContain("You can hold direct properties and Arrived shares side by side.");
    });
  });

  describe("/vs/fundrise", () => {
    const text = page("fundrise");

    it("does not call Fundrise a REIT in the title, the page, the FAQ or the card", () => {
      // fundrise.com describes its registered real estate funds as interval
      // funds and its product as funds of private assets.
      expect(text).not.toMatch(/REIT/);
      expect(text).not.toMatch(/non-traded/i);
      expect(card("fundrise")).not.toMatch(/REIT|non-traded/i);
    });

    it("states no tax treatment and no account tiers for Fundrise", () => {
      expect(text).not.toMatch(/K-1/i);
      expect(text).not.toMatch(/depreciation pass-through/i);
      expect(text).not.toMatch(/\bStarter\b|\$1k|higher tiers/i);
      expect(text).not.toMatch(/\+ tax benefits/i);
      // The tax row points to Fundrise and asserts nothing. The depreciation
      // and 1031 sentence approved for /vs/arrived was approved for that page only.
      const taxCell = /feature: "Ownership tax treatment",[^}]*fundrise: "([^"]*)"/.exec(text);
      expect(taxCell?.[1]).toMatch(/^See Fundrise/);
      expect(text).not.toMatch(/fine (?:without|giving up) [^.]{0,40}depreciation/i);
    });

    it("links Fundrise's client returns page instead of quoting a return", () => {
      expect(text).not.toMatch(/8\s?-\s?12\s?%/);
      expect(text).not.toMatch(/historical(?:ly)? [^.]{0,40}returns? of/i);
    });
  });

  it("prints a percentage about Arrived or Fundrise only for a fee", () => {
    // Both sell securities. A return, yield or appreciation figure is theirs
    // to publish and goes stale; the pages link the vendor instead. A fee
    // percentage may stay while the vendor's own page states it.
    for (const slug of ["arrived", "fundrise"] as const) {
      const strays = percentages(page(slug)).filter((context) => !FEE_OR_RULE.test(context));
      expect(strays, slug).toEqual([]);
      expect(percentages(card(slug)), `${slug} card`).toEqual([]);
    }
    // The rule reads real figures: /vs/fundrise states Fundrise's two fees.
    expect(percentages(page("fundrise")).length).toBeGreaterThanOrEqual(2);
    for (const audited of [
      "Fund-level forward returns (historical 8-12%)",
      "historical 8-12% blended returns aren't comparable",
      "a 6.24% return in 2025, after fees",
    ]) {
      expect(percentages(audited).filter((context) => !FEE_OR_RULE.test(context)), audited).toHaveLength(1);
    }
    for (const allowed of ["a 0.15% annual advisory fee", "pay a 0.85% annual asset management fee", "the 1% rule calculator"]) {
      expect(percentages(allowed).filter((context) => !FEE_OR_RULE.test(context)), allowed).toEqual([]);
    }
  });

  it("says on each card what the competitor is, with no figure and no coverage or return claim", () => {
    for (const slug of SLUGS) {
      const tagline = /tagline:\s*"((?:[^"\\]|\\.)*)"/.exec(read(`app/vs/${slug}/opengraph-image.tsx`))?.[1] ?? "";
      expect(tagline, slug).toContain("TrueCap");
      expect(tagline, slug).not.toMatch(/\d/);
      expect(tagline, slug).not.toMatch(/FDIC|insured|returns?\b|yield|dividend/i);
      // The preview text printed beside the card is the card's own line.
      expect(read(`app/vs/${slug}/page.tsx`), slug).toContain(`"${tagline}"`);
    }
  });
});
