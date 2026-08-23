/**
 * Validate the persisted cumulative analysis counter before publication.
 * The public UI never manufactures a display floor: the owner-approved
 * 51,900 cumulative total is persisted by the audited database migration and
 * every later analyzer run increments that same row.
 */
export function toPublicAnalysisRunCount(rawCount: number): number {
  if (!Number.isFinite(rawCount) || rawCount < 0) {
    throw new RangeError("Analysis run count must be a finite, non-negative number.");
  }
  return Math.floor(rawCount);
}
