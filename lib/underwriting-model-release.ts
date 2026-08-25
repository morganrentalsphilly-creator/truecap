import {
  investmentFormSchema,
  normalizeInvestmentFormDraft,
  normalizeInvestmentFormSnapshot,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";

/**
 * Only the frozen v1 contract is released to customer-facing workflows.
 *
 * The v2 calculation core is intentionally available to deterministic tests
 * and internal development, but it is not yet wired through every saved,
 * shared, report, and historical-snapshot surface. Missing and explicit 1.0
 * both mean v1; every other explicit version must fail closed at each external
 * boundary.
 */
export function isReleasedUnderwritingModel(
  values: { underwritingModelVersion?: unknown }
): boolean {
  return (
    values.underwritingModelVersion === undefined ||
    values.underwritingModelVersion === "1.0"
  );
}

/** Customer-facing parser. Keep the broader investmentFormSchema for internal
 * v2 golden tests and reviewed engine development only. */
export const releasedInvestmentFormSchema = investmentFormSchema.refine(
  isReleasedUnderwritingModel,
  {
    path: ["underwritingModelVersion"],
    message: "This underwriting model is not available yet",
  }
);

/** Raw persisted/draft boundary. Check before normalization so even an
 * incomplete or otherwise invalid crafted non-v1 payload cannot shed its
 * marker and fall through a legacy-tolerance path. Missing and explicit 1.0
 * are the complete released whitelist; every other explicit value fails
 * closed, including future versions unknown to today's schema. */
export function isReleasedUnderwritingSnapshot(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return true;
  return isReleasedUnderwritingModel(raw as Record<string, unknown>);
}

/** Released equivalent of the resilient saved-row normalizer. */
export function normalizeReleasedInvestmentFormSnapshot(
  raw: unknown
): InvestmentFormValues | null {
  if (!isReleasedUnderwritingSnapshot(raw)) return null;
  const values = normalizeInvestmentFormSnapshot(raw);
  return values && isReleasedUnderwritingModel(values) ? values : null;
}

/** Released equivalent of the lenient anonymous/reopen-draft normalizer. */
export function normalizeReleasedInvestmentFormDraft(
  raw: unknown
): InvestmentFormValues | null {
  if (!isReleasedUnderwritingSnapshot(raw)) return null;
  const values = normalizeInvestmentFormDraft(raw);
  return values && isReleasedUnderwritingModel(values) ? values : null;
}
