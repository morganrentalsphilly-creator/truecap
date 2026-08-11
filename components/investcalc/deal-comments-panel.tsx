"use client";

/**
 * Deal comments - an append-only, dated log on a saved deal (seller updates,
 * agent notes, your evolving reasoning over time). Distinct from the single
 * Deal Notes blob: a sequence you can scroll back through. Free per-deal
 * annotation; entries are immutable (add / delete). Renders a graceful notice
 * until the deal_comments migration is applied.
 */
import { useEffect, useState, useTransition } from "react";
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import {
  addDealCommentAction,
  deleteDealCommentAction,
  listDealCommentsAction,
  type DealComment,
} from "@/app/actions/deal-comments";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DealCommentsPanel({ savedDealId }: { savedDealId: string }) {
  const { toast } = useToast();
  const [comments, setComments] = useState<DealComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [isBusy, startBusy] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setMigrationPending(false);
    void listDealCommentsAction(savedDealId)
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setComments(r.comments);
        else if (r.code === "MIGRATION_PENDING") setMigrationPending(true);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [savedDealId]);

  const apply = (r: Awaited<ReturnType<typeof listDealCommentsAction>>) => {
    if (r.ok) setComments(r.comments);
    else if (r.code === "MIGRATION_PENDING") setMigrationPending(true);
    else toast({ title: "Could not save comment", description: r.message, variant: "destructive" });
  };

  const add = () => {
    const body = draft.trim();
    if (!body || isBusy) return; // isBusy: ⌘/Ctrl+Enter bypasses the disabled Send
    const dealAtSubmit = savedDealId;
    startBusy(async () => {
      // The draft is the only copy of what was typed, so it survives until
      // the server confirms the row. Clearing before the await meant any
      // failure (session expiry, archived deal, dropped connection) silently
      // destroyed the entry. A rejected promise gets its own toast, since
      // apply() never runs in that case.
      const r = await addDealCommentAction(dealAtSubmit, body).catch(() => null);
      if (dealAtSubmit !== savedDealId) return;
      if (!r) {
        toast({
          title: "Could not save comment",
          description: "We couldn't reach the server. Your entry is still in the box - try again.",
          variant: "destructive",
        });
        return;
      }
      if (!r.ok) {
        apply(r);
        return;
      }
      // Only drop what we actually sent - anything typed while the save was
      // in flight stays put.
      setDraft((current) => (current.trim() === body ? "" : current));
      apply(r);
    });
  };
  const remove = (commentId: string) => {
    const dealAtSubmit = savedDealId;
    startBusy(async () => {
      try {
        const r = await deleteDealCommentAction(dealAtSubmit, commentId);
        if (dealAtSubmit === savedDealId) apply(r);
      } catch {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). Without this the delete
        // silently no-ops — the row stays on screen with no signal. Mirror the
        // add() path: a retryable toast, and honor the stale-deal guard.
        if (dealAtSubmit === savedDealId) {
          toast({
            title: "Could not delete comment",
            description: "We couldn't reach the server. Try again.",
            variant: "destructive",
          });
        }
      }
    });
  };

  if (!loaded) return null;

  if (migrationPending) {
    return (
      <section
        aria-label="Deal comments"
        className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground"
      >
        <MessageSquare className="mr-1.5 inline size-3.5" />
        The deal comment log will be available once the latest schema update is applied.
      </section>
    );
  }

  return (
    <section aria-label="Deal comments" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Comments</h3>
        </div>
        {isBusy ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Saving…
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {comments.length} {comments.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder="Log an update - seller motivation, agent call, a decision… (⌘/Ctrl+Enter)"
          className="min-h-[2.5rem] flex-1 resize-y rounded-md border border-input bg-transparent px-2.5 py-2 text-sm text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button type="button" size="sm" variant="outline" className="h-9 self-end" onClick={add} disabled={!draft.trim() || isBusy}>
          <Send className="size-4" />
        </Button>
      </div>

      {comments.length > 0 ? (
        <ul className="mt-3 space-y-2.5">
          {comments.map((c) => (
            <li key={c.id} className="group rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {c.authorName ? `${c.authorName} · ` : ""}
                  {formatWhen(c.createdAt)}
                </span>
                <button
                  type="button"
                  aria-label="Delete comment"
                  onClick={() => remove(c.id)}
                  className="shrink-0 text-muted-foreground/40 transition-colors hover:text-destructive focus-visible:text-destructive focus-visible:outline-none"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          No comments yet. Keep a dated trail of what you learn as the deal moves.
        </p>
      )}
    </section>
  );
}
