"use server";
import { toServerErrorResult } from "@/lib/db-error";

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
 * Saved scenario clones and strategy presets are Pro features. Every action
 * checks the canonical paid-subscription entitlement before reading or
 * mutating scenario data.
 */

import { z } from "zod";
import {
  getEntitlementsForUser,
  getSavedDealLimitLabel,
  hasPaidPlanSubscription,
  hasPlanFeature,
  hasSavedDealCapacity,
} from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { defaultScenarioName, isStrategyKind } from "@/lib/strategy-kinds";
import { applyStrategyPreset } from "@/lib/scenario-presets";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { normalizeInvestmentFormSnapshot } from "@/lib/investcalc-schema";
import { resolveOwnedScenarioPropertyGroup } from "@/lib/scenario-property-group";

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
        | "ENTITLEMENT_SAVE"
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

/** List the scenarios that share a deal's property (including the deal itself). */
export async function listScenariosAction(dealId: unknown): Promise<ScenariosListResult> {
  const parsed = z.string().uuid().safeParse(dealId);
  if (!parsed.success) return { ok: false, code: "NOT_FOUND", message: "Invalid deal id." };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  if (!(await hasPaidPlanSubscription(supabase, user.id))) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Saved scenarios are available with TrueCap Pro.",
    };
  }

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
      : toServerErrorResult(error, "scenarios");
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
      : toServerErrorResult(listErr, "scenarios");
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
  if (!(await hasPaidPlanSubscription(supabase, user.id))) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Saved scenarios are available with TrueCap Pro.",
    };
  }

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
      : toServerErrorResult(loadErr, "scenarios");
  }
  if (!source) return { ok: false, code: "NOT_FOUND", message: "Source deal not found." };

  const deal = source as DealRow;
  let propertyId: string;
  try {
    propertyId = await resolveOwnedScenarioPropertyGroup({
      supabase,
      userId: user.id,
      source: deal,
    });
  } catch (error) {
    return isMissingSchema(error as { code?: string; message?: string })
      ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
      : toServerErrorResult(error, "scenarios");
  }

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
      : toServerErrorResult(clashErr, "scenarios");
  }
  const nameTaken = (clash ?? []).some(
    (r) => ((r as { scenario_name: string | null }).scenario_name ?? "Base case").trim().toLowerCase() === scenarioName.toLowerCase()
  );
  if (nameTaken) {
    return { ok: false, code: "DUPLICATE_SCENARIO_NAME", message: `You already have a "${scenarioName}" scenario for this property.` };
  }

  // A scenario is a real saved_analyses row, so it spends saved-deal capacity —
  // same count + gate (and same code/message) as saveDealAction's insert path.
  const { count, error: countErr } = await supabase
    .from("saved_analyses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("deleted_at", null);
  if (countErr) {
    return toServerErrorResult(countErr, "scenarios");
  }
  if (!hasSavedDealCapacity(entitlements, count ?? 0)) {
    return {
      ok: false,
      code: "ENTITLEMENT_SAVE",
      message: `Saved deal limit reached for your plan (${getSavedDealLimitLabel(entitlements)}).`,
    };
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
  // A clone is a fresh, active underwriting scenario. Source lifecycle state
  // must not make it closed, archived, or stale the instant it is created.
  clone.is_completed = false;
  clone.is_archived = false;
  clone.close_date = null;
  clone.last_activity_at = new Date().toISOString();
  // A scenario starts as an underwriting alternative, not as a second copy
  // of the source deal's CRM state. Never inherit paid workflow metadata —
  // especially client ownership, which could expose an Agent Pro buyer after
  // a downgrade or tier change. The user can deliberately apply these fields
  // to the new row through their independently gated actions.
  clone.pipeline_stage = null;
  clone.tags = [];
  clone.template_id = null;
  clone.client_id = null;
  // Never inherit the source deal's cached PDF: the export cache checks only
  // pdf_url presence + version (no input hash), so a carried-over URL would
  // serve the BASE case's report for this scenario. Same reset saveDealAction
  // applies on every save — the scenario's first export regenerates.
  clone.pdf_url = null;
  clone.pdf_generated_at = null;
  clone.pdf_snapshot_version = 0;

  // Apply the (conservative) strategy preset to the assumptions and RECOMPUTE
  // the stored metrics, so the new scenario doesn't show the source deal's
  // numbers. Only touches the fields the preset changes; the user edits the
  // rest (notably rent) in the deal view. Skipped if the snapshot can't parse.
  if (strategyKind) {
    const baseValues = normalizeInvestmentFormSnapshot(deal.form_snapshot);
    if (baseValues) {
      const adjusted = applyStrategyPreset(baseValues, strategyKind);
      const result = calculateAnalysis(adjusted);
      clone.form_snapshot = adjusted as unknown as Record<string, unknown>;
      clone.result_snapshot = result as unknown as Record<string, unknown>;
      clone.down_payment_pct = adjusted.downPaymentPct;
      clone.net_cash_flow_monthly = result.netCashFlow;
      clone.coc_return_pct = result.cocReturn;
    }
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("saved_analyses")
    .insert(clone)
    .select("id")
    .single();
  if (insertErr || !inserted) {
    return isMissingSchema(insertErr ?? {})
      ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
      : toServerErrorResult(insertErr, "scenarios");
  }

  return { ok: true, scenarioId: inserted.id as string };
}
