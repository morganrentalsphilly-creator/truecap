import { describe, it, expect } from "vitest";
import {
  buildDealsCsv,
  dealsCsvFilename,
  DEALS_CSV_HEADER,
  type DealsCsvItem,
} from "@/lib/deals-csv";

const HEADER_LINE = DEALS_CSV_HEADER.join(",");

function makeItem(overrides: Partial<DealsCsvItem> = {}): DealsCsvItem {
  return {
    address: "123 Main St, Philadelphia, PA 19147",
    title: "123 Main St",
    stageLabel: "Analyzing",
    status: "active",
    // Callers pass the DISPLAY label (verdictLabel), never the internal enum.
    recommendation: "Worth pursuing",
    score: 78,
    purchasePrice: 250000,
    netCashFlowMonthly: 312.456,
    cocReturnPct: 8.25,
    capRatePct: 6.1,
    dscr: 1.31,
    isCashPurchase: false,
    cashToClose: 62500,
    tenYearRoiPct: null,
    tags: ["BRRRR", "Section 8"],
    createdAt: "2026-06-15T14:30:00.000Z",
    closeDate: null,
    ...overrides,
  };
}

/** Split into RFC-4180 records; asserts the trailing CRLF exists. */
function records(csv: string): string[] {
  expect(csv.endsWith("\r\n")).toBe(true);
  return csv.slice(0, -2).split("\r\n");
}

