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
 * both mean v1; an explicit 2.0 must fail closed at every external boundary.
 */
export function isReleasedUnderwritingModel(
  values: Pick<InvestmentFormValues, "underwritingModelVersion">
): boolean {
  return values.underwritingModelVersion !== "2.0";
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

function carriesInternalV2Marker(raw: unknown): boolean {
  return Boolean(
    raw &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      (raw as Record<string, unknown>).underwritingModelVersion === "2.0"
  );
}

/** Raw persisted/draft boundary. Check before normalization so even an
 * incomplete or otherwise invalid crafted v2 payload cannot shed its marker
 * and fall through a legacy-tolerance path. */
export function isReleasedUnderwritingSnapshot(raw: unknown): boolean {
  return !carriesInternalV2Marker(raw);
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
