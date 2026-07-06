"use client";

/**
 * Enrichment receipt — the durable, in-flow one-liner under the hero fields
 * (calculator redesign Phase 3, blueprint §1 item 3): "Filled rate (6.9%
 * FRED), taxes (1.31% PA) and rent (~$1,850 HUD) for you."
 *
 * Toasts are RETAINED — this complements them as the persistent record so
 * the smart defaults get visible credit after the toast evicts.
 *
 * Derivation is data-only: the parent's live enrichment capture (what
 * enrich-property actually wrote this session) + the template link on the
 * watched form (templateId → resolved name). No click history. The capture
 * is session-scoped by design — it clears on reset / new address — so draft
 * restores and saved-deal loads (where nothing "fired") show no receipt.
 *
 * Deliberately NOT an aria-live region: the enrichment toast already
 * announces the same fill to screen readers; a second live region would
 * double-speak every autofill.
 */

import type { UseFormReturn } from "react-hook-form";
import { Check } from "lucide-react";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { resolveTemplateName } from "@/lib/assumption-chips";

/** Structural view of investcalc-page's EnrichmentCapture ref (value +
 *  source detail per auto-filled field). */
export type EnrichmentReceiptCapture = {
  monthlyRent?: { value: number; source: string };
  interestRate?: { value: number };
  propertyTaxPct?: { value: number; detail?: string };
};

type Props = {
  form: UseFormReturn<InvestmentFormValues>;
  /** Same input-phase gate as LiveVerdictPanel — once results render, the
   *  result-state AssumptionsSourceStrip owns the provenance story. */
  active: boolean;
  /** Read fresh each render (the parent passes its enrichmentCaptureRef). */
  getCapture: () => EnrichmentReceiptCapture;
  templateOptions: ReadonlyArray<{ id: string; templateName: string }>;
  savedTemplateFallback: { id: string; templateName: string } | null;
  /** Mirrors the strip's template-chip gate: with a strategy active the
   *  template chip is hidden (its edit target is unmounted) and the
   *  starter assumptions overwrote the template's values — so the
   *  receipt must not point at a chip that doesn't exist. */
  hasActiveStrategy?: boolean;
};

const fmtPct = (n: number) => String(Number(n.toFixed(2)));

/** "a", "a and b", "a, b and c" */
function joinNatural(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function EnrichmentReceipt({
  form,
  active,
  getCapture,
  templateOptions,
  savedTemplateFallback,
  hasActiveStrategy = false,
}: Props) {
  // Subscribe to form writes so the receipt appears the moment enrichment /
  // template auto-apply setValue-writes land (capture mutations always ride
  // along with those writes). Isolated re-render, SaveAsDefaultsChip pattern.
  form.watch();
  if (!active) return null;

  const capture = getCapture();
  const parts: string[] = [];
  if (capture.interestRate) parts.push(`rate (${fmtPct(capture.interestRate.value)}% FRED)`);
  if (capture.propertyTaxPct) {
    const detail = capture.propertyTaxPct.detail ? ` ${capture.propertyTaxPct.detail}` : "";
    parts.push(`taxes (${fmtPct(capture.propertyTaxPct.value)}%${detail})`);
  }
  if (capture.monthlyRent) {
    parts.push(`rent (~$${Math.round(capture.monthlyRent.value).toLocaleString("en-US")}/mo HUD)`);
  }

  // Strategy mode: the template chip is dropped from the strip and the
  // starter assumptions overwrote the template's values — claiming
  // "Template applied" would point at a chip that doesn't exist.
  const templateName = hasActiveStrategy
    ? null
    : resolveTemplateName(form.getValues("templateId"), templateOptions, savedTemplateFallback);

  if (parts.length === 0 && !templateName) return null;

  const segments = [
    parts.length > 0 ? `Filled ${joinNatural(parts)} for you` : null,
    templateName ? `Template "${templateName}" applied` : null,
  ].filter(Boolean);

  return (
    <p className="flex items-start gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground shadow-sm">
      <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--metric-positive)]" aria-hidden />
      <span className="min-w-0">
        <span className="font-semibold text-foreground">{segments.join(" · ")}</span>
        {" — tap a chip below to change anything."}
      </span>
    </p>
  );
}
