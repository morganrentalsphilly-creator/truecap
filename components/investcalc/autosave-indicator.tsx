"use client";

/**
 * Live "Auto-saved · Xs ago" indicator for the analyzer form.
 *
 * The form already persists draft state to localStorage on field
 * changes (see investcalc-page.tsx — the "Welcome back" banner is
 * proof). This component just surfaces that the save is happening, so
 * users on long forms trust that closing the tab won't lose their
 * work. Without a visible signal, that's the kind of friction that
 * makes someone copy values into a spreadsheet "as a backup."
 *
 * The component subscribes to the form's `watch()` stream and re-times
 * itself when any field changes. Display ticks every 5s so the
 * "X seconds ago" relative time stays current without rendering on
 * every key press.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

type Props = {
  form: UseFormReturn<InvestmentFormValues>;
};

export function AutosaveIndicator({ form }: Props) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [, setTick] = useState(0);

  // Watch the form for any change. RHF's watch() subscribe overload fires
  // on every field update; we use it as a "field changed" trigger. The
  // persistence itself happens in investcalc-page (the localStorage draft
  // writer). This component is only mounted when that writer is active
  // (anonymous / new-deal sessions, gated at the call site), so the
  // "Auto-saved" claim is always truthful.
  //
  // The debounce timer lives in a ref, not a closure: RHF does NOT consume
  // a cleanup returned from the watch callback, so returning clearTimeout
  // there leaks a timer per keystroke (and defeats the debounce). Clearing
  // the prior ref-held timer each change is the correct pattern.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsSaving(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsSaving(false);
        setSavedAt(Date.now());
      }, 600);
    });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      subscription.unsubscribe();
    };
  }, [form]);

  // Re-render every 5s so "X seconds ago" stays current.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 5_000);
    return () => clearInterval(id);
  }, []);

  // Nothing to show until at least one save fires (avoids "Auto-saved
  // just now" appearing on first paint before the user has touched
  // anything).
  if (savedAt === null && !isSaving) return null;

  const relative = (() => {
    if (savedAt === null) return "saving…";
    const sec = Math.max(0, Math.round((Date.now() - savedAt) / 1000));
    if (sec < 5) return "just now";
    if (sec < 60) return `${sec}s ago`;
    const min = Math.round(sec / 60);
    return `${min}m ago`;
  })();

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
      aria-live="polite"
    >
      {isSaving ? (
        <>
          <Loader2 className="size-3 animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <Check className="size-3 text-[var(--brand-green)]" />
          Auto-saved · {relative}
        </>
      )}
    </span>
  );
}
