/**
 * A blank specialist dollar input is not the same assumption as an explicit
 * $0. Keep that distinction at the UI-to-engine boundary so BRRRR/flip results
 * cannot silently invent a zero-dollar rehab budget.
 */
export function resolveExplicitRehabBudget(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
