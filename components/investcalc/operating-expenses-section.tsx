"use client";

import { useState, type ReactNode } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { Percent, ChevronDown, ChevronUp, Info, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface OperatingExpensesSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
  purchasePrice: number;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

const moneySetValueAs = (v: unknown) => {
  if (v === "" || v == null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function FieldLabelWithTooltip({
  label,
  tooltip,
}: {
  label: string;
  tooltip?: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      {tooltip ? (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              aria-label={`${label} guidance`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={6}
            className="max-w-xs border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
          >
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
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
    <div className="bg-[var(--brand-orange-light)] rounded-2xl border border-[var(--brand-orange)]/20 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-[var(--brand-orange)]" />
          <span className="font-semibold text-sm text-foreground">
            Operating Expenses
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced((v) => !v)}
          className="rounded-full text-xs border-[var(--brand-orange)]/30 text-foreground"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 mr-1" />
              Hide Advanced Options
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 mr-1" />
              Show Advanced Options
            </>
          )}
        </Button>
      </div>

      {!showAdvanced && (
        <div className="bg-card rounded-xl border border-[var(--brand-orange)]/15 p-4 mb-5">
          <div className="flex items-center gap-1.5 mb-3">
            <Info className="w-4 h-4 text-[var(--brand-orange)]" />
            <span className="text-sm font-semibold text-[var(--brand-orange)]">
              Auto-Calculated Estimates
            </span>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-1 mb-2">
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
          <p className="text-xs text-[var(--brand-orange)]">
            Estimates use the current form values. Click &quot;Show Advanced Options&quot; to
            customize tax, insurance, HOA, utilities and tax strategy assumptions.
          </p>
        </div>
      )}

      {/* Keep advanced inputs mounted so propertyTaxPct / insuranceMonthly / etc. stay
          registered with RHF when the panel is collapsed (matches visible estimates). */}
      <div className={cn("mb-5", !showAdvanced && "hidden")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                Property Tax % (Annual)
              </Label>
              <div className="relative">
                <Input
                  {...register("propertyTaxPct", { setValueAs: moneySetValueAs })}
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="1.1"
                  className={cn(
                    "pr-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                    errors.propertyTaxPct && "border-destructive"
                  )}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Used as annual tax rate on purchase price.
              </p>
              <FieldError message={errors.propertyTaxPct?.message} />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                Insurance Input
              </Label>
              <Controller
                name="insuranceInputMode"
                control={control}
                render={({ field }) => (
                  <div className="flex rounded-lg border border-[var(--brand-orange)]/30 bg-background p-1">
                    {[
                      { value: "percent", label: "Annual %" },
                      { value: "monthly", label: "Monthly $" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors",
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
              <p className="text-[11px] text-muted-foreground mt-1">
                Choose whether insurance is modeled from an annual percent or a flat monthly amount.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                {insuranceInputMode === "monthly" ? "Insurance (Monthly $)" : "Insurance % (Annual)"}
              </Label>
              <div className="relative">
                {insuranceInputMode === "monthly" ? (
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                ) : null}
                <Input
                  {...register(insuranceInputMode === "monthly" ? "insuranceMonthly" : "insurancePct", {
                    setValueAs: moneySetValueAs,
                  })}
                  type="number"
                  step={insuranceInputMode === "monthly" ? "1" : "0.01"}
                  min={0}
                  placeholder={insuranceInputMode === "monthly" ? String(insuranceEst) : "0.50"}
                  className={cn(
                    insuranceInputMode === "monthly" ? "pl-8" : "pr-8",
                    "border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                    (insuranceInputMode === "monthly" ? errors.insuranceMonthly : errors.insurancePct) &&
                      "border-destructive"
                  )}
                />
                {insuranceInputMode === "percent" ? (
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {insuranceInputMode === "monthly"
                  ? "Flat monthly insurance cost. Leave blank to fall back to the current estimate."
                  : "Annual insurance rate applied to purchase price. Leave blank to use the default 0.5% estimate."}
              </p>
              <FieldError
                message={
                  insuranceInputMode === "monthly"
                    ? errors.insuranceMonthly?.message
                    : errors.insurancePct?.message
                }
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                HOA (Monthly $)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  {...register("hoaMonthly", { setValueAs: moneySetValueAs })}
                  type="number"
                  step="1"
                  min={0}
                  placeholder="0"
                  className={cn(
                    "pl-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                    errors.hoaMonthly && "border-destructive"
                  )}
                />
              </div>
              <FieldError message={errors.hoaMonthly?.message} />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                Utilities (Monthly $)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  {...register("utilitiesMonthly", { setValueAs: moneySetValueAs })}
                  type="number"
                  step="1"
                  min={0}
                  placeholder="0"
                  className={cn(
                    "pl-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                    errors.utilitiesMonthly && "border-destructive"
                  )}
                />
              </div>
              <FieldError message={errors.utilitiesMonthly?.message} />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
            <FieldLabelWithTooltip
              label="Maintenance %"
              tooltip={
                <div className="space-y-1 text-xs leading-snug">
                  <p className="font-semibold text-foreground">Typical benchmark ranges</p>
                  <p>New property: 5–8%</p>
                  <p>Older property: 10–15%</p>
                  <p className="text-muted-foreground">Guidance only. Your input is used exactly as entered.</p>
                </div>
              }
            />
          </Label>
          <div className="relative">
            <Input
              {...register("maintenancePct", { valueAsNumber: true })}
              type="number"
              step="0.5"
              placeholder="10"
              className={cn(
                "pr-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                errors.maintenancePct && "border-destructive"
              )}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <FieldError message={errors.maintenancePct?.message} />
        </div>

        <div>
          <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
            Vacancy %
          </Label>
          <div className="relative">
            <Input
              {...register("vacancyPct", { valueAsNumber: true })}
              type="number"
              step="0.5"
              placeholder="5"
              className={cn(
                "pr-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                errors.vacancyPct && "border-destructive"
              )}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <FieldError message={errors.vacancyPct?.message} />
        </div>

        <div>
          <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
            Management %
          </Label>
          <div className="relative">
            <Input
              {...register("mgmtPct", { valueAsNumber: true })}
              type="number"
              step="0.5"
              placeholder="8"
              className={cn(
                "pr-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                errors.mgmtPct && "border-destructive"
              )}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <FieldError message={errors.mgmtPct?.message} />
        </div>

        <div>
          <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
            <FieldLabelWithTooltip
              label="CapEx %"
              tooltip={
                <div className="space-y-1 text-xs leading-snug">
                  <p className="font-semibold text-foreground">Typical benchmark ranges</p>
                  <p>New property: 5–8%</p>
                  <p>Older property: 10–15%</p>
                  <p className="text-muted-foreground">Guidance only. Your input is used exactly as entered.</p>
                </div>
              }
            />
          </Label>
          <div className="relative">
            <Input
              {...register("capexPct", { valueAsNumber: true })}
              type="number"
              step="0.5"
              placeholder="5"
              className={cn(
                "pr-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                errors.capexPct && "border-destructive"
              )}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <FieldError message={errors.capexPct?.message} />
        </div>
      </div>

      {showAdvanced && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                Building Value %
              </Label>
              <div className="relative">
                <Input
                  {...register("buildingValuePct", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="85"
                  className={cn(
                    "pr-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                    errors.buildingValuePct && "border-destructive"
                  )}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Portion of purchase price allocated to depreciable building value.
              </p>
              <FieldError message={errors.buildingValuePct?.message} />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                Depreciation Period
              </Label>
              <select
                {...register("depreciationYears", { setValueAs: (v) => Number(v) })}
                className={cn(
                  "w-full h-10 rounded-md border px-3 text-sm bg-background border-[var(--brand-orange)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)]/30",
                  errors.depreciationYears && "border-destructive"
                )}
              >
                <option value={27.5}>27.5 years (Residential)</option>
                <option value={39}>39 years (Commercial)</option>
              </select>
              <FieldError message={errors.depreciationYears?.message} />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                Expense Growth %
              </Label>
              <div className="relative">
                <Input
                  {...register("expenseGrowthPct", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="2.5"
                  className={cn(
                    "pr-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                    errors.expenseGrowthPct && "border-destructive"
                  )}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <FieldError message={errors.expenseGrowthPct?.message} />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                Rent Growth %
              </Label>
              <div className="relative">
                <Input
                  {...register("rentGrowthPct", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="2.5"
                  className={cn(
                    "pr-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                    errors.rentGrowthPct && "border-destructive"
                  )}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <FieldError message={errors.rentGrowthPct?.message} />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                Appreciation Rate % <span className="text-[10px] text-muted-foreground">(Exit scenarios)</span>
              </Label>
              <div className="relative">
                <Input
                  {...register("appreciationRatePct", { setValueAs: moneySetValueAs })}
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="3"
                  className={cn(
                    "pr-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                    errors.appreciationRatePct && "border-destructive"
                  )}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Optional. Leave blank to use the default 3% annual appreciation.
              </p>
              <FieldError message={errors.appreciationRatePct?.message} />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                Selling Cost % <span className="text-[10px] text-muted-foreground">(Exit scenarios)</span>
              </Label>
              <div className="relative">
                <Input
                  {...register("sellingCostPct", { setValueAs: moneySetValueAs })}
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="6"
                  className={cn(
                    "pr-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                    errors.sellingCostPct && "border-destructive"
                  )}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Optional. Leave blank to use the default 6% selling cost.
              </p>
              <FieldError message={errors.sellingCostPct?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                Tax Rate % <span className="text-[10px] text-muted-foreground">(Optional, Your personal income tax rate (used for tax savings calculation))</span>
              </Label>
              <div className="relative">
                <Input
                  {...register("taxRatePct", { setValueAs: moneySetValueAs })}
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="24"
                  className={cn(
                    "pr-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                    errors.taxRatePct && "border-destructive"
                  )}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <FieldError message={errors.taxRatePct?.message} />
            </div>

            <div className="flex items-center gap-1.5  px-3 py-2.5 sm:self-end">
              <Label htmlFor="include-interest-deduction" className="text-sm font-medium text-foreground cursor-pointer">
                Include Interest Deduction
              </Label>
              <Controller
                name="includeInterestDeduction"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="include-interest-deduction"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    aria-label="Include interest deduction in estimated tax savings"
                  />
                )}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
