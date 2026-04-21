import { z } from "zod";

/** Bump when `investmentFormSchema` shape changes; used for persisted snapshots. */
export const INVESTCALC_SCHEMA_VERSION = 7;

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

export function isValidRentalUnit(unit: z.infer<typeof unitSchema> | undefined | null): boolean {
  if (!unit) return false;
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
    unit.monthlyRent >= 0
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
  yearBuilt: z
    .number({ invalid_type_error: "Enter year built" })
    .min(1800, "Year must be after 1800")
    .max(new Date().getFullYear() + 5, "Year too far in future"),

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

  // Operating expenses
  maintenancePct: z
    .number({ invalid_type_error: "Enter maintenance %" })
    .min(0)
    .max(50),
  vacancyPct: z
    .number({ invalid_type_error: "Enter vacancy %" })
    .min(0)
    .max(50),
  mgmtPct: z
    .number({ invalid_type_error: "Enter mgmt %" })
    .min(0)
    .max(50),
  capexPct: z
    .number({ invalid_type_error: "Enter CapEx %" })
    .min(0)
    .max(50),
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

  /** Monthly $ overrides when using advanced operating expenses; omitted = use auto estimates / zero. */
  propertyTaxPct: optionalPercent,
  insuranceMonthly: optionalMoneyMo,
  hoaMonthly: optionalMoneyMo,
  utilitiesMonthly: optionalMoneyMo,
}).superRefine((values, ctx) => {
  const addSingleFamilyUnitDetailsIssues = () => {
    const b = values.bedrooms;
    if (typeof b !== "number" || !Number.isFinite(b)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bedrooms"], message: "Enter bedrooms" });
    } else if (b < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bedrooms"], message: "Min 0" });
    } else if (b > 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bedrooms"], message: "Max 20" });
    }

    const ba = values.bathrooms;
    if (typeof ba !== "number" || !Number.isFinite(ba)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bathrooms"], message: "Enter bathrooms" });
    } else if (ba < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bathrooms"], message: "Min 0" });
    } else if (ba > 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bathrooms"], message: "Max 20" });
    }

    const s = values.sqft;
    if (typeof s !== "number" || !Number.isFinite(s)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sqft"], message: "Enter sq ft" });
    } else if (s < 50) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sqft"], message: "Min 50 sq ft" });
    }

    const r = values.monthlyRent;
    if (typeof r !== "number" || !Number.isFinite(r)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["monthlyRent"], message: "Enter monthly rent" });
    } else if (r < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["monthlyRent"], message: "Rent must be 0 or more" });
    }
  };

  const addUnitRowFieldIssues = (unit: z.infer<typeof unitSchema> | undefined, index: number) => {
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
    } else if (u.monthlyRent < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units", index, "monthlyRent"],
        message: "Rent must be 0 or more",
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
    if (!isValidRentalUnit(unit)) {
      addUnitRowFieldIssues(unit, index);
    }
  });

  if (values.propertyType !== "owner-occupant") return;

  const units = values.units ?? [];
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
  propertyTaxPct: undefined,
  insuranceMonthly: undefined,
  hoaMonthly: undefined,
  utilitiesMonthly: undefined,
};
