/**
 * Assumption impact — a tornado/sensitivity readout that ranks which inputs
 * most move the deal. For each key assumption we perturb it by a sensible
 * amount (rent ±5%, rate ±0.5pp, …), re-run calculateAnalysis, and measure the
 * resulting swing in monthly cash flow and DSCR. Reuses calc-analysis untouched
 * so the numbers match the rest of the app.
 *
 * Cheap: ~8 drivers × 2 calcs ≈ 16 calculateAnalysis runs; memoize on the
 * consumer side.
 */
import { calculateAnalysis, AnalysisResult } from "@/lib/calc-analysis";
import { InvestmentFormValues } from "@/lib/investcalc-schema";

export type ImpactDriver = {
  key: string;
  label: string;
  /** The +/- perturbation applied, for display (e.g. "±5%", "±0.5pp"). */
  deltaLabel: string;
  /** Monthly cash-flow swing magnitude ($) across the +/- perturbation. */
  cashFlowSwing: number;
  /** DSCR swing magnitude across the perturbation (0 for cash purchases). */
  dscrSwing: number;
};

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const clamp0 = (n: number) => Math.max(0, n);

/** Scale rent uniformly — works for single-family (monthlyRent) and
 *  multi-family (each unit's monthlyRent). */
function scaleRent(values: InvestmentFormValues, factor: number): InvestmentFormValues {
  if (values.propertyType === "single-family") {
    return { ...values, monthlyRent: num(values.monthlyRent) * factor };
  }
  const units = (values.units ?? []).map((u) => ({
    ...u,
    monthlyRent: num(u?.monthlyRent) * factor,
  }));
  return { ...values, units } as InvestmentFormValues;
}

type Driver = {
  key: string;
  label: string;
  deltaLabel: string;
  plus: (v: InvestmentFormValues) => InvestmentFormValues;
  minus: (v: InvestmentFormValues) => InvestmentFormValues;
};

const DRIVERS: Driver[] = [
  { key: "rent", label: "Rent", deltaLabel: "±5%", plus: (v) => scaleRent(v, 1.05), minus: (v) => scaleRent(v, 0.95) },
  { key: "interestRate", label: "Interest rate", deltaLabel: "±0.5pp", plus: (v) => ({ ...v, interestRate: num(v.interestRate) + 0.5 }), minus: (v) => ({ ...v, interestRate: clamp0(num(v.interestRate) - 0.5) }) },
  { key: "purchasePrice", label: "Purchase price", deltaLabel: "±5%", plus: (v) => ({ ...v, purchasePrice: num(v.purchasePrice) * 1.05 }), minus: (v) => ({ ...v, purchasePrice: num(v.purchasePrice) * 0.95 }) },
  { key: "vacancyPct", label: "Vacancy", deltaLabel: "±2pp", plus: (v) => ({ ...v, vacancyPct: num(v.vacancyPct) + 2 }), minus: (v) => ({ ...v, vacancyPct: clamp0(num(v.vacancyPct) - 2) }) },
  { key: "mgmtPct", label: "Management", deltaLabel: "±2pp", plus: (v) => ({ ...v, mgmtPct: num(v.mgmtPct) + 2 }), minus: (v) => ({ ...v, mgmtPct: clamp0(num(v.mgmtPct) - 2) }) },
  { key: "maintenancePct", label: "Maintenance", deltaLabel: "±2pp", plus: (v) => ({ ...v, maintenancePct: num(v.maintenancePct) + 2 }), minus: (v) => ({ ...v, maintenancePct: clamp0(num(v.maintenancePct) - 2) }) },
  { key: "capexPct", label: "CapEx", deltaLabel: "±2pp", plus: (v) => ({ ...v, capexPct: num(v.capexPct) + 2 }), minus: (v) => ({ ...v, capexPct: clamp0(num(v.capexPct) - 2) }) },
  { key: "propertyTaxPct", label: "Property tax", deltaLabel: "±0.25pp", plus: (v) => ({ ...v, propertyTaxPct: num(v.propertyTaxPct) + 0.25 }), minus: (v) => ({ ...v, propertyTaxPct: clamp0(num(v.propertyTaxPct) - 0.25) }) },
];

/**
 * Ranked impact of each assumption on the deal, highest cash-flow swing first.
 * Drivers whose move has no measurable effect (e.g. a field that doesn't apply
 * to this property type) are dropped.
 */
export function computeAssumptionImpact(values: InvestmentFormValues): ImpactDriver[] {
  const safe = (v: InvestmentFormValues): AnalysisResult | null => {
    try {
      return calculateAnalysis(v);
    } catch {
      return null;
    }
  };

  const out: ImpactDriver[] = [];
  for (const d of DRIVERS) {
    const plus = safe(d.plus(values));
    const minus = safe(d.minus(values));
    if (!plus || !minus) continue;
    const cashFlowSwing = Math.abs(plus.netCashFlow - minus.netCashFlow);
    const dscrSwing = Math.abs((plus.dscr ?? 0) - (minus.dscr ?? 0));
    if (cashFlowSwing < 0.5 && dscrSwing < 0.001) continue; // negligible / N/A
    out.push({ key: d.key, label: d.label, deltaLabel: d.deltaLabel, cashFlowSwing, dscrSwing });
  }
  return out.sort((a, b) => b.cashFlowSwing - a.cashFlowSwing);
}
