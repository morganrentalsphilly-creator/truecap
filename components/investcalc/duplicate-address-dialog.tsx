"use client";

/**
 * Shown when saving a deal whose address matches an analysis the user already
 * saved. Instead of the old dead-end toast, they pick a real outcome:
 *
 *   - Update saved deal    → overwrite the existing analysis with the current
 *                            form values (same row, dashboard entry stays put)
 *   - Save as new scenario → keep both; the new row is titled
 *                            "<address> — Scenario 2" (3, 4, …)
 *   - Cancel               → back to the form, nothing saved
 */

import { CopyPlus, Loader2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type DuplicateAddressChoice = "update" | "scenario";

interface DuplicateAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title of the already-saved colliding analysis (usually its address). */
  existingTitle?: string;
  /** Which choice is saving right now - disables everything while in flight. */
  busyChoice: DuplicateAddressChoice | null;
  onUpdateExisting: () => void;
  onSaveAsScenario: () => void;
}

export function DuplicateAddressDialog({
  open,
  onOpenChange,
  existingTitle,
  busyChoice,
  onUpdateExisting,
  onSaveAsScenario,
}: DuplicateAddressDialogProps) {
  const busy = busyChoice !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't let backdrop/Esc close the dialog mid-save.
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Already saved this address</DialogTitle>
          <DialogDescription>
            {existingTitle
              ? `“${existingTitle}” is already in your saved deals.`
              : "This property address is already in your saved deals."}{" "}
            Overwrite it with these numbers, or keep both.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Update in place - the most common intent (re-running the same
              deal with fresh numbers), so it's listed first. */}
          <button
            type="button"
            onClick={onUpdateExisting}
            disabled={busy}
            className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
          >
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <PencilLine className="size-4 text-primary" />
                Update saved deal
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Replace the saved analysis with your current inputs and
                results. Its notes, comps, and share links stay attached.
              </p>
            </div>
            {busyChoice === "update" ? (
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : null}
          </button>

          {/* Keep both - e.g. same property underwritten with different rent
              or financing assumptions. */}
          <button
            type="button"
            onClick={onSaveAsScenario}
            disabled={busy}
            className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
          >
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <CopyPlus className="size-4 text-muted-foreground" />
                Save as new scenario
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Keep the original and save this as a separate deal
                (&ldquo;… — Scenario 2&rdquo;) so you can compare them side by
                side.
              </p>
            </div>
            {busyChoice === "scenario" ? (
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : null}
          </button>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
