import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPendingSaveIntent,
  hasPendingSaveIntent,
  pendingSaveIntentMatchesDraft,
  setPendingSaveIntent,
} from "../save-intent";

const store = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
};

describe("pending save intent", () => {
  beforeEach(() => {
    store.clear();
    vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    vi.stubGlobal("window", { localStorage });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("survives reads until an actual save acknowledges it", () => {
    setPendingSaveIntent({ address: "1700 W Erie", purchasePrice: 200_000 });
    expect(hasPendingSaveIntent()).toBe(true);
    expect(hasPendingSaveIntent()).toBe(true);
    clearPendingSaveIntent();
    expect(hasPendingSaveIntent()).toBe(false);
  });

  it("expires and clears an abandoned intent after 24 hours", () => {
    setPendingSaveIntent({ address: "1700 W Erie" });
    expect(hasPendingSaveIntent(1_000_000 + 24 * 60 * 60 * 1000)).toBe(false);
    expect(store.size).toBe(0);
  });

  it("resumes only the exact draft that created the intent", () => {
    const intended = { address: "1700 W Erie", purchasePrice: 200_000 };
    expect(setPendingSaveIntent(intended)).toBe(true);
    expect(pendingSaveIntentMatchesDraft({ purchasePrice: 200_000, address: "1700 W Erie" })).toBe(true);
    expect(pendingSaveIntentMatchesDraft({ ...intended, purchasePrice: 210_000 })).toBe(false);
    expect(hasPendingSaveIntent()).toBe(false);
  });

  it("fails closed for a legacy or malformed unbound intent", () => {
    store.set("truecap_pending_save_intent_v2", "1000000");
    expect(hasPendingSaveIntent()).toBe(false);
    expect(store.size).toBe(0);
  });
});
