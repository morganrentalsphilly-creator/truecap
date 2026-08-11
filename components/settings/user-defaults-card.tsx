"use client";

/**
 * User defaults editor — settings card where the user can set their
 * preferred values for the analysis form's percent fields. Saved here
 * once; new analyses pre-fill from these instead of generic defaults.
 *
 * Behavior:
 *   - Lazy-loads current defaults on mount
 *   - All fields optional (leaving blank means "use the engine default")
 *   - Single Save button; toast on success / error
 *   - Graceful migration-pending state
 *
 * Fields included are the ones most users tweak — vacancy, mgmt,
 * maintenance, CapEx, plus the broader financing + projection
 * assumptions. Property-specific fields (price, rent, address) are
 * deliberately NOT settable as defaults — those should always be
 * deal-specific.
 */
import { useEffect, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { Loader2, Save, Sliders } from "lucide-react";
import {
  getUserAnalysisDefaultsAction,
  saveUserAnalysisDefaultsAction,
  type UserAnalysisDefaults,
} from "@/app/actions/user-defaults";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELDS: Array<{
  key: keyof UserAnalysisDefaults;
  label: string;
  suffix: string;
  hint?: string;
  step?: string;
}> = [
  { key: "downPaymentPct", label: "Down payment", suffix: "%", hint: "Default: 20%" },
  { key: "interestRatePct", label: "Interest rate", suffix: "%", hint: "Default: 6.75%", step: "0.01" },
  { key: "loanTermYears", label: "Loan term", suffix: "yr", hint: "Default: 30" },
  { key: "closingCostsPct", label: "Closing costs", suffix: "%", hint: "Default: 3%" },
  { key: "vacancyPct", label: "Vacancy", suffix: "%", hint: "Default: 5%" },
  { key: "mgmtPct", label: "Management", suffix: "%", hint: "Default: 8%" },
  { key: "maintenancePct", label: "Maintenance", suffix: "%", hint: "Default: 8%" },
  { key: "capexPct", label: "CapEx reserve", suffix: "%", hint: "Default: 5%" },
  { key: "taxRatePct", label: "Income tax rate", suffix: "%", hint: "Default: 24%" },
  { key: "rentGrowthPct", label: "Rent growth", suffix: "%", hint: "Default: 2.5%", step: "0.1" },
  { key: "expenseGrowthPct", label: "Expense growth", suffix: "%", hint: "Default: 2.5%", step: "0.1" },
  { key: "appreciationRatePct", label: "Appreciation", suffix: "%", hint: "Default: 3%", step: "0.1" },
  { key: "sellingCostPct", label: "Selling cost", suffix: "%", hint: "Default: 6%", step: "0.1" },
];

export function UserDefaultsCard() {
  const { toast } = useToast();
  const [values, setValues] = useState<Partial<Record<keyof UserAnalysisDefaults, string>>>({});
  const [loaded, setLoaded] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    let cancelled = false;
    // .catch shields the unhandled promise rejection that would
    // otherwise leak to Sentry as "Non-Error promise rejection captured"
    // noise if the action throws (transient Supabase outage, network
    // blip, server crash). Settings load failing is non-critical — we
    // just leave the card in its loading state.
    void getUserAnalysisDefaultsAction()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          const stringified: Partial<Record<keyof UserAnalysisDefaults, string>> = {};
          for (const [k, v] of Object.entries(result.preferences)) {
            if (typeof v === "number" && Number.isFinite(v)) {
              stringified[k as keyof UserAnalysisDefaults] = String(v);
            }
          }
          setValues(stringified);
        } else if (result.code === "MIGRATION_PENDING") {
          setMigrationPending(true);
        }
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[user-defaults] load failed:", err);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = () => {
    if (migrationPending) return;
    const payload: UserAnalysisDefaults = {};
    for (const f of FIELDS) {
      const raw = values[f.key];
      if (raw == null || raw === "") continue;
      const num = Number(raw);
      if (!Number.isFinite(num)) continue;
      (payload as Record<string, number>)[f.key] = num;
    }
    startSaving(async () => {
      try {
        const result = await saveUserAnalysisDefaultsAction(payload);
        if (!result.ok) {
          if (result.code === "MIGRATION_PENDING") {
            setMigrationPending(true);
            return;
          }
          toast({
            title: "Could not save defaults",
            description: result.message,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Defaults saved",
          description: "New analyses will pre-fill with these values.",
        });
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, deploy skew). Without this the Save click is silent
        // — no toast, no signal it failed. Surface a retryable error.
        Sentry.captureException(err, { tags: { feature: "user-defaults" } });
        toast({
          title: "Could not save defaults",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  };

  if (!loaded) return null;

  if (migrationPending) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sliders className="size-4" />
          <span>
            Personal defaults will be available once the latest schema update is applied.
          </span>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="user-defaults-heading"
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <Sliders className="size-4 text-primary" />
        <h2 id="user-defaults-heading" className="text-base font-bold text-foreground">
          Your analysis defaults
        </h2>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        Set your preferred starting values for new analyses. Every field is optional —
        leave it blank to use the engine&apos;s built-in default. These values are
        applied only when you start a new analysis; they don&apos;t change saved deals.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label
              htmlFor={`user-default-${field.key}`}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              {field.label}
            </Label>
            <div className="relative">
              <Input
                id={`user-default-${field.key}`}
                type="number"
                inputMode="decimal"
                step={field.step ?? "1"}
                placeholder={field.hint?.replace("Default: ", "") ?? ""}
                value={values[field.key] ?? ""}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
                className="h-10 pr-10 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                {field.suffix}
              </span>
            </div>
            {field.hint ? (
              <p className="text-[10px] text-muted-foreground">{field.hint}</p>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save defaults
        </Button>
      </div>
    </section>
  );
}
