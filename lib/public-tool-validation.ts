export type ToolNumberValidation =
  | { ok: true; value: number; error: null }
  | { ok: false; value: null; error: string };

export type ToolNumberBounds = {
  label: string;
  min?: number;
  max?: number;
  minExclusive?: boolean;
};

/**
 * Parse a live public-calculator input without relying on native form
 * submission. These widgets recalculate on every keystroke, so `min`/`max`
 * attributes alone do not stop an out-of-range value from reaching the math.
 */
export function validateToolNumber(
  raw: string,
  { label, min, max, minExclusive = false }: ToolNumberBounds
): ToolNumberValidation {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: false, value: null, error: `Enter ${label.toLowerCase()}.` };
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, value: null, error: `Enter a valid ${label.toLowerCase()}.` };
  }

  if (min != null && (minExclusive ? value <= min : value < min)) {
    return {
      ok: false,
      value: null,
      error: minExclusive
        ? `${label} must be greater than ${formatBound(min)}.`
        : `${label} must be at least ${formatBound(min)}.`,
    };
  }

  if (max != null && value > max) {
    return {
      ok: false,
      value: null,
      error: `${label} must be ${formatBound(max)} or less.`,
    };
  }

  return { ok: true, value, error: null };
}

export function allToolNumbersValid(
  values: readonly ToolNumberValidation[]
): values is Array<Extract<ToolNumberValidation, { ok: true }>> {
  return values.every((value) => value.ok);
}

function formatBound(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString("en-US") : String(value);
}
