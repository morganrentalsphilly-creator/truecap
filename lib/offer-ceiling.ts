/**
 * Offer Ceiling presentation model.
 *
 * This module adds explanation around the canonical MAO solver; it never
 * changes underwriting formulas. Every scenario is re-run through
 * calculateMaxAllowableOffer/calculateAnalysis and stays explicitly labeled.
 */

import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  calculateMaxAllowableOffer,
  type MaoResult,
  type MaoTarget,
} from "@/lib/max-allowable-offer";
import type {
  OfferCeilingConstraint,
  OfferCeilingConstraintKey,
  OfferCeilingPresentation,
  OfferCeilingRange,
  OfferCeilingRangePreview,
  OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";

export type {
  OfferCeilingConstraint,
  OfferCeilingConstraintKey,
  OfferCeilingPresentation,
  OfferCeilingRange,
  OfferCeilingRangePreview,
  OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
export { normalizeOfferCeilingTargetSource } from "@/lib/offer-ceiling-contract";

const money = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;

function sourceLabel(source: OfferCeilingTargetSource): string {
  if (source === "buy-box") return "Under your Buy Box";
  if (source === "selected-targets") return "Under your selected targets";
  return "Under screening defaults";
}

function scaleRent(
  values: InvestmentFormValues,
  factor: number
): InvestmentFormValues {
  if (values.propertyType === "single-family") {
    if (typeof values.avgDailyRate === "number" && values.avgDailyRate > 0) {
      return { ...values, avgDailyRate: values.avgDailyRate * factor };
    }
    return {
      ...values,
      monthlyRent: Number(values.monthlyRent ?? 0) * factor,
    };
  }
  return {
    ...values,
    units: (values.units ?? []).map((unit) => ({
      ...unit,
      monthlyRent: Number(unit?.monthlyRent ?? 0) * factor,
    })),
  } as InvestmentFormValues;
}

function uncertaintyScenario(
  values: InvestmentFormValues,
  direction: "downside" | "upside"
): InvestmentFormValues {
  const downside = direction === "downside";
  const withRent = scaleRent(values, downside ? 0.95 : 1.05);
  return {
    ...withRent,
    interestRate: Math.max(
      0,
      Number(withRent.interestRate ?? 0) + (downside ? 0.5 : -0.5)
    ),
    vacancyPct: Math.min(
      100,
      Math.max(0, Number(withRent.vacancyPct ?? 0) + (downside ? 2 : -2))
    ),
  };
}

export function calculateOfferCeilingRange(
  values: InvestmentFormValues,
  target: MaoTarget,
  base: MaoResult
): OfferCeilingRange {
  const downside = calculateMaxAllowableOffer(
    uncertaintyScenario(values, "downside"),
    target
  );
  const upside = calculateMaxAllowableOffer(
    uncertaintyScenario(values, "upside"),
    target
  );
  return {
    lower: downside?.maxPrice ?? null,
    base: base.maxPrice,
    upper: upside?.maxPrice ?? null,
    label: "rent ±5%, rate ±0.5 points, vacancy ±2 points",
  };
}

/** Free-tier preview: return only a coarse $25k interval, never the optimized
 * exact solve. The paid/purchased surface receives the exact MaoResult. */
export function buildOfferCeilingRangePreview(
  values: InvestmentFormValues,
  target: MaoTarget
): OfferCeilingRangePreview | null {
  // A caller-controlled hard cap cannot participate in the free preview.
  // The exact solver treats maxPurchasePrice as its search upper bound, so
  // clipping or echoing that value would turn repeated preview requests into
  // a boundary oracle. Solve only against return criteria and keep both
  // returned endpoints on the fixed coarse grid. If the cap is the only
  // criterion, there is no safe calculated preview to return.
  const {
    maxPurchasePrice: _ignoredCallerCap,
    ...previewTarget
  } = target;
  if (Object.values(previewTarget).every((value) => value === undefined)) {
    return null;
  }

  const base = calculateMaxAllowableOffer(values, previewTarget);
  if (!base) return null;
  const range = calculateOfferCeilingRange(values, previewTarget, base);
  const candidates = [range.lower, range.base, range.upper].filter(
    (value): value is number => value != null && Number.isFinite(value)
  );
  if (candidates.length === 0) return null;
  const increment = 25_000 as const;
  const lower = Math.max(0, Math.floor(Math.min(...candidates) / increment) * increment);
  const upper = Math.ceil(Math.max(...candidates) / increment) * increment;
  const adjustedLower = upper <= lower ? Math.max(0, upper - increment) : lower;
  return { lower: adjustedLower, upper, increment };
}

export function rankOfferCeilingConstraints(
  result: MaoResult
): OfferCeilingConstraint[] {
  const { target, achieved, maxPrice } = result;
  const constraints: OfferCeilingConstraint[] = [];
  const add = (
    key: OfferCeilingConstraintKey,
    criterion: string,
    slack: number,
    scale: number
  ) => {
    constraints.push({
      key,
      criterion,
      normalizedSlack: Math.max(0, slack) / Math.max(Math.abs(scale), 1),
    });
  };

  if (target.capRate !== undefined) {
    add(
      "cap-rate",
      `Cap rate ≥ ${target.capRate}%`,
      achieved.capRate - target.capRate,
      target.capRate
    );
  }
  if (target.cocReturn !== undefined) {
    add(
      "cash-on-cash",
      `Cash-on-cash ≥ ${target.cocReturn}%`,
      achieved.cocReturn - target.cocReturn,
      target.cocReturn
    );
  }
  if (target.monthlyCashFlow !== undefined) {
    add(
      "cash-flow",
      `Cash flow ≥ ${money(target.monthlyCashFlow)}/mo`,
      achieved.netCashFlow - target.monthlyCashFlow,
      Math.max(Math.abs(target.monthlyCashFlow), 100)
    );
  }
  if (target.dscr !== undefined && achieved.monthlyPayment > 0) {
    add(
      "dscr",
      `DSCR ≥ ${target.dscr}`,
      achieved.dscr - target.dscr,
      target.dscr
    );
  }
  if (target.maxPurchasePrice !== undefined) {
    add(
      "purchase-price",
      `Purchase price ≤ ${money(target.maxPurchasePrice)}`,
      target.maxPurchasePrice - maxPrice,
      target.maxPurchasePrice
    );
  }

  return constraints.sort((a, b) => {
    const slack = a.normalizedSlack - b.normalizedSlack;
    return Math.abs(slack) > Number.EPSILON
      ? slack
      : a.key.localeCompare(b.key);
  });
}

export function buildOfferCeilingPresentation(args: {
  values: InvestmentFormValues;
  result: MaoResult;
  source: OfferCeilingTargetSource;
}): OfferCeilingPresentation {
  const askingPrice = Number(args.values.purchasePrice);
  const ranked = rankOfferCeilingConstraints(args.result);
  const tightest = ranked[0]?.normalizedSlack ?? 0;
  // Within 0.25% normalized slack, constraints are effectively tied at the
  // displayed $500 price step and should be named together.
  const bindingConstraints = ranked.filter(
    (constraint) => constraint.normalizedSlack - tightest <= 0.0025
  );
  const nextConstraint =
    ranked.find((constraint) => !bindingConstraints.includes(constraint)) ?? null;
  const gap = askingPrice - args.result.maxPrice;

  return {
    source: args.source,
    sourceLabel: sourceLabel(args.source),
    ceiling: args.result.maxPrice,
    askingPrice,
    listPriceGap: gap,
    listPriceGapPct: askingPrice > 0 ? (gap / askingPrice) * 100 : null,
    marginOfSafetyPct:
      askingPrice > 0
        ? ((args.result.maxPrice - askingPrice) / askingPrice) * 100
        : null,
    bindingConstraints,
    nextConstraint,
    range: calculateOfferCeilingRange(args.values, args.result.target, args.result),
  };
}
