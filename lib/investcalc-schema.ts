import { z } from "zod";
import { DEFAULT_APPRECIATION_RATE, DEFAULT_SELLING_COST_PCT } from "@/lib/exit-scenarios";

/** Bump when `investmentFormSchema` shape changes; used for persisted snapshots. */
export const INVESTCALC_SCHEMA_VERSION = 9;
/** Product-wide upper bound for a residential acquisition price. Inverse
 * solvers import the same value so an accepted form can never be silently
 * capped at a lower, undocumented search limit. */
export const MAX_PURCHASE_PRICE = 100_000_000;

const optionalMoneyMo = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return undefined;
  return n;
}, z.number().min(0, "Must be 0 or more").max(1_000_000, "Amount too large").optional());

const optionalPercent = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return undefined;
  return n;
}, z.number().min(0, "Must be 0% or more").max(100, "Max 100%").optional());

const optionalUnitNumber = <T extends z.ZodNumber>(schema: T) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    const n = typeof val === "number" ? val : Number(val);
    if (!Number.isFinite(n)) return undefined;
    return n;
  }, schema.optional());

/**
 * Coerce an operating-expense % input to a finite number. Empty, null,
 * undefined, and NaN (which RHF emits from an empty number input when
 * valueAsNumber is on) all become 0 — meaning "I'm not setting aside
 * anything for this expense category." Used for mgmtPct / vacancyPct /
 * maintenancePct / capexPct so self-managers (mgmt 0%) and similar
 * cases just-work.
 */
const coerceExpensePct = (val: unknown): number => {
  if (val === undefined || val === null || val === "") return 0;
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : 0;
};

const optionalYearBuilt = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return undefined;
  return n;
}, z.number({ invalid_type_error: "Enter a 4-digit year" }).min(1800, "Year must be after 1800").max(new Date().getFullYear() + 5, "Year too far in future").optional());

export const insuranceInputModeSchema = z.enum(["percent", "monthly"]);

/** Property tax as an annual % of price (default) or the actual annual $
 *  bill straight off the listing (Phase 2 #3 — "type the number Zillow
 *  shows you"). Mirrors the insurance dual-mode precedent. */
export const propertyTaxInputModeSchema = z.enum(["percent", "annual"]);

/**
 * Hard cap on the multi-family units array. The audience is small
 * multifamily / house-hacks (typically 2–8 units, never 50+ — that's
 * commercial, out of scope). The bound matters beyond UI sanity: the units
 * array rides the frozen share-link payload, so an UNBOUNDED array would let
 * a crafted /d/[encoded] link (or its edge OG image) run calculateAnalysis
 * over an arbitrarily large array when a victim or crawler opens it, and
 * would fan out one enrichment call per unit. Capping here makes every gated
 * path (Run/Save/Share/decode) fail safe to the fallback instead.
 */
export const MAX_UNITS = 50;

export const unitSchema = z.object({
  bedrooms: optionalUnitNumber(
    z.number({ invalid_type_error: "Enter number of bedrooms" }).min(0, "Min 0").max(20, "Max 20")
  ),
  bathrooms: optionalUnitNumber(
    z.number({ invalid_type_error: "Enter number of bathrooms" }).min(0, "Min 0").max(20, "Max 20")
  ),
  sqft: optionalUnitNumber(
    z.number({ invalid_type_error: "Enter square feet" }).min(50, "Min 50 sq ft")
  ),
  monthlyRent: optionalUnitNumber(
    z.number({ invalid_type_error: "Enter monthly rent" }).min(0, "Rent must be 0 or more")
  ),
  isOwnerOccupied: z.boolean().optional(),
});

