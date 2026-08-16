"use server";
import { toServerErrorResult } from "@/lib/db-error";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { computeDealScore, buildDealScoreInputFromAnalysis } from "@/lib/deal-score";
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
import { flagsForStage, isPipelineStage, normalizeTags, type PipelineStage } from "@/lib/pipeline";
import {
  buildDataConfidence,
  shouldPreserveStoredDataConfidence,
  type EnrichmentProvenanceInput,
} from "@/lib/data-confidence";
import {
  buildInputConfidence,
  normalizeInputVerificationEvidence,
} from "@/lib/input-confidence";
import {
  defaultDueDiligenceItems,
  normalizeDueDiligenceItems,
  type DueDiligenceItem,
} from "@/lib/due-diligence";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_APPRECIATION_RATE, DEFAULT_SELLING_COST_PCT } from "@/lib/exit-scenarios";
import { buildCompareSnapshotPayload } from "@/lib/compare-result-snapshot";
import {
  ANALYSIS_PDF_BUCKET,
  ANALYSIS_PDF_SIGNED_URL_TTL_SECONDS,
  buildAnalysisPdfObjectPath,
  PDF_CACHE_VERSION,
  PDF_CACHE_VERSION_UNCACHEABLE,
  resolveAnalysisPdfObjectPath,
} from "@/lib/pdf-export-constants";
import {
  boxesForDealClient,
  buyBoxHasCriteria,
  deriveStateFromAddress,
  type BuyBoxCriteria,
  type BuyBoxDealMetrics,
} from "@/lib/buy-box";
import { buildBuyBoxPdfVerdict, type BuyBoxPdfVerdict } from "@/lib/pdf-buy-box";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  financingProfileMatchesAnalysis,
  financingProfileSnapshotSchema,
  rowToFinancingProfile,
  snapshotFinancingProfile,
  type FinancingProfileSnapshot,
} from "@/lib/financing-profiles";
import { resolveOwnedScenarioPropertyGroup } from "@/lib/scenario-property-group";
import { isStrategyKind } from "@/lib/strategy-kinds";

export type SaveDealResult =
  | { ok: true; id: string; mode: "inserted" | "updated" }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "VALIDATION_ERROR"
        | "ENTITLEMENT_SAVE"
        | "DUPLICATE_ADDRESS"
        // Update path: the form's address no longer matches the saved deal
        // (the caller must choose save-as-new vs. allowAddressChange).
        | "ADDRESS_CHANGED"
        // Update path: the row behind existingId is gone (deleted/archived
        // elsewhere). The caller must detach the id and offer save-as-new —
        // never silently fall through to an insert.
        | "DEAL_DELETED"
        | "SERVER_ERROR";
      message?: string;
      // DUPLICATE_ADDRESS (insert path): the user's own colliding saved
      // deal, so the client can offer "update it" / "save as new scenario"
      // instead of a dead-end toast. ADDRESS_CHANGED: the loaded deal the
      // update targeted (existingTitle names its stored address) so the
      // chooser can say which deal the form diverged from. Optional +
      // additive - existing consumers that only read code/message keep
      // working unchanged.
      existingId?: string;
      existingTitle?: string;
    };

