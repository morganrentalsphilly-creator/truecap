"use server";

import { analysisTemplateSchema } from "@/lib/analysis-template-schema";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_APPRECIATION_RATE, DEFAULT_SELLING_COST_PCT } from "@/lib/exit-scenarios";

/** Columns shared with `saved_analyses` / investment form (camelCase in app). */
export type AnalysisTemplateOption = {
  id: string;
  templateName: string;
  templateDescription: string | null;
  templateType: "conservative" | "balanced" | "aggressive";
  isSystem: boolean;
  propertyTaxPct: number;
  insuranceInputMode: "percent" | "monthly";
  insurancePct: number | null;
  insuranceMo: number | null;
  maintenancePct: number;
  vacancyPct: number;
  managementPct: number;
  capexPct: number;
  closingCostsPct: number;
  interestRatePct: number;
  downPaymentPct: number;
  expenseGrowthPct: number;
  rentGrowthPct: number;
  appreciationRatePct: number;
  sellingCostPct: number;
  buildingValuePct: number;
  depreciationYears: 27.5 | 39;
  includeInterestDeduction: boolean;
  taxRatePct: number;
};

const TEMPLATE_ROW_FIELDS =
  "id, template_name, template_description, template_type, is_system, property_tax_pct, insurance_input_mode, insurance_pct, insurance_mo, maintenance_pct, vacancy_pct, management_pct, capex_pct, closing_costs_pct, interest_rate_pct, down_payment_pct, expense_growth_pct, rent_growth_pct, appreciation_rate_pct, selling_cost_pct, building_value_pct, depreciation_years, include_interest_deduction, tax_rate_pct";

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapTemplateRow(row: Record<string, unknown>): AnalysisTemplateOption {
  const dy = num(row.depreciation_years, 27.5);
  const depreciationYears: 27.5 | 39 = dy === 39 ? 39 : 27.5;
  return {
    id: String(row.id),
    templateName: String(row.template_name ?? ""),
    templateDescription: (row.template_description as string | null) ?? null,
    templateType: (row.template_type as AnalysisTemplateOption["templateType"]) ?? "balanced",
    isSystem: !!row.is_system,
    propertyTaxPct: num(row.property_tax_pct, 1.1),
    insuranceInputMode: row.insurance_input_mode === "monthly" ? "monthly" : "percent",
    insurancePct: row.insurance_pct == null ? null : num(row.insurance_pct, 0),
    insuranceMo: row.insurance_mo == null ? null : num(row.insurance_mo, 0),
    maintenancePct: num(row.maintenance_pct, 0),
    vacancyPct: num(row.vacancy_pct, 0),
    managementPct: num(row.management_pct, 0),
    capexPct: num(row.capex_pct, 0),
    closingCostsPct: num(row.closing_costs_pct, 3),
    interestRatePct: num(row.interest_rate_pct, 0),
    downPaymentPct: num(row.down_payment_pct, 0),
    expenseGrowthPct: num(row.expense_growth_pct, 0),
    rentGrowthPct: num(row.rent_growth_pct, 0),
    appreciationRatePct: num(row.appreciation_rate_pct, DEFAULT_APPRECIATION_RATE),
    sellingCostPct: num(row.selling_cost_pct, DEFAULT_SELLING_COST_PCT),
    buildingValuePct: num(row.building_value_pct, 85),
    depreciationYears,
    includeInterestDeduction: row.include_interest_deduction !== false,
    taxRatePct: num(row.tax_rate_pct, 24),
  };
}

export type ListTemplatesResult =
  | { ok: true; templates: AnalysisTemplateOption[] }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_TEMPLATE" | "SERVER_ERROR";
      message: string;
    };

export type TemplateAccessResult =
  | { allowed: true }
  | {
      allowed: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_TEMPLATE" | "SERVER_ERROR";
      message: string;
    };

export async function getTemplateAccessAction(): Promise<TemplateAccessResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      allowed: false,
      code: "SIGN_IN_REQUIRED",
      message: "Sign in with a premium subscription to use templates.",
    };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("template_manage")) {
    return {
      allowed: false,
      code: "ENTITLEMENT_TEMPLATE",
      message: "Upgrade required to use templates.",
    };
  }

  return { allowed: true };
}