export function isValidRentalUnit(
  unit: z.infer<typeof unitSchema> | undefined | null,
  options?: { allowZeroRent?: boolean }
): boolean {
  if (!unit) return false;
  const minRent = options?.allowZeroRent ? 0 : Number.EPSILON;
  // Rent is the ONLY field the cash-flow math reads from a unit
  // (calc-analysis sums unit.monthlyRent; beds/baths/sqft never enter the
  // math). So a rental unit is "valid" — counts for income, saves,
  // compares, and clears validation — on rent alone. Requiring
  // beds/baths/sqft too used to wall multi-family runs behind ~6 fields
  // that change nothing. Any facts the user DOES type are still
  // range-checked by unitSchema's field validation before this runs, so
  // dropping them here loses no guardrail. (Mirrors the single-family
  // loosening: rent required, facts optional.)
  return typeof unit.monthlyRent === "number" && unit.monthlyRent >= minRent;
}

export const investmentFormSchema = z.object({
  propertyType: z.enum(["single-family", "multi-family", "owner-occupant"], {
    required_error: "Select a property type",
  }),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(200, "Address is too long"),
  purchasePrice: z
    .number({ invalid_type_error: "Enter purchase price" })
    .min(10000, "Purchase price must be at least $10,000")
    .max(MAX_PURCHASE_PRICE, "Price too large"),
  yearBuilt: optionalYearBuilt,

  // Single-family unit details (optional at parse; required in superRefine when propertyType is single-family).
  // Must tolerate NaN from react-hook-form valueAsNumber on hidden/unmounted inputs after switching property type.
  bedrooms: optionalUnitNumber(
    z.number({ invalid_type_error: "Enter bedrooms" }).min(0, "Min 0").max(20, "Max 20")
  ),
  bathrooms: optionalUnitNumber(
    z.number({ invalid_type_error: "Enter bathrooms" }).min(0, "Min 0").max(20, "Max 20")
  ),
  sqft: optionalUnitNumber(z.number({ invalid_type_error: "Enter sq ft" }).min(50, "Min 50 sq ft")),
  monthlyRent: optionalUnitNumber(
    z.number({ invalid_type_error: "Enter monthly rent" }).min(0, "Rent must be 0 or more")
  ),

  // Multi-family units (bounded — see MAX_UNITS: keeps the share-link payload
  // and per-unit enrichment fan-out from being an unbounded-work vector).
  units: z.array(unitSchema).max(MAX_UNITS, `Max ${MAX_UNITS} units`).optional(),

  // Financing
  downPaymentPct: z
    .number({ invalid_type_error: "Enter down payment %" })
    .min(0, "Min 0%")
    .max(100, "Max 100%"),
  interestRate: z
    .number({ invalid_type_error: "Enter interest rate" })
    .min(0, "Min 0%")
    .max(30, "Max 30%"),
  loanTermYears: z
    .number({ invalid_type_error: "Enter loan term" })
    .min(1, "Min 1 year")
    .max(50, "Max 50 years"),
  /** Optional; omitted uses default closing cost % (see defaultValues / calc). */
  closingCostsPct: optionalPercent,
  /** Optional PMI / mortgage-insurance annual rate (% of loan balance). When
   *  omitted, calc-analysis applies DEFAULT_PMI_ANNUAL_RATE_PCT on sub-20%-down
   *  deals. 0 disables PMI entirely (lender-paid MI, gift-of-equity, etc.). */
  pmiAnnualRatePct: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    const n = typeof val === "number" ? val : Number(val);
    if (!Number.isFinite(n)) return undefined;
    return n;
  }, z.number().min(0, "Min 0%").max(5, "Max 5%").optional()),
  /** When true, mortgage insurance does NOT cancel at 80% LTV — models FHA MIP,
   *  which (with the typical <10% down) runs for the life of the loan. */
  pmiNoCancel: z.boolean().optional(),

  // Operating expenses. Preprocess: empty / NaN / null -> 0. This lets
  // self-managers (mgmt 0%), full-occupancy assumptions, etc. simply
  // clear the field to mean 0 % instead of typing "0". It also stops
  // the validation flash that fires between deleting the prior value
  // and re-typing.
  maintenancePct: z.preprocess(
    (val) => coerceExpensePct(val),
    z.number().min(0, "Min 0%").max(50, "Max 50%")
  ),
  vacancyPct: z.preprocess(
    (val) => coerceExpensePct(val),
    z.number().min(0, "Min 0%").max(50, "Max 50%")
  ),
  mgmtPct: z.preprocess(
    (val) => coerceExpensePct(val),
    z.number().min(0, "Min 0%").max(50, "Max 50%")
  ),
  capexPct: z.preprocess(
    (val) => coerceExpensePct(val),
    z.number().min(0, "Min 0%").max(50, "Max 50%")
  ),
  templateId: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().uuid("Invalid template").optional()
  ),
  buildingValuePct: z
    .number({ invalid_type_error: "Enter building value %" })
    .min(0, "Min 0%")
    .max(100, "Max 100%"),
  depreciationYears: z.union([z.literal(27.5), z.literal(39)], {
    invalid_type_error: "Select depreciation period",
  }),
  includeInterestDeduction: z.boolean().optional(),
  taxRatePct: optionalPercent,
  expenseGrowthPct: z
    .number({ invalid_type_error: "Enter expense growth rate" })
    .min(0, "Min 0%")
    .max(20, "Max 20%"),
  rentGrowthPct: z
    .number({ invalid_type_error: "Enter rent growth rate" })
    .min(0, "Min 0%")
    .max(20, "Max 20%"),
  appreciationRatePct: optionalPercent,
  sellingCostPct: optionalPercent,

  /** Monthly $ overrides when using advanced operating expenses; omitted = use auto estimates / zero. */
  propertyTaxPct: optionalPercent,
  // Annual-$ property tax mode (additive + optional, defaults preserve the
  // percent path byte-for-byte → INVESTCALC_SCHEMA_VERSION intentionally
  // NOT bumped, same precedent as the STR fields below). propertyTaxAnnual
  // caps at 1M/yr via optionalMoneyMo — plenty for any residential bill.
  // .default("percent"): share-link v1 payloads + saved snapshots predate
  // this field — a REQUIRED enum would fail their safeParse and break
  // every existing link (§8). Missing → percent → old behavior exactly.
  propertyTaxInputMode: propertyTaxInputModeSchema.default("percent"),
  propertyTaxAnnual: optionalMoneyMo,
  insuranceInputMode: insuranceInputModeSchema,
  insurancePct: optionalPercent,
  insuranceMonthly: optionalMoneyMo,
  hoaMonthly: optionalMoneyMo,
  utilitiesMonthly: optionalMoneyMo,
  // Short-term-rental income model (the "Short-term Rental" strategy). When
  // avgDailyRate is set, calc-analysis derives monthly income from
  // ADR × occupancy × 365 / 12 instead of monthlyRent, and strFurnishingCost is
  // a one-time startup cost added to cash required. Additive + optional, so
  // INVESTCALC_SCHEMA_VERSION is intentionally NOT bumped (existing snapshots
  // still parse; STR fields default to undefined → long-term-rent behavior).
  avgDailyRate: optionalMoneyMo,
  occupancyPct: optionalPercent,
  strFurnishingCost: optionalMoneyMo,
  // Up-front rehab / initial repairs (value-add deals). A one-time cost added to
  // cash required — it lowers cash-on-cash, just like STR furnishing. Kept
  // honest in v1: it does NOT change the depreciation basis or appreciation.
  // Additive + optional, so INVESTCALC_SCHEMA_VERSION is intentionally NOT bumped.
  rehabBudget: optionalMoneyMo,
}).superRefine((values, ctx) => {
  const addSingleFamilyUnitDetailsIssues = () => {
    // Only monthlyRent is REQUIRED for a single-family run — it's the one
    // input the cash-flow math can't proceed without. Bedrooms is now OPTIONAL
    // (Jun 2026): the per-strategy focus flows (e.g. Wholesale → MAO) need an
    // address-only path, and beds aren't used by calc-analysis or the Deal
    // Score — they only drive the HUD rent auto-fill + richer reports. Baths +
    // square feet are likewise optional. Range checks still apply when a value
    // IS provided (see the field-level schemas above). This loosening is
    // backward-compatible, so INVESTCALC_SCHEMA_VERSION is intentionally NOT
    // bumped (existing snapshots still parse).
    const b = values.bedrooms;
    if (typeof b === "number" && Number.isFinite(b)) {
      if (b < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bedrooms"], message: "Min 0" });
      } else if (b > 20) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bedrooms"], message: "Max 20" });
      }
    }

    // STR mode is income-driven by nightly rate × occupancy, so monthlyRent
    // isn't required — both STR inputs are. Treat the presence of EITHER STR
    // field as STR intent so the validation guides the user to fill the other
    // (on a visible STR input) rather than erroring on the hidden rent field.
    const adr = values.avgDailyRate;
    const occ = values.occupancyPct;
    const hasAdr = typeof adr === "number" && Number.isFinite(adr) && adr > 0;
    const hasOcc = typeof occ === "number" && Number.isFinite(occ) && occ > 0;
    if (hasAdr || hasOcc) {
      if (!hasAdr) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["avgDailyRate"], message: "Enter a nightly rate" });
      }
      if (!hasOcc) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["occupancyPct"], message: "Enter occupancy %" });
      }
      return;
    }
    const r = values.monthlyRent;
    if (typeof r !== "number" || !Number.isFinite(r)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["monthlyRent"], message: "Enter monthly rent" });
    } else if (r <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["monthlyRent"], message: "Rent must be greater than 0" });
    }
  };

  const addUnitRowFieldIssues = (
    unit: z.infer<typeof unitSchema> | undefined,
    index: number,
    options?: { allowZeroRent?: boolean }
  ) => {
    const u = unit ?? {};

    // Only rent is required per unit (beds/baths/sqft never touch the math
    // and are range-checked by unitSchema when provided) — so this flags
    // just the one field the deal genuinely can't run without. This branch
    // now only fires for a unit that's missing its rent (isValidRentalUnit
    // gates on rent alone), so it never re-walls the fact fields.
    if (typeof u.monthlyRent !== "number" || !Number.isFinite(u.monthlyRent)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units", index, "monthlyRent"],
        message: "Enter monthly rent",
      });
    } else if (options?.allowZeroRent ? u.monthlyRent < 0 : u.monthlyRent <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units", index, "monthlyRent"],
        message: options?.allowZeroRent ? "Rent must be 0 or more" : "Rent must be greater than 0",
      });
    }
  };

  if (values.propertyType === "single-family") {
    addSingleFamilyUnitDetailsIssues();
    return;
  }

  if (values.propertyType !== "multi-family" && values.propertyType !== "owner-occupant") return;

  // Every unit row in the list must be complete (not only "at least one valid unit").
  // Do not add a parent path ["units"] issue: @hookform/resolvers/zod would collapse
  // nested per-field errors into a single array-level error and hide inline messages.
  (values.units ?? []).forEach((unit, index) => {
    const allowZeroRent = values.propertyType === "owner-occupant" && !!unit?.isOwnerOccupied;
    if (!isValidRentalUnit(unit, { allowZeroRent })) {
      addUnitRowFieldIssues(unit, index, { allowZeroRent });
    }
  });

  if (values.propertyType !== "owner-occupant") return;

  const units = values.units ?? [];
  const ownerOccupiedIndexes = units.reduce<number[]>((indexes, unit, index) => {
    if (unit?.isOwnerOccupied) indexes.push(index);
    return indexes;
  }, []);

  if (ownerOccupiedIndexes.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["units", 0, "isOwnerOccupied"],
      message: "Choose which unit is owner occupied.",
    });
  }

  if (ownerOccupiedIndexes.length > 1) {
    ownerOccupiedIndexes.forEach((index) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units", index, "isOwnerOccupied"],
        message: "Only one unit can be owner occupied.",
      });
    });
  }

  const hasValidRental = units.some((u) => isValidRentalUnit(u) && !u.isOwnerOccupied);
  if (hasValidRental) return;

  const rentalIdx = units.findIndex((u) => !u?.isOwnerOccupied);
  // Incomplete rental row: per-field issues were already added above.
  if (rentalIdx >= 0) return;

  const idx = Math.max(0, units.length - 1);
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["units", idx, "monthlyRent"],
    message: "Add a rental unit row (Add Unit) and complete all rental fields.",
  });
});

