import { z } from "zod";

import type { AnalysisResult } from "@/lib/calc-analysis";
import { analyzeBrrrr } from "@/lib/brrrr-analysis";
import {
  analyzeFixFlip,
  estimateFixFlipCarryingCost,
} from "@/lib/fix-flip-analysis";
import type { AnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

/** Stored beside the core result snapshot. Keep the field name stable: saved
 * analyses, public shares, and reports all use this same frozen payload. */
export const SPECIALIST_ANALYSIS_SNAPSHOT_FIELD = "specialistAnalysis" as const;

/** Bump only when the specialist input/output contract or formulas change.
 * Existing snapshots remain renderable because the parser is versioned. */
const SPECIALIST_ANALYSIS_MODEL_V1 = 1 as const;
export const SPECIALIST_ANALYSIS_MODEL_VERSION = SPECIALIST_ANALYSIS_MODEL_V1;

export const SPECIALIST_INPUT_SOURCES = [
  "saved-assumption",
  "base-underwrite",
  "core-analysis",
  "strategy-default",
  "derived",
] as const;

const sourceSchema = z.enum(SPECIALIST_INPUT_SOURCES);
const finite = z.number().finite();
const nonNegative = finite.min(0);
const percent = finite.min(0).max(100);

const brrrrInputSchema = z
  .object({
    purchasePrice: finite.positive(),
    rehabBudget: nonNegative,
    arv: finite.positive(),
    refiLtvPct: percent,
    refiRatePct: finite.min(0).max(30),
    refiTermYears: finite.int().min(1).max(50),
    closingCostsPctAcq: percent,
    closingCostsRefiPct: finite.min(0).max(20),
    downPaymentPct: percent,
    holdMonths: finite.int().min(0).max(120),
    monthlyCarryingCost: nonNegative,
    postRefiMonthlyOpEx: nonNegative,
    postRefiMonthlyRent: nonNegative,
  })
  .strict();

const brrrrSourceSchema = z
  .object({
    purchasePrice: sourceSchema,
    rehabBudget: sourceSchema,
    arv: sourceSchema,
    refiLtvPct: sourceSchema,
    refiRatePct: sourceSchema,
    refiTermYears: sourceSchema,
    closingCostsPctAcq: sourceSchema,
    closingCostsRefiPct: sourceSchema,
    downPaymentPct: sourceSchema,
    holdMonths: sourceSchema,
    monthlyCarryingCost: sourceSchema,
    postRefiMonthlyOpEx: sourceSchema,
    postRefiMonthlyRent: sourceSchema,
  })
  .strict();

const brrrrOutcomeSchema = z
  .object({
    originalDownPayment: nonNegative,
    originalClosingCosts: nonNegative,
    carryingCostsTotal: nonNegative,
    rehabBudget: nonNegative,
    totalCashInvested: nonNegative,
    newLoanAmount: nonNegative,
    refiClosingCosts: nonNegative,
    cashReturnedAtRefi: nonNegative,
    cashNeededAtRefi: nonNegative,
    cashLeftInDeal: nonNegative,
    newMonthlyPayment: nonNegative,
    postRefiMonthlyCashFlow: finite,
    postRefiAnnualCashFlow: finite,
    /** null is the durable JSON representation of an infinite cash-on-cash
     * return; isInfiniteReturn carries the meaning without persisting Infinity. */
    postRefiCashOnCashPct: finite.nullable(),
    isInfiniteReturn: z.boolean(),
    equityCreated: finite,
    valueAddRatio: finite,
  })
  .strict()
  .superRefine((outcome, ctx) => {
    if (outcome.isInfiniteReturn !== (outcome.postRefiCashOnCashPct === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["postRefiCashOnCashPct"],
        message:
          "Infinite BRRRR returns must be represented by a null rate and the explicit flag",
      });
    }
  });

const fixFlipInputSchema = z
  .object({
    purchasePrice: finite.positive(),
    rehabBudget: nonNegative,
    arv: finite.positive(),
    closingCostsPctAcq: percent,
    sellingCostsPct: finite.min(0).max(30),
    holdMonths: finite.int().min(0).max(120),
    monthlyCarryingCost: nonNegative,
    downPaymentPct: percent,
  })
  .strict();

