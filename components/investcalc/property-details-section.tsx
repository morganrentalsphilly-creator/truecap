"use client";

import type { ReactNode } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { Home, DollarSign, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";
import { FieldError, optionalNumberSetValueAs } from "@/components/investcalc/form-field-helpers";
import { AddressAutocomplete, type SelectedAddress } from "@/components/investcalc/address-autocomplete";
import { CurrencyInput } from "@/components/ui/currency-input";

interface PropertyDetailsSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
  onAddressSelected?: (place: SelectedAddress) => void;
  /** Pull beds/baths/sqft/price/rent from RentCast for the typed address. */
  onAutofillFromAddress?: () => void;
  isAutofilling?: boolean;
  /** Guest-visible disclosure: the lookup requires a free account. */
  autofillRequiresAccount?: boolean;
  /** Show the autofill button (signed-in + provider configured). */
  showAutofill?: boolean;
  /** Show the (optional) Year Built field. Hidden in strategy-focus mode. */
  showYearBuilt?: boolean;
  /** Override the "Purchase Price" label (e.g. "Asking price" for wholesale). */
  priceLabel?: string;
  /**
   * ADDITIVE chrome variant (calculator redesign Phase 4, hero unification):
   * "bare" drops this section's own card wrapper + "Property Details" header
   * so the fields compose inside the hero's single bordered card, renders
   * the question-language group headers ("Where's the deal?" / "What does it
   * cost?"), and omits the old 2-line "Fastest start" signpost (the hero's
   * one-line signpost replaces it). Default ("card") keeps today's
   * standalone chrome byte-identical for any other mount.
   */
  chrome?: "card" | "bare";
  /** Hero-only: the inline listing-link toggle rendered inside the address
   *  group (a text toggle under the address input; the open URL row renders
   *  in the address input's place — see hideAddressInput). */
  listingLinkSlot?: ReactNode;
  /** Hero-only: CSS-hide the address input + Autofill button while the
   *  listing-URL row is open. The block stays MOUNTED, so the RHF "address"
   *  registration and enrichment setValue writes are untouched. */
  hideAddressInput?: boolean;
  /** Hero-only (Choose-TrueCap Phase C, finding 6): the quiet empty-state
   *  "See a sample deal" line rendered directly under the address group.
   *  The caller owns visibility (pristine form only) and the click handler
   *  (the existing sample flow, unchanged). Default undefined — any
   *  card-chrome mount stays byte-identical. */
  sampleSlot?: ReactNode;
}

