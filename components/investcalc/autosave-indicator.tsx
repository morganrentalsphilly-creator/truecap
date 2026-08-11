"use client";

/**
 * Live "Auto-saved · Xs ago" indicator for the analyzer form.
 *
 * The form already persists draft state to localStorage on field
 * changes (see investcalc-page.tsx - the "Welcome back" banner is
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
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

type Props = {
  form: UseFormReturn<InvestmentFormValues>;
};

/**
 * The real draft write (investcalc-page's writeCalcDraftRaw) SWALLOWS storage
 * failures — private-mode Safari, storage disabled, quota exceeded — as a
 * best-effort no-op. This indicator used to claim "Auto-saved" unconditionally
 * off a debounce timer, so it lied whenever that write threw: it reassured the
 * user their work was persisted on exactly the browsers (mobile private mode is
 * common in paid traffic) where it wasn't.
 *
 * Probe storage writability with a throwaway sentinel each time we're about to
 * assert a save. It catches the same failure modes the real writer swallows, so
 * we can downgrade to an honest "Not saved" instead of a false reassurance. (A
 * sentinel can't detect a quota failure that only trips on a large payload, but
 * it eliminates the systematic lie.)
 */
function isLocalStorageWritable(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const probeKey = "truecap:autosave-probe";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export function AutosaveIndicator({ form }: Props) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // True when the last save tick found storage unwritable — drives the honest
  // "Not saved" state instead of the "Auto-saved" reassurance.
  const [saveFailed, setSaveFailed] = useState(false);
  const [, setTick] = useState(0);

  // Watch the form for any change. RHF's watch() subscribe overload fires
  // on every field update; we use it as a "field changed" trigger. The
  // persistence itself happens in investcalc-page (the localStorage draft
  // writer). This component is only mounted when that writer is active
  // (anonymous / new-deal sessions, gated at the call site); the storage
  // probe on the debounce tick keeps the "Auto-saved" claim honest when the
  // writer's swallowed failure would otherwise make it a lie.
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
        // Only claim "Auto-saved" if storage is actually writable — matching the
        // best-effort writer this indicator mirrors. Otherwise show "Not saved".
        const writable = isLocalStorageWritable();
        setIsSaving(false);
        setSaveFailed(!writable);
        setSavedAt(writable ? Date.now() : null);
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
  // anything). A detected save failure is also worth surfacing.
  if (savedAt === null && !isSaving && !saveFailed) return null;

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
      ) : saveFailed ? (
        <span className="inline-flex items-center gap-1.5 text-[var(--metric-negative,#dc2626)]">
          <AlertTriangle className="size-3" />
          Not saved — your browser is blocking local storage
        </span>
      ) : (
        <>
          <Check className="size-3 text-[var(--brand-green)]" />
          Auto-saved · {relative}
        </>
      )}
    </span>
  );
}
