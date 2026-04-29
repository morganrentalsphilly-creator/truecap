"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlementsForUser } from "@/lib/entitlements";
import {
  buildTenYearProjection,
  buildTenYearProjectionInputHash,
  TEN_YEAR_PROJECTION_SNAPSHOT_VERSION,
  type ProjectionYear,
  type TenYearProjectionInput,
  type TenYearProjectionSnapshotPayload,
} from "@/lib/ten-year-projections";

type ProjectionSnapshotRequest = {
  analysisId: string;
  input: TenYearProjectionInput;
};

export type ProjectionSnapshotResult =
  | {
      ok: true;
      source: "cache" | "generated";
      snapshot: TenYearProjectionSnapshotPayload;
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
  projection_years: ProjectionYear[];
  generated_at: string;
};

function mapSnapshotRow(row: SnapshotRow): TenYearProjectionSnapshotPayload {
  return {
    analysisId: row.analysis_id,
    projectionYears: row.projection_years,
    inputHash: row.input_hash,
    generatedAt: row.generated_at,
    version: row.version,
  };
}

export async function getTenYearProjectionSnapshotAction(
  request: ProjectionSnapshotRequest
): Promise<ProjectionSnapshotResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Please sign in to load saved projections.",
    };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("projections")) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Upgrade to Pro to load 10-year projections.",
    };
  }

  const analysisId = request.analysisId.trim();
  const { data: savedAnalysis, error: savedAnalysisError } = await supabase
    .from("saved_analyses")
    .select("id")
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

  const inputHash = buildTenYearProjectionInputHash(request.input);
  const { data: existingSnapshot, error: existingSnapshotError } = await supabase
    .from("analysis_projection_snapshots")
    .select("analysis_id, version, input_hash, projection_years, generated_at")
    .eq("analysis_id", analysisId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingSnapshotError) {
    return { ok: false, code: "SERVER_ERROR", message: existingSnapshotError.message };
  }

  if (
    existingSnapshot &&
    existingSnapshot.version === TEN_YEAR_PROJECTION_SNAPSHOT_VERSION &&
    existingSnapshot.input_hash === inputHash
  ) {
    return {
      ok: true,
      source: "cache",
      snapshot: mapSnapshotRow(existingSnapshot as SnapshotRow),
    };
  }

  const projectionYears = buildTenYearProjection(request.input);
  const generatedAt = new Date().toISOString();
  const upsertPayload = {
    analysis_id: analysisId,
    user_id: user.id,
    version: TEN_YEAR_PROJECTION_SNAPSHOT_VERSION,
    input_hash: inputHash,
    projection_years: projectionYears,
    generated_at: generatedAt,
  };

  const { data: savedSnapshot, error: savedSnapshotError } = await supabase
    .from("analysis_projection_snapshots")
    .upsert(upsertPayload, { onConflict: "analysis_id" })
    .select("analysis_id, version, input_hash, projection_years, generated_at")
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
