"use server";

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import {
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling";
import type { OfferCeilingAccessPayload } from "@/lib/offer-ceiling-access-contract";
import { isAdoptedOfferCeilingTargetSource } from "@/lib/offer-ceiling-contract";
import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasPaidPlanSubscription } from "@/lib/entitlements";

export type ResolveOfferCeilingActionResult =
  | { ok: true; data: OfferCeilingAccessPayload }
  | {
      ok: false;
      code: "VALIDATION_ERROR" | "SERVER_ERROR";
      message: string;
    };

const requestSchema = z.object({
  values: releasedInvestmentFormSchema,
  target: z.unknown(),
  source: z.unknown().optional(),
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
    normalizeOfferCeilingTargetSource(parsed.data.source) ??
    "selected-targets";
  if (!isAdoptedOfferCeilingTargetSource(source)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Review and adopt at least one target before calculating a modeled price threshold.",
    };
  }

  let paidAccess = false;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    paidAccess = user
      ? await hasPaidPlanSubscription(supabase, user.id)
      : false;
  } catch (error) {
    // An auth or entitlement outage must never turn unknown access into exact
    // access. The preview is still useful and contains no paid result.
    Sentry.captureException(error, {
      tags: { feature: "offer-ceiling", stage: "entitlement-check" },
    });
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
