/**
 * Rebuild an offset-paginated Storage window from offset zero.
 *
 * Supabase Storage does not expose a stable cursor for `.list()`. Continuing
 * from a previously stored offset can permanently skip an object when an
 * earlier object is deleted between clicks. Re-reading the complete visible
 * window makes every Load more action authoritative for the collection as it
 * exists at that moment.
 */
export async function fetchStorageObjectWindow<T>(input: {
  pageSize: number;
  targetCount: number;
  fetchPage: (offset: number, limit: number) => Promise<ReadonlyArray<T>>;
  getKey: (row: T) => string;
  /** Number of full-window comparisons allowed before reporting a collection
   * that is changing too quickly to paginate safely. */
  maxVerificationPasses?: number;
}): Promise<{ rows: T[]; nextOffset: number; hasMore: boolean }> {
  const pageSize = Math.max(1, Math.floor(input.pageSize));
  const requestedCount = Math.max(pageSize, Math.floor(input.targetCount));
  const targetCount = Math.ceil(requestedCount / pageSize) * pageSize;
  const maxVerificationPasses = Math.max(
    1,
    Math.floor(input.maxVerificationPasses ?? 3),
  );

  const readWindow = async () => {
    const rows: T[] = [];
    let nextOffset = 0;
    let lastPageCount = 0;

    while (nextOffset < targetCount) {
      const page = Array.from(await input.fetchPage(nextOffset, pageSize));
      lastPageCount = page.length;
      rows.push(...page);
      nextOffset += page.length;
      if (page.length < pageSize) break;
    }

    return {
      rows,
      nextOffset,
      hasMore: lastPageCount === pageSize,
      fingerprint: JSON.stringify(rows.map(input.getKey)),
    };
  };

  // Offsets are safe only while the ordered collection is stable. Compare
  // complete consecutive reads; a delete/add/reorder during any paged pass
  // changes the fingerprint and forces another pass from zero. Returning the
  // later matching pass gives the caller a window known to have remained
  // unchanged across a full verification read.
  let previous = await readWindow();
  for (let attempt = 0; attempt < maxVerificationPasses; attempt += 1) {
    const current = await readWindow();
    if (
      current.nextOffset === previous.nextOffset &&
      current.hasMore === previous.hasMore &&
      current.fingerprint === previous.fingerprint
    ) {
      return {
        rows: current.rows,
        nextOffset: current.nextOffset,
        hasMore: current.hasMore,
      };
    }
    previous = current;
  }

  throw new Error("Storage object list changed during pagination verification.");
}

/** A Storage response may apply only to the owner and auth epoch that started
 * it. This closes the window where auth changes after fresh verification but
 * before a pending private list/download resolves. */
export function isCurrentStorageOwnerRead(input: {
  expectedOwnerId: string;
  currentOwnerId: string | null;
  startedAuthRevision: number;
  currentAuthRevision: number;
}): boolean {
  return (
    input.currentOwnerId === input.expectedOwnerId &&
    input.currentAuthRevision === input.startedAuthRevision
  );
}
