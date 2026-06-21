"use client";

/**
 * Address autocomplete that keeps the existing TrueCap <Input> styling and
 * powers a custom dropdown with Google's new Places API (the legacy
 * Autocomplete widget is unavailable to Cloud accounts created after
 * March 1, 2025, and the new PlaceAutocompleteElement web component
 * can't be styled to match the rest of the form).
 *
 * Uses google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions
 * with a session token (cost-efficient: autocomplete sessions are free until
 * the matching fetchFields call resolves the picked place).
 *
 * Falls back to a plain Input when the key is missing or Maps fails to load.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";

type FormattableText = { toString: () => string };
type PlacePrediction = {
  text: FormattableText;
  toPlace: () => Place;
};
type AutocompleteSuggestionResult = {
  placePrediction: PlacePrediction | null;
};
type AddressComponent = {
  types: string[];
  longText?: string;
  shortText?: string;
};
type Place = {
  fetchFields: (opts: { fields: string[]; sessionToken?: SessionToken }) => Promise<unknown>;
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
};

export type SelectedAddress = {
  formattedAddress: string;
  state?: string;   // 2-letter, e.g. "PA"
  county?: string;  // e.g. "Philadelphia"
  zip?: string;     // e.g. "19140"
};
type SessionToken = unknown;
type PlacesLibrary = {
  AutocompleteSuggestion?: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      sessionToken?: SessionToken;
      includedRegionCodes?: string[];
      includedPrimaryTypes?: string[];
    }) => Promise<{ suggestions: AutocompleteSuggestionResult[] }>;
  };
  AutocompleteSessionToken?: new () => SessionToken;
};

declare global {
  interface Window {
    __googleMapsPlacesLoading?: Promise<void>;
    google?: {
      maps?: {
        places?: PlacesLibrary;
      };
    };
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.google?.maps?.places?.AutocompleteSuggestion) return Promise.resolve();
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
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
  /** Extra classes merged onto the <Input> (twMerge wins on conflicts),
   * so callers like the homepage hero can size the field up without
   * forking the component. Optional — the calculator passes nothing and
   * keeps the default form-field sizing. */
  inputClassName?: string;
  /** Fired when the user picks a suggestion. Parsed state/county/zip
   * are best-effort — missing on rare cases where Google doesn't return
   * the corresponding addressComponent. */
  onPlaceSelected?: (place: SelectedAddress) => void;
}