export type GetSavedDealForEditingResult =
  | {
      ok: true;
      id: string;
      schemaVersion: number;
      methodologyVersion: string | null;
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
  // `pdfUrl` on a cache hit is a SHORT-LIVED SIGNED url
  // (ANALYSIS_PDF_SIGNED_URL_TTL_SECONDS), not a public one — use it
  // immediately, never persist or share it.
  | { ok: true; source: "cache"; pdfUrl: string }
  | {
      ok: true;
      source: "regenerate";
      id: string;
      schemaVersion: number;
      methodologyVersion: string | null;
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
  // The storage object path that was recorded — NOT a URL. The bucket is
  // private; downloadable URLs are minted (short-lived, owner-scoped) only
  // on the read path.
  | { ok: true; pdfPath: string }
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

/**
 * The user's non-deleted saved analyses whose address matches, using the same
 * expression the `saved_analyses_address_taken` RPC checks
 * (lower/trim of form_snapshot->>'address') so the rows surfaced here are
 * exactly the rows the duplicate guard flagged. RLS-scoped via the caller's
 * client + explicit user_id filter. Ordinary chooser lookups may degrade to
 * "no match"; scenario writes opt into throwing so database errors fail closed.
 */
async function findSavedAnalysesByAddress(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  address: string,
  options: { throwOnError?: boolean } = {}
): Promise<
  Array<{
    id: string;
    title: string | null;
    propertyId: string | null;
    scenarioName: string | null;
    address: string | null;
    formSnapshot: Record<string, unknown> | null;
  }>
> {
  const { data, error } = await supabase
    .from("saved_analyses")
    .select("id, title, address, property_id, scenario_name, form_snapshot, form_address:form_snapshot->>address")
    .eq("user_id", userId)
    .is("deleted_at", null)
    // Oldest first so [0] is the original deal when scenarios already exist.
    .order("created_at", { ascending: true });

  if (error) {
    if (options.throwOnError) throw error;
    return [];
  }
  if (!data) return [];

  const needle = address.trim().toLowerCase();
  return (data as Array<Record<string, unknown>>)
    .filter((row) => (dbString(row.form_address) ?? "").trim().toLowerCase() === needle)
    .map((row) => ({
      id: String(row.id),
      title: dbString(row.title) ?? null,
      propertyId: dbString(row.property_id) ?? null,
      scenarioName: dbString(row.scenario_name) ?? null,
      address: dbString(row.address) ?? dbString(row.form_address) ?? null,
      formSnapshot: asRecord(row.form_snapshot),
    }));
}

const provenanceFieldSchema = z.object({
  source: z.enum(["hud-fmr", "hud-safmr", "fred", "state-static", "manual"]),
  fetchedAt: z.string().max(40).nullish(),
  detail: z.string().max(160).optional(),
  overridden: z.boolean().optional(),
});
const saveProvenanceSchema = z
  .object({
    monthlyRent: provenanceFieldSchema.optional(),
    interestRate: provenanceFieldSchema.optional(),
    propertyTaxPct: provenanceFieldSchema.optional(),
  })
  .optional();

const FINANCING_PROFILE_SNAPSHOT_COLUMNS =
  "id, name, loan_type, interest_rate_pct, down_payment_pct, ltv_pct, amortization_years, loan_term_years, points_pct, lender_fees, closing_costs_pct, interest_only_months, pmi_annual_rate_pct, pmi_no_cancel, lender_name, notes, last_verified_at, is_active, is_default, terms_version, created_at, updated_at";

async function resolveAppliedFinancingProfile(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  rawSnapshot: unknown,
  values: InvestmentFormValues
): Promise<
  | { ok: true; snapshot: FinancingProfileSnapshot | null }
  | { ok: false; error: unknown }
> {
  const parsed = financingProfileSnapshotSchema.safeParse(rawSnapshot);
  if (!parsed.success || !financingProfileMatchesAnalysis(parsed.data, values)) {
    return { ok: true, snapshot: null };
  }

  // Explicit ownership scope supplements RLS and makes the tenant boundary
  // obvious at the mutation site. A foreign/deleted id becomes no profile;
  // it is never linked to the saved analysis.
  const { data, error } = await supabase
    .from("financing_profiles")
    .select(FINANCING_PROFILE_SNAPSHOT_COLUMNS)
    .eq("id", parsed.data.profileId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { ok: false, error };
  if (!data) return { ok: true, snapshot: null };

  const current = rowToFinancingProfile(data as unknown as Record<string, unknown>);
  if (parsed.data.termsVersion !== current.termsVersion) {
    return { ok: true, snapshot: null };
  }

  const appliedAt = new Date().toISOString();
  const canonical = snapshotFinancingProfile(current, appliedAt);
  return financingProfileMatchesAnalysis(canonical, values)
    ? { ok: true, snapshot: canonical }
    : { ok: true, snapshot: null };
}

function parseStoredFinancingProfileSnapshot(
  row: Record<string, unknown>
): FinancingProfileSnapshot | null {
  const parsed = financingProfileSnapshotSchema.safeParse(row.financing_profile_snapshot);
  if (!parsed.success) return null;

  const storedVersion = dbNumber(row.financing_profile_version);
  const storedProfileId = dbString(row.financing_profile_id);
  if (storedVersion !== parsed.data.termsVersion) return null;
  // ON DELETE SET NULL intentionally removes only the live link. A non-null
  // link, however, must agree with the identity frozen inside the snapshot.
  if (storedProfileId && storedProfileId !== parsed.data.profileId) return null;
  return parsed.data;
}

/** Never trust the mutable embedded financingProfile object on a read. Its
 * canonical identity/version/snapshot live in dedicated top-level columns and
 * are validated together before crossing the server-action boundary. */
function buildTrustedResultSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const snapshot = { ...(asRecord(row.result_snapshot) ?? {}) };
  const financingProfile = parseStoredFinancingProfileSnapshot(row);
  if (financingProfile) snapshot.financingProfile = financingProfile;
  else delete snapshot.financingProfile;
  return snapshot;
}

function sameFinancingProfileSnapshot(
  left: FinancingProfileSnapshot,
  right: FinancingProfileSnapshot
): boolean {
  // Both values have passed the same strict Zod schema, which also emits
  // their keys in the same deterministic order. This compares every frozen
  // term, label and timestamp; identity/version equality alone is not enough.
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function saveDealAction(
  input: unknown,
  existingId?: string | null,
  provenanceInput?: unknown,
  // saveAsNewScenario: explicit choice from the duplicate-address dialog -
  // resolve the existing owned deal's property group and insert the current
  // form as its sibling, titled "<address> — Scenario 2" (3, 4, …).
  // allowAddressChange: explicit choice from the address-changed dialog -
  // the update proceeds even though the form's address differs from the
  // saved deal's, moving the row (address column included) to the new
  // address. Both default to the pre-existing behavior, so callers that
  // omit them are unchanged.
  options?: {
    saveAsNewScenario?: boolean;
    /** Optional analyzer strategy, allowlisted server-side before persistence. */
    strategyKind?: string | null;
    allowAddressChange?: boolean;
    /** Explicit user attestations. Fingerprints are rechecked server-side so
     * changing a value automatically invalidates its prior verification. */
    inputVerification?: unknown;
    /** UI edit provenance only; this can raise a generic default to a user
     * estimate, never to Verified. */
    touchedInputFields?: string[];
    /** Sentinel from context-aware analyzer clients. When true, an empty
     * provenance object means prior value-bound sources were rechecked and
     * invalidated; older callers omit this and retain the legacy preserve-on-
     * missing behavior. */
    inputSourceContextProvided?: boolean;
    /** Exact reusable financing revision applied to these values. The server
     * rechecks ownership, version bounds, and every modeled term before it
     * writes the origin link plus frozen snapshot. */
    financingProfileSnapshot?: unknown;
  }
): Promise<SaveDealResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  // Saving a second analysis for the same address is the paid Scenarios
  // workflow, even though Free users can save their first deal. Enforce that
  // distinction before validation can reach any duplicate lookup or insert;
  // the browser flag is presentation only and must never be the authority.
  if (
    options?.saveAsNewScenario === true &&
    !(await hasPaidPlanSubscription(supabase, user.id))
  ) {
    return {
      ok: false,
      code: "ENTITLEMENT_SAVE",
      message: "Upgrade to TrueCap Pro to save multiple scenarios for one property.",
    };
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
  const financingProfileOptionProvided = Boolean(
    isFeatureEnabled("financing_profiles") &&
      options &&
      Object.prototype.hasOwnProperty.call(options, "financingProfileSnapshot")
  );
  let appliedFinancingProfile: FinancingProfileSnapshot | null = null;
  if (financingProfileOptionProvided && options?.financingProfileSnapshot != null) {
    const resolvedProfile = await resolveAppliedFinancingProfile(
      supabase,
      user.id,
      options.financingProfileSnapshot,
      sanitizedValues
    );
    if (!resolvedProfile.ok) {
      return toServerErrorResult(resolvedProfile.error, "saved-analyses-financing-profile");
    }
    appliedFinancingProfile = resolvedProfile.snapshot;
  }
  const addressTrimmed = values.address.trim();
  const result = calculateAnalysis(sanitizedValues);
  // Holistic (total-return-aware) score — computed server-side from the real
  // form values + result via the shared builder, so the saved score matches
  // what investcalc-page and the hero render for the same deal.
  const dealScore = computeDealScore(buildDealScoreInputFromAnalysis(sanitizedValues, result));
  const { snapshotVersion, compareSnapshot } = buildCompareSnapshotPayload(result, sanitizedValues);
  const resultSnapshotWithScore = {
    ...result,
    propertyType: sanitizedValues.propertyType,
    purchasePrice: sanitizedValues.purchasePrice,
    score: dealScore.score,
    recommendation: dealScore.recommendation,
    riskLevel: dealScore.riskLevel,
    breakdown: dealScore.breakdown,
    explanation: dealScore.explanation,
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

  // Per-input provenance → data confidence. The client passes which fields
  // enrich-property filled (and whether the user overrode them); we compute
  // the High/Medium/Low level here from that + completeness, and persist it.
  const provenanceParsed = saveProvenanceSchema.safeParse(provenanceInput);
  const provenanceFields = provenanceParsed.success ? provenanceParsed.data : undefined;
  // "Did the client actually attribute any field?" — an empty/absent input
  // must not be treated as "everything is manual now" on the update path
  // below: a reopened deal's enrichment capture doesn't survive the edit
  // handoff, so recomputing from it would silently downgrade the stored
  // confidence on every re-save.
  const provenanceProvided = Boolean(
    provenanceFields &&
      (provenanceFields.monthlyRent ||
        provenanceFields.interestRate ||
        provenanceFields.propertyTaxPct)
  );
  const dataConfidence = buildDataConfidence(
    provenanceFields as EnrichmentProvenanceInput | undefined,
    {
      hasRent: result.monthlyRentalIncome > 0,
      hasPrice: (sanitizedValues.purchasePrice ?? 0) > 0,
      hasBeds: (sanitizedValues.bedrooms ?? 0) > 0,
    }
  );
  const inputConfidence = buildInputConfidence({
    values: sanitizedValues,
    provenance: provenanceFields as EnrichmentProvenanceInput | undefined,
    touchedFields: new Set(
      (options?.touchedInputFields ?? [])
        .filter((key): key is string => typeof key === "string")
        .slice(0, 64)
    ),
    verified: normalizeInputVerificationEvidence(options?.inputVerification),
  });
  resultSnapshotWithScore.inputConfidence = inputConfidence;
  if (financingProfileOptionProvided) {
    resultSnapshotWithScore.financingProfile = appliedFinancingProfile;
  }

  const payload = {
    title,
    schema_version: INVESTCALC_SCHEMA_VERSION,
    // Persist the engine standard beside the frozen result snapshot. The
    // additive product-foundations migration backfills pre-version rows as
    // `legacy-unversioned`; never attribute today's math to older analyses.
    methodology_version: result.methodologyVersion,
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
    // Effective % from the calc — in annual-$ tax mode propertyTaxPct is
    // undefined and this column used to persist a fabricated 1.1 that the
    // Compare assumptions then displayed. calc-analysis derives the true
    // effective % (bill / price) in that mode; percent mode is unchanged
    // (input, or the same 1.1 default the math used).
    property_tax_pct: Math.round(result.propertyTaxPctEffective * 100) / 100,
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
    data_confidence: {
      ...dataConfidence,
      inputConfidence,
    } as unknown as Record<string, unknown>,
    ...(financingProfileOptionProvided
      ? {
          financing_profile_id: appliedFinancingProfile?.profileId ?? null,
          financing_profile_version: appliedFinancingProfile?.termsVersion ?? null,
          financing_profile_snapshot:
            (appliedFinancingProfile as unknown as Record<string, unknown> | null) ?? null,
        }
      : {}),
  };

  const candidateExistingId = existingId?.trim();
  if (candidateExistingId) {
    const { data: existing, error: existingErr } = await supabase
      .from("saved_analyses")
      .select(
        "id, address, title, data_confidence, financing_profile_id, financing_profile_version, financing_profile_snapshot"
      )
      .eq("id", candidateExistingId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingErr) {
      return toServerErrorResult(existingErr, "saved-analyses");
    }

    if (!existing) {
      // The targeted row is gone (deleted or archived in another tab /
      // My Deals). Never fall through to the insert path here - a silent
      // re-insert resurrects a deal the user just deleted, and a
      // same-address sibling would hijack the duplicate chooser. The
      // client detaches its stale id and offers save-as-new explicitly.
      return {
        ok: false,
        code: "DEAL_DELETED",
        message: "This saved deal was deleted or archived, so it can't be updated.",
      };
    }

    const canUpdateSavedDeal = await hasPaidPlanSubscription(supabase, user.id);
    if (!canUpdateSavedDeal) {
      return {
        ok: false,
        code: "ENTITLEMENT_SAVE",
        message: "Upgrade required to update saved analyses.",
      };
    }

    const addressChanged =
      (existing.address ?? "").trim().toLowerCase() !== addressTrimmed.toLowerCase();
    if (addressChanged && options?.allowAddressChange !== true) {
      // The form's address diverged from the saved deal's. Updating in
      // place would silently rewrite the old property's row, so the caller
      // must pick a path: save as a new deal, or re-call with
      // allowAddressChange to move this deal to the new address.
      return {
        ok: false,
        code: "ADDRESS_CHANGED",
        message:
          "The property address no longer matches this saved deal. Save it as a new deal, or update the saved deal's address.",
        existingId: existing.id,
        existingTitle: dbString(existing.title) ?? undefined,
      };
    }

    if (addressChanged && options?.allowAddressChange === true) {
      // Moving this deal to the new address must clear the same duplicate
      // guard the insert path enforces — without it, "update the saved
      // deal's address" silently created a same-address twin with no
      // Scenario suffix (two identical-looking My Deals rows whose numbers
      // differ, and the duplicate chooser only ever surfaces the older
      // one). The row being moved can't self-match: its stored address is
      // the OLD one, and scenario siblings share that old address, not the
      // destination. On collision, return DUPLICATE_ADDRESS with the
      // colliding row so the existing chooser (update it / save as
      // scenario) takes over instead of dead-ending.
      const { data: addressTaken, error: dupErr } = await supabase.rpc(
        "saved_analyses_address_taken",
        {
          p_user_id: user.id,
          p_address: addressTrimmed,
        }
      );
      if (dupErr) {
        return toServerErrorResult(dupErr, "saved-analyses");
      }
      if (addressTaken === true) {
        const collision = (await findSavedAnalysesByAddress(supabase, user.id, addressTrimmed))[0];
        return {
          ok: false,
          code: "DUPLICATE_ADDRESS",
          message: "You already saved an analysis for this property address.",
          ...(collision
            ? { existingId: collision.id, existingTitle: collision.title ?? undefined }
            : {}),
        };
      }
    }

    // Keep the stored title on update - scenario rows carry a
    // "— Scenario N" suffix that recomputing from the address would
    // clobber. When the caller explicitly changed the address
    // (allowAddressChange), the derived title (the new address) must win
    // instead - preserving the old-address title would misname the deal
    // in My Deals.
    const preservedTitle = addressChanged ? undefined : dbString(existing.title)?.trim();
    // Older callers cannot resend a reopened deal's source context, so their
    // absent provenance keeps the stored legacy summary. The current analyzer
    // sends an explicit sentinel after fingerprint revalidation; its empty
    // provenance is authoritative and clears sources invalidated by edits.
    const existingDataConfidence = asRecord(
      (existing as Record<string, unknown>).data_confidence
    );
    let trustedProfileFieldsForUpdate: {
      financing_profile_id: string | null;
      financing_profile_version: number | null;
      financing_profile_snapshot: Record<string, unknown> | null;
    } | null = null;

    // New saves may attach only the current database revision. On an update,
    // a profile can legitimately have changed (or been deleted) since this
    // deal was first saved. Preserve that historical basis only from the
    // exact snapshot already stored on this owned row — never from the
    // browser's older blob — and only while its modeled terms still match
    // the form being saved.
    if (
      financingProfileOptionProvided &&
      options?.financingProfileSnapshot != null
    ) {
      const submitted = financingProfileSnapshotSchema.safeParse(
        options.financingProfileSnapshot
      );
      const existingRecord = existing as Record<string, unknown>;
      const stored = parseStoredFinancingProfileSnapshot(existingRecord);
      if (
        submitted.success &&
        stored &&
        sameFinancingProfileSnapshot(submitted.data, stored) &&
        financingProfileMatchesAnalysis(stored, sanitizedValues)
      ) {
        const storedRecord = asRecord(existingRecord.financing_profile_snapshot);
        if (storedRecord) {
          appliedFinancingProfile = stored;
          resultSnapshotWithScore.financingProfile = stored;
          trustedProfileFieldsForUpdate = {
            financing_profile_id: dbString(existingRecord.financing_profile_id) ?? null,
            financing_profile_version: stored.termsVersion,
            financing_profile_snapshot: storedRecord,
          };
        }
      }
    }
    // A kill-switch rollback must not erase a valid frozen revision on an
    // unrelated edit, but an old client must not leave provenance attached
    // after changing one of its modeled terms. The top-level database value
    // is the source of truth; never copy the embedded result JSON here.
    if (!financingProfileOptionProvided) {
      const existingRecord = existing as Record<string, unknown>;
      const stored = parseStoredFinancingProfileSnapshot(existingRecord);
      const storedRecord = asRecord(existingRecord.financing_profile_snapshot);
      if (
        stored &&
        storedRecord &&
        financingProfileMatchesAnalysis(stored, sanitizedValues)
      ) {
        resultSnapshotWithScore.financingProfile = stored;
        trustedProfileFieldsForUpdate = {
          financing_profile_id: dbString(existingRecord.financing_profile_id) ?? null,
          financing_profile_version: stored.termsVersion,
          financing_profile_snapshot: storedRecord,
        };
      } else {
        delete resultSnapshotWithScore.financingProfile;
        trustedProfileFieldsForUpdate = {
          financing_profile_id: null,
          financing_profile_version: null,
          financing_profile_snapshot: null,
        };
      }
    }
    const payloadWithTrustedProfile = trustedProfileFieldsForUpdate
      ? { ...payload, ...trustedProfileFieldsForUpdate }
      : payload;
    const updatePayload =
      shouldPreserveStoredDataConfidence({
        sourceContextProvided: options?.inputSourceContextProvided === true,
        provenanceProvided,
        hasStoredDataConfidence: Boolean(existingDataConfidence),
      }) && existingDataConfidence
        ? {
            ...payloadWithTrustedProfile,
            data_confidence: {
              ...existingDataConfidence,
              inputConfidence,
            },
          }
        : payloadWithTrustedProfile;
    const { data, error } = await supabase
      .from("saved_analyses")
      .update(preservedTitle ? { ...updatePayload, title: preservedTitle } : updatePayload)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      return toServerErrorResult(error, "saved-analyses");
    }

    return { ok: true, id: data.id, mode: "updated" };
  }

  let insertTitle = title;
  let scenarioSource:
    | Awaited<ReturnType<typeof findSavedAnalysesByAddress>>[number]
    | null = null;
  let scenarioName: string | null = null;
  if (options?.saveAsNewScenario === true) {
    // Explicit choice from the duplicate dialog: keep both. Number the title
    // off the current count of same-address analyses so dashboard rows stay
    // distinguishable (original = plain address, then Scenario 2, 3, …).
    let sameAddress: Awaited<ReturnType<typeof findSavedAnalysesByAddress>>;
    try {
      sameAddress = await findSavedAnalysesByAddress(supabase, user.id, addressTrimmed, {
        throwOnError: true,
      });
    } catch (error) {
      return toServerErrorResult(error, "saved-analyses-scenarios");
    }
    scenarioSource = sameAddress[0] ?? null;
    if (!scenarioSource) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "The saved deal for this scenario could not be found. Please retry from Save.",
      };
    }
    scenarioName = `Scenario ${sameAddress.length + 1}`;
    insertTitle = `${title.slice(0, 180)} — ${scenarioName}`;
  } else {
    const { data: addressTaken, error: dupErr } = await supabase.rpc("saved_analyses_address_taken", {
      p_user_id: user.id,
      p_address: addressTrimmed,
    });
    if (dupErr) {
      return toServerErrorResult(dupErr, "saved-analyses");
    }
    if (addressTaken === true) {
      // Surface the colliding row so the client can offer a real choice
      // (update it / save as scenario) instead of a dead end. If the lookup
      // finds nothing (shouldn't happen - same match as the RPC), degrade to
      // the plain message the old toast showed.
      const collision = (await findSavedAnalysesByAddress(supabase, user.id, addressTrimmed))[0];
      return {
        ok: false,
        code: "DUPLICATE_ADDRESS",
        message: "You already saved an analysis for this property address.",
        ...(collision
          ? { existingId: collision.id, existingTitle: collision.title ?? undefined }
          : {}),
      };
    }
  }

  const { count, error: countErr } = await supabase
    .from("saved_analyses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (countErr) {
    return toServerErrorResult(countErr, "saved-analyses");
  }

  if (!hasSavedDealCapacity(entitlements, count ?? 0)) {
    return {
      ok: false,
      code: "ENTITLEMENT_SAVE",
      message: `Saved deal limit reached for your plan (${getSavedDealLimitLabel(entitlements)}).`,
    };
  }

  let scenarioFields: {
    property_id?: string;
    scenario_name?: string;
    strategy_kind?: string | null;
  } = {};
  if (scenarioSource && scenarioName) {
    try {
      const propertyId = await resolveOwnedScenarioPropertyGroup({
        supabase,
        userId: user.id,
        source: {
          id: scenarioSource.id,
          property_id: scenarioSource.propertyId,
          scenario_name: scenarioSource.scenarioName,
          address: scenarioSource.address,
          form_snapshot: scenarioSource.formSnapshot,
        },
      });
      scenarioFields = {
        property_id: propertyId,
        scenario_name: scenarioName,
        strategy_kind: isStrategyKind(options?.strategyKind) ? options.strategyKind : null,
      };
    } catch (error) {
      return toServerErrorResult(error, "saved-analyses-scenarios");
    }
  }

  const { data, error } = await supabase
    .from("saved_analyses")
    .insert({
      user_id: user.id,
      ...payload,
      title: insertTitle,
      ...scenarioFields,
    })
    .select("id")
    .single();

  if (error) {
    return toServerErrorResult(error, "saved-analyses");
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
      "id, schema_version, methodology_version, form_snapshot, result_snapshot, financing_profile_id, financing_profile_version, financing_profile_snapshot, property_type, address, purchase_price, year_built, loan_term_years, interest_rate_pct, down_payment_pct, closing_costs_pct, bedrooms, bathrooms, sqft, monthly_rent, property_tax_pct, insurance_input_mode, insurance_pct, insurance_mo, hoa_mo, utilities_mo, maintenance_pct, vacancy_pct, management_pct, capex_pct, building_value_pct, depreciation_years, include_interest_deduction, tax_rate_pct, expense_growth_pct, rent_growth_pct, template_id, appreciation_rate_pct, selling_cost_pct"
    )
    .eq("id", id.trim())
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return toServerErrorResult(error, "saved-analyses");
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
    methodologyVersion: dbString((data as Record<string, unknown>).methodology_version) ?? null,
    formSnapshot: buildEditFormSnapshotFromRow(data as Record<string, unknown>),
    templateFallback,
    resultSnapshot: buildTrustedResultSnapshot(data as Record<string, unknown>),
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

/**
 * Does this user currently have ≥1 active buy box with at least one
 * criterion (and the plan feature to use it)? This is exactly the condition
 * under which an exported PDF carries the "Your buy box" block (see
 * getBuyBoxPdfVerdictAction), so the PDF cache keys off it:
 *   - read:  bypass the cached PDF so box edits always reflect on export
 *            (mirrors the branding bypass directly above the cache check);
 *   - write: store block-carrying PDFs with PDF_CACHE_VERSION_UNCACHEABLE,
 *            so deleting the last box (or downgrading) can never re-serve a
 *            stale block from cache.
 * Fails open to `false` (worst case: a cached, block-free PDF is served) —
 * degrade, don't block the export. A missing user_buy_boxes table (the
 * migration ships dormant) is an expected `false`.
 */
async function userHasUsableBuyBox(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  entitlements: Awaited<ReturnType<typeof getEntitlementsForUser>>
): Promise<boolean> {
  if (!hasPlanFeature(entitlements, "buy_box")) return false;
  try {
    const { data, error } = await supabase
      .from("user_buy_boxes")
      .select(
        "min_cap_rate_pct, min_coc_pct, min_dscr, min_cash_flow_monthly, max_purchase_price, property_types, target_states"
      )
      .eq("user_id", userId)
      .eq("is_active", true);
    if (error || !data) return false;
    return data.some((row) => {
      const r = row as Record<string, unknown>;
      return buyBoxHasCriteria({
        minCapRatePct: dbNumber(r.min_cap_rate_pct) ?? null,
        minCocPct: dbNumber(r.min_coc_pct) ?? null,
        minDscr: dbNumber(r.min_dscr) ?? null,
        minCashFlowMonthly: dbNumber(r.min_cash_flow_monthly) ?? null,
        maxPurchasePrice: dbNumber(r.max_purchase_price) ?? null,
        propertyTypes: Array.isArray(r.property_types)
          ? (r.property_types as BuyBoxCriteria["propertyTypes"])
          : [],
        targetStates: Array.isArray(r.target_states) ? (r.target_states as string[]) : [],
        isActive: true,
      });
    });
  } catch {
    return false;
  }
}

/**
 * Deal metrics the PDF generator derives from its ReportData payload. These
 * are calculateAnalysis outputs recomputed by the export pipeline at export
 * time (both the live-analyzer and saved-deal flows spread the fresh
 * computed result over any stored snapshot before building ReportData), so
 * the buy box is evaluated against the same numbers the report prints.
 */
const buyBoxPdfMetricsSchema = z
  .object({
    capRatePct: z.number().finite().nullable(),
    cocPct: z.number().finite().nullable(),
    dscr: z.number().finite().nullable(),
    cashFlowMonthly: z.number().finite().nullable(),
    purchasePrice: z.number().finite().nullable(),
    propertyType: z.enum(["single-family", "multi-family", "owner-occupant"]).nullable(),
    address: z.string().max(500).nullable(),
    isCashPurchase: z.boolean(),
  })
  .strict();

export type BuyBoxPdfVerdictActionResult =
  | { ok: true; verdict: BuyBoxPdfVerdict | null }
  | { ok: false; code: "VALIDATION_ERROR"; message: string };

/**
 * Server-side buy-box evaluation for the exported PDF's "Your buy box"
 * block. Called by lib/pdf-generator.ts while composing the report.
 *
 * Every expected "no block" state — signed out, no buy_box entitlement,
 * migration pending, no active box with criteria — maps to
 * `{ ok: true, verdict: null }`, so the PDF simply omits the block and the
 * export can never fail because of buy-box state. The boxes are read
 * RLS-scoped via the canonical listBuyBoxesAction and evaluated with the
 * lib/buy-box primitives (via buildBuyBoxPdfVerdict).
 */
export async function getBuyBoxPdfVerdictAction(
  input: unknown
): Promise<BuyBoxPdfVerdictActionResult> {
  const parsed = buyBoxPdfMetricsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal metrics payload." };
  }

  const listed = await listBuyBoxesAction();
  if (!listed.ok || !listed.canUse || listed.boxes.length === 0) {
    return { ok: true, verdict: null };
  }
  // Scope to the agent's OWN boxes. This verdict is printed into a PDF the
  // agent hands to a buyer or lender, and the payload carries no client id —
  // so another client's box NAME and criteria could otherwise appear in a
  // document sent to a different person.
  const ownBoxes = boxesForDealClient(listed.boxes, null);
  if (ownBoxes.length === 0) {
    return { ok: true, verdict: null };
  }

  const metrics: BuyBoxDealMetrics = {
    capRatePct: parsed.data.capRatePct,
    cocPct: parsed.data.cocPct,
    dscr: parsed.data.dscr,
    cashFlowMonthly: parsed.data.cashFlowMonthly,
    purchasePrice: parsed.data.purchasePrice,
    propertyType: parsed.data.propertyType,
    state: deriveStateFromAddress(parsed.data.address),
    isCashPurchase: parsed.data.isCashPurchase,
  };

  return { ok: true, verdict: buildBuyBoxPdfVerdict(ownBoxes, metrics) };
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
  const canGeneratePdf = hasPlanFeature(entitlements, "pdf_export");

  const savedDealId = id.trim();
  const { data, error } = await supabase
    .from("saved_analyses")
    .select(
      "id, schema_version, methodology_version, form_snapshot, result_snapshot, financing_profile_id, financing_profile_version, financing_profile_snapshot, property_type, address, purchase_price, year_built, loan_term_years, interest_rate_pct, down_payment_pct, closing_costs_pct, bedrooms, bathrooms, sqft, monthly_rent, property_tax_pct, insurance_input_mode, insurance_pct, insurance_mo, hoa_mo, utilities_mo, maintenance_pct, vacancy_pct, management_pct, capex_pct, building_value_pct, depreciation_years, include_interest_deduction, tax_rate_pct, expense_growth_pct, rent_growth_pct, template_id, appreciation_rate_pct, selling_cost_pct, pdf_url, pdf_snapshot_version"
    )
    .eq("id", savedDealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return toServerErrorResult(error, "saved-analyses");
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

  // Cancellation/downgrade does not erase a report the owner already
  // generated. That is the read-only access promised in the Terms: Free can
  // download the stored artifact, but cannot regenerate it from changed
  // inputs, branding, methodology, or report templates.
  if (!canGeneratePdf) {
    if (!cachedPdfUrl) {
      return {
        ok: false,
        code: "ENTITLEMENT_REQUIRED",
        message: "No saved PDF exists for this deal. Creating a new report requires Pro.",
      };
    }

    const objectPath = resolveAnalysisPdfObjectPath(cachedPdfUrl, user.id);
    if (!objectPath) {
      Sentry.captureMessage("retained-pdf path invalid", {
        level: "warning",
        tags: { feature: "retained-pdf-access" },
        extra: { savedDealId },
      });
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Your saved PDF couldn't be opened. Contact hello@usetruecap.com and we'll help recover it.",
      };
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(ANALYSIS_PDF_BUCKET)
      .createSignedUrl(objectPath, ANALYSIS_PDF_SIGNED_URL_TTL_SECONDS);
    if (signed?.signedUrl) {
      return { ok: true, source: "cache", pdfUrl: signed.signedUrl };
    }
    Sentry.captureMessage("retained-pdf sign failed", {
      level: "warning",
      tags: { feature: "retained-pdf-access" },
      extra: { savedDealId, message: signError?.message },
    });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Your saved PDF couldn't be opened. Contact hello@usetruecap.com and we'll help recover it.",
    };
  }

  // Cache check — only serve cached PDF if:
  //   1) it exists,
  //   2) its snapshot version matches the current template version, AND
  //   3) the user has NO branding configured.
  //
  // The third condition exists because cached PDFs don't track the
  // branding state they were generated with. If a user updates their
  // logo, brand color, or "Prepared by" name, the cached PDF would
  // still show the old branding indefinitely (until PDF_CACHE_VERSION
  // bumped). Bypassing cache for branded users means their changes
  // always reflect on the next export, at the cost of regenerating
  // (~3-5s + an upload). Acceptable tradeoff — branded users care
  // more about accuracy than speed.
  let hasUserBranding = false;
  try {
    const { data: brandingRow, error: brandingError } = await supabase
      .from("branding")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (brandingError) {
      // Surface query errors to Sentry but don't fail the export.
      // Falling through to normal cache logic means branded users get
      // a possibly-stale cached PDF, which is better UX than blocking
      // the export entirely. The Sentry capture makes systemic
      // failures (RLS misconfig, table missing, network) visible.
      Sentry.captureMessage("branding-lookup query error", {
        level: "warning",
        tags: { feature: "pdf-cache-branding-lookup" },
        extra: { message: brandingError.message, code: brandingError.code },
      });
    } else {
      hasUserBranding = Boolean(brandingRow);
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: "pdf-cache-branding-lookup" },
    });
    // Fall through to the normal cache logic on unexpected failures.
  }

  // Version match is against the COMPOSITE template+engine version (see
  // PDF_CACHE_VERSION) — legacy rows storing the old plain template version
  // (0-4) simply never match and regenerate. Never throws on odd legacy
  // values: dbNumber already coerced non-numeric to 0 above.
  if (
    cachedPdfUrl &&
    cachedVersion === PDF_CACHE_VERSION &&
    !hasUserBranding &&
    // Input confirmations can change without any financial-engine version
    // changing. A cached Decision Readiness page would then retain stale
    // "verified" evidence, so this report shape is intentionally regenerated.
    !isFeatureEnabled("input_confidence")
  ) {
    // Buy-box exports bypass the cache for the same reason branded ones do:
    // cached PDFs don't track the buy-box state they were generated with.
    // While the user has a usable buy box, every export regenerates so the
    // "Your buy box" block always reflects their CURRENT criteria (edits,
    // new boxes, default changes). Checked only on the would-serve-cache
    // path so the regenerate path pays no extra query.
    const hasUsableBuyBox = await userHasUsableBuyBox(supabase, user.id, entitlements);
    if (!hasUsableBuyBox) {
      // The bucket is PRIVATE (migration 20260802120000) — it used to be
      // public, which made every user's underwrite anonymously listable and
      // downloadable. Never hand back a durable URL: mint a short-lived
      // signed one, scoped by RLS to the caller's own folder. `supabase` here
      // is the cookie-bound user client, so signing an object outside
      // `<user.id>/` fails at the policy — a non-owner cannot mint a URL.
      const objectPath = resolveAnalysisPdfObjectPath(cachedPdfUrl, user.id);
      if (objectPath) {
        const { data: signed, error: signError } = await supabase.storage
          .from(ANALYSIS_PDF_BUCKET)
          .createSignedUrl(objectPath, ANALYSIS_PDF_SIGNED_URL_TTL_SECONDS);
        if (signed?.signedUrl) {
          return { ok: true, source: "cache", pdfUrl: signed.signedUrl };
        }
        // Object gone / policy denied / storage hiccup: fall through to the
        // regenerate path so the export still works, and leave a breadcrumb
        // so a systemic failure (e.g. the migration not applied) is visible.
        Sentry.captureMessage("pdf-cache-sign failed", {
          level: "warning",
          tags: { feature: "pdf-cache-sign" },
          extra: { message: signError?.message },
        });
      }
    }
  }

  const templateFallback = await getTemplateFallback(supabase, dbString(row.template_id));

  return {
    ok: true,
    source: "regenerate",
    id: String(row.id),
    schemaVersion: Number(row.schema_version ?? 1),
    methodologyVersion: dbString(row.methodology_version) ?? null,
    formSnapshot: buildEditFormSnapshotFromRow(row),
    templateFallback,
    resultSnapshot: buildTrustedResultSnapshot(row),
  };
}