describe("buildDealsCsv", () => {
  it("emits header only (with trailing CRLF) for an empty list", () => {
    expect(buildDealsCsv([])).toBe(`${HEADER_LINE}\r\n`);
  });

  it("uses CRLF line endings between records", () => {
    const csv = buildDealsCsv([makeItem(), makeItem({ title: "Second" })]);
    expect(records(csv)).toHaveLength(3); // header + 2 rows
    expect(csv).not.toMatch(/[^\r]\n/); // no bare LF
  });

  it("serializes a full row in header order", () => {
    const csv = buildDealsCsv([makeItem({ closeDate: "2026-05-01" })]);
    const row = records(csv)[1];
    expect(row).toBe(
      [
        '"123 Main St, Philadelphia, PA 19147"',
        "123 Main St",
        "Analyzing",
        "Active",
        "Worth pursuing",
        "78",
        "250000",
        "312.46", // rounded to 2 decimals
        "8.25",
        "6.1",
        "1.31",
        "62500",
        "", // 10-yr ROI not carried on list rows
        "BRRRR;Section 8",
        "2026-06-15",
        "2026-05-01",
      ].join(",")
    );
  });

  describe("RFC 4180 escaping", () => {
    it("quotes fields containing commas", () => {
      const csv = buildDealsCsv([makeItem({ address: "1 Elm St, Unit B, Austin, TX" })]);
      expect(records(csv)[1].startsWith('"1 Elm St, Unit B, Austin, TX",')).toBe(true);
    });

    it("doubles embedded quotes and wraps the field", () => {
      const csv = buildDealsCsv([makeItem({ address: null, title: 'The "Gem" duplex' })]);
      expect(records(csv)[1]).toContain('"The ""Gem"" duplex"');
    });

    it("quotes fields containing newlines (record count is unaffected)", () => {
      const csv = buildDealsCsv([makeItem({ address: null, title: "Line one\nLine two" })]);
      expect(csv).toContain('"Line one\nLine two"');
      // The embedded LF lives inside quotes; CRLF still splits exactly 2 records.
      expect(csv.slice(0, -2).split("\r\n")).toHaveLength(2);
    });

    it("keeps plain fields unquoted", () => {
      const csv = buildDealsCsv([makeItem({ address: "10 Oak Ave", tags: [] })]);
      expect(records(csv)[1].startsWith("10 Oak Ave,")).toBe(true);
    });
  });

  describe("formula-injection hardening", () => {
    it.each(["=2+2", "+ACME", "-cmd", "@SUM"])(
      "prefixes a cell starting with %s's leading char with a single quote",
      (payload) => {
        const csv = buildDealsCsv([makeItem({ address: null, title: payload, tags: [] })]);
        expect(records(csv)[1]).toContain(`,'${payload},`);
      }
    );

    it("hardens then quotes when the payload also contains commas", () => {
      const payload = '=HYPERLINK("http://evil.test","click")';
      const csv = buildDealsCsv([makeItem({ address: payload })]);
      // Single-quote prefix applied first, then RFC-4180 quoting on top.
      expect(records(csv)[1].startsWith('"\'=HYPERLINK(""http://evil.test"",""click"")"')).toBe(true);
    });

    it("prefixes injectable tags after semicolon-joining", () => {
      const csv = buildDealsCsv([makeItem({ tags: ["=IMPORTXML(x)", "safe"] })]);
      expect(records(csv)[1]).toContain("'=IMPORTXML(x);safe");
    });

    it("applies to negative numbers too (spec: any leading -)", () => {
      const csv = buildDealsCsv([makeItem({ netCashFlowMonthly: -450 })]);
      expect(records(csv)[1]).toContain(",'-450,");
    });
  });

  describe("null / missing metrics", () => {
    it("renders null metrics as empty cells and keeps the column count", () => {
      const csv = buildDealsCsv([
        makeItem({
          address: null,
          title: null,
          stageLabel: null,
          score: null,
          purchasePrice: null,
          netCashFlowMonthly: null,
          cocReturnPct: null,
          capRatePct: null,
          dscr: null,
          cashToClose: null,
          tenYearRoiPct: null,
          tags: [],
          closeDate: null,
        }),
      ]);
      const row = records(csv)[1];
      expect(row.split(",")).toHaveLength(DEALS_CSV_HEADER.length);
      expect(row).toBe(`,,,Active,Worth pursuing,,,,,,,,,,2026-06-15,`);
    });

    it("renders NaN as an empty cell", () => {
      // Comma-free address so naive split(",") indexing lines up with columns.
      const csv = buildDealsCsv([makeItem({ address: "10 Oak Ave", capRatePct: Number.NaN })]);
      expect(records(csv)[1].split(",")[9]).toBe("");
    });
  });

  it("renders a cash-purchase DSCR (stored as 0) as 'Cash'", () => {
    const csv = buildDealsCsv([makeItem({ address: "10 Oak Ave", dscr: 0, isCashPurchase: true })]);
    expect(records(csv)[1].split(",")[10]).toBe("Cash");
  });

  it("renders a FINANCED deal with DSCR <= 0 as the number, not 'Cash'", () => {
    // Negative NOI on a financed deal → DSCR is a real (bad) number the
    // investor needs to see. Labeling it "Cash" hid a failing deal.
    // "-0.42" starts with "-" so the injection hardening quote-prefixes it,
    // same as every negative numeric cell.
    const negative = buildDealsCsv([
      makeItem({ address: "10 Oak Ave", dscr: -0.42, isCashPurchase: false }),
    ]);
    expect(records(negative)[1].split(",")[10]).toBe("'-0.42");

    const zero = buildDealsCsv([
      makeItem({ address: "10 Oak Ave", dscr: 0, isCashPurchase: false }),
    ]);
    expect(records(zero)[1].split(",")[10]).toBe("0.00");
  });

  it("renders 'Cash' for a cash purchase even when dscr is missing", () => {
    const csv = buildDealsCsv([
      makeItem({ address: "10 Oak Ave", dscr: null, isCashPurchase: true }),
    ]);
    expect(records(csv)[1].split(",")[10]).toBe("Cash");
  });

  it("passes an unparseable createdAt through untouched", () => {
    const csv = buildDealsCsv([makeItem({ createdAt: "not-a-date" })]);
    expect(records(csv)[1]).toContain(",not-a-date,");
  });
});

describe("dealsCsvFilename", () => {
  it("formats the local date as truecap-deals-YYYY-MM-DD.csv", () => {
    // Local-time constructor — immune to the runner's timezone.
    expect(dealsCsvFilename(new Date(2026, 6, 2, 9, 30))).toBe("truecap-deals-2026-07-02.csv");
  });

  it("zero-pads month and day", () => {
    expect(dealsCsvFilename(new Date(2026, 0, 5))).toBe("truecap-deals-2026-01-05.csv");
  });
});
