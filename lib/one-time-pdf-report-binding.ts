import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  investmentFormSchema,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import {
  normalizeMaoTarget,
  normalizeMaoTargetForFinancing,
} from "@/lib/mao-target-editor";
import { buildMaoTarget } from "@/lib/mao-targets";
import {
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";

export type OneTimePdfReportBinding = {
  target: MaoTarget;
  source: OfferCeilingTargetSource;
  /** True only for pre-target drafts that omitted both binding fields. */
  legacyDefaulted: boolean;
};

const MAO_TARGET_FIELDS = [
  "capRate",
  "cocReturn",
  "monthlyCashFlow",
  "dscr",
  "maxPurchasePrice",
] as const satisfies ReadonlyArray<keyof MaoTarget>;

/** The exact target/source used by the deployed pre-binding Pack renderer. */
export function resolveLegacyOneTimePdfReportBinding(
  values: InvestmentFormValues
): OneTimePdfReportBinding | null {
  try {
    const isCashPurchase = calculateAnalysis(values).monthlyPayment <= 0;
    return {
      target: buildMaoTarget(null, { isCashPurchase }),
      source: "screening-defaults",
      legacyDefaulted: true,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve the target/source pair that is fingerprinted for a one-time report.
 *
 * New purchases must supply both fields. Claims created before report-target
 * binding shipped did not persist either field in their same-tab draft, so
 * recovery may opt into the exact canonical default that those historical PDFs
 * used: screening defaults, with DSCR omitted for an all-cash purchase.
 *
 * A partial or malformed pair never falls back. That keeps corrupted new
 * drafts and attacker-chosen inputs from being relabeled as a legacy purchase.
 */
export function resolveOneTimePdfReportBinding(
  input: {
    values: InvestmentFormValues;
    maxOfferTarget?: unknown;
    maxOfferTargetSource?: unknown;
  },
  options: { allowLegacyDefault: boolean }
): OneTimePdfReportBinding | null {
  try {
    const target = normalizeMaoTarget(input.maxOfferTarget);
    const source = normalizeOfferCeilingTargetSource(
      input.maxOfferTargetSource
    );

    if (target && source) {
      const isCashPurchase = calculateAnalysis(input.values).monthlyPayment <= 0;
      const financingSafeTarget = normalizeMaoTargetForFinancing(target, {
        isCashPurchase,
      });
      return financingSafeTarget
        ? { target: financingSafeTarget, source, legacyDefaulted: false }
        : null;
    }

    const omittedLegacyPair =
      input.maxOfferTarget === undefined &&
      input.maxOfferTargetSource === undefined;
    if (!options.allowLegacyDefault || !omittedLegacyPair) return null;
    return resolveLegacyOneTimePdfReportBinding(input.values);
  } catch {
    return null;
  }
}

/**
 * Resolve a submitted binding for a null-fingerprint database row. Such rows
 * predate target-aware checkout, so the only permitted first binding is the
 * historical default—not an arbitrary valid target chosen during recovery.
 */
export function resolveLegacyCompatibleOneTimePdfReportBinding(input: {
  values: InvestmentFormValues;
  maxOfferTarget?: unknown;
  maxOfferTargetSource?: unknown;
}): OneTimePdfReportBinding | null {
  const submitted = resolveOneTimePdfReportBinding(input, {
    allowLegacyDefault: true,
  });
  const historical = resolveLegacyOneTimePdfReportBinding(input.values);
  if (!submitted || !historical || submitted.source !== historical.source) {
    return null;
  }
  if (
    MAO_TARGET_FIELDS.some(
      (field) => submitted.target[field] !== historical.target[field]
    )
  ) {
    return null;
  }
  return historical;
}

export type OneTimePdfRestoredDraft = OneTimePdfReportBinding & {
  values: InvestmentFormValues;
};

/** Parse both current target-aware drafts and the production v2 legacy shape. */
export function parseOneTimePdfDraft(
  raw: string | null
): OneTimePdfRestoredDraft | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as Record<string, unknown>;
    const parsedValues = investmentFormSchema.safeParse(draft.values);
    if (!parsedValues.success) return null;

    const bindingInput = {
      values: parsedValues.data,
      maxOfferTarget: draft.maxOfferTarget,
      maxOfferTargetSource: draft.maxOfferTargetSource,
    };
    const binding =
      draft.v === 2
        ? resolveLegacyCompatibleOneTimePdfReportBinding(bindingInput)
        : draft.v === 4
          ? resolveOneTimePdfReportBinding(bindingInput, {
              allowLegacyDefault: false,
            })
          : null;
    return binding ? { values: parsedValues.data, ...binding } : null;
  } catch {
    return null;
  }
}
