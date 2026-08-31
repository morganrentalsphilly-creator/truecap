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
 * Claim-or-adopt: a scenario hangs off the source deal's property. If the
 * source isn't linked yet (e.g. saved before DM-1), the first request creates
 * and atomically claims a parent; concurrent requests adopt that same parent.
 *
 * Tolerant of the migration (20260622130000_properties_scenarios) not being
 * applied: a missing table/column (42P01 / 42703) returns MIGRATION_PENDING.
 * Pro/paid not required beyond the existing save_deal entitlement.
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
import {
  defaultScenarioName,
  isStrategyKind,
  STRATEGY_KINDS,
} from "@/lib/strategy-kinds";
import { buildScenarioStrategyTransition } from "@/lib/scenario-strategy-transition";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { INVESTCALC_SCHEMA_VERSION } from "@/lib/investcalc-schema";
import {
  isReleasedUnderwritingSnapshot,
  normalizeReleasedInvestmentFormSnapshot,
} from "@/lib/underwriting-model-release";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import { normalizeOfferCeilingTargetSource } from "@/lib/offer-ceiling";
import { isAdoptedOfferCeilingTargetSource } from "@/lib/offer-ceiling-contract";
import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";
import {
  computeDealScore,
  buildDealScoreInputFromAnalysis,
} from "@/lib/deal-score";
import { buildCompareSnapshotPayload } from "@/lib/compare-result-snapshot";
import {
  DEFAULT_APPRECIATION_RATE,
  DEFAULT_SELLING_COST_PCT,
} from "@/lib/exit-scenarios";
import {
  resolveSavedAnalysisResult,
  shouldFreezeSavedMethodology,
} from "@/lib/saved-analysis-methodology";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeAnalyzerStrategyKey,
  persistedAnalyzerStrategyKey,
} from "@/lib/analyzer-strategy-persistence";
import {
  buildSpecialistAnalysisSnapshot,
  parseSpecialistAnalysisSnapshot,
  SPECIALIST_ANALYSIS_SNAPSHOT_FIELD,
} from "@/lib/specialist-analysis-snapshot";
import { retargetUnchangedScenarioResultSnapshot } from "@/lib/scenario-result-snapshot";
import {
  isScenarioStrategyEnabled,
  isSpecialistStrategyEnabled,
} from "@/lib/feature-flags";

export type ScenarioSummary = {
  id: string;
  scenarioName: string;
  strategyKind: string | null;
  title: string | null;
  lifecycleState: "active" | "completed" | "archived";
  /** Matches the active-row contract enforced by compareScenariosAction. */
  isComparable: boolean;
  /** The original saved analysis (NULL/blank or legacy "Base case" name). */
  isBase: boolean;
  isSource: boolean;
};

export type ScenariosListResult =
  | {
      ok: true;
      propertyId: string | null;
      address: string | null;
      scenarios: ScenarioSummary[];
    }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "ENTITLEMENT_REQUIRED"
        | "MIGRATION_PENDING"
        | "NOT_FOUND"
        | "SERVER_ERROR";
      message: string;
    };

export type AddScenarioResult =
  | { ok: true; scenarioId: string; strategySetupRequired: boolean }
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
    error.code === "42883" || // undefined_function
    error.code === "PGRST202" || // function absent from PostgREST schema cache
    error.code === "PGRST204" || // column absent from PostgREST schema cache
    /relation .* does not exist|column .* does not exist|function .* does not exist|could not find .* in the schema cache|schema cache.*(?:function|column)|(?:function|column).*schema cache/i.test(
      error.message ?? "",
    )
  );
}

function isDuplicateScenarioNameError(error: {
  code?: string;
  message?: string;
  details?: string;
}): boolean {
  return (
    error.code === "23505" &&
    /saved_analyses_active_property_scenario_name_uidx/i.test(
      `${error.message ?? ""} ${error.details ?? ""}`,
    )
  );
}

function isDuplicateScenarioRequestKeyError(error: {
  code?: string;
  message?: string;
  details?: string;
}): boolean {
  return (
    error.code === "23505" &&
    /saved_analyses_user_scenario_request_key_uidx/i.test(
      `${error.message ?? ""} ${error.details ?? ""}`,
    )
  );
}

