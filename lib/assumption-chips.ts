/**
 * Pure chip-builder for the input-side "Your assumptions — already filled in"
 * strip (calculator redesign Phase 3, blueprint §1 item 4).
 *
 * DATA-DERIVED-STATE INVARIANT (blueprint, non-negotiable): every chip is
 * computed ONLY from the current form values + the live enrichment
 * provenance — never from click history or "how the value arrived". A deal
 * restored from a draft, loaded from saved deals, Duplicated, filled by a
 * template, or hand-typed must all produce identical chips for identical
 * values. That's why this module is pure and unit-tested
 * (lib/__tests__/assumption-chips.test.ts).
 *
 * Source badges reuse the exact provenance vocabulary the result-state
 * trust strip already ships (live / HUD / state / yours) by deriving them
 * from the SAME `buildAssumptionEntries()` the strip uses — one truth for
 * "where did this number come from" on both sides of Calculate.
 *
 * Value fallbacks mirror lib/calc-analysis.ts exactly (propertyTaxPct ?? 1.1,
 * insurancePct ?? 0.5, annual-$ tax bill wins over the percent) so a chip
 * never displays a number the engine wouldn't actually use.
 */

import { buildAssumptionEntries } from "@/components/investcalc/assumptions-source-strip";
import type { EnrichmentProvenanceInput } from "@/lib/data-confidence";

/** Where a chip tap navigates. All but "extras" are AnalyzerStepId values
 *  (the chip reuses the exact handleStepNavigate mechanics); "extras" is the
 *  bathrooms/sqft block inside the advanced region (#step-extras), which has
 *  no analyzer step of its own. */
export type AssumptionChipTarget = "property" | "financing" | "expenses" | "extras";

export type AssumptionChipBadge = {
  /** Provenance vocabulary shared with the result-state strip. */
  kind: "live" | "hud" | "state" | "yours";
  /** Display text, e.g. "live rate", "PA", "yours". */
  text: string;
};

export type AssumptionChip = {
  id: "financing" | "taxes" | "insurance" | "vacancy" | "template" | "extras";
  /** Full chip text, e.g. "20% down @ 6.9%" or "Taxes 1.31%". */
  label: string;
  badge: AssumptionChipBadge | null;
  /** Template chip renders a ✓ when true. */
  applied?: boolean;
  target: AssumptionChipTarget;
  /**
   * Changes exactly when an auto-fill lands on this chip (enrichment writes
   * its provenance / a template links its id). The strip pulses a chip when
   * its pulseKey transitions — mount baselines first, so programmatic loads
   * (draft restore, saved-deal edit, Duplicate) never pulse.
   */
  pulseKey: string | null;
};

/** Loose structural subset of InvestmentFormValues — RHF can transiently
 *  yield NaN / strings on numeric fields, so everything is coerced here. */
export type AssumptionChipValues = {
  propertyType?: string;
  downPaymentPct?: unknown;
  interestRate?: unknown;
  propertyTaxInputMode?: string;
  propertyTaxPct?: unknown;
  propertyTaxAnnual?: unknown;
  insuranceInputMode?: string;
  insurancePct?: unknown;
  insuranceMonthly?: unknown;
  vacancyPct?: unknown;
  yearBuilt?: unknown;
  bathrooms?: unknown;
  sqft?: unknown;
  templateId?: string | null;
};

export type AssumptionChipOptions = {
  /** True when the user touched any operating-expense field (same flag the
   *  result strip receives) — flips insurance/vacancy badges to "yours". */
  expensesEdited: boolean;
  /** Resolved display name for values.templateId (see resolveTemplateName). */
  templateName: string | null;
  /** True when a "What's your play?" strategy is active: the property-type +
   *  template card is unmounted in that mode, so the template chip (and the
   *  non-SF extras chip, whose year-built field is also hidden) drop out. */
  hasActiveStrategy: boolean;
};

/** Number-or-null coercion for RHF values (NaN / "" / non-numeric → null). */
function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : v == null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** "6.90" → "6.9", "20.00" → "20" — chip-compact percentages. */
function fmtPct(n: number): string {
  return String(Number(n.toFixed(2)));
}

