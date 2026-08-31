"use server";
import { toServerErrorResult } from "@/lib/db-error";

/**
 * User-specific analysis form defaults — overlaid on top of the
 * generic engine defaults so power users don't retype their preferred
 * vacancy %, mgmt %, etc. on every new deal.
 *
 * Storage: single jsonb on `user_analysis_defaults.preferences`. The
 * schema below is what we validate when writing; reads are tolerant
 * of unknown keys (so we can add fields later without a migration).
 *
 * Defensive: all read/write paths gracefully handle the case where
 * the migration (20260524123000_user_analysis_defaults) hasn't yet
 * been applied — we don't want a missing table to break the calculator
 * for users who never visit /settings.
 */
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  accountSessionChangedResult,
  expectedAccountUserMatches,
} from "@/lib/account-session-binding";

// NOTE: schema must NOT be exported — Next.js requires "use server"
// files to export only async functions. A runtime object export
// (z.object()...) throws the obscure "found object" error at request
// time. The type below uses z.infer so callers still get the right
// shape via the type export, just without the schema as a runtime
// value. If a non-server module needs the schema, move it to its
// own file and re-import here.
const userDefaultsSchema = z
  .object({
    downPaymentPct: z.number().min(0).max(100).optional(),
    loanTermYears: z.number().min(1).max(50).optional(),
    interestRatePct: z.number().min(0).max(30).optional(),
    closingCostsPct: z.number().min(0).max(100).optional(),
    vacancyPct: z.number().min(0).max(100).optional(),
    mgmtPct: z.number().min(0).max(100).optional(),
    maintenancePct: z.number().min(0).max(100).optional(),
    capexPct: z.number().min(0).max(100).optional(),
    taxRatePct: z.number().min(0).max(100).optional(),
    rentGrowthPct: z.number().min(0).max(100).optional(),
    expenseGrowthPct: z.number().min(0).max(100).optional(),
    appreciationRatePct: z.number().min(0).max(100).optional(),
    sellingCostPct: z.number().min(0).max(100).optional(),
  })
  .strict();

export type UserAnalysisDefaults = z.infer<typeof userDefaultsSchema>;

export type UserDefaultsActionResult =
  | { ok: true; preferences: UserAnalysisDefaults }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "SESSION_CHANGED"
        | "MIGRATION_PENDING"
        | "VALIDATION_ERROR"
        | "SERVER_ERROR";
      message: string;
    };

/**
 * Read the current user's saved defaults. Returns an empty object if
 * none have been set, or if the migration isn't applied yet.
 */
export async function getUserAnalysisDefaultsAction(): Promise<UserDefaultsActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }
  const { data, error } = await supabase
    .from("user_analysis_defaults")
    .select("preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    // Postgres 42P01 = undefined_table — migration not yet applied.
    if (
      error.code === "42P01" ||
      /relation .* does not exist/i.test(error.message)
    ) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return toServerErrorResult(error, "user-defaults");
  }
  const raw = (data as { preferences?: unknown } | null)?.preferences ?? {};
  // Tolerant parse — skip unknown keys without erroring so we can
  // evolve the schema later without breaking existing reads.
  const parsed = userDefaultsSchema.safeParse(raw);
  return { ok: true, preferences: parsed.success ? parsed.data : {} };
}

/**
 * Write the user's defaults. Upserts the row — first call inserts,
 * subsequent calls overwrite. Returns the saved payload on success.
 */
export async function saveUserAnalysisDefaultsAction(
  input: unknown,
  expectedUserId: unknown,
): Promise<UserDefaultsActionResult> {
  const parsed = userDefaultsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }
  if (!expectedAccountUserMatches(expectedUserId, user.id)) {
    return accountSessionChangedResult();
  }
  const { error } = await supabase
    .from("user_analysis_defaults")
    .upsert(
      { user_id: user.id, preferences: parsed.data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) {
    if (
      error.code === "42P01" ||
      /relation .* does not exist/i.test(error.message)
    ) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return toServerErrorResult(error, "user-defaults");
  }
  return { ok: true, preferences: parsed.data };
}