export async function listAnalysisTemplatesAction(): Promise<ListTemplatesResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Sign in with a premium subscription to use templates.",
    };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("template_manage")) {
    return {
      ok: false,
      code: "ENTITLEMENT_TEMPLATE",
      message: "Upgrade required to use templates.",
    };
  }

  const { data, error } = await supabase
    .from("analysis_templates")
    .select(TEMPLATE_ROW_FIELDS)
    .eq("is_system", false)
    .order("is_system", { ascending: false })
    .order("template_name", { ascending: true });

  if (error) {
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  const templates: AnalysisTemplateOption[] = (data ?? []).map((row) =>
    mapTemplateRow(row as Record<string, unknown>)
  );

  return { ok: true, templates };
}

export type CreateTemplateResult =
  | { ok: true; template: AnalysisTemplateOption }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "VALIDATION_ERROR"
        | "ENTITLEMENT_TEMPLATE"
        | "DUPLICATE_TEMPLATE_NAME"
        | "SERVER_ERROR";
      message: string;
    };

export type UpdateTemplateResult =
  | { ok: true; template: AnalysisTemplateOption }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "VALIDATION_ERROR"
        | "ENTITLEMENT_TEMPLATE"
        | "NOT_FOUND"
        | "DUPLICATE_TEMPLATE_NAME"
        | "SERVER_ERROR";
      message: string;
    };

export type DeleteTemplateResult =
  | { ok: true }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_TEMPLATE" | "NOT_FOUND" | "SERVER_ERROR";
      message: string;
    };

export async function createAnalysisTemplateAction(input: unknown): Promise<CreateTemplateResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Please sign in to create and save templates.",
    };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("template_manage")) {
    return {
      ok: false,
      code: "ENTITLEMENT_TEMPLATE",
      message: "Upgrade required to create and save templates.",
    };
  }

  const parsed = analysisTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Template form is invalid. Please check the highlighted fields.",
    };
  }

  const payload = parsed.data;
  const normalizeTemplateName = (name: string) => name.trim().toLowerCase();
  const targetName = normalizeTemplateName(payload.templateName);

  const { data: existingNames, error: listNameErr } = await supabase
    .from("analysis_templates")
    .select("template_name")
    .eq("user_id", user.id)
    .eq("is_system", false);

  if (listNameErr) {
    return { ok: false, code: "SERVER_ERROR", message: listNameErr.message };
  }
  const hasDuplicateName = (existingNames ?? []).some(
    (row) => normalizeTemplateName(row.template_name) === targetName
  );
  if (hasDuplicateName) {
    return {
      ok: false,
      code: "DUPLICATE_TEMPLATE_NAME",
      message: "You already have a template with this name. Choose a different name.",
    };
  }

  const { data, error } = await supabase
    .from("analysis_templates")
    .insert({
      user_id: user.id,
      template_name: payload.templateName,
      template_description: payload.templateDescription?.trim() || null,
      template_type: "balanced",
      property_tax_pct: payload.propertyTaxPct,
      insurance_input_mode: payload.insuranceInputMode,
      insurance_pct: payload.insuranceInputMode === "percent" ? payload.insurancePct ?? null : null,
      insurance_mo: payload.insuranceInputMode === "monthly" ? payload.insuranceMo ?? null : null,
      maintenance_pct: payload.maintenancePct,
      vacancy_pct: payload.vacancyPct,
      management_pct: payload.managementPct,
      capex_pct: payload.capexPct,
      closing_costs_pct: payload.closingCostsPct ?? 3,
      interest_rate_pct: payload.interestRatePct,
      down_payment_pct: payload.downPaymentPct,
      expense_growth_pct: payload.expenseGrowthPct,
      rent_growth_pct: payload.rentGrowthPct,
      appreciation_rate_pct: payload.appreciationRatePct ?? DEFAULT_APPRECIATION_RATE,
      selling_cost_pct: payload.sellingCostPct ?? DEFAULT_SELLING_COST_PCT,
      building_value_pct: payload.buildingValuePct,
      depreciation_years: payload.depreciationYears,
      include_interest_deduction: payload.includeInterestDeduction ?? true,
      tax_rate_pct: payload.taxRatePct ?? 24,
      is_system: false,
    })
    .select(TEMPLATE_ROW_FIELDS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        code: "DUPLICATE_TEMPLATE_NAME",
        message: "You already have a template with this name. Choose a different name.",
      };
    }
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  return {
    ok: true,
    template: mapTemplateRow(data as Record<string, unknown>),
  };
}

