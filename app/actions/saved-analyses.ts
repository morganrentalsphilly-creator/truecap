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
import { DEFAULT_APPRECIATION_RATE, DEFAULT_SELLING_COST_PCT } from "@/lib/exit-scenarios";
import { buildCompareSnapshotPayload } from "@/lib/compare-result-snapshot";
import { PDF_SNAPSHOT_VERSION } from "@/lib/pdf-export-constants";

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

export type GetSavedDealForEditingResult =
  | {
      ok: true;
      id: string;
      schemaVersion: number;
      formSnapshot: Record<string, unknown>;
      templateFallback: {
        id: string;
        templateName: string;
        templateDescription: string | null;
      } | null;
      resultSnapshot: Record<string, unknown>;
    }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "NOT_FOUND" | "SERVER_ERROR";
      message: string;
    };

export type UpdateSavedDealLifecycleResult =
  | { ok: true }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR";
      message: string;
    };

export type GetSavedAnalysisPdfExportResult =
  | { ok: true; source: "cache"; pdfUrl: string }
  | {
      ok: true;
      source: "regenerate";
      id: string;
      schemaVersion: number;
      formSnapshot: Record<string, unknown>;
      templateFallback: SavedTemplateFallback | null;
      resultSnapshot: Record<string, unknown>;
    }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "NOT_FOUND" | "SERVER_ERROR";
      message: string;
    };

export type CompleteSavedAnalysisPdfExportResult =
  | { ok: true; pdfUrl: string }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR";
      message: string;
    };

type SavedTemplateFallback = {
  id: string;
  templateName: string;
  templateDescription: string | null;
};

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

function dbBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function dbString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function buildEditFormSnapshotFromRow(row: Record<string, unknown>): Record<string, unknown> {
  const rawSnapshot = asRecord(row.form_snapshot) ?? {};

  return {
    ...rawSnapshot,
    propertyType:
      rawSnapshot.propertyType ??
      (row.property_type === "single-family" ||
      row.property_type === "multi-family" ||
      row.property_type === "owner-occupant"
        ? row.property_type
        : undefined),
    address: rawSnapshot.address ?? dbString(row.address) ?? "",
    purchasePrice: rawSnapshot.purchasePrice ?? dbNumber(row.purchase_price),
    yearBuilt: rawSnapshot.yearBuilt ?? dbNumber(row.year_built),
    bedrooms: rawSnapshot.bedrooms ?? dbNumber(row.bedrooms),
    bathrooms: rawSnapshot.bathrooms ?? dbNumber(row.bathrooms),
    sqft: rawSnapshot.sqft ?? dbNumber(row.sqft),
    monthlyRent: rawSnapshot.monthlyRent ?? dbNumber(row.monthly_rent),
    downPaymentPct: rawSnapshot.downPaymentPct ?? dbNumber(row.down_payment_pct),
    interestRate: rawSnapshot.interestRate ?? dbNumber(row.interest_rate_pct),
    loanTermYears: rawSnapshot.loanTermYears ?? dbNumber(row.loan_term_years),
    closingCostsPct: rawSnapshot.closingCostsPct ?? dbNumber(row.closing_costs_pct),
    maintenancePct: rawSnapshot.maintenancePct ?? dbNumber(row.maintenance_pct),
    vacancyPct: rawSnapshot.vacancyPct ?? dbNumber(row.vacancy_pct),
    mgmtPct: rawSnapshot.mgmtPct ?? dbNumber(row.management_pct),
    capexPct: rawSnapshot.capexPct ?? dbNumber(row.capex_pct),
    buildingValuePct: rawSnapshot.buildingValuePct ?? dbNumber(row.building_value_pct),
    depreciationYears: rawSnapshot.depreciationYears ?? dbNumber(row.depreciation_years),
    includeInterestDeduction:
      rawSnapshot.includeInterestDeduction ?? dbBoolean(row.include_interest_deduction),
    taxRatePct: rawSnapshot.taxRatePct ?? dbNumber(row.tax_rate_pct),
    expenseGrowthPct: rawSnapshot.expenseGrowthPct ?? dbNumber(row.expense_growth_pct),
    rentGrowthPct: rawSnapshot.rentGrowthPct ?? dbNumber(row.rent_growth_pct),
    propertyTaxPct: rawSnapshot.propertyTaxPct ?? dbNumber(row.property_tax_pct),
    insuranceInputMode:
      rawSnapshot.insuranceInputMode ??
      (row.insurance_input_mode === "percent" || row.insurance_input_mode === "monthly"
        ? row.insurance_input_mode
        : undefined),
    insurancePct: rawSnapshot.insurancePct ?? dbNumber(row.insurance_pct),
    insuranceMonthly: rawSnapshot.insuranceMonthly ?? dbNumber(row.insurance_mo),
    hoaMonthly: rawSnapshot.hoaMonthly ?? dbNumber(row.hoa_mo),
    utilitiesMonthly: rawSnapshot.utilitiesMonthly ?? dbNumber(row.utilities_mo),
    templateId: rawSnapshot.templateId ?? dbString(row.template_id),
    units: Array.isArray(rawSnapshot.units) ? rawSnapshot.units : undefined,
    appreciationRatePct:
      dbNumber(rawSnapshot.appreciationRatePct) ??
      dbNumber(row.appreciation_rate_pct) ??
      DEFAULT_APPRECIATION_RATE,
    sellingCostPct:
      dbNumber(rawSnapshot.sellingCostPct) ??
      dbNumber(row.selling_cost_pct) ??
      DEFAULT_SELLING_COST_PCT,
  };
}

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
  const sanitizedUnits = (values.units ?? []).filter((unit) =>
    isValidRentalUnit(unit, {
      allowZeroRent: values.propertyType === "owner-occupant" && !!unit.isOwnerOccupied,
    })
  );
  const sanitizedValues: InvestmentFormValues = {
    ...values,
    units: sanitizedUnits,
  };
  const addressTrimmed = values.address.trim();
  const result = calculateAnalysis(sanitizedValues);
  const dealScore = computeDealScore({
    propertyType: values.propertyType,
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
  const { snapshotVersion, compareSnapshot } = buildCompareSnapshotPayload(result, sanitizedValues);
  const resultSnapshotWithScore = {
    ...result,
    propertyType: sanitizedValues.propertyType,
    purchasePrice: sanitizedValues.purchasePrice,
    score: dealScore.score,
    recommendation: dealScore.recommendation,
    riskLevel: dealScore.riskLevel,
    snapshotVersion,
    compareSnapshot,
  } as Record<string, unknown>;
  const title =
    values.address.trim().length > 0
      ? values.address.slice(0, 200)
      : `${values.propertyType} analysis`;

  const closingCostsPctEffective = values.closingCostsPct ?? 3;
  const appreciationRatePctStored = sanitizedValues.appreciationRatePct ?? DEFAULT_APPRECIATION_RATE;
  const sellingCostPctStored = sanitizedValues.sellingCostPct ?? DEFAULT_SELLING_COST_PCT;
  const formSnapshotPersisted = {
    ...sanitizedValues,
    appreciationRatePct: appreciationRatePctStored,
    sellingCostPct: sellingCostPctStored,
  };

  const payload = {
    title,
    schema_version: INVESTCALC_SCHEMA_VERSION,
    form_snapshot: formSnapshotPersisted as unknown as Record<string, unknown>,
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
    insurance_input_mode: sanitizedValues.insuranceInputMode,
    insurance_pct: sanitizedValues.insurancePct ?? null,
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
    appreciation_rate_pct: appreciationRatePctStored,
    selling_cost_pct: sellingCostPctStored,
    pdf_url: null,
    pdf_generated_at: null,
    pdf_snapshot_version: 0,
    last_activity_at: new Date().toISOString(),
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

export async function getSavedDealForEditingAction(id: string): Promise<GetSavedDealForEditingResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Please sign in to open saved analyses.",
    };
  }

  const { data, error } = await supabase
    .from("saved_analyses")
    .select(
      "id, schema_version, form_snapshot, result_snapshot, property_type, address, purchase_price, year_built, loan_term_years, interest_rate_pct, down_payment_pct, closing_costs_pct, bedrooms, bathrooms, sqft, monthly_rent, property_tax_pct, insurance_input_mode, insurance_pct, insurance_mo, hoa_mo, utilities_mo, maintenance_pct, vacancy_pct, management_pct, capex_pct, building_value_pct, depreciation_years, include_interest_deduction, tax_rate_pct, expense_growth_pct, rent_growth_pct, template_id, appreciation_rate_pct, selling_cost_pct"
    )
    .eq("id", id.trim())
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  if (!data) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "This saved analysis is no longer available.",
    };
  }

  await supabase
    .from("saved_analyses")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", id.trim())
    .eq("user_id", user.id)
    .is("deleted_at", null);

  const templateId = dbString((data as Record<string, unknown>).template_id);
  let templateFallback: SavedTemplateFallback | null = null;

  if (templateId) {
    const { data: templateRow } = await supabase
      .from("analysis_templates")
      .select("id, template_name, template_description")
      .eq("id", templateId)
      .maybeSingle();

    if (templateRow) {
      templateFallback = {
        id: String(templateRow.id),
        templateName: String(templateRow.template_name),
        templateDescription:
          typeof templateRow.template_description === "string"
            ? templateRow.template_description
            : null,
      };
    }
  }

  return {
    ok: true,
    id: String(data.id),
    schemaVersion: Number(data.schema_version ?? 1),
    formSnapshot: buildEditFormSnapshotFromRow(data as Record<string, unknown>),
    templateFallback,
    resultSnapshot: (asRecord((data as Record<string, unknown>).result_snapshot) ?? {}) as Record<
      string,
      unknown
    >,
  };
}