/**
 * Record that a cached PDF was written for this deal.
 *
 * Takes no URL and no path: the object path is DERIVED server-side from the
 * authenticated user id + deal id + cache version, the same way the client
 * derives the upload path. Nothing about the storage location is
 * client-controlled, and what lands in `saved_analyses.pdf_url` is an
 * owner-scoped object path — never a durable public URL (the bucket is
 * private as of migration 20260802120000; reads mint a short-lived signed URL
 * in getSavedAnalysisPdfExportAction).
 */
export async function completeSavedAnalysisPdfExportAction(
  id: string
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
  if (!savedDealId) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid PDF export payload." };
  }

  const pdfPath = buildAnalysisPdfObjectPath(user.id, savedDealId, PDF_CACHE_VERSION);

  // A PDF generated while the user has a usable buy box or Decision
  // Readiness evidence carries mutable state the version composite cannot
  // see. Store it uncacheable so later edits cannot re-serve stale criteria
  // or confirmations.
  const hasUsableBuyBox = await userHasUsableBuyBox(supabase, user.id, entitlements);
  const hasMutableDecisionReadiness = isFeatureEnabled("input_confidence");

  const { data, error } = await supabase
    .from("saved_analyses")
    .update({
      pdf_url: pdfPath,
      pdf_generated_at: new Date().toISOString(),
      pdf_snapshot_version:
        hasUsableBuyBox || hasMutableDecisionReadiness
          ? PDF_CACHE_VERSION_UNCACHEABLE
          : PDF_CACHE_VERSION,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", savedDealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return toServerErrorResult(error, "saved-analyses");
  }

  if (!data) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }

  return { ok: true, pdfPath };
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
    return toServerErrorResult(error, "saved-analyses");
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
    return toServerErrorResult(error, "saved-analyses");
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
    return toServerErrorResult(error, "saved-analyses");
  }

  if (!data) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }

  return { ok: true };
}

