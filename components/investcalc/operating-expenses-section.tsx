"use client";

import { useState, type ReactNode } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Home,
  Info,
  Percent,
  Plug,
  Settings2,
  Wrench,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FieldError, optionalNumberSetValueAs } from "@/components/investcalc/form-field-helpers";
import { GLOSSARY } from "@/lib/glossary";

interface OperatingExpensesSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
  purchasePrice: number;
}

type FieldLabelWithTooltipProps = {
  label: string;
  /**
   * Glossary key. When provided, definition + benchmark are pulled from
   * lib/glossary.ts so all tooltips stay in sync. Falls back to `tooltip`
   * for one-off custom content.
   */
  term?: keyof typeof GLOSSARY;
  tooltip?: ReactNode;
};

const inputClassName =
  "h-10 rounded-lg border-[var(--brand-orange)]/15 bg-background shadow-sm focus-visible:ring-[var(--brand-orange)]/25";

function FieldLabelWithTooltip({ label, term, tooltip }: FieldLabelWithTooltipProps) {
  // If a glossary term is provided, build the tooltip content from the
  // shared glossary so updates flow to one source of truth. Custom
  // `tooltip` prop still wins when explicitly provided.
  const glossaryEntry = term ? GLOSSARY[term] : undefined;
  const content =
    tooltip ??
    (glossaryEntry ? (
      <div className="space-y-1 text-xs leading-snug">
        <p className="font-semibold text-foreground">{glossaryEntry.term}</p>
        <p className="text-muted-foreground">{glossaryEntry.definition}</p>
        {glossaryEntry.benchmark ? (
          <p className="text-muted-foreground italic">{glossaryEntry.benchmark}</p>
        ) : null}
      </div>
    ) : null);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      {content ? (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex size-3.5 items-center justify-center rounded-full text-[var(--brand-orange)]/70 hover:text-[var(--brand-orange)]"
              aria-label={`${label} guidance`}
            >
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={6}
            className="max-w-xs border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
          >
            {content}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

function FieldLabel({
  children,
  icon,
  htmlFor,
}: {
  children: ReactNode;
  icon?: ReactNode;
  htmlFor?: string;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--brand-orange)]"
    >
      {icon ? <span className="text-[var(--brand-orange)]/80">{icon}</span> : null}
      {children}
    </Label>
  );
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-2 min-h-[32px] text-[11px] leading-relaxed text-muted-foreground">{children}</p>;
}

function SectionField({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("min-w-0 px-4 py-4", className)}>{children}</div>;
}

function PercentIcon() {
  return (
    <Percent className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
  );
}

function DollarIcon() {
  return (
    <DollarSign className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
  );
}

export function OperatingExpensesSection({
  form,
  purchasePrice,
}: OperatingExpensesSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;

  const propertyTaxPct = watch("propertyTaxPct");
  const propertyTaxInputMode = watch("propertyTaxInputMode");
  const propertyTaxAnnual = watch("propertyTaxAnnual");
  const propertyType = watch("propertyType");
  const utilitiesMonthly = watch("utilitiesMonthly");
  const insuranceInputMode = watch("insuranceInputMode");
  const insurancePct = watch("insurancePct");
  const insuranceMonthly = watch("insuranceMonthly");
  const purchasePriceForEstimate = Number.isFinite(purchasePrice) ? purchasePrice : 0;
  // No price entered yet → don't show "$0/mo" (reads like a false claim that
  // the property has no tax/insurance); show a dash until there's a price.
  const hasPrice = purchasePriceForEstimate > 0;
  const propertyTaxPctEffective = propertyTaxPct ?? 1.1;
  const propertyTaxPctEst = Math.round((purchasePriceForEstimate * (propertyTaxPctEffective / 100)) / 12);
  // Annual-$ mode mirrors calc-analysis: the bill /12, falling back to the
  // percent estimate while the field is blank.
  const propertyTaxEst =
    propertyTaxInputMode === "annual" && propertyTaxAnnual != null
      ? Math.round(propertyTaxAnnual / 12)
      : propertyTaxPctEst;
  const insurancePctEffective = insurancePct ?? 0.5;
  const insuranceDefault = Math.round((purchasePriceForEstimate * (insurancePctEffective / 100)) / 12);
  const insuranceEst =
    insuranceInputMode === "monthly"
      ? Math.round(insuranceMonthly ?? insuranceDefault)
      : insuranceDefault;

  return (
    // Card chrome unified with the other input sections - `bg-card` +
    // neutral border. Previously the orange tint made the form read as
    // three glued-together products. Orange stays on the icon and the
    // per-field accent borders to preserve the "this is operating
    // expenses" cue.
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full text-[var(--brand-orange)]">
            <Settings2 className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">Operating Expenses</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Estimate and manage your ongoing property expenses.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced((v) => !v)}
          className="h-8 rounded-full border-[var(--brand-orange)]/20 bg-background px-4 text-xs font-medium text-foreground shadow-sm hover:bg-background"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="mr-1.5 size-3.5" />
              Hide Advanced Options
            </>
          ) : (
            <>
              <ChevronDown className="mr-1.5 size-3.5" />
              Show Advanced Options
            </>
          )}
        </Button>
      </div>

      {!showAdvanced && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Info className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              Using sensible defaults
            </span>
          </div>
          {/* Auto-calculated dollar estimates (computed from purchase
              price × default %). */}
          <div className="mb-2.5 flex flex-wrap gap-x-8 gap-y-1">
            <div>
              <span className="text-sm text-muted-foreground">Property Tax:</span>{" "}
              <span className="text-sm font-semibold text-foreground">
                {hasPrice ? `$${propertyTaxEst.toLocaleString()}/mo` : "—"}
              </span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Insurance:</span>{" "}
              <span className="text-sm font-semibold text-foreground">
                {hasPrice ? `$${insuranceEst.toLocaleString()}/mo` : "—"}
              </span>
            </div>
          </div>
          {/* Default percentages summary - the four operating-cost
              assumptions that used to show as four full Input fields
              even on the empty form. Surfacing them as a compact
              one-line summary cuts ~120px of visible form height and
              keeps the "60 seconds" promise credible. User clicks
              "Show Advanced Options" to override any of them. */}
          <div className="mb-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">
              Vacancy <span className="font-semibold text-foreground">5%</span>
            </span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span className="text-muted-foreground">
              Management <span className="font-semibold text-foreground">8%</span>
            </span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span className="text-muted-foreground">
              Maintenance <span className="font-semibold text-foreground">10%</span>
            </span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span className="text-muted-foreground">
              CapEx <span className="font-semibold text-foreground">5%</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Click &quot;Show Advanced Options&quot; to override any of these or
            customize tax, insurance, HOA, utilities, and tax strategy.
          </p>
        </div>
      )}

      {/* Expense-realism guard (Phase 2 #2): a multi-unit modeled with $0
          owner-paid utilities is the most common way an underwrite sails
          through too rosy — landlords typically cover water/sewer/trash
          and common-area electric on 2+ units. Non-blocking nudge, never
          an error; renders only for multi-family with utilities blank/0
          (visible even while Advanced is collapsed, which is exactly when
          the $0 slips through). */}
      {propertyType === "multi-family" && !((utilitiesMonthly ?? 0) > 0) ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="min-w-0 text-xs leading-relaxed text-amber-900">
            <span className="font-semibold">Owner-paid utilities are $0.</span>{" "}
            Most multi-family owners cover water, sewer, trash, or common-area
            electric — a $0 assumption usually overstates cash flow.{" "}
            <button
              type="button"
              onClick={() => {
                setShowAdvanced(true);
                // Post-commit tick: the advanced panel must be unhidden
                // before a focus() on the input can land.
                setTimeout(() => document.getElementById("utilitiesMonthly")?.focus(), 60);
              }}
              className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
            >
              Add utilities
            </button>
          </div>
        </div>
      ) : null}

      {/* Keep advanced inputs mounted so RHF values remain registered while the panel is collapsed. */}
      <div className="space-y-4">
        <div className={cn("overflow-hidden rounded-xl border border-[var(--brand-orange)]/10 bg-card/50", !showAdvanced && "hidden")}>
          {/* Three cells (Property Tax / Insurance / HOA) since the
              insurance mode toggle moved inline into its value cell —
              xl shows all three in one row. */}
          <div className="grid grid-cols-1 divide-y divide-[var(--brand-orange)]/10 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-3">
            <SectionField>
              <FieldLabel htmlFor="propertyTaxAmount">
                <FieldLabelWithTooltip
                  label={propertyTaxInputMode === "annual" ? "Property Tax (Annual $)" : "Property Tax % (Annual)"}
                  term="propertyTax"
                />
              </FieldLabel>
              {/* % ⇄ $ mode toggle (Phase 2 #3): listings state the actual
                  annual bill — let users type that number directly instead
                  of reverse-engineering a rate. Insurance in the next cell
                  uses the same inline-toggle pattern. */}
              <Controller
                name="propertyTaxInputMode"
                control={control}
                render={({ field }) => (
                  <div className="mb-2 flex rounded-lg border border-[var(--brand-orange)]/10 bg-background p-1 shadow-sm">
                    {[
                      { value: "percent", label: "Annual %" },
                      { value: "annual", label: "Annual $" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "h-8 flex-1 rounded-md px-3 text-xs font-semibold transition-colors",
                          field.value === option.value
                            ? "bg-[var(--brand-orange)] text-white"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              />
              <div className="relative">
                {propertyTaxInputMode === "annual" ? <DollarIcon /> : null}
                <Input
                  {...register(propertyTaxInputMode === "annual" ? "propertyTaxAnnual" : "propertyTaxPct", {
                    setValueAs: optionalNumberSetValueAs,
                  })}
                  id="propertyTaxAmount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  {...(propertyTaxInputMode === "annual" ? {} : { max: 100 })}
                  placeholder={
                    propertyTaxInputMode === "annual"
                      ? hasPrice
                        ? String(Math.round(purchasePriceForEstimate * 0.011))
                        : "3000"
                      : "1.1"
                  }
                  aria-invalid={
                    !!(propertyTaxInputMode === "annual" ? errors.propertyTaxAnnual : errors.propertyTaxPct)
                  }
                  aria-describedby={
                    (propertyTaxInputMode === "annual" ? errors.propertyTaxAnnual : errors.propertyTaxPct)
                      ? "propertyTaxAmount-error"
                      : undefined
                  }
                  className={cn(
                    inputClassName,
                    propertyTaxInputMode === "annual" ? "pl-8" : "pr-8",
                    (propertyTaxInputMode === "annual" ? errors.propertyTaxAnnual : errors.propertyTaxPct) &&
                      "border-destructive"
                  )}
                />
                {propertyTaxInputMode === "percent" ? <PercentIcon /> : null}
              </div>
              <FieldHint>
                {propertyTaxInputMode === "annual"
                  ? "The actual annual tax bill from the listing. Leave blank to fall back to the % estimate."
                  : "Used as annual tax rate on purchase price."}
              </FieldHint>
              <FieldError
                id="propertyTaxAmount-error"
                message={
                  (propertyTaxInputMode === "annual" ? errors.propertyTaxAnnual : errors.propertyTaxPct)?.message
                }
              />
            </SectionField>

            <SectionField>
              <FieldLabel htmlFor="insuranceAmount">
                <FieldLabelWithTooltip
                  label={insuranceInputMode === "monthly" ? "Insurance (Monthly $)" : "Insurance % (Annual)"}
                  term="insurance"
                />
              </FieldLabel>
              {/* % ⇄ $ mode toggle, inline above the value input so
                  Insurance reads as ONE field — mirrors the Property Tax
                  cell's inline toggle rather than burning a separate grid
                  cell on a mode picker. */}
              <Controller
                name="insuranceInputMode"
                control={control}
                render={({ field }) => (
                  <div className="mb-2 flex rounded-lg border border-[var(--brand-orange)]/10 bg-background p-1 shadow-sm">
                    {[
                      { value: "percent", label: "Annual %" },
                      { value: "monthly", label: "Monthly $" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "h-8 flex-1 rounded-md px-3 text-xs font-semibold transition-colors",
                          field.value === option.value
                            ? "bg-[var(--brand-orange)] text-white"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              />
              <div className="relative">
                {insuranceInputMode === "monthly" ? <DollarIcon /> : null}
                <Input
                  {...register(insuranceInputMode === "monthly" ? "insuranceMonthly" : "insurancePct", {
                    setValueAs: optionalNumberSetValueAs,
                  })}
                  id="insuranceAmount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder={insuranceInputMode === "monthly" ? String(insuranceEst) : "0.50"}
                  aria-invalid={
                    !!(insuranceInputMode === "monthly" ? errors.insuranceMonthly : errors.insurancePct)
                  }
                  aria-describedby={
                    (insuranceInputMode === "monthly" ? errors.insuranceMonthly : errors.insurancePct)
                      ? "insuranceAmount-error"
                      : undefined
                  }
                  className={cn(
                    inputClassName,
                    insuranceInputMode === "monthly" ? "pl-8" : "pr-8",
                    (insuranceInputMode === "monthly" ? errors.insuranceMonthly : errors.insurancePct) &&
                      "border-destructive"
                  )}
                />
                {insuranceInputMode === "percent" ? <PercentIcon /> : null}
              </div>
              <FieldHint>
                {insuranceInputMode === "monthly"
                  ? "Flat monthly insurance cost. Leave blank to fall back to the current estimate."
                  : "Annual insurance rate applied to purchase price. Leave blank to use the default 0.5%."}
              </FieldHint>
              <FieldError
                id="insuranceAmount-error"
                message={
                  insuranceInputMode === "monthly"
                    ? errors.insuranceMonthly?.message
                    : errors.insurancePct?.message
                }
              />
            </SectionField>

            <SectionField>
              <FieldLabel htmlFor="hoaMonthly">
                <FieldLabelWithTooltip label="HOA (Monthly $)" term="hoa" />
              </FieldLabel>
              <div className="relative">
                <DollarIcon />
                <Input
                  {...register("hoaMonthly", { setValueAs: optionalNumberSetValueAs })}
                  id="hoaMonthly"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="0"
                  aria-invalid={!!errors.hoaMonthly}
                  aria-describedby={errors.hoaMonthly ? "hoaMonthly-error" : undefined}
                  className={cn(inputClassName, "pl-8", errors.hoaMonthly && "border-destructive")}
                />
              </div>
              <FieldHint>Monthly homeowners association fees if applicable.</FieldHint>
              <FieldError id="hoaMonthly-error" message={errors.hoaMonthly?.message} />
            </SectionField>
          </div>
        </div>

        <div className={cn(showAdvanced && "rounded-xl border border-[var(--brand-orange)]/10 bg-card/50 p-2")}>
          <p className={cn("px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-[var(--brand-orange)]", !showAdvanced && "hidden")}>
            Monthly Operating Expenses
          </p>
          <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", showAdvanced ? "xl:grid-cols-3 2xl:grid-cols-5" : "xl:grid-cols-4")}>
            <SectionField className={cn("rounded-lg border border-[var(--brand-orange)]/10 bg-card p-3", !showAdvanced && "hidden")}>
              <FieldLabel icon={<Plug className="size-3" />} htmlFor="utilitiesMonthly">
                <FieldLabelWithTooltip label="Utilities" term="utilities" />
              </FieldLabel>
              <div className="relative">
                <DollarIcon />
                <Input
                  {...register("utilitiesMonthly", { setValueAs: optionalNumberSetValueAs })}
                  id="utilitiesMonthly"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="0"
                  aria-invalid={!!errors.utilitiesMonthly}
                  aria-describedby={errors.utilitiesMonthly ? "utilitiesMonthly-error" : undefined}
                  className={cn(inputClassName, "pl-8", errors.utilitiesMonthly && "border-destructive")}
                />
              </div>
              <FieldError id="utilitiesMonthly-error" message={errors.utilitiesMonthly?.message} />
            </SectionField>

            {/* Maintenance / Vacancy / Management / CapEx - previously
                visible on the empty form. Now hidden by default in the
                same way Utilities / Property Tax already are; surfaced
                as a one-line default summary in the "Using sensible
                defaults" block above. User clicks "Show Advanced
                Options" to override any of these inputs. */}
            <SectionField className={cn("rounded-lg border border-[var(--brand-orange)]/10 bg-card p-3", !showAdvanced && "hidden")}>
              <FieldLabel icon={<Wrench className="size-3" />} htmlFor="maintenancePct">
                <FieldLabelWithTooltip label="Maintenance %" term="maintenance" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("maintenancePct", { valueAsNumber: true })}
                  id="maintenancePct"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="10"
                  aria-invalid={!!errors.maintenancePct}
                  aria-describedby={errors.maintenancePct ? "maintenancePct-error" : undefined}
                  className={cn(inputClassName, "pr-8", errors.maintenancePct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldError id="maintenancePct-error" message={errors.maintenancePct?.message} />
            </SectionField>

            <SectionField className={cn("rounded-lg border border-[var(--brand-orange)]/10 bg-card p-3", !showAdvanced && "hidden")}>
              <FieldLabel icon={<Home className="size-3" />} htmlFor="vacancyPct">
                <FieldLabelWithTooltip label="Vacancy %" term="vacancy" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("vacancyPct", { valueAsNumber: true })}
                  id="vacancyPct"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="5"
                  aria-invalid={!!errors.vacancyPct}
                  aria-describedby={errors.vacancyPct ? "vacancyPct-error" : undefined}
                  className={cn(inputClassName, "pr-8", errors.vacancyPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldError id="vacancyPct-error" message={errors.vacancyPct?.message} />
            </SectionField>

            <SectionField className={cn("rounded-lg border border-[var(--brand-orange)]/10 bg-card p-3", !showAdvanced && "hidden")}>
              <FieldLabel icon={<Building2 className="size-3" />} htmlFor="mgmtPct">
                <FieldLabelWithTooltip label="Management %" term="management" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("mgmtPct", { valueAsNumber: true })}
                  id="mgmtPct"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="8"
                  aria-invalid={!!errors.mgmtPct}
                  aria-describedby={errors.mgmtPct ? "mgmtPct-error" : undefined}
                  className={cn(inputClassName, "pr-8", errors.mgmtPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldError id="mgmtPct-error" message={errors.mgmtPct?.message} />
            </SectionField>

            <SectionField className={cn("rounded-lg border border-[var(--brand-orange)]/10 bg-card p-3", !showAdvanced && "hidden")}>
              <FieldLabel icon={<BarChart3 className="size-3" />} htmlFor="capexPct">
                <FieldLabelWithTooltip label="CapEx %" term="capex" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("capexPct", { valueAsNumber: true })}
                  id="capexPct"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="5"
                  aria-invalid={!!errors.capexPct}
                  aria-describedby={errors.capexPct ? "capexPct-error" : undefined}
                  className={cn(inputClassName, "pr-8", errors.capexPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldError id="capexPct-error" message={errors.capexPct?.message} />
            </SectionField>
          </div>
        </div>

        <div className={cn("rounded-xl border border-[var(--brand-orange)]/10 bg-card/50 p-3", !showAdvanced && "hidden")}>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--brand-orange)]">
            Advanced Options (Optional)
          </p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel htmlFor="buildingValuePct">
                <FieldLabelWithTooltip label="Building Value %" term="buildingValue" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("buildingValuePct", { valueAsNumber: true })}
                  id="buildingValuePct"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="85"
                  aria-invalid={!!errors.buildingValuePct}
                  aria-describedby={errors.buildingValuePct ? "buildingValuePct-error" : undefined}
                  className={cn(inputClassName, "pr-8", errors.buildingValuePct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Portion of purchase price allocated to depreciable building value.</FieldHint>
              <FieldError id="buildingValuePct-error" message={errors.buildingValuePct?.message} />
            </div>

            <div>
              <FieldLabel htmlFor="depreciationYears">
                <FieldLabelWithTooltip label="Depreciation Period" term="depreciationYears" />
              </FieldLabel>
              <select
                {...register("depreciationYears", { setValueAs: (v) => Number(v) })}
                id="depreciationYears"
                aria-invalid={!!errors.depreciationYears}
                aria-describedby={errors.depreciationYears ? "depreciationYears-error" : undefined}
                className={cn(
                  "h-10 w-full rounded-lg border border-[var(--brand-orange)]/15 bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)]/25",
                  errors.depreciationYears && "border-destructive"
                )}
              >
                <option value={27.5}>27.5 years (Residential)</option>
                <option value={39}>39 years (Commercial)</option>
              </select>
              <FieldHint>IRS standard recovery period for depreciation.</FieldHint>
              <FieldError id="depreciationYears-error" message={errors.depreciationYears?.message} />
            </div>

            <div>
              <FieldLabel htmlFor="expenseGrowthPct">
                <FieldLabelWithTooltip label="Expense Growth %" term="expenseGrowth" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("expenseGrowthPct", { valueAsNumber: true })}
                  id="expenseGrowthPct"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="2.5"
                  aria-invalid={!!errors.expenseGrowthPct}
                  aria-describedby={errors.expenseGrowthPct ? "expenseGrowthPct-error" : undefined}
                  className={cn(inputClassName, "pr-8", errors.expenseGrowthPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Annual growth rate for operating expenses.</FieldHint>
              <FieldError id="expenseGrowthPct-error" message={errors.expenseGrowthPct?.message} />
            </div>

            <div>
              <FieldLabel htmlFor="rentGrowthPct">
                <FieldLabelWithTooltip label="Rent Growth %" term="rentGrowth" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("rentGrowthPct", { valueAsNumber: true })}
                  id="rentGrowthPct"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="2.5"
                  aria-invalid={!!errors.rentGrowthPct}
                  aria-describedby={errors.rentGrowthPct ? "rentGrowthPct-error" : undefined}
                  className={cn(inputClassName, "pr-8", errors.rentGrowthPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Annual growth rate for rental income.</FieldHint>
              <FieldError id="rentGrowthPct-error" message={errors.rentGrowthPct?.message} />
            </div>

            <div>
              <FieldLabel htmlFor="appreciationRatePct">
                <FieldLabelWithTooltip label="Appreciation Rate % (Exit Scenarios)" term="appreciation" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("appreciationRatePct", { setValueAs: optionalNumberSetValueAs })}
                  id="appreciationRatePct"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="3"
                  aria-invalid={!!errors.appreciationRatePct}
                  aria-describedby={errors.appreciationRatePct ? "appreciationRatePct-error" : undefined}
                  className={cn(inputClassName, "pr-8", errors.appreciationRatePct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Expected annual property appreciation rate.</FieldHint>
              <FieldError id="appreciationRatePct-error" message={errors.appreciationRatePct?.message} />
            </div>

            <div>
              <FieldLabel htmlFor="sellingCostPct">
                <FieldLabelWithTooltip label="Selling Cost % (Exit Scenarios)" term="sellingCost" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("sellingCostPct", { setValueAs: optionalNumberSetValueAs })}
                  id="sellingCostPct"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="6"
                  aria-invalid={!!errors.sellingCostPct}
                  aria-describedby={errors.sellingCostPct ? "sellingCostPct-error" : undefined}
                  className={cn(inputClassName, "pr-8", errors.sellingCostPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Total selling costs as a percentage of sale price.</FieldHint>
              <FieldError id="sellingCostPct-error" message={errors.sellingCostPct?.message} />
            </div>

            <div>
              <FieldLabel htmlFor="taxRatePct">
                <FieldLabelWithTooltip label="Tax Rate % (Optional)" term="taxSavings" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("taxRatePct", { setValueAs: optionalNumberSetValueAs })}
                  id="taxRatePct"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="24"
                  aria-invalid={!!errors.taxRatePct}
                  aria-describedby={errors.taxRatePct ? "taxRatePct-error" : undefined}
                  className={cn(inputClassName, "pr-8", errors.taxRatePct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Your personal income tax rate for tax savings calculation.</FieldHint>
              <FieldError id="taxRatePct-error" message={errors.taxRatePct?.message} />
            </div>

            <div className="flex min-h-[94px] items-start justify-between gap-4 pt-1 xl:items-center">
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <Label
                    htmlFor="include-interest-deduction"
                    className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-[var(--brand-orange)]"
                  >
                    Include Interest Deduction
                  </Label>
                  <Tooltip delayDuration={150}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex size-3.5 items-center justify-center rounded-full text-[var(--brand-orange)]/70 hover:text-[var(--brand-orange)]"
                        aria-label="Include interest deduction guidance"
                      >
                        <Info className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={6}
                      className="max-w-xs border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
                    >
                      Include mortgage interest deduction in cash flow and taxes.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Include mortgage interest deduction in cash flow and taxes.
                </p>
              </div>
              <Controller
                name="includeInterestDeduction"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="include-interest-deduction"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    aria-label="Include interest deduction in estimated tax savings"
                    className="mt-0.5 data-[state=checked]:bg-[var(--brand-orange)]"
                  />
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
