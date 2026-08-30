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
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import * as Sentry from "@sentry/nextjs";
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
import { isCurrentDealWorkspaceMutation } from "@/lib/deal-workspace-mutation-lifecycle";

export function DueDiligenceCard({ savedDealId }: { savedDealId: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<DueDiligenceItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [migrationPending, setMigrationPending] = useState(false);
  const [revision, setRevision] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [isSaving, startSaving] = useTransition();
  // WS-3: which row's note editor is open (accordion — one at a time keeps
  // the checklist compact on mobile). The ref holds the note as it was when
  // the editor opened so blur only persists an ACTUAL change.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const noteAtOpenRef = useRef<string>("");
  const savedDealIdRef = useRef(savedDealId);
  const mutationRequestRef = useRef<symbol | null>(null);

  // Layout phase closes the new-route-commit -> passive-effect window: an old
  // request cannot resolve against the previous id after the new deal is on
  // screen.
  useLayoutEffect(() => {
    savedDealIdRef.current = savedDealId;
    mutationRequestRef.current = null;
    // Both values are unsaved, deal-scoped input. Clear them during the route
    // commit so a reused dynamic workspace cannot carry a checklist label or
    // note comparison baseline from deal A into deal B.
    setNewLabel("");
    noteAtOpenRef.current = "";
    setLoaded(false);
  }, [savedDealId]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setLoadError(null);
    setMigrationPending(false);
    setExpandedId(null);
    void getDealDueDiligenceAction(savedDealId)
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setItems(r.items);
          setRevision(r.revision);
        } else if (r.code === "MIGRATION_PENDING") {
          setMigrationPending(true);
        } else {
          setLoadError(r.message || "We couldn't load this checklist.");
        }
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[due-diligence] load failed:", err);
          setLoadError("We couldn't load this checklist. Check your connection and try again.");
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt, savedDealId]);

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
    if (isSaving || loadError) return;
    const dealIdAtSubmit = savedDealId;
    const previous = items;
    const revisionAtSubmit = revision;
    const requestToken = Symbol("due-diligence-save");
    mutationRequestRef.current = requestToken;
    const requestStillOwnsDeal = () =>
      isCurrentDealWorkspaceMutation({
        submittedDealId: dealIdAtSubmit,
        currentDealId: savedDealIdRef.current,
        requestToken,
        currentRequestToken: mutationRequestRef.current,
      });
    startSaving(async () => {
      try {
        const r = await updateDealDueDiligenceAction(dealIdAtSubmit, next, revisionAtSubmit);
        if (!requestStillOwnsDeal()) return;
        if (!r.ok) {
          if (r.code === "MIGRATION_PENDING") {
            setItems(previous);
            setMigrationPending(true);
            return;
          }
          const fresh = await getDealDueDiligenceAction(dealIdAtSubmit).catch(() => null);
          if (!requestStillOwnsDeal()) return;
          if (fresh?.ok) {
            setItems(fresh.items);
            setRevision(fresh.revision);
          } else {
            setItems(previous);
          }
          onFailure?.();
          toast({
            title: "Could not save checklist",
            description: `${r.message} ${failureHint}`,
            variant: "destructive",
          });
          return;
        }
        setItems(r.items);
        setRevision(r.revision);
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). The optimistic setItems
        // already ran, so the card is asserting a change the server never
        // stored. Reconcile the same way the !r.ok branch does — roll back to
        // the pre-mutation snapshot (a re-read might also be down), let the
        // caller restore anything it cleared, and surface a retryable toast.
        Sentry.captureException(err, { tags: { feature: "due-diligence" } });
        if (!requestStillOwnsDeal()) return;
        setItems(previous);
        onFailure?.();
        toast({
          title: "Could not save checklist",
          description: `Something interrupted the request. ${failureHint}`,
          variant: "destructive",
        });
      } finally {
        if (mutationRequestRef.current === requestToken) {
          mutationRequestRef.current = null;
        }
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

  if (loadError) {
    return (
      <section
        aria-label="Due diligence"
        className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4"
      >
        <div role="alert">
          <p className="text-sm font-semibold text-foreground">Couldn&apos;t load due diligence</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {loadError} Editing stays disabled until the saved checklist is available, so unseen items cannot be overwritten.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 min-h-11"
          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
        >
          Try again
        </Button>
      </section>
    );
  }

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
      <div className="mb-3 flex flex-col items-start gap-2 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between min-[360px]:gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Due diligence</h3>
        </div>
        <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
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
            <li key={item.id} className="group rounded-xl bg-muted/20 p-2 sm:bg-transparent sm:p-0">
              <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-start gap-x-2 gap-y-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto_2.75rem] sm:items-center">
                <label className="col-start-1 row-start-1 flex size-11 shrink-0 cursor-pointer items-center justify-center" aria-label={`Mark ${item.label} ${item.done ? "incomplete" : "complete"}`}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggle(item.id)}
                    disabled={isSaving}
                    className="size-4 rounded border-border accent-[var(--brand-green)]"
                  />
                </label>
                {/* WS-3: the label is the expand/collapse control (big tap
                    target on mobile; a real <button>, so Enter/Space work).
                    aria-expanded + aria-controls tie it to the note region. */}
                <button
                  type="button"
                  onClick={() => toggleNote(item.id)}
                  disabled={isSaving}
                  aria-expanded={isExpanded}
                  aria-controls={`dd-note-${item.id}`}
                  className="col-start-2 row-start-1 flex min-h-11 min-w-0 items-center gap-1.5 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-2">
                    <span
                      className={cn(
                        "block min-w-0 whitespace-normal break-words text-sm leading-snug sm:flex-1 sm:truncate",
                        item.done ? "text-muted-foreground line-through" : "text-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                    {status === "overdue" ? (
                      <span className="mt-1 inline-flex shrink-0 rounded-full bg-[var(--metric-negative)]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--metric-negative)] sm:mt-0">
                        Overdue
                      </span>
                    ) : status === "due-soon" ? (
                      <span className="mt-1 inline-flex shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 sm:mt-0">
                        Due soon
                      </span>
                    ) : null}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground/50 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
                <input
                  type="date"
                  value={item.dueDate ?? ""}
                  onChange={(e) => setDueDate(item.id, e.target.value)}
                  disabled={isSaving}
                  aria-label={`Due date for ${item.label}`}
                  className={cn(
                    "col-span-2 col-start-2 row-start-2 h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:w-[9.5rem] sm:text-[11px]",
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
                  disabled={isSaving}
                  className="col-start-3 row-start-1 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive sm:col-start-4"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>
              {/* Collapsed note preview — one truncated muted line under the
                  label so the context ("Inspector: Mike @ ProCheck, Thu 2pm")
                  is visible without opening the row. */}
              {!isExpanded && item.note ? (
                <p className="mt-1.5 truncate text-xs text-muted-foreground sm:ml-[52px] sm:pr-11">{item.note}</p>
              ) : null}
              {isExpanded ? (
                <div id={`dd-note-${item.id}`} className="mt-1.5 sm:ml-[52px] sm:pr-11">
                  <Input
                    value={item.note ?? ""}
                    onChange={(e) => setNoteDraft(item.id, e.target.value)}
                    disabled={isSaving}
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
                    className="min-h-11 text-xs"
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
        <label htmlFor="new-due-diligence-item" className="sr-only">
          New due-diligence checklist item
        </label>
        <Input
          id="new-due-diligence-item"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          disabled={isSaving}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a checklist item…"
          className="h-11 text-sm"
        />
        <Button type="button" size="sm" variant="outline" className="h-11" onClick={add} disabled={isSaving || !newLabel.trim()} aria-label="Add checklist item">
          <Plus className="size-4" aria-hidden />
        </Button>
      </div>
    </section>
  );
}
