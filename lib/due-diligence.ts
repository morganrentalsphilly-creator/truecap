/**
 * Due-diligence checklist — the standard set of verification tasks an
 * investor works through between offer and close, tracked per saved deal.
 * Pure module (no IO, client-safe). The server action persists `items`;
 * this owns the default checklist, the item shape, tolerant parsing, and
 * the progress calc.
 */

export type DueDiligenceItem = {
  id: string;
  label: string;
  done: boolean;
  /** Optional free-text note for the item (e.g. inspector name, date). */
  note?: string;
};

/** The default checklist seeded for a deal that has none yet. */
export const DEFAULT_DUE_DILIGENCE_ITEMS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "inspection", label: "Schedule + review home inspection" },
  { id: "appraisal", label: "Order appraisal" },
  { id: "title", label: "Title search + title insurance" },
  { id: "insurance", label: "Get a property insurance quote" },
  { id: "financing", label: "Lock financing / rate" },
  { id: "leases", label: "Review existing leases + estoppels" },
  { id: "rent-roll", label: "Verify rent roll + security deposits" },
  { id: "expenses", label: "Verify taxes, utilities + HOA costs" },
  { id: "survey", label: "Survey / boundary check" },
  { id: "walkthrough", label: "Final walkthrough" },
];

export const MAX_DUE_DILIGENCE_ITEMS = 50;
export const MAX_DUE_DILIGENCE_LABEL = 120;

export function defaultDueDiligenceItems(): DueDiligenceItem[] {
  return DEFAULT_DUE_DILIGENCE_ITEMS.map((i) => ({ id: i.id, label: i.label, done: false }));
}

/** Tolerant parse of a stored/sent items array. Drops malformed entries,
 *  de-dupes by id, caps count + label length. */
export function normalizeDueDiligenceItems(raw: unknown): DueDiligenceItem[] {
  if (!Array.isArray(raw)) return [];
  const out: DueDiligenceItem[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const label = typeof o.label === "string" ? o.label.trim().slice(0, MAX_DUE_DILIGENCE_LABEL) : "";
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    const note = typeof o.note === "string" ? o.note.trim().slice(0, 500) : undefined;
    out.push({ id, label, done: Boolean(o.done), ...(note ? { note } : {}) });
    if (out.length >= MAX_DUE_DILIGENCE_ITEMS) break;
  }
  return out;
}

export function dueDiligenceProgress(items: DueDiligenceItem[]): {
  done: number;
  total: number;
  pct: number;
} {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** A url/id-safe slug for a custom item id, with a uniqueness suffix when
 *  it would collide with an existing id. */
export function makeDueDiligenceItemId(label: string, existing: DueDiligenceItem[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "item";
  const ids = new Set(existing.map((i) => i.id));
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
