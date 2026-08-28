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
import { defaultScenarioName, isStrategyKind } from "@/lib/strategy-kinds";
import { applyStrategyPreset } from "@/lib/scenario-presets";
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
  resolveScenarioAnalyzerStrategyKey,
} from "@/lib/analyzer-strategy-persistence";
import {
  buildSpecialistAnalysisSnapshot,
  parseSpecialistAnalysisSnapshot,
  SPECIALIST_ANALYSIS_SNAPSHOT_FIELD,
} from "@/lib/specialist-analysis-snapshot";
import { retargetUnchangedScenarioResultSnapshot } from "@/lib/scenario-result-snapshot";
import { persistedLifecycleForSimpleState } from "@/lib/saved-deal-lifecycle";
import {
  isScenarioStrategyEnabled,
  isSpecialistStrategyEnabled,
} from "@/lib/feature-flags";

export type ScenarioSummary = {
  id: string;
  scenarioName: string;
  strategyKind: string | null;
  title: string | null;
  /** The original saved analysis for this property (`scenario_name IS NULL`). */
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
    /relation .* does not exist|column .* does not exist/i.test(
      error.message ?? "",
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

/** Ensure the source deal has a property, creating + linking one if needed. */
async function resolvePropertyId(
  supabase: SupabaseClient,
  userId: string,
  deal: DealRow,
): Promise<
  { ok: true; propertyId: string } | { ok: false; result: AddScenarioResult }
> {
  if (deal.property_id) return { ok: true, propertyId: deal.property_id };

  const address = dealAddress(deal);
  if (!address) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "This deal has no address to group scenarios under.",
      },
    };
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
        ? {
            ok: false,
            code: "MIGRATION_PENDING",
            message: "Schema migration pending.",
          }
        : toServerErrorResult(findErr, "scenarios"),
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
          ? {
              ok: false,
              code: "MIGRATION_PENDING",
              message: "Schema migration pending.",
            }
          : toServerErrorResult(createErr, "scenarios"),
      };
    }
    propertyId = created.id as string;
  }

  // Link the source deal to the property (best-effort).
  await supabase
    .from("saved_analyses")
    .update({ property_id: propertyId })
    .eq("id", deal.id)
    .eq("user_id", userId);
  return { ok: true, propertyId };
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
    .select("id, property_id, address, form_snapshot")
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
    };
    return {
      id: row.id,
      scenarioName: row.scenario_name ?? "Base case",
      strategyKind: isStrategyKind(row.strategy_kind)
        ? row.strategy_kind
        : null,
      title: row.title,
      isBase: row.scenario_name == null,
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

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "save_deal")) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Saving scenarios requires a plan that can save deals.",
    };
  }

  const strategyKind = isStrategyKind(parsed.data.strategyKind)
    ? parsed.data.strategyKind
    : null;
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
  const resolved = await resolvePropertyId(supabase, user.id, deal);
  if (!resolved.ok) return resolved.result;
  const propertyId = resolved.propertyId;

  const scenarioName = (
    parsed.data.scenarioName?.trim() || defaultScenarioName(strategyKind)
  ).slice(0, 80);

  // Unique scenario name per property (case-insensitive, among live rows).
  const { data: clash, error: clashErr } = await supabase
    .from("saved_analyses")
    .select("id, scenario_name")
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
  const nameTaken = (clash ?? []).some(
    (r) =>
      ((r as { scenario_name: string | null }).scenario_name ?? "Base case")
        .trim()
        .toLowerCase() === scenarioName.toLowerCase(),
  );
  if (nameTaken) {
    return {
      ok: false,
      code: "DUPLICATE_SCENARIO_NAME",
      message: `You already have a "${scenarioName}" scenario for this property.`,
    };
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
  // Keep ownership explicit even though the source row is already owner-scoped
  // and RLS enforces the same invariant. This prevents a future privileged
  // client/helper refactor from accidentally inheriting an ambiguous owner.
  clone.user_id = user.id;
  clone.property_id = propertyId;
  clone.scenario_name = scenarioName;
  clone.strategy_kind = strategyKind;
  // The source may donate assumptions from any lifecycle state, but a scenario
  // is always a new deal to evaluate. Never inherit Passed, Closed, or stale
  // compatibility flags that would hide or lock the newly created scenario.
  Object.assign(clone, persistedLifecycleForSimpleState("active"));
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

  // Apply the (conservative) strategy preset to the assumptions and RECOMPUTE
  // the stored metrics, so the new scenario doesn't show the source deal's
  // numbers. Only touches the fields the preset changes; the user edits the
  // rest (notably rent) in the deal view. Skipped if the snapshot can't parse.
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
      const adjusted = applyStrategyPreset(baseValues, strategyKind);
      const targetAnalyzerStrategyKey = resolveScenarioAnalyzerStrategyKey({
        strategyKind,
        sourceResult: deal.result_snapshot,
        values: adjusted,
      });
      const requiredAnalyzerStrategyKey =
        strategyKind === "brrrr"
          ? "brrrr"
          : strategyKind === "flip"
            ? "fix-flip"
            : strategyKind === "house_hack"
              ? "house-hack"
              : strategyKind === "str"
                ? "short-term"
                : null;
      if (
        requiredAnalyzerStrategyKey &&
        targetAnalyzerStrategyKey !== requiredAnalyzerStrategyKey
      ) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message:
            "This strategy needs its required property and income setup first. Open the source in the analyzer, choose this analysis type, complete its visible inputs, run it, and then add the scenario.",
        };
      }
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

  const { data: inserted, error: insertErr } = await supabase
    .from("saved_analyses")
    .insert(clone)
    .select("id")
    .single();
  if (insertErr || !inserted) {
    return isMissingSchema(insertErr ?? {})
      ? {
          ok: false,
          code: "MIGRATION_PENDING",
          message: "Schema migration pending.",
        }
      : toServerErrorResult(insertErr, "scenarios");
  }

  return { ok: true, scenarioId: inserted.id as string };
}
