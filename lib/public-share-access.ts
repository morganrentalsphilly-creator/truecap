import "server-only";

import * as Sentry from "@sentry/nextjs";
import { hasPaidPlanSubscription } from "@/lib/entitlements";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Whether a public share may include subscription-only analysis surfaces.
 *
 * The share link itself is free. MAO, sensitivity, and strategy calculators
 * are not. Owner attribution is already verified by each share route before
 * this helper is called, and every failure closes to the free public view.
 */
export async function canShowSharedProAnalysis(ownerId?: string): Promise<boolean> {
  if (!ownerId) return false;
  try {
    return await hasPaidPlanSubscription(createAdminSupabaseClient(), ownerId);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "public-share", stage: "entitlement-check" },
      extra: { ownerId },
    });
    return false;
  }
}
