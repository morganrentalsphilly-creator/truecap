"use client";

/**
 * "Your assumptions — already filled in" — the input-side assumptions strip
 * (calculator redesign Phase 3, blueprint §1 item 4).
 *
 * Replaces the "Improve accuracy (optional)" toggle button as the visual
 * entry point to the advanced region: the chips state every pre-answered
 * value as a settled fact with its source, and tapping one opens the
 * EXISTING mounted-but-hidden advanced block and scrolls to the matching
 * #step-* anchor (the exact handleStepNavigate mechanics — the parent's
 * onNavigate is a thin wrap of that handler). The advanced block itself is
 * untouched: every section stays MOUNTED with live RHF registration, this
 * card only changes what invites the user in.
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
 * The "Strategy" strategy picker demotes into this card as the
 * "Analyzing as:" pill — the existing StrategyChips component renders
 * inside (kept mounted, CSS-toggled), behavior unchanged. SaveAsDefaultsChip
 * relocates to the strip footer via the `footer` slot (it self-gates).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { EnrichmentProvenanceInput } from "@/lib/data-confidence";
import {
  buildAssumptionChips,
  computeExpensesEdited,
  computeStrategyOwnedFields,
  resolveTemplateName,
  type AssumptionChip,
  type AssumptionChipTarget,
  type StrategyAppliedSnapshot,
} from "@/lib/assumption-chips";
import { getStrategyByKey } from "@/lib/investor-strategies";
import { StrategyChips } from "./strategy-chips";
import { cn } from "@/lib/utils";

const PULSE_MS = 1600;

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
  /** Chip tap → open the advanced block + scroll to the matching anchor.
   *  Thin wrap of investcalc-page's handleStepNavigate. */
  onNavigate: (target: AssumptionChipTarget) => void;
  /** "Hide details" → the existing toggleAdvanced (records the user's
   *  remembered preference exactly as the old button did). */
  onHideDetails: () => void;
  /** Active "Strategy" strategy (null = default flow). */
  activeStrategyKey: string | null;
  onSelectStrategy: (key: string | null) => void;
  /** What the play's starter set wrote (label + field → value), so chips
   *  over strategy-set values badge as the play's defaults instead of
   *  "yours" — the starter writes are RHF-dirty on purpose (BROWSER-2). */
  strategyApplied?: StrategyAppliedSnapshot | null;
  /** Loaded Pro templates + the saved-deal fallback row, for resolving the
   *  template chip's display name from the watched templateId. */
  templateOptions: ReadonlyArray<{ id: string; templateName: string }>;
  savedTemplateFallback: { id: string; templateName: string } | null;
  /** Strip footer slot (SaveAsDefaultsChip — renders null until useful). */
  footer?: ReactNode;
};

