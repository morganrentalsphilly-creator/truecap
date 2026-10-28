import { describe, expect, it } from "vitest";
import { buildSampleClientWorkflow, SAMPLE_WORKFLOW_BOXES, SAMPLE_WORKFLOW_CLIENTS } from "@/lib/sample-client-workflow";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { applyClientFinancing } from "@/lib/client-underwriting-preferences";
import { screenDealForClients } from "@/lib/client-deal-screening";

describe("public client workflow example", () => {
  it("shows different client ceilings that satisfy their stated cash-flow targets", () => {
    const rows = buildSampleClientWorkflow();
    expect(rows).toHaveLength(2);
    expect(rows[0].offerCeiling).toBeGreaterThan(rows[1].offerCeiling!);
    rows.forEach((row, index) => {
      expect(row.offerCeiling).not.toBeNull();
      const values = applyClientFinancing({ ...SAMPLE_DEAL_VALUES, purchasePrice: row.offerCeiling! }, SAMPLE_WORKFLOW_CLIENTS[index].financingAssumptions);
      expect(calculateAnalysis(values).netCashFlow).toBeGreaterThanOrEqual(SAMPLE_WORKFLOW_BOXES[index].minCashFlowMonthly!);
    });
  });
  it("screens a full 100-client workspace with distinct criteria", () => {
    const clients = Array.from({ length: 100 }, (_, index) => ({ ...SAMPLE_WORKFLOW_CLIENTS[index % 2], id: `client-${index}` }));
    const boxes = clients.map((client, index) => ({ ...SAMPLE_WORKFLOW_BOXES[index % 2], id: `box-${index}`, clientId: client.id, minIrrPct: index % 2 === 0 ? 8 : null }));
    const started = performance.now();
    const rows = screenDealForClients(SAMPLE_DEAL_VALUES, clients, boxes);
    console.info(`100-client screening: ${Math.round(performance.now() - started)} ms (local compute only)`);
    expect(rows).toHaveLength(100);
    expect(new Set(rows.map(row => row.clientId)).size).toBe(100);
    expect(rows.every(row => row.offerCeiling != null)).toBe(true);
  });
});
