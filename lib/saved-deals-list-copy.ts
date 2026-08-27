export type SavedDealsListScope = "active" | "completed" | "archived" | "all";

function dealNoun(count: number): string {
  return count === 1 ? "deal" : "deals";
}

/**
 * Describe the rows in the current server scope, then separately report any
 * client-side filtering. The current scope may represent one lifecycle state
 * or one Agent Pro client, so it must not be called the full portfolio.
 */
export function savedDealsListCountLabel({
  visibleCount,
  scopedCount,
  scope,
  clientName,
}: {
  visibleCount: number;
  scopedCount: number;
  scope: SavedDealsListScope;
  clientName?: string | null;
}): string {
  const normalizedClientName = clientName?.trim();
  const scopedLabel = normalizedClientName
    ? `${scopedCount} ${dealNoun(scopedCount)} assigned to ${normalizedClientName}`
    : scope === "all"
      ? `${scopedCount} ${dealNoun(scopedCount)} across all stages`
      : `${scopedCount} ${scope} ${dealNoun(scopedCount)}`;

  return visibleCount === scopedCount
    ? scopedLabel
    : `${visibleCount} shown · ${scopedLabel}`;
}
