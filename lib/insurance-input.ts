/**
 * Insurance is typed as an ANNUAL dollar amount and stored as a MONTHLY one.
 *
 * Property tax toggles "Annual % / Annual $" and insurance used to toggle
 * "Annual % / Monthly $", so two neighbouring fields asked for different
 * periods (2026-11 audit B6). The input now asks for the annual premium, the
 * figure a quote or a declarations page states, and converts at the input
 * boundary. The stored model is unchanged: `insuranceMonthly` is still what
 * the form, saved deals, templates and lib/calc-analysis.ts read.
 */

/** The annual premium to show for a stored monthly amount (cents). */
export function insuranceAnnualFromMonthly(
  monthly: number | null | undefined,
): number | null {
  if (typeof monthly !== "number" || !Number.isFinite(monthly)) return null;
  return Math.round(monthly * 12 * 100) / 100;
}

/**
 * The monthly amount to store for a typed annual premium. Not rounded: the
 * engine multiplies it back by twelve, and a rounded third of a cent would
 * turn a typed $2,000 into $1,999.92 on the next open.
 */
export function insuranceMonthlyFromAnnual(
  annual: number | null | undefined,
): number | null {
  if (typeof annual !== "number" || !Number.isFinite(annual)) return null;
  return annual / 12;
}
