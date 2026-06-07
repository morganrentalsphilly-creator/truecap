"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlementsForUser } from "@/lib/entitlements";
import {
  buildTaxStrategyInputHash,
  buildTaxStrategyProjection,
  TAX_STRATEGY_SNAPSHOT_VERSION,
  type TaxStrategyInput,
  type TaxStrategySnapshotPayload,
  type TaxStrategyYear,
} from "@/lib/tax-strategy";

type TaxStrategySnapshotRequest = {
  analysisId: string;
  input: TaxStrategyInput;
};

export type TaxStrategySnapshotResult =
  | {
      ok: true;
      source: "cache" | "generated";
      snapshot: TaxStrategySnapshotPayload;
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
  tax_strategy_years: TaxStrategyYear[];
  generated_at: string;
};

function mapSnapshotRow(row: SnapshotRow): TaxStrategySnapshotPayload {
  return {
    analysisId: row.analysis_id,
    taxStrategyYears: row.tax_strategy_years,
    inputHash: row.input_hash,
    generatedAt: row.generated_at,
    version: row.version,
  };
}

export async function getTaxStrategySnapshotAction(
  request: TaxStrategySnapshotRequest
): Promise<TaxStrategySnapshotResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Please sign in to load saved tax strategy projections.",
    };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("tax_strategy")) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Upgrade to Pro to load tax strategy projections.",
    };
  }

  // Defense-in-depth UUID validation (TS types erased at runtime).
  const idParse = z.string().uuid().safeParse(request?.analysisId);
  if (!idParse.success) {
    return { ok: false, code: "NOT_FOUND", message: "Invalid analysis ID." };
  }
  const analysisId = idParse.data;
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

  const inputHash = buildTaxStrategyInputHash(request.input);
  const { data: existingSnapshot, error: existingSnapshotError } = await supabase
    .from("analysis_tax_strategy_snapshots")
    .select("analysis_id, version, input_hash, tax_strategy_years, generated_at")
    .eq("analysis_id", analysisId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingSnapshotError) {
    return { ok: false, code: "SERVER_ERROR", message: existingSnapshotError.message };
  }

  if (
    existingSnapshot &&
    existingSnapshot.version === TAX_STRATEGY_SNAPSHOT_VERSION &&
    existingSnapshot.input_hash === inputHash
  ) {
    return {
      ok: true,
      source: "cache",
      snapshot: mapSnapshotRow(existingSnapshot as SnapshotRow),
    };
  }

  const taxStrategyYears = buildTaxStrategyProjection(request.input);
  const generatedAt = new Date().toISOString();
  const upsertPayload = {
    analysis_id: analysisId,
    user_id: user.id,
    version: TAX_STRATEGY_SNAPSHOT_VERSION,
    input_hash: inputHash,
    tax_strategy_years: taxStrategyYears,
    generated_at: generatedAt,
  };

  const { data: savedSnapshot, error: savedSnapshotError } = await supabase
    .from("analysis_tax_strategy_snapshots")
    .upsert(upsertPayload, { onConflict: "analysis_id" })
    .select("analysis_id, version, input_hash, tax_strategy_years, generated_at")
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
