"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getEntitlementsForUser,
  hasPaidPlanSubscription,
} from "@/lib/entitlements";
import { toServerErrorResult } from "@/lib/db-error";
import {
  calculateAnalysis,
  mortgageInsuranceRunsToPayoff,
  type AnalysisResult,
} from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { normalizeReleasedInvestmentFormSnapshot } from "@/lib/underwriting-model-release";
import { activeMeteredEvaluationDealGrantsAccess } from "@/lib/evaluation-access-server";
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
      code:
        | "SIGN_IN_REQUIRED"
        | "ENTITLEMENT_REQUIRED"
        | "NOT_FOUND"
        | "SERVER_ERROR";
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

/** Build the projection request from owner-scoped canonical underwriting. */
function canonicalProjectionInput(
  values: InvestmentFormValues,
  result: AnalysisResult,
): TenYearProjectionInput {
  return {
    monthlyRentalIncome:
      result.monthlyRentalIncome + (result.recurringOtherIncomeMonthly ?? 0),
    scheduledRentMonthly: result.monthlyRentalIncome,
    recurringOtherIncomeMonthly: result.recurringOtherIncomeMonthly ?? 0,
    fixedOperatingExpensesMonthly:
      result.propertyTax +
      result.insurance +
      result.hoa +
      result.utilities +
      (result.recurringOtherExpenseMonthly ?? 0) +
      (result.turnoverReserveMonthly ?? 0) +
      (result.leasingReserveMonthly ?? 0) +
      (result.landscapingMonthly ?? 0) +
      (result.pestControlMonthly ?? 0) +
      (result.administrativeMonthly ?? 0),
    vacancyPct: values.vacancyPct,
    maintenancePct: values.maintenancePct,
    managementPct: values.mgmtPct,
    capexPct: values.capexPct,
    totalOperatingExpenses: result.totalOperatingExpenses,
    capexReserveMonthly: result.capex,
    monthlyPayment: result.monthlyPayment,
    pmiMonthly: result.pmiMonthly,
    pmiNoCancel: mortgageInsuranceRunsToPayoff(
      values.propertyType,
      values.pmiNoCancel,
    ),
    interestRate: values.interestRate,
    loanTermYears: values.loanTermYears,
    amortizationTermYears: values.amortizationTermYears ?? values.loanTermYears,
    interestOnlyMonths: values.interestOnlyMonths ?? 0,
    loanAmount: result.loanAmount,
    purchasePrice: values.purchasePrice,
    taxSavingsMonthly: result.taxSavingsMonthly,
    annualDepreciation: result.annualDepreciation,
    yearlyInterestSchedule: result.yearlyInterestSchedule,
    rentGrowthPct: values.rentGrowthPct,
    expenseGrowthPct: values.expenseGrowthPct,
    taxRate: result.effectiveTaxRate,
    includeInterestDeduction: values.includeInterestDeduction !== false,
    renovationStartMonth: values.renovationStartMonth,
    renovationDurationMonths: values.renovationDurationMonths,
    renovationRentLossPct: values.renovationRentLossPct,
  };
}

export async function getTenYearProjectionSnapshotAction(
  request: ProjectionSnapshotRequest,
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

  // Defense-in-depth UUID validation (TS types erased at runtime).
  const idParse = z.string().uuid().safeParse(request?.analysisId);
  if (!idParse.success) {
    return { ok: false, code: "NOT_FOUND", message: "Invalid analysis ID." };
  }
  const analysisId = idParse.data;
  const { data: savedAnalysis, error: savedAnalysisError } = await supabase
    .from("saved_analyses")
    .select("id, form_snapshot")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (savedAnalysisError) {
    return toServerErrorResult(savedAnalysisError, "ten-year-projections");
  }

  if (!savedAnalysis) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "This analysis is no longer available.",
    };
  }

  const values = normalizeReleasedInvestmentFormSnapshot(
    savedAnalysis.form_snapshot,
  );
  if (!values) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "This analysis is not available.",
    };
  }

  const [entitlements, hasPaidPlan, meteredEvaluationDeal] = await Promise.all([
    getEntitlementsForUser(supabase, user.id),
    hasPaidPlanSubscription(supabase, user.id),
    activeMeteredEvaluationDealGrantsAccess(supabase, user.id, values),
  ]);
  const paidProjectionAccess =
    hasPaidPlan && entitlements.features.includes("projections");
  if (!paidProjectionAccess && !meteredEvaluationDeal) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message:
        "10-year projections require an active Pro plan or the exact metered evaluation deal.",
    };
  }

  // Never calculate or cache a caller-authored projection input. The saved,
  // owner-scoped form snapshot is the authority, so an evaluation ledger row
  // for one deal cannot be replayed with a different set of projection terms.
  const input = canonicalProjectionInput(values, calculateAnalysis(values));

  const inputHash = buildTenYearProjectionInputHash(input);
  const { data: existingSnapshot, error: existingSnapshotError } =
    await supabase
      .from("analysis_projection_snapshots")
      .select(
        "analysis_id, version, input_hash, projection_years, generated_at",
      )
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (existingSnapshotError) {
    return toServerErrorResult(existingSnapshotError, "ten-year-projections");
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

  const projectionYears = buildTenYearProjection(input);
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
    return toServerErrorResult(savedSnapshotError, "ten-year-projections");
  }

  return {
    ok: true,
    source: "generated",
    snapshot: mapSnapshotRow(savedSnapshot as SnapshotRow),
  };
}
