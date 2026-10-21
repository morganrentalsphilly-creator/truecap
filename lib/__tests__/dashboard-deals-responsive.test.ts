import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("../../components/dashboard/your-deals-table.tsx", import.meta.url)),
  "utf8"
);

describe("dashboard deal list responsive contract", () => {
  it("uses rows on lines below xl and reserves the dense table for wide desktops", () => {
    // Re-anchored: your-deals-table.tsx — the phone and tablet layout is one
    // row per deal on soft lines, not a card per deal inside a card (the
    // 2026-10 audit, Q1; DESIGN.md "a card around a list"). Still one layout
    // per width: the list below xl and the table from xl, since at 1024px
    // beside the rail six columns clipped the gap (1095px capture).
    expect(source).toContain('data-deal-layout="list" className="xl:hidden"');
    expect(source).toContain(
      'data-deal-layout="table" className="hidden overflow-x-auto border-t border-foreground xl:block"'
    );
    expect(source).not.toContain('data-deal-layout="cards"');
    expect(source).not.toMatch(/<article\b/);

    const list = source.indexOf('data-deal-layout="list"');
    const table = source.indexOf('data-deal-layout="table"');
    expect(list).toBeGreaterThan(-1);
    expect(table).toBeGreaterThan(list);
  });

  it("preserves all sort choices and a reversible direction on cards", () => {
    expect(source).toContain('<option value="gap">Gap to ceiling</option>');
    expect(source).toContain('<option value="maxOffer">Offer Ceiling</option>');
    expect(source).toContain('<option value="score">Deal score</option>');
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
