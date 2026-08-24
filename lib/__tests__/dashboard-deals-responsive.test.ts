import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("../../components/dashboard/your-deals-table.tsx", import.meta.url)),
  "utf8"
);

describe("dashboard deal list responsive contract", () => {
  it("uses cards below lg and reserves the dense table for desktop", () => {
    expect(source).toContain('data-deal-layout="cards" className="border-t border-border lg:hidden"');
    expect(source).toContain(
      'data-deal-layout="table" className="hidden overflow-x-auto border-t border-border lg:block"'
    );

    const cards = source.indexOf('data-deal-layout="cards"');
    const table = source.indexOf('data-deal-layout="table"');
    expect(cards).toBeGreaterThan(-1);
    expect(table).toBeGreaterThan(cards);
  });

  it("preserves all sort choices and a reversible direction on cards", () => {
    expect(source).toContain('<option value="gap">Gap to ceiling</option>');
    expect(source).toContain('<option value="maxOffer">Offer Ceiling</option>');
    expect(source).toContain('<option value="score">Screening Index</option>');
    expect(source).toContain('<option value="address">Property</option>');
    expect(source).toContain("setDesc((current) => !current)");
  });

  it("keeps newly exposed sort and deal links at the 44px interaction baseline", () => {
    expect(source).toContain(
      'className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md'
    );
    expect(source).toContain(
      'className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg'
    );
    expect(source).toContain(
      'className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-md'
    );
  });
});
