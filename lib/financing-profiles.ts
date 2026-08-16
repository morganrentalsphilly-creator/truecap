import { z } from "zod";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

export const FINANCING_PROFILE_LOAN_TYPES = [
  "custom",
  "conventional",
  "dscr",
  "fha",
  "va",
  "local_credit_union",
  "hard_money",
  "private_money",
] as const;

export type FinancingProfileLoanType = (typeof FINANCING_PROFILE_LOAN_TYPES)[number];

const nullableNumber = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) =>
      value === "" || value === undefined || value === null
        ? null
        : typeof value === "string"
          ? Number(value)
          : value,
    z.number().finite().min(minimum).max(maximum).nullable()
  );

const nullableTrimmedString = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(maximum).nullable()
  );

/**
 * Shared validation for create/update actions and frozen applied snapshots.
 * Bounds intentionally mirror the database checks in
 * 20260815130000_product_foundations.sql.
 */
const financingProfileFields = {
    name: z.string().trim().min(1, "Name this financing profile").max(100),
    loanType: z.string().trim().min(1).max(60).default("custom"),
    interestRatePct: nullableNumber(0, 30),
    downPaymentPct: nullableNumber(0, 100),
    ltvPct: nullableNumber(0, 100),
    amortizationYears: nullableNumber(1, 50),
    loanTermYears: nullableNumber(Number.EPSILON, 50),
    pointsPct: nullableNumber(0, 100),
    lenderFees: nullableNumber(0, 100_000_000),
    closingCostsPct: nullableNumber(0, 100),
    interestOnlyMonths: z.preprocess(
      (value) =>
        value === "" || value === undefined || value === null
          ? null
          : typeof value === "string"
            ? Number(value)
            : value,
      z.number().int().min(0).max(600).nullable()
    ),
    pmiAnnualRatePct: nullableNumber(0, 5),
    pmiNoCancel: z.boolean().nullable().default(null),
    lenderName: nullableTrimmedString(160),
    notes: nullableTrimmedString(5000),
    lastVerifiedAt: z.string().datetime({ offset: true }).nullable(),
    isActive: z.boolean().default(true),
    isDefault: z.boolean().default(false),
} as const;

function validateInterestOnlyPeriod(
  profile: {
    interestOnlyMonths: number | null;
    loanTermYears: number | null;
    downPaymentPct: number | null;
    ltvPct: number | null;
    lastVerifiedAt: string | null;
  },
  context: z.RefinementCtx
) {
    if (
      profile.interestOnlyMonths != null &&
      profile.loanTermYears != null &&
      profile.interestOnlyMonths > profile.loanTermYears * 12
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["interestOnlyMonths"],
        message: "Interest-only months cannot exceed the loan term.",
      });
    }
    if (
      profile.downPaymentPct != null &&
      profile.ltvPct != null &&
      Math.abs(profile.downPaymentPct + profile.ltvPct - 100) > 0.01
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ltvPct"],
        message: "Down payment and LTV must add up to 100%.",
      });
    }
    if (
      profile.lastVerifiedAt &&
      Date.parse(profile.lastVerifiedAt) > Date.now() + 86_400_000
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastVerifiedAt"],
        message: "Last verified date cannot be in the future.",
      });
    }
}

export const financingProfileInputSchema = z
  .object(financingProfileFields)
  .strict()
  .superRefine(validateInterestOnlyPeriod);

export type FinancingProfileInput = z.infer<typeof financingProfileInputSchema>;

