"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Percent, ChevronDown, ChevronUp, Info, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
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

export function OperatingExpensesSection({
  form,
  purchasePrice,
}: OperatingExpensesSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const {
    register,
    formState: { errors },
  } = form;

  const propertyTaxEst = Math.round((purchasePrice * 0.011) / 12);
  const insuranceEst = Math.round((purchasePrice * 0.005) / 12);

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
            Estimates based on property value. Click &quot;Show Advanced Options&quot; to
            customize.
          </p>
        </div>
      )}

      {showAdvanced && (
        <div className="mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                Property Tax/mo
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  {...register("propertyTaxMonthly", { setValueAs: moneySetValueAs })}
                  type="number"
                  step="1"
                  min={0}
                  placeholder={String(propertyTaxEst)}
                  className={cn(
                    "pl-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                    errors.propertyTaxMonthly && "border-destructive"
                  )}
                />
              </div>
              <FieldError message={errors.propertyTaxMonthly?.message} />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                Insurance/mo
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  {...register("insuranceMonthly", { setValueAs: moneySetValueAs })}
                  type="number"
                  step="1"
                  min={0}
                  placeholder={String(insuranceEst)}
                  className={cn(
                    "pl-8 border-[var(--brand-orange)]/30 bg-background focus-visible:ring-[var(--brand-orange)]/30",
                    errors.insuranceMonthly && "border-destructive"
                  )}
                />
              </div>
              <FieldError message={errors.insuranceMonthly?.message} />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
                HOA/mo
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
                Utilities/mo
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
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label className="text-xs font-semibold text-[var(--brand-orange)] mb-1.5 block uppercase tracking-wide">
            Maintenance %
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
            Mgmt %
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
            CapEx %
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
    </div>
  );
}
