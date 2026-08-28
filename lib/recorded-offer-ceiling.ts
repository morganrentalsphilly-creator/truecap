import { z } from "zod";

import type { DealOfferLine } from "@/lib/deal-offer-line";
import { describeMaoTarget } from "@/lib/mao-targets";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import {
  isAdoptedOfferCeilingTargetSource,
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import type { OfferCeilingExactResult } from "@/lib/offer-ceiling-access-contract";

const finite = z.number().finite();
const constraintSchema = z.object({
  key: z.enum([
    "cap-rate",
    "cash-on-cash",
    "cash-flow",
    "dscr",
    "irr",
    "cash-required",
    "purchase-price",
  ]),
  criterion: z.string(),
  normalizedSlack: finite,
});
const inverseSolveSchema = z
  .object({
    value: finite,
    alreadyMet: z.boolean().optional(),
    unreachable: z.boolean(),
  })
  .nullable();
const exactSchema = z.object({
  presentation: z.object({
    source: z.enum([
      "buy-box",
      "screening-defaults",
      "starter-criteria",
      "selected-targets",
    ]),
    sourceLabel: z.string(),
    ceiling: finite,
    askingPrice: finite,
    listPriceGap: finite,
    listPriceGapPct: finite.nullable(),
    marginOfSafetyPct: finite.nullable(),
    bindingConstraints: z.array(constraintSchema),
    nextConstraint: constraintSchema.nullable(),
    range: z.object({
      lower: finite.nullable(),
      base: finite,
      upper: finite.nullable(),
      label: z.literal("rent ±5%, rate ±0.5 points, vacancy ±2 points"),
    }),
  }),
  achieved: z.object({
    netCashFlow: finite,
    cocReturn: finite.optional(),
    capRate: finite,
    dscr: finite,
    monthlyPayment: finite.optional(),
    totalCashRequired: finite.optional(),
    irrPct: finite.nullable().optional(),
    irrStatus: z.enum(["unique", "multiple", "none"]).optional(),
  }),
  makePriceWork: z.object({
    currentMeets: z.boolean(),
    requiredMonthlyRent: inverseSolveSchema,
    requiredInterestRate: inverseSolveSchema,
  }),
  decisionBreakpoints: z.array(z.string()),
});

type RecordedOfferCeilingCapture =
  | { captured: false }
  | {
      captured: true;
      target: NonNullable<ReturnType<typeof normalizeMaoTarget>>;
      source: OfferCeilingTargetSource;
      exact: OfferCeilingExactResult | null;
    };

/**
 * Minimal analyzer state for a recorded Offer Ceiling. `null` is meaningful:
 * it says the current result was calculated live, so target edits may ask the
 * server for a fresh entitlement-checked solve. A non-null value says the
 * base metrics came from a saved historical snapshot and must not be mixed
 * with today's solver.
 */
export type RecordedOfferCeilingViewState = {
  captured: boolean;
  exact: OfferCeilingExactResult | null;
} | null;

/**
 * Invalidate a recorded solve after its target changes without accidentally
 * converting a live analysis into historical mode.
 *
 * Historical results stay fail-closed until the whole underwrite is run or
 * saved again. Live results (including the shared sample) remain live, so the
 * server can re-check entitlement and resolve the edited target. Treating a
 * live `null` as `{ captured: false }` blocks that request entirely.
 */
export function invalidateRecordedOfferCeilingForTargetEdit(
  current: RecordedOfferCeilingViewState,
): RecordedOfferCeilingViewState {
  return current === null ? null : { captured: false, exact: null };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Read a solved Offer Ceiling captured atomically inside result_snapshot.
 *
 * Property absence is intentionally distinct from a captured null solve.
 * Absence means an older/free row never captured the paid result and callers
 * must not fill it with today's formula. Null means the entitled historical
 * solve ran but no supported price cleared the recorded target.
 */
export function readRecordedOfferCeiling(
  snapshotInput: unknown,
): RecordedOfferCeilingCapture {
  const snapshot = asRecord(snapshotInput);
  if (
    !snapshot ||
    !Object.prototype.hasOwnProperty.call(snapshot, "offerCeilingExact")
  ) {
    return { captured: false };
  }

  const target = normalizeMaoTarget(snapshot.maxOfferTarget);
  const source = normalizeOfferCeilingTargetSource(snapshot.maxOfferTargetSource);
  if (!target || !source || !isAdoptedOfferCeilingTargetSource(source)) {
    return { captured: false };
  }

  if (snapshot.offerCeilingExact === null) {
    return { captured: true, target, source, exact: null };
  }

  const parsed = exactSchema.safeParse(snapshot.offerCeilingExact);
  if (!parsed.success || parsed.data.presentation.source !== source) {
    return { captured: false };
  }

  return {
    captured: true,
    target,
    source,
    exact: parsed.data as OfferCeilingExactResult,
  };
}

export function recordedDealOfferLine(input: {
  snapshot: unknown;
  isShoppingStage: boolean;
}): { offer: DealOfferLine | null; basisLabel: string } | null {
  if (!input.isShoppingStage) return null;
  const captured = readRecordedOfferCeiling(input.snapshot);
  if (!captured.captured) return null;

  const basis = captured.source === "buy-box" ? "buy-box" : "saved-target";
  const basisLabel =
    captured.source === "buy-box"
      ? `your captured Buy Box targets — ${describeMaoTarget(captured.target)}`
      : captured.source === "starter-criteria"
        ? `TrueCap starter criteria — ${describeMaoTarget(captured.target)}`
      : `your saved targets — ${describeMaoTarget(captured.target)}`;
  if (!captured.exact) return { offer: null, basisLabel };

  const { presentation, makePriceWork } = captured.exact;
  if (makePriceWork.currentMeets) {
    return {
      offer: { kind: "clears", maxPrice: presentation.ceiling, basis },
      basisLabel,
    };
  }

  const asking = presentation.askingPrice > 0 ? presentation.askingPrice : null;
  const discountPct =
    asking != null && asking > presentation.ceiling
      ? Math.round(((asking - presentation.ceiling) / asking) * 100)
      : null;
  return {
    offer: {
      kind: "cut",
      maxPrice: presentation.ceiling,
      asking,
      discountPct,
      basis,
    },
    basisLabel,
  };
}