/**
 * Move a saved deal to a pipeline stage (Pro). pipeline_stage is the single
 * lifecycle dimension; we sync the legacy is_completed/is_archived mirrors
 * from it (closed⇒completed, passed⇒archived) so the stale-archive cron and
 * older filters stay consistent. The last_activity_at trigger bumps on update.
 */
export async function updateSavedDealStageAction(
  id: string,
  stage: PipelineStage
): Promise<UpdateSavedDealLifecycleResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to update deal stage." };
  }

  const savedDealId = id.trim();
  if (!savedDealId || !isPipelineStage(stage)) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal or stage." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "pipeline")) {
    return { ok: false, code: "ENTITLEMENT_REQUIRED", message: "Pipeline stages are a Pro feature." };
  }

  const { data, error } = await supabase
    .from("saved_analyses")
    .update({
      pipeline_stage: stage,
      ...flagsForStage(stage),
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", savedDealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return toServerErrorResult(error, "saved-analyses");
  }
  if (!data) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }
  return { ok: true };
}

export type SetCloseDateResult =
  | { ok: true }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "VALIDATION_ERROR" | "MIGRATION_PENDING" | "NOT_FOUND" | "SERVER_ERROR";
      message: string;
    };

/**
 * Set (or clear) the close date on an OWNED deal — the date the user actually
 * closed, which drives the dashboard equity estimate. Pass null to clear.
 * Resilient to the close_date column not existing yet (ships in its own
 * migration): a 42703 returns MIGRATION_PENDING so the UI can hide gracefully.
 */
