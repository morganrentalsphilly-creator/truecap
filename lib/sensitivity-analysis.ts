/**
 * Sensitivity analysis.
 *
 * For three axes investors most care about (rent, vacancy, interest rate),
 * compute the analysis at a downside, base, and upside scenario.
 * Reuses calculateAnalysis untouched — we only mutate one input per
 * scenario, leaving everything else identical to what the user entered.
 *
 * The grid shows how cash flow, cap rate, CoC, and DSCR shift, so the
 * user can see whether the deal still works if rent comes in lower,
 * vacancy spikes, or rates rise before they close.
 */

import { calculateAnalysis, AnalysisResult } from "@/lib/calc-analysis";
import { InvestmentFormValues } from "@/lib/investcalc-schema";

export type SensitivityAxis = "rent" | "vacancy" | "interestRate";

export type SensitivityRow = {
  axis: SensitivityAxis;
  label: string;
  /** Three scenarios: a stress (worse), the base (entered), and an upside (better). */
  scenarios: {
    name: "Stress" | "Base" | "Upside";
    deltaLabel: string; // e.g. "-10%", "Entered", "+10%"
    result: AnalysisResult;
  }[];
};

export type SensitivityReport = SensitivityRow[];

type Deltas = {
  rent: { stress: number; upside: number };       // pct of monthly rent, signed
  vacancy: { stress: number; upside: number };    // absolute percentage points to add
  interestRate: { stress: number; upside: number }; // absolute pct points
};

const DEFAULT_DELTAS: Deltas = {
  rent: { stress: -0.1, upside: 0.1 },           // ±10 %
  vacancy: { stress: 0.05, upside: -0.05 },      // +5pp worse / -5pp better
  interestRate: { stress: 0.01, upside: -0.01 }, // +1pp worse / -1pp better
};

function safeMonthlyRent(values: InvestmentFormValues): number {
  const v = Number(values.monthlyRent);
  if (Number.isFinite(v) && v > 0) return v;
  // Multi-family fallback: sum the units.
  const units = values.units ?? [];
  return units.reduce(
    (sum, u) => sum + (Number(u?.monthlyRent) || 0),
    0
  );
}

function rentScenario(values: InvestmentFormValues, pctDelta: number): AnalysisResult {
  // STR deals derive income from avgDailyRate × occupancy and IGNORE
  // monthlyRent, so for them the rent axis must scale the nightly rate — else
  // the −10%/Base/+10% Rent columns come back identical (a false "insensitive").
  const adr = Number(values.avgDailyRate);
  if (Number.isFinite(adr) && adr > 0) {
    return calculateAnalysis({
      ...values,
      avgDailyRate: Math.round(adr * (1 + pctDelta) * 100) / 100,
    } as InvestmentFormValues);
  }
  const baseRent = safeMonthlyRent(values);
  const newTopLevelRent = baseRent * (1 + pctDelta);
  // Mutate units proportionally so the calc reflects the new rent.
  const units = (values.units ?? []).map((u) => ({
    ...u,
    monthlyRent: u?.monthlyRent != null ? Math.round(Number(u.monthlyRent) * (1 + pctDelta)) : u?.monthlyRent,
  }));
  return calculateAnalysis({
    ...values,
    monthlyRent: Math.round(newTopLevelRent),
    units,
  } as InvestmentFormValues);
}

function vacancyScenario(values: InvestmentFormValues, pointsDelta: number): AnalysisResult {
  const base = Number(values.vacancyPct) || 0;
  const next = Math.max(0, Math.min(100, base + pointsDelta * 100));
  return calculateAnalysis({ ...values, vacancyPct: next } as InvestmentFormValues);
}

function rateScenario(values: InvestmentFormValues, pointsDelta: number): AnalysisResult {
  const base = Number(values.interestRate) || 0;
  const next = Math.max(0, base + pointsDelta * 100);
  return calculateAnalysis({ ...values, interestRate: next } as InvestmentFormValues);
}

