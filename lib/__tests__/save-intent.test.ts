import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPendingSaveIntent,
  hasPendingSaveIntent,
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
    setPendingSaveIntent();
    expect(hasPendingSaveIntent()).toBe(true);
    expect(hasPendingSaveIntent()).toBe(true);
    clearPendingSaveIntent();
    expect(hasPendingSaveIntent()).toBe(false);
  });

  it("expires and clears an abandoned intent after 24 hours", () => {
    setPendingSaveIntent();
    expect(hasPendingSaveIntent(1_000_000 + 24 * 60 * 60 * 1000)).toBe(false);
    expect(store.size).toBe(0);
  });
});