export async function setSavedDealCloseDateAction(
  id: string,
  closeDate: string | null
): Promise<SetCloseDateResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to update this deal." };
  }

  const savedDealId = id.trim();
  if (!savedDealId) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal." };
  }
  // Accept an ISO yyyy-mm-dd date or null (clear). Reject anything else. The
  // client `max=today` is only an HTML hint, so re-check here (the authoritative
  // gate): a future close date would make months-owned 0 and report the down
  // payment as today's equity. Lexical compare is correct for zero-padded
  // yyyy-mm-dd and avoids the timezone fragility of Date-object comparison.
  let value: string | null = null;
  if (closeDate != null) {
    const trimmed = closeDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || Number.isNaN(new Date(trimmed).getTime())) {
      return { ok: false, code: "VALIDATION_ERROR", message: "Enter a valid date." };
    }
    if (trimmed > new Date().toISOString().slice(0, 10)) {
      return { ok: false, code: "VALIDATION_ERROR", message: "Close date can't be in the future." };
    }
    // Sane floor: native date inputs can commit partial years (e.g. 0001)
    // mid-typing; a pre-1900 close date is never real and would produce a
    // multi-millennium months-owned figure.
    if (trimmed < "1900-01-01") {
      return { ok: false, code: "VALIDATION_ERROR", message: "Enter a valid close date." };
    }
    value = trimmed;
  }

  const { data, error } = await supabase
    .from("saved_analyses")
    .update({ close_date: value })
    .eq("id", savedDealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || /column .* does not exist/i.test(error.message ?? "")) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Owned-deal tracking isn't enabled yet." };
    }
    return toServerErrorResult(error, "saved-analyses");
  }
  if (!data) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }
  return { ok: true };
}