async function getTemplateFallback(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  templateId: string | undefined
): Promise<SavedTemplateFallback | null> {
  if (!templateId) return null;

  const { data: templateRow } = await supabase
    .from("analysis_templates")
    .select("id, template_name, template_description")
    .eq("id", templateId)
    .maybeSingle();

  if (!templateRow) return null;

  return {
    id: String(templateRow.id),
    templateName: String(templateRow.template_name),
    templateDescription:
      typeof templateRow.template_description === "string" ? templateRow.template_description : null,
  };
}

export async function getSavedAnalysisPdfExportAction(
  id: string
): Promise<GetSavedAnalysisPdfExportResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Please sign in to export saved analyses.",
    };
  }

  const savedDealId = id.trim();
  const { data, error } = await supabase
    .from("saved_analyses")
    .select(
      "id, schema_version, form_snapshot, result_snapshot, property_type, address, purchase_price, year_built, loan_term_years, interest_rate_pct, down_payment_pct, closing_costs_pct, bedrooms, bathrooms, sqft, monthly_rent, property_tax_pct, insurance_input_mode, insurance_pct, insurance_mo, hoa_mo, utilities_mo, maintenance_pct, vacancy_pct, management_pct, capex_pct, building_value_pct, depreciation_years, include_interest_deduction, tax_rate_pct, expense_growth_pct, rent_growth_pct, template_id, appreciation_rate_pct, selling_cost_pct, pdf_url, pdf_snapshot_version"
    )
    .eq("id", savedDealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  if (!data) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "This saved analysis is no longer available.",
    };
  }

  const row = data as Record<string, unknown>;
  const cachedPdfUrl = dbString(row.pdf_url);
  const cachedVersion = dbNumber(row.pdf_snapshot_version) ?? 0;

  await supabase
    .from("saved_analyses")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", savedDealId)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (cachedPdfUrl && cachedVersion === PDF_SNAPSHOT_VERSION) {
    return { ok: true, source: "cache", pdfUrl: cachedPdfUrl };
  }

  const templateFallback = await getTemplateFallback(supabase, dbString(row.template_id));

  return {
    ok: true,
    source: "regenerate",
    id: String(row.id),
    schemaVersion: Number(row.schema_version ?? 1),
    formSnapshot: buildEditFormSnapshotFromRow(row),
    templateFallback,
    resultSnapshot: (asRecord(row.result_snapshot) ?? {}) as Record<string, unknown>,
  };
}

export async function completeSavedAnalysisPdfExportAction(
  id: string,
  pdfUrl: string
): Promise<CompleteSavedAnalysisPdfExportResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to save PDF exports." };
  }

  const savedDealId = id.trim();
  const cleanPdfUrl = pdfUrl.trim();
  if (!savedDealId || !cleanPdfUrl) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid PDF export payload." };
  }

  const { data, error } = await supabase
    .from("saved_analyses")
    .update({
      pdf_url: cleanPdfUrl,
      pdf_generated_at: new Date().toISOString(),
      pdf_snapshot_version: PDF_SNAPSHOT_VERSION,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", savedDealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  if (!data) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }

  return { ok: true, pdfUrl: cleanPdfUrl };
}

export async function updateSavedDealLifecycleStateAction(
  id: string,
  state: "active" | "completed" | "archived"
): Promise<UpdateSavedDealLifecycleResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to update deal status." };
  }

  const savedDealId = id.trim();
  if (!savedDealId) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal id." };
  }

  const updatePayload =
    state === "active"
      ? { is_completed: false, is_archived: false, last_activity_at: new Date().toISOString() }
      : state === "completed"
        ? { is_completed: true, is_archived: false, last_activity_at: new Date().toISOString() }
        : { is_completed: false, is_archived: true, last_activity_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from("saved_analyses")
    .update(updatePayload)
    .eq("id", savedDealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  if (!data) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }

  return { ok: true };
}
