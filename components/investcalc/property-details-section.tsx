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
          <Label className="text-sm font-medium text-foreground mb-1 block">
            Property Address
          </Label>
          {/* First-run signpost: makes the address the obvious starting
              point and tells new users it auto-fills the deal — the single
              biggest "how do I use this" cue, right at the point of action. */}
          <p className="mb-1.5 text-[11px] leading-snug text-muted-foreground">
            <span className="font-semibold text-foreground">Start here</span> — paste an address and we auto-fill rent, rate, and property tax. Adjust anything after.
          </p>
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
            <Label htmlFor="purchasePrice" className="text-sm font-medium text-foreground mb-1.5 block">
              Purchase Price
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                {...register("purchasePrice", { valueAsNumber: true })}
                id="purchasePrice"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="385000"
                aria-invalid={!!errors.purchasePrice}
                aria-describedby={errors.purchasePrice ? "purchasePrice-error" : undefined}
                className={cn(
                  "pl-8 border-input bg-background",
                  errors.purchasePrice && "border-destructive focus-visible:ring-destructive"
                )}
              />
            </div>
            <FieldError id="purchasePrice-error" message={errors.purchasePrice?.message} />
          </div>

          <div>
            <Label htmlFor="yearBuilt" className="text-sm font-medium text-foreground mb-1.5 block">
              Year Built <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              {...register("yearBuilt", { setValueAs: optionalNumberSetValueAs })}
              id="yearBuilt"
              type="number"
              inputMode="decimal"
              placeholder="2015"
              aria-invalid={!!errors.yearBuilt}
              aria-describedby={errors.yearBuilt ? "yearBuilt-error" : undefined}
              className={cn(
                "border-input bg-background",
                errors.yearBuilt && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Used for reference only. It does not auto-adjust your expenses.
            </p>
            <FieldError id="yearBuilt-error" message={errors.yearBuilt?.message} />
          </div>
        </div>
      </div>
    </div>
  );
}
