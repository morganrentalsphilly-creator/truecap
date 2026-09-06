/**
 * Pure chip-builder for the input-side "Starting assumptions" strip.
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
export type AssumptionChipTarget =
  | "property"
  | "financing"
  | "expenses"
  | "extras";

export type AssumptionChipBadge = {
  /** Provenance vocabulary shared with the result-state strip, plus "play"
   *  for values written by an active strategy and "default" for untouched
   *  product starting values. */
  kind: "live" | "hud" | "state" | "yours" | "play" | "template" | "default";
  /** Display text, e.g. "live rate", "PA", "yours", "BRRRR". */
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
  /** Exact control that receives focus after the chip reveals its panel. */
  focusFieldId?: string;
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
  loanTermYears?: unknown;
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
  /** Exact fields the user edited in this or a restored session. This is
   * intentionally per-field: editing HOA must not relabel vacancy or
   * insurance as if the user changed those values. */
  userEditedFields?: ReadonlySet<string>;
  /** Resolved display name for values.templateId (see resolveTemplateName). */
  templateName: string | null;
  /** True when a "What's your play?" strategy is active: the property-type +
   *  template card is unmounted in that mode, so the template chip (and the
   *  non-SF extras chip, whose year-built field is also hidden) drop out. */
  hasActiveStrategy: boolean;
  /** The play whose starter set wrote assumption values (BROWSER-2): chips
   *  whose field is still in ownedFields badge with the play's label — those
   *  values are the PLAY's defaults, not the user's, even though the writes
   *  are RHF-dirty (dirtiness is load-bearing for the template auto-apply).
   *  Null/absent = no play applied this session. */
  strategyPlay?: { label: string; ownedFields: ReadonlySet<string> } | null;
  /** Fields whose current values still match the linked template. A field
   * drops out as soon as the user changes it, so "template" is always a
   * value-bound statement rather than stale click history. */
  templateOwnedFields?: ReadonlySet<string>;
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

export function computeExpensesEdited(
  dirtyFields: Record<string, unknown>,
  /** Fields still owned by an active play's starter set (see
   *  computeStrategyOwnedFields): dirty on purpose but NOT user edits, so
   *  they must not flip the "yours" provenance badge (BROWSER-2). */
  strategyOwnedFields?: ReadonlySet<string>,
): boolean {
  return EXPENSE_EDIT_FIELDS.some(
    (f) => Boolean(dirtyFields[f]) && !strategyOwnedFields?.has(f),
  );
}

/** What an applied "What's your play?" starter set wrote: the play's label
 *  plus the exact field → value record (captured at apply time). */
export type StrategyAppliedSnapshot = {
  label: string;
  fields: Record<string, unknown>;
};

/**
 * Fields still OWNED by the applied play: the current form value equals what
 * the starter wrote (numeric compare, mirroring the enrichment "overridden"
 * check). A user edit diverges the value and drops the field out of the set
 * automatically — the existing dirty-tracking can't make that distinction
 * because the starter writes are dirty on purpose (BROWSER-2).
 */
export function computeStrategyOwnedFields(
  applied: StrategyAppliedSnapshot | null | undefined,
  values: Record<string, unknown>,
): Set<string> {
  const owned = new Set<string>();
  if (!applied) return owned;
  for (const [field, appliedValue] of Object.entries(applied.fields)) {
    const a = num(appliedValue);
    const c = num(values[field]);
    const stillApplied =
      a != null && c != null
        ? Math.abs(a - c) < 1e-9
        : values[field] === appliedValue;
    if (stillApplied) owned.add(field);
  }
  return owned;
}

/** Generic value-bound ownership used for linked templates. Restores,
 * explicit picks and auto-applies all converge on the same rule: a source
 * owns a field only while the current value still equals the value it
 * supplied. */
export function computeValueBoundOwnedFields(
  appliedFields: Record<string, unknown>,
  values: Record<string, unknown>,
): Set<string> {
  return computeStrategyOwnedFields(
    { label: "applied values", fields: appliedFields },
    values,
  );
}

