import "server-only";

import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlementsForUser, type PlanEntitlements } from "@/lib/entitlements";

/**
 * Request-scoped auth helpers. React's cache() memoizes per server request,
 * so the dashboard segment LAYOUT and the PAGE it wraps — which both run on
 * every navigation — share a single auth validation and a single
 * entitlements lookup instead of doing each one twice.
 *
 * Gating logic is unchanged; these only dedupe the fetches. Each helper
 * creates its own cookie-bound client, and pages still create their own
 * client for their data queries (RLS-scoped to the same session).
 */

export const getRequestUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getRequestEntitlements = cache(
  async (userId: string): Promise<PlanEntitlements> => {
    const supabase = await createServerSupabaseClient();
    return getEntitlementsForUser(supabase, userId);
  }
);
