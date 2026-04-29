/**
 * In-memory handoff from dashboard top search → Saved Analyses list filter.
 * Not persisted; not in URL. Cleared after consume.
 *
 * React 18 Strict Mode runs effects twice in development; we replay the same
 * pending value once so the search is not lost on remount.
 */
let pendingSavedListSearch: string | null = null;
let replaySavedListSearch: string | null = null;

export function setPendingSavedListSearch(query: string): void {
  const trimmed = query.trim();
  replaySavedListSearch = null;
  if (!trimmed) {
    pendingSavedListSearch = null;
    return;
  }
  pendingSavedListSearch = trimmed;
}

export function consumePendingSavedListSearch(): string | null {
  if (pendingSavedListSearch !== null) {
    const value = pendingSavedListSearch;
    pendingSavedListSearch = null;
    replaySavedListSearch = value;
    queueMicrotask(() => {
      replaySavedListSearch = null;
    });
    return value;
  }
  if (replaySavedListSearch !== null) {
    const value = replaySavedListSearch;
    replaySavedListSearch = null;
    return value;
  }
  return null;
}
