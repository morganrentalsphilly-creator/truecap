"use client";

/**
 * Due-diligence checklist for a saved deal - the verification tasks an
 * investor works through between offer and close (inspection, title,
 * insurance, financing, leases…). Mirrors the Deal Notes panel:
 *   - Renders only for a saved deal (savedDealId)
 *   - Lazy-loads the checklist (seeded with defaults on first use)
 *   - Persists every toggle / add / remove via the server action
 *   - Graceful migration-pending notice
 *
 * Free per-deal annotation (no entitlement), like Deal Notes.
 */
import { useEffect, useMemo, useState, useTransition } from "react";
import { ClipboardCheck, Loader2, Plus, X } from "lucide-react";
import {
  getDealDueDiligenceAction,
  updateDealDueDiligenceAction,
} from "@/app/actions/saved-analyses";
import {
  dueDiligenceDueSummary,
  dueDiligenceItemStatus,
  dueDiligenceProgress,
  makeDueDiligenceItemId,
  type DueDiligenceItem,
} from "@/lib/due-diligence";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DueDiligenceCard({ savedDealId }: { savedDealId: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<DueDiligenceItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setMigrationPending(false);
    void getDealDueDiligenceAction(savedDealId)
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setItems(r.items);
        else if (r.code === "MIGRATION_PENDING") setMigrationPending(true);
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[due-diligence] load failed:", err);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [savedDealId]);

  const persist = (next: DueDiligenceItem[]) => {
    const dealIdAtSubmit = savedDealId;
    startSaving(async () => {
      const r = await updateDealDueDiligenceAction(dealIdAtSubmit, next);
      if (dealIdAtSubmit !== savedDealId) return; // user switched deals mid-save
      if (!r.ok) {
        if (r.code === "MIGRATION_PENDING") {
          setMigrationPending(true);
          return;
        }
        toast({ title: "Could not save checklist", description: r.message, variant: "destructive" });
      }
    });
  };

  const toggle = (id: string) => {
    const next = items.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    setItems(next);
    persist(next);
  };
  const remove = (id: string) => {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    persist(next);
  };
  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    const next = [...items, { id: makeDueDiligenceItemId(label, items), label, done: false }];
    setItems(next);
    setNewLabel("");
    persist(next);
  };
  const setDueDate = (id: string, value: string) => {
    // Empty string clears the deadline; otherwise store the YYYY-MM-DD the
    // native date input gives us (the lib re-validates on save).
    const next = items.map((i) =>
      i.id === id ? { ...i, ...(value ? { dueDate: value } : { dueDate: undefined }) } : i
    );
    setItems(next);
    persist(next);
  };

  // Viewer-local "today" so overdue/due-soon match the date input's local
  // semantics. Recomputed per render - cheap, and keeps the day fresh.
  const todayISO = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }, []);

  if (!loaded) return null;

  if (migrationPending) {
    return (
      <section
        aria-label="Due diligence"
        className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground"
      >
        <ClipboardCheck className="mr-1.5 inline size-3.5" />
        The due-diligence checklist will be available once the latest schema update is applied.
      </section>
    );
  }

  const { done, total, pct } = dueDiligenceProgress(items);
  const dueSummary = dueDiligenceDueSummary(items, todayISO);

  return (
    <section aria-label="Due diligence" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Due diligence</h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {dueSummary.overdue > 0 ? (
            <span className="rounded-full bg-[var(--metric-negative)]/10 px-2 py-0.5 font-semibold text-[var(--metric-negative)]">
              {dueSummary.overdue} overdue
            </span>
          ) : dueSummary.dueSoon > 0 ? (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-600">
              {dueSummary.dueSoon} due soon
            </span>
          ) : null}
          {isSaving ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> Saving…
            </span>
          ) : (
            <span>
              {done}/{total} done
            </span>
          )}
        </div>
      </div>

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[var(--brand-green)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-1.5">
        {items.map((item) => {
          const status = dueDiligenceItemStatus(item, todayISO);
          return (
            <li key={item.id} className="group flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggle(item.id)}
                className="size-4 shrink-0 rounded border-border accent-[var(--brand-green)]"
                aria-label={item.label}
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  item.done ? "text-muted-foreground line-through" : "text-foreground"
                )}
              >
                {item.label}
              </span>
              {status === "overdue" ? (
                <span className="shrink-0 rounded-full bg-[var(--metric-negative)]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--metric-negative)]">
                  Overdue
                </span>
              ) : status === "due-soon" ? (
                <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                  Due soon
                </span>
              ) : null}
              <input
                type="date"
                value={item.dueDate ?? ""}
                onChange={(e) => setDueDate(item.id, e.target.value)}
                aria-label={`Due date for ${item.label}`}
                className={cn(
                  "h-7 shrink-0 rounded-md border border-input bg-transparent px-1.5 text-[11px] outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  status === "overdue"
                    ? "text-[var(--metric-negative)]"
                    : item.dueDate
                      ? "text-foreground"
                      : "text-muted-foreground/60"
                )}
              />
              <button
                type="button"
                aria-label={`Remove ${item.label}`}
                onClick={() => remove(item.id)}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a checklist item…"
          className="h-9 text-sm"
        />
        <Button type="button" size="sm" variant="outline" className="h-9" onClick={add} disabled={!newLabel.trim()}>
          <Plus className="size-4" />
        </Button>
      </div>
    </section>
  );
}
