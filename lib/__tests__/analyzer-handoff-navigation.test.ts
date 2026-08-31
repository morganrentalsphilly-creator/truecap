import { describe, expect, it } from "vitest";
import {
  ANALYZER_HANDOFF_SESSION_KEY,
  consumeAnalyzerHandoff,
} from "@/lib/analyzer-handoff";
import {
  isUnmodifiedPrimaryHandoffClick,
  stageAnalyzerHandoffForClick,
  type AnalyzerHandoffClick,
} from "@/lib/analyzer-handoff-navigation";

type HandoffWindow = NonNullable<
  Parameters<typeof stageAnalyzerHandoffForClick>[3]
>;

const primaryClick: AnalyzerHandoffClick = {
  button: 0,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  defaultPrevented: false,
};

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  } satisfies Storage;
}

function handoffWindow(
  storage: Storage,
  top: Window | null = null,
): HandoffWindow {
  return {
    location: { origin: "https://usetruecap.com" },
    sessionStorage: storage,
    top,
  } as HandoffWindow;
}

describe("analyzer handoff navigation", () => {
  it("stages an unmodified same-tab primary click", () => {
    const storage = memoryStorage();
    const staged = stageAnalyzerHandoffForClick(
      "/?price=325000&address=123%20Main%20St&utm_source=tool#main",
      undefined,
      primaryClick,
      handoffWindow(storage),
    );

    expect(staged).toBe(true);
    expect(storage.getItem(ANALYZER_HANDOFF_SESSION_KEY)).toContain(
      "price=325000",
    );
    expect(storage.getItem(ANALYZER_HANDOFF_SESSION_KEY)).toContain(
      "address=123+Main+St",
    );
    expect(storage.getItem(ANALYZER_HANDOFF_SESSION_KEY)).not.toContain(
      "utm_source",
    );
    expect(consumeAnalyzerHandoff("?utm_source=tool", storage)).toEqual({
      purchasePrice: 325000,
      address: "123 Main St",
    });
    expect(storage.getItem(ANALYZER_HANDOFF_SESSION_KEY)).toBeNull();
  });

  it("does not stage modified, secondary, cancelled, or new-tab clicks", () => {
    expect(isUnmodifiedPrimaryHandoffClick(primaryClick)).toBe(true);
    const variants: Array<{
      click: AnalyzerHandoffClick;
      target?: string;
    }> = [
      { click: { ...primaryClick, button: 1 } },
      { click: { ...primaryClick, metaKey: true } },
      { click: { ...primaryClick, ctrlKey: true } },
      { click: { ...primaryClick, shiftKey: true } },
      { click: { ...primaryClick, altKey: true } },
      { click: { ...primaryClick, defaultPrevented: true } },
      { click: primaryClick, target: "_blank" },
      { click: primaryClick, target: "named-window" },
    ];

    for (const variant of variants) {
      const storage = memoryStorage();
      expect(
        stageAnalyzerHandoffForClick(
          "/?price=325000",
          variant.target,
          variant.click,
          handoffWindow(storage),
        ),
      ).toBe(false);
      expect(storage.getItem(ANALYZER_HANDOFF_SESSION_KEY)).toBeNull();
    }
  });

  it("uses accessible same-origin top storage for target=_top", () => {
    const frameStorage = memoryStorage();
    const topStorage = memoryStorage();
    const topWindow = handoffWindow(topStorage) as unknown as Window;

    expect(
      stageAnalyzerHandoffForClick(
        "/?rent=2450",
        "_top",
        primaryClick,
        handoffWindow(frameStorage, topWindow),
      ),
    ).toBe(true);
    expect(frameStorage.getItem(ANALYZER_HANDOFF_SESSION_KEY)).toBeNull();
    expect(topStorage.getItem(ANALYZER_HANDOFF_SESSION_KEY)).toContain(
      "rent=2450",
    );
  });

  it("fails privacy-first when a cross-origin top window is inaccessible", () => {
    const frameStorage = memoryStorage();
    const crossOriginTop = {
      get location() {
        throw new DOMException(
          "Blocked by same-origin policy",
          "SecurityError",
        );
      },
    } as unknown as Window;

    expect(
      stageAnalyzerHandoffForClick(
        "/?price=325000",
        "_top",
        primaryClick,
        handoffWindow(frameStorage, crossOriginTop),
      ),
    ).toBe(false);
    expect(frameStorage.getItem(ANALYZER_HANDOFF_SESSION_KEY)).toBeNull();
  });
});
