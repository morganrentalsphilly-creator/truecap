"use client";

/**
 * Inline listing-URL entry for the hero's address group (calculator redesign
 * Phase 4, blueprint §1 input item 1 + §3 listing-link-input row).
 *
 * EXTRACTED from the standalone "Paste a listing link" dashed card that used
 * to render above the form in investcalc-page.tsx — same input id, copy,
 * Enter-to-submit and error state; only the chrome changed. Closed: a
 * one-line text toggle ("Use a listing link to fill the address") under the address
 * input. Open: the URL row swaps IN for the address input (the parent
 * CSS-hides the address block — it stays MOUNTED so RHF registration and
 * enrichment writes are untouched) with a "Use the address instead" toggle
 * back. The parse → hero-handoff → enrichment behavior lives in the parent
 * (handleListingUrl), unchanged.
 *
 * FOCUS HANDOFF (verifier live-repro: both toggles unmounted the clicked
 * button and dropped document.activeElement to <body>, stranding keyboard /
 * screen-reader users at the top of the page): opening focuses the revealed
 * #listing-url input; closing focuses the restored #address input. Deferred
 * one frame so the target is mounted/visible when focus lands.
 */

import { useEffect, useRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { ListingImportMissingField } from "@/lib/hero-handoff";

type ListingLinkInputProps = {
  /** URL-row visibility. Controlled by the parent, which mirrors it to
   *  CSS-hide the address input while the row is open. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  /** Parse failed — show the recovery line (the parent clears it on edit). */
  hasError: boolean;
  /** Parse + hero-handoff (the parent's existing handleListingUrl). */
  onSubmit: () => void;
  /** Durable state for the listing address most recently handed to the form. */
  importStatus?: {
    phase: "looking-up" | "needs-input";
    missingFields: ListingImportMissingField[];
  } | null;
  /** Continue at the first input the listing could not provide. */
  onFocusMissingField?: (path: string) => void;
};

function formatMissingFields(fields: ListingImportMissingField[]) {
  const labels = fields.map((field) => field.label);
  if (labels.length <= 1) return labels[0] ?? "required deal inputs";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export function ListingLinkInput({
  open,
  onOpenChange,
  value,
  onValueChange,
  hasError,
  onSubmit,
  importStatus,
  onFocusMissingField,
}: ListingLinkInputProps) {
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  // Focus follows the toggle, but ONLY on user-driven transitions (tracked
  // via the previous open value) — never on mount, so a draft restore that
  // happens to render the row doesn't steal focus from the page.
  const prevOpenRef = useRef(open);
  useEffect(() => {
    const prev = prevOpenRef.current;
    prevOpenRef.current = open;
    if (prev === open) return;
    // Synchronous focus: the DOM is committed before effects run, so the
    // revealed control already exists. (Deliberately NOT rAF-deferred —
    // hidden/backgrounded tabs throttle rAF indefinitely, which silently
    // dropped the focus handoff.)
    if (open) {
      urlInputRef.current?.focus();
    } else {
      document.getElementById("address")?.focus();
    }
  }, [open]);

  const firstMissingField = importStatus?.missingFields[0];
  const importStatusPanel = importStatus ? (
    <div className="mb-2 rounded-xl border border-primary/30 bg-[var(--brand-blue-light)] px-3 py-3 text-sm">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="flex items-start gap-2"
      >
        {importStatus.phase === "looking-up" ? (
          <Loader2
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 animate-spin text-primary"
          />
        ) : (
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-primary"
          />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Address extracted</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {importStatus.phase === "looking-up"
              ? "Looking up available starting assumptions. We’ll keep every value editable."
              : `Still needed: ${formatMissingFields(importStatus.missingFields)}.`}
          </p>
        </div>
      </div>
      {importStatus.phase === "needs-input" && firstMissingField ? (
        <button
          type="button"
          onClick={() => onFocusMissingField?.(firstMissingField.path)}
          className="mt-2 inline-flex min-h-11 max-w-full items-center rounded-lg border border-primary/30 bg-background px-3 py-2 text-left text-xs font-semibold text-primary shadow-sm hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Continue with {firstMissingField.label}
        </button>
      ) : null}
    </div>
  ) : null;

  if (!open) {
    return (
      <div className="mt-2">
        {importStatusPanel}
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="inline-flex min-h-11 max-w-full items-center whitespace-normal py-2 text-left text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {importStatus
            ? "Use a different listing link"
            : "Use a listing link to fill the address"}
        </button>
      </div>
    );
  }

  return (
    <div>
      {importStatusPanel}
      <label
        htmlFor="listing-url"
        className="text-xs font-semibold text-foreground"
      >
        Paste a listing link
      </label>
      <p
        id="listing-url-help"
        className="mt-0.5 text-[11px] text-muted-foreground"
      >
        Zillow, Redfin, or Realtor.com — TrueCap extracts the address. When
        available, a signed-in lookup can also fill the active asking price and
        property facts; other values remain labeled estimates. It never imports
        listing photos, seller claims, or the actual tax bill. Review every
        value before relying on it.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          id="listing-url"
          ref={urlInputRef}
          type="url"
          inputMode="url"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="https://www.zillow.com/homedetails/…"
          aria-invalid={hasError || undefined}
          aria-describedby={
            hasError ? "listing-url-help listing-url-error" : "listing-url-help"
          }
          className="min-h-11 min-w-0 flex-[1_1_18rem] rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim()}
          className="min-h-11 max-w-full shrink-0 whitespace-normal rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use address from link
        </button>
      </div>
      {hasError ? (
        <p
          id="listing-url-error"
          role="alert"
          aria-live="assertive"
          className="mt-1.5 text-[11px] text-[var(--metric-negative,#dc2626)]"
        >
          Couldn&apos;t read that link — type the full property address instead.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="mt-2 inline-flex min-h-11 max-w-full items-center whitespace-normal py-2 text-left text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Use the address instead
      </button>
    </div>
  );
}