function fmtMoney(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** The operating-expense fields whose RHF dirty state means "the user edited
 *  expenses" — the exact list investcalc-page passes the result strip. */
export const EXPENSE_EDIT_FIELDS = [
  "insuranceMonthly",
  "insurancePct",
  "maintenancePct",
  "mgmtPct",
  "vacancyPct",
  "capexPct",
  "utilitiesMonthly",
  "hoaMonthly",
] as const;

export function computeExpensesEdited(dirtyFields: Record<string, unknown>): boolean {
  return EXPENSE_EDIT_FIELDS.some((f) => Boolean(dirtyFields[f]));
}

/** templateId → display name: the loaded Pro template list first, then the
 *  saved-deal fallback row (covers editing a saved deal whose template was
 *  deleted or before the list arrives). Null when unresolvable. */
export function resolveTemplateName(
  templateId: string | null | undefined,
  options: ReadonlyArray<{ id: string; templateName: string }>,
  fallback: { id: string; templateName: string } | null | undefined
): string | null {
  if (!templateId) return null;
  const match = options.find((t) => t.id === templateId);
  if (match) return match.templateName;
  if (fallback && fallback.id === templateId) return fallback.templateName;
  return null;
}

export function buildAssumptionChips(
  values: AssumptionChipValues,
  provenance: EnrichmentProvenanceInput,
  opts: AssumptionChipOptions
): AssumptionChip[] {
  // One vocabulary for sources on both sides of Calculate: reuse the
  // result-strip's entry builder instead of re-deriving manual/auto flags.
  const entries = buildAssumptionEntries(provenance, opts.expensesEdited);
  const rateEntry = entries.find((e) => e.label === "Mortgage rate");
  const taxEntry = entries.find((e) => e.label === "Property tax");
  const expensesEntry = entries.find((e) => e.label === "Expenses");

  const chips: AssumptionChip[] = [];

  // ── Financing: "20% down @ 6.9%" (+ "live rate" when FRED-filled) ──────
  const down = num(values.downPaymentPct);
  const rate = num(values.interestRate);
  const rateIsLive = Boolean(rateEntry && !rateEntry.manual);
  chips.push({
    id: "financing",
    label:
      down != null && rate != null
        ? `${fmtPct(down)}% down @ ${fmtPct(rate)}%`
        : "Financing —",
    badge: rateIsLive
      ? { kind: "live", text: "live rate" }
      : provenance.interestRate
        ? { kind: "yours", text: "yours" }
        : null,
    target: "financing",
    pulseKey: rateIsLive ? "rate:fred" : null,
  });

  // ── Taxes: percent, or the typed annual bill when that mode wins ───────
  const taxAnnual = num(values.propertyTaxAnnual);
  const taxAnnualMode = values.propertyTaxInputMode === "annual" && taxAnnual != null;
  const taxIsState = Boolean(taxEntry && !taxEntry.manual);
  chips.push({
    id: "taxes",
    label: taxAnnualMode
      ? `Taxes $${fmtMoney(taxAnnual)}/yr`
      : `Taxes ${fmtPct(num(values.propertyTaxPct) ?? 1.1)}%`,
    badge: taxIsState
      ? { kind: "state", text: provenance.propertyTaxPct?.detail ?? "state" }
      : provenance.propertyTaxPct
        ? { kind: "yours", text: "yours" }
        : null,
    target: "expenses",
    pulseKey: taxIsState ? "tax:state" : null,
  });

  // ── Insurance + vacancy: smart defaults unless the user edited them ────
  const expensesYours = Boolean(expensesEntry?.manual);
  const insMo = num(values.insuranceMonthly);
  chips.push({
    id: "insurance",
    label:
      values.insuranceInputMode === "monthly" && insMo != null
        ? `Insurance $${fmtMoney(insMo)}/mo`
        : `Insurance ${fmtPct(num(values.insurancePct) ?? 0.5)}%`,
    badge: expensesYours ? { kind: "yours", text: "yours" } : null,
    target: "expenses",
    pulseKey: null,
  });
  chips.push({
    id: "vacancy",
    label: `Vacancy ${fmtPct(num(values.vacancyPct) ?? 5)}%`,
    badge: expensesYours ? { kind: "yours", text: "yours" } : null,
    target: "expenses",
    pulseKey: null,
  });

  // ── Template: only when a template is linked and its card is mounted ───
  if (values.templateId && !opts.hasActiveStrategy) {
    chips.push({
      id: "template",
      label: `Template: ${opts.templateName ?? "applied"}`,
      badge: null,
      applied: true,
      target: "property",
      pulseKey: `tpl:${values.templateId}`,
    });
  }

  // ── Property extras: year built / baths / sqft ("—" when empty) ────────
  const isSingleFamily = values.propertyType === "single-family";
  if (isSingleFamily || !opts.hasActiveStrategy) {
    const yearBuilt = num(values.yearBuilt);
    const parts: string[] = [];
    // SF strategy mode hides the year-built input (showYearBuilt gates on
    // !activeStrategy) and #step-extras only holds baths/sqft — don't
    // advertise a value the user can't edit where the tap lands.
    const yearBuiltEditable = !(isSingleFamily && opts.hasActiveStrategy);
    if (yearBuiltEditable && yearBuilt != null && yearBuilt > 0) parts.push(`Built ${yearBuilt}`);
    if (isSingleFamily) {
      const baths = num(values.bathrooms);
      const sqft = num(values.sqft);
      if (baths != null && baths > 0) parts.push(`${fmtPct(baths)} ba`);
      if (sqft != null && sqft > 0) parts.push(`${fmtMoney(sqft)} sq ft`);
    }
    chips.push({
      id: "extras",
      label: `Property extras: ${parts.length > 0 ? parts.join(" · ") : "—"}`,
      badge: null,
      // SF baths/sqft live in the advanced block (#step-extras); for MF /
      // house-hack the only extra (year built) renders in the property card.
      target: isSingleFamily ? "extras" : "property",
      pulseKey: null,
    });
  }

  return chips;
}
