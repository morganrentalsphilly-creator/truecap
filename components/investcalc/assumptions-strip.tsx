"use client";

/**
 * "Starting assumptions" — the input-side assumptions strip
 * (calculator redesign Phase 3, blueprint §1 item 4).
 *
 * The chips state every pre-answered value as a settled fact with its
 * source. Tapping one opens a small popover editor for THAT chip's fields
 * (assumption-chip-editor.tsx), bound to the same form state and validation
 * as the full section (2026-11 audit B1). A chip used to open the whole
 * advanced region (about 45 inputs) and scroll some 1,500px to one field.
 * The full region now opens only from its own toggle in this card's header,
 * "Show all assumptions" / "Hide all assumptions", or from the "Open in all
 * assumptions" link inside a chip's editor. The advanced block itself is
 * untouched: every section stays MOUNTED with live RHF registration.
 *
 * DATA-DERIVED-STATE INVARIANT: chip content comes exclusively from watched
 * form values + the live enrichment provenance via the pure
 * buildAssumptionChips() (lib/assumption-chips.ts) — never click history —
 * so drafts, saved-deal edits, Duplicate, templates, sample deals, and
 * hand-typed values all render identical, fully-populated chips.
 *
 * Pulse: a chip briefly highlights when its auto-filled value ARRIVES
 * (enrichment / template auto-apply). Arrival is detected as a pulseKey
 * transition against a baseline recorded on mount, so programmatic restores
 * that land before first paint never pulse.
 *
 * Strategy selection lives in the initial setup above this strip; this card
 * stays focused on progressive disclosure of the assumptions it produced.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AssumptionChipEditor,
  isEditableChipId,
  type EditableChipId,
} from "@/components/investcalc/assumption-chip-editor";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { EnrichmentProvenanceInput } from "@/lib/data-confidence";
import {
  buildAssumptionChips,
  computeExpensesEdited,
  computeStrategyOwnedFields,
  computeValueBoundOwnedFields,
  resolveTemplateName,
  type AssumptionChip,
  type AssumptionChipTarget,
  type StrategyAppliedSnapshot,
} from "@/lib/assumption-chips";
import {
  buildTemplateFormPatch,
  type TemplateAssumptionSource,
} from "@/lib/template-form-patch";
import { getStrategyByKey } from "@/lib/investor-strategies";
import { shouldPromptForHoa } from "@/components/investcalc/address-shape";
import { cn } from "@/lib/utils";

const PULSE_MS = 1600;

/** A chip the strip renders: one from buildAssumptionChips, or the strip's
 *  own HOA prompt (which has no entry in the lib's id union). */
type StripChip = Omit<AssumptionChip, "id"> & { id: string };

type Props = {
  form: UseFormReturn<InvestmentFormValues>;
  /** Live per-field provenance, read fresh each render (the parent wraps its
   *  enrichmentCaptureRef + buildProvenanceInput — same input the result
   *  strip and confidence badge use). */
  getProvenance: () => EnrichmentProvenanceInput;
  /** Value-bound edit provenance restored from a saved deal, merged with
   * current RHF dirty fields by the parent. Keeps reopened expense chips
   * honest without treating every reset value as a user edit. */
  getTouchedInputFields?: () => readonly string[];
  /** Mirror of the advanced block's open state (for aria-expanded + the
   *  "Hide details" affordance). */
  advancedOpen: boolean;
  /** Nested operating-expense disclosure state, so expense chips announce
   * the region they actually reveal rather than only the outer panel. */
  expenseDetailsOpen?: boolean;
  /** "Open in all assumptions" (inside a chip's editor) and the chips that
   *  have no small editor → open the advanced block + scroll to the matching
   *  anchor. Thin wrap of investcalc-page's handleStepNavigate. */
  onNavigate: (target: AssumptionChipTarget, focusFieldId?: string) => void;
  /** The header toggle, "Show all assumptions" / "Hide all assumptions" →
   *  the existing toggleAdvanced (records the user's remembered preference
   *  exactly as the old button did). */
  onHideDetails: () => void;
  /** Active "Strategy" strategy (null = default flow). */
  activeStrategyKey: string | null;
  /** What the play's starter set wrote (label + field → value), so chips
   *  over strategy-set values badge as the play's defaults instead of
   *  "yours" — the starter writes are RHF-dirty on purpose (BROWSER-2). */
  strategyApplied?: StrategyAppliedSnapshot | null;
  /** Loaded Pro templates + the saved-deal fallback row, for resolving the
   *  template chip's display name from the watched templateId. */
  templateOptions: ReadonlyArray<
    TemplateAssumptionSource & { id: string; templateName: string }
  >;
  savedTemplateFallback: { id: string; templateName: string } | null;
  /** The form's starting rate is the product fallback because the server
   *  could not read the FRED benchmark (audit A2); the untouched financing
   *  chip then says "fallback rate". */
  rateIsFallback?: boolean;
  /** Strip footer slot (SaveAsDefaultsChip — renders null until useful). */
  footer?: ReactNode;
};