export type FinancingProfile = FinancingProfileInput & {
  id: string;
  termsVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type FinancingProfileSnapshot = FinancingProfileInput & {
  profileId: string;
  termsVersion: number;
  appliedAt: string;
};

export const financingProfileSnapshotSchema = z
    .object({
      ...financingProfileFields,
      profileId: z.string().uuid(),
      termsVersion: z.number().int().min(1),
      appliedAt: z.string().datetime({ offset: true }),
    })
    .strict()
    .superRefine(validateInterestOnlyPeriod);

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function toIsoString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function rowToFinancingProfile(row: Record<string, unknown>): FinancingProfile {
  const createdAt = toIsoString(row.created_at) ?? new Date(0).toISOString();
  const updatedAt = toIsoString(row.updated_at) ?? createdAt;
  return {
    id: String(row.id),
    name: String(row.name ?? "Financing profile"),
    loanType: String(row.loan_type ?? "custom"),
    interestRatePct: toNumber(row.interest_rate_pct),
    downPaymentPct: toNumber(row.down_payment_pct),
    ltvPct: toNumber(row.ltv_pct),
    amortizationYears: toNumber(row.amortization_years),
    loanTermYears: toNumber(row.loan_term_years),
    pointsPct: toNumber(row.points_pct),
    lenderFees: toNumber(row.lender_fees),
    closingCostsPct: toNumber(row.closing_costs_pct),
    interestOnlyMonths: toNumber(row.interest_only_months),
    pmiAnnualRatePct: toNumber(row.pmi_annual_rate_pct),
    pmiNoCancel: typeof row.pmi_no_cancel === "boolean" ? row.pmi_no_cancel : null,
    lenderName: toStringOrNull(row.lender_name),
    notes: toStringOrNull(row.notes),
    lastVerifiedAt: toIsoString(row.last_verified_at),
    isActive: row.is_active !== false,
    isDefault: row.is_default === true,
    termsVersion: Math.max(1, Math.trunc(toNumber(row.terms_version) ?? 1)),
    createdAt,
    updatedAt,
  };
}

export function financingProfileToDbInput(profile: FinancingProfileInput) {
  return {
    name: profile.name,
    loan_type: profile.loanType,
    interest_rate_pct: profile.interestRatePct,
    down_payment_pct: profile.downPaymentPct,
    ltv_pct: profile.ltvPct,
    amortization_years: profile.amortizationYears,
    loan_term_years: profile.loanTermYears,
    points_pct: profile.pointsPct,
    lender_fees: profile.lenderFees,
    closing_costs_pct: profile.closingCostsPct,
    interest_only_months: profile.interestOnlyMonths,
    pmi_annual_rate_pct: profile.pmiAnnualRatePct,
    pmi_no_cancel: profile.pmiNoCancel,
    lender_name: profile.lenderName,
    notes: profile.notes,
    last_verified_at: profile.lastVerifiedAt,
    is_active: profile.isActive,
    is_default: profile.isDefault,
  };
}

export function snapshotFinancingProfile(
  profile: FinancingProfile,
  appliedAt = new Date().toISOString()
): FinancingProfileSnapshot {
  return {
    profileId: profile.id,
    termsVersion: profile.termsVersion,
    appliedAt,
    name: profile.name,
    loanType: profile.loanType,
    interestRatePct: profile.interestRatePct,
    downPaymentPct: profile.downPaymentPct,
    ltvPct: profile.ltvPct,
    amortizationYears: profile.amortizationYears,
    loanTermYears: profile.loanTermYears,
    pointsPct: profile.pointsPct,
    lenderFees: profile.lenderFees,
    closingCostsPct: profile.closingCostsPct,
    interestOnlyMonths: profile.interestOnlyMonths,
    pmiAnnualRatePct: profile.pmiAnnualRatePct,
    pmiNoCancel: profile.pmiNoCancel,
    lenderName: profile.lenderName,
    notes: profile.notes,
    lastVerifiedAt: profile.lastVerifiedAt,
    isActive: profile.isActive,
    isDefault: profile.isDefault,
  };
}

export function normalizeFinancingProfileSnapshot(
  value: unknown
): FinancingProfileSnapshot | null {
  const parsed = financingProfileSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export type FinancingProfileAnalysisPatch = Partial<
  Pick<
    InvestmentFormValues,
    | "interestRate"
    | "downPaymentPct"
    | "loanTermYears"
    | "closingCostsPct"
    | "pmiAnnualRatePct"
    | "pmiNoCancel"
  >
>;

/**
 * Only terms the current rental engine actually models are returned. Points,
 * lender fees, balloons and interest-only periods stay visible on the profile
 * but are never implied to affect the underwrite until the engine supports
 * them.
 */
export function financingProfileAnalysisPatch(
  profile: Pick<
    FinancingProfileInput,
    | "interestRatePct"
    | "downPaymentPct"
    | "ltvPct"
    | "amortizationYears"
    | "loanTermYears"
    | "closingCostsPct"
    | "pmiAnnualRatePct"
    | "pmiNoCancel"
  >
): FinancingProfileAnalysisPatch {
  const patch: FinancingProfileAnalysisPatch = {};
  if (profile.interestRatePct != null) patch.interestRate = profile.interestRatePct;
  if (profile.downPaymentPct != null) patch.downPaymentPct = profile.downPaymentPct;
  else if (profile.ltvPct != null) patch.downPaymentPct = 100 - profile.ltvPct;
  // The current engine amortizes over loanTermYears. Prefer an explicit
  // amortization period; fall back to the contractual term when it is all the
  // profile has. A balloon is stored but not separately modeled.
  if (profile.amortizationYears != null) patch.loanTermYears = profile.amortizationYears;
  else if (profile.loanTermYears != null) patch.loanTermYears = profile.loanTermYears;
  if (profile.closingCostsPct != null) patch.closingCostsPct = profile.closingCostsPct;
  if (profile.pmiAnnualRatePct != null) patch.pmiAnnualRatePct = profile.pmiAnnualRatePct;
  if (profile.pmiNoCancel != null) patch.pmiNoCancel = profile.pmiNoCancel;
  return patch;
}

export function financingProfileMatchesAnalysis(
  profile: FinancingProfileInput,
  values: Pick<
    InvestmentFormValues,
    | "interestRate"
    | "downPaymentPct"
    | "loanTermYears"
    | "closingCostsPct"
    | "pmiAnnualRatePct"
    | "pmiNoCancel"
  >
): boolean {
  const patch = financingProfileAnalysisPatch(profile);
  return Object.entries(patch).every(([key, expected]) => {
    const actual = values[key as keyof typeof values];
    if (typeof expected === "number") {
      return typeof actual === "number" && Math.abs(actual - expected) <= 0.000_001;
    }
    return actual === expected;
  });
}

export function financingProfileUnmodeledTerms(profile: FinancingProfileInput): string[] {
  const terms: string[] = [];
  if ((profile.pointsPct ?? 0) > 0) terms.push("points");
  if ((profile.lenderFees ?? 0) > 0) terms.push("lender fees");
  if ((profile.interestOnlyMonths ?? 0) > 0) terms.push("interest-only period");
  if (
    profile.loanTermYears != null &&
    profile.amortizationYears != null &&
    profile.loanTermYears !== profile.amortizationYears
  ) {
    terms.push("balloon maturity");
  }
  return terms;
}

export function financingProfileAgeBand(
  lastVerifiedAt: string | null,
  now = new Date()
): "unverified" | "0_30_days" | "31_90_days" | "91_180_days" | "over_180_days" {
  if (!lastVerifiedAt) return "unverified";
  const verified = Date.parse(lastVerifiedAt);
  if (!Number.isFinite(verified)) return "unverified";
  const days = Math.max(0, (now.getTime() - verified) / 86_400_000);
  if (days <= 30) return "0_30_days";
  if (days <= 90) return "31_90_days";
  if (days <= 180) return "91_180_days";
  return "over_180_days";
}

export function financingProfileLoanTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    custom: "Custom",
    conventional: "Conventional investor",
    dscr: "DSCR",
    fha: "FHA",
    va: "VA",
    local_credit_union: "Local credit union",
    hard_money: "Hard money",
    private_money: "Private money",
  };
  return labels[value] ?? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
