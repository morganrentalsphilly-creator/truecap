"use client";

/**
 * Buy Box editor — Settings card where a Pro user defines their personal
 * acquisition criteria. The saved criteria drive the inline "Meets your
 * buy box" verdict on each analysis (which complements the Deal Score).
 *
 * Behavior:
 *   - Lazy-loads the current Buy Box + Pro entitlement on mount
 *   - Free users see a compact Pro upsell instead of the editor
 *   - Every criterion is optional — a blank field means "don't check it"
 *   - Save + Clear; toast on success / error
 *   - Graceful migration-pending state (table not yet created)
 */
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Lock, Save, Target, Trash2, X } from "lucide-react";
import {
  clearBuyBoxAction,
  getBuyBoxAction,
  saveBuyBoxAction,
} from "@/app/actions/user-buy-box";
import {
  EMPTY_BUY_BOX,
  US_STATE_OPTIONS,
  buyBoxPropertyTypeLabel,
  type BuyBoxCriteria,
  type BuyBoxPropertyType,
} from "@/lib/buy-box";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RETURN_FIELDS = [
  { key: "minCapRatePct", label: "Min cap rate", suffix: "%", step: "0.1", placeholder: "6" },
  { key: "minCocPct", label: "Min cash-on-cash", suffix: "%", step: "0.1", placeholder: "8" },
  { key: "minDscr", label: "Min DSCR", suffix: "×", step: "0.05", placeholder: "1.25" },
] as const;

const MONEY_FIELDS = [
  { key: "minCashFlowMonthly", label: "Min monthly cash flow", step: "25", placeholder: "200" },
  { key: "maxPurchasePrice", label: "Max purchase price", step: "5000", placeholder: "300000" },
] as const;

const PROPERTY_TYPES: BuyBoxPropertyType[] = ["single-family", "multi-family", "owner-occupant"];

type NumericKey =
  | "minCapRatePct"
  | "minCocPct"
  | "minDscr"
  | "minCashFlowMonthly"
  | "maxPurchasePrice";

type FormState = Record<NumericKey, string>;

function criteriaToForm(c: BuyBoxCriteria): FormState {
  const s = (n: number | null) => (n == null ? "" : String(n));
  return {
    minCapRatePct: s(c.minCapRatePct),
    minCocPct: s(c.minCocPct),
    minDscr: s(c.minDscr),
    minCashFlowMonthly: s(c.minCashFlowMonthly),
    maxPurchasePrice: s(c.maxPurchasePrice),
  };
}

function parseNum(raw: string): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function matchState(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const head = trimmed.slice(0, 2).toUpperCase();
  if (US_STATE_OPTIONS.some((s) => s.abbr === head)) return head;
  const byName = US_STATE_OPTIONS.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  return byName ? byName.abbr : null;
}