export type UpdateSavedDealTagsResult =
  | { ok: true; tags: string[] }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR";
      message: string;
    };

/** Replace a saved deal's tags (Pro). Tags are normalized server-side. */
export async function updateSavedDealTagsAction(
  id: string,
  tags: unknown
): Promise<UpdateSavedDealTagsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to update tags." };
  }

  const savedDealId = id.trim();
  if (!savedDealId) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal id." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "pipeline")) {
    return { ok: false, code: "ENTITLEMENT_REQUIRED", message: "Deal tags are a Pro feature." };
  }

  const normalized = normalizeTags(tags);

  const { data, error } = await supabase
    .from("saved_analyses")
    .update({ tags: normalized, last_activity_at: new Date().toISOString() })
    .eq("id", savedDealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return toServerErrorResult(error, "saved-analyses");
  }
  if (!data) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }
  return { ok: true, tags: normalized };
}

export type SetSavedDealClientResult =
  | { ok: true; clientId: string | null }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR";
      message: string;
    };

/**
 * Assign a saved deal to one of the agent's clients (or clear it with null) —
 * the write the whole Agent Pro loop hinges on: a deal appears on a client's
 * portal ONLY once its client_id points at them. Mirrors
 * updateSavedDealTagsAction's shape; gated on the roster entitlement, and the
 * client must be on the CALLER'S roster (RLS-scoped lookup — the FK alone
 * can't check ownership).
 */