/** templateId → display name: the loaded Pro template list first, then the
 *  saved-deal fallback row (covers editing a saved deal whose template was
 *  deleted or before the list arrives). Null when unresolvable. */
export function resolveTemplateName(
  templateId: string | null | undefined,
  options: ReadonlyArray<{ id: string; templateName: string }>,
  fallback: { id: string; templateName: string } | null | undefined,
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
  opts: AssumptionChipOptions,
): AssumptionChip[] {
  // One vocabulary for sources on both sides of Calculate: reuse the
  // result-strip's entry builder instead of re-deriving manual/auto flags.
  const entries = buildAssumptionEntries(provenance, opts.expensesEdited);
  const rateEntry = entries.find((e) => e.label === "Mortgage rate");
  const taxEntry = entries.find((e) => e.label === "Property tax");

  const chips: AssumptionChip[] = [];

  // A play's starter-written field still at the starter's value badges with
  // the play's label instead of "yours" — those values are the PLAY's
  // defaults, not user edits (BROWSER-2). Enrichment ("live"/"state") still
  // wins where present: it's fresher, address-specific data.
  const play = opts.strategyPlay ?? null;
  const playOwned = (...fields: string[]) =>
    play ? fields.filter((field) => play.ownedFields.has(field)) : [];
  const templateOwned = (...fields: string[]) =>
    fields.filter((field) => opts.templateOwnedFields?.has(field));
  const userEdited = (...fields: string[]) =>
    fields.some((field) => opts.userEditedFields?.has(field));
  const templateBadge: AssumptionChipBadge = {
    kind: "template",
    text: "template",
  };

  // ── Financing: "20% down @ 6.9%" (+ "live rate" when FRED-filled) ──────
  const down = num(values.downPaymentPct);
  const rate = num(values.interestRate);
  const term = num(values.loanTermYears);
  const rateIsLive = Boolean(rateEntry && !rateEntry.manual);
  const templateFinancing = templateOwned("downPaymentPct", "interestRate");
  const playFinancing = playOwned("downPaymentPct", "interestRate");
  const financingIsCustom =
    userEdited("downPaymentPct", "interestRate", "loanTermYears") ||
    down !== 20 ||
    rate !== 6.75 ||
    term !== 30;
  const scopedFinancingSource = (
    fields: string[],
    source: "template" | "play",
  ): AssumptionChipBadge | null => {
    if (fields.length === 0) return null;
    const detail =
      fields.length === 2
        ? "down + rate"
        : fields[0] === "interestRate"
          ? "rate"
          : "down";
    return source === "template"
      ? { kind: "template", text: `template ${detail}` }
      : play
        ? { kind: "play", text: `${play.label}: ${detail}` }
        : null;
  };
  chips.push({
    id: "financing",
    label:
      down != null && rate != null
        ? `${fmtPct(down)}% down · ${fmtPct(rate)}% interest${term != null ? ` · ${fmtPct(term)} years` : ""}`
        : "Financing —",
    badge: rateIsLive
      ? { kind: "live", text: "live rate" }
      : (scopedFinancingSource(templateFinancing, "template") ??
        scopedFinancingSource(playFinancing, "play") ??
        (provenance.interestRate || financingIsCustom
          ? { kind: "yours", text: "custom financing" }
          : { kind: "default", text: "TrueCap default" })),
    target: "financing",
    focusFieldId: "downPaymentPct",
    pulseKey: rateIsLive ? "rate:fred" : null,
  });

  // ── Taxes: percent, or the typed annual bill when that mode wins ───────
  const taxAnnual = num(values.propertyTaxAnnual);
  const taxAnnualMode =
    values.propertyTaxInputMode === "annual" && taxAnnual != null;
  const taxIsState = Boolean(taxEntry && !taxEntry.manual);
  const taxUsesGenericFallback =
    !taxAnnualMode && num(values.propertyTaxPct) == null;
  const templateOwnsActiveTax =
    !taxAnnualMode && templateOwned("propertyTaxPct").length === 1;
  const playOwnsActiveTax =
    !taxAnnualMode && playOwned("propertyTaxPct").length === 1;
  const taxIsCustom =
    taxAnnualMode ||
    userEdited("propertyTaxPct", "propertyTaxAnnual", "propertyTaxInputMode") ||
    (num(values.propertyTaxPct) ?? 1.1) !== 1.1;
  chips.push({
    id: "taxes",
    label: taxAnnualMode
      ? `Taxes $${fmtMoney(taxAnnual)}/yr`
      : taxUsesGenericFallback
        ? "Taxes 1.1% default"
        : `Taxes ${fmtPct(num(values.propertyTaxPct) ?? 1.1)}% of price/year`,
    badge: taxIsState
      ? {
          kind: "state",
          text: `legacy ${provenance.propertyTaxPct?.detail ?? "state"} estimate · verify locally`,
        }
      : templateOwnsActiveTax
        ? templateBadge
        : playOwnsActiveTax && play
          ? { kind: "play", text: play.label }
          : provenance.propertyTaxPct || taxIsCustom
            ? { kind: "yours", text: "yours" }
            : { kind: "default", text: "replace with your local number" },
    target: "expenses",
    focusFieldId: "propertyTaxAmount",
    pulseKey: null,
  });

  // ── Insurance + vacancy: smart defaults unless the user edited them ────
  // Never use the result strip's aggregate "expenses were edited" flag to
  // label a specific chip. Each visible value owns its own provenance.
  const insMo = num(values.insuranceMonthly);
  const insuranceUsesMonthly =
    values.insuranceInputMode === "monthly" && insMo != null;
  const activeInsuranceField = insuranceUsesMonthly
    ? "insuranceMonthly"
    : "insurancePct";
  const templateOwnsActiveInsurance =
    templateOwned(activeInsuranceField).length === 1;
  const playOwnsActiveInsurance = playOwned(activeInsuranceField).length === 1;
  const insuranceIsCustom =
    insuranceUsesMonthly ||
    userEdited("insuranceInputMode", activeInsuranceField) ||
    (num(values.insurancePct) ?? 0.5) !== 0.5;
  chips.push({
    id: "insurance",
    label:
      values.insuranceInputMode === "monthly" && insMo != null
        ? `Insurance $${fmtMoney(insMo)}/mo`
        : `Insurance ${fmtPct(num(values.insurancePct) ?? 0.5)}% of price/year`,
    badge: templateOwnsActiveInsurance
      ? templateBadge
      : playOwnsActiveInsurance && play
        ? { kind: "play", text: play.label }
        : insuranceIsCustom
          ? { kind: "yours", text: "yours" }
          : { kind: "default", text: "TrueCap default" },
    target: "expenses",
    focusFieldId: "insuranceAmount",
    pulseKey: null,
  });
  chips.push({
    id: "vacancy",
    label: `Vacancy ${fmtPct(num(values.vacancyPct) ?? 5)}% of rent`,
    badge:
      templateOwned("vacancyPct").length === 1
        ? templateBadge
        : playOwned("vacancyPct").length === 1 && play
          ? { kind: "play", text: play.label }
          : userEdited("vacancyPct") || (num(values.vacancyPct) ?? 5) !== 5
            ? { kind: "yours", text: "yours" }
            : { kind: "default", text: "TrueCap default" },
    target: "expenses",
    focusFieldId: "vacancyPct",
    pulseKey: null,
  });

  // ── Template: only when a template is linked and its card is mounted ───
  if (values.templateId && !opts.hasActiveStrategy) {
    const templateStillOwnsValues = (opts.templateOwnedFields?.size ?? 0) > 0;
    chips.push({
      id: "template",
      label: `${templateStillOwnsValues ? "Template" : "Template reference"}: ${opts.templateName ?? "unavailable"}`,
      badge: null,
      applied: templateStillOwnsValues,
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
    if (yearBuiltEditable && yearBuilt != null && yearBuilt > 0)
      parts.push(`Built ${yearBuilt}`);
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
