"use server";

import { calculateAnalysis } from "@/lib/calc-analysis";
import { computeDealScore } from "@/lib/deal-score";
import { getEntitlementsForUser } from "@/lib/entitlements";
import {
  INVESTCALC_SCHEMA_VERSION,
  investmentFormSchema,
  isValidRentalUnit,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SaveDealResult =
  | { ok: true; id: string; mode: "inserted" | "updated" }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "VALIDATION_ERROR"
        | "ENTITLEMENT_SAVE"
        | "DUPLICATE_ADDRESS"
        | "SERVER_ERROR";
      message?: string;
    };

export async function saveDealAction(input: unknown, existingId?: string | null): Promise<SaveDealResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  const parsed = investmentFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid form payload" };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("save_deal")) {
    return {
      ok: false,
      code: "ENTITLEMENT_SAVE",
      message: "Upgrade required to save deals",
    };
  }

  const values = parsed.data;
  const sanitizedUnits = (values.units ?? []).filter((unit) => isValidRentalUnit(unit));
  const sanitizedValues: InvestmentFormValues = {
    ...values,
    units: sanitizedUnits,
  };
  const addressTrimmed = values.address.trim();
  const result = calculateAnalysis(sanitizedValues);
  const dealScore = computeDealScore({
    monthlyCashFlow: result.netCashFlow,
    cashOnCashReturn: result.cocReturn,
    capRate: result.capRate,
    dscr: result.dscr,
    vacancyRate: values.vacancyPct,
    propertyAge: result.propertyAge,
    capexPct: result.capexPctEffective,
    maintenancePct: result.maintenancePctEffective,
    monthlyPropertyTax: result.propertyTax,
    monthlyRentIncome: result.monthlyRentalIncome,
  });
  const resultSnapshotWithScore = {
    ...result,
    score: dealScore.score,
    recommendation: dealScore.recommendation,
    riskLevel: dealScore.riskLevel,
  } as Record<string, unknown>;
  const title =
    values.address.trim().length > 0
      ? values.address.slice(0, 200)
      : `${values.propertyType} analysis`;

  const closingCostsPctEffective = values.closingCostsPct ?? 3;

  const payload = {
    title,
    schema_version: INVESTCALC_SCHEMA_VERSION,
    form_snapshot: sanitizedValues as unknown as Record<string, unknown>,
    result_snapshot: resultSnapshotWithScore,
    property_type: sanitizedValues.propertyType,
    purchase_price: sanitizedValues.purchasePrice,
    address: addressTrimmed,
    year_built: sanitizedValues.yearBuilt,
    loan_term_years: sanitizedValues.loanTermYears,
    interest_rate_pct: sanitizedValues.interestRate,
    down_payment_pct: sanitizedValues.downPaymentPct,
    closing_costs_pct: closingCostsPctEffective,
    bedrooms: sanitizedValues.bedrooms ?? null,
    bathrooms: sanitizedValues.bathrooms ?? null,
    sqft: sanitizedValues.sqft ?? null,
    monthly_rent: sanitizedValues.monthlyRent ?? null,
    net_cash_flow_monthly: result.netCashFlow,
    coc_return_pct: result.cocReturn,
    property_tax_pct: sanitizedValues.propertyTaxPct ?? 1.1,
    insurance_mo: result.insurance,
    hoa_mo: result.hoa,
    utilities_mo: result.utilities,
    maintenance_pct: sanitizedValues.maintenancePct,
    vacancy_pct: sanitizedValues.vacancyPct,
    management_pct: sanitizedValues.mgmtPct,
    capex_pct: sanitizedValues.capexPct,
    building_value_pct: sanitizedValues.buildingValuePct,
    depreciation_years: sanitizedValues.depreciationYears,
    include_interest_deduction: sanitizedValues.includeInterestDeduction ?? true,
    tax_rate_pct: sanitizedValues.taxRatePct ?? 24,
    expense_growth_pct: sanitizedValues.expenseGrowthPct,
    rent_growth_pct: sanitizedValues.rentGrowthPct,
    template_id: sanitizedValues.templateId ?? null,
  };

  const candidateExistingId = existingId?.trim();
  if (candidateExistingId) {
    const { data: existing, error: existingErr } = await supabase
      .from("saved_analyses")
      .select("id, address")
      .eq("id", candidateExistingId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingErr) {
      return { ok: false, code: "SERVER_ERROR", message: existingErr.message };
    }

    if (existing) {
      if ((existing.address ?? "").trim().toLowerCase() !== addressTrimmed.toLowerCase()) {
        return {
          ok: false,
          code: "DUPLICATE_ADDRESS",
          message: "This saved analysis can only be updated while keeping the same property address.",
        };
      }

      const { data, error } = await supabase
        .from("saved_analyses")
        .update(payload)
        .eq("id", existing.id)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .select("id")
        .single();

      if (error) {
        return { ok: false, code: "SERVER_ERROR", message: error.message };
      }

      return { ok: true, id: data.id, mode: "updated" };
    }
  }

  const { data: addressTaken, error: dupErr } = await supabase.rpc("saved_analyses_address_taken", {
    p_user_id: user.id,
    p_address: addressTrimmed,
  });
  if (dupErr) {
    return { ok: false, code: "SERVER_ERROR", message: dupErr.message };
  }
  if (addressTaken === true) {
    return {
      ok: false,
      code: "DUPLICATE_ADDRESS",
      message: "You already saved an analysis for this property address.",
    };
  }

  const { count, error: countErr } = await supabase
    .from("saved_analyses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (countErr) {
    return { ok: false, code: "SERVER_ERROR", message: countErr.message };
  }

  if ((count ?? 0) >= entitlements.max_saved_deals) {
    return {
      ok: false,
      code: "ENTITLEMENT_SAVE",
      message: "Saved deal limit reached for your plan",
    };
  }

  const { data, error } = await supabase
    .from("saved_analyses")
    .insert({
      user_id: user.id,
      ...payload,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  return { ok: true, id: data.id, mode: "inserted" };
}