const fixFlipSourceSchema = z
  .object({
    purchasePrice: sourceSchema,
    rehabBudget: sourceSchema,
    arv: sourceSchema,
    closingCostsPctAcq: sourceSchema,
    sellingCostsPct: sourceSchema,
    holdMonths: sourceSchema,
    monthlyCarryingCost: sourceSchema,
    downPaymentPct: sourceSchema,
  })
  .strict();

const fixFlipOutcomeSchema = z
  .object({
    cashAtClose: nonNegative,
    acquisitionClosingCosts: nonNegative,
    rehabBudget: nonNegative,
    carryingCostsTotal: nonNegative,
    sellingCosts: nonNegative,
    totalCashInvested: nonNegative,
    grossProfit: finite,
    netProfit: finite,
    roiOnCashPct: finite,
    annualizedRoiPct: finite,
    profitPerDay: finite,
    breakEvenArv: nonNegative,
  })
  .strict();

const sharedSnapshotFields = {
  // Keep the v1 literal stable when a future current model is introduced.
  // Add the new version as another schema branch; never rewrite this literal
  // and strand historical snapshots.
  modelVersion: z.literal(SPECIALIST_ANALYSIS_MODEL_V1),
  coreMethodologyVersion: z.string().min(1).max(40),
} as const;

const brrrrSnapshotSchema = z
  .object({
    ...sharedSnapshotFields,
    strategy: z.literal("brrrr"),
    effectiveInputs: brrrrInputSchema,
    inputSources: brrrrSourceSchema,
    outcome: brrrrOutcomeSchema,
  })
  .strict();

const fixFlipSnapshotSchema = z
  .object({
    ...sharedSnapshotFields,
    strategy: z.literal("fix-flip"),
    effectiveInputs: fixFlipInputSchema,
    inputSources: fixFlipSourceSchema,
    outcome: fixFlipOutcomeSchema,
  })
  .strict();

/** Wire-safe schema shared by result persistence and the report payload.
 * Keep this as a normal union: a future v2 must be able to add another BRRRR
 * and fix-flip branch with the same strategy discriminator while retaining
 * the immutable v1 branches above. */
export const specialistAnalysisSnapshotSchema = z.union([
  brrrrSnapshotSchema,
  fixFlipSnapshotSchema,
]);

export type SpecialistAnalysisSnapshot = z.infer<
  typeof specialistAnalysisSnapshotSchema
>;
export type SpecialistInputSource = z.infer<typeof sourceSchema>;

export type SpecialistAnalyzerStrategyKey = Extract<
  AnalyzerStrategyKey,
  "brrrr" | "fix-flip"
>;