/** The popover's accessible name: "Edit financing", "Edit property tax". */
function chipEditorName(chipId: EditableChipId): string {
  switch (chipId) {
    case "financing":
      return "financing";
    case "taxes":
      return "property tax";
    case "insurance":
      return "insurance";
    case "vacancy":
      return "vacancy";
    case "maintenance":
      return "maintenance";
    case "management":
      return "management";
    case "capex":
      return "CapEx";
    case "hoa-unit":
      return "HOA dues";
    case "extras":
      return "property extras";
  }
}

export function AssumptionsStrip({
  form,
  getProvenance,
  getTouchedInputFields,
  advancedOpen,
  expenseDetailsOpen = false,
  onNavigate,
  onHideDetails,
  activeStrategyKey,
  strategyApplied = null,
  templateOptions,
  savedTemplateFallback,
  rateIsFallback = false,
  footer,
}: Props) {
  // Subscribe to all form changes so chips re-derive on every value write —
  // typed, enrichment setValue, template patch, draft restore, saved-deal
  // reset alike. Isolated re-render (same pattern as SaveAsDefaultsChip).
  form.watch();
  const values = form.getValues();
  const provenance = getProvenance();
  // Fields still holding the play's starter-written values: dirty on purpose
  // (the template auto-apply skips dirty fields) but NOT user edits — they
  // must badge as the play's defaults, never "yours" (BROWSER-2). A user
  // edit diverges the value and drops the field from the set.
  const strategyOwnedFields = computeStrategyOwnedFields(
    strategyApplied,
    values as unknown as Record<string, unknown>,
  );
  const selectedTemplate = values.templateId
    ? templateOptions.find((template) => template.id === values.templateId)
    : null;
  const templateOwnedFields = selectedTemplate
    ? computeValueBoundOwnedFields(
        Object.fromEntries(
          buildTemplateFormPatch(selectedTemplate).map(({ field, value }) => [
            field,
            value,
          ]),
        ),
        values as unknown as Record<string, unknown>,
      )
    : new Set<string>();
  const sourceTouchedFields: Record<string, unknown> = {
    ...(form.formState.dirtyFields as Record<string, unknown>),
  };
  for (const key of getTouchedInputFields?.() ?? []) {
    sourceTouchedFields[key] = true;
  }
  const expensesEdited = computeExpensesEdited(
    sourceTouchedFields,
    strategyOwnedFields,
  );
  const userEditedFields = new Set(
    Object.entries(sourceTouchedFields)
      .filter(([, touched]) => Boolean(touched))
      .map(([field]) => field),
  );
  const activeStrategy = getStrategyByKey(activeStrategyKey);
  const chips = buildAssumptionChips(values, provenance, {
    expensesEdited,
    userEditedFields,
    templateName: resolveTemplateName(
      values.templateId,
      templateOptions,
      savedTemplateFallback,
    ),
    hasActiveStrategy: Boolean(activeStrategy),
    strategyPlay: strategyApplied
      ? { label: strategyApplied.label, ownedFields: strategyOwnedFields }
      : null,
    templateOwnedFields,
    rateIsFallback,
  });

  // ── Arrival pulse ─────────────────────────────────────────────────────
  // pulseKey transitions (null→"rate:fred", templateId change, …) mark an
  // auto-fill landing on a chip. First render records the baseline without
  // pulsing, so loads that pre-date this mount stay quiet.
  const [pulsing, setPulsing] = useState<Record<string, boolean>>({});
  const prevPulseRef = useRef<Record<string, string | null> | null>(null);
  // PER-ID clear timers (verifier-reproduced bug: one shared timeout was
  // cancelled by the effect cleanup on ANY signature change inside the
  // 1.6s window — template auto-apply then enrichment landing close
  // together left the first chip pulsing forever). Each id owns its
  // timeout; re-runs never cancel other ids' clears; unmount clears all.
  const pulseTimersRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const timers = pulseTimersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
    };
  }, []);
  // Parent mount-restore effects (draft / saved-deal / Duplicate) run
  // AFTER this child's baseline effect, so a restore registered as a
  // null→value transition and false-pulsed the template chip. A short
  // post-mount quiet window kills that; real auto-fills need a user
  // action (address pick) or a server roundtrip and land later.
  const mountedAtRef = useRef(Date.now());
  const pulseSignature = chips
    .map((c) => `${c.id}=${c.pulseKey ?? ""}`)
    .join("|");
  useEffect(() => {
    const current: Record<string, string | null> = {};
    for (const part of pulseSignature.split("|")) {
      const eq = part.indexOf("=");
      current[part.slice(0, eq)] = part.slice(eq + 1) || null;
    }
    const prev = prevPulseRef.current;
    prevPulseRef.current = current;
    if (!prev) return;
    if (Date.now() - mountedAtRef.current < 800) return;
    const arrived = Object.keys(current).filter(
      (id) => current[id] != null && current[id] !== prev[id],
    );
    if (arrived.length === 0) return;
    setPulsing((p) => {
      const next = { ...p };
      for (const id of arrived) next[id] = true;
      return next;
    });
    for (const id of arrived) {
      const existing = pulseTimersRef.current.get(id);
      if (existing) window.clearTimeout(existing);
      const t = window.setTimeout(() => {
        pulseTimersRef.current.delete(id);
        setPulsing((p) => {
          const next = { ...p };
          delete next[id];
          return next;
        });
      }, PULSE_MS);
      pulseTimersRef.current.set(id, t);
    }
  }, [pulseSignature]);

  // Focus landing zone for the "Hide details" collapse (see the button).
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  // HOA chip, only for an address with a unit number ("#209", "Apt 2B")
  // while HOA is still $0 and its field has not been visited. HOA sits in
  // the collapsed expense panel, so a condo's first result modeled no dues
  // and nothing on the first screen said so. Not a required input: the chip
  // opens the panel on the HOA field and goes away once dues are entered or
  // the field has been visited. The expense card repeats it as a caution
  // line (operating-expenses-section.tsx).
  const hoaChip: StripChip | null = shouldPromptForHoa({
    address: values.address,
    hoaMonthly: values.hoaMonthly,
    hoaFieldVisited: Boolean(
      sourceTouchedFields.hoaMonthly ||
        (form.formState.touchedFields as Record<string, unknown>).hoaMonthly,
    ),
  })
    ? {
        id: "hoa-unit",
        label: "HOA $0/mo",
        badge: { kind: "default", text: "add dues if any" },
        target: "expenses",
        focusFieldId: "hoaMonthly",
        pulseKey: null,
      }
    : null;

  // One chip editor open at a time. Radix returns focus to the chip when the
  // popover closes (Escape, an outside click, Done, or Enter in a field).
  const [openChipId, setOpenChipId] = useState<string | null>(null);

  const chipClassName = (chipId: string) =>
    cn(
      // The text face with tabular figures; Geist Mono only for the
      // source tag (audit A11, DESIGN.md "Metadata"). Below sm the tag
      // stacks under the label: side by side at 375px a long tag ("replace
      // with your local number") wrapped into two centred lines (audit C2).
      "inline-flex min-h-11 max-w-full flex-col items-start gap-1 rounded-md border border-border bg-background px-2.5 py-2 font-figure text-sm font-medium text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-row sm:items-center sm:gap-1.5",
      pulsing[chipId] && "animate-pulse border-primary bg-primary/10",
    );

  const chipBody = (chip: StripChip) => (
    <>
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 whitespace-normal text-left leading-snug">
          {chip.label}
        </span>
        {chip.applied ? (
          <Check
            className="size-3 shrink-0 text-[var(--metric-positive)]"
            aria-hidden
          />
        ) : null}
      </span>
      {chip.badge ? (
        <span
          className={cn(
            "rounded-sm px-1 py-0.5 text-left font-mono text-xs font-medium leading-none",
            chip.badge.kind === "yours" || chip.badge.kind === "default"
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          {chip.badge.text}
        </span>
      ) : null}
    </>
  );

  const renderChip = (chip: StripChip) => {
    // The template chip and the multi-family extras chip have no small set
    // of fields (a template picker, a property-type panel): they keep their
    // link into the full section and say so.
    const editable =
      isEditableChipId(chip.id) && !(chip.id === "extras" && chip.target !== "extras");
    if (!editable || !isEditableChipId(chip.id)) {
      const isExpanded =
        chip.target === "expenses"
          ? advancedOpen && expenseDetailsOpen
          : advancedOpen;
      return (
        <button
          key={chip.id}
          type="button"
          onClick={() => onNavigate(chip.target, chip.focusFieldId)}
          aria-controls="advanced-options"
          aria-expanded={isExpanded}
          className={chipClassName(chip.id)}
        >
          {chipBody(chip)}
        </button>
      );
    }
    const chipId = chip.id;
    return (
      <Popover
        key={chip.id}
        open={openChipId === chip.id}
        onOpenChange={(open) => setOpenChipId(open ? chip.id : null)}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-haspopup="dialog"
            data-assumption-chip={chip.id}
            className={chipClassName(chip.id)}
          >
            {chipBody(chip)}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          role="dialog"
          aria-label={`Edit ${chipEditorName(chipId)}`}
          data-assumption-chip-editor={chip.id}
          // A width that fits a phone; the surface, float radius and shadow
          // are the Popover primitive's.
          className="w-[min(20rem,calc(100vw-2rem))] p-4"
          onKeyDown={(event) => {
            // Enter in a field means "done". The popover is portaled out of
            // the form in the DOM but not in React, so without this the
            // form's own Enter handler (move to the next field) would run
            // and send focus to the address input.
            if (
              event.key === "Enter" &&
              !event.metaKey &&
              !event.ctrlKey &&
              event.target instanceof HTMLInputElement
            ) {
              event.preventDefault();
              event.stopPropagation();
              setOpenChipId(null);
            }
          }}
        >
          <AssumptionChipEditor
            chipId={chipId}
            form={form}
            showYearBuilt={
              !(values.propertyType === "single-family" && Boolean(activeStrategy))
            }
          />
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => {
                setOpenChipId(null);
                onNavigate(chip.target, chip.focusFieldId);
              }}
              className="tc-link inline-flex min-h-11 items-center text-sm font-semibold"
            >
              Open in all assumptions
            </button>
            <button
              type="button"
              onClick={() => setOpenChipId(null)}
              className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-semibold text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Done
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const beforeExtras = chips.filter((c) => c.id !== "extras");
  const extrasChip = chips.find((c) => c.id === "extras");

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          {/* tabIndex={-1}: focus landing zone for the "Hide details"
              handoff below — never in the tab order itself. */}
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-sm font-semibold text-foreground focus:outline-none"
          >
            Review assumptions
          </h2>
          <p className="text-sm leading-snug text-muted-foreground">
            These values drive the preview. Every source is labeled, and every
            number is editable.
          </p>
        </div>
        {/* The full region's own toggle (audit B1, B8). Always present, so
            the label alone says which way it goes; it used to exist only
            while open ("Hide details"), with the chips as the way in. */}
        <button
          type="button"
          onClick={() => {
            // Collapsing can strand keyboard/SR focus far down a very long
            // page that has just become short. Keep it on this card's
            // heading (A11Y-HIDE-DETAILS-FOCUS).
            if (advancedOpen) headingRef.current?.focus();
            onHideDetails();
          }}
          aria-expanded={advancedOpen}
          aria-controls="advanced-options"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 px-2 text-sm font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {advancedOpen ? "Hide all assumptions" : "Show all assumptions"}
          {advancedOpen ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {beforeExtras.map(renderChip)}
        {hoaChip ? renderChip(hoaChip) : null}
        {extrasChip ? renderChip(extrasChip) : null}
      </div>

      {/* Footer slot: SaveAsDefaultsChip (renders null until a chip value is
          dirty AND differs from the user's saved defaults). */}
      <div className="mt-3 flex justify-end empty:hidden">{footer}</div>
    </div>
  );
}
