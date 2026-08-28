import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { buildEvaluationDealResourceKey } from "@/lib/evaluation-resource-key";

export type BuyBoxDealAuthorizationInput = {
  id: string;
  values: InvestmentFormValues | null;
};

/**
 * Pure authorization join used after the server has read the active evaluation
 * ledger once. Paid users bypass metering; evaluation users receive verdicts
 * only for snapshots whose exact SHA-256 key is present in that active ledger.
 */
export function resolveBuyBoxAuthorizedDealIds(args: {
  hasPaidAccess: boolean;
  evaluationActive: boolean;
  meteredResourceKeys: ReadonlySet<string>;
  deals: readonly BuyBoxDealAuthorizationInput[];
}): Set<string> {
  if (args.hasPaidAccess) {
    return new Set(args.deals.map((deal) => deal.id));
  }
  if (!args.evaluationActive || args.meteredResourceKeys.size === 0) {
    return new Set();
  }

  const authorized = new Set<string>();
  for (const deal of args.deals) {
    if (!deal.values) continue;
    const resourceKey = buildEvaluationDealResourceKey(deal.values);
    if (resourceKey && args.meteredResourceKeys.has(resourceKey)) {
      authorized.add(deal.id);
    }
  }
  return authorized;
}
