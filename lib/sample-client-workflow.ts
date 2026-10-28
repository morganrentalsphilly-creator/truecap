import { EMPTY_BUY_BOX, type NamedBuyBox } from "@/lib/buy-box";
import { screenDealForClients } from "@/lib/client-deal-screening";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

/** Illustrative buyers, never customer evidence or saved account records. */
export const SAMPLE_WORKFLOW_CLIENTS = [
  { id: "sample-income", name: "Income buyer", isArchived: false,
    financingAssumptions: { kind: "amortizing" as const, downPaymentPct: 25, interestRate: 6.6, loanTermYears: 30, pmiAnnualRatePct: 0 } },
  { id: "sample-higher-target", name: "Higher cash-flow target", isArchived: false,
    financingAssumptions: { kind: "amortizing" as const, downPaymentPct: 25, interestRate: 7.25, loanTermYears: 30, pmiAnnualRatePct: 0 } },
];
export const SAMPLE_WORKFLOW_BOXES: NamedBuyBox[] = SAMPLE_WORKFLOW_CLIENTS.map((client, index) => ({
  ...EMPTY_BUY_BOX,
  id: `box-${client.id}`, clientId: client.id, name: client.name,
  strategyKind: null, isDefault: false, sortOrder: index,
  minCashFlowMonthly: index === 0 ? 400 : 800, minDscr: 1.25,
}));

export function buildSampleClientWorkflow() {
  return screenDealForClients(SAMPLE_DEAL_VALUES, SAMPLE_WORKFLOW_CLIENTS, SAMPLE_WORKFLOW_BOXES);
}
