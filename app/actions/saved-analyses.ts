"use server";

import { calculateAnalysis } from "@/lib/calc-analysis";
import { computeDealScore } from "@/lib/deal-score";
import {
  getEntitlementsForUser,
  getSavedDealLimitLabel,
  hasPaidPlanSubscription,
  hasPlanFeature,
  hasSavedDealCapacity,
} from "@/lib/entitlements";
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
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "NOT_FOUND" | "SERVER_ERROR";
      message: string;
    };

export type UpdateSavedDealLifecycleResult =
  | { ok: true }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR";
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
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "NOT_FOUND" | "SERVER_ERROR";
      message: string;
    };

export type CompleteSavedAnalysisPdfExportResult =
  | { ok: true; pdfUrl: string }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR";
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
  if (!hasPlanFeature(entitlements, "save_deal")) {
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
    isCashPurchase: result.monthlyPayment <= 0,
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
      const canUpdateSavedDeal = await hasPaidPlanSubscription(supabase, user.id);
      if (!canUpdateSavedDeal) {
        return {
          ok: false,
          code: "ENTITLEMENT_SAVE",
          message: "Upgrade required to update saved analyses.",
        };
      }

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

  if (!hasSavedDealCapacity(entitlements, count ?? 0)) {
    return {
      ok: false,
      code: "ENTITLEMENT_SAVE",
      message: `Saved deal limit reached for your plan (${getSavedDealLimitLabel(entitlements)}).`,
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

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "pdf_export")) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "PDF export is not available for your current plan.",
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

  // Cache check — only serve cached PDF if:
  //   1) it exists,
  //   2) its snapshot version matches the current template version, AND
  //   3) the user has NO branding configured.
  //
  // The third condition exists because cached PDFs don't track the
  // branding state they were generated with. If a user updates their
  // logo, brand color, or "Prepared by" name, the cached PDF would
  // still show the old branding indefinitely (until PDF_SNAPSHOT_VERSION
  // bumped). Bypassing cache for branded users means their changes
  // always reflect on the next export, at the cost of regenerating
  // (~3-5s + an upload). Acceptable tradeoff — branded users care
  // more about accuracy than speed.
  let hasUserBranding = false;
  try {
    const { data: brandingRow } = await supabase
      .from("branding")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    hasUserBranding = Boolean(brandingRow);
  } catch {
    // If the branding lookup fails for any reason, fall through to the
    // normal cache logic. Better to occasionally serve a stale-branded
    // PDF than to error out the whole export flow.
  }

  if (
    cachedPdfUrl &&
    cachedVersion === PDF_SNAPSHOT_VERSION &&
    !hasUserBranding
  ) {
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

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "pdf_export")) {
    return { ok: false, code: "ENTITLEMENT_REQUIRED", message: "PDF export is not available for your current plan." };
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

/**
 * Update a saved deal's user-authored notes. Free-text markdown, no
 * length cap (DB column is unbounded text). Soft-capped at 10k chars
 * here to prevent accidental enormous pastes.
 *
 * Defensive: graceful failure when the `notes` column doesn't exist
 * yet (i.e. migration 20260524120000_saved_analyses_notes hasn't been
 * applied). Postgres error code 42703 = "undefined column".
 */
export async function updateSavedDealNotesAction(
  id: string,
  notes: string
): Promise<{ ok: true } | { ok: false; code: "SIGN_IN_REQUIRED" | "MIGRATION_PENDING" | "NOT_FOUND" | "SERVER_ERROR" | "VALIDATION_ERROR"; message: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }
  const trimmed = (notes ?? "").slice(0, 10_000);
  const savedId = id.trim();
  if (!savedId) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal id." };
  }
  const { data, error } = await supabase
    .from("saved_analyses")
    .update({ notes: trimmed })
    .eq("id", savedId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) {
    // 42703 = undefined_column — migration not yet applied.
    if (error.code === "42703" || /column .* does not exist/i.test(error.message)) {
      return {
        ok: false,
        code: "MIGRATION_PENDING",
        message:
          "Notes are temporarily disabled — the schema migration hasn't been applied yet. Ask the site admin to apply 20260524120000_saved_analyses_notes.sql.",
      };
    }
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }
  if (!data) {
    return { ok: false, code: "NOT_FOUND", message: "Deal not found." };
  }
  return { ok: true };
}

/**
 * Fetch the notes for a single saved deal. Returns null if the deal
 * has no notes yet, or if the migration isn't applied (defensive).
 */
export async function getSavedDealNotesAction(
  id: string
): Promise<{ ok: true; notes: string | null } | { ok: false; code: "SIGN_IN_REQUIRED" | "MIGRATION_PENDING" | "SERVER_ERROR"; message: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }
  const { data, error } = await supabase
    .from("saved_analyses")
    .select("notes")
    .eq("id", id.trim())
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    if (error.code === "42703" || /column .* does not exist/i.test(error.message)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }
  return { ok: true, notes: (data as { notes: string | null } | null)?.notes ?? null };
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

/**
 * Bulk archive or delete saved analyses.
 *
 * Why a separate action vs N calls to updateSavedDealLifecycleStateAction:
 *   - Single DB round trip instead of N
 *   - Atomic from the user's perspective (either all succeed or none)
 *   - Soft-delete (deleted_at = now) for "delete" — preserves history
 *     and lets us restore by clearing deleted_at if a user complains
 *
 * Caller responsibility: pass only IDs owned by the current user. The
 * action double-checks via .eq("user_id", user.id) so cross-user
 * tampering is blocked at the DB layer.
 *
 * Max 100 IDs per call as a safety cap — bulk ops larger than that
 * indicate a UI bug or a scraping attempt.
 */
export type BulkSavedDealActionResult =
  | { ok: true; affectedCount: number }
  | { ok: false; code: "SIGN_IN_REQUIRED" | "VALIDATION_ERROR" | "SERVER_ERROR"; message: string };

export async function bulkUpdateSavedDealsAction(
  ids: string[],
  action: "archive" | "delete" | "activate"
): Promise<BulkSavedDealActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }

  const cleanedIds = Array.from(
    new Set(
      (ids ?? [])
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean)
    )
  );

  if (cleanedIds.length === 0) {
    return { ok: false, code: "VALIDATION_ERROR", message: "No deals selected." };
  }
  if (cleanedIds.length > 100) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Too many deals selected at once (max 100).",
    };
  }

  const nowIso = new Date().toISOString();
  const updatePayload =
    action === "delete"
      ? { deleted_at: nowIso }
      : action === "archive"
        ? { is_archived: true, is_completed: false, last_activity_at: nowIso }
        : { is_archived: false, is_completed: false, last_activity_at: nowIso };

  let query = supabase
    .from("saved_analyses")
    .update(updatePayload)
    .in("id", cleanedIds)
    .eq("user_id", user.id);

  // For non-delete actions, only touch rows not already soft-deleted.
  // For delete, allow re-deleting already-soft-deleted rows (idempotent).
  if (action !== "delete") {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query.select("id");

  if (error) {
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  return { ok: true, affectedCount: data?.length ?? 0 };
}
