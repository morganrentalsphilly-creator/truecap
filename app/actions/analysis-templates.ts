"use server";

import { analysisTemplateSchema, type AnalysisTemplateBuyBox } from "@/lib/analysis-template-schema";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_APPRECIATION_RATE, DEFAULT_SELLING_COST_PCT } from "@/lib/exit-scenarios";
import { investmentFormSchema, type InvestmentFormValues } from "@/lib/investcalc-schema";
import { saveDealAction } from "@/app/actions/saved-analyses";

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
  isDefault: boolean;
  kind: string | null;
  buyBox: AnalysisTemplateBuyBox | null;
  /** Number of saved deals using this template (derived at read time). */
  usedCount?: number;
};

const TEMPLATE_ROW_FIELDS =
  "id, template_name, template_description, template_type, is_system, property_tax_pct, insurance_input_mode, insurance_pct, insurance_mo, maintenance_pct, vacancy_pct, management_pct, capex_pct, closing_costs_pct, interest_rate_pct, down_payment_pct, expense_growth_pct, rent_growth_pct, appreciation_rate_pct, selling_cost_pct, building_value_pct, depreciation_years, include_interest_deduction, tax_rate_pct, is_default, kind, buy_box";

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTemplateBuyBox(raw: unknown): AnalysisTemplateBuyBox | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const pick = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const bb: AnalysisTemplateBuyBox = {
    minCapRatePct: pick(o.minCapRatePct),
    minCocPct: pick(o.minCocPct),
    minDscr: pick(o.minDscr),
    minCashFlowMonthly: pick(o.minCashFlowMonthly),
    maxPurchasePrice: pick(o.maxPurchasePrice),
  };
  const hasAny = [bb.minCapRatePct, bb.minCocPct, bb.minDscr, bb.minCashFlowMonthly, bb.maxPurchasePrice].some(
    (v) => v != null
  );
  return hasAny ? bb : null;
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
    isDefault: !!row.is_default,
    kind: (row.kind as string | null) ?? null,
    buyBox: normalizeTemplateBuyBox(row.buy_box),
  };
}

type DbClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/**
 * Append an immutable version snapshot for a template. Best-effort: never
 * blocks a save (e.g. if the versions table isn't migrated yet). Snapshot is
 * the raw template row (snake_case) so restore can write it back directly.
 */
