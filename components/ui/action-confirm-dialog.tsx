"use client";

/**
 * In-app replacement for window.confirm / window.prompt.
 *
 * Fourteen destructive or work-clearing flows guarded themselves with native
 * browser dialogs — bulk delete, Pass confirmations and their reason prompts,
 * client removal, the address-swap guard, the new-analysis guard, and the
 * leave-with-unsaved-changes guard. Native dialogs render as OS chrome (the
 * founder hit the address-swap one as a bare iOS sheet), cannot be styled or
 * focus-managed, read the message as one undifferentiated paragraph, and are
 * invisible to the same automation that drives every other dialog in the app.
 * Meanwhile the document-delete flow already had a proper in-app confirm —
 * one product, two grammars for "are you sure".
 *
 * This provider gives the whole app one imperative, promise-based grammar:
 *
 *   const { confirmDialog, promptDialog } = useActionConfirm();
 *   if (!(await confirmDialog({ title: "Delete 3 deals?", ... }))) return;
 *   const reason = await promptDialog({ title: "Why are you passing?" });
 *
 * Contract mirrors the natives so call sites translate mechanically:
 * confirmDialog resolves true/false; promptDialog resolves the entered string
 * or null on cancel. Closing by Escape or overlay-click is a cancel. Requests
 * queue FIFO — a second request opens after the first settles, never on top
 * of it.
 */

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmActionOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (delete, remove, discard). */
  destructive?: boolean;
}

export interface PromptActionOptions {
  title: string;
  body?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  maxLength?: number;
}

interface ActionConfirmContextValue {
  confirmDialog: (options: ConfirmActionOptions) => Promise<boolean>;
  promptDialog: (options: PromptActionOptions) => Promise<string | null>;
}

const ActionConfirmContext = createContext<ActionConfirmContextValue | null>(
  null,
);

type PendingRequest =
  | {
      kind: "confirm";
      options: ConfirmActionOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "prompt";
      options: PromptActionOptions;
      resolve: (value: string | null) => void;
    };

type SettledRequest = { request: PendingRequest; result: boolean | string | null };