type ResolvedNumber = {
  value: number;
  source: SpecialistInputSource;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isSpecialistAnalyzerStrategyKey(
  value: AnalyzerStrategyKey,
): value is SpecialistAnalyzerStrategyKey {
  return value === "brrrr" || value === "fix-flip";
}

function requiredNumber(
  value: unknown,
  source: SpecialistInputSource,
): ResolvedNumber | null {
  return isFiniteNumber(value) ? { value, source } : null;
}

/** Nullish means the optional field is absent and receives its visible
 * fallback. Any other invalid runtime value is suppressed rather than being
 * silently replaced. This also keeps a saved 0 distinct from missing. */
function optionalNumber(
  value: unknown,
  fallback: number,
  explicitSource: SpecialistInputSource,
  fallbackSource: SpecialistInputSource,
): ResolvedNumber | null {
  if (value === undefined || value === null) {
    return { value: fallback, source: fallbackSource };
  }
  return isFiniteNumber(value) ? { value, source: explicitSource } : null;
}

function methodologyVersion(result: AnalysisResult): string | null {
  return typeof result.methodologyVersion === "string" &&
    result.methodologyVersion.trim()
    ? result.methodologyVersion
    : null;
}

function buildBrrrrSnapshot(
  values: InvestmentFormValues,
  result: AnalysisResult,
): SpecialistAnalysisSnapshot | null {
  const coreMethodologyVersion = methodologyVersion(result);
  const purchasePrice = requiredNumber(values.purchasePrice, "base-underwrite");
  // Blank rehab is not $0. The live specialist cards require an explicit
  // budget before producing an outcome, so persistence/report/share must do
  // the same. An explicitly modeled 0 remains valid.
  const rehabBudget = requiredNumber(values.rehabBudget, "saved-assumption");
  const arv = requiredNumber(values.strategyArv, "saved-assumption");
  const refiLtvPct = optionalNumber(
    values.brrrrRefiLtvPct,
    75,
    "saved-assumption",
    "strategy-default",
  );
  const baseRate = requiredNumber(values.interestRate, "base-underwrite");
  const refiRatePct = baseRate
    ? optionalNumber(
        values.brrrrRefiRatePct,
        baseRate.value,
        "saved-assumption",
        "base-underwrite",
      )
    : null;
  const refiTermYears = optionalNumber(
    values.brrrrRefiTermYears,
    30,
    "saved-assumption",
    "strategy-default",
  );
  const closingCostsPctAcq = optionalNumber(
    values.closingCostsPct,
    3,
    "base-underwrite",
    "strategy-default",
  );
  const closingCostsRefiPct = optionalNumber(
    values.brrrrRefiClosingCostsPct,
    2,
    "saved-assumption",
    "strategy-default",
  );
  const downPaymentPct = optionalNumber(
    values.downPaymentPct,
    20,
    "base-underwrite",
    "strategy-default",
  );
  const holdMonths = optionalNumber(
    values.strategyHoldMonths,
    6,
    "saved-assumption",
    "strategy-default",
  );
  const monthlyCarryingCost = requiredNumber(
    result.totalOperatingExpenses,
    "core-analysis",
  );
  const postRefiMonthlyOpEx = requiredNumber(
    result.totalOperatingExpenses,
    "core-analysis",
  );
  const postRefiMonthlyRent = requiredNumber(
    result.monthlyRentalIncome,
    "core-analysis",
  );

  const resolved = {
    purchasePrice,
    rehabBudget,
    arv,
    refiLtvPct,
    refiRatePct,
    refiTermYears,
    closingCostsPctAcq,
    closingCostsRefiPct,
    downPaymentPct,
    holdMonths,
    monthlyCarryingCost,
    postRefiMonthlyOpEx,
    postRefiMonthlyRent,
  };
  if (
    !coreMethodologyVersion ||
    Object.values(resolved).some((entry) => entry === null)
  ) {
    return null;
  }

  const effectiveInputs = Object.fromEntries(
    Object.entries(resolved).map(([key, entry]) => [key, entry!.value]),
  );
  const inputSources = Object.fromEntries(
    Object.entries(resolved).map(([key, entry]) => [key, entry!.source]),
  );

  try {
    const rawOutcome = analyzeBrrrr(
      effectiveInputs as Parameters<typeof analyzeBrrrr>[0],
    );
    const candidate = {
      modelVersion: SPECIALIST_ANALYSIS_MODEL_VERSION,
      coreMethodologyVersion,
      strategy: "brrrr" as const,
      effectiveInputs,
      inputSources,
      outcome: {
        ...rawOutcome,
        postRefiCashOnCashPct: rawOutcome.isInfiniteReturn
          ? null
          : rawOutcome.postRefiCashOnCashPct,
      },
    };
    const parsed = specialistAnalysisSnapshotSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function buildFixFlipSnapshot(
  values: InvestmentFormValues,
  result: AnalysisResult,
): SpecialistAnalysisSnapshot | null {
  const coreMethodologyVersion = methodologyVersion(result);
  const purchasePrice = requiredNumber(values.purchasePrice, "base-underwrite");
  // Keep parity with the interactive model: missing rehab is incomplete,
  // while an explicit zero is a real assumption and must survive unchanged.
  const rehabBudget = requiredNumber(values.rehabBudget, "saved-assumption");
  const arv = requiredNumber(values.strategyArv, "saved-assumption");
  const closingCostsPctAcq = optionalNumber(
    values.closingCostsPct,
    3,
    "base-underwrite",
    "strategy-default",
  );
  const sellingCostsPct = optionalNumber(
    values.fixFlipSellingCostsPct,
    7,
    "saved-assumption",
    "strategy-default",
  );
  const holdMonths = optionalNumber(
    values.strategyHoldMonths,
    6,
    "saved-assumption",
    "strategy-default",
  );
  const baseDownPaymentPct = optionalNumber(
    values.downPaymentPct,
    20,
    "base-underwrite",
    "strategy-default",
  );
  const downPaymentPct = baseDownPaymentPct
    ? optionalNumber(
        values.fixFlipDownPaymentPct,
        baseDownPaymentPct.value,
        "saved-assumption",
        baseDownPaymentPct.source,
      )
    : null;
  const explicitCarry = values.fixFlipCarryMonthly;
  const monthlyCarryingCost = downPaymentPct
    ? explicitCarry === undefined || explicitCarry === null
      ? requiredNumber(
          estimateFixFlipCarryingCost(values, result, downPaymentPct.value),
          "derived",
        )
      : requiredNumber(explicitCarry, "saved-assumption")
    : null;

  const resolved = {
    purchasePrice,
    rehabBudget,
    arv,
    closingCostsPctAcq,
    sellingCostsPct,
    holdMonths,
    monthlyCarryingCost,
    downPaymentPct,
  };
  if (
    !coreMethodologyVersion ||
    Object.values(resolved).some((entry) => entry === null)
  ) {
    return null;
  }

  const effectiveInputs = Object.fromEntries(
    Object.entries(resolved).map(([key, entry]) => [key, entry!.value]),
  );
  const inputSources = Object.fromEntries(
    Object.entries(resolved).map(([key, entry]) => [key, entry!.source]),
  );

  try {
    const outcome = analyzeFixFlip(
      effectiveInputs as Parameters<typeof analyzeFixFlip>[0],
    );
    const candidate = {
      modelVersion: SPECIALIST_ANALYSIS_MODEL_VERSION,
      coreMethodologyVersion,
      strategy: "fix-flip" as const,
      effectiveInputs,
      inputSources,
      outcome,
    };
    const parsed = specialistAnalysisSnapshotSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Build a deterministic, JSON-safe specialist strategy snapshot from the
 * already-validated form and canonical core result. The rental engine remains
 * the source for shared rent/expense values; only the existing specialist
 * engines produce specialist outcomes.
 */
export function buildSpecialistAnalysisSnapshot(
  values: InvestmentFormValues,
  result: AnalysisResult,
  strategyKey: AnalyzerStrategyKey,
): SpecialistAnalysisSnapshot | null {
  if (strategyKey === "brrrr") return buildBrrrrSnapshot(values, result);
  if (strategyKey === "fix-flip") {
    return buildFixFlipSnapshot(values, result);
  }
  return null;
}

/** Validate and clone a persisted/wire snapshot. Unknown model versions,
 * incomplete payloads, non-finite numbers, and strategy-shape mismatches are
 * suppressed instead of reaching reports or share surfaces. */
export function parseSpecialistAnalysisSnapshot(
  value: unknown,
): SpecialistAnalysisSnapshot | null {
  const parsed = specialistAnalysisSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Validate a frozen specialist payload against the two pieces of context that
 * give it meaning. A valid object from another strategy or underwriting
 * methodology is not interchangeable with the result being displayed.
 */
export function resolveSpecialistAnalysisSnapshot(input: {
  snapshot: unknown;
  strategyKey: AnalyzerStrategyKey;
  coreMethodologyVersion: unknown;
}): SpecialistAnalysisSnapshot | null {
  if (!isSpecialistAnalyzerStrategyKey(input.strategyKey)) return null;
  const coreMethodologyVersion =
    typeof input.coreMethodologyVersion === "string"
      ? input.coreMethodologyVersion.trim()
      : "";
  if (!coreMethodologyVersion) return null;

  const parsed = parseSpecialistAnalysisSnapshot(input.snapshot);
  if (
    !parsed ||
    parsed.strategy !== input.strategyKey ||
    parsed.coreMethodologyVersion !== coreMethodologyVersion
  ) {
    return null;
  }
  return parsed;
}

/**
 * Read only the field frozen beside a recorded core result. Missing, malformed,
 * cross-strategy, and cross-methodology payloads all fail closed; callers must
 * never substitute a newly calculated specialist result for them.
 */
export function readRecordedSpecialistAnalysisSnapshot(input: {
  resultSnapshot: unknown;
  strategyKey: AnalyzerStrategyKey;
  coreMethodologyVersion: unknown;
}): SpecialistAnalysisSnapshot | null {
  if (
    !input.resultSnapshot ||
    typeof input.resultSnapshot !== "object" ||
    Array.isArray(input.resultSnapshot) ||
    !Object.prototype.hasOwnProperty.call(
      input.resultSnapshot,
      SPECIALIST_ANALYSIS_SNAPSHOT_FIELD,
    )
  ) {
    return null;
  }
  return resolveSpecialistAnalysisSnapshot({
    snapshot: (input.resultSnapshot as Record<string, unknown>)[
      SPECIALIST_ANALYSIS_SNAPSHOT_FIELD
    ],
    strategyKey: input.strategyKey,
    coreMethodologyVersion: input.coreMethodologyVersion,
  });
}