export function AddressAutocomplete({
  form,
  hasError,
  placeholder = "123 Main Street, Austin, TX 78701",
  inputClassName,
  onPlaceSelected,
}: AddressAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sessionTokenRef = useRef<SessionToken | null>(null);
  const debounceRef = useRef<number | null>(null);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [scriptReady, setScriptReady] = useState(false);
  // Search progress signal — drives the "Searching…" indicator. Without
  // it, slow networks or blocked Google Places (ad blockers, restricted
  // regions, API key issues) make the dropdown appear "broken" — the
  // user types but nothing happens. Surfacing the search state makes
  // the silence visible.
  const [isSearching, setIsSearching] = useState(false);

  // react-hook-form binding
  const { ref: rhfRef, onChange: rhfOnChange, ...registerRest } = form.register("address");
  const setInputRef = useCallback(
    (el: HTMLInputElement | null) => {
      inputRef.current = el;
      rhfRef(el);
    },
    [rhfRef]
  );

  // Load Google Maps Places on mount
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled) return;
        if (!window.google?.maps?.places?.AutocompleteSuggestion) {
          console.warn(
            "[AddressAutocomplete] AutocompleteSuggestion not in Places library — enable 'Places API (New)' in Google Cloud Console."
          );
          return;
        }
        setScriptReady(true);
      })
      .catch((err) => {
        console.warn("[AddressAutocomplete] script load failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const ensureSessionToken = (): SessionToken | undefined => {
    const TokenCtor = window.google?.maps?.places?.AutocompleteSessionToken;
    if (!TokenCtor) return undefined;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new TokenCtor();
    }
    return sessionTokenRef.current;
  };

  const fetchPredictions = async (input: string) => {
    if (!scriptReady) return;
    const api = window.google?.maps?.places?.AutocompleteSuggestion;
    if (!api) return;
    setIsSearching(true);
    // Show the "Searching…" hint immediately so the user knows the
    // request is in flight, even before any predictions come back.
    setOpen(true);
    try {
      const { suggestions } = await api.fetchAutocompleteSuggestions({
        input,
        sessionToken: ensureSessionToken(),
        includedRegionCodes: ["us"],
      });
      const preds = suggestions
        .map((s) => s.placePrediction)
        .filter((p): p is PlacePrediction => p !== null)
        .slice(0, 5);
      setPredictions(preds);
      setOpen(preds.length > 0);
      setHighlight(0);
    } catch (err) {
      console.warn("[AddressAutocomplete] fetchAutocompleteSuggestions failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Pass through to react-hook-form
    rhfOnChange(e);

    const value = e.target.value;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    if (!value || value.length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(() => fetchPredictions(value), 220);
  };

  const handleSelect = async (prediction: PlacePrediction) => {
    setOpen(false);
    setPredictions([]);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["formattedAddress", "addressComponents"],
        sessionToken: sessionTokenRef.current ?? undefined,
      });
      sessionTokenRef.current = null; // Reset for next selection cycle

      if (place.formattedAddress) {
        form.setValue("address", place.formattedAddress, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });

        if (onPlaceSelected) {
          // Consumer's handler is typed as `void`-returning but is
          // usually an async function — its returned promise can reject
          // (enrichment failures, Supabase errors, etc.). Coerce to a
          // promise so we can attach a .catch and prevent that from
          // becoming an unhandled rejection in the browser.
          void Promise.resolve(
            onPlaceSelected({
              formattedAddress: place.formattedAddress,
              ...parseComponents(place.addressComponents),
            })
          ).catch((err) => {
            console.warn("[AddressAutocomplete] onPlaceSelected failed:", err);
          });
        }
      }
    } catch (err) {
      console.warn("[AddressAutocomplete] failed to resolve place:", err);
      // Fall back to the prediction text
      const text = prediction.text?.toString();
      if (text) {
        form.setValue("address", text, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
        if (onPlaceSelected) {
          // Same coercion as above — handler may be async even though
          // the prop type doesn't say so.
          void Promise.resolve(onPlaceSelected({ formattedAddress: text })).catch(
            (err2) => {
              console.warn("[AddressAutocomplete] onPlaceSelected (fallback) failed:", err2);
            }
          );
        }
      }
    }
  };

  /** Pick the state/county/zip out of Google's addressComponents array. */
  const parseComponents = (
    components: AddressComponent[] | undefined
  ): { state?: string; county?: string; zip?: string } => {
    if (!components) return {};
    const out: { state?: string; county?: string; zip?: string } = {};
    for (const c of components) {
      if (!c.types) continue;
      if (c.types.includes("administrative_area_level_1")) {
        out.state = c.shortText ?? c.longText;
      } else if (c.types.includes("administrative_area_level_2")) {
        // longText is "Philadelphia County", we want "Philadelphia"
        out.county = (c.longText ?? c.shortText)?.replace(/\s+County$/i, "");
      } else if (c.types.includes("postal_code")) {
        out.zip = c.longText ?? c.shortText;
      }
    }
    return out;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || predictions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % predictions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + predictions.length) % predictions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = predictions[highlight];
      if (picked) handleSelect(picked);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        {...registerRest}
        ref={setInputRef}
        placeholder={placeholder}
        autoComplete="off"
        onChange={handleInputChange}
        onFocus={() => {
          if (predictions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "border-input bg-background",
          hasError && "border-destructive focus-visible:ring-destructive",
          inputClassName
        )}
      />
      {/* In-flight indicator — shows BEFORE predictions land. Without
          this, slow networks or blocked Google Places make the dropdown
          stay closed silently and the user thinks autocomplete is
          broken. Surfacing the "Searching…" line makes the request
          visible. Self-hides as soon as predictions arrive or fail. */}
      {open && isSearching && predictions.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md"
        >
          Searching addresses…
        </div>
      ) : null}
      {open && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <ul role="listbox" aria-label="Address suggestions">
            {predictions.map((p, i) => {
              const text = p.text?.toString() ?? "";
              const isActive = i === highlight;
              return (
                <li
                  key={`${text}-${i}`}
                  role="option"
                  aria-selected={isActive}
                >
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // mousedown fires before input blur — keeps focus and avoids race
                      e.preventDefault();
                    }}
                    onClick={() => handleSelect(p)}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      "block w-full px-3 py-2 text-left text-sm transition-colors",
                      isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                    )}
                  >
                    {text}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