export function ActionConfirmProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<PendingRequest | null>(null);
  /** The just-settled request, kept so the dialog renders its copy through
   *  the exit animation. State, not a ref: it is read during render. */
  const [closing, setClosing] = useState<PendingRequest | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const queueRef = useRef<PendingRequest[]>([]);
  // The active request must resolve exactly once even though both a button
  // handler and Radix's onOpenChange(false) fire on the same dismissal.
  const settledRef = useRef<SettledRequest | null>(null);
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNext = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    setClosing(null);
    setPromptValue(next?.kind === "prompt" ? (next.options.initialValue ?? "") : "");
    setActive(next);
  }, []);

  const enqueue = useCallback((request: PendingRequest) => {
    queueRef.current.push(request);
    setActive((current) => {
      // An in-flight CLOSE is busy too: opening the next request mid-exit
      // makes Radix cancel the first dialog's teardown, onCloseAutoFocus
      // never fires for it, and the 400ms fallback gets cleaned up because
      // active is non-null again — stranding the first caller's promise
      // forever. finishSettle's openNext() pops the queue FIFO once the
      // close fully completes.
      if (current || settledRef.current) return current;
      const next = queueRef.current.shift() ?? null;
      setPromptValue(
        next?.kind === "prompt" ? (next.options.initialValue ?? "") : "",
      );
      return next;
    });
  }, []);

  /**
   * Resolving the caller's promise is deliberately deferred to
   * finishSettle(), which runs from DialogContent's onCloseAutoFocus —
   * i.e. only after Radix has fully torn the modal down. Resolving
   * immediately let the caller mutate the page (form resets, router
   * work) while the overlay was mid-close, and Radix left the rest of
   * the document stranded under aria-hidden="true" — every input on the
   * page read as hidden. The browser suite caught it: address.fill()
   * timed out on an aria-hidden input. This repo's OverlayRecovery
   * exists for exactly this stranded-overlay class; better not to
   * strand it at all.
   */
  const settle = useCallback((result: boolean | string | null) => {
    setActive((current) => {
      if (current && !settledRef.current) {
        settledRef.current = { request: current, result };
        setClosing(current);
      }
      return null; // start the Radix close; resolution follows in finishSettle
    });
  }, []);

  const finishSettle = useCallback(() => {
    if (resolveTimerRef.current) {
      clearTimeout(resolveTimerRef.current);
      resolveTimerRef.current = null;
    }
    const settled = settledRef.current;
    settledRef.current = null;
    // Idempotence: both onCloseAutoFocus AND the 400ms fallback can fire for
    // the same close (timer first, focus event late). Without this early
    // return the second invocation still ran openNext() below and yanked a
    // legitimately open next dialog out from under its caller.
    if (!settled) return;
    // One more macrotask of separation: onCloseAutoFocus fires BEFORE Radix
    // finishes its unmount cleanup, and resolving synchronously here let the
    // caller's re-render race the aria-hidden restore — measured on
    // production, the analyzer's address input kept aria-hidden="true"
    // data-aria-hidden="true" (Radix's fingerprint) after a confirm, so
    // screen readers skipped the page's primary input while sighted users
    // saw nothing wrong. Resolve after the cleanup commit instead.
    setTimeout(() => {
      // Deterministic restore, not a bet on Radix's internal ordering. The
      // one-macrotask deferral above still lost the race on production —
      // hideOthers() undoes its aria-hidden marks only after the exit
      // animation, and the caller's re-render kept beating it, leaving the
      // analyzer's primary input marked aria-hidden for screen readers.
      // Same philosophy as OverlayRecovery: if no Radix layer is open once
      // we settle, any remaining data-aria-hidden mark is stale by
      // definition — sweep it. Guarded so a legitimately open modal
      // elsewhere keeps its marks.
      const sweepStaleAriaHidden = () => {
        if (document.querySelector('[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]')) {
          return;
        }
        for (const el of document.querySelectorAll('[data-aria-hidden="true"]')) {
          el.removeAttribute("aria-hidden");
          el.removeAttribute("data-aria-hidden");
        }
      };
      if (settled) {
        const { request, result } = settled;
        if (request.kind === "confirm") {
          request.resolve(Boolean(result));
        } else {
          request.resolve(typeof result === "string" ? result : null);
        }
      }
      openNext();
      // Once now (covers the common case), once after the exit animation's
      // worst case, so whichever side of the undo we land on ends clean.
      sweepStaleAriaHidden();
      setTimeout(sweepStaleAriaHidden, 350);
    }, 0);
  }, [openNext]);

  // Belt-and-braces: if onCloseAutoFocus never fires (content unmounted by a
  // route change mid-close), resolve anyway so no caller is stranded.
  useEffect(() => {
    if (active == null && settledRef.current) {
      resolveTimerRef.current = setTimeout(finishSettle, 400);
      return () => {
        if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
      };
    }
  }, [active, finishSettle]);

  // A provider unmount (route change with a dialog open) must not strand
  // callers on a never-settling promise: cancel everything in flight.
  useEffect(() => {
    const queue = queueRef.current;
    return () => {
      const settled = settledRef.current;
      settledRef.current = null;
      if (settled) {
        const { request, result } = settled;
        if (request.kind === "confirm") request.resolve(Boolean(result));
        else request.resolve(typeof result === "string" ? result : null);
      }
      for (const request of queue.splice(0)) {
        if (request.kind === "confirm") request.resolve(false);
        else request.resolve(null);
      }
    };
  }, []);

  const confirmDialog = useCallback(
    (options: ConfirmActionOptions) =>
      new Promise<boolean>((resolve) =>
        enqueue({ kind: "confirm", options, resolve }),
      ),
    [enqueue],
  );

  const promptDialog = useCallback(
    (options: PromptActionOptions) =>
      new Promise<string | null>((resolve) =>
        enqueue({ kind: "prompt", options, resolve }),
      ),
    [enqueue],
  );

  const value = useMemo(
    () => ({ confirmDialog, promptDialog }),
    [confirmDialog, promptDialog],
  );

  const rendered = active ?? closing;
  const options = rendered?.options;
  return (
    <ActionConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={active != null}
        onOpenChange={(open) => {
          if (!open) settle(active?.kind === "prompt" ? null : false);
        }}
      >
        <DialogContent
          className="max-w-md"
          onCloseAutoFocus={finishSettle}
        >
          <DialogHeader>
            <DialogTitle>{options?.title}</DialogTitle>
            {options?.body ? (
              <DialogDescription className="whitespace-pre-line">
                {options.body}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {rendered?.kind === "prompt" ? (
            <textarea
              autoFocus
              value={promptValue}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setPromptValue(event.target.value)
              }
              placeholder={rendered.options.placeholder}
              maxLength={rendered.options.maxLength ?? 500}
              rows={3}
              aria-label={options?.title}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
            />
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => settle(rendered?.kind === "prompt" ? null : false)}
            >
              {options?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              type="button"
              variant={
                rendered?.kind === "confirm" && rendered.options.destructive
                  ? "destructive"
                  : "default"
              }
              className="min-h-11"
              onClick={() =>
                settle(rendered?.kind === "prompt" ? promptValue : true)
              }
            >
              {options?.confirmLabel ?? "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ActionConfirmContext.Provider>
  );
}

export function useActionConfirm(): ActionConfirmContextValue {
  const context = useContext(ActionConfirmContext);
  if (!context) {
    throw new Error(
      "useActionConfirm requires <ActionConfirmProvider> (mounted in the root layout).",
    );
  }
  return context;
}
