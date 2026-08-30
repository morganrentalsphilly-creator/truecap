import {
  normalizeDueDiligenceItems,
  type DueDiligenceItem,
} from "@/lib/due-diligence";

export type DueDiligenceRecoverySatisfaction = (
  persistedItems: DueDiligenceItem[],
) => boolean;

export type DueDiligenceSaveRecovery = {
  run: () => void;
  /** Optional durable-intent check. A lost response can still follow a
   * committed write, so only this recovery is suppressed when its specific
   * intent is already present in a later server snapshot. */
  isSatisfiedBy?: DueDiligenceRecoverySatisfaction;
};

export type QueuedDueDiligenceSave = {
  /** The newest complete checklist snapshot wins when several controls fire
   * from one render (for example note blur followed by a date change). */
  items: DueDiligenceItem[];
  /** Every text-recovery hook still runs on a terminal failure. In practice
   * these restore an added label or the latest typed item note. */
  recoveries: DueDiligenceSaveRecovery[];
  failureHint: string;
};

export type DueDiligenceSaveSnapshot = {
  items: DueDiligenceItem[];
  revision: string | null;
};

export type RejectedDueDiligenceSaveReconciliation =
  | { kind: "committed"; snapshot: DueDiligenceSaveSnapshot }
  | { kind: "diverged"; snapshot: DueDiligenceSaveSnapshot }
  | { kind: "unavailable" };

/** Compare the complete normalized document that the write action accepts.
 * This intentionally remains order-sensitive: reordering checklist rows is a
 * real document change, not an equivalent set representation. */
export function dueDiligenceSaveReachedServer(
  requestedItems: DueDiligenceItem[],
  persistedItems: DueDiligenceItem[],
): boolean {
  return (
    JSON.stringify(normalizeDueDiligenceItems(requestedItems)) ===
    JSON.stringify(normalizeDueDiligenceItems(persistedItems))
  );
}

/** Match an add intent inside a potentially newer checklist document. Other
 * writers may have appended more rows after our response was lost, so whole-
 * document equality is deliberately not required for this recovery check. */
export function dueDiligenceAddedItemReachedServer(
  requestedItem: DueDiligenceItem,
  persistedItems: DueDiligenceItem[],
): boolean {
  const normalizedRequested = normalizeDueDiligenceItems([requestedItem])[0];
  if (!normalizedRequested) return false;
  return normalizeDueDiligenceItems(persistedItems).some(
    (item) =>
      item.id === normalizedRequested.id &&
      item.label === normalizedRequested.label,
  );
}

/** Run only recoveries whose individual intent is not already durable. */
export function runUnsatisfiedDueDiligenceRecoveries(
  recoveries: DueDiligenceSaveRecovery[],
  persistedItems?: DueDiligenceItem[],
): void {
  for (const recovery of recoveries) {
    let satisfied = false;
    if (persistedItems && recovery.isSatisfiedBy) {
      try {
        satisfied = recovery.isSatisfiedBy(persistedItems);
      } catch {
        // A recovery predicate is advisory. If it cannot prove the intent was
        // stored, preserve the user's input through the normal recovery path.
      }
    }
    if (!satisfied) recovery.run();
  }
}

/** A rejected Server Action response does not prove that its transaction
 * failed. Re-read durable state and distinguish a lost response after commit
 * from a genuine failure before running destructive rollback/recovery hooks. */
export async function reconcileRejectedDueDiligenceSave(input: {
  requestedItems: DueDiligenceItem[];
  readFresh: () => Promise<DueDiligenceSaveSnapshot | null>;
}): Promise<RejectedDueDiligenceSaveReconciliation> {
  try {
    const snapshot = await input.readFresh();
    if (!snapshot) return { kind: "unavailable" };
    return dueDiligenceSaveReachedServer(
      input.requestedItems,
      snapshot.items,
    )
      ? { kind: "committed", snapshot }
      : { kind: "diverged", snapshot };
  } catch {
    return { kind: "unavailable" };
  }
}

/** Coalesce another optimistic mutation behind the single in-flight write.
 * The complete newest snapshot replaces an older queued snapshot, while
 * recovery hooks stay ordered so later typed text is applied last. */
export function coalesceDueDiligenceSave(
  current: QueuedDueDiligenceSave | null,
  next: {
    items: DueDiligenceItem[];
    recovery?: () => void;
    recoverySatisfiedBy?: DueDiligenceRecoverySatisfaction;
    failureHint: string;
  },
): QueuedDueDiligenceSave {
  return {
    items: next.items,
    recoveries: [
      ...(current?.recoveries ?? []),
      ...(next.recovery
        ? [
            {
              run: next.recovery,
              ...(next.recoverySatisfiedBy
                ? { isSatisfiedBy: next.recoverySatisfiedBy }
                : {}),
            },
          ]
        : []),
    ],
    failureHint: next.failureHint,
  };
}
