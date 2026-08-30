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
  /** Optional due date (YYYY-MM-DD). DD is deadline-driven — inspection and
   *  financing contingencies expire — so an item can carry a deadline.
   *  Absent = no deadline. */
  dueDate?: string;
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
    const dueDate =
      typeof o.dueDate === "string" && parseISODate(o.dueDate) != null ? o.dueDate.trim() : undefined;
    out.push({
      id,
      label,
      done: Boolean(o.done),
      ...(note ? { note } : {}),
      ...(dueDate ? { dueDate } : {}),
    });
    if (out.length >= MAX_DUE_DILIGENCE_ITEMS) break;
  }
  return out;
}

/** Resolve the checklist shown by the read action. A literal stored [] is an
 * intentional empty checklist. A non-empty array that contains no valid items
 * is corrupt persisted data, so recover with defaults instead of silently
 * presenting it as an intentional empty checklist. */
export function resolveStoredDueDiligenceItems(
  rawItems: unknown,
  hasStoredRow: boolean,
): DueDiligenceItem[] {
  if (!hasStoredRow || !Array.isArray(rawItems)) {
    return defaultDueDiligenceItems();
  }
  if (rawItems.length === 0) return [];

  const normalized = normalizeDueDiligenceItems(rawItems);
  return normalized.length > 0 ? normalized : defaultDueDiligenceItems();
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

/** Items due within this many days (and not yet overdue) read as "due soon". */
export const DUE_DILIGENCE_DUE_SOON_DAYS = 7;

export type DueDiligenceDueStatus = "overdue" | "due-soon" | "scheduled";

/** UTC-noon timestamp for a YYYY-MM-DD string, or null if malformed. Noon
 *  anchoring keeps whole-day diffs stable across DST. */
function parseISODate(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return Date.UTC(y, mo - 1, d, 12, 0, 0);
}

/** Whole-day difference (b − a) between two YYYY-MM-DD dates, or null if
 *  either is malformed. */
function daysBetweenISO(a: string, b: string): number | null {
  const pa = parseISODate(a);
  const pb = parseISODate(b);
  if (pa == null || pb == null) return null;
  return Math.round((pb - pa) / 86_400_000);
}

/** Deadline status for an OPEN item with a due date. Done items and items
 *  without a date return null (no deadline pressure). `todayISO` is the
 *  viewer's local "today" as YYYY-MM-DD — pure + injectable for tests. */
export function dueDiligenceItemStatus(
  item: DueDiligenceItem,
  todayISO: string
): DueDiligenceDueStatus | null {
  if (item.done || !item.dueDate) return null;
  const days = daysBetweenISO(todayISO, item.dueDate);
  if (days == null) return null;
  if (days < 0) return "overdue";
  if (days <= DUE_DILIGENCE_DUE_SOON_DAYS) return "due-soon";
  return "scheduled";
}

/** Count of open items that are overdue / due soon — for a header chip. */
export function dueDiligenceDueSummary(
  items: DueDiligenceItem[],
  todayISO: string
): { overdue: number; dueSoon: number } {
  let overdue = 0;
  let dueSoon = 0;
  for (const item of items) {
    const status = dueDiligenceItemStatus(item, todayISO);
    if (status === "overdue") overdue += 1;
    else if (status === "due-soon") dueSoon += 1;
  }
  return { overdue, dueSoon };
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
