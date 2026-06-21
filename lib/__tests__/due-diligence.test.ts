import { describe, expect, it } from "vitest";
import {
  DEFAULT_DUE_DILIGENCE_ITEMS,
  MAX_DUE_DILIGENCE_ITEMS,
  defaultDueDiligenceItems,
  dueDiligenceProgress,
  makeDueDiligenceItemId,
  normalizeDueDiligenceItems,
  type DueDiligenceItem,
} from "@/lib/due-diligence";

describe("defaultDueDiligenceItems", () => {
  it("seeds the standard checklist, all undone", () => {
    const items = defaultDueDiligenceItems();
    expect(items).toHaveLength(DEFAULT_DUE_DILIGENCE_ITEMS.length);
    expect(items.every((i) => i.done === false)).toBe(true);
    expect(items[0]!.id).toBe("inspection");
  });
});

describe("normalizeDueDiligenceItems", () => {
  it("keeps valid items, coerces done, trims label", () => {
    const items = normalizeDueDiligenceItems([
      { id: "a", label: "  Inspect  ", done: 1 },
      { id: "b", label: "Title", done: false, note: "Acme Title" },
    ]);
    expect(items).toEqual([
      { id: "a", label: "Inspect", done: true },
      { id: "b", label: "Title", done: false, note: "Acme Title" },
    ]);
  });

  it("drops malformed entries + de-dupes by id", () => {
    const items = normalizeDueDiligenceItems([
      { id: "a", label: "One" },
      { id: "a", label: "Dup" },
      { id: "", label: "No id" },
      { id: "c" },
      "nope",
      null,
    ]);
    expect(items.map((i) => i.id)).toEqual(["a"]);
  });

  it("caps the number of items", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ id: `i${i}`, label: `L${i}` }));
    expect(normalizeDueDiligenceItems(many)).toHaveLength(MAX_DUE_DILIGENCE_ITEMS);
  });

  it("returns [] for non-arrays", () => {
    expect(normalizeDueDiligenceItems(null)).toEqual([]);
    expect(normalizeDueDiligenceItems("x")).toEqual([]);
  });
});

describe("dueDiligenceProgress", () => {
  it("computes done/total/pct", () => {
    const items: DueDiligenceItem[] = [
      { id: "a", label: "A", done: true },
      { id: "b", label: "B", done: true },
      { id: "c", label: "C", done: false },
      { id: "d", label: "D", done: false },
    ];
    expect(dueDiligenceProgress(items)).toEqual({ done: 2, total: 4, pct: 50 });
  });
  it("is 0% for an empty list", () => {
    expect(dueDiligenceProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

describe("makeDueDiligenceItemId", () => {
  it("slugifies the label", () => {
    expect(makeDueDiligenceItemId("Order survey!", [])).toBe("order-survey");
  });
  it("avoids collisions with a numeric suffix", () => {
    const existing: DueDiligenceItem[] = [{ id: "order-survey", label: "x", done: false }];
    expect(makeDueDiligenceItemId("Order survey", existing)).toBe("order-survey-2");
  });
  it("falls back to 'item' for label with no usable chars", () => {
    expect(makeDueDiligenceItemId("!!!", [])).toBe("item");
  });
});