function isSavedAnalysisPlanCapacityError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}): boolean {
  return (
    error.code === "23514" &&
    /saved_analyses_plan_capacity|saved deal limit reached/i.test(
      `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`,
    )
  );
}

/** A scenario is a new persisted row even when it byte-clones an old result.
 * Preserve the source row itself, but never copy a disabled or malformed
 * specialist payload into the new row. Dark analyzer identities downgrade to
 * the canonical buy-and-hold lens. */
function releaseGateScenarioResultSnapshot(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const snapshot = { ...(value as Record<string, unknown>) };
  const strategyKey = normalizeAnalyzerStrategyKey(
    snapshot.analyzerStrategyKey,
  );
  if (strategyKey && !isSpecialistStrategyEnabled(strategyKey)) {
    snapshot.analyzerStrategyKey = "buy-hold";
    delete snapshot[SPECIALIST_ANALYSIS_SNAPSHOT_FIELD];
    return snapshot;
  }

  const specialistAnalysis = parseSpecialistAnalysisSnapshot(
    snapshot[SPECIALIST_ANALYSIS_SNAPSHOT_FIELD],
  );
  if (
    !specialistAnalysis ||
    specialistAnalysis.strategy !== strategyKey ||
    !isSpecialistStrategyEnabled(specialistAnalysis.strategy)
  ) {
    delete snapshot[SPECIALIST_ANALYSIS_SNAPSHOT_FIELD];
  } else {
    snapshot[SPECIALIST_ANALYSIS_SNAPSHOT_FIELD] = specialistAnalysis;
  }
  return snapshot;
}

type DealRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  property_id: string | null;
  scenario_name: string | null;
  address: string | null;
  form_snapshot: Record<string, unknown> | null;
  result_snapshot: Record<string, unknown> | null;
  methodology_version?: string | null;
  schema_version?: number | null;
};

function dealAddress(row: {
  address?: string | null;
  form_snapshot?: Record<string, unknown> | null;
}): string | null {
  const top = typeof row.address === "string" ? row.address.trim() : "";
  if (top) return top;
  const fromSnap = row.form_snapshot?.["address"];
  return typeof fromSnap === "string" && fromSnap.trim()
    ? fromSnap.trim()
    : null;
}

function scenarioLifecycleState(row: {
  is_completed: boolean;
  is_archived: boolean;
}): ScenarioSummary["lifecycleState"] {
  if (row.is_completed) return "completed";
  if (row.is_archived) return "archived";
  return "active";
}

type ScenarioRequestRow = {
  id: string;
  deleted_at: string | null;
  strategy_kind: string | null;
  form_snapshot: Record<string, unknown> | null;
  result_snapshot: Record<string, unknown> | null;
};

type ScenarioRequestLookup =
  | { status: "missing" }
  | { status: "found"; result: AddScenarioResult }
  | { status: "error"; result: AddScenarioResult };

function replayStrategySetupRequired(row: ScenarioRequestRow): boolean {
  if (!isStrategyKind(row.strategy_kind)) return false;
  const values = normalizeReleasedInvestmentFormSnapshot(row.form_snapshot);
  if (!values) return false;
  return buildScenarioStrategyTransition({
    baseValues: values,
    strategyKind: row.strategy_kind,
    sourceResult: row.result_snapshot,
  }).setupRequired;
}

/**
 * A request key remains reserved even when its scenario is soft-deleted. Read
 * without a deleted_at filter so an ambiguous retry can never spend capacity
 * or create a replacement row for an already-completed request.
 */
async function findScenarioRequest(
  supabase: SupabaseClient,
  userId: string,
  clientRequestId: string,
): Promise<ScenarioRequestLookup> {
  const { data, error } = await supabase
    .from("saved_analyses")
    .select(
      "id, deleted_at, strategy_kind, form_snapshot, result_snapshot",
    )
    .eq("user_id", userId)
    .eq("scenario_request_key", clientRequestId)
    .maybeSingle();
  if (error) {
    return {
      status: "error",
      result: isMissingSchema(error)
        ? {
            ok: false,
            code: "MIGRATION_PENDING",
            message: "Schema migration pending.",
          }
        : toServerErrorResult(error, "scenarios"),
    };
  }
  if (!data) return { status: "missing" };

  const row = data as ScenarioRequestRow;
  if (row.deleted_at) {
    return {
      status: "found",
      result: {
        ok: false,
        code: "NOT_FOUND",
        message:
          "This scenario request was already completed and later removed. Start a new scenario request.",
      },
    };
  }

  return {
    status: "found",
    result: {
      ok: true,
      scenarioId: row.id,
      strategySetupRequired: replayStrategySetupRequired(row),
    },
  };
}

