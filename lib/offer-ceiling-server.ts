import "server-only";

import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import {
  calculateMaxAllowableOffer,
  meetsTarget,
  solveRequiredInterestRate,
  solveRequiredMonthlyRent,
  type MaoTarget,
} from "@/lib/max-allowable-offer";
import {
  buildOfferCeilingPresentation,
  buildOfferCeilingRangePreview,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling";
import type {
  OfferCeilingAccessPayload,
  OfferCeilingExactResult,
} from "@/lib/offer-ceiling-access-contract";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import {
  normalizeMaoTarget,
  normalizeMaoTargetForFinancing,
} from "@/lib/mao-target-editor";
import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildWhatNeedsToBeTrue,
  type AnyDecisionThreshold,
} from "@/lib/decision-thresholds";

const normalizedSampleValues = investmentFormSchema.parse(
  SAMPLE_DEAL_FIXTURE.values
);
const normalizedSampleTarget = normalizeMaoTarget(
  SAMPLE_DEAL_FIXTURE.maoTarget
);

/** Zod emits object keys in schema order, while normalizeMaoTarget emits its
 * fixed allowlist order. Comparing those normalized records is deterministic
 * and rejects lookalike requests that change even one property assumption or
 * acquisition criterion. */
export function isExactSharedSampleRequest(
  values: InvestmentFormValues,
  target: MaoTarget
): boolean {
  const parsedValues = investmentFormSchema.safeParse(values);
  const parsedTarget = normalizeMaoTarget(target);
  return Boolean(
    parsedValues.success &&
      parsedTarget &&
      normalizedSampleTarget &&
      JSON.stringify(parsedValues.data) === JSON.stringify(normalizedSampleValues) &&
      JSON.stringify(parsedTarget) === JSON.stringify(normalizedSampleTarget)
  );
}

function exactResult(
  values: InvestmentFormValues,
  target: MaoTarget,
  source: OfferCeilingTargetSource
): OfferCeilingExactResult | null {
  const result = calculateMaxAllowableOffer(values, target);
  if (!result) return null;

  const requiredMonthlyRent = solveRequiredMonthlyRent(values, target);
  const requiredInterestRate = solveRequiredInterestRate(values, target);
  const currentMeets = meetsTarget(calculateAnalysis(values), target);
  const decisionThresholds = buildWhatNeedsToBeTrue(values, target);
  const money = (value: number) =>
    `${value < 0 ? "-" : ""}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
  const formatBreakpoint = (threshold: AnyDecisionThreshold): string | null => {
    if (
      threshold.status !== "change_required" ||
      !threshold.rechecked ||
      threshold.thresholdValue == null
    ) {
      return null;
    }
    if (threshold.id === "max_purchase_price") {
      return `Price ≤ ${money(threshold.thresholdValue)}`;
    }
    if (threshold.id === "required_monthly_rent") {
      return `Rent ≥ ${money(threshold.thresholdValue)}/mo`;
    }
    if (threshold.id === "max_interest_rate") {
      return `Rate ≤ ${threshold.thresholdValue.toFixed(2)}%`;
    }
    if (threshold.id === "max_rehab_budget") {
      return `Rehab ≤ ${money(threshold.thresholdValue)}`;
    }
    if (threshold.id === "max_total_recurring_expenses") {
      return `Recurring expenses ≤ ${money(threshold.thresholdValue)}/mo`;
    }
    if (threshold.id === "cash_needed_reduction") {
      return `Cash needed lower by ${money(threshold.requiredChange ?? 0)}`;
    }
    return null;
  };

  return {
    presentation: buildOfferCeilingPresentation({ values, result, source }),
    achieved: {
      netCashFlow: result.achieved.netCashFlow,
      cocReturn: result.achieved.cocReturn,
      capRate: result.achieved.capRate,
      dscr: result.achieved.dscr,
    },
    makePriceWork: {
      currentMeets,
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
    },
    decisionBreakpoints: (decisionThresholds?.rankedGaps ?? [])
      .map((gap) =>
        decisionThresholds?.thresholds.find(
          (threshold) => threshold.id === gap.id
        )
      )
      .filter(
        (threshold): threshold is AnyDecisionThreshold => Boolean(threshold)
      )
      .map(formatBreakpoint)
      .filter((label): label is string => Boolean(label)),
  };
}

/**
 * Server-only policy + calculation boundary.
 *
 * Exact access is granted only by a server-verified paid subscription or by
 * the one public demo fixture. Everyone else receives a coarse range and no
 * exact or inverse-solver fields.
 */
export function resolveOfferCeilingForAccess(input: {
  values: InvestmentFormValues;
  target: MaoTarget;
  source: OfferCeilingTargetSource;
  paidAccess: boolean;
}): OfferCeilingAccessPayload {
  const currentAnalysis = calculateAnalysis(input.values);
  const financingSafeTarget = normalizeMaoTargetForFinancing(input.target, {
    isCashPurchase: currentAnalysis.monthlyPayment <= 0,
  });
  if (!financingSafeTarget) {
    return { access: "preview", range: null };
  }
  const exactAllowed =
    input.paidAccess ||
    isExactSharedSampleRequest(input.values, financingSafeTarget);
  if (exactAllowed) {
    return {
      access: "exact",
      exact: exactResult(input.values, financingSafeTarget, input.source),
    };
  }

  return {
    access: "preview",
    range: buildOfferCeilingRangePreview(input.values, financingSafeTarget),
  };
}