export function BuyBoxCard() {
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [canUse, setCanUse] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);
  const [form, setForm] = useState<FormState>(criteriaToForm(EMPTY_BUY_BOX));
  const [propertyTypes, setPropertyTypes] = useState<BuyBoxPropertyType[]>([]);
  const [targetStates, setTargetStates] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [stateInput, setStateInput] = useState("");
  const [isSaving, startSaving] = useTransition();
  const [isClearing, startClearing] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void getBuyBoxAction()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setCanUse(result.canUse);
          setForm(criteriaToForm(result.criteria));
          setPropertyTypes(result.criteria.propertyTypes);
          setTargetStates(result.criteria.targetStates);
          setIsActive(result.criteria.isActive);
        } else if (result.code === "MIGRATION_PENDING") {
          setMigrationPending(true);
        }
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[buy-box] load failed:", err);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stateOptions = useMemo(
    () => US_STATE_OPTIONS.filter((s) => !targetStates.includes(s.abbr)),
    [targetStates]
  );

  const buildCriteria = (): BuyBoxCriteria => ({
    minCapRatePct: parseNum(form.minCapRatePct),
    minCocPct: parseNum(form.minCocPct),
    minDscr: parseNum(form.minDscr),
    minCashFlowMonthly: parseNum(form.minCashFlowMonthly),
    maxPurchasePrice: parseNum(form.maxPurchasePrice),
    propertyTypes,
    targetStates,
    isActive,
  });

  const handleAddState = (raw: string) => {
    const abbr = matchState(raw);
    if (abbr && !targetStates.includes(abbr)) {
      setTargetStates((prev) => [...prev, abbr]);
    }
    setStateInput("");
  };

  const handleSave = () => {
    if (migrationPending) return;
    startSaving(async () => {
      const result = await saveBuyBoxAction(buildCriteria());
      if (!result.ok) {
        if (result.code === "MIGRATION_PENDING") {
          setMigrationPending(true);
          return;
        }
        toast({ title: "Could not save Buy Box", description: result.message, variant: "destructive" });
        return;
      }
      toast({ title: "Buy Box saved", description: "Your analyses now show a personalized buy-box verdict." });
    });
  };

  const handleClear = () => {
    startClearing(async () => {
      const result = await clearBuyBoxAction();
      if (!result.ok) {
        if (result.code === "MIGRATION_PENDING") {
          setMigrationPending(true);
          return;
        }
        toast({ title: "Could not clear Buy Box", description: result.message, variant: "destructive" });
        return;
      }
      setForm(criteriaToForm(EMPTY_BUY_BOX));
      setPropertyTypes([]);
      setTargetStates([]);
      setIsActive(true);
      toast({ title: "Buy Box cleared" });
    });
  };

  if (!loaded) return null;

  if (migrationPending) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="size-4" />
          <span>Your Buy Box will be available once the latest schema update is applied.</span>
        </div>
      </div>
    );
  }

  // Free users: compact upsell, no editor.
  if (!canUse) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-2 flex items-center gap-2">
          <Target className="size-4 text-[var(--brand-orange)]" />
          <h2 className="text-base font-bold text-foreground">Your Buy Box</h2>
          <span className="rounded-full bg-[var(--brand-orange)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Pro
          </span>
        </div>
        <p className="mb-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Set your personal acquisition criteria — minimum cap rate, cash-on-cash, DSCR, cash flow, a
          price ceiling, property types, and target markets. Every analysis then shows whether the deal
          <span className="font-semibold text-foreground"> meets your buy box</span>, right alongside its
          Deal Score.
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-orange)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Lock className="size-4" /> Upgrade to set your Buy Box
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="buy-box-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <Target className="size-4 text-primary" />
        <h2 id="buy-box-heading" className="text-base font-bold text-foreground">
          Your Buy Box
        </h2>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Pro
        </span>
      </div>
      <p className="mb-5 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Define what a deal needs to clear for you. Every criterion is optional — leave a field blank to
        skip it. Each analysis shows a <span className="font-semibold text-foreground">Meets your buy box</span>{" "}
        verdict next to its Deal Score; nothing here changes the score itself.
      </p>

      {/* Return thresholds */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {RETURN_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label
              htmlFor={`bb-${field.key}`}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              {field.label}
            </Label>
            <div className="relative">
              <Input
                id={`bb-${field.key}`}
                type="number"
                inputMode="decimal"
                step={field.step}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="h-10 pr-9 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                {field.suffix}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Money thresholds */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MONEY_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label
              htmlFor={`bb-${field.key}`}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              {field.label}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                $
              </span>
              <Input
                id={`bb-${field.key}`}
                type="number"
                inputMode="numeric"
                step={field.step}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="h-10 pl-7 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Property types */}
      <div className="mt-5">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Property types
        </Label>
        <p className="mb-2 mt-0.5 text-[11px] text-muted-foreground">
          Leave all off to allow any type.
        </p>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((type) => {
            const selected = propertyTypes.includes(type);
            return (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                onClick={() =>
                  setPropertyTypes((prev) =>
                    prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                  )
                }
                className="h-8"
              >
                {buyBoxPropertyTypeLabel(type)}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Target markets */}
      <div className="mt-5">
        <Label
          htmlFor="bb-state-input"
          className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          Target markets
        </Label>
        <p className="mb-2 mt-0.5 text-[11px] text-muted-foreground">
          Add the states you buy in. Leave empty to allow any market.
        </p>
        {targetStates.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {targetStates.map((abbr) => (
              <span
                key={abbr}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground"
              >
                {abbr}
                <button
                  type="button"
                  aria-label={`Remove ${abbr}`}
                  onClick={() => setTargetStates((prev) => prev.filter((s) => s !== abbr))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <Input
          id="bb-state-input"
          list="bb-state-options"
          placeholder="Type a state, e.g. PA"
          value={stateInput}
          onChange={(e) => {
            const v = e.target.value;
            // A datalist selection fires onChange with the full option value.
            if (matchState(v)) {
              handleAddState(v);
            } else {
              setStateInput(v);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddState(stateInput);
            }
          }}
          className="h-10 max-w-xs text-sm"
        />
        <datalist id="bb-state-options">
          {stateOptions.map((s) => (
            <option key={s.abbr} value={`${s.abbr} — ${s.name}`} />
          ))}
        </datalist>
      </div>

      {/* Active toggle */}
      <label className="mt-5 flex items-center gap-2.5 text-sm text-foreground">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="size-4 rounded border-border accent-[var(--brand-orange)]"
        />
        Show the buy-box verdict on my analyses
      </label>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={handleClear}
          disabled={isClearing || isSaving}
          className="gap-1.5 text-muted-foreground hover:text-destructive"
        >
          {isClearing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Clear
        </Button>
        <Button onClick={handleSave} disabled={isSaving || isClearing} className="gap-1.5">
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Buy Box
        </Button>
      </div>
    </section>
  );
}