async function recordTemplateVersion(
  supabase: DbClient,
  userId: string,
  templateId: string,
  snapshot: Record<string, unknown>
): Promise<void> {
  try {
    const { data: maxRow } = await supabase
      .from("analysis_template_versions")
      .select("version")
      .eq("template_id", templateId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = ((maxRow as { version?: number } | null)?.version ?? 0) + 1;
    await supabase.from("analysis_template_versions").insert({
      template_id: templateId,
      created_by: userId,
      version: nextVersion,
      snapshot,
    });
  } catch {
    // Version history is best-effort — never block the underlying save.
  }
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
    .eq("user_id", user.id)
    .eq("is_system", false)
    .order("is_default", { ascending: false })
    .order("template_name", { ascending: true });

  if (error) {
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  const templates: AnalysisTemplateOption[] = (data ?? []).map((row) =>
    mapTemplateRow(row as Record<string, unknown>)
  );

  // Derive "used by X deals" — one cheap query, counted in JS so we don't
  // need a denormalized counter to keep in sync.
  const { data: usageRows } = await supabase
    .from("saved_analyses")
    .select("template_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .not("template_id", "is", null);
  const counts = new Map<string, number>();
  for (const r of usageRows ?? []) {
    const id = (r as { template_id: string | null }).template_id;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const t of templates) t.usedCount = counts.get(t.id) ?? 0;

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

export async function createAnalysisTemplateAction(
  input: unknown,
  kind?: string | null
): Promise<CreateTemplateResult> {
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
      kind: kind ?? null,
      buy_box: normalizeTemplateBuyBox(payload.buyBox),
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

  const saved = mapTemplateRow(data as Record<string, unknown>);
  await recordTemplateVersion(supabase, user.id, saved.id, data as Record<string, unknown>);
  return { ok: true, template: saved };
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
      buy_box: normalizeTemplateBuyBox(payload.buyBox),
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

  const saved = mapTemplateRow(data as Record<string, unknown>);
  await recordTemplateVersion(supabase, user.id, saved.id, data as Record<string, unknown>);
  return { ok: true, template: saved };
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

export type SetDefaultTemplateResult =
  | { ok: true }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_TEMPLATE" | "NOT_FOUND" | "SERVER_ERROR";
      message: string;
    };

/**
 * Mark one of the user's templates as their default (at most one — the
 * partial unique index enforces it, so we clear the prior default first).
 */
export async function setDefaultTemplateAction(templateId: string): Promise<SetDefaultTemplateResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to manage templates." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("template_manage")) {
    return { ok: false, code: "ENTITLEMENT_TEMPLATE", message: "Upgrade required to manage templates." };
  }

  const { data: row, error: rowErr } = await supabase
    .from("analysis_templates")
    .select("id, is_system")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (rowErr) {
    return { ok: false, code: "SERVER_ERROR", message: rowErr.message };
  }
  if (!row || row.is_system) {
    return { ok: false, code: "NOT_FOUND", message: "Template not found." };
  }

  // Clear the prior default first so the one-default-per-user index is happy.
  const { error: clearErr } = await supabase
    .from("analysis_templates")
    .update({ is_default: false })
    .eq("user_id", user.id)
    .eq("is_default", true);
  if (clearErr) {
    return { ok: false, code: "SERVER_ERROR", message: clearErr.message };
  }

  const { error: setErr } = await supabase
    .from("analysis_templates")
    .update({ is_default: true })
    .eq("id", templateId)
    .eq("user_id", user.id)
    .eq("is_system", false);
  if (setErr) {
    return { ok: false, code: "SERVER_ERROR", message: setErr.message };
  }

  return { ok: true };
}

/**
 * Duplicate a template the user can see (their own or a system/starter one)
 * into a new owned template named "<name> (copy)". Reuses the create path
 * for validation + dedupe; carries the source's `kind`.
 */
export async function duplicateTemplateAction(templateId: string): Promise<UpdateTemplateResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to manage templates." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("template_manage")) {
    return { ok: false, code: "ENTITLEMENT_TEMPLATE", message: "Upgrade required to manage templates." };
  }

  const { data: srcRow, error: srcErr } = await supabase
    .from("analysis_templates")
    .select(TEMPLATE_ROW_FIELDS)
    .eq("id", templateId)
    .maybeSingle();
  if (srcErr) {
    return { ok: false, code: "SERVER_ERROR", message: srcErr.message };
  }
  if (!srcRow) {
    return { ok: false, code: "NOT_FOUND", message: "Template not found." };
  }
  const src = mapTemplateRow(srcRow as Record<string, unknown>);

  const { data: names } = await supabase
    .from("analysis_templates")
    .select("template_name")
    .eq("user_id", user.id)
    .eq("is_system", false);
  const existing = new Set(
    (names ?? []).map((r) => String(r.template_name ?? "").trim().toLowerCase())
  );
  let candidate = `${src.templateName} (copy)`.slice(0, 100);
  let n = 2;
  while (existing.has(candidate.toLowerCase())) {
    candidate = `${src.templateName} (copy ${n})`.slice(0, 100);
    n += 1;
  }

  const input = {
    templateName: candidate,
    templateDescription: src.templateDescription ?? undefined,
    propertyTaxPct: src.propertyTaxPct,
    insuranceInputMode: src.insuranceInputMode,
    insurancePct: src.insurancePct ?? undefined,
    insuranceMo: src.insuranceMo ?? undefined,
    maintenancePct: src.maintenancePct,
    vacancyPct: src.vacancyPct,
    managementPct: src.managementPct,
    capexPct: src.capexPct,
    closingCostsPct: src.closingCostsPct,
    interestRatePct: src.interestRatePct,
    downPaymentPct: src.downPaymentPct,
    expenseGrowthPct: src.expenseGrowthPct,
    rentGrowthPct: src.rentGrowthPct,
    appreciationRatePct: src.appreciationRatePct,
    sellingCostPct: src.sellingCostPct,
    buildingValuePct: src.buildingValuePct,
    depreciationYears: src.depreciationYears,
    includeInterestDeduction: src.includeInterestDeduction,
    taxRatePct: src.taxRatePct,
    buyBox: src.buyBox,
  };

  return createAnalysisTemplateAction(input, src.kind);
}

