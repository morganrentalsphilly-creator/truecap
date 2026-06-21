import { z } from "zod";
import { DEFAULT_APPRECIATION_RATE, DEFAULT_SELLING_COST_PCT } from "@/lib/exit-scenarios";

/** Bump when `investmentFormSchema` shape changes; used for persisted snapshots. */
export const INVESTCALC_SCHEMA_VERSION = 9;

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
  return (
    typeof unit.bedrooms === "number" &&
    unit.bedrooms >= 0 &&
    unit.bedrooms <= 20 &&
    typeof unit.bathrooms === "number" &&
    unit.bathrooms >= 0 &&
    unit.bathrooms <= 20 &&
    typeof unit.sqft === "number" &&
    unit.sqft >= 50 &&
    typeof unit.monthlyRent === "number" &&
    unit.monthlyRent >= minRent
  );
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
    .max(100_000_000, "Price too large"),
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

  // Multi-family units
  units: z.array(unitSchema).optional(),

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
  insuranceInputMode: insuranceInputModeSchema,
  insurancePct: optionalPercent,
  insuranceMonthly: optionalMoneyMo,
  hoaMonthly: optionalMoneyMo,
  utilitiesMonthly: optionalMoneyMo,
}).superRefine((values, ctx) => {
  const addSingleFamilyUnitDetailsIssues = () => {
    // Only bedrooms + monthlyRent are REQUIRED for a single-family run:
    // bedrooms drives the HUD rent auto-fill and rent is required for the
    // cash-flow math. Bathrooms + square feet are OPTIONAL — they aren't
    // used by calc-analysis or the Deal Score (verified), only by richer
    // reports/rehab. Keeping them optional lets the homepage promise a
    // genuine "address → price → run" minimal flow with baths/sqft tucked
    // under "Improve accuracy". Range checks for baths/sqft still apply
    // when a value IS provided (see the field-level schemas above). This
    // loosening is backward-compatible, so INVESTCALC_SCHEMA_VERSION is
    // intentionally NOT bumped (existing snapshots still parse).
    const b = values.bedrooms;
    if (typeof b !== "number" || !Number.isFinite(b)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bedrooms"], message: "Enter bedrooms" });
    } else if (b < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bedrooms"], message: "Min 0" });
    } else if (b > 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bedrooms"], message: "Max 20" });
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

    if (typeof u.bedrooms !== "number" || !Number.isFinite(u.bedrooms)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units", index, "bedrooms"],
        message: "Enter number of bedrooms",
      });
    } else if (u.bedrooms < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units", index, "bedrooms"],
        message: "Min 0",
      });
    } else if (u.bedrooms > 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units", index, "bedrooms"],
        message: "Max 20",
      });
    }

    if (typeof u.bathrooms !== "number" || !Number.isFinite(u.bathrooms)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units", index, "bathrooms"],
        message: "Enter number of bathrooms",
      });
    } else if (u.bathrooms < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units", index, "bathrooms"],
        message: "Min 0",
      });
    } else if (u.bathrooms > 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units", index, "bathrooms"],
        message: "Max 20",
      });
    }

    if (typeof u.sqft !== "number" || !Number.isFinite(u.sqft)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units", index, "sqft"],
        message: "Enter square feet",
      });
    } else if (u.sqft < 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units", index, "sqft"],
        message: "Min 50 sq ft",
      });
    }

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
  units: [
    { bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: false },
  ],
  downPaymentPct: 20,
  interestRate: 6.75,
  loanTermYears: 30,
  closingCostsPct: undefined,
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

export function normalizeInvestmentFormSnapshot(raw: unknown): InvestmentFormValues | null {
  const snapshot = asRecord(raw);
  if (!snapshot) return null;

  const propertyType =
    snapshot.propertyType === "single-family" ||
    snapshot.propertyType === "multi-family" ||
    snapshot.propertyType === "owner-occupant"
      ? snapshot.propertyType
      : "single-family";

  const units = Array.isArray(snapshot.units)
    ? snapshot.units.map(normalizeUnit)
    : getDefaultUnitsForPropertyType(propertyType);

  const parsed = investmentFormSchema.safeParse({
    ...defaultValues,
    ...snapshot,
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
    insuranceInputMode:
      snapshot.insuranceInputMode === "monthly" || snapshot.insuranceInputMode === "percent"
        ? snapshot.insuranceInputMode
        : "percent",
    insurancePct: asNumber(snapshot.insurancePct),
    insuranceMonthly: asNumber(snapshot.insuranceMonthly),
    hoaMonthly: asNumber(snapshot.hoaMonthly),
    utilitiesMonthly: asNumber(snapshot.utilitiesMonthly),
    units,
    templateId: typeof snapshot.templateId === "string" ? snapshot.templateId : undefined,
  });

  if (!parsed.success) return null;

  const data = parsed.data;
  return {
    ...data,
    appreciationRatePct: data.appreciationRatePct ?? DEFAULT_APPRECIATION_RATE,
    sellingCostPct: data.sellingCostPct ?? DEFAULT_SELLING_COST_PCT,
  };
}

export function getDefaultUnitsForPropertyType(propertyType: InvestmentFormValues["propertyType"]): UnitValues[] {
  if (propertyType === "single-family") {
    return [{ bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: false }];
  }
  if (propertyType === "owner-occupant") {
    return [
      { bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: true },
      { bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: false },
    ];
  }
  return [
    { bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: false },
    { bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: false },
  ];
}
