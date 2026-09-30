import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { OpenLedger } from "@/components/ledger/open-ledger";
import { VerdictLedger } from "@/components/ledger/verdict-ledger";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import {
  buildSampleDealLedger,
  formatLedgerDollars,
} from "@/lib/sample-deal-ledger";

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

// The homepage hero IS the sample deal's Verdict Ledger, set as HTML from the
// engine (DESIGN.md "The ledger as the hero"). These tests render it and read
// the figures a visitor sees, so a ledger that drifted from the engine, or a
// hero that went back to typing numbers, fails here.
describe("the homepage Verdict Ledger", () => {
  const ledger = buildSampleDealLedger()!;
  const { analysis, maxOffer } = calculateSampleDealOutcome();
  const hero = text(
    renderToStaticMarkup(
      <VerdictLedger ledger={ledger} walkthroughHref="#how-it-works" />,
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
    const source = read("components/ledger/verdict-ledger.tsx");
    expect(source).toContain('"Asking price clears the sample targets."');
  });

  it("marks the binding target and the pass or miss against the Buy Box", () => {
    expect(hero).toMatch(/Meets the Buy Box No Yes/);
    expect(hero).toContain("binding target");
    expect(hero).toMatch(/Binding target: cash flow/i);
  });

  it("calls it the sample deal, never synthetic", () => {
    expect(hero).toContain("Sample deal");
    expect(hero).not.toMatch(/synthetic/i);
  });

  it("ships as a table with a caption, not an image", () => {
    const html = renderToStaticMarkup(<VerdictLedger ledger={ledger} />);
    expect(html).toContain("<table");
    expect(html).toContain("<caption");
    expect(html).not.toContain("<img");
  });
});

describe("the homepage hero", () => {
  const source = read("components/marketing/marketing-hero.tsx");

  it("renders the engine's ledger, not a screenshot or typed figures", () => {
    expect(source).toContain("buildSampleDealLedger()");
    expect(source).toContain("<VerdictLedger");
    expect(source).not.toMatch(
      /findProductShot|ProductShot|next\/image|priority/,
    );
    expect(source).not.toMatch(/\$\d{2,3},\d{3}/);
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
        cashFlow: { lead: "Inputs note.", body: "Body." },
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
    // Inputs over the monthly arithmetic, the screen over the targets, the
    // ceiling over its total.
    expect(at("Cash flow after reserves")).toBeLessThan(at("Inputs note."));
    expect(at("Inputs note.")).toBeLessThan(at("Rent"));
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
