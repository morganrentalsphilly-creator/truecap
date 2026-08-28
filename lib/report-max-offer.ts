import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import {
  calculateMaxAllowableOffer,
  solveRequiredInterestRate,
  solveRequiredMonthlyRent,
} from "@/lib/max-allowable-offer";
import {
  normalizeMaoTarget,
  normalizeMaoTargetForFinancing,
} from "@/lib/mao-target-editor";
import { buildMaoTarget, describeMaoTarget } from "@/lib/mao-targets";
import {
  isAdoptedOfferCeilingTargetSource,
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import { buildOfferCeilingPresentation } from "@/lib/offer-ceiling";
import type { ReportData } from "@/lib/pdf-generator";
import { readRecordedOfferCeiling } from "@/lib/recorded-offer-ceiling";

/**
 * Resolve the exact acquisition target a report must use. Persisted targets
 * are untrusted JSON, so they pass through the same strict normalizer as the
 * analyzer. Cash purchases drop DSCR because debt service does not exist;
 * an invalid, missing, or DSCR-only cash target falls back to the canonical
 * report basis instead of silently producing an empty target.
 */
export function resolveReportMaoTarget(
  input: unknown,
  options: { isCashPurchase: boolean }
): MaoTarget {
  const normalized = normalizeMaoTarget(input);
  const cashAdjusted = normalized ? { ...normalized } : null;
  if (cashAdjusted && options.isCashPurchase) delete cashAdjusted.dscr;

  return (
    normalizeMaoTarget(cashAdjusted) ??
    buildMaoTarget(null, { isCashPurchase: options.isCashPurchase })
  );
}

/**
 * Build the complete ReportData acquisition block: price ceiling, its exact
 * criteria, achieved metrics, and both Deal Doctor inverse-solver paths.
 * All result-producing behavior remains delegated to the canonical engines.
 */
export function buildReportMaxOffer(args: {
  values: InvestmentFormValues;
  result: Pick<AnalysisResult, "monthlyPayment">;
  targetInput: unknown;
  targetSourceInput?: unknown;
}): NonNullable<ReportData["maxOffer"]> | null {
  const { values, result, targetInput, targetSourceInput } = args;
  const normalizedInput = normalizeMaoTarget(targetInput);
  const source: OfferCeilingTargetSource =
    normalizeOfferCeilingTargetSource(targetSourceInput) ??
    (normalizedInput ? "selected-targets" : "screening-defaults");
  // A report must never manufacture a price ceiling from product examples.
  // Missing targets and screening defaults remain a preliminary underwrite;
  // older snapshots with an explicit target but no source retain their
  // historical selected-target compatibility.
  if (!normalizedInput || !isAdoptedOfferCeilingTargetSource(source)) {
    return null;
  }
  const target = normalizeMaoTargetForFinancing(normalizedInput, {
    isCashPurchase: result.monthlyPayment <= 0,
  });
  if (!target) return null;
  const maxOffer = calculateMaxAllowableOffer(values, target);
  if (!maxOffer) return null;
  const presentation = buildOfferCeilingPresentation({ values, result: maxOffer, source });

  const requiredMonthlyRent = solveRequiredMonthlyRent(values, target);
  const requiredInterestRate = solveRequiredInterestRate(values, target);

  return {
    maxPrice: maxOffer.maxPrice,
    basis: describeMaoTarget(target),
    source,
    sourceLabel: presentation.sourceLabel,
    currentPriceGap: maxOffer.maxPrice - values.purchasePrice,
    bindingConstraints: presentation.bindingConstraints.map((constraint) => constraint.criterion),
    nextConstraint: presentation.nextConstraint?.criterion ?? null,
    range: presentation.range,
    achieved: {
      monthlyCashFlow: maxOffer.achieved.netCashFlow,
      cocReturn: maxOffer.achieved.cocReturn,
      capRate: maxOffer.achieved.capRate,
      dscr: maxOffer.achieved.dscr,
      ...(target.maxCashRequired !== undefined
        ? { totalCashRequired: maxOffer.achieved.totalCashRequired }
        : {}),
      ...(target.minIrrPct !== undefined
        ? {
            irrPct: maxOffer.achievedIrr?.primaryIrrPct ?? null,
            irrStatus: maxOffer.achievedIrr?.status ?? "none",
          }
        : {}),
    },
    requiredMonthlyRent: requiredMonthlyRent
      ? {
          value: requiredMonthlyRent.value,
          alreadyMet: requiredMonthlyRent.alreadyMet,
          unreachable: requiredMonthlyRent.unreachable,
        }
      : null,
    requiredInterestRate: requiredInterestRate
      ? {
          value: requiredInterestRate.value,
          alreadyMet: requiredInterestRate.alreadyMet,
          unreachable: requiredInterestRate.unreachable,
        }
      : null,
  };
}

/**
 * Map an atomically captured Offer Ceiling into the PDF acquisition block.
 *
 * A recorded report must never invoke today's solver for a saved result. An
 * absent or older incomplete capture therefore omits the block; a captured
 * null remains an explicit "not solvable" result. The extra CoC/alreadyMet
 * checks are required because older public-share captures predate those fields
 * and cannot reproduce the full report block exactly.
 */
export function buildRecordedReportMaxOffer(
  snapshotInput: unknown,
): ReportData["maxOffer"] {
  const captured = readRecordedOfferCeiling(snapshotInput);
  if (!captured.captured) return undefined;
  if (!captured.exact) return null;

  const { presentation, achieved, makePriceWork } = captured.exact;
  if (typeof achieved.cocReturn !== "number") return undefined;
  if (
    makePriceWork.requiredMonthlyRent &&
    typeof makePriceWork.requiredMonthlyRent.alreadyMet !== "boolean"
  ) {
    return undefined;
  }
  if (
    makePriceWork.requiredInterestRate &&
    typeof makePriceWork.requiredInterestRate.alreadyMet !== "boolean"
  ) {
    return undefined;
  }

  return {
    maxPrice: presentation.ceiling,
    basis: describeMaoTarget(captured.target),
    source: captured.source,
    sourceLabel: presentation.sourceLabel,
    currentPriceGap: presentation.ceiling - presentation.askingPrice,
    bindingConstraints: presentation.bindingConstraints.map(
      (constraint) => constraint.criterion,
    ),
    nextConstraint: presentation.nextConstraint?.criterion ?? null,
    range: presentation.range,
    achieved: {
      monthlyCashFlow: achieved.netCashFlow,
      cocReturn: achieved.cocReturn,
      capRate: achieved.capRate,
      dscr: achieved.dscr,
      ...(achieved.totalCashRequired !== undefined
        ? { totalCashRequired: achieved.totalCashRequired }
        : {}),
      ...(achieved.irrStatus !== undefined
        ? {
            irrPct: achieved.irrPct ?? null,
            irrStatus: achieved.irrStatus,
          }
        : {}),
    },
    requiredMonthlyRent: makePriceWork.requiredMonthlyRent
      ? {
          value: makePriceWork.requiredMonthlyRent.value,
          alreadyMet: makePriceWork.requiredMonthlyRent.alreadyMet!,
          unreachable: makePriceWork.requiredMonthlyRent.unreachable,
        }
      : null,
    requiredInterestRate: makePriceWork.requiredInterestRate
      ? {
          value: makePriceWork.requiredInterestRate.value,
          alreadyMet: makePriceWork.requiredInterestRate.alreadyMet!,
          unreachable: makePriceWork.requiredInterestRate.unreachable,
        }
      : null,
  };
}
