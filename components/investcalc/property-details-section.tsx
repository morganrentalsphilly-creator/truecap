"use client";

import { UseFormReturn } from "react-hook-form";
import { Home, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";
import { FieldError, optionalNumberSetValueAs } from "@/components/investcalc/form-field-helpers";
import { AddressAutocomplete, type SelectedAddress } from "@/components/investcalc/address-autocomplete";

interface PropertyDetailsSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
  onAddressSelected?: (place: SelectedAddress) => void;
}

export function PropertyDetailsSection({ form, onAddressSelected }: PropertyDetailsSectionProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Home className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">Property Details</span>
      </div>

      <div className="space-y-4">
        {/* Address — Google Places autocomplete attached when key is set */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-1.5 block">
            Property Address
          </Label>
          <AddressAutocomplete
            form={form}
            hasError={!!errors.address}
            onPlaceSelected={onAddressSelected}
          />
          <FieldError message={errors.address?.message} />
        </div>

        {/* Purchase Price + Year Built */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-foreground mb-1.5 block">
              Purchase Price
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                {...register("purchasePrice", { valueAsNumber: true })}
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="385000"
                className={cn(
                  "pl-8 border-input bg-background",
                  errors.purchasePrice && "border-destructive focus-visible:ring-destructive"
                )}
              />
            </div>
            <FieldError message={errors.purchasePrice?.message} />
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground mb-1.5 block">
              Year Built <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              {...register("yearBuilt", { setValueAs: optionalNumberSetValueAs })}
              type="number"
              inputMode="decimal"
              placeholder="2015"
              className={cn(
                "border-input bg-background",
                errors.yearBuilt && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Used for reference only. It does not auto-adjust your expenses.
            </p>
            <FieldError message={errors.yearBuilt?.message} />
          </div>
        </div>
      </div>
    </div>
  );
}
