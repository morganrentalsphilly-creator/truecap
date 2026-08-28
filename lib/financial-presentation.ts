export const NO_DEBT_SERVICE_DSCR_LABEL = "N/A — no debt service" as const;

export const STEADY_STATE_RENOVATION_LABEL =
  "Steady-state analysis after stabilization; renovation downtime and lease-up are excluded." as const;

export const SIMPLIFIED_RENOVATION_DOWNTIME_LABEL =
  "Simplified downtime model only: scheduled rent is reduced for the entered months. Draw/funding timing, placed-in-service and lease-up timing, repair-versus-capital classification, basis and tax treatment, and financed improvements are excluded." as const;

/** Canonical DSCR presentation. The engine's cash sentinel remains numeric 0;
 * presentation determines applicability from the debt-service fact. */
export function formatDscr(
  dscr: number | null | undefined,
  hasDebtService: boolean,
  digits = 2,
): string {
  if (!hasDebtService) return NO_DEBT_SERVICE_DSCR_LABEL;
  return typeof dscr === "number" && Number.isFinite(dscr)
    ? dscr.toFixed(digits)
    : "N/A";
}
