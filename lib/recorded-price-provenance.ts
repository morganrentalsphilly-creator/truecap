/**
 * Was a published purchase price an automated ESTIMATE rather than an asking
 * price?
 *
 * A saved analysis records this two ways depending on when it was written:
 * directly on the result snapshot, or inside the input-confidence source
 * context. Both must be honoured, because a stale browser render can lose the
 * live flag while the saved provenance still carries the warning.
 *
 * Every published surface (opaque share viewer, agent client portal) has to
 * agree, or the same deal is labelled an estimate in one place and stated as
 * fact in another. Keeping the derivation here is what stops those two from
 * drifting apart.
 */
export function isRecordedPriceEstimated(
  resultSnapshot: Record<string, unknown> | null | undefined
): boolean {
  if (!resultSnapshot) return false;
  if (resultSnapshot.purchasePriceEstimated === true) return true;
  const inputConfidence =
    typeof resultSnapshot.inputConfidence === "object" &&
    resultSnapshot.inputConfidence !== null &&
    !Array.isArray(resultSnapshot.inputConfidence)
      ? (resultSnapshot.inputConfidence as Record<string, unknown>)
      : null;
  const sourceContext =
    inputConfidence &&
    typeof inputConfidence.sourceContext === "object" &&
    inputConfidence.sourceContext !== null &&
    !Array.isArray(inputConfidence.sourceContext)
      ? (inputConfidence.sourceContext as Record<string, unknown>)
      : null;
  const purchasePriceSource =
    sourceContext?.purchasePriceSource &&
    typeof sourceContext.purchasePriceSource === "object" &&
    !Array.isArray(sourceContext.purchasePriceSource)
      ? (sourceContext.purchasePriceSource as Record<string, unknown>)
      : null;
  return (
    sourceContext?.purchasePriceEstimated === true ||
    purchasePriceSource?.kind === "avm-estimate"
  );
}
