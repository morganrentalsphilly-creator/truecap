"use client";

/**
 * Rehab estimator card - UI for the rehab cost estimator library.
 *
 * Self-contained: holds its own state (selected work items, sqft, bath
 * count, contingency). Pre-fills sqft + bath count from the parent property
 * data if available, but the user can edit them. Outputs a total with its
 * subtotal and contingency.
 *
 * It has NO per-item amount field: each work item's cost is a fixed default
 * shown as text, and nothing here hands the pure calculator a per-item
 * amount. Copy that describes this tool (this card's caption, the tool page,
 * /vs/bricked, llms-full.txt) must not call the defaults or the lines
 * editable while that is so; released-tool-surface-guards.test.ts holds it.
 *
 * Does not write to the form - exposes its total via an optional
 * onTotalChange callback so an enclosing panel can consume the total.
 *
 * Two renderings of the same state and the same estimate:
 *   - "card" (the default): the card the signed-in analyzer's strategies
 *     panel mounts. Its markup is unchanged, and
 *     lib/__tests__/tools-template-t2.test.tsx pins its rendered HTML.
 *   - "tool": the public /tools/rehab-cost-estimator page, set on the
 *     calculator parts (components/tools/tool-parts.tsx) like the 1% rule
 *     widget: no card, the fields at the 48px Field size, the work items as
 *     rows on rules, the total as the key figure in DM Mono over the double
 *     rule. Same words, same inputs, same estimateRehab call.
 */

import { useEffect, useId, useMemo, useState } from "react";
import { Hammer, ChevronDown, ChevronUp } from "lucide-react";
import { LedgerFigure } from "@/components/ledger/ledger-parts";
import { ToolFrame, ToolResult } from "@/components/tools/tool-parts";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  REHAB_WORK_ITEMS,
  estimateRehab,
  type RehabResult,
  type RehabWorkItem,
} from "@/lib/rehab-estimator";

interface RehabEstimatorCardProps {
  /** Property sqft from the form, if known. User can override. */
  defaultSqft?: number | null;
  /** Bath count from the form, if known. */
  defaultBathCount?: number | null;
  /** Called whenever the computed total changes - for downstream cards. */
  onTotalChange?: (total: number, breakdown: RehabResult) => void;
  /**
   * "card" (default): the analyzer's card, exactly as before. "tool": the
   * public tool page's rendering on the calculator parts.
   */
  variant?: "card" | "tool";
}

const CATEGORY_LABELS: Record<RehabWorkItem["category"], string> = {
  cosmetic: "Cosmetic",
  kitchen: "Kitchen",
  bath: "Bath (per bath)",
  systems: "Systems",
  structural: "Structural",
};

const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

// The "tool" rendering's field, as ToolNumberField sets one (DESIGN.md
// "Field"): a sentence-case label at 600, a 48px input with 16px text at
// every width. Written here because these three fields keep a placeholder,
// which ToolNumberField does not take.
const TOOL_LABEL_CLASS = "text-sm leading-snug font-semibold text-foreground";
const TOOL_INPUT_CLASS = "h-12 text-base lg:text-base";