/**
 * Overlay a template's *assumption* fields onto a deal's form values, keeping
 * the deal-specific facts (address, type, price, beds/baths/sqft, rent, units,
 * loan term). Mirrors the analyzer's applyTemplateToForm mapping exactly
 * (template `managementPct`→form `mgmtPct`, `interestRatePct`→`interestRate`,
 * `insuranceMo`→`insuranceMonthly`).
 */
function applyTemplateAssumptions(
  values: InvestmentFormValues,
  tpl: AnalysisTemplateOption
): InvestmentFormValues {
  return {
    ...values,
    propertyTaxPct: tpl.propertyTaxPct,
    insuranceInputMode: tpl.insuranceInputMode,
    insurancePct: tpl.insurancePct ?? undefined,
    insuranceMonthly: tpl.insuranceMo ?? undefined,
    maintenancePct: tpl.maintenancePct,
    vacancyPct: tpl.vacancyPct,
    mgmtPct: tpl.managementPct,
    capexPct: tpl.capexPct,
    closingCostsPct: tpl.closingCostsPct,
    interestRate: tpl.interestRatePct,
    downPaymentPct: tpl.downPaymentPct,
    expenseGrowthPct: tpl.expenseGrowthPct,
    rentGrowthPct: tpl.rentGrowthPct,
    appreciationRatePct: tpl.appreciationRatePct,
    sellingCostPct: tpl.sellingCostPct,
    buildingValuePct: tpl.buildingValuePct,
    depreciationYears: tpl.depreciationYears,
    includeInterestDeduction: tpl.includeInterestDeduction,
    taxRatePct: tpl.taxRatePct,
  };
}

export type ApplyTemplateToDealResult =
  | { ok: true; dealId: string }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_TEMPLATE" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR";
      message: string;
    };

/**
 * Re-underwrite an existing saved deal with a template's assumptions overlaid
 * (deal facts kept). Reuses saveDealAction so the recompute, score, and
 * persistence are identical to a normal save. Pro-gated.
 */
export async function applyTemplateToDealAction(
  dealId: string,
  templateId: string
): Promise<ApplyTemplateToDealResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("template_manage")) {
    return { ok: false, code: "ENTITLEMENT_TEMPLATE", message: "Upgrade required to apply templates." };
  }

  const { data: dealRow, error: dealErr } = await supabase
    .from("saved_analyses")
    .select("form_snapshot")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (dealErr) {
    return { ok: false, code: "SERVER_ERROR", message: dealErr.message };
  }
  if (!dealRow) {
    return { ok: false, code: "NOT_FOUND", message: "Deal not found." };
  }

  const { data: tplRow, error: tplErr } = await supabase
    .from("analysis_templates")
    .select(TEMPLATE_ROW_FIELDS)
    .eq("id", templateId)
    .maybeSingle();
  if (tplErr) {
    return { ok: false, code: "SERVER_ERROR", message: tplErr.message };
  }
  if (!tplRow) {
    return { ok: false, code: "NOT_FOUND", message: "Template not found." };
  }
  const template = mapTemplateRow(tplRow as Record<string, unknown>);

  const parsed = investmentFormSchema.safeParse((dealRow as { form_snapshot?: unknown }).form_snapshot);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "This deal's saved inputs can't be re-run." };
  }

  const merged: InvestmentFormValues = {
    ...applyTemplateAssumptions(parsed.data, template),
    templateId,
  };

  const result = await saveDealAction(merged, dealId);
  if (!result.ok) {
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: result.message ?? "Could not apply the template to this deal.",
    };
  }
  return { ok: true, dealId: result.id ?? dealId };
}

export type TemplateVersionSummary = {
  id: string;
  version: number;
  createdAt: string;
  templateName: string;
  downPaymentPct: number | null;
  interestRatePct: number | null;
  vacancyPct: number | null;
};

export type ListTemplateVersionsResult =
  | { ok: true; versions: TemplateVersionSummary[] }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_TEMPLATE" | "NOT_FOUND" | "SERVER_ERROR";
      message: string;
    };

