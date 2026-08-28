import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyBoxDealAuthorizationInput } from "@/lib/buy-box-evaluation-access";
import { resolveBuyBoxAuthorizedDealIds } from "@/lib/buy-box-evaluation-access";
import { getActiveMeteredEvaluationDealLedger } from "@/lib/evaluation-access-server";

/**
 * Paid-or-exact-resource gate shared by every saved-deal Buy Box aggregate.
 * Evaluation ledger usage is loaded once, then joined locally to any number of
 * deal snapshots. An expired/missing/error state authorizes no evaluation rows.
 */
export async function getBuyBoxAuthorizedDealIds(args: {
  supabase: SupabaseClient;
  userId: string;
  hasPaidAccess: boolean;
  deals: readonly BuyBoxDealAuthorizationInput[];
  now?: Date;
}): Promise<Set<string>> {
  if (args.hasPaidAccess) {
    return resolveBuyBoxAuthorizedDealIds({
      hasPaidAccess: true,
      evaluationActive: false,
      meteredResourceKeys: new Set(),
      deals: args.deals,
    });
  }

  const ledger = await getActiveMeteredEvaluationDealLedger(
    args.supabase,
    args.userId,
    args.now,
  );
  return resolveBuyBoxAuthorizedDealIds({
    hasPaidAccess: false,
    evaluationActive: ledger.active,
    meteredResourceKeys: ledger.resourceKeys,
    deals: args.deals,
  });
}
