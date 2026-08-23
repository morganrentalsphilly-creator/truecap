import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import {
  calculateMaxAllowableOffer,
  solveRequiredInterestRate,
  solveRequiredMonthlyRent,
} from "@/lib/max-allowable-offer";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import { buildMaoTarget, describeMaoTarget } from "@/lib/mao-targets";
import {
  buildOfferCeilingPresentation,
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling";
import type { ReportData } from "@/lib/pdf-generator";

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
  const target = resolveReportMaoTarget(targetInput, {
    isCashPurchase: result.monthlyPayment <= 0,
  });
  const maxOffer = calculateMaxAllowableOffer(values, target);
  if (!maxOffer) return null;
  const source: OfferCeilingTargetSource =
    normalizeOfferCeilingTargetSource(targetSourceInput) ??
    (normalizeMaoTarget(targetInput) ? "selected-targets" : "screening-defaults");
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
