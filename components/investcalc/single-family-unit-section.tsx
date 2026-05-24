"use client";

import { UseFormReturn } from "react-hook-form";
import { Home, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/investcalc/form-field-helpers";

interface SingleFamilyUnitSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
}

export function SingleFamilyUnitSection({ form }: SingleFamilyUnitSectionProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Home className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">Unit Details</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div>
          <Label className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
            Bedrooms
          </Label>
          <Input
            {...register("bedrooms", { valueAsNumber: true })}
            type="number"
            inputMode="decimal"
            placeholder="3"
            className={cn(
              "border-input bg-background",
              errors.bedrooms && "border-destructive"
            )}
          />
          <FieldError message={errors.bedrooms?.message} />
        </div>

        <div>
          <Label className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
            Bathrooms
          </Label>
          <Input
            {...register("bathrooms", { valueAsNumber: true })}
            type="number"
            inputMode="decimal"
            placeholder="2"
            className={cn(
              "border-input bg-background",
              errors.bathrooms && "border-destructive"
            )}
          />
          <FieldError message={errors.bathrooms?.message} />
        </div>

        <div>
          <Label className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
            Square Feet
          </Label>
          <Input
            {...register("sqft", { valueAsNumber: true })}
            type="number"
            inputMode="decimal"
            placeholder="1850"
            className={cn(
              "border-input bg-background",
              errors.sqft && "border-destructive"
            )}
          />
          <FieldError message={errors.sqft?.message} />
        </div>

        <div>
          <Label className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
            Monthly Rent
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              {...register("monthlyRent", { valueAsNumber: true })}
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="2800"
              className={cn(
                "pl-8 border-input bg-background",
                errors.monthlyRent && "border-destructive"
              )}
            />
          </div>
          <FieldError message={errors.monthlyRent?.message} />
        </div>
      </div>
    </div>
  );
}