/** Atomically create-or-adopt the source deal's property parent. */
async function claimScenarioPropertyId(
  supabase: SupabaseClient,
  deal: DealRow,
): Promise<
  { ok: true; propertyId: string } | { ok: false; result: AddScenarioResult }
> {
  if (!deal.property_id && !dealAddress(deal)) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "This deal has no address to group scenarios under.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "claim_saved_analysis_property_for_scenario",
    { p_source_analysis_id: deal.id },
  );
  if (error) {
    return {
      ok: false,
      result: isMissingSchema(error)
        ? {
            ok: false,
            code: "MIGRATION_PENDING",
            message: "Schema migration pending.",
          }
        : toServerErrorResult(error, "scenarios"),
    };
  }

  const propertyId = z.string().uuid().safeParse(data);
  if (!propertyId.success) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "SERVER_ERROR",
        message: "The scenario workspace could not be verified.",
      },
    };
  }
  return { ok: true, propertyId: propertyId.data };
}

/** List the scenarios that share a deal's property (including the deal itself). */
export async function listScenariosAction(
  dealId: unknown,
): Promise<ScenariosListResult> {
  const parsed = z.string().uuid().safeParse(dealId);
  if (!parsed.success)
    return { ok: false, code: "NOT_FOUND", message: "Invalid deal id." };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };

  const { data: deal, error } = await supabase
    .from("saved_analyses")
    .select(
      "id, property_id, address, form_snapshot, title, is_completed, is_archived",
    )
    .eq("id", parsed.data)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    return isMissingSchema(error)
      ? {
          ok: false,
          code: "MIGRATION_PENDING",
          message: "Schema migration pending.",
        }
      : toServerErrorResult(error, "scenarios");
  }
  if (!deal)
    return { ok: false, code: "NOT_FOUND", message: "Deal not found." };

  const propertyId = (deal as { property_id: string | null }).property_id;
  const address = dealAddress(deal);

  if (!propertyId) {
    // Not yet grouped — the deal is its own (only) scenario.
    const row = deal as {
      id: string;
      title: string | null;
      is_completed: boolean;
      is_archived: boolean;
    };
    const lifecycleState = scenarioLifecycleState(row);
    return {
      ok: true,
      propertyId: null,
      address,
      scenarios: [
        {
          id: row.id,
          scenarioName: "Base case",
          strategyKind: null,
          title: row.title,
          lifecycleState,
          isComparable: lifecycleState === "active",
          isBase: true,
          isSource: true,
        },
      ],
    };
  }

  const { data: rows, error: listErr } = await supabase
    .from("saved_analyses")
    .select(
      "id, scenario_name, strategy_kind, title, is_completed, is_archived",
    )
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (listErr) {
    return isMissingSchema(listErr)
      ? {
          ok: false,
          code: "MIGRATION_PENDING",
          message: "Schema migration pending.",
        }
      : toServerErrorResult(listErr, "scenarios");
  }

  const scenarios: ScenarioSummary[] = (rows ?? []).map((r) => {
    const row = r as {
      id: string;
      scenario_name: string | null;
      strategy_kind: string | null;
      title: string | null;
      is_completed: boolean;
      is_archived: boolean;
    };
    const normalizedScenarioName = row.scenario_name?.trim().toLowerCase();
    const isBase =
      normalizedScenarioName == null ||
      normalizedScenarioName === "" ||
      normalizedScenarioName === "base case";
    const lifecycleState = scenarioLifecycleState(row);
    return {
      id: row.id,
      scenarioName: isBase ? "Base case" : row.scenario_name!.trim(),
      strategyKind: isStrategyKind(row.strategy_kind)
        ? row.strategy_kind
        : null,
      title: row.title,
      lifecycleState,
      isComparable: lifecycleState === "active",
      isBase,
      isSource: row.id === parsed.data,
    };
  });

  return { ok: true, propertyId, address, scenarios };
}

