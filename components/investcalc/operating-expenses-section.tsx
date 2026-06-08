"use client";

import { useState, type ReactNode } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import {
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
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--brand-orange)]">
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
  const insuranceInputMode = watch("insuranceInputMode");
  const insurancePct = watch("insurancePct");
  const insuranceMonthly = watch("insuranceMonthly");
  const purchasePriceForEstimate = Number.isFinite(purchasePrice) ? purchasePrice : 0;
  const propertyTaxPctEffective = propertyTaxPct ?? 1.1;
  const propertyTaxEst = Math.round((purchasePriceForEstimate * (propertyTaxPctEffective / 100)) / 12);
  const insurancePctEffective = insurancePct ?? 0.5;
  const insuranceDefault = Math.round((purchasePriceForEstimate * (insurancePctEffective / 100)) / 12);
  const insuranceEst =
    insuranceInputMode === "monthly"
      ? Math.round(insuranceMonthly ?? insuranceDefault)
      : insuranceDefault;

  return (
    <div className="rounded-2xl border border-[var(--brand-orange)]/20 bg-[var(--brand-orange-light)] p-4 shadow-sm sm:p-6">
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
        <div className="mb-4 rounded-xl border border-[var(--brand-orange)]/15 bg-card p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Info className="size-4 text-[var(--brand-orange)]" />
            <span className="text-sm font-semibold text-[var(--brand-orange)]">
              Using sensible defaults
            </span>
          </div>
          {/* Auto-calculated dollar estimates (computed from purchase
              price × default %). */}
          <div className="mb-2.5 flex flex-wrap gap-x-8 gap-y-1">
            <div>
              <span className="text-sm text-muted-foreground">Property Tax:</span>{" "}
              <span className="text-sm font-semibold text-foreground">
                ${propertyTaxEst.toLocaleString()}/mo
              </span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Insurance:</span>{" "}
              <span className="text-sm font-semibold text-foreground">
                ${insuranceEst.toLocaleString()}/mo
              </span>
            </div>
          </div>
          {/* Default percentages summary — the four operating-cost
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
          <p className="text-xs text-[var(--brand-orange)]">
            Click &quot;Show Advanced Options&quot; to override any of these or
            customize tax, insurance, HOA, utilities, and tax strategy.
          </p>
        </div>
      )}

      {/* Keep advanced inputs mounted so RHF values remain registered while the panel is collapsed. */}
      <div className="space-y-4">
        <div className={cn("overflow-hidden rounded-xl border border-[var(--brand-orange)]/10 bg-card/50", !showAdvanced && "hidden")}>
          <div className="grid grid-cols-1 divide-y divide-[var(--brand-orange)]/10 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
            <SectionField>
              <FieldLabel>
                <FieldLabelWithTooltip label="Property Tax % (Annual)" term="propertyTax" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("propertyTaxPct", { setValueAs: optionalNumberSetValueAs })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="1.1"
                  className={cn(inputClassName, "pr-8", errors.propertyTaxPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Used as annual tax rate on purchase price.</FieldHint>
              <FieldError message={errors.propertyTaxPct?.message} />
            </SectionField>

            <SectionField>
              <FieldLabel>Insurance Input</FieldLabel>
              <Controller
                name="insuranceInputMode"
                control={control}
                render={({ field }) => (
                  <div className="flex rounded-lg border border-[var(--brand-orange)]/10 bg-background p-1 shadow-sm">
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
              <FieldHint>
                Choose whether insurance is modeled as an annual percent or a flat monthly amount.
              </FieldHint>
            </SectionField>

            <SectionField>
              <FieldLabel>
                <FieldLabelWithTooltip
                  label={insuranceInputMode === "monthly" ? "Insurance (Monthly $)" : "Insurance % (Annual)"}
                  term="insurance"
                />
              </FieldLabel>
              <div className="relative">
                {insuranceInputMode === "monthly" ? <DollarIcon /> : null}
                <Input
                  {...register(insuranceInputMode === "monthly" ? "insuranceMonthly" : "insurancePct", {
                    setValueAs: optionalNumberSetValueAs,
                  })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder={insuranceInputMode === "monthly" ? String(insuranceEst) : "0.50"}
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
                message={
                  insuranceInputMode === "monthly"
                    ? errors.insuranceMonthly?.message
                    : errors.insurancePct?.message
                }
              />
            </SectionField>

            <SectionField>
              <FieldLabel>
                <FieldLabelWithTooltip label="HOA (Monthly $)" term="hoa" />
              </FieldLabel>
              <div className="relative">
                <DollarIcon />
                <Input
                  {...register("hoaMonthly", { setValueAs: optionalNumberSetValueAs })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="0"
                  className={cn(inputClassName, "pl-8", errors.hoaMonthly && "border-destructive")}
                />
              </div>
              <FieldHint>Monthly homeowners association fees if applicable.</FieldHint>
              <FieldError message={errors.hoaMonthly?.message} />
            </SectionField>
          </div>
        </div>

        <div className={cn(showAdvanced && "rounded-xl border border-[var(--brand-orange)]/10 bg-card/50 p-2")}>
          <p className={cn("px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-[var(--brand-orange)]", !showAdvanced && "hidden")}>
            Monthly Operating Expenses
          </p>
          <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", showAdvanced ? "xl:grid-cols-3 2xl:grid-cols-5" : "xl:grid-cols-4")}>
            <SectionField className={cn("rounded-lg border border-[var(--brand-orange)]/10 bg-card p-3", !showAdvanced && "hidden")}>
              <FieldLabel icon={<Plug className="size-3" />}>
                <FieldLabelWithTooltip label="Utilities" term="utilities" />
              </FieldLabel>
              <div className="relative">
                <DollarIcon />
                <Input
                  {...register("utilitiesMonthly", { setValueAs: optionalNumberSetValueAs })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="0"
                  className={cn(inputClassName, "pl-8", errors.utilitiesMonthly && "border-destructive")}
                />
              </div>
              <FieldError message={errors.utilitiesMonthly?.message} />
            </SectionField>

            {/* Maintenance / Vacancy / Management / CapEx — previously
                visible on the empty form. Now hidden by default in the
                same way Utilities / Property Tax already are; surfaced
                as a one-line default summary in the "Using sensible
                defaults" block above. User clicks "Show Advanced
                Options" to override any of these inputs. */}
            <SectionField className={cn("rounded-lg border border-[var(--brand-orange)]/10 bg-card p-3", !showAdvanced && "hidden")}>
              <FieldLabel icon={<Wrench className="size-3" />}>
                <FieldLabelWithTooltip label="Maintenance %" term="maintenance" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("maintenancePct", { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="10"
                  className={cn(inputClassName, "pr-8", errors.maintenancePct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldError message={errors.maintenancePct?.message} />
            </SectionField>

            <SectionField className={cn("rounded-lg border border-[var(--brand-orange)]/10 bg-card p-3", !showAdvanced && "hidden")}>
              <FieldLabel icon={<Home className="size-3" />}>
                <FieldLabelWithTooltip label="Vacancy %" term="vacancy" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("vacancyPct", { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="5"
                  className={cn(inputClassName, "pr-8", errors.vacancyPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldError message={errors.vacancyPct?.message} />
            </SectionField>

            <SectionField className={cn("rounded-lg border border-[var(--brand-orange)]/10 bg-card p-3", !showAdvanced && "hidden")}>
              <FieldLabel icon={<Building2 className="size-3" />}>
                <FieldLabelWithTooltip label="Management %" term="management" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("mgmtPct", { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="8"
                  className={cn(inputClassName, "pr-8", errors.mgmtPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldError message={errors.mgmtPct?.message} />
            </SectionField>

            <SectionField className={cn("rounded-lg border border-[var(--brand-orange)]/10 bg-card p-3", !showAdvanced && "hidden")}>
              <FieldLabel icon={<BarChart3 className="size-3" />}>
                <FieldLabelWithTooltip label="CapEx %" term="capex" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("capexPct", { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="5"
                  className={cn(inputClassName, "pr-8", errors.capexPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldError message={errors.capexPct?.message} />
            </SectionField>
          </div>
        </div>

        <div className={cn("rounded-xl border border-[var(--brand-orange)]/10 bg-card/50 p-3", !showAdvanced && "hidden")}>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--brand-orange)]">
            Advanced Options (Optional)
          </p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel>
                <FieldLabelWithTooltip label="Building Value %" term="buildingValue" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("buildingValuePct", { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="85"
                  className={cn(inputClassName, "pr-8", errors.buildingValuePct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Portion of purchase price allocated to depreciable building value.</FieldHint>
              <FieldError message={errors.buildingValuePct?.message} />
            </div>

            <div>
              <FieldLabel>
                <FieldLabelWithTooltip label="Depreciation Period" term="depreciationYears" />
              </FieldLabel>
              <select
                {...register("depreciationYears", { setValueAs: (v) => Number(v) })}
                className={cn(
                  "h-10 w-full rounded-lg border border-[var(--brand-orange)]/15 bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)]/25",
                  errors.depreciationYears && "border-destructive"
                )}
              >
                <option value={27.5}>27.5 years (Residential)</option>
                <option value={39}>39 years (Commercial)</option>
              </select>
              <FieldHint>IRS standard recovery period for depreciation.</FieldHint>
              <FieldError message={errors.depreciationYears?.message} />
            </div>

            <div>
              <FieldLabel>
                <FieldLabelWithTooltip label="Expense Growth %" term="expenseGrowth" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("expenseGrowthPct", { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="2.5"
                  className={cn(inputClassName, "pr-8", errors.expenseGrowthPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Annual growth rate for operating expenses.</FieldHint>
              <FieldError message={errors.expenseGrowthPct?.message} />
            </div>

            <div>
              <FieldLabel>
                <FieldLabelWithTooltip label="Rent Growth %" term="rentGrowth" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("rentGrowthPct", { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="2.5"
                  className={cn(inputClassName, "pr-8", errors.rentGrowthPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Annual growth rate for rental income.</FieldHint>
              <FieldError message={errors.rentGrowthPct?.message} />
            </div>

            <div>
              <FieldLabel>
                <FieldLabelWithTooltip label="Appreciation Rate % (Exit Scenarios)" term="appreciation" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("appreciationRatePct", { setValueAs: optionalNumberSetValueAs })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="3"
                  className={cn(inputClassName, "pr-8", errors.appreciationRatePct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Expected annual property appreciation rate.</FieldHint>
              <FieldError message={errors.appreciationRatePct?.message} />
            </div>

            <div>
              <FieldLabel>
                <FieldLabelWithTooltip label="Selling Cost % (Exit Scenarios)" term="sellingCost" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("sellingCostPct", { setValueAs: optionalNumberSetValueAs })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="6"
                  className={cn(inputClassName, "pr-8", errors.sellingCostPct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Total selling costs as a percentage of sale price.</FieldHint>
              <FieldError message={errors.sellingCostPct?.message} />
            </div>

            <div>
              <FieldLabel>
                <FieldLabelWithTooltip label="Tax Rate % (Optional)" term="taxSavings" />
              </FieldLabel>
              <div className="relative">
                <Input
                  {...register("taxRatePct", { setValueAs: optionalNumberSetValueAs })}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="24"
                  className={cn(inputClassName, "pr-8", errors.taxRatePct && "border-destructive")}
                />
                <PercentIcon />
              </div>
              <FieldHint>Your personal income tax rate for tax savings calculation.</FieldHint>
              <FieldError message={errors.taxRatePct?.message} />
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
