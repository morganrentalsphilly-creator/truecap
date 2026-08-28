"use client";

/**
 * Enrichment receipt — the durable, in-flow one-liner under the hero fields
 * (calculator redesign Phase 3, blueprint §1 item 3): "Filled rate (6.9%
 * FRED) and rent (~$1,850 HUD) for you."
 *
 * Toasts are RETAINED — this complements them as the persistent record so
 * the smart defaults get visible credit after the toast evicts.
 *
 * Derivation is data-only: the parent's live enrichment capture (what
 * enrich-property actually wrote this session). Template provenance belongs
 * exclusively in the assumptions strip, where it is checked field-by-field;
 * duplicating it here previously produced contradictory "template applied"
 * and "default" claims. The capture is session-scoped by design — it clears
 * on reset / new address — so restored deals show no false receipt.
 *
 * Deliberately NOT an aria-live region: the enrichment toast already
 * announces the same fill to screen readers; a second live region would
 * double-speak every autofill.
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
  };
  interestRate?: { value: number };
};

type Props = {
  form: UseFormReturn<InvestmentFormValues>;
  /** Same input-phase gate as LiveVerdictPanel — once results render, the
   *  result-state AssumptionsSourceStrip owns the provenance story. */
  active: boolean;
  /** Read fresh each render (the parent passes its enrichmentCaptureRef). */
  getCapture: () => EnrichmentReceiptCapture;
};

const fmtPct = (n: number) => String(Number(n.toFixed(2)));

export function enrichmentRentSourceLabel(source: string): string {
  if (source === "rentcast-estimate") return "RentCast estimate";
  if (source === "hud-safmr") return "HUD SAFMR";
  if (source === "hud-fmr") return "HUD FMR";
  return "market estimate";
}

/** "a", "a and b", "a, b and c" */
function joinNatural(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function EnrichmentReceipt({ form, active, getCapture }: Props) {
  // Capture is ref-backed, so subscribe to form writes to repaint when a
  // lookup fills rate, tax, or rent without introducing duplicate state.
  form.watch();
  if (!active) return null;

  const capture = getCapture();
  const currentRate = Number(form.getValues("interestRate"));
  const currentRent = Number(form.getValues("monthlyRent"));
  const sameNumber = (current: number, captured: number) =>
    Number.isFinite(current) && Math.abs(current - captured) < 1e-9;
  const parts: string[] = [];
  if (
    capture.interestRate &&
    sameNumber(currentRate, capture.interestRate.value)
  ) {
    parts.push(`rate (${fmtPct(capture.interestRate.value)}% FRED benchmark)`);
  }
  if (
    capture.monthlyRent?.value != null &&
    sameNumber(currentRent, capture.monthlyRent.value)
  ) {
    parts.push(
      `rent (~$${Math.round(capture.monthlyRent.value).toLocaleString("en-US")}/mo ${enrichmentRentSourceLabel(capture.monthlyRent.source)})`,
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
      `per-unit rents (${enrichmentRentSourceLabel(capture.monthlyRent.source)})`,
    );
  }

  if (parts.length === 0) return null;

  return (
    <p className="flex items-start gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground shadow-sm">
      <Check
        className="mt-0.5 size-3.5 shrink-0 text-[var(--metric-positive)]"
        aria-hidden
      />
      <span className="min-w-0">
        <span className="font-semibold text-foreground">
          Filled {joinNatural(parts)} for you
        </span>
        {" — tap a chip below to change anything."}
      </span>
    </p>
  );
}
