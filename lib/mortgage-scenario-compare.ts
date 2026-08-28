import {
  calculateAnalysis,
  type AnalysisResult,
} from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

export type MortgageScenarioKey =
  | "current"
  | "more-down"
  | "shorter"
  | "dscr-loan";

export interface MortgageScenarioComparison {
  key: MortgageScenarioKey;
  label: string;
  /** A complete, independent form snapshot used for this engine run. */
  values: InvestmentFormValues;
  /** Canonical output. Presentation must read metrics directly from here. */
  result: AnalysisResult;
  downPaymentPct: number;
  interestRatePct: number;
  loanTermYears: number;
  isBaseline: boolean;
}

/** Clone every form field. `units` is the only nested form structure today. */
export function cloneInvestmentFormValues(
  values: InvestmentFormValues,
): InvestmentFormValues {
  return {
    ...values,
    ...(values.units
      ? { units: values.units.map((unit) => ({ ...unit })) }
      : {}),
  };
}

function effectiveDownPaymentPct(
  values: InvestmentFormValues,
  result: AnalysisResult,
): number {
  if (!(values.purchasePrice > 0)) return 0;
  return Math.max(
    0,
    Math.min(100, (result.downPayment / values.purchasePrice) * 100),
  );
}

function runScenario(
  key: MortgageScenarioKey,
  label: string,
  values: InvestmentFormValues,
): MortgageScenarioComparison {
  const scenarioValues = cloneInvestmentFormValues(values);
  const result = calculateAnalysis(scenarioValues);
  return {
    key,
    label,
    values: scenarioValues,
    result,
    downPaymentPct: effectiveDownPaymentPct(scenarioValues, result),
    interestRatePct: scenarioValues.interestRate,
    loanTermYears: scenarioValues.loanTermYears,
    isBaseline: key === "current",
  };
}

/**
 * Run every financing scenario through the canonical engine. The baseline is
 * also rerun from an independent complete clone so it can be parity-checked
 * against the analyzer result rather than reconstructed from selected fields.
 */
export function buildMortgageScenarioComparisons(
  values: InvestmentFormValues,
): MortgageScenarioComparison[] {
  const baselineValues = cloneInvestmentFormValues(values);
  const baselineResult = calculateAnalysis(baselineValues);
  const baselineDownPct = effectiveDownPaymentPct(values, baselineResult);
  const scenarios: MortgageScenarioComparison[] = [
    {
      key: "current",
      label: "Current",
      values: baselineValues,
      result: baselineResult,
      downPaymentPct: baselineDownPct,
      interestRatePct: values.interestRate,
      loanTermYears: values.loanTermYears,
      isBaseline: true,
    },
  ];

  if (baselineDownPct < 95) {
    const downPaymentPct = Math.min(100, baselineDownPct + 5);
    const moreDownValues: InvestmentFormValues = {
      ...cloneInvestmentFormValues(values),
      // A percentage comparison must not leave a v2 fixed-dollar financing
      // discriminator in place, where changing downPaymentPct would be ignored.
      financingMode: "percent-down",
      fixedDownPaymentAmount: undefined,
      fixedLoanAmount: undefined,
      downPaymentPct,
    };
    scenarios.push(
      runScenario(
        "more-down",
        `${downPaymentPct.toFixed(0)}% down`,
        moreDownValues,
      ),
    );
  }

  scenarios.push(
    runScenario("shorter", "15-year term", {
      ...cloneInvestmentFormValues(values),
      loanTermYears: 15,
    }),
  );
  scenarios.push(
    runScenario("dscr-loan", "DSCR loan +1.5%", {
      ...cloneInvestmentFormValues(values),
      interestRate: Math.min(30, values.interestRate + 1.5),
    }),
  );

  return scenarios;
}
