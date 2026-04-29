"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlementsForUser } from "@/lib/entitlements";
import {
  buildExitScenarioInputHash,
  buildExitScenarios,
  DEFAULT_APPRECIATION_RATE,
  DEFAULT_SELLING_COST_PCT,
  EXIT_SCENARIOS_SNAPSHOT_VERSION,
  type ExitScenarioInput,
  type ExitScenarioSnapshotPayload,
  type ExitScenarioYear,
} from "@/lib/exit-scenarios";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

function dbNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

type ExitScenarioSnapshotRequest = {
  analysisId: string;
  input: ExitScenarioInput;
};

export type ExitScenarioSnapshotResult =
  | {
      ok: true;
      source: "cache" | "generated";
      snapshot: ExitScenarioSnapshotPayload;
    }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "NOT_FOUND" | "SERVER_ERROR";
      message: string;
    };

type SnapshotRow = {
  analysis_id: string;
  version: number;
  input_hash: string;
  exit_scenario_years: ExitScenarioYear[];
  generated_at: string;
};

function mapSnapshotRow(row: SnapshotRow): ExitScenarioSnapshotPayload {
  return {
    analysisId: row.analysis_id,
    exitScenarioYears: row.exit_scenario_years,
    inputHash: row.input_hash,
    generatedAt: row.generated_at,
    version: row.version,
  };
}

export async function getExitScenarioSnapshotAction(
  request: ExitScenarioSnapshotRequest
): Promise<ExitScenarioSnapshotResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Please sign in to load saved exit scenarios.",
    };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("projections")) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Upgrade to Pro to load exit scenarios.",
    };
  }

  const analysisId = request.analysisId.trim();
  const { data: savedAnalysis, error: savedAnalysisError } = await supabase
    .from("saved_analyses")
    .select("id, appreciation_rate_pct, selling_cost_pct, form_snapshot")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (savedAnalysisError) {
    return { ok: false, code: "SERVER_ERROR", message: savedAnalysisError.message };
  }

  if (!savedAnalysis) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "This analysis is no longer available.",
    };
  }

  const snap = asRecord(savedAnalysis.form_snapshot);
  const storedAppreciation =
    dbNumber(savedAnalysis.appreciation_rate_pct) ??
    dbNumber(snap?.appreciationRatePct) ??
    DEFAULT_APPRECIATION_RATE;
  const storedSelling =
    dbNumber(savedAnalysis.selling_cost_pct) ??
    dbNumber(snap?.sellingCostPct) ??
    DEFAULT_SELLING_COST_PCT;

  const resolvedInput: ExitScenarioInput = {
    ...request.input,
    appreciationRate: storedAppreciation,
    sellingCostPct: storedSelling,
  };

  const inputHash = buildExitScenarioInputHash(resolvedInput);
  const { data: existingSnapshot, error: existingSnapshotError } = await supabase
    .from("analysis_exit_scenario_snapshots")
    .select("analysis_id, version, input_hash, exit_scenario_years, generated_at")
    .eq("analysis_id", analysisId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingSnapshotError) {
    return { ok: false, code: "SERVER_ERROR", message: existingSnapshotError.message };
  }

  if (
    existingSnapshot &&
    existingSnapshot.version === EXIT_SCENARIOS_SNAPSHOT_VERSION &&
    existingSnapshot.input_hash === inputHash
  ) {
    return {
      ok: true,
      source: "cache",
      snapshot: mapSnapshotRow(existingSnapshot as SnapshotRow),
    };
  }

  const exitScenarioYears = buildExitScenarios(resolvedInput);
  const generatedAt = new Date().toISOString();
  const upsertPayload = {
    analysis_id: analysisId,
    user_id: user.id,
    version: EXIT_SCENARIOS_SNAPSHOT_VERSION,
    input_hash: inputHash,
    exit_scenario_years: exitScenarioYears,
    generated_at: generatedAt,
  };

  const { data: savedSnapshot, error: savedSnapshotError } = await supabase
    .from("analysis_exit_scenario_snapshots")
    .upsert(upsertPayload, { onConflict: "analysis_id" })
    .select("analysis_id, version, input_hash, exit_scenario_years, generated_at")
    .single();

  if (savedSnapshotError) {
    return { ok: false, code: "SERVER_ERROR", message: savedSnapshotError.message };
  }

  return {
    ok: true,
    source: "generated",
    snapshot: mapSnapshotRow(savedSnapshot as SnapshotRow),
  };
}
