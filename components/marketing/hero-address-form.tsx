"use client";

/**
 * Hero address capture — the homepage's ONE primary action.
 *
 * The analyzer no longer lives on the homepage (it is at /analyze, so the
 * marketing page ships no calculator JS). This form captures an address OR a
 * listing link in a single field and hands off to /analyze:
 *
 *   - With JS: stash the handoff in sessionStorage (lib/hero-handoff.ts —
 *     the analyzer drains it on mount, exactly as it did for a same-page
 *     refresh) and navigate to /analyze. The address never enters the URL.
 *   - Without JS / before hydration: the form is a plain GET to /analyze,
 *     so Enter or a tap submits `?address=…` and the analyzer prefills it.
 *
 * The submit button is NEVER disabled. An empty submit focuses the field,
 * shows an inline helper, and reveals the sample-deal path instead.
 */

import Link from "next/link";
import { track } from "@/lib/analytics/site-events";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, type DefaultValues } from "react-hook-form";
import { ArrowRight, Calculator, Loader2 } from "lucide-react";
import {
  AddressAutocomplete,
  type SelectedAddress,
} from "@/components/investcalc/address-autocomplete";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  dispatchHeroAnalyzeWithFallback,
  HERO_ANALYZE_EVENT,
  type HeroAnalyzeDetail,
} from "@/lib/hero-handoff";
import { trackEvent } from "@/lib/analytics";
import { parseListingUrl } from "@/lib/listing-url";

export const HERO_EMPTY_HELPER = "Paste an address or a Zillow/Redfin link";
export const HERO_LISTING_ERROR =
  "Paste a supported Zillow, Redfin, Realtor.com, Homes.com, or Trulia property link.";

/** Looks like a listing URL rather than a street address. */
export function looksLikeListingLink(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return (
    /^https?:\/\//i.test(v) ||
    /^(www\.)?(zillow|redfin|realtor|homes|trulia)\.com\b/i.test(v)
  );
}

function dispatchHeroAnalyze(detail: HeroAnalyzeDetail) {
  if (typeof window === "undefined") return;
  dispatchHeroAnalyzeWithFallback(detail, {
    storage: window.sessionStorage,
    dispatch: (payload) => {
      window.dispatchEvent(
        new CustomEvent<HeroAnalyzeDetail>(HERO_ANALYZE_EVENT, {
          detail: payload,
        }),
      );
    },
    schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
  });
}

function newToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function HeroAddressForm() {
  const router = useRouter();
  // Throwaway form instance purely to satisfy <AddressAutocomplete>'s
  // react-hook-form API; the value is read on submit.
  const form = useForm<InvestmentFormValues>({
    defaultValues: { address: "" } as DefaultValues<InvestmentFormValues>,
  });
  // Last suggestion the user actually picked (carries state/county/zip).
  const selectedRef = useRef<SelectedAddress | null>(null);
  const addressStartedRef = useRef(false);
  const [opening, setOpening] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  // Hydration marker ONLY (never gates the button): before this flips, the
  // form is a plain GET to /analyze; after it, submit is handled in JS.
  // Tests wait on it so they exercise the intended path deterministically.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const openAnalyzer = () => {
    setOpening(true);
    router.push("/analyze");
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (opening) return;

    const raw = (form.getValues("address") ?? "").trim();
    if (!raw) {
      setAddressError(HERO_EMPTY_HELPER);
      form.setFocus("address");
      return;
    }

    if (looksLikeListingLink(raw)) {
      const parsed = parseListingUrl(raw);
      if (!parsed) {
        setAddressError(HERO_LISTING_ERROR);
        form.setFocus("address");
        return;
      }
      setAddressError(null);
      // Privacy: only coarse entry/source signals are captured. The listing
      // URL and parsed address never leave the underwriting handoff.
      trackEvent("hero_address_submit", {
        has_components: Boolean(parsed.state),
        entry_kind: "listing_url",
        listing_source: parsed.source,
      });
      trackEvent("address_submitted", {
        has_components: Boolean(parsed.state),
        entry_kind: "listing_url",
      });
      trackEvent("homepage_primary_cta", { source: "hero_listing" });
      dispatchHeroAnalyze({
        token: `listing:${newToken()}`,
        address: parsed.address,
        state: parsed.state,
        zip: parsed.zip,
      });
      openAnalyzer();
      return;
    }

    setAddressError(null);
    const picked = selectedRef.current;
    const sameAsPicked = picked && picked.formattedAddress.trim() === raw;
    // Funnel: top of the hero-start path. No address string sent (PII).
    trackEvent("hero_address_submit", {
      has_components: Boolean(sameAsPicked),
      entry_kind: "address",
    });
    trackEvent("address_submitted", {
      has_components: Boolean(sameAsPicked),
      entry_kind: "address",
    });
    trackEvent("homepage_primary_cta", { source: "hero_address" });
    dispatchHeroAnalyze({
      token: newToken(),
      address: raw,
      state: sameAsPicked ? picked.state : undefined,
      county: sameAsPicked ? picked.county : undefined,
      zip: sameAsPicked ? picked.zip : undefined,
    });
    openAnalyzer();
  };

  return (
    <div className="mt-6 w-full max-w-xl sm:mt-7">
      <form
        data-hero-address-form=""
        data-hero-form-ready={ready ? "true" : "false"}
        action="/analyze"
        method="get"
        noValidate
        onSubmit={handleAnalyze}
        onChangeCapture={(event) => {
          if (!(event.target instanceof HTMLInputElement)) return;
          if (event.target.name === "address" && addressError) {
            setAddressError(null);
          }
        }}
        onFocusCapture={() => {
          if (addressStartedRef.current) return;
          addressStartedRef.current = true;
          trackEvent("hero_address_started");
        }}
        className="flex flex-col items-stretch gap-2.5 sm:flex-row"
      >
        <div className="min-w-0 flex-1">
          <AddressAutocomplete
            form={form}
            placeholder="Address or listing link"
            ariaLabel="Property address or listing link"
            hasError={Boolean(addressError)}
            errorId="hero-address-error"
            required
            inputClassName="h-12 rounded-xl px-4 text-base shadow-sm sm:h-14"
            onPlaceSelected={(place) => {
              // Capture the picked suggestion's parsed components so the
              // analyzer's enrichment (HUD/FRED) has state/county/zip.
              selectedRef.current = place;
              if (addressError) setAddressError(null);
            }}
          />
          {addressError ? (
            <p
              id="hero-address-error"
              role="alert"
              className="mt-2 text-sm font-medium text-destructive"
            >
              {addressError}
              <span className="block font-normal text-muted-foreground">
                or{" "}
                <Link
                  href="/analyze?sample=1"
                  prefetch={false}
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  try the sample deal →
                </Link>
              </span>
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          aria-busy={opening || undefined}
          className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] sm:h-14"
        >
          {opening ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Calculator className="size-4" aria-hidden="true" />
          )}
          {opening ? "Opening the analyzer…" : "Analyze a deal free"}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {opening ? "Opening the analyzer with your property." : ""}
      </p>

      {/* The one secondary action: a real link, so it works before hydration
          and for crawlers. /analyze?sample=1 runs the sample deal in the
          analyzer (the memo page stays linked from the footer). */}
      <p className="mt-2.5 text-sm">
        <Link
          href="/analyze?sample=1"
          prefetch={false}
          data-hero-sample-link=""
          onClick={() => {
            trackEvent("hero_sample_clicked");
            trackEvent("hero_sample_opened");
            track("sample_viewed", { source: "hero" });
          }}
          className="inline-flex min-h-11 items-center font-semibold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          See the sample deal →
        </Link>
      </p>
    </div>
  );
}
