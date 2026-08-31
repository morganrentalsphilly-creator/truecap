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

export function ActionConfirmProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<PendingRequest | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const queueRef = useRef<PendingRequest[]>([]);
  // The active request must resolve exactly once even though both a button
  // handler and Radix's onOpenChange(false) fire on the same dismissal.
  const settledRef = useRef(false);

  const dequeue = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    settledRef.current = false;
    setPromptValue(next?.kind === "prompt" ? (next.options.initialValue ?? "") : "");
    setActive(next);
  }, []);

  const enqueue = useCallback(
    (request: PendingRequest) => {
      queueRef.current.push(request);
      setActive((current) => {
        if (current) return current; // will dequeue when the current one settles
        const next = queueRef.current.shift() ?? null;
        settledRef.current = false;
        setPromptValue(
          next?.kind === "prompt" ? (next.options.initialValue ?? "") : "",
        );
        return next;
      });
    },
    [],
  );

  const settle = useCallback(
    (result: boolean | string | null) => {
      setActive((current) => {
        if (current && !settledRef.current) {
          settledRef.current = true;
          if (current.kind === "confirm") {
            current.resolve(Boolean(result));
          } else {
            current.resolve(typeof result === "string" ? result : null);
          }
        }
        return current; // closing animation reads the request; dequeue below
      });
      // Give the close a tick so Radix unmounts cleanly before the next opens.
      setTimeout(dequeue, 0);
    },
    [dequeue],
  );

  // A provider unmount (route change with a dialog open) must not strand
  // callers on a never-settling promise: cancel everything in flight.
  useEffect(() => {
    const queue = queueRef.current;
    return () => {
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

  const options = active?.options;
  return (
    <ActionConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={active != null}
        onOpenChange={(open) => {
          if (!open) settle(active?.kind === "prompt" ? null : false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{options?.title}</DialogTitle>
            {options?.body ? (
              <DialogDescription className="whitespace-pre-line">
                {options.body}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {active?.kind === "prompt" ? (
            <textarea
              autoFocus
              value={promptValue}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setPromptValue(event.target.value)
              }
              placeholder={active.options.placeholder}
              maxLength={active.options.maxLength ?? 500}
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
              onClick={() => settle(active?.kind === "prompt" ? null : false)}
            >
              {options?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              type="button"
              variant={
                active?.kind === "confirm" && active.options.destructive
                  ? "destructive"
                  : "default"
              }
              className="min-h-11"
              onClick={() =>
                settle(active?.kind === "prompt" ? promptValue : true)
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
