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
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, ClipboardCheck, Loader2, Plus, X } from "lucide-react";
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
  // WS-3: which row's note editor is open (accordion — one at a time keeps
  // the checklist compact on mobile). The ref holds the note as it was when
  // the editor opened so blur only persists an ACTUAL change.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const noteAtOpenRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setMigrationPending(false);
    setExpandedId(null);
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

  /**
   * Every mutator commits to local state first (optimistic - the checklist
   * has to feel instant), so a rejected write leaves the card asserting
   * something the server never stored. On failure we reconcile back to
   * server truth: re-read the stored checklist, falling back to the
   * pre-mutation snapshot if even the re-read fails. `onFailure` lets the
   * caller put back anything it cleared outside `items` (the new-item input,
   * the note baseline) AND re-apply text the user typed that the reconcile
   * would otherwise wipe — it runs after the reconciling setItems, so it must
   * use a FUNCTIONAL update to land on top of it. `failureHint` keeps the
   * toast honest when a caller preserves what the user typed. Same
   * rollback-on-error contract as deal-stage-select.tsx.
   */
  const persist = (
    next: DueDiligenceItem[],
    onFailure?: () => void,
    failureHint = "Your last change was undone."
  ) => {
    const dealIdAtSubmit = savedDealId;
    const previous = items;
    startSaving(async () => {
      const r = await updateDealDueDiligenceAction(dealIdAtSubmit, next);
      if (dealIdAtSubmit !== savedDealId) return; // user switched deals mid-save
      if (!r.ok) {
        if (r.code === "MIGRATION_PENDING") {
          setMigrationPending(true);
          return;
        }
        const fresh = await getDealDueDiligenceAction(dealIdAtSubmit).catch(() => null);
        if (dealIdAtSubmit !== savedDealId) return;
        setItems(fresh?.ok ? fresh.items : previous);
        onFailure?.();
        toast({
          title: "Could not save checklist",
          description: `${r.message} ${failureHint}`,
          variant: "destructive",
        });
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
    // A failed add rolls the row back out, so the typed label goes back in
    // the input rather than disappearing with it.
    persist(next, () => setNewLabel(label));
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
  // WS-3: expand/collapse a row's note editor. Opening snapshots the current
  // note so commitNote can skip the server write when nothing changed.
  const toggleNote = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    noteAtOpenRef.current = items.find((i) => i.id === id)?.note ?? "";
    setExpandedId(id);
  };
  // Keystrokes only update local state; the server write happens on
  // blur/Enter (commitNote) so typing doesn't spam the persist action.
  const setNoteDraft = (id: string, value: string) => {
    setItems(items.map((i) => (i.id === id ? { ...i, note: value } : i)));
  };
  const commitNote = (id: string) => {
    const raw = items.find((i) => i.id === id)?.note ?? "";
    // Same trim + 500-char cap the server normalizer applies, so the local
    // state matches what actually persisted. Empty clears the note entirely.
    const trimmed = raw.trim().slice(0, 500);
    const next = items.map((i) => {
      if (i.id !== id) return i;
      const { note: _note, ...rest } = i;
      return trimmed ? { ...rest, note: trimmed } : rest;
    });
    setItems(next);
    if (trimmed !== noteAtOpenRef.current.trim()) {
      // Restore the baseline if the save fails, otherwise the retry looks
      // like "nothing changed" and silently skips the write.
      const noteBeforeSave = noteAtOpenRef.current;
      noteAtOpenRef.current = trimmed;
      persist(
        next,
        () => {
          noteAtOpenRef.current = noteBeforeSave;
          // Reconciling to server truth would revert the textarea to the
          // OLDER stored note — silently destroying up to 500 chars the user
          // just typed, with no undo. Put the typed text back on top of the
          // reconciled state (functional update, so it lands AFTER persist's
          // queued setItems). Same reason `add` re-seeds setNewLabel.
          setItems((cur) =>
            cur.map((i) => {
              if (i.id !== id) return i;
              const { note: _note, ...rest } = i;
              return trimmed ? { ...rest, note: trimmed } : rest;
            })
          );
        },
        // The rest of the change was rolled back, but the note itself is
        // still on screen — don't claim it was undone.
        "Your note is still here — try again."
      );
    }
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
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-700">
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
          const isExpanded = expandedId === item.id;
          return (
            <li key={item.id} className="group">
              <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggle(item.id)}
                className="size-4 shrink-0 rounded border-border accent-[var(--brand-green)]"
                aria-label={item.label}
              />
              {/* WS-3: the label is the expand/collapse control (big tap
                  target on mobile; a real <button>, so Enter/Space work).
                  aria-expanded + aria-controls tie it to the note region. */}
              <button
                type="button"
                onClick={() => toggleNote(item.id)}
                aria-expanded={isExpanded}
                aria-controls={`dd-note-${item.id}`}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    "min-w-0 truncate text-sm",
                    item.done ? "text-muted-foreground line-through" : "text-foreground"
                  )}
                >
                  {item.label}
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground/50 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>
              {status === "overdue" ? (
                <span className="shrink-0 rounded-full bg-[var(--metric-negative)]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--metric-negative)]">
                  Overdue
                </span>
              ) : status === "due-soon" ? (
                <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
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
              </div>
              {/* Collapsed note preview — one truncated muted line under the
                  label so the context ("Inspector: Mike @ ProCheck, Thu 2pm")
                  is visible without opening the row. */}
              {!isExpanded && item.note ? (
                <p className="ml-[26px] truncate pr-8 text-xs text-muted-foreground">{item.note}</p>
              ) : null}
              {isExpanded ? (
                <div id={`dd-note-${item.id}`} className="ml-[26px] mt-1.5 pr-8">
                  <Input
                    value={item.note ?? ""}
                    onChange={(e) => setNoteDraft(item.id, e.target.value)}
                    onBlur={() => commitNote(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        // Blur triggers commitNote — one save path.
                        e.currentTarget.blur();
                      }
                    }}
                    maxLength={500}
                    placeholder="Add a note — inspector, quote, contact…"
                    aria-label={`Note for ${item.label}`}
                    className="h-8 text-xs"
                    // Just expanded via the label/chevron — put the caret in
                    // the editor so keyboard users don't have to Tab-hunt.
                    autoFocus
                  />
                </div>
              ) : null}
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
