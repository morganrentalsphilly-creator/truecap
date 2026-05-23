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

    return [
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
          { name: "Stress", deltaLabel: `+${(deltas.vacancy.stress * 100).toFixed(0)}pp`, result: vacancyScenario(values, deltas.vacancy.stress) },
          { name: "Base", deltaLabel: `${(Number(values.vacancyPct) || 0).toFixed(0)}%`, result: base },
          { name: "Upside", deltaLabel: `${(deltas.vacancy.upside * 100).toFixed(0)}pp`, result: vacancyScenario(values, deltas.vacancy.upside) },
        ],
      },
      {
        axis: "interestRate",
        label: "Interest Rate",
        scenarios: [
          { name: "Stress", deltaLabel: `+${(deltas.interestRate.stress * 100).toFixed(0)}pp`, result: rateScenario(values, deltas.interestRate.stress) },
          { name: "Base", deltaLabel: `${(Number(values.interestRate) || 0).toFixed(2)}%`, result: base },
          { name: "Upside", deltaLabel: `${(deltas.interestRate.upside * 100).toFixed(0)}pp`, result: rateScenario(values, deltas.interestRate.upside) },
        ],
      },
    ];
  } catch {
    return null;
  }
}
