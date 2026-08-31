import { describe, expect, it } from "vitest";
import {
  getQueuedDealNotesSave,
  isCurrentDealNotesSave,
} from "../deal-notes-save-lifecycle";

describe("deal notes save lifecycle", () => {
  it("serializes a requested second blur with the revision returned by save one", () => {
    expect(
      getQueuedDealNotesSave({
        wasRequested: true,
        submittedNotes: "first draft",
        currentNotes: "second draft",
        returnedRevision: 12,
      }),
    ).toEqual({ notes: "second draft", expectedRevision: 12 });
  });

  it("does not write unblurred typing or re-save an unchanged draft", () => {
    expect(
      getQueuedDealNotesSave({
        wasRequested: false,
        submittedNotes: "first draft",
        currentNotes: "unblurred typing",
        returnedRevision: 12,
      }),
    ).toBeNull();
    expect(
      getQueuedDealNotesSave({
        wasRequested: true,
        submittedNotes: "same draft",
        currentNotes: "same draft",
        returnedRevision: 12,
      }),
    ).toBeNull();
  });

  it("rejects an A to B to A completion after its request token was invalidated", () => {
    const staleAToken = Symbol("stale-a");
    const newAToken = Symbol("new-a");

    expect(
      isCurrentDealNotesSave({
        submittedDealId: "deal-a",
        currentDealId: "deal-a",
        requestToken: staleAToken,
        currentRequestToken: null,
      }),
    ).toBe(false);
    expect(
      isCurrentDealNotesSave({
        submittedDealId: "deal-a",
        currentDealId: "deal-a",
        requestToken: staleAToken,
        currentRequestToken: newAToken,
      }),
    ).toBe(false);
    expect(
      isCurrentDealNotesSave({
        submittedDealId: "deal-a",
        currentDealId: "deal-a",
        requestToken: newAToken,
        currentRequestToken: newAToken,
      }),
    ).toBe(true);
  });

  it("rejects a completion after layout cleanup unmounts the notes panel", () => {
    const token = Symbol("unmounted-notes-save");
    expect(
      isCurrentDealNotesSave({
        submittedDealId: "deal-a",
        currentDealId: null,
        requestToken: token,
        currentRequestToken: null,
      }),
    ).toBe(false);
  });
});
