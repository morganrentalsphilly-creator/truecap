export const MAX_COMPARE_DEAL_SELECTION = 4;
export const MAX_BULK_DEAL_SELECTION = 100;

export type SavedDealSelectionRow = {
  id: string;
  status: string;
};

/**
 * Keep client selection aligned with the latest server-rendered list. A row
 * that disappeared or changed lifecycle state must not remain selected for a
 * later bulk action.
 */
export function reconcileSavedDealSelection(
  selectedIds: string[],
  previousRows: SavedDealSelectionRow[],
  nextRows: SavedDealSelectionRow[],
): string[] {
  const previousStatus = new Map(
    previousRows.map((row) => [row.id, row.status]),
  );
  const nextStatus = new Map(nextRows.map((row) => [row.id, row.status]));
  const seen = new Set<string>();

  return selectedIds
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      const next = nextStatus.get(id);
      if (!next) return false;
      const previous = previousStatus.get(id);
      return previous === undefined || previous === next;
    })
    .slice(0, MAX_BULK_DEAL_SELECTION);
}

export function addToBulkDealSelection(
  selectedIds: string[],
  candidateIds: string[],
): { selectedIds: string[]; limitReached: boolean } {
  const next = Array.from(new Set([...selectedIds, ...candidateIds]));
  return {
    selectedIds: next.slice(0, MAX_BULK_DEAL_SELECTION),
    limitReached: next.length > MAX_BULK_DEAL_SELECTION,
  };
}
