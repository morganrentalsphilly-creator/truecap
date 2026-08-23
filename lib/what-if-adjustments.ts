import type { InvestmentFormValues } from "@/lib/investcalc-schema";

/**
 * The reproducible operating stress used by the analyzer and investment PDF.
 * Keeping the preset and its input transformation outside the client component
 * lets the server rebuild the exact same scenario without trusting figures
 * calculated in the browser.
 */
export const WORST_CASE_PRESET = {
  rentPct: -10,
  vacancyPp: 5,
  ratePp: 1,
} as const;

export function applyWhatIfAdjustments(
  values: InvestmentFormValues,
  rentPct: number,
  pricePct: number,
  ratePp = 0,
  vacancyPp = 0,
): InvestmentFormValues {
  const rentMul = 1 + rentPct / 100;
  const priceMul = 1 + pricePct / 100;
  const next: InvestmentFormValues = {
    ...values,
    purchasePrice:
      typeof values.purchasePrice === "number"
        ? Math.round(values.purchasePrice * priceMul)
        : values.purchasePrice,
    interestRate:
      ratePp !== 0 && typeof values.interestRate === "number"
        ? Math.min(
            30,
            Math.max(0, Math.round((values.interestRate + ratePp) * 100) / 100),
          )
        : values.interestRate,
    vacancyPct:
      vacancyPp !== 0 && typeof values.vacancyPct === "number"
        ? Math.min(
            50,
            Math.max(
              0,
              Math.round((values.vacancyPct + vacancyPp) * 100) / 100,
            ),
          )
        : values.vacancyPct,
  };

  if (next.propertyType === "single-family") {
    if (typeof next.monthlyRent === "number") {
      next.monthlyRent = Math.round(next.monthlyRent * rentMul);
    }
    if (typeof next.avgDailyRate === "number" && next.avgDailyRate > 0) {
      next.avgDailyRate = Math.round(next.avgDailyRate * rentMul * 100) / 100;
    }
  } else if (Array.isArray(next.units)) {
    next.units = next.units.map((unit) => ({
      ...unit,
      monthlyRent:
        typeof unit.monthlyRent === "number"
          ? Math.round(unit.monthlyRent * rentMul)
          : unit.monthlyRent,
    }));
  }

  return next;
}
