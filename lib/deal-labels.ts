export const DEAL_LABEL_MAX_LENGTH = 80;

export type DealLabels = {
  nickname: string | null;
  market: string | null;
  neighborhood: string | null;
};

export type DealLabelsPatchResult =
  | { ok: true; patch: Partial<DealLabels> }
  | { ok: false };

const LABEL_KEYS = ["nickname", "market", "neighborhood"] as const;
const LABEL_KEY_SET = new Set<string>(LABEL_KEYS);

export function cleanDealLabel(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim().slice(0, DEAL_LABEL_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Server actions are public runtime boundaries even when their TypeScript
 * caller is typed. Reject null, arrays, unknown keys, and non-string values so
 * a malformed request cannot throw at `"key" in input` or silently clear a
 * label by coercing an object/number to null.
 */
export function normalizeDealLabelsPatch(
  input: unknown,
): DealLabelsPatchResult {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false };
  }

  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => !LABEL_KEY_SET.has(key))) {
    return { ok: false };
  }

  const patch: Partial<DealLabels> = {};
  for (const key of LABEL_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    const value = record[key];
    if (value !== null && typeof value !== "string") {
      return { ok: false };
    }
    patch[key] = cleanDealLabel(value);
  }
  return { ok: true, patch };
}
