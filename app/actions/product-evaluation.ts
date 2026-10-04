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
import { isFunnelFlagOn } from "@/lib/funnel-flags";
import { PRODUCT_EVALUATION_DEAL_LIMIT } from "@/lib/product-access";
import { activeAnonymousDecisionGrantMatches } from "@/lib/anonymous-decision-grant";
import { PRODUCT_EVALUATION_DAYS } from "@/lib/product-access";

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
      /** FUNNEL_UPGRADE_NUDGE: this deal used the last of the trial's Pro
       * deals, so the analyzer shows the inline upgrade card with it. */
      upgradeNudge?: "third_deal";
    }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "NOT_ELIGIBLE" | "EXPIRED" | "LIMIT_REACHED" | "SERVER_ERROR";
      message: string;
      /** FUNNEL_UPGRADE_NUDGE: the deal allowance is spent. */
      upgradeNudge?: "limit_reached";
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
    return { ok: false, code: "SERVER_ERROR", message: "Could not verify this free-trial run." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      // The only reachable audience here is a lapsed-session account holder:
      // the analyzer calls this action only when isAuthenticated was true at
      // page load, and compare.ts gates on getUser() with its own copy first.
      // "Create an account" told people to create the account they already have.
      message: "Your session has expired. Sign in again to continue.",
    };
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
      message: "Could not verify this free-trial run.",
    };
  }

  const nudgeOn = isFunnelFlagOn("FUNNEL_UPGRADE_NUDGE");
  const { data, error } = await supabase.rpc("consume_product_evaluation_usage", {
    p_kind: parsed.data.kind,
    p_resource_key: resourceKey,
  });
  if (error) {
    Sentry.captureException(error, {
      tags: { feature: "product-evaluation", stage: "consume" },
      extra: { userId: user.id, kind: parsed.data.kind },
    });
    // A missing function (PGRST202 via PostgREST, 42883 from Postgres) is
    // deterministic — retrying can never succeed, so "Try again" is the
    // advice-that-cannot-work class this codebase has now shipped four times.
    const deterministic =
      error.code === "PGRST202" || error.code === "42883";
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: deterministic
        ? "Free-trial access is temporarily unavailable while we finish an update — no action needed on your end."
        : "Could not verify free-trial access. Try again.",
    };
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
    const dealsUsed = typeof row.deals_used === "number" ? row.deals_used : 0;
    return {
      ok: true,
      access: "evaluation",
      ...(nudgeOn &&
      parsed.data.kind === "deal" &&
      dealsUsed >= PRODUCT_EVALUATION_DEAL_LIMIT
        ? { upgradeNudge: "third_deal" as const }
        : {}),
      dealsUsed,
      comparisonsUsed: typeof row.comparisons_used === "number" ? row.comparisons_used : 0,
      expiresAt: typeof row.evaluation_expires_at === "string" ? row.evaluation_expires_at : null,
      wasNewUsage,
      startedAt: typeof row.evaluation_started_at === "string" ? row.evaluation_started_at : null,
    };
  }

  const reason = typeof row?.reason === "string" ? row.reason : "not_eligible";
  if (reason === "expired") {
    return { ok: false, code: "EXPIRED", message: `Your ${PRODUCT_EVALUATION_DAYS}-day free trial has ended.` };
  }
  if (reason.endsWith("limit_reached")) {
    return {
      ok: false,
      code: "LIMIT_REACHED",
      message: "This free-trial allowance has been used.",
      ...(nudgeOn && reason === "deal_limit_reached"
        ? { upgradeNudge: "limit_reached" as const }
        : {}),
    };
  }
  return { ok: false, code: "NOT_ELIGIBLE", message: "No active free trial was found." };
}