export function PropertyDetailsSection({
  form,
  onAddressSelected,
  onAutofillFromAddress,
  isAutofilling,
  autofillRequiresAccount = false,
  showAutofill,
  showYearBuilt = true,
  priceLabel,
  chrome = "card",
  listingLinkSlot,
  hideAddressInput,
  sampleSlot,
}: PropertyDetailsSectionProps) {
  const {
    formState: { errors },
  } = form;
  const bare = chrome === "bare";

  /* Address - Google Places autocomplete attached when key is set */
  const addressBlock = (
    <div className={hideAddressInput ? "hidden" : undefined}>
      <Label htmlFor="address" className="text-sm font-medium text-foreground mb-1 block">
        Property Address
      </Label>
      {/* First-run signpost (card chrome only — on the analyzer the page
          heading carries the one-line "Type an address — we fill your assumptions."
          signpost instead).
          Frames the address as the fast path (it auto-fills the deal)
          WITHOUT implying it's the only way in — price + rent alone already
          form a live verdict below. Copy is honest about area rent (HUD
          covers most, not all addresses — rent-2) so an unmatched address
          never reads as a broken promise. */}
      {!bare ? (
        <p className="mb-1.5 text-[11px] leading-snug text-muted-foreground">
          <span className="font-semibold text-foreground">Fastest start</span>
          {" - type an address and we auto-fill rates, taxes & (where public data covers it) area rent. Or just enter price & rent to see a provisional screening result. Everything stays editable."}
        </p>
      ) : null}
      <AddressAutocomplete
        form={form}
        hasError={!!errors.address}
        inputId="address"
        errorId="address-error"
        required
        onPlaceSelected={onAddressSelected}
      />
      <FieldError id="address-error" message={errors.address?.message} />
      {showAutofill && onAutofillFromAddress ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 min-h-11 gap-1.5"
          onClick={onAutofillFromAddress}
          disabled={isAutofilling}
        >
          {isAutofilling ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {isAutofilling
            ? "Pulling property data…"
            : autofillRequiresAccount
              ? "Create a free account to autofill"
              : "Autofill from address"}
        </Button>
      ) : null}
    </div>
  );

  /* Purchase Price + Year Built (Year Built hidden in strategy-focus
     mode and in the hero, where it lives in the "Property extras" panel
     instead). Single column below sm: at 375px the 2-col split squeezed
     the marquee Price input to ~140px next to an optional field. */
  const priceGrid = (
    <div className={cn("grid gap-4", showYearBuilt ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
      <div>
        {bare ? (
          <p className="mb-2 text-sm font-semibold text-foreground">What does it cost?</p>
        ) : null}
        <Label htmlFor="purchasePrice" className="text-sm font-medium text-foreground mb-1.5 block">
          {priceLabel ?? "Purchase Price"}
        </Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Controller
            control={form.control}
            name="purchasePrice"
            render={({ field }) => (
              <CurrencyInput
                ref={field.ref}
                name={field.name}
                value={field.value}
                onBlur={field.onBlur}
                onValueChange={field.onChange}
                id="purchasePrice"
                min={10_000}
                max={100_000_000}
                step={100}
                placeholder="385,000"
                aria-required="true"
                aria-invalid={!!errors.purchasePrice}
                aria-describedby={errors.purchasePrice ? "purchasePrice-error" : undefined}
                className={cn(
                  "min-h-11 border-input bg-background pl-8",
                  errors.purchasePrice && "border-destructive focus-visible:ring-destructive"
                )}
              />
            )}
          />
        </div>
        <FieldError id="purchasePrice-error" message={errors.purchasePrice?.message} />
      </div>

      {showYearBuilt ? <YearBuiltField form={form} /> : null}
    </div>
  );

  if (bare) {
    return (
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Where&apos;s the deal?</p>
          {addressBlock}
          {listingLinkSlot}
          {sampleSlot}
        </div>
        {priceGrid}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Home className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">Property Details</span>
      </div>

      <div className="space-y-4">
        {addressBlock}
        {priceGrid}
      </div>
    </div>
  );
}

/**
 * The optional Year Built block — EXTRACTED unchanged from the section body
 * (Phase 4) so the hero mount can flip it off (showYearBuilt={false}) while
 * the SAME block moves into the "Property extras" region of the advanced
 * block (#step-extras for single-family, the property panel for MF /
 * house-hack) — moved, not duplicated: exactly one instance renders per
 * property type. PropertyDetailsSection still renders it when showYearBuilt
 * is on (the default), so any card-chrome mount stays byte-identical.
 */
export function YearBuiltField({ form }: { form: UseFormReturn<InvestmentFormValues> }) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div>
      <Label htmlFor="yearBuilt" className="text-sm font-medium text-foreground mb-1.5 block">
        Year Built <span className="text-xs text-muted-foreground">(Optional)</span>
      </Label>
      <Input
        {...register("yearBuilt", { setValueAs: optionalNumberSetValueAs })}
        id="yearBuilt"
        type="number"
        inputMode="decimal"
        min={1800}
        max={new Date().getFullYear() + 5}
        step={1}
        placeholder="2015"
        aria-invalid={!!errors.yearBuilt}
        aria-describedby={errors.yearBuilt ? "yearBuilt-error" : undefined}
        className={cn(
          "min-h-11 border-input bg-background",
          errors.yearBuilt && "border-destructive focus-visible:ring-destructive"
        )}
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Used in the Screening Index age-risk check. If left blank, a conservative uncertainty
        modifier applies. It does not auto-adjust your expense assumptions.
      </p>
      <FieldError id="yearBuilt-error" message={errors.yearBuilt?.message} />
    </div>
  );
}