export function buildSensitivityReport(
  values: InvestmentFormValues,
  deltas: Deltas = DEFAULT_DELTAS
): SensitivityReport | null {
  try {
    const base = calculateAnalysis(values);

    const rentBase = safeMonthlyRent(values);
    const rentDeltaPct = (pct: number) => `${pct > 0 ? "+" : ""}${(pct * 100).toFixed(0)}%`;

    // The vacancy/rate scenarios clamp at their floors (0%), so the label must
    // state the delta that was ACTUALLY applied — a 3%-vacancy deal's Upside
    // rerun happens at 0% (-3pp), and labeling it "-5pp" misstates the
    // perturbation behind the numbers.
    const ppLabel = (pp: number) => {
      // Two decimals of precision (rates carry hundredths), trimmed to the
      // shortest exact form. Math.round on the scaled magnitude keeps halves
      // away from zero for negatives too (-0.25 must not display as -0.2).
      const rounded = (Math.sign(pp) * Math.round(Math.abs(pp) * 100)) / 100;
      const text = Number.isInteger(rounded)
        ? rounded.toFixed(0)
        : Math.round(rounded * 10) / 10 === rounded
          ? rounded.toFixed(1)
          : rounded.toFixed(2);
      return `${rounded > 0 ? "+" : ""}${text}pp`;
    };
    const vacancyAppliedPp = (pointsDelta: number) => {
      const baseVacancy = Number(values.vacancyPct) || 0;
      return Math.max(0, Math.min(100, baseVacancy + pointsDelta * 100)) - baseVacancy;
    };
    const rateAppliedPp = (pointsDelta: number) => {
      const baseRate = Number(values.interestRate) || 0;
      return Math.max(0, baseRate + pointsDelta * 100) - baseRate;
    };

    // Cash purchases have no loan, so the interest-rate axis would show
    // identical numbers across Stress/Base/Upside — confusing noise. Skip
    // the row entirely for cash deals.
    const isCashPurchase = Number(values.downPaymentPct) >= 100;

    const rows: SensitivityReport = [
      {
        axis: "rent",
        label: "Rent",
        scenarios: [
          { name: "Stress", deltaLabel: rentDeltaPct(deltas.rent.stress), result: rentScenario(values, deltas.rent.stress) },
          { name: "Base", deltaLabel: rentBase > 0 ? `$${Math.round(rentBase).toLocaleString()}/mo` : "Entered", result: base },
          { name: "Upside", deltaLabel: rentDeltaPct(deltas.rent.upside), result: rentScenario(values, deltas.rent.upside) },
        ],
      },
      {
        axis: "vacancy",
        label: "Vacancy",
        scenarios: [
          { name: "Stress", deltaLabel: ppLabel(vacancyAppliedPp(deltas.vacancy.stress)), result: vacancyScenario(values, deltas.vacancy.stress) },
          { name: "Base", deltaLabel: `${(Number(values.vacancyPct) || 0).toFixed(0)}%`, result: base },
          { name: "Upside", deltaLabel: ppLabel(vacancyAppliedPp(deltas.vacancy.upside)), result: vacancyScenario(values, deltas.vacancy.upside) },
        ],
      },
    ];

    if (!isCashPurchase) {
      rows.push({
        axis: "interestRate",
        label: "Interest Rate",
        scenarios: [
          { name: "Stress", deltaLabel: ppLabel(rateAppliedPp(deltas.interestRate.stress)), result: rateScenario(values, deltas.interestRate.stress) },
          { name: "Base", deltaLabel: `${(Number(values.interestRate) || 0).toFixed(2)}%`, result: base },
          { name: "Upside", deltaLabel: ppLabel(rateAppliedPp(deltas.interestRate.upside)), result: rateScenario(values, deltas.interestRate.upside) },
        ],
      });
    }

    return rows;
  } catch {
    return null;
  }
}
