import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { OpenLedger } from "@/components/ledger/open-ledger";
import { HeroSheet } from "@/components/home/hero-sheet";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import {
  buildSampleDealLedger,
  formatLedgerDollars,
} from "@/lib/sample-deal-ledger";
import { buildSampleDealSweep } from "@/lib/sample-deal-sweep";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Visible text: tags dropped, entities for the characters the ledger prints. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ");
}

// The homepage hero IS the sample deal on its sheet, set as HTML from the
// engine (DESIGN.md "The homepage", Blueprint): the schematic, the price
// track and the readout at the Offer Ceiling, then the ceiling itself. These
// tests render it and read the figures a visitor sees, so a sheet that
// drifted from the engine, or a hero that went back to typing numbers, fails
// here.
describe("the homepage hero sheet", () => {
  const ledger = buildSampleDealLedger()!;
  const sweep = buildSampleDealSweep()!;
  const { analysis, maxOffer } = calculateSampleDealOutcome();
  const hero = text(
    renderToStaticMarkup(
      <HeroSheet ledger={ledger} sweep={sweep} walkthroughHref="#how-it-works" />,
    ),
  );

  it("prints the engine's asking-price and Offer Ceiling figures", () => {
    expect(maxOffer).not.toBeNull();
    for (const figure of [
      formatLedgerDollars(ledger.askingPrice),
      formatLedgerDollars(maxOffer!.maxPrice),
      `${formatLedgerDollars(analysis.netCashFlow)}/mo`,
      `${formatLedgerDollars(maxOffer!.achieved.netCashFlow)}/mo`,
      analysis.dscr.toFixed(2),
      maxOffer!.achieved.dscr.toFixed(2),
    ]) {
      expect(hero).toContain(figure);
    }
    // Today's sample, as the founder approved it at checkpoint 1.
    expect(hero).toContain("$265,000");
    expect(hero).toContain("$236,000");
  });

  it("states the gap in dollars, never a vague miss (docs/voice.md)", () => {
    expect(hero).toContain(
      `Asking price is ${formatLedgerDollars(ledger.askingPrice - maxOffer!.maxPrice)} above the ceiling.`,
    );
    expect(hero).not.toMatch(/Asking misses the sample targets/);
    expect(hero).not.toMatch(/Screening Index/);
    const source = read("components/home/hero-sheet.tsx");
    expect(source).toContain('"Asking price clears the sample targets."');
  });

  it("marks the binding target and the pass or miss against the Buy Box", () => {
    // The readout's last row: at asking, then at the handle's price (the
    // ceiling on the server).
    expect(hero).toMatch(/Meets the Buy Box No Yes/);
    expect(hero).toMatch(/Binding target: cash flow/i);
    // The cash-flow target's chip reads "Meets" at the ceiling.
    expect(hero).toContain("Meets");
  });

  it("calls it the sample deal, never synthetic", () => {
    expect(hero).toContain("Sample deal");
    expect(hero).not.toMatch(/synthetic/i);
  });

  it("ships as a table with a caption and a real slider, not an image", () => {
    const html = renderToStaticMarkup(<HeroSheet ledger={ledger} sweep={sweep} />);
    expect(html).toContain("<table");
    expect(html).toContain("<caption");
    expect(html).not.toContain("<img");
    // Server-rendered at the ceiling: the slider's text alternative reads
    // the ceiling price and its cash flow (Radix adds aria-valuenow once it
    // has measured on the client), the track spans the sweep, and a static
    // handle stands at the ceiling until the island mounts.
    expect(html).toContain('role="slider"');
    expect(html).toContain(`aria-valuemin="${sweep.low}"`);
    expect(html).toContain(`aria-valuemax="${sweep.high}"`);
    expect(html).toMatch(/aria-valuetext="\$236,000: cash flow \$750 a month, meets the \$750 target"/);
    expect(html).toContain('data-static-handle=""');
    expect(html).toContain('data-hero-ledger=""');
  });
});

describe("the homepage hero", () => {
  const source = read("components/marketing/marketing-hero.tsx");

  it("renders the engine's sheet, not a screenshot or typed figures", () => {
    expect(source).toContain("buildSampleDealLedger()");
    expect(source).toContain("buildSampleDealSweep()");
    expect(source).toContain("<HeroSheet");
    expect(source).not.toMatch(
      /findProductShot|ProductShot|next\/image|priority/,
    );
    expect(source).not.toMatch(/\$\d{2,3},\d{3}/);
  });

  it("gives phones the verdict in one line, read from the same ledger", () => {
    // Below 640px the ledger starts under the fold, so the hero states its
    // verdict before the form; every value comes from the engine's ledger.
    expect(source).toContain('data-hero-verdict-line=""');
    expect(source).toContain("ledger.meetsTargets.asking");
    expect(source).toContain("formatLedgerDollars(ledger.offerCeiling)");
    expect(source).toMatch(/data-hero-verdict-line=""[^>]*sm:hidden/);
  });

  it("keeps the ledger's figures on the shared sample fixture", () => {
    expect(read("lib/sample-deal-ledger.ts")).toContain("SAMPLE_DEAL_FIXTURE");
    expect(read("lib/sample-deal-ledger.ts")).toContain(
      "calculateSampleDealOutcome()",
    );
  });
});

describe("the walkthrough ledger", () => {
  const ledger = buildSampleDealLedger()!;
  const html = renderToStaticMarkup(
    <OpenLedger
      ledger={ledger}
      notes={{
        price: { lead: "Inputs note.", body: "Body." },
        buyBox: { lead: "Screen note.", body: "Body." },
        ceiling: { lead: "Ceiling note.", body: "Body." },
      }}
    />,
  );

  it("opens every row by default with native disclosures", () => {
    const details = html.match(/<details[^>]*>/g) ?? [];
    expect(details.length).toBe(5);
    for (const tag of details) expect(tag).toContain("open");
  });

  it("sets each step note on the row it explains", () => {
    const visible = text(html);
    const at = (fragment: string) => {
      const index = visible.indexOf(fragment);
      expect(index, fragment).toBeGreaterThan(-1);
      return index;
    };
    // DESIGN.md's order: the listing on Price, the screen over the targets,
    // the ceiling over its total.
    expect(at("Price")).toBeLessThan(at("Inputs note."));
    expect(at("Inputs note.")).toBeLessThan(at("Down payment"));
    expect(at("Inputs note.")).toBeLessThan(at("Cash flow after reserves"));
    expect(at("Meets the Buy Box")).toBeLessThan(at("Screen note."));
    expect(at("Screen note.")).toBeLessThan(at("Misses by"));
    expect(visible.lastIndexOf("Offer Ceiling")).toBeLessThan(at("Ceiling note."));
  });

  it("shows the monthly arithmetic down to cash flow after reserves", () => {
    const visible = text(html);
    for (const line of ledger.monthly) expect(visible).toContain(line.label);
    expect(visible).toContain(
      `Misses by ${formatLedgerDollars(ledger.cashFlowShortfall!)}`,
    );
  });
});