export async function listTemplateVersionsAction(templateId: string): Promise<ListTemplateVersionsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }
  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("template_manage")) {
    return { ok: false, code: "ENTITLEMENT_TEMPLATE", message: "Upgrade required to manage templates." };
  }

  const { data: tpl, error: tplErr } = await supabase
    .from("analysis_templates")
    .select("id")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (tplErr) {
    return { ok: false, code: "SERVER_ERROR", message: tplErr.message };
  }
  if (!tpl) {
    return { ok: false, code: "NOT_FOUND", message: "Template not found." };
  }

  const { data, error } = await supabase
    .from("analysis_template_versions")
    .select("id, version, created_at, snapshot")
    .eq("template_id", templateId)
    .order("version", { ascending: false });
  if (error) {
    // Migration not applied yet → no history rather than an error.
    if (error.code === "42P01") return { ok: true, versions: [] };
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  const toNum = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const versions: TemplateVersionSummary[] = (data ?? []).map((r) => {
    const row = r as {
      id: string;
      version: number;
      created_at: string;
      snapshot: Record<string, unknown> | null;
    };
    const s = row.snapshot ?? {};
    return {
      id: row.id,
      version: row.version,
      createdAt: row.created_at,
      templateName: String(s.template_name ?? ""),
      downPaymentPct: toNum(s.down_payment_pct),
      interestRatePct: toNum(s.interest_rate_pct),
      vacancyPct: toNum(s.vacancy_pct),
    };
  });
  return { ok: true, versions };
}

/** Restore a template to a prior version (and record the restore as a new
 *  version, so history stays append-only). */
export async function restoreTemplateVersionAction(
  templateId: string,
  versionId: string
): Promise<UpdateTemplateResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }
  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("template_manage")) {
    return { ok: false, code: "ENTITLEMENT_TEMPLATE", message: "Upgrade required to manage templates." };
  }

  const { data: tpl, error: tplErr } = await supabase
    .from("analysis_templates")
    .select("id, is_system")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (tplErr) {
    return { ok: false, code: "SERVER_ERROR", message: tplErr.message };
  }
  if (!tpl || tpl.is_system) {
    return { ok: false, code: "NOT_FOUND", message: "Template not found." };
  }

  const { data: ver, error: verErr } = await supabase
    .from("analysis_template_versions")
    .select("snapshot")
    .eq("id", versionId)
    .eq("template_id", templateId)
    .maybeSingle();
  if (verErr) {
    return { ok: false, code: "SERVER_ERROR", message: verErr.message };
  }
  if (!ver) {
    return { ok: false, code: "NOT_FOUND", message: "Version not found." };
  }
  const snap = ((ver as { snapshot: Record<string, unknown> | null }).snapshot ?? {}) as Record<string, unknown>;

  const updatePayload = {
    template_name: snap.template_name,
    template_description: snap.template_description ?? null,
    property_tax_pct: snap.property_tax_pct,
    insurance_input_mode: snap.insurance_input_mode,
    insurance_pct: snap.insurance_pct ?? null,
    insurance_mo: snap.insurance_mo ?? null,
    maintenance_pct: snap.maintenance_pct,
    vacancy_pct: snap.vacancy_pct,
    management_pct: snap.management_pct,
    capex_pct: snap.capex_pct,
    closing_costs_pct: snap.closing_costs_pct,
    interest_rate_pct: snap.interest_rate_pct,
    down_payment_pct: snap.down_payment_pct,
    expense_growth_pct: snap.expense_growth_pct,
    rent_growth_pct: snap.rent_growth_pct,
    appreciation_rate_pct: snap.appreciation_rate_pct,
    selling_cost_pct: snap.selling_cost_pct,
    building_value_pct: snap.building_value_pct,
    depreciation_years: snap.depreciation_years,
    include_interest_deduction: snap.include_interest_deduction,
    tax_rate_pct: snap.tax_rate_pct,
    kind: snap.kind ?? null,
    buy_box: snap.buy_box ?? null,
  };

  const { data, error } = await supabase
    .from("analysis_templates")
    .update(updatePayload)
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
        message: "A template with that name already exists. Rename it first.",
      };
    }
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  const restored = mapTemplateRow(data as Record<string, unknown>);
  await recordTemplateVersion(supabase, user.id, templateId, data as Record<string, unknown>);
  return { ok: true, template: restored };
}