export async function setSavedDealClientAction(
  id: string,
  clientId: string | null
): Promise<SetSavedDealClientResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }

  const savedDealId = id.trim();
  if (!savedDealId) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal id." };
  }
  if (clientId !== null && !/^[0-9a-f-]{36}$/i.test(clientId)) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid client." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "client_buy_box")) {
    return { ok: false, code: "ENTITLEMENT_REQUIRED", message: "Client assignment is an Agent Pro feature." };
  }

  if (clientId !== null) {
    const { data: ownedClient } = await supabase
      .from("agent_clients")
      .select("id")
      .eq("id", clientId)
      .eq("agent_user_id", user.id)
      .maybeSingle();
    if (!ownedClient) {
      return { ok: false, code: "VALIDATION_ERROR", message: "That client isn't on your roster." };
    }
  }

  const { data, error } = await supabase
    .from("saved_analyses")
    .update({ client_id: clientId, last_activity_at: new Date().toISOString() })
    .eq("id", savedDealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return toServerErrorResult(error, "saved-analyses");
  }
  if (!data) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }
  return { ok: true, clientId };
}

export type SavedDealBrief = { id: string; label: string; pipelineStage: string | null };
export type ListSavedDealsBriefResult =
  | { ok: true; deals: SavedDealBrief[] }
  | { ok: false; code: "SIGN_IN_REQUIRED" | "SERVER_ERROR"; message: string };