export function AssumptionsStrip({
  form,
  getProvenance,
  getTouchedInputFields,
  advancedOpen,
  onNavigate,
  onHideDetails,
  activeStrategyKey,
  onSelectStrategy,
  strategyApplied = null,
  templateOptions,
  savedTemplateFallback,
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
    values as unknown as Record<string, unknown>
  );
  const sourceTouchedFields: Record<string, unknown> = {
    ...(form.formState.dirtyFields as Record<string, unknown>),
  };
  for (const key of getTouchedInputFields?.() ?? []) {
    sourceTouchedFields[key] = true;
  }
  const expensesEdited = computeExpensesEdited(sourceTouchedFields, strategyOwnedFields);
  const activeStrategy = getStrategyByKey(activeStrategyKey);
  const chips = buildAssumptionChips(values, provenance, {
    expensesEdited,
    templateName: resolveTemplateName(values.templateId, templateOptions, savedTemplateFallback),
    hasActiveStrategy: Boolean(activeStrategy),
    strategyPlay: strategyApplied
      ? { label: strategyApplied.label, ownedFields: strategyOwnedFields }
      : null,
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
  const pulseSignature = chips.map((c) => `${c.id}=${c.pulseKey ?? ""}`).join("|");
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
      (id) => current[id] != null && current[id] !== prev[id]
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

  // ── "Analyzing as:" strategy pill + inline picker ─────────────────────
  // The existing StrategyChips card stays MOUNTED and is CSS-toggled (the
  // same hidden-not-unmounted pattern as the advanced block), so strategy
  // behavior — including handleSelectStrategy's form writes — is unchanged.
  const [strategyOpen, setStrategyOpen] = useState(false);

  // Focus landing zone for the "Hide details" collapse (see the button).
  const headingRef = useRef<HTMLParagraphElement | null>(null);

  // Every chip target that opens the #advanced-options block gets the
  // disclosure semantics. "property" belongs here too: its #step-type panel
  // moved INSIDE the advanced block in Phase 4, so the template + MF-extras
  // chips expand the same region as their siblings and must announce it
  // (A11Y-PROPERTY-CHIP-ARIA).
  const advancedTargets: AssumptionChipTarget[] = ["financing", "expenses", "extras", "property"];
  const renderChip = (chip: AssumptionChip) => {
    const opensAdvanced = advancedTargets.includes(chip.target);
    return (
      <button
        key={chip.id}
        type="button"
        onClick={() => onNavigate(chip.target)}
        aria-controls={opensAdvanced ? "advanced-options" : undefined}
        aria-expanded={opensAdvanced ? advancedOpen : undefined}
        className={cn(
          "inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted",
          pulsing[chip.id] && "animate-pulse border-primary bg-primary/10"
        )}
      >
        <span className="max-w-56 truncate">{chip.label}</span>
        {chip.applied ? (
          <Check className="size-3 shrink-0 text-[var(--metric-positive)]" aria-hidden />
        ) : null}
        {chip.badge ? (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
              chip.badge.kind === "yours"
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            {chip.badge.text}
          </span>
        ) : null}
      </button>
    );
  };

  const beforeExtras = chips.filter((c) => c.id !== "extras");
  const extrasChip = chips.find((c) => c.id === "extras");

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          {/* tabIndex={-1}: focus landing zone for the "Hide details"
              handoff below — never in the tab order itself. */}
          <p
            ref={headingRef}
            tabIndex={-1}
            className="text-sm font-semibold text-foreground focus:outline-none"
          >
            Your assumptions — already filled in
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Tap any chip to review or change it — every value stays editable.
          </p>
        </div>
        {advancedOpen ? (
          <button
            type="button"
            onClick={() => {
              // The button renders only while advancedOpen, so activating it
              // unmounts the focused element and strands keyboard/SR focus
              // on <body> at the top of a very long page. Hand focus to the
              // strip heading BEFORE the collapse commits — the same fix
              // class listing-link-input.tsx documents
              // (A11Y-HIDE-DETAILS-FOCUS).
              headingRef.current?.focus();
              onHideDetails();
            }}
            aria-expanded={advancedOpen}
            aria-controls="advanced-options"
            // min-h-8 + canceling negative margin: match the chips' min-h-8
            // touch band below without growing the header row visually.
            className="-my-1.5 inline-flex min-h-8 shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Hide details
            <ChevronUp className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {beforeExtras.map(renderChip)}
        {/* Strategy pill — the demoted "Strategy" entry point. */}
        <button
          type="button"
          onClick={() => setStrategyOpen((v) => !v)}
          aria-expanded={strategyOpen}
          aria-controls="assumptions-strip-strategy"
          className={cn(
            "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            activeStrategy
              ? "border-primary/50 bg-primary/5 text-foreground hover:bg-primary/10"
              : "border-border bg-background text-foreground hover:bg-muted"
          )}
        >
          <Sparkles className="size-3 shrink-0 text-primary" aria-hidden />
          <span className="max-w-56 truncate">
            {activeStrategy ? `Analyzing as: ${activeStrategy.label}` : "Strategy"}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              strategyOpen && "rotate-180"
            )}
            aria-hidden
          />
        </button>
        {extrasChip ? renderChip(extrasChip) : null}
      </div>

      {/* Existing strategy picker — mounted always, visibility-toggled. */}
      <div
        id="assumptions-strip-strategy"
        className={cn("mt-3", strategyOpen ? "block" : "hidden")}
      >
        <StrategyChips activeKey={activeStrategyKey} onSelect={onSelectStrategy} />
      </div>

      {/* Footer slot: SaveAsDefaultsChip (renders null until a chip value is
          dirty AND differs from the user's saved defaults). */}
      <div className="mt-3 flex justify-end empty:hidden">{footer}</div>
    </div>
  );
}
