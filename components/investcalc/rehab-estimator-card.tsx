"use client";

/**
 * Rehab estimator card — UI for the rehab cost estimator library.
 *
 * Self-contained: holds its own state (selected work items, contingency,
 * overrides). Pre-fills sqft + bath count from the parent property data
 * if available, but the user can edit them. Outputs a per-line breakdown
 * and a total.
 *
 * Does not write to the form — exposes its total via an optional
 * onTotalChange callback so the BRRRR / Flip cards can consume it.
 */

import { useEffect, useMemo, useState } from "react";
import { Hammer, ChevronDown, ChevronUp } from "lucide-react";
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
  /** Called whenever the computed total changes — for downstream cards. */
  onTotalChange?: (total: number, breakdown: RehabResult) => void;
}

const CATEGORY_LABELS: Record<RehabWorkItem["category"], string> = {
  cosmetic: "Cosmetic",
  kitchen: "Kitchen",
  bath: "Bath (per bath)",
  systems: "Systems",
  structural: "Structural",
};

const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function RehabEstimatorCard({
  defaultSqft,
  defaultBathCount,
  onTotalChange,
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
        Mid-market defaults from contractor pricing surveys — use as a starting
        point, not a binding bid. Total flows into the BRRRR &amp; Fix-and-Flip
        cards below.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Sq ft
          </Label>
          <Input
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
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Baths
          </Label>
          <Input
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
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Contingency
          </Label>
          <div className="relative">
            <Input
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
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                {CATEGORY_LABELS[cat]}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {grouped[cat].map((item) => {
                  const isOn = selected.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 cursor-pointer transition-colors",
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
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Estimated rehab cost
            </div>
            <div className="text-2xl sm:text-3xl font-black text-primary mt-1 tabular-nums">
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