/** Lightweight list of the user's saved deals (id + label) for pickers,
 *  e.g. "apply a template to an existing deal". */
export async function listSavedDealsBriefAction(): Promise<ListSavedDealsBriefResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }
  const runQuery = (select: string) =>
    supabase
      .from("saved_analyses")
      .select(select)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
  // scenario_name ships in the properties/scenarios migration — retry without
  // it (address-only labels) while the column doesn't exist yet.
  let { data, error } = await runQuery("id, address, title, pipeline_stage, created_at, scenario_name");
  if (error && (error.code === "42703" || /column .* does not exist/i.test(error.message ?? ""))) {
    ({ data, error } = await runQuery("id, address, title, pipeline_stage, created_at"));
  }
  if (error) {
    return toServerErrorResult(error, "saved-analyses");
  }
  const deals: SavedDealBrief[] = ((data ?? []) as unknown[]).map((r) => {
    const row = r as {
      id: string;
      address: string | null;
      title: string | null;
      pipeline_stage: string | null;
      scenario_name?: string | null;
    };
    const base = row.address?.trim() || row.title?.trim() || "Untitled property";
    // Sibling scenarios share one address — the scenario name keeps picker
    // rows tellable apart (matches the My Deals row suffix).
    const scenario = typeof row.scenario_name === "string" ? row.scenario_name.trim() : "";
    return {
      id: row.id,
      label: scenario ? `${base} — ${scenario}` : base,
      pipelineStage: row.pipeline_stage ?? null,
    };
  });
  return { ok: true, deals };
}

export type DealDueDiligenceResult =
  | { ok: true; items: DueDiligenceItem[] }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "ENTITLEMENT_REQUIRED"
        | "MIGRATION_PENDING"
        | "NOT_FOUND"
        | "VALIDATION_ERROR"
        | "SERVER_ERROR";
      message: string;
    };

function isMissingDueDiligenceTable(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

/** Read a saved deal's due-diligence checklist. Seeds the default checklist
 *  when the deal has none yet. Tolerant of the migration being unapplied. */
export async function getDealDueDiligenceAction(id: string): Promise<DealDueDiligenceResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }
  if (!(await hasPaidPlanSubscription(supabase, user.id))) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Due diligence and deal documents are available with TrueCap Pro.",
    };
  }
  const dealId = id.trim();
  if (!dealId) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal id." };
  }
  const { data: deal, error: dealErr } = await supabase
    .from("saved_analyses")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (dealErr) {
    return toServerErrorResult(dealErr, "saved-analyses");
  }
  if (!deal) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }

  const { data, error } = await supabase
    .from("deal_due_diligence")
    .select("items")
    .eq("analysis_id", dealId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    if (isMissingDueDiligenceTable(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return toServerErrorResult(error, "saved-analyses");
  }
  const stored = data ? normalizeDueDiligenceItems((data as { items?: unknown }).items) : [];
  return { ok: true, items: stored.length > 0 ? stored : defaultDueDiligenceItems() };
}

/** Replace a saved deal's due-diligence checklist (normalized server-side). */
export async function updateDealDueDiligenceAction(
  id: string,
  items: unknown
): Promise<DealDueDiligenceResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }
  if (!(await hasPaidPlanSubscription(supabase, user.id))) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Due diligence and deal documents are available with TrueCap Pro.",
    };
  }
  const dealId = id.trim();
  if (!dealId) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal id." };
  }
  const normalized = normalizeDueDiligenceItems(items);

  const { data: deal, error: dealErr } = await supabase
    .from("saved_analyses")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (dealErr) {
    return toServerErrorResult(dealErr, "saved-analyses");
  }
  if (!deal) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }

  const { error } = await supabase.from("deal_due_diligence").upsert(
    {
      analysis_id: dealId,
      user_id: user.id,
      items: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "analysis_id" }
  );
  if (error) {
    if (isMissingDueDiligenceTable(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return toServerErrorResult(error, "saved-analyses");
  }
  return { ok: true, items: normalized };
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
    return toServerErrorResult(error, "saved-analyses");
  }

  return { ok: true, affectedCount: data?.length ?? 0 };
}