export function RehabEstimatorCard({
  defaultSqft,
  defaultBathCount,
  onTotalChange,
  variant = "card",
}: RehabEstimatorCardProps) {
  const [sqftInput, setSqftInput] = useState<string>(
    defaultSqft && defaultSqft > 0 ? String(defaultSqft) : ""
  );
  const [bathInput, setBathInput] = useState<string>(
    defaultBathCount && defaultBathCount > 0 ? String(defaultBathCount) : "1"
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [contingency, setContingency] = useState<string>("10");
  const [expanded, setExpanded] = useState(false);

  // A11Y: labels had no htmlFor and inputs no id — clicking a label did
  // nothing and screen readers announced the fields with no name. useId()
  // keeps the ids unique across instances.
  const uid = useId();
  const sqftId = `${uid}-sqft`;
  const bathId = `${uid}-baths`;
  const contingencyId = `${uid}-contingency`;

  // Keep sqft / bath inputs in sync if the form values change after mount.
  useEffect(() => {
    if (defaultSqft && defaultSqft > 0 && !sqftInput) {
      setSqftInput(String(defaultSqft));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSqft]);
  useEffect(() => {
    if (defaultBathCount && defaultBathCount > 0 && bathInput === "1") {
      setBathInput(String(defaultBathCount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultBathCount]);

  const result = useMemo(() => {
    return estimateRehab({
      sqft: Number(sqftInput) || 0,
      bathCount: Number(bathInput) || 1,
      contingencyPct: Number(contingency) || 0,
      selectedItems: Array.from(selected),
    });
  }, [sqftInput, bathInput, contingency, selected]);

  // Surface total to parent
  useEffect(() => {
    onTotalChange?.(result.total, result);
  }, [result, onTotalChange]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const grouped: Record<RehabWorkItem["category"], RehabWorkItem[]> = {
    cosmetic: [],
    kitchen: [],
    bath: [],
    systems: [],
    structural: [],
  };
  for (const item of REHAB_WORK_ITEMS) {
    grouped[item.category].push(item);
  }
  const orderedCategories: RehabWorkItem["category"][] = [
    "cosmetic",
    "kitchen",
    "bath",
    "systems",
    "structural",
  ];

  if (variant === "tool") {
    const headingId = `${uid}-heading`;
    const itemsId = `${uid}-items`;
    return (
      // The page shows an H1 naming the estimator, so the widget's own
      // heading is for the outline only.
      <ToolFrame aria-labelledby={headingId}>
        <h2 id={headingId} className="sr-only">
          Rehab cost estimator
        </h2>
        <p className="max-w-[68ch] text-pretty text-sm text-muted-foreground">
          Directional planning defaults: switch items on or off and set the
          square footage, bath count and contingency. Not bid-quality pricing and
          not current market data. Get local contractor bids before committing to
          a number.
        </p>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-5 @sm:grid-cols-3">
          <div className="min-w-0">
            <Label htmlFor={sqftId} className={TOOL_LABEL_CLASS}>
              Sq ft
            </Label>
            <div className="mt-2">
              <Input
                id={sqftId}
                type="number"
                inputMode="numeric"
                step="50"
                value={sqftInput}
                onChange={(e) => setSqftInput(e.target.value)}
                placeholder="1850"
                className={TOOL_INPUT_CLASS}
              />
            </div>
          </div>
          <div className="min-w-0">
            <Label htmlFor={bathId} className={TOOL_LABEL_CLASS}>
              Baths
            </Label>
            <div className="mt-2">
              <Input
                id={bathId}
                type="number"
                inputMode="decimal"
                step="0.5"
                value={bathInput}
                onChange={(e) => setBathInput(e.target.value)}
                placeholder="2"
                className={TOOL_INPUT_CLASS}
              />
            </div>
          </div>
          <div className="min-w-0">
            <Label htmlFor={contingencyId} className={TOOL_LABEL_CLASS}>
              Contingency
            </Label>
            <div className="relative mt-2">
              <Input
                id={contingencyId}
                type="number"
                inputMode="numeric"
                step="1"
                value={contingency}
                onChange={(e) => setContingency(e.target.value)}
                placeholder="10"
                className={cn(TOOL_INPUT_CLASS, "pr-8")}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground"
              >
                %
              </span>
            </div>
          </div>
        </div>

        {/* The catalog's switch: a 48px outline button that says what it
            will do, with its state in aria-expanded instead of a chevron. */}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={itemsId}
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            buttonVariants({ variant: "outline", size: "cta" }),
            "mt-6 w-full sm:w-auto",
          )}
        >
          {expanded
            ? "Collapse"
            : selected.size > 0
              ? `${selected.size} items selected`
              : "Pick work items"}
        </button>

        {expanded && (
          <div id={itemsId} className="mt-6 space-y-6">
            {orderedCategories.map((cat) => (
              <div key={cat}>
                <p className="border-b border-border pb-2 text-sm font-semibold text-foreground">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 @2xl:grid-cols-2">
                  {grouped[cat].map((item) => (
                    <label
                      key={item.id}
                      className="flex min-h-12 cursor-pointer items-center justify-between gap-3 border-b border-rule-soft py-2"
                    >
                      <span className="flex min-w-0 items-center gap-3 text-base text-foreground">
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggle(item.id)}
                          className="size-5 shrink-0 accent-primary"
                        />
                        <span className="min-w-0">{item.label}</span>
                      </span>
                      <LedgerFigure className="shrink-0 text-sm text-muted-foreground">
                        {item.defaultCostPerSqft
                          ? `$${item.defaultCostPerSqft}/sqft`
                          : item.flatCost
                            ? `${fmt(item.flatCost)}${item.perBath ? "/bath" : ""}`
                            : ""}
                      </LedgerFigure>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* The total opens on the rule under the inputs; ToolResult reads it
            out (a polite live region) when an edit changes it. */}
        <ToolResult
          className="mt-8 border-t border-border pt-5"
          label="Estimated rehab cost"
          figure={fmt(result.total)}
          note={
            result.subtotal > 0 ? (
              <>
                <span className="block">Subtotal: {fmt(result.subtotal)}</span>
                <span className="block">
                  +{result.contingencyPct}% contingency: {fmt(result.contingency)}
                </span>
              </>
            ) : undefined
          }
        />
      </ToolFrame>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-2">
          <Hammer className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            Rehab cost estimator
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              Collapse <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              {selected.size > 0 ? `${selected.size} items selected` : "Pick work items"}{" "}
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Directional planning defaults: switch items on or off and set the
        square footage, bath count and contingency. Not bid-quality pricing and
        not current market data. Get local contractor bids before committing to
        a number.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <Label htmlFor={sqftId} className="text-2xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Sq ft
          </Label>
          <Input
            id={sqftId}
            type="number"
            inputMode="numeric"
            step="50"
            value={sqftInput}
            onChange={(e) => setSqftInput(e.target.value)}
            placeholder="1850"
            className="border-input bg-background"
          />
        </div>
        <div>
          <Label htmlFor={bathId} className="text-2xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Baths
          </Label>
          <Input
            id={bathId}
            type="number"
            inputMode="decimal"
            step="0.5"
            value={bathInput}
            onChange={(e) => setBathInput(e.target.value)}
            placeholder="2"
            className="border-input bg-background"
          />
        </div>
        <div>
          <Label htmlFor={contingencyId} className="text-2xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Contingency
          </Label>
          <div className="relative">
            <Input
              id={contingencyId}
              type="number"
              inputMode="numeric"
              step="1"
              value={contingency}
              onChange={(e) => setContingency(e.target.value)}
              placeholder="10"
              className="pr-8 border-input bg-background"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              %
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 mt-2">
          {orderedCategories.map((cat) => (
            <div key={cat}>
              <div className="text-2xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                {CATEGORY_LABELS[cat]}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {grouped[cat].map((item) => {
                  const isOn = selected.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        "flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 cursor-pointer transition-colors",
                        isOn
                          ? "bg-[var(--brand-blue-light)] border-primary"
                          : "bg-background hover:bg-accent/40"
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm text-foreground min-w-0">
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={() => toggle(item.id)}
                          className="accent-primary shrink-0"
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {item.defaultCostPerSqft
                          ? `$${item.defaultCostPerSqft}/sqft`
                          : item.flatCost
                          ? `${item.perBath ? "" : ""}${fmt(item.flatCost)}${
                              item.perBath ? "/bath" : ""
                            }`
                          : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-border bg-[var(--background)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
              Estimated rehab cost
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-primary mt-1 tabular-nums">
              {fmt(result.total)}
            </div>
          </div>
          {result.subtotal > 0 && (
            <div className="text-xs text-muted-foreground text-right space-y-0.5 tabular-nums">
              <div>Subtotal: {fmt(result.subtotal)}</div>
              <div>
                +{result.contingencyPct}% contingency: {fmt(result.contingency)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
