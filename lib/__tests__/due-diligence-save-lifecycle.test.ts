import { describe, expect, it, vi } from "vitest";
import type { DueDiligenceItem } from "../due-diligence";
import {
  coalesceDueDiligenceSave,
  dueDiligenceAddedItemReachedServer,
  reconcileRejectedDueDiligenceSave,
  runUnsatisfiedDueDiligenceRecoveries,
} from "../due-diligence-save-lifecycle";

const base: DueDiligenceItem[] = [
  { id: "inspection", label: "Inspection", done: false },
];

describe("due-diligence save lifecycle", () => {
  it("coalesces note blur followed by a same-render due-date change into the latest snapshot", () => {
    const restoreNote = vi.fn();
    const noteBlur = coalesceDueDiligenceSave(null, {
      items: [{ ...base[0]!, note: "Call Pat" }],
      recovery: restoreNote,
      failureHint: "Your note is still here — try again.",
    });
    const dueDateChange = coalesceDueDiligenceSave(noteBlur, {
      items: [
        { ...base[0]!, note: "Call Pat", dueDate: "2026-09-04" },
      ],
      failureHint: "Your last change was undone.",
    });

    expect(dueDateChange.items).toEqual([
      {
        ...base[0]!,
        note: "Call Pat",
        dueDate: "2026-09-04",
      },
    ]);
    expect(dueDateChange.recoveries.map((recovery) => recovery.run)).toEqual([
      restoreNote,
    ]);
  });

  it("keeps only the latest complete toggle snapshot while retaining ordered text recoveries", () => {
    const firstRecovery = vi.fn();
    const latestRecovery = vi.fn();
    const first = coalesceDueDiligenceSave(null, {
      items: [{ ...base[0]!, done: true }],
      recovery: firstRecovery,
      failureHint: "first",
    });
    const latest = coalesceDueDiligenceSave(first, {
      items: [{ ...base[0]!, done: false, note: "Latest" }],
      recovery: latestRecovery,
      failureHint: "latest",
    });

    expect(latest.items).toEqual([
      { ...base[0]!, done: false, note: "Latest" },
    ]);
    expect(latest.recoveries.map((recovery) => recovery.run)).toEqual([
      firstRecovery,
      latestRecovery,
    ]);
    expect(latest.failureHint).toBe("latest");
  });

  it("suppresses only the committed add recovery when another writer advances the durable snapshot after response loss", async () => {
    const requested: DueDiligenceItem[] = [
      ...base,
      { id: "roof-cert", label: "Roof cert", done: false },
    ];
    let durableItems = base;
    let rejectResponse!: (reason?: unknown) => void;
    const response = new Promise<never>((_resolve, reject) => {
      rejectResponse = reject;
    });
    const restoreLabel = vi.fn();
    const restoreUnrelatedNote = vi.fn();
    const recoveries = coalesceDueDiligenceSave(
      coalesceDueDiligenceSave(null, {
        items: requested,
        recovery: restoreLabel,
        recoverySatisfiedBy: (persistedItems) =>
          dueDiligenceAddedItemReachedServer(requested[1]!, persistedItems),
        failureHint: "restore add",
      }),
      {
        items: requested,
        recovery: restoreUnrelatedNote,
        failureHint: "restore note",
      },
    ).recoveries;

    const completion = response.catch(async () => {
      const reconciliation = await reconcileRejectedDueDiligenceSave({
        requestedItems: requested,
        readFresh: async () => ({
          items: durableItems,
          revision: "2026-08-30T12:00:00.000Z",
        }),
      });
      if (reconciliation.kind === "diverged") {
        runUnsatisfiedDueDiligenceRecoveries(
          recoveries,
          reconciliation.snapshot.items,
        );
      }
      return reconciliation;
    });

    // The database committed, but transport failed before the caller received
    // the successful action result. A concurrent writer then appends another
    // row, so the durable document contains our add but is not exactly equal.
    durableItems = [
      ...requested,
      { id: "survey", label: "Survey", done: false },
    ];
    rejectResponse(new Error("response lost after commit"));

    const reconciliation = await completion;
    expect(reconciliation).toEqual({
      kind: "diverged",
      snapshot: {
        items: durableItems,
        revision: "2026-08-30T12:00:00.000Z",
      },
    });
    expect(restoreLabel).not.toHaveBeenCalled();
    expect(restoreUnrelatedNote).toHaveBeenCalledOnce();
    expect(durableItems.filter((item) => item.label === "Roof cert")).toHaveLength(1);
  });
});
