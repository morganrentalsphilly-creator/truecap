"use client";

import { UseFormReturn } from "react-hook-form";
import { DollarSign, Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";

interface FinancingSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

const optionalPercentSetValueAs = (v: unknown) => {
  if (v === "" || v == null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function FinancingSection({ form }: FinancingSectionProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="bg-[var(--brand-green-light)] rounded-2xl border border-[var(--brand-green)]/20 shadow-sm p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <DollarSign className="w-4 h-4 text-[var(--brand-green)]" />
        <span className="font-semibold text-sm text-foreground">Financing</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label className="text-xs font-semibold text-[var(--brand-green)] mb-1.5 block uppercase tracking-wide">
            Down Payment %
          </Label>
          <div className="relative">
            <Input
              {...register("downPaymentPct", { valueAsNumber: true })}
              type="number"
              step="0.5"
              placeholder="20"
              className={cn(
                "pr-8 border-[var(--brand-green)]/30 bg-background focus-visible:ring-[var(--brand-green)]/30",
                errors.downPaymentPct && "border-destructive"
              )}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <FieldError message={errors.downPaymentPct?.message} />
        </div>

        <div>
          <Label className="text-xs font-semibold text-[var(--brand-green)] mb-1.5 block uppercase tracking-wide">
            Interest Rate %
          </Label>
          <div className="relative">
            <Input
              {...register("interestRate", { valueAsNumber: true })}
              type="number"
              step="0.01"
              placeholder="6.75"
              className={cn(
                "pr-8 border-[var(--brand-green)]/30 bg-background focus-visible:ring-[var(--brand-green)]/30",
                errors.interestRate && "border-destructive"
              )}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <FieldError message={errors.interestRate?.message} />
        </div>

        <div>
          <Label className="text-xs font-semibold text-[var(--brand-green)] mb-1.5 block uppercase tracking-wide">
            Loan Term (Years)
          </Label>
          <Input
            {...register("loanTermYears", { valueAsNumber: true })}
            type="number"
            placeholder="30"
            className={cn(
              "border-[var(--brand-green)]/30 bg-background focus-visible:ring-[var(--brand-green)]/30",
              errors.loanTermYears && "border-destructive"
            )}
          />
          <FieldError message={errors.loanTermYears?.message} />
        </div>

        <div>
          <Label className="text-xs font-semibold text-[var(--brand-green)] mb-1.5 block uppercase tracking-wide">
            Closing Costs % (Optional)
          </Label>
          <div className="relative">
            <Input
              {...register("closingCostsPct", { setValueAs: optionalPercentSetValueAs })}
              type="number"
              step="0.01"
              min={0}
              max={100}
              placeholder="3"
              className={cn(
                "pr-8 border-[var(--brand-green)]/30 bg-background focus-visible:ring-[var(--brand-green)]/30",
                errors.closingCostsPct && "border-destructive"
              )}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Defaults to 3% of purchase price if left blank.
          </p>
          <FieldError message={errors.closingCostsPct?.message} />
        </div>
      </div>
    </div>
  );
}
