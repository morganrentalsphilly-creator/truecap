import { describe, expect, it } from "vitest";
import {
  buildSampleDealLedger,
  formatLedgerDollars,
} from "@/lib/sample-deal-ledger";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";

// The homepage prints this ledger in whole dollars. A visitor who adds a
// column should get the total the page prints, so the rounded rows must foot
// to the rounded totals exactly, in both columns, and every total must be the
// engine's own figure, not a sum the page computed.
describe("the sample deal ledger the homepage prints", () => {
  const ledger = buildSampleDealLedger();
  const { analysis, maxOffer } = calculateSampleDealOutcome();

  it("reads both columns from the engine", () => {
    expect(ledger).not.toBeNull();
    expect(maxOffer).not.toBeNull();
    expect(ledger!.askingPrice).toBe(SAMPLE_DEAL_FIXTURE.values.purchasePrice);
    expect(ledger!.offerCeiling).toBe(maxOffer!.maxPrice);
    expect(ledger!.cashFlowMonthly.asking).toBe(analysis.netCashFlow);
    expect(ledger!.cashFlowMonthly.ceiling).toBe(
      maxOffer!.achieved.netCashFlow,
    );
    expect(ledger!.dscr.asking).toBe(analysis.dscr);
    expect(ledger!.dscr.ceiling).toBe(maxOffer!.achieved.dscr);
    expect(ledger!.belowAsking).toBe(
      ledger!.askingPrice - ledger!.offerCeiling,
    );
  });

  for (const column of ["asking", "ceiling"] as const) {
    it(`foots the ${column} column to the printed NOI and cash flow`, () => {
      const lines = ledger!.monthly;
      const noiIndex = lines.findIndex(
        (line) => line.label === "Net operating income",
      );
      const cashFlowIndex = lines.length - 1;
      expect(noiIndex).toBeGreaterThan(0);
      expect(lines[cashFlowIndex].total).toBe(true);

      const printed = (value: number) => Math.round(value);
      const aboveNoi = lines
        .slice(0, noiIndex)
        .reduce((sum, line) => sum + printed(line.value[column]), 0);
      expect(aboveNoi).toBe(printed(lines[noiIndex].value[column]));

      const belowNoi = lines
        .slice(noiIndex + 1, cashFlowIndex)
        .reduce((sum, line) => sum + printed(line.value[column]), 0);
      expect(printed(lines[noiIndex].value[column]) + belowNoi).toBe(
        printed(lines[cashFlowIndex].value[column]),
      );

      const engine = column === "asking" ? analysis : maxOffer!.achieved;
      expect(lines[noiIndex].value[column]).toBeCloseTo(
        engine.noiAnnual / 12,
        6,
      );
      expect(lines[cashFlowIndex].value[column]).toBe(engine.netCashFlow);
    });
  }

  it("states the verdict the engine reaches", () => {
    expect(ledger!.meetsTargets).toEqual({ asking: false, ceiling: true });
    expect(ledger!.cashFlowShortfall).toBeCloseTo(
      SAMPLE_DEAL_FIXTURE.maoTarget.monthlyCashFlow! - analysis.netCashFlow,
      6,
    );
    expect(ledger!.bindingTarget).toMatch(/cash flow/i);
    expect(ledger!.nextConstraint).toMatch(/DSCR/);
  });

  it("prints costs with a true minus sign and whole dollars", () => {
    expect(formatLedgerDollars(-152.6)).toBe("−$153");
    expect(formatLedgerDollars(265000)).toBe("$265,000");
    expect(formatLedgerDollars(-0.4)).toBe("$0");
  });
});
