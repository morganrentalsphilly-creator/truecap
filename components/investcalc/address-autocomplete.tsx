"use client";

/**
 * Google Places address autocomplete bound to react-hook-form's "address" field.
 *
 * Uses the new `google.maps.places.PlaceAutocompleteElement` web component
 * (the legacy `Autocomplete` class is unavailable to Google Cloud customers
 * who signed up after March 1, 2025).
 *
 * Loads the Maps JS library with `loading=async` and uses `importLibrary`
 * to grab Places. On selection, fetches `formattedAddress` and writes it
 * back into the form via setValue.
 *
 * Falls back to a plain text Input when the API key is missing or the
 * script fails to load — the address field stays fully usable, the user
 * just types the address manually.
 */

import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    __googleMapsPlacesLoading?: Promise<void>;
    google?: {
      maps?: {
        importLibrary?: (name: string) => Promise<unknown>;
        places?: unknown;
      };
    };
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (window.__googleMapsPlacesLoading) return window.__googleMapsPlacesLoading;

  window.__googleMapsPlacesLoading = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("google-maps-places-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Script load error")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-places-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly`;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [autocompleteEl, setAutocompleteEl] = useState<HTMLElement | null>(null);

  // Fallback input <-> react-hook-form binding. When Google's element
  // takes over, react-hook-form is updated imperatively via form.setValue.
  const { ref: rhfRef, ...registerRest } = form.register("address");

  // Step 1 — load Google Maps + create the autocomplete element.
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;

    loadGoogleMapsScript(apiKey)
      .then(async () => {
        if (cancelled) return;
        const importLibrary = window.google?.maps?.importLibrary;
        if (!importLibrary) {
          console.warn("[AddressAutocomplete] importLibrary not available on google.maps");
          return;
        }

        const places = (await importLibrary("places")) as {
          PlaceAutocompleteElement?: new (opts?: Record<string, unknown>) => HTMLElement;
        };
        if (!places.PlaceAutocompleteElement) {
          console.warn("[AddressAutocomplete] PlaceAutocompleteElement not in Places library");
          return;
        }

        const element = new places.PlaceAutocompleteElement({
          // New API uses includedRegionCodes (lowercase ISO 3166-1 alpha-2).
          includedRegionCodes: ["us"],
        });

        // Pre-populate from form's current value if we're editing.
        const currentValue = form.getValues("address");
        if (currentValue && "value" in element) {
          try {
            (element as unknown as { value: string }).value = currentValue;
          } catch {
            // Ignore — some element versions don't expose value as a setter.
          }
        }

        // Make sure the web component spans full width and inherits our look.
        element.style.width = "100%";

        // Selection handler — gmp-select is the v3 event name.
        element.addEventListener("gmp-select", async (event: Event) => {
          // The event has a `placePrediction` property in the new API.
          const ev = event as Event & {
            placePrediction?: { toPlace: () => unknown };
          };
          const prediction = ev.placePrediction;
          if (!prediction) return;
          try {
            const place = prediction.toPlace() as {
              fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
              formattedAddress?: string;
            };
            await place.fetchFields({ fields: ["formattedAddress"] });
            if (place.formattedAddress) {
              form.setValue("address", place.formattedAddress, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            }
          } catch (err) {
            console.warn("[AddressAutocomplete] failed to resolve place:", err);
          }
        });

        if (cancelled) return;
        setAutocompleteEl(element);
      })
      .catch((err) => {
        console.warn("[AddressAutocomplete] script load failed:", err);
      });

    return () => {
      cancelled = true;
    };
    // Only run once on mount; the form prop is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Step 2 — mount the element into our container once both are ready.
  useEffect(() => {
    if (!autocompleteEl || !containerRef.current) return;
    const target = containerRef.current;
    target.appendChild(autocompleteEl);
    return () => {
      try {
        target.removeChild(autocompleteEl);
      } catch {
        /* element may have already been detached */
      }
    };
  }, [autocompleteEl]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full",
        // Style the embedded web component to fit our form look.
        "[&_gmp-place-autocomplete]:block [&_gmp-place-autocomplete]:w-full",
        hasError && "[&_gmp-place-autocomplete]:!border-destructive"
      )}
    >
      {!autocompleteEl && (
        <Input
          {...registerRest}
          ref={rhfRef}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "border-input bg-background",
            hasError && "border-destructive focus-visible:ring-destructive"
          )}
        />
      )}
    </div>
  );
}