export async function updateAnalysisTemplateAction(
  templateId: string,
  input: unknown
): Promise<UpdateTemplateResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Please sign in to edit templates.",
    };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("template_manage")) {
    return {
      ok: false,
      code: "ENTITLEMENT_TEMPLATE",
      message: "Upgrade required to edit templates.",
    };
  }

  const parsed = analysisTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Template form is invalid. Please check the highlighted fields.",
    };
  }

  const payload = parsed.data;
  const normalizeTemplateName = (name: string) => name.trim().toLowerCase();
  const targetName = normalizeTemplateName(payload.templateName);

  const { data: existingRow, error: existingErr } = await supabase
    .from("analysis_templates")
    .select("id, user_id, is_system")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingErr) {
    return { ok: false, code: "SERVER_ERROR", message: existingErr.message };
  }

  if (!existingRow || existingRow.is_system) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Template not found or not editable.",
    };
  }

  const { data: existingNames, error: listNameErr } = await supabase
    .from("analysis_templates")
    .select("id, template_name")
    .eq("user_id", user.id)
    .eq("is_system", false);

  if (listNameErr) {
    return { ok: false, code: "SERVER_ERROR", message: listNameErr.message };
  }

  const hasDuplicateName = (existingNames ?? []).some(
    (row) =>
      String(row.id) !== templateId &&
      normalizeTemplateName(String(row.template_name ?? "")) === targetName
  );
  if (hasDuplicateName) {
    return {
      ok: false,
      code: "DUPLICATE_TEMPLATE_NAME",
      message: "You already have a template with this name. Choose a different name.",
    };
  }

  const { data, error } = await supabase
    .from("analysis_templates")
    .update({
      template_name: payload.templateName,
      template_description: payload.templateDescription?.trim() || null,
      property_tax_pct: payload.propertyTaxPct,
      insurance_input_mode: payload.insuranceInputMode,
      insurance_pct: payload.insuranceInputMode === "percent" ? payload.insurancePct ?? null : null,
      insurance_mo: payload.insuranceInputMode === "monthly" ? payload.insuranceMo ?? null : null,
      maintenance_pct: payload.maintenancePct,
      vacancy_pct: payload.vacancyPct,
      management_pct: payload.managementPct,
      capex_pct: payload.capexPct,
      closing_costs_pct: payload.closingCostsPct ?? 3,
      interest_rate_pct: payload.interestRatePct,
      down_payment_pct: payload.downPaymentPct,
      expense_growth_pct: payload.expenseGrowthPct,
      rent_growth_pct: payload.rentGrowthPct,
      appreciation_rate_pct: payload.appreciationRatePct ?? DEFAULT_APPRECIATION_RATE,
      selling_cost_pct: payload.sellingCostPct ?? DEFAULT_SELLING_COST_PCT,
      building_value_pct: payload.buildingValuePct,
      depreciation_years: payload.depreciationYears,
      include_interest_deduction: payload.includeInterestDeduction ?? true,
      tax_rate_pct: payload.taxRatePct ?? 24,
    })
    .eq("id", templateId)
    .eq("user_id", user.id)
    .eq("is_system", false)
    .select(TEMPLATE_ROW_FIELDS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        code: "DUPLICATE_TEMPLATE_NAME",
        message: "You already have a template with this name. Choose a different name.",
      };
    }
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  return {
    ok: true,
    template: mapTemplateRow(data as Record<string, unknown>),
  };
}

export async function deleteAnalysisTemplateAction(
  templateId: string
): Promise<DeleteTemplateResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Please sign in to delete templates.",
    };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("template_manage")) {
    return {
      ok: false,
      code: "ENTITLEMENT_TEMPLATE",
      message: "Upgrade required to delete templates.",
    };
  }

  const { data: existingRow, error: existingErr } = await supabase
    .from("analysis_templates")
    .select("id, is_system")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingErr) {
    return { ok: false, code: "SERVER_ERROR", message: existingErr.message };
  }

  if (!existingRow || existingRow.is_system) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Template not found or not deletable.",
    };
  }

  const { error } = await supabase
    .from("analysis_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.id)
    .eq("is_system", false);

  if (error) {
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  return { ok: true };
}