export type InvestmentFormValues = z.infer<typeof investmentFormSchema>;
export type UnitValues = z.infer<typeof unitSchema>;

/**
 * Parse for the live instant-verdict PREVIEW only. The verdict math
 * (calculateAnalysis + deal score) never reads `address` — only
 * purchasePrice + monthlyRent (single-family) or unit rents (multi) — but
 * the full form schema requires a 5-char address for save/share (the share
 * payload + duplicate-address dedup depend on it). Gating the preview on the
 * full schema meant a user who typed the two numbers the math actually uses
 * saw blank space until they also typed an address that changes nothing.
 *
 * This injects a placeholder address before validating, so the magic-moment
 * preview lights up on price + rent alone, WITHOUT weakening the real address
 * requirement on Run / Save / Share (which still call the full schema). No
 * schema-shape change → INVESTCALC_SCHEMA_VERSION stays put.
 */
export function previewParse(values: unknown): ReturnType<typeof investmentFormSchema.safeParse> {
  if (values && typeof values === "object" && !Array.isArray(values)) {
    const v = values as Record<string, unknown>;
    const addr = v.address;
    if (typeof addr !== "string" || addr.trim().length < 5) {
      return investmentFormSchema.safeParse({ ...v, address: "Preview property" });
    }
  }
  return investmentFormSchema.safeParse(values);
}

