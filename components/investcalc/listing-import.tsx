"use client";

import { useState, useTransition } from "react";
import { UseFormReturn } from "react-hook-form";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { useToast } from "@/hooks/use-toast";
import { importListingAction, type ImportedListing } from "@/app/actions/import-listing";
import { cn } from "@/lib/utils";

interface ListingImportProps {
  form: UseFormReturn<InvestmentFormValues>;
}

const PLACEHOLDER = "https://www.zillow.com/homedetails/...";

export function ListingImport({ form }: ListingImportProps) {
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const onImport = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await importListingAction(trimmed);
      if (!result.ok) {
        toast({
          title: "Import failed",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      applyToForm(result.data, form);
      toast({
        title: "Listing imported",
        description: summarize(result.data),
      });
      setUrl("");
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onImport();
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">Import from listing</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Paste a Zillow, Redfin, or Realtor.com URL and we'll auto-fill the property details.
        Zillow listings can take 15–25 seconds because of their anti-bot protection.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="url"
          inputMode="url"
          placeholder={PLACEHOLDER}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={pending}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={onImport}
          disabled={!url.trim() || pending}
          className={cn("sm:w-auto w-full")}
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching…
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" /> Import
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function applyToForm(data: ImportedListing, form: UseFormReturn<InvestmentFormValues>) {
  const setOpts = { shouldDirty: true, shouldTouch: true };

  if (data.address) form.setValue("address", data.address, setOpts);
  if (data.purchasePrice !== undefined) {
    form.setValue("purchasePrice", data.purchasePrice, setOpts);
  }

  // Unit-level fields land in units[0] (single family / first unit of multi).
  const currentUnits = form.getValues("units") ?? [];
  const first = currentUnits[0] ?? {};
  const nextFirst = {
    ...first,
    bedrooms: data.bedrooms ?? first.bedrooms,
    bathrooms: data.bathrooms ?? first.bathrooms,
    sqft: data.sqft ?? first.sqft,
    monthlyRent: data.monthlyRent ?? first.monthlyRent,
  };
  form.setValue("units", [nextFirst, ...currentUnits.slice(1)], setOpts);
}

function summarize(data: ImportedListing): string {
  const parts: string[] = [];
  if (data.purchasePrice) parts.push(`$${data.purchasePrice.toLocaleString()}`);
  if (data.bedrooms) parts.push(`${data.bedrooms} bd`);
  if (data.bathrooms) parts.push(`${data.bathrooms} ba`);
  if (data.sqft) parts.push(`${data.sqft.toLocaleString()} sqft`);
  if (parts.length === 0) return `Pulled details from ${data.source}.`;
  return `${parts.join(" · ")} from ${data.source}.`;
}
