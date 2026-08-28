"use server";

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasPaidPlanSubscription } from "@/lib/entitlements";
import {
  buildEvaluationComparisonResourceKey,
  buildEvaluationDealResourceKey,
} from "@/lib/evaluation-resource-key";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";
import { captureServerEvent } from "@/lib/posthog-server";
import { activeAnonymousDecisionGrantMatches } from "@/lib/anonymous-decision-grant";

const usageSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("deal"),
      values: releasedInvestmentFormSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("comparison"),
      dealIds: z.array(z.string().uuid()).min(2).max(4),
    })
    .strict(),
]);

export type ConsumeProductEvaluationResult =
  | {
      ok: true;
      access: "paid" | "evaluation";
      dealsUsed: number | null;
      comparisonsUsed: number | null;
      expiresAt: string | null;
      /** True only when this call inserted a new ledger row. */
      wasNewUsage: boolean;
      startedAt: string | null;
    }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "NOT_ELIGIBLE" | "EXPIRED" | "LIMIT_REACHED" | "SERVER_ERROR";
      message: string;
    };

/**
 * Atomically consume one distinct evaluation result. The caller submits the
 * validated resource itself, never a caller-chosen ledger key; this server
 * derives the collision-resistant key used by the PDF authorization gate.
 * Replaying the same resource is idempotent, and the database row lock plus
 * unique constraint make concurrent submissions count once.
 */
export async function consumeProductEvaluationUsageAction(
  input: unknown
): Promise<ConsumeProductEvaluationResult> {
  const parsed = usageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "SERVER_ERROR", message: "Could not verify this evaluation result." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Create an account to start the evaluation." };
  }

  if (await hasPaidPlanSubscription(supabase, user.id)) {
    return {
      ok: true,
      access: "paid",
      dealsUsed: null,
      comparisonsUsed: null,
      expiresAt: null,
      wasNewUsage: false,
      startedAt: null,
    };
  }

  // The no-signup decision is intentionally additive to the post-signup
  // evaluation: the launch promise is one complete decision first, then
  // three distinct Pro deal runs. When the auth handoff auto-runs that exact
  // cookie-bound resource so it can be saved, do not debit it from the three.
  // The signed HttpOnly grant is value-bound and independently verified by
  // every exact-result/report action; a changed input falls through to the
  // atomic evaluation ledger below.
  if (
    parsed.data.kind === "deal" &&
    (await activeAnonymousDecisionGrantMatches(parsed.data.values))
  ) {
    return {
      ok: true,
      access: "evaluation",
      dealsUsed: 0,
      comparisonsUsed: 0,
      expiresAt: null,
      wasNewUsage: false,
      startedAt: null,
    };
  }

  const resourceKey =
    parsed.data.kind === "deal"
      ? buildEvaluationDealResourceKey(parsed.data.values)
      : buildEvaluationComparisonResourceKey(parsed.data.dealIds);
  if (!resourceKey) {
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Could not verify this evaluation result.",
    };
  }

  const { data, error } = await supabase.rpc("consume_product_evaluation_usage", {
    p_kind: parsed.data.kind,
    p_resource_key: resourceKey,
  });
  if (error) {
    Sentry.captureException(error, {
      tags: { feature: "product-evaluation", stage: "consume" },
      extra: { userId: user.id, kind: parsed.data.kind },
    });
    return { ok: false, code: "SERVER_ERROR", message: "Could not verify evaluation access. Try again." };
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        accepted?: unknown;
        reason?: unknown;
        deals_used?: unknown;
        comparisons_used?: unknown;
        evaluation_expires_at?: unknown;
        was_new_usage?: unknown;
        evaluation_started_at?: unknown;
      }
    | null;
  if (row?.accepted === true) {
    const wasNewUsage = row.was_new_usage === true;
    if (parsed.data.kind === "comparison" && wasNewUsage) {
      const countBucket = String(new Set(parsed.data.dealIds).size);
      await Promise.all([
        captureServerEvent({
          distinctId: user.id,
          event: "evaluation_comparison_used",
          properties: { count_bucket: countBucket },
        }),
        captureServerEvent({
          distinctId: user.id,
          event: "comparison_completed",
          properties: { count_bucket: countBucket },
        }),
      ]);
    }
    return {
      ok: true,
      access: "evaluation",
      dealsUsed: typeof row.deals_used === "number" ? row.deals_used : 0,
      comparisonsUsed: typeof row.comparisons_used === "number" ? row.comparisons_used : 0,
      expiresAt: typeof row.evaluation_expires_at === "string" ? row.evaluation_expires_at : null,
      wasNewUsage,
      startedAt: typeof row.evaluation_started_at === "string" ? row.evaluation_started_at : null,
    };
  }

  const reason = typeof row?.reason === "string" ? row.reason : "not_eligible";
  if (reason === "expired") {
    return { ok: false, code: "EXPIRED", message: "Your 21-day evaluation has ended." };
  }
  if (reason.endsWith("limit_reached")) {
    return { ok: false, code: "LIMIT_REACHED", message: "This evaluation allowance has been used." };
  }
  return { ok: false, code: "NOT_ELIGIBLE", message: "No active product evaluation was found." };
}
