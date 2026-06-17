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
          <Label htmlFor="bedrooms" className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
            Bedrooms
          </Label>
          <Input
            {...register("bedrooms", { valueAsNumber: true })}
            id="bedrooms"
            type="number"
            inputMode="numeric"
            placeholder="3"
            aria-invalid={!!errors.bedrooms}
            aria-describedby={errors.bedrooms ? "bedrooms-error" : undefined}
            className={cn(
              "border-input bg-background",
              errors.bedrooms && "border-destructive"
            )}
          />
          <FieldError id="bedrooms-error" message={errors.bedrooms?.message} />
        </div>

        <div>
          <Label htmlFor="bathrooms" className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
            Bathrooms
          </Label>
          <Input
            {...register("bathrooms", { valueAsNumber: true })}
            id="bathrooms"
            type="number"
            inputMode="decimal"
            placeholder="2"
            aria-invalid={!!errors.bathrooms}
            aria-describedby={errors.bathrooms ? "bathrooms-error" : undefined}
            className={cn(
              "border-input bg-background",
              errors.bathrooms && "border-destructive"
            )}
          />
          <FieldError id="bathrooms-error" message={errors.bathrooms?.message} />
        </div>

        <div>
          <Label htmlFor="sqft" className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
            Square Feet
          </Label>
          <Input
            {...register("sqft", { valueAsNumber: true })}
            id="sqft"
            type="number"
            inputMode="numeric"
            placeholder="1850"
            aria-invalid={!!errors.sqft}
            aria-describedby={errors.sqft ? "sqft-error" : undefined}
            className={cn(
              "border-input bg-background",
              errors.sqft && "border-destructive"
            )}
          />
          <FieldError id="sqft-error" message={errors.sqft?.message} />
        </div>

        <div>
          <Label htmlFor="monthlyRent" className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
            Monthly Rent
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              {...register("monthlyRent", { valueAsNumber: true })}
              id="monthlyRent"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="2800"
              aria-invalid={!!errors.monthlyRent}
              aria-describedby={errors.monthlyRent ? "monthlyRent-error" : undefined}
              className={cn(
                "pl-8 border-input bg-background",
                errors.monthlyRent && "border-destructive"
              )}
            />
          </div>
          <FieldError id="monthlyRent-error" message={errors.monthlyRent?.message} />
        </div>
      </div>
    </div>
  );
}
