"use server";

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import type { OfferCeilingTargetSource } from "@/lib/offer-ceiling";
import type { OfferCeilingAccessPayload } from "@/lib/offer-ceiling-access-contract";
import { isAdoptedOfferCeilingTargetSource } from "@/lib/offer-ceiling-contract";
import { normalizeExternalOfferCeilingTargetSource } from "@/lib/external-offer-ceiling-provenance";
import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasPaidPlanSubscription } from "@/lib/entitlements";
import { activeMeteredEvaluationDealGrantsAccess } from "@/lib/evaluation-access-server";
import { activeAnonymousDecisionGrantMatches } from "@/lib/anonymous-decision-grant";
import { createIpRateLimit, getRequestIp } from "@/lib/ip-rate-limit";

export type ResolveOfferCeilingActionResult =
  | { ok: true; data: OfferCeilingAccessPayload }
  | {
      ok: false;
      code: "VALIDATION_ERROR" | "RATE_LIMITED" | "SERVER_ERROR";
      message: string;
    };

const requestSchema = z.object({
  values: releasedInvestmentFormSchema,
  target: z.unknown(),
  source: z.unknown().optional(),
});

// Offer Ceiling performs repeated inverse solves even for a coarse preview.
// A generous per-instance/IP brake keeps the public sample and anonymous
// endpoint from becoming an unbounded CPU oracle while staying far above a
// human investor's target-tuning pace. Authorization remains the signed grant;
// this limiter is only defense in depth.
const anonymousOfferCeilingRateLimit = createIpRateLimit({
  windowMs: 60 * 60 * 1000,
  maxPerWindow: 120,
});

/**
 * Resolve the Offer Ceiling without trusting a browser capability flag.
 *
 * Grandfathered subscriptions flow through the same live-subscription helper
 * as the analyzer shell; no Stripe Product, Price, or amount is read or
 * changed here. Auth/DB errors fail closed to the coarse preview.
 */
export async function resolveOfferCeilingAction(
  input: unknown
): Promise<ResolveOfferCeilingActionResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Could not read this analysis or its targets.",
    };
  }

  const target = normalizeMaoTarget(parsed.data.target);
  if (!target) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Choose at least one valid Offer Ceiling target.",
    };
  }
  const source: OfferCeilingTargetSource =
    normalizeExternalOfferCeilingTargetSource(parsed.data.source, {
      target,
      values: parsed.data.values,
    }) ??
    "selected-targets";
  if (!isAdoptedOfferCeilingTargetSource(source)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Review and adopt at least one target before calculating a modeled price threshold.",
    };
  }

  let paidAccess = false;
  let applyAnonymousRateLimit = true;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // One no-signup decision is bound to one exact released input set by a
      // signed HttpOnly cookie. A second property receives only the coarse
      // preview, and this server check never trusts the browser capability.
      paidAccess = await activeAnonymousDecisionGrantMatches(
        parsed.data.values,
      );
    } else {
      applyAnonymousRateLimit = false;
      // Signing up must not consume or replace the exact no-signup decision
      // already granted to this browser. Check that portable grant before the
      // account's separate evaluation-deal allowance.
      const [hasSubscription, anonymousDecisionGrant] = await Promise.all([
        hasPaidPlanSubscription(supabase, user.id),
        activeAnonymousDecisionGrantMatches(parsed.data.values),
      ]);
      paidAccess = hasSubscription || anonymousDecisionGrant;
      if (!paidAccess) {
        paidAccess = await activeMeteredEvaluationDealGrantsAccess(
          supabase,
          user.id,
          parsed.data.values,
        );
      }
    }
  } catch (error) {
    // An auth or entitlement outage must never turn unknown access into exact
    // access. The preview is still useful and contains no paid result.
    Sentry.captureException(error, {
      tags: { feature: "offer-ceiling", stage: "entitlement-check" },
    });
  }

  if (
    applyAnonymousRateLimit &&
    anonymousOfferCeilingRateLimit.isOverLimit(await getRequestIp())
  ) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many Offer Ceiling requests. Try again later.",
    };
  }

  try {
    return {
      ok: true,
      data: resolveOfferCeilingForAccess({
        values: parsed.data.values,
        target,
        source,
        paidAccess,
      }),
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "offer-ceiling", stage: "solve" },
    });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Could not calculate the Offer Ceiling right now.",
    };
  }
}
