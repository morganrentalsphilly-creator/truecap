import { cleanDealLabel, type DealLabels } from "@/lib/deal-labels";

export type DealLabelKey = keyof DealLabels;

export function dealLabelPatchKeys(
  patch: Partial<DealLabels>,
): DealLabelKey[] {
  return Object.keys(patch) as DealLabelKey[];
}

/** Keep one pending entry per blurred field while preserving stable order. */
export function coalesceDealLabelSaveKeys(
  ...groups: ReadonlyArray<ReadonlyArray<DealLabelKey>>
): DealLabelKey[] {
  return [...new Set(groups.flat())];
}

/** Resolve queued fields at send/retry time so the newest controlled drafts win. */
export function buildLatestDealLabelPatch(
  keys: ReadonlyArray<DealLabelKey>,
  drafts: DealLabels,
): Partial<DealLabels> {
  const patch: Partial<DealLabels> = {};
  for (const key of keys) patch[key] = cleanDealLabel(drafts[key]);
  return patch;
}