const addSchema = z.object({
  sourceDealId: z.string().uuid(),
  clientRequestId: z.string().uuid(),
  scenarioName: z.string().trim().max(80).optional(),
  strategyKind: z.enum(STRATEGY_KINDS).nullable().optional(),
});

/**
 * Clone a saved deal into a new scenario under the same property. Copies the
 * full row (so projections/metrics carry over) and overrides scenario_name +
 * strategy_kind. Name must be unique per property.
 */
export async function addScenarioAction(
  input: unknown,
): Promise<AddScenarioResult> {
  const parsed = addSchema.safeParse(input);
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
  if (!user)
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };

  // The browser retains this UUID across typed failures and ambiguous network
  // rejections. Reconcile it before entitlement/capacity reads and, critically,
  // before the property-claim RPC can mutate workspace metadata.
  const initialReplay = await findScenarioRequest(
    supabase,
    user.id,
    parsed.data.clientRequestId,
  );
  if (initialReplay.status !== "missing") return initialReplay.result;

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "save_deal")) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Saving scenarios requires a plan that can save deals.",
    };
  }

  const strategyKind = parsed.data.strategyKind ?? null;
  if (strategyKind && !isScenarioStrategyEnabled(strategyKind)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "This strategy model is not available yet.",
    };
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
      ? {
          ok: false,
          code: "MIGRATION_PENDING",
          message: "Schema migration pending.",
        }
      : toServerErrorResult(loadErr, "scenarios");
  }
  if (!source)
    return { ok: false, code: "NOT_FOUND", message: "Source deal not found." };

  const deal = source as DealRow;
  // This action can byte-for-byte clone a row without invoking the calculator,
  // so the release check must happen before every clone path (including a
  // malformed/preexisting v2 snapshot and a no-op strategy).
  if (!isReleasedUnderwritingSnapshot(deal.form_snapshot)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "This underwriting model is not available yet.",
    };
  }
  const scenarioName = (
    parsed.data.scenarioName?.trim() || defaultScenarioName(strategyKind)
  ).slice(0, 80);

  // An ungrouped saved deal is presented as its property's Base case, even
  // before it has a property_id. Reject a second normalized base before
  // the property-claim RPC can create/link workspace metadata. For an already
  // grouped source, this also catches the source row itself when it is Base;
  // a non-base source still uses the sibling preflight below so a malformed
  // legacy property with no base can be repaired deliberately.
  const normalizedScenarioName = scenarioName.toLowerCase();
  const normalizedSourceScenarioName =
    deal.scenario_name?.trim().toLowerCase();
  const sourceIsBase =
    !deal.property_id ||
    normalizedSourceScenarioName == null ||
    normalizedSourceScenarioName === "" ||
    normalizedSourceScenarioName === "base case";
  if (sourceIsBase && normalizedScenarioName === "base case") {
    return {
      ok: false,
      code: "DUPLICATE_SCENARIO_NAME",
      message: `You already have a "${scenarioName}" scenario for this property.`,
    };
  }

  // A scenario is a real saved_analyses row, so it spends saved-deal capacity —
  // same count + gate (and same code/message) as saveDealAction's insert path.
  // Check before creating/linking a property parent so a capacity rejection is
  // read-only and cannot leave workspace metadata behind.
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
  // Row identities and concurrency/activity tokens belong to the source
  // record, not to its new scenario branch. In particular, carrying a public
  // share copy key would collide with the source row's partial unique index
  // and make every scenario created from an imported deal fail at INSERT.
  delete clone.public_share_copy_key;
  // Idempotency belongs to this request, never to the source row. Strip any
  // inherited key before assigning the browser's stable UUID below.
  delete clone.scenario_request_key;
  delete clone.underwriting_revision;
  delete clone.notes_revision;
  delete clone.last_activity_at;
  // Keep ownership explicit even though the source row is already owner-scoped
  // and RLS enforces the same invariant. This prevents a future privileged
  // client/helper refactor from accidentally inheriting an ambiguous owner.
  clone.user_id = user.id;
  clone.scenario_request_key = parsed.data.clientRequestId;
  clone.scenario_name = scenarioName;
  clone.strategy_kind = strategyKind;
  // The source may donate assumptions from any lifecycle state, but a scenario
  // is always a new deal to evaluate. Never inherit Passed, Closed, or stale
  // compatibility flags that would hide or lock the newly created scenario.
  //
  // OMIT rather than assign. `clone` is a full spread of a `select("*")` row,
  // so all three lifecycle keys arrive from the source and must be removed —
  // but they must not be re-set to "active" either. The
  // saved_analyses_guard_lifecycle_columns trigger (migration
  // 20260827230000_saved_deal_history.sql) raises 42501 when an
  // authenticated INSERT carries a non-null pipeline_stage, so writing the
  // stage here would break Add Scenario the moment that migration lands. The
  // column defaults do exactly what we want: pipeline_stage NULL (read as
  // DEFAULT_PIPELINE_STAGE by deriveStageFromFlags) and both mirror flags
  // false. This matches how saveDealAction already inserts a new deal.
  delete clone.pipeline_stage;
  delete clone.is_completed;
  delete clone.is_archived;
  // The lifecycle migration also stores the history event that currently
  // owns those mirror fields. It is a row-local CAS token, never scenario
  // data: cloning it would both point at the source deal's history and make
  // the lifecycle guard reject any source that has already changed stage.
  delete clone.current_stage_history_event_id;
  // A scenario is a fresh underwriting branch, not a second owned property.
  // Clear the source close date when that optional column exists so closing
  // the scenario later cannot backdate its equity history to the base deal.
  if ("close_date" in clone) clone.close_date = null;
  // Never inherit the source deal's cached PDF: the export cache checks only
  // pdf_url presence + version (no input hash), so a carried-over URL would
  // serve the BASE case's report for this scenario. Same reset saveDealAction
  // applies on every save — the scenario's first export regenerates.
  clone.pdf_url = null;
  clone.pdf_generated_at = null;
  clone.pdf_snapshot_version = 0;
  // Financing-profile snapshots are signed application-time provenance, not
  // clonable defaults. The database revalidates `appliedAt` on INSERT and a
  // strategy can change down payment anyway, so inheriting these columns is
  // both stale and capable of rejecting an otherwise valid scenario insert.
  clone.financing_profile_id = null;
  clone.financing_profile_version = null;
  clone.financing_profile_snapshot = null;
  clone.result_snapshot = releaseGateScenarioResultSnapshot(
    clone.result_snapshot,
  );

  let strategySetupRequired = false;
  // Apply only a schema-valid conservative preset and recompute its stored
  // metrics. The scenario label can name a destination strategy before all of
  // that strategy's inputs exist; in that case the cloned calculation keeps
  // the compatible source/general lens until setup is completed explicitly.
  // Never invent property type, rent, ADR, or occupancy at this server edge.
  if (strategyKind) {
    const baseValues = normalizeReleasedInvestmentFormSnapshot(
      deal.form_snapshot,
    );
    if (!baseValues) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message:
          "This saved analysis cannot safely create a strategy scenario. Reopen it in the analyzer, confirm the inputs, and save it again first.",
      };
    }
    if (baseValues) {
      const transition = buildScenarioStrategyTransition({
        baseValues,
        strategyKind,
        sourceResult: deal.result_snapshot,
      });
      const adjusted = transition.values;
      const targetAnalyzerStrategyKey = transition.analyzerStrategyKey;
      strategySetupRequired = transition.setupRequired;
      // A no-op strategy (buy-and-hold / flip) is a byte-for-byte clone and
      // may safely preserve a frozen snapshot. A preset that really changes
      // assumptions must never run today's engine while retaining an older
      // methodology label.
      if (
        adjusted !== baseValues &&
        shouldFreezeSavedMethodology(deal.methodology_version)
      ) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message:
            "This saved analysis uses a different underwriting version. Reopen and save it under the current standard before applying a strategy preset.",
        };
      }
      if (adjusted === baseValues) {
        // Core financial inputs did not change, so their frozen numbers stay
        // exact. The analysis lens still can change (notably Buy & Hold ↔
        // Fix & Flip), so retarget the identity and fail closed on any stale
        // or cross-strategy specialist payload.
        const currentResult = calculateAnalysis(baseValues);
        const currentScore = computeDealScore(
          buildDealScoreInputFromAnalysis(baseValues, currentResult),
        );
        const sourceResolution = resolveSavedAnalysisResult({
          methodologyVersion: deal.methodology_version,
          resultSnapshot: deal.result_snapshot,
          recomputedResult: currentResult,
          recomputedExtras: {
            score: currentScore.score,
            scoreMethodologyVersion: currentScore.scoreMethodologyVersion,
            recommendation: currentScore.recommendation,
            riskLevel: currentScore.riskLevel,
            breakdown: currentScore.breakdown,
            explanation: currentScore.explanation,
          },
        });
        if (!sourceResolution.result) {
          return {
            ok: false,
            code: "VALIDATION_ERROR",
            message:
              "This saved result is incomplete for a strategy scenario. Reopen it in the analyzer and save a complete current result first.",
          };
        }
        const resolvedSourceResult =
          sourceResolution.result as unknown as Record<string, unknown>;
        const sourceAnalyzerStrategyKey = persistedAnalyzerStrategyKey(
          resolvedSourceResult.analyzerStrategyKey,
          baseValues,
        );
        const retargetedResult = retargetUnchangedScenarioResultSnapshot({
          sourceResult: resolvedSourceResult,
          sourceStrategyKey: sourceAnalyzerStrategyKey,
          targetStrategyKey: targetAnalyzerStrategyKey,
        });
        if (!retargetedResult) {
          return {
            ok: false,
            code: "VALIDATION_ERROR",
            message:
              "This saved result cannot safely be retargeted. Reopen it in the analyzer and save it again first.",
          };
        }
        clone.result_snapshot = retargetedResult;
      } else {
        const result = calculateAnalysis(adjusted);
        // A scenario changes assumptions, not the investor's acquisition
        // criteria. Rebuilding result_snapshot from the calculator result used
        // to discard the source's tuned Offer Ceiling target, so the scenario
        // reopened under canonical defaults and quoted a different ceiling.
        // Normalize at this server boundary and carry only the supported target
        // shape into the recomputed snapshot.
        const sourceMaoTarget = normalizeMaoTarget(
          deal.result_snapshot?.maxOfferTarget,
        );
        const sourceMaoTargetSource =
          normalizeOfferCeilingTargetSource(
            deal.result_snapshot?.maxOfferTargetSource,
          ) ?? (sourceMaoTarget ? "selected-targets" : null);
        const dealScore = computeDealScore(
          buildDealScoreInputFromAnalysis(adjusted, result),
        );
        const { snapshotVersion, compareSnapshot } =
          buildCompareSnapshotPayload(result, adjusted);
        const analyzerStrategyKey = targetAnalyzerStrategyKey;
        const recomputedResultSnapshot: Record<string, unknown> = {
          ...result,
          propertyType: adjusted.propertyType,
          purchasePrice: adjusted.purchasePrice,
          score: dealScore.score,
          scoreMethodologyVersion: dealScore.scoreMethodologyVersion,
          recommendation: dealScore.recommendation,
          riskLevel: dealScore.riskLevel,
          breakdown: dealScore.breakdown,
          explanation: dealScore.explanation,
          snapshotVersion,
          compareSnapshot,
          analyzerStrategyKey,
        };
        const specialistAnalysis = buildSpecialistAnalysisSnapshot(
          adjusted,
          result,
          analyzerStrategyKey,
        );
        if (
          specialistAnalysis &&
          isSpecialistStrategyEnabled(analyzerStrategyKey)
        ) {
          recomputedResultSnapshot[SPECIALIST_ANALYSIS_SNAPSHOT_FIELD] =
            specialistAnalysis;
        }
        if (sourceMaoTarget)
          recomputedResultSnapshot.maxOfferTarget = sourceMaoTarget;
        if (sourceMaoTarget && sourceMaoTargetSource) {
          recomputedResultSnapshot.maxOfferTargetSource = sourceMaoTargetSource;
        }
        if (
          sourceMaoTarget &&
          sourceMaoTargetSource &&
          isAdoptedOfferCeilingTargetSource(sourceMaoTargetSource) &&
          (await hasPaidPlanSubscription(supabase, user.id))
        ) {
          const capturedAccess = resolveOfferCeilingForAccess({
            values: adjusted,
            target: sourceMaoTarget,
            source: sourceMaoTargetSource,
            paidAccess: true,
          });
          if (capturedAccess.access !== "exact") {
            return {
              ok: false,
              code: "SERVER_ERROR",
              message: "The scenario Offer Ceiling could not be captured.",
            };
          }
          recomputedResultSnapshot.offerCeilingExact = capturedAccess.exact;
        }
        const appreciationRatePct =
          adjusted.appreciationRatePct ?? DEFAULT_APPRECIATION_RATE;
        const sellingCostPct =
          adjusted.sellingCostPct ?? DEFAULT_SELLING_COST_PCT;
        clone.schema_version = INVESTCALC_SCHEMA_VERSION;
        clone.methodology_version = result.methodologyVersion;
        clone.form_snapshot = {
          ...adjusted,
          appreciationRatePct,
          sellingCostPct,
        } as unknown as Record<string, unknown>;
        clone.result_snapshot = recomputedResultSnapshot;
        // The preset changed modeled assumptions without fresh provenance.
        // Do not retain a top-level confidence claim whose detailed evidence
        // was intentionally omitted from the recomputed snapshot.
        clone.data_confidence = null;
        clone.property_type = adjusted.propertyType;
        clone.purchase_price = adjusted.purchasePrice;
        clone.address = adjusted.address.trim();
        clone.year_built = adjusted.yearBuilt;
        clone.loan_term_years = adjusted.loanTermYears;
        clone.interest_rate_pct = adjusted.interestRate;
        clone.down_payment_pct = adjusted.downPaymentPct;
        clone.closing_costs_pct = adjusted.closingCostsPct ?? 3;
        clone.bedrooms = adjusted.bedrooms ?? null;
        clone.bathrooms = adjusted.bathrooms ?? null;
        clone.sqft = adjusted.sqft ?? null;
        clone.monthly_rent = adjusted.monthlyRent ?? null;
        clone.net_cash_flow_monthly = result.netCashFlow;
        clone.coc_return_pct = result.cocReturn;
        clone.property_tax_pct =
          Math.round(result.propertyTaxPctEffective * 100) / 100;
        clone.insurance_input_mode = adjusted.insuranceInputMode;
        clone.insurance_pct = adjusted.insurancePct ?? null;
        clone.insurance_mo = result.insurance;
        clone.hoa_mo = result.hoa;
        clone.utilities_mo = result.utilities;
        clone.maintenance_pct = adjusted.maintenancePct;
        clone.vacancy_pct = adjusted.vacancyPct;
        clone.management_pct = adjusted.mgmtPct;
        clone.capex_pct = adjusted.capexPct;
        clone.building_value_pct = adjusted.buildingValuePct;
        clone.depreciation_years = adjusted.depreciationYears;
        clone.include_interest_deduction =
          adjusted.includeInterestDeduction ?? true;
        clone.tax_rate_pct = adjusted.taxRatePct ?? 24;
        clone.expense_growth_pct = adjusted.expenseGrowthPct;
        clone.rent_growth_pct = adjusted.rentGrowthPct;
        clone.template_id = adjusted.templateId ?? null;
        clone.appreciation_rate_pct = appreciationRatePct;
        clone.selling_cost_pct = sellingCostPct;
      }
    }
  }

  // Last-write invariant across every branch above, including byte-for-byte
  // no-strategy clones and unchanged-result retargeting.
  clone.result_snapshot = releaseGateScenarioResultSnapshot(
    clone.result_snapshot,
  );

  // A retained paid-workspace attachment must not turn an otherwise allowed
  // scenario into an entitlement error after downgrade. Keep the copied
  // underwriting values, but detach capabilities the current account cannot
  // use. Entitled users retain the useful client/tag/template association.
  if (!hasPlanFeature(entitlements, "pipeline")) clone.tags = [];
  if (!hasPlanFeature(entitlements, "client_buy_box")) clone.client_id = null;
  if (!hasPlanFeature(entitlements, "template_manage")) {
    clone.template_id = null;
    const formSnapshot = clone.form_snapshot;
    if (
      formSnapshot &&
      typeof formSnapshot === "object" &&
      !Array.isArray(formSnapshot) &&
      "templateId" in formSnapshot
    ) {
      const detachedSnapshot = {
        ...(formSnapshot as Record<string, unknown>),
      };
      delete detachedSnapshot.templateId;
      clone.form_snapshot = detachedSnapshot;
    }
  }

  // All capacity, release, methodology, and strategy-snapshot validation above
  // is read-only. Only now create/link the property grouping, so rejected
  // scenarios do not mutate the source workspace as a side effect.
  const resolved = await claimScenarioPropertyId(supabase, deal);
  if (!resolved.ok) return resolved.result;
  const propertyId = resolved.propertyId;

  // Unique scenario name per property (case-insensitive, among live rows).
  const { data: clash, error: clashErr } = await supabase
    .from("saved_analyses")
    .select("id, scenario_name, scenario_request_key")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .is("deleted_at", null);
  if (clashErr) {
    return isMissingSchema(clashErr)
      ? {
          ok: false,
          code: "MIGRATION_PENDING",
          message: "Schema migration pending.",
        }
      : toServerErrorResult(clashErr, "scenarios");
  }
  // A concurrent copy of this exact request may have committed after the
  // initial replay read. Reconcile it before treating its name as a conflict.
  const requestReplay = (clash ?? []).find(
    (row) =>
      (row as { scenario_request_key?: unknown }).scenario_request_key ===
      parsed.data.clientRequestId,
  );
  if (requestReplay) {
    return {
      ok: true,
      scenarioId: (requestReplay as { id: string }).id,
      strategySetupRequired,
    };
  }
  const nameTaken = (clash ?? []).some(
    (r) => {
      const existingName = (
        r as { scenario_name: string | null }
      ).scenario_name?.trim();
      return (existingName || "Base case").toLowerCase() ===
        scenarioName.toLowerCase();
    },
  );
  if (nameTaken) {
    return {
      ok: false,
      code: "DUPLICATE_SCENARIO_NAME",
      message: `You already have a "${scenarioName}" scenario for this property.`,
    };
  }

  clone.property_id = propertyId;

  const { data: inserted, error: insertErr } = await supabase
    .from("saved_analyses")
    .insert(clone)
    // INSERT + owner SELECT policies must both succeed before the action calls
    // this visible. The source link was verified above, so refresh can discover
    // the returned row from either sibling workspace.
    .select("id, property_id")
    .single();
  if (insertErr) {
    // Every INSERT error is ambiguous until the durable request key is read.
    // In particular, the serialized capacity trigger can reject a same-request
    // loser before PostgreSQL reaches the request-key unique index.
    const replay = await findScenarioRequest(
      supabase,
      user.id,
      parsed.data.clientRequestId,
    );
    if (replay.status !== "missing") return replay.result;

    if (isSavedAnalysisPlanCapacityError(insertErr)) {
      return {
        ok: false,
        code: "ENTITLEMENT_SAVE",
        message: `Saved deal limit reached for your plan (${getSavedDealLimitLabel(entitlements)}).`,
      };
    }
    if (isDuplicateScenarioRequestKeyError(insertErr)) {
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "The completed scenario request could not be reconciled.",
      };
    }
    // The preflight keeps the ordinary UX fast; the name index remains the
    // authority when different requests submit the same normalized name.
    if (isDuplicateScenarioNameError(insertErr)) {
      return {
        ok: false,
        code: "DUPLICATE_SCENARIO_NAME",
        message: `You already have a "${scenarioName}" scenario for this property.`,
      };
    }
    return isMissingSchema(insertErr)
      ? {
          ok: false,
          code: "MIGRATION_PENDING",
          message: "Schema migration pending.",
        }
      : toServerErrorResult(insertErr, "scenarios");
  }
  if (!inserted) {
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "The completed scenario request could not be verified.",
    };
  }
  if ((inserted as { property_id?: unknown }).property_id !== propertyId) {
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "The scenario workspace could not be verified.",
    };
  }

  return {
    ok: true,
    scenarioId: inserted.id as string,
    strategySetupRequired,
  };
}
