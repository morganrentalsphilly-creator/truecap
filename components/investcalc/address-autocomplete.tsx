"use client";

/**
 * Google Places address autocomplete bound to react-hook-form's "address" field.
 *
 * Loads the Google Maps JS Places library lazily on first mount, attaches an
 * Autocomplete instance to the input, and writes the selected place's
 * formatted_address back into the form via setValue.
 *
 * Falls back to a plain text input when the API key is missing or the script
 * fails to load — the field stays fully usable, the user just types manually.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";

// Augment window with a loading promise so we don't load the script twice.
declare global {
  interface Window {
    __googleMapsPlacesLoading?: Promise<void>;
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: Record<string, unknown>
          ) => GoogleAutocomplete;
        };
      };
    };
  }
}

interface GoogleAutocomplete {
  addListener: (event: string, cb: () => void) => { remove: () => void };
  getPlace: () => { formatted_address?: string };
}

function loadGoogleMapsPlaces(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__googleMapsPlacesLoading) return window.__googleMapsPlacesLoading;

  window.__googleMapsPlacesLoading = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("google-maps-places-script") as HTMLScriptElement | null;
    if (existing) {
      // Wait for it to load
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Script load error")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-places-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });

  return window.__googleMapsPlacesLoading;
}

interface AddressAutocompleteProps {
  form: UseFormReturn<InvestmentFormValues>;
  hasError?: boolean;
  placeholder?: string;
}

export function AddressAutocomplete({
  form,
  hasError,
  placeholder = "123 Main Street, Austin, TX 78701",
}: AddressAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<GoogleAutocomplete | null>(null);
  const [_isReady, setIsReady] = useState(false);

  // react-hook-form's register returns its own ref callback; we merge it with
  // our inputRef so both the form library and the Google widget see the same
  // DOM node.
  const { ref: rhfRef, ...registerRest } = form.register("address");

  const setInputRef = useCallback(
    (el: HTMLInputElement | null) => {
      inputRef.current = el;
      rhfRef(el);
    },
    [rhfRef]
  );

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;
    let cancelled = false;
    let listener: { remove: () => void } | null = null;

    loadGoogleMapsPlaces(apiKey)
      .then(() => {
        if (cancelled || !inputRef.current) return;
        const places = window.google?.maps?.places;
        if (!places) return;

        const ac = new places.Autocomplete(inputRef.current, {
          types: ["address"],
          componentRestrictions: { country: "us" },
          fields: ["formatted_address"],
        });
        autocompleteRef.current = ac;

        listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (place?.formatted_address) {
            form.setValue("address", place.formatted_address, {
              shouldDirty: true,
              shouldTouch: true,
            });
          }
        });

        setIsReady(true);
      })
      .catch(() => {
        // Silent fallback — input still works as a plain text field
      });

    return () => {
      cancelled = true;
      listener?.remove();
      autocompleteRef.current = null;
      // Google injects a .pac-container div in <body> for the dropdown.
      // Leaving them around isn't harmful, but clean up to avoid stragglers.
      document.querySelectorAll(".pac-container").forEach((el) => {
        if (!document.body.contains(el)) return;
        // Only remove if our input is being unmounted — safe because we ran cancel
        el.remove();
      });
    };
  }, [apiKey, form]);

  return (
    <Input
      {...registerRest}
      ref={setInputRef}
      placeholder={placeholder}
      autoComplete="off"
      className={cn(
        "border-input bg-background",
        hasError && "border-destructive focus-visible:ring-destructive"
      )}
    />
  );
}
