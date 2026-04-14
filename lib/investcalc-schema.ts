import { z } from "zod";

/** Bump when `investmentFormSchema` shape changes; used for persisted snapshots. */
export const INVESTCALC_SCHEMA_VERSION = 2;

const optionalMoneyMo = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return undefined;
  return n;
}, z.number().min(0, "Must be 0 or more").max(1_000_000, "Amount too large").optional());

export const unitSchema = z.object({
  bedrooms: z
    .number({ invalid_type_error: "Enter number of bedrooms" })
    .min(0, "Min 0")
    .max(20, "Max 20"),
  bathrooms: z
    .number({ invalid_type_error: "Enter number of bathrooms" })
    .min(0, "Min 0")
    .max(20, "Max 20"),
  sqft: z
    .number({ invalid_type_error: "Enter square feet" })
    .min(50, "Min 50 sq ft"),
  monthlyRent: z
    .number({ invalid_type_error: "Enter monthly rent" })
    .min(0, "Rent must be 0 or more"),
  isOwnerOccupied: z.boolean().optional(),
});

export const investmentFormSchema = z.object({
  propertyType: z.enum(["single-family", "multi-family", "house-hack"], {
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

  // Single-family unit details
  bedrooms: z
    .number({ invalid_type_error: "Enter bedrooms" })
    .min(0)
    .max(20)
    .optional(),
  bathrooms: z
    .number({ invalid_type_error: "Enter bathrooms" })
    .min(0)
    .max(20)
    .optional(),
  sqft: z.number({ invalid_type_error: "Enter sq ft" }).min(50).optional(),
  monthlyRent: z
    .number({ invalid_type_error: "Enter monthly rent" })
    .min(0)
    .optional(),

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

  /** Monthly $ overrides when using advanced operating expenses; omitted = use auto estimates / zero. */
  propertyTaxMonthly: optionalMoneyMo,
  insuranceMonthly: optionalMoneyMo,
  hoaMonthly: optionalMoneyMo,
  utilitiesMonthly: optionalMoneyMo,
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
    value: "house-hack",
    label: "House Hack",
    description: "Live in one, rent others",
    icon: "key",
  },
] as const;

export const defaultValues: InvestmentFormValues = {
  propertyType: "single-family",
  address: "",
  purchasePrice: 385000,
  yearBuilt: 2015,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1850,
  monthlyRent: 2800,
  units: [
    { bedrooms: 2, bathrooms: 1, sqft: 850, monthlyRent: 1800, isOwnerOccupied: true },
    { bedrooms: 2, bathrooms: 1, sqft: 850, monthlyRent: 1800, isOwnerOccupied: false },
    { bedrooms: 1, bathrooms: 1, sqft: 650, monthlyRent: 1400, isOwnerOccupied: false },
    { bedrooms: 1, bathrooms: 1, sqft: 650, monthlyRent: 1400, isOwnerOccupied: false },
  ],
  downPaymentPct: 20,
  interestRate: 6.75,
  loanTermYears: 30,
  maintenancePct: 10,
  vacancyPct: 5,
  mgmtPct: 8,
  capexPct: 5,
  propertyTaxMonthly: undefined,
  insuranceMonthly: undefined,
  hoaMonthly: undefined,
  utilitiesMonthly: undefined,
};
