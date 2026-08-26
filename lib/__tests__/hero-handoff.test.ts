import { describe, expect, it, vi } from "vitest";
import {
  dispatchHeroAnalyzeWithFallback,
  HERO_ANALYZE_STORAGE_KEY,
  type HeroAnalyzeDetail,
} from "@/lib/hero-handoff";

const detail: HeroAnalyzeDetail = {
  token: "sample-token",
  address: "1700 W Erie Ave, Philadelphia, PA 19140",
  state: "PA",
  sample: true,
};

describe("hero analysis handoff", () => {
  it("keeps delayed live delivery available when sessionStorage throws", () => {
    const dispatch = vi.fn();
    const scheduled = new Map<number, () => void>();
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("Storage is blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("Storage is blocked");
      }),
    };

    dispatchHeroAnalyzeWithFallback(detail, {
      storage,
      dispatch,
      schedule: (callback, delayMs) => scheduled.set(delayMs, callback),
    });

    expect(storage.setItem).toHaveBeenCalledWith(
      HERO_ANALYZE_STORAGE_KEY,
      JSON.stringify(detail)
    );
    expect(dispatch).toHaveBeenCalledTimes(1);

    scheduled.get(250)?.();
    expect(dispatch).toHaveBeenCalledTimes(2);

    scheduled.get(1_000)?.();
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenLastCalledWith(detail);
  });

  it("stops replaying after the stored handoff has been consumed", () => {
    const dispatch = vi.fn();
    const scheduled = new Map<number, () => void>();
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    dispatchHeroAnalyzeWithFallback(detail, {
      storage,
      dispatch,
      schedule: (callback, delayMs) => scheduled.set(delayMs, callback),
    });

    values.delete(HERO_ANALYZE_STORAGE_KEY);
    scheduled.get(250)?.();
    scheduled.get(1_000)?.();

    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
