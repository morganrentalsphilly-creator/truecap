import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  buildEvaluationComparisonResourceKey,
  buildEvaluationDealResourceKey,
} from "@/lib/evaluation-resource-key";

export type ActiveEvaluationDealLedger = {
  active: boolean;
  resourceKeys: Set<string>;
};

/**
 * Batch reader for list/aggregate surfaces. A user can have at most three deal
 * rows, so reading the active ledger once is both cheaper and safer than an
 * authorization query per saved deal. Any expiry/query ambiguity fails closed.
 */
export async function getActiveMeteredEvaluationDealLedger(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<ActiveEvaluationDealLedger> {
  const { data: evaluation, error: evaluationError } = await supabase
    .from("product_evaluations")
    .select("expires_at")
    .eq("user_id", userId)
    .gt("expires_at", now.toISOString())
    .maybeSingle();
  if (evaluationError || !evaluation) {
    return { active: false, resourceKeys: new Set() };
  }

  const { data: usage, error: usageError } = await supabase
    .from("product_evaluation_usage")
    .select("resource_key")
    .eq("user_id", userId)
    .eq("kind", "deal");
  if (usageError) return { active: false, resourceKeys: new Set() };

  return {
    active: true,
    resourceKeys: new Set(
      ((usage ?? []) as { resource_key?: unknown }[])
        .map((row) => row.resource_key)
        .filter((key): key is string => typeof key === "string" && key.length > 0),
    ),
  };
}

/**
 * Authorize a deal-level evaluation artifact against the immutable ledger.
 * Remaining allowance is intentionally not sufficient: it would let callers
 * invoke Pro actions for arbitrary deals without first consuming one of the
 * three runs. Every query/error ambiguity fails closed.
 */
export async function activeMeteredEvaluationDealGrantsAccess(
  supabase: SupabaseClient,
  userId: string,
  values: InvestmentFormValues,
  now: Date = new Date(),
): Promise<boolean> {
  const resourceKey = buildEvaluationDealResourceKey(values);
  if (!resourceKey) return false;

  const { data: evaluation, error: evaluationError } = await supabase
    .from("product_evaluations")
    .select("expires_at")
    .eq("user_id", userId)
    .gt("expires_at", now.toISOString())
    .maybeSingle();
  if (evaluationError || !evaluation) return false;

  const { data: usage, error: usageError } = await supabase
    .from("product_evaluation_usage")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "deal")
    .eq("resource_key", resourceKey)
    .maybeSingle();
  return !usageError && Boolean(usage);
}

/** Read-only authorization for revisiting the one exact metered comparison. */
export async function activeMeteredEvaluationComparisonGrantsAccess(
  supabase: SupabaseClient,
  userId: string,
  dealIds: readonly string[],
  now: Date = new Date(),
): Promise<boolean> {
  const resourceKey = buildEvaluationComparisonResourceKey(dealIds);
  if (!resourceKey) return false;

  const { data: evaluation, error: evaluationError } = await supabase
    .from("product_evaluations")
    .select("expires_at")
    .eq("user_id", userId)
    .gt("expires_at", now.toISOString())
    .maybeSingle();
  if (evaluationError || !evaluation) return false;

  const { data: usage, error: usageError } = await supabase
    .from("product_evaluation_usage")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "comparison")
    .eq("resource_key", resourceKey)
    .maybeSingle();
  return !usageError && Boolean(usage);
}
