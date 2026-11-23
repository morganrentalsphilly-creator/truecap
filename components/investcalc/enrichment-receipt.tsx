"use client";

/**
 * Enrichment receipt — the durable, in-flow one-liner under the hero fields
 * (calculator redesign Phase 3, blueprint §1 item 3): "Filled rent (~$1,850
 * /mo HUD SAFMR) for you."
 *
 * THE single notice for an auto-fill (audit A3). It used to complement a
 * corner toast and a note under the preview, so one fill was announced three
 * ways and the rent source was named two ways. The toasts and the note are
 * gone: this line names what was filled, carries the disclosure the toast
 * used to carry, and offers the Undo. It is a polite status region now,
 * because nothing else announces the fill any more.
 *
 * The mortgage rate is not listed. The form opens on the server-read FRED
 * benchmark (audit A2), so nothing "fills" it when an address is picked; its
 * source is on the financing chip.
 *
 * Derivation is data-only: the parent's live enrichment capture (what
 * enrich-property actually wrote this session) plus the lookup facts the last
 * fill wrote, each shown only while the field still holds the written value.
 * Template provenance belongs exclusively in the assumptions strip, where it
 * is checked field-by-field; duplicating it here previously produced
 * contradictory "template applied" and "default" claims. The capture is
 * session-scoped by design — it clears on reset / new address — so restored
 * deals show no false receipt.
 */

import type { UseFormReturn } from "react-hook-form";
import { Check } from "lucide-react";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { unitRentRollWasOverridden } from "@/lib/unit-rent-provenance";

/** Structural view of investcalc-page's EnrichmentCapture ref (value +
 *  source detail per auto-filled field). */
export type EnrichmentReceiptCapture = {
  monthlyRent?: {
    value?: number;
    source: string;
    rentFingerprint?: string;
    invalidated?: boolean;
    /** HUD statewide fallback, not a county, metro or ZIP figure. */
    stateAverage?: boolean;
  };
  interestRate?: { value: number };
};

/** What the most recent auto-fill wrote (investcalc-page's AutofillNotice). */
export type EnrichmentReceiptNotice = {
  entries: ReadonlyArray<{
    field: string;
    /** The receipt's word for a looked-up fact ("baths"); null for rent,
     *  which the capture already describes. */
    label: string | null;
    written: number;
  }>;
  /** The disclosure that goes with the fill. */
  note: string | null;
};

type Props = {
  form: UseFormReturn<InvestmentFormValues>;
  /** Same input-phase gate as LiveVerdictPanel — once results render, the
   *  result-state AssumptionsSourceStrip owns the provenance story. */
  active: boolean;
  /** Read fresh each render (the parent passes its enrichmentCaptureRef). */
  getCapture: () => EnrichmentReceiptCapture;
  /** The last fill, for the looked-up facts, the disclosure and the Undo. */
  notice?: EnrichmentReceiptNotice | null;
  /** Restores what the last fill replaced. */
  onUndo?: () => void;
};

/**
 * `stateAverage` marks the HUD statewide fallback (the unweighted mean of
 * HUD's county and metro-area rows for the state). It is not a Fair Market
 * Rent for any area, so it never wears the FMR or SAFMR label. Same words as
 * the autofill toast.
 */
export function enrichmentRentSourceLabel(
  source: string,
  stateAverage?: boolean,
): string {
  if (source === "rentcast-estimate") return "RentCast estimate";
  if (stateAverage === true && (source === "hud-fmr" || source === "hud-safmr"))
    return "HUD statewide average";
  if (source === "hud-safmr") return "HUD SAFMR";
  if (source === "hud-fmr") return "HUD FMR";
  return "market estimate";
}

/** "a", "a and b", "a, b and c" */
function joinNatural(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function EnrichmentReceipt({
  form,
  active,
  getCapture,
  notice = null,
  onUndo,
}: Props) {
  // Capture is ref-backed, so subscribe to form writes to repaint when a
  // lookup fills rate, tax, or rent without introducing duplicate state.
  form.watch();
  if (!active) return null;

  const capture = getCapture();
  const currentRent = Number(form.getValues("monthlyRent"));
  const sameNumber = (current: number, captured: number) =>
    Number.isFinite(current) && Math.abs(current - captured) < 1e-9;
  const parts: string[] = [];
  if (
    capture.monthlyRent?.value != null &&
    sameNumber(currentRent, capture.monthlyRent.value)
  ) {
    parts.push(
      `rent (~$${Math.round(capture.monthlyRent.value).toLocaleString("en-US")}/mo ${enrichmentRentSourceLabel(capture.monthlyRent.source, capture.monthlyRent.stateAverage)})`,
    );
  } else if (
    capture.monthlyRent?.rentFingerprint &&
    !unitRentRollWasOverridden({
      capturedFingerprint: capture.monthlyRent.rentFingerprint,
      invalidated: capture.monthlyRent.invalidated,
      values: form.getValues(),
    })
  ) {
    parts.push(
      `per-unit rents (${enrichmentRentSourceLabel(capture.monthlyRent.source, capture.monthlyRent.stateAverage)})`,
    );
  }

  // Looked-up facts (beds, baths, size, price): named only while the field
  // still holds what the lookup wrote, like every other line here.
  const values = form.getValues() as unknown as Record<string, unknown>;
  const liveEntries = (notice?.entries ?? []).filter((entry) => {
    const current = entry.field.startsWith("units.")
      ? Number(form.getValues(entry.field as "units.0.monthlyRent"))
      : Number(values[entry.field]);
    return sameNumber(current, entry.written);
  });
  const lookupLabels = liveEntries
    .map((entry) => entry.label)
    .filter((label): label is string => Boolean(label));
  if (lookupLabels.length > 0) {
    parts.push(`${joinNatural(lookupLabels)} (RentCast)`);
  }

  if (parts.length === 0) return null;

  // Undo is offered while at least one value the last fill wrote is still in
  // its field; a fill the visitor has already edited away has nothing to undo.
  const canUndo = Boolean(onUndo) && liveEntries.length > 0;

  return (
    <div
      data-enrichment-receipt=""
      className="flex items-start gap-2 rounded-lg border border-border bg-card/60 px-3 py-1 text-sm leading-snug text-muted-foreground shadow-sm"
    >
      <Check
        className="mt-3.5 size-3.5 shrink-0 text-[var(--metric-positive)]"
        aria-hidden
      />
      {/* role=status: this line is the only announcement of the fill. */}
      <p role="status" className="min-w-0 flex-1 py-2.5">
        <span className="font-semibold text-foreground">
          Filled {joinNatural(parts)} for you.
        </span>
        {canUndo && notice?.note ? ` ${notice.note}` : null}
      </p>
      {canUndo ? (
        <button
          type="button"
          onClick={onUndo}
          aria-label="Undo the auto-fill"
          className="tc-link inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-semibold"
        >
          Undo
        </button>
      ) : null}
    </div>
  );
}
