import { describe, expect, it } from "vitest";
import {
  DEFAULT_DUE_DILIGENCE_ITEMS,
  MAX_DUE_DILIGENCE_ITEMS,
  defaultDueDiligenceItems,
  dueDiligenceDueSummary,
  dueDiligenceItemStatus,
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

  it("keeps a valid dueDate and drops a malformed one", () => {
    const items = normalizeDueDiligenceItems([
      { id: "a", label: "A", done: false, dueDate: "2026-07-15" },
      { id: "b", label: "B", done: false, dueDate: "07/15/2026" },
      { id: "c", label: "C", done: false, dueDate: "2026-13-40" },
    ]);
    expect(items[0]).toEqual({ id: "a", label: "A", done: false, dueDate: "2026-07-15" });
    expect(items[1]!.dueDate).toBeUndefined();
    expect(items[2]!.dueDate).toBeUndefined();
  });
});

describe("dueDiligenceItemStatus", () => {
  const today = "2026-06-22";
  it("flags an open item past its due date as overdue", () => {
    expect(dueDiligenceItemStatus({ id: "a", label: "A", done: false, dueDate: "2026-06-20" }, today)).toBe("overdue");
  });
  it("flags an open item within 7 days as due-soon", () => {
    expect(dueDiligenceItemStatus({ id: "a", label: "A", done: false, dueDate: "2026-06-26" }, today)).toBe("due-soon");
    expect(dueDiligenceItemStatus({ id: "a", label: "A", done: false, dueDate: "2026-06-22" }, today)).toBe("due-soon");
  });
  it("flags a far-out open item as scheduled", () => {
    expect(dueDiligenceItemStatus({ id: "a", label: "A", done: false, dueDate: "2026-08-01" }, today)).toBe("scheduled");
  });
  it("returns null for done items or items without a date", () => {
    expect(dueDiligenceItemStatus({ id: "a", label: "A", done: true, dueDate: "2026-06-20" }, today)).toBeNull();
    expect(dueDiligenceItemStatus({ id: "a", label: "A", done: false }, today)).toBeNull();
  });
});

describe("dueDiligenceDueSummary", () => {
  it("counts overdue and due-soon open items only", () => {
    const items: DueDiligenceItem[] = [
      { id: "a", label: "A", done: false, dueDate: "2026-06-19" }, // overdue
      { id: "b", label: "B", done: false, dueDate: "2026-06-24" }, // due-soon
      { id: "c", label: "C", done: false, dueDate: "2026-09-01" }, // scheduled
      { id: "d", label: "D", done: true, dueDate: "2026-06-01" }, // done — ignored
      { id: "e", label: "E", done: false }, // no date — ignored
    ];
    expect(dueDiligenceDueSummary(items, "2026-06-22")).toEqual({ overdue: 1, dueSoon: 1 });
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
