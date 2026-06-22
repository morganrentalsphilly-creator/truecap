"use server";

/**
 * Scenarios (DM-1) — model the SAME property under different strategies
 * (buy-and-hold vs BRRRR vs flip vs STR) as sibling saved_analyses rows that
 * share a parent `properties` row.
 *
 * Deliberately SEPARATE from the canonical save action (app/actions/saved-
 * analyses.ts) and from the duplicate-address guard: adding a scenario clones
 * an existing saved deal and inserts it directly, so it never trips the
 * "one analysis per address" RPC the main save flow uses. Uniqueness here is
 * by SCENARIO NAME per property (enforced in this action), not by address.
 *
 * Find-or-create: a scenario hangs off the source deal's property. If the
 * source deal isn't linked to a property yet (e.g. saved before DM-1), we
 * lazily find-or-create one from its address and link it.
 *
 * Tolerant of the migration (20260622130000_properties_scenarios) not being
 * applied: a missing table/column (42P01 / 42703) returns MIGRATION_PENDING.
 * Pro/paid not required beyond the existing save_deal entitlement.
 */

import { z } from "zod";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { defaultScenarioName, isStrategyKind } from "@/lib/strategy-kinds";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ScenarioSummary = {
  id: string;
  scenarioName: string;
  strategyKind: string | null;
  title: string | null;
  isSource: boolean;
};

export type ScenariosListResult =
  | { ok: true; propertyId: string | null; address: string | null; scenarios: ScenarioSummary[] }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "MIGRATION_PENDING" | "NOT_FOUND" | "SERVER_ERROR";
      message: string;
    };

export type AddScenarioResult =
  | { ok: true; scenarioId: string }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "ENTITLEMENT_REQUIRED"
        | "MIGRATION_PENDING"
        | "NOT_FOUND"
        | "DUPLICATE_SCENARIO_NAME"
        | "VALIDATION_ERROR"
        | "SERVER_ERROR";
      message: string;
    };

function isMissingSchema(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42P01" || // undefined_table
    error.code === "42703" || // undefined_column
    /relation .* does not exist|column .* does not exist/i.test(error.message ?? "")
  );
}

type DealRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  property_id: string | null;
  scenario_name: string | null;
  address: string | null;
  form_snapshot: Record<string, unknown> | null;
};

function dealAddress(row: { address?: string | null; form_snapshot?: Record<string, unknown> | null }): string | null {
  const top = typeof row.address === "string" ? row.address.trim() : "";
  if (top) return top;
  const fromSnap = row.form_snapshot?.["address"];
  return typeof fromSnap === "string" && fromSnap.trim() ? fromSnap.trim() : null;
}

/** Ensure the source deal has a property, creating + linking one if needed. */
async function resolvePropertyId(
  supabase: SupabaseClient,
  userId: string,
  deal: DealRow
): Promise<{ ok: true; propertyId: string } | { ok: false; result: AddScenarioResult }> {
  if (deal.property_id) return { ok: true, propertyId: deal.property_id };

  const address = dealAddress(deal);
  if (!address) {
    return { ok: false, result: { ok: false, code: "VALIDATION_ERROR", message: "This deal has no address to group scenarios under." } };
  }

  // Reuse an existing property at this address, else create one.
  const { data: existing, error: findErr } = await supabase
    .from("properties")
    .select("id")
    .eq("user_id", userId)
    .eq("address", address)
    .limit(1)
    .maybeSingle();
  if (findErr) {
    return {
      ok: false,
      result: isMissingSchema(findErr)
        ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
        : { ok: false, code: "SERVER_ERROR", message: findErr.message },
    };
  }

  let propertyId = existing?.id as string | undefined;
  if (!propertyId) {
    const { data: created, error: createErr } = await supabase
      .from("properties")
      .insert({ user_id: userId, address })
      .select("id")
      .single();
    if (createErr || !created) {
      return {
        ok: false,
        result: isMissingSchema(createErr ?? {})
          ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
          : { ok: false, code: "SERVER_ERROR", message: createErr?.message ?? "Could not create property." },
      };
    }
    propertyId = created.id as string;
  }

  // Link the source deal to the property (best-effort).
  await supabase.from("saved_analyses").update({ property_id: propertyId }).eq("id", deal.id).eq("user_id", userId);
  return { ok: true, propertyId };
}