export const PROPERTY_TYPES = [
  {
    value: "single-family",
    label: "Single Family",
    description: "Traditional rental property",
    icon: "home",
  },
  {
    value: "multi-family",
    label: "Multi-Family",
    description: "2+ unit property",
    icon: "building",
  },
  {
    value: "owner-occupant",
    label: "Owner Occupant",
    description: "Live in one, rent others",
    icon: "key",
  },
] as const;

export const defaultValues: Partial<InvestmentFormValues> = {
  propertyType: "single-family",
  address: "",
  purchasePrice: undefined,
  yearBuilt: undefined,
  bedrooms: undefined,
  bathrooms: undefined,
  sqft: undefined,
  monthlyRent: undefined,
  avgDailyRate: undefined,
  occupancyPct: undefined,
  strFurnishingCost: undefined,
  rehabBudget: undefined,
  units: [
    { bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: false },
  ],
  downPaymentPct: 20,
  interestRate: 6.75,
  loanTermYears: 30,
  closingCostsPct: undefined,
  pmiAnnualRatePct: undefined,
  pmiNoCancel: undefined,
  maintenancePct: 10,
  vacancyPct: 5,
  mgmtPct: 8,
  capexPct: 5,
  templateId: undefined,
  buildingValuePct: 85,
  depreciationYears: 27.5,
  includeInterestDeduction: true,
  taxRatePct: undefined,
  expenseGrowthPct: 2.5,
  rentGrowthPct: 2.5,
  appreciationRatePct: undefined,
  sellingCostPct: undefined,
  propertyTaxPct: undefined,
  propertyTaxInputMode: "percent",
  propertyTaxAnnual: undefined,
  insuranceInputMode: "percent",
  insurancePct: undefined,
  insuranceMonthly: undefined,
  hoaMonthly: undefined,
  utilitiesMonthly: undefined,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

function asNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function normalizeUnit(raw: unknown): UnitValues {
  const unit = asRecord(raw);
  return {
    bedrooms: asNumber(unit?.bedrooms),
    bathrooms: asNumber(unit?.bathrooms),
    sqft: asNumber(unit?.sqft),
    monthlyRent: asNumber(unit?.monthlyRent),
    isOwnerOccupied: asBoolean(unit?.isOwnerOccupied),
  };
}

/**
 * The explicit per-field sanitization shared by the strict snapshot
 * normalizer (below) and the lenient draft normalizer: every known field
 * coerced to its expected primitive or dropped. Keeping ONE list means a
 * new schema field only needs adding here.
 */
function sanitizeSnapshotFields(
  snapshot: Record<string, unknown>,
  propertyType: InvestmentFormValues["propertyType"],
  units: UnitValues[]
) {
  // Legacy (pre-2026-04-28, schema v7/v8) snapshots predate
  // insuranceInputMode — back then a stored insuranceMonthly WAS the typed
  // $/mo bill (calc read `insuranceMonthly ?? default`). Defaulting the
  // missing mode to "percent" made those deals silently reprice insurance
  // at the 0.5% estimate on reopen. Infer "monthly" when the legacy shape
  // says so: a positive insuranceMonthly with no insurancePct. Post-v9
  // snapshots always serialize the mode, so this never fires on them.
  const legacyInsuranceMonthly = asNumber(snapshot.insuranceMonthly);
  const insuranceInputMode =
    snapshot.insuranceInputMode === "monthly" || snapshot.insuranceInputMode === "percent"
      ? snapshot.insuranceInputMode
      : legacyInsuranceMonthly !== undefined &&
          legacyInsuranceMonthly > 0 &&
          asNumber(snapshot.insurancePct) === undefined
        ? ("monthly" as const)
        : ("percent" as const);

  return {
    propertyType,
    purchasePrice: asNumber(snapshot.purchasePrice),
    yearBuilt: asNumber(snapshot.yearBuilt),
    bedrooms: asNumber(snapshot.bedrooms),
    bathrooms: asNumber(snapshot.bathrooms),
    sqft: asNumber(snapshot.sqft),
    monthlyRent: asNumber(snapshot.monthlyRent),
    downPaymentPct: asNumber(snapshot.downPaymentPct),
    interestRate: asNumber(snapshot.interestRate),
    loanTermYears: asNumber(snapshot.loanTermYears),
    closingCostsPct: asNumber(snapshot.closingCostsPct),
    pmiAnnualRatePct: asNumber(snapshot.pmiAnnualRatePct),
    pmiNoCancel: asBoolean(snapshot.pmiNoCancel),
    maintenancePct: asNumber(snapshot.maintenancePct),
    vacancyPct: asNumber(snapshot.vacancyPct),
    mgmtPct: asNumber(snapshot.mgmtPct),
    capexPct: asNumber(snapshot.capexPct),
    buildingValuePct: asNumber(snapshot.buildingValuePct),
    depreciationYears: asNumber(snapshot.depreciationYears),
    includeInterestDeduction: asBoolean(snapshot.includeInterestDeduction),
    taxRatePct: asNumber(snapshot.taxRatePct),
    expenseGrowthPct: asNumber(snapshot.expenseGrowthPct),
    rentGrowthPct: asNumber(snapshot.rentGrowthPct),
    appreciationRatePct: asNumber(snapshot.appreciationRatePct),
    sellingCostPct: asNumber(snapshot.sellingCostPct),
    propertyTaxPct: asNumber(snapshot.propertyTaxPct),
    propertyTaxInputMode:
      snapshot.propertyTaxInputMode === "annual" || snapshot.propertyTaxInputMode === "percent"
        ? snapshot.propertyTaxInputMode
        : ("percent" as const),
    propertyTaxAnnual: asNumber(snapshot.propertyTaxAnnual),
    insuranceInputMode,
    insurancePct: asNumber(snapshot.insurancePct),
    insuranceMonthly: asNumber(snapshot.insuranceMonthly),
    hoaMonthly: asNumber(snapshot.hoaMonthly),
    utilitiesMonthly: asNumber(snapshot.utilitiesMonthly),
    avgDailyRate: asNumber(snapshot.avgDailyRate),
    occupancyPct: asNumber(snapshot.occupancyPct),
    strFurnishingCost: asNumber(snapshot.strFurnishingCost),
    rehabBudget: asNumber(snapshot.rehabBudget),
    units,
    templateId: typeof snapshot.templateId === "string" ? snapshot.templateId : undefined,
  };
}

export function normalizeInvestmentFormSnapshot(raw: unknown): InvestmentFormValues | null {
  // Saved rows get the legacy unit-drop retry; the DRAFT path must NOT
  // (normalizeInvestmentFormDraft calls the core with dropInvalidUnits
  // false) — an interrupted draft's mid-typing unit row is exactly what
  // the lenient draft path exists to preserve, not to silently drop.
  return normalizeSnapshotCore(raw, { dropInvalidUnits: true });
}

function normalizeSnapshotCore(
  raw: unknown,
  opts: { dropInvalidUnits: boolean }
): InvestmentFormValues | null {
  const snapshot = asRecord(raw);
  if (!snapshot) return null;

  const propertyType =
    snapshot.propertyType === "single-family" ||
    snapshot.propertyType === "multi-family" ||
    snapshot.propertyType === "owner-occupant"
      ? snapshot.propertyType
      : "single-family";

  const units = Array.isArray(snapshot.units)
    ? snapshot.units.slice(0, MAX_UNITS).map(normalizeUnit)
    : getDefaultUnitsForPropertyType(propertyType);

  let parsed = investmentFormSchema.safeParse({
    ...defaultValues,
    ...snapshot,
    ...sanitizeSnapshotFields(snapshot, propertyType, units),
  });

  if (!parsed.success) {
    if (!opts.dropInvalidUnits) return null;
    // Legacy tolerance (pre-2026-04-28 rows): the schema then allowed
    // rent 0 ("Rent must be 0 or more"), so old multi-family snapshots can
    // carry a 0-rent vacant unit that today's rent > 0 rule rejects —
    // freezing the deal (can't reopen, duplicate, or export). Retry ONCE
    // with the invalid units dropped, mirroring saveDealAction's save-time
    // unit filter, so the surviving units open exactly as a fresh save
    // would persist them. New saves are unaffected: the live form schema
    // and saveDealAction still enforce rent > 0, and current-era snapshots
    // never store such units, so the retry only ever fires on legacy rows.
    const retryUnits = units.filter((unit) =>
      isValidRentalUnit(unit, {
        allowZeroRent: propertyType === "owner-occupant" && !!unit.isOwnerOccupied,
      })
    );
    if (retryUnits.length === 0 || retryUnits.length === units.length) return null;
    parsed = investmentFormSchema.safeParse({
      ...defaultValues,
      ...snapshot,
      ...sanitizeSnapshotFields(snapshot, propertyType, retryUnits),
    });
    if (!parsed.success) return null;
  }

  const data = parsed.data;
  return {
    ...data,
    appreciationRatePct: data.appreciationRatePct ?? DEFAULT_APPRECIATION_RATE,
    sellingCostPct: data.sellingCostPct ?? DEFAULT_SELLING_COST_PCT,
  };
}

/** Friendly labels for the snapshot fields a legacy row most plausibly
 *  fails on. Anything unmapped falls back to the raw key, which is still
 *  more actionable than no field name at all. */
const SNAPSHOT_FIELD_LABELS: Record<string, string> = {
  monthlyRent: "Monthly rent",
  purchasePrice: "Purchase price",
  address: "Address",
  avgDailyRate: "Nightly rate",
  occupancyPct: "Occupancy %",
  interestRate: "Interest rate",
  downPaymentPct: "Down payment %",
  loanTermYears: "Loan term",
};

/**
 * Names the first schema failure that keeps a saved snapshot from opening,
 * e.g. `Monthly rent — Rent must be greater than 0` or
 * `Unit 2 monthly rent — Rent must be greater than 0`. Used by the reopen /
 * PDF-export failure toasts so "couldn't open this deal" tells the customer
 * WHICH field to fix instead of dead-ending (the old advice was circular:
 * "open it and re-save" when opening was the failing step). Returns null
 * when the snapshot actually parses (or isn't an object at all).
 */
export function describeInvestmentFormSnapshotIssue(raw: unknown): string | null {
  const snapshot = asRecord(raw);
  if (!snapshot) return null;

  const propertyType =
    snapshot.propertyType === "single-family" ||
    snapshot.propertyType === "multi-family" ||
    snapshot.propertyType === "owner-occupant"
      ? snapshot.propertyType
      : "single-family";

  const units = Array.isArray(snapshot.units)
    ? snapshot.units.slice(0, MAX_UNITS).map(normalizeUnit)
    : getDefaultUnitsForPropertyType(propertyType);

  const parsed = investmentFormSchema.safeParse({
    ...defaultValues,
    ...snapshot,
    ...sanitizeSnapshotFields(snapshot, propertyType, units),
  });
  if (parsed.success) return null;

  const issue = parsed.error.issues[0];
  if (!issue) return null;

  const path = issue.path;
  if (path[0] === "units" && typeof path[1] === "number") {
    return `Unit ${path[1] + 1} monthly rent — ${issue.message}`;
  }
  const key = typeof path[0] === "string" ? path[0] : "";
  const label = SNAPSHOT_FIELD_LABELS[key] ?? key;
  return label ? `${label} — ${issue.message}` : issue.message;
}

/**
 * Lenient sibling of normalizeInvestmentFormSnapshot for the ANONYMOUS
 * AUTO-SAVE DRAFT only. The draft exists precisely for interrupted sessions
 * — and an interrupted form is usually schema-INCOMPLETE (address + price
 * typed, rent not yet). The strict normalizer's full-schema gate rejected
 * exactly those drafts and the restore path then wiped them: the user the
 * feature was built for came back to an empty form.
 *
 * Field-level sanitization still applies (unknown keys dropped, wrong types
 * dropped, enums checked) so form.reset only ever sees well-typed values;
 * what's waived is only the cross-field completeness (rent present, address
 * length) that Run/Save still enforce via the full schema.
 */
export function normalizeInvestmentFormDraft(raw: unknown): InvestmentFormValues | null {
  // dropInvalidUnits false: a draft that fails strict parsing must fall
  // through to the lenient whitelist below (which preserves ALL normalized
  // units, incl. a mid-typing rent-less row) — the saved-row unit-drop
  // retry would silently delete the very unit the user was entering.
  const strict = normalizeSnapshotCore(raw, { dropInvalidUnits: false });
  if (strict) return strict;

  const snapshot = asRecord(raw);
  if (!snapshot) return null;

  const propertyType =
    snapshot.propertyType === "single-family" ||
    snapshot.propertyType === "multi-family" ||
    snapshot.propertyType === "owner-occupant"
      ? snapshot.propertyType
      : "single-family";

  const units = Array.isArray(snapshot.units)
    ? snapshot.units.slice(0, MAX_UNITS).map(normalizeUnit)
    : getDefaultUnitsForPropertyType(propertyType);

  // No raw spread here: without a schema parse to strip unknown keys, only
  // the explicit whitelist may reach form.reset. Address is sanitized by
  // hand (it rides the raw spread in the strict path).
  const address = typeof snapshot.address === "string" ? snapshot.address.slice(0, 300) : "";

  return {
    ...defaultValues,
    address,
    ...sanitizeSnapshotFields(snapshot, propertyType, units),
  } as InvestmentFormValues;
}

export function getDefaultUnitsForPropertyType(propertyType: InvestmentFormValues["propertyType"]): UnitValues[] {
  if (propertyType === "single-family") {
    return [{ bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: false }];
  }
  if (propertyType === "owner-occupant") {
    // Seed sensible per-unit defaults so a house-hack run doesn't open with a
    // wall of empty-unit errors. Owner unit rent is 0 (you live there); the
    // user just fills the rental unit's rent — exactly like single-family
    // requires rent. Beds/baths/sqft are starting points the user adjusts.
    return [
      { bedrooms: 2, bathrooms: 1, sqft: 900, monthlyRent: 0, isOwnerOccupied: true },
      { bedrooms: 2, bathrooms: 1, sqft: 900, monthlyRent: undefined, isOwnerOccupied: false },
    ];
  }
  return [
    { bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: false },
    { bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: false },
  ];
}