/** List the scenarios that share a deal's property (including the deal itself). */
export async function listScenariosAction(dealId: unknown): Promise<ScenariosListResult> {
  const parsed = z.string().uuid().safeParse(dealId);
  if (!parsed.success) return { ok: false, code: "NOT_FOUND", message: "Invalid deal id." };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };

  const { data: deal, error } = await supabase
    .from("saved_analyses")
    .select("id, property_id, address, form_snapshot")
    .eq("id", parsed.data)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    return isMissingSchema(error)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
      : { ok: false, code: "SERVER_ERROR", message: error.message };
  }
  if (!deal) return { ok: false, code: "NOT_FOUND", message: "Deal not found." };

  const propertyId = (deal as { property_id: string | null }).property_id;
  const address = dealAddress(deal as DealRow);

  if (!propertyId) {
    // Not yet grouped — the deal is its own (only) scenario.
    return { ok: true, propertyId: null, address, scenarios: [] };
  }

  const { data: rows, error: listErr } = await supabase
    .from("saved_analyses")
    .select("id, scenario_name, strategy_kind, title")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (listErr) {
    return isMissingSchema(listErr)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
      : { ok: false, code: "SERVER_ERROR", message: listErr.message };
  }

  const scenarios: ScenarioSummary[] = (rows ?? []).map((r) => {
    const row = r as { id: string; scenario_name: string | null; strategy_kind: string | null; title: string | null };
    return {
      id: row.id,
      scenarioName: row.scenario_name ?? "Base case",
      strategyKind: isStrategyKind(row.strategy_kind) ? row.strategy_kind : null,
      title: row.title,
      isSource: row.id === parsed.data,
    };
  });

  return { ok: true, propertyId, address, scenarios };
}

const addSchema = z.object({
  sourceDealId: z.string().uuid(),
  scenarioName: z.string().trim().max(80).optional(),
  strategyKind: z.string().nullable().optional(),
});

/**
 * Clone a saved deal into a new scenario under the same property. Copies the
 * full row (so projections/metrics carry over) and overrides scenario_name +
 * strategy_kind. Name must be unique per property.
 */
export async function addScenarioAction(input: unknown): Promise<AddScenarioResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "save_deal")) {
    return { ok: false, code: "ENTITLEMENT_REQUIRED", message: "Saving scenarios requires a plan that can save deals." };
  }

  // Load the full source row (RLS scopes to owner).
  const { data: source, error: loadErr } = await supabase
    .from("saved_analyses")
    .select("*")
    .eq("id", parsed.data.sourceDealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (loadErr) {
    return isMissingSchema(loadErr)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
      : { ok: false, code: "SERVER_ERROR", message: loadErr.message };
  }
  if (!source) return { ok: false, code: "NOT_FOUND", message: "Source deal not found." };

  const deal = source as DealRow;
  const resolved = await resolvePropertyId(supabase, user.id, deal);
  if (!resolved.ok) return resolved.result;
  const propertyId = resolved.propertyId;

  const strategyKind = isStrategyKind(parsed.data.strategyKind) ? parsed.data.strategyKind : null;
  const scenarioName = (parsed.data.scenarioName?.trim() || defaultScenarioName(strategyKind)).slice(0, 80);

  // Unique scenario name per property (case-insensitive, among live rows).
  const { data: clash, error: clashErr } = await supabase
    .from("saved_analyses")
    .select("id, scenario_name")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .is("deleted_at", null);
  if (clashErr) {
    return isMissingSchema(clashErr)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
      : { ok: false, code: "SERVER_ERROR", message: clashErr.message };
  }
  const nameTaken = (clash ?? []).some(
    (r) => ((r as { scenario_name: string | null }).scenario_name ?? "Base case").trim().toLowerCase() === scenarioName.toLowerCase()
  );
  if (nameTaken) {
    return { ok: false, code: "DUPLICATE_SCENARIO_NAME", message: `You already have a "${scenarioName}" scenario for this property.` };
  }

  // Clone the row: copy everything, strip identity/timestamps, override scenario fields.
  const clone: Record<string, unknown> = { ...deal };
  delete clone.id;
  delete clone.created_at;
  delete clone.updated_at;
  delete clone.deleted_at;
  clone.property_id = propertyId;
  clone.scenario_name = scenarioName;
  clone.strategy_kind = strategyKind;

  const { data: inserted, error: insertErr } = await supabase
    .from("saved_analyses")
    .insert(clone)
    .select("id")
    .single();
  if (insertErr || !inserted) {
    return isMissingSchema(insertErr ?? {})
      ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
      : { ok: false, code: "SERVER_ERROR", message: insertErr?.message ?? "Could not create scenario." };
  }

  return { ok: true, scenarioId: inserted.id as string };
}
