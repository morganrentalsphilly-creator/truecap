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
 *
 * The homepage renders it twice: in the hero, and again as the page's close
 * (DESIGN.md "Homepage structure" 8). `placement` keeps the two apart in
 * analytics and gives each its own element ids. Only the hero carries the
 * sample-deal link, so the page has one link by that name.
 */

import Link from "next/link";
import { track } from "@/lib/analytics/site-events";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, type DefaultValues } from "react-hook-form";
import { Loader2 } from "lucide-react";
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
import {
  extractListingLink,
  SUPPORTED_LISTING_SITES_TEXT,
} from "@/components/investcalc/supported-listing-sites";
import { cn } from "@/lib/utils";

// Neither message ends in a full stop: each is followed on the next line by
// "or try the sample deal", so the pair reads as one sentence. Both name the
// same sites as the analyzer's listing-link help (one list, one module).
export const HERO_EMPTY_HELPER = `Paste an address or a ${SUPPORTED_LISTING_SITES_TEXT} link`;
export const HERO_LISTING_ERROR = `Paste a supported ${SUPPORTED_LISTING_SITES_TEXT} property link`;

/**
 * Carries a listing link rather than a street address. The link may sit
 * anywhere in the text: a phone share sheet pastes "Check out this home"
 * and then the link, and that sentence must not become the address.
 */
export function looksLikeListingLink(value: string): boolean {
  return extractListingLink(value) !== null;
}

/**
 * False until the first hero form on this page load has mounted. Only that
 * first mount is a hydration over server-rendered inputs; a later mount is a
 * client-side navigation, where the document can still hold the page being
 * left, and its field must not be read as this one's.
 */
let firstHydrationDone = false;

/**
 * What a visitor typed into the server-rendered field before React attached.
 *
 * The form is a plain GET until hydration, which on a slow phone takes over a
 * second. react-hook-form writes its default value into the input when it
 * registers it, so a default of "" erased whatever had been typed in that
 * window. Reading the field first makes the typed text the default.
 */
export function readPreHydrationAddress(placement: "hero" | "close"): string {
  if (typeof document === "undefined" || firstHydrationDone) return "";
  const form =
    placement === "hero"
      ? "form[data-hero-address-form]"
      : "form[data-close-address-form]";
  const input = document.querySelector<HTMLInputElement>(
    `${form} input[name="address"]`,
  );
  return typeof input?.value === "string" ? input.value : "";
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

export function HeroAddressForm({
  placement = "hero",
  className,
}: {
  /** "hero": the first screen. "close": the same form at the page's end. */
  placement?: "hero" | "close";
  className?: string;
} = {}) {
  const isHero = placement === "hero";
  const errorId = isHero ? "hero-address-error" : "close-address-error";
  const router = useRouter();
  // Read once, on the first client render, while the server-rendered input
  // still holds whatever was typed before hydration.
  const [preHydrationAddress] = useState(() =>
    readPreHydrationAddress(placement),
  );
  // Throwaway form instance purely to satisfy <AddressAutocomplete>'s
  // react-hook-form API; the value is read on submit.
  const form = useForm<InvestmentFormValues>({
    defaultValues: {
      address: preHydrationAddress,
    } as DefaultValues<InvestmentFormValues>,
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
  useEffect(() => {
    firstHydrationDone = true;
    setReady(true);
  }, []);

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
      const parsed = parseListingUrl(extractListingLink(raw) ?? raw);
      if (!parsed) {
        setAddressError(HERO_LISTING_ERROR);
        form.setFocus("address");
        return;
      }
      setAddressError(null);
      // Privacy: only coarse entry/source signals are captured. The listing
      // URL and parsed address never leave the underwriting handoff.
      if (isHero) {
        trackEvent("hero_address_submit", {
          has_components: Boolean(parsed.state),
          entry_kind: "listing_url",
          listing_source: parsed.source,
        });
      }
      trackEvent("address_submitted", {
        has_components: Boolean(parsed.state),
        entry_kind: "listing_url",
      });
      trackEvent("homepage_primary_cta", {
        source: isHero ? "hero_listing" : "final_listing",
      });
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
    if (isHero) {
      trackEvent("hero_address_submit", {
        has_components: Boolean(sameAsPicked),
        entry_kind: "address",
      });
    }
    trackEvent("address_submitted", {
      has_components: Boolean(sameAsPicked),
      entry_kind: "address",
    });
    trackEvent("homepage_primary_cta", {
      source: isHero ? "hero_address" : "final_address",
    });
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
    <div className={cn("mt-5 w-full max-w-xl sm:mt-7", className)}>
      <form
        {...(isHero ? { "data-hero-address-form": "" } : { "data-close-address-form": "" })}
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
          if (addressStartedRef.current || !isHero) return;
          addressStartedRef.current = true;
          trackEvent("hero_address_started");
        }}
        className="flex flex-col items-stretch gap-2.5 sm:flex-row"
      >
        <div className="min-w-0 flex-1">
          {/* DESIGN.md "Field": white, a 1px Ink 2 border, 4px radius, 48px
              tall, 16px text so iOS does not zoom. */}
          <AddressAutocomplete
            form={form}
            placeholder="Address or listing link"
            ariaLabel="Property address or listing link"
            hasError={Boolean(addressError)}
            errorId={errorId}
            required
            inputClassName="h-12 rounded-md bg-field px-4 text-base md:text-base"
            onPlaceSelected={(place) => {
              // Capture the picked suggestion's parsed components so the
              // analyzer's enrichment (HUD/FRED) has state/county/zip.
              selectedRef.current = place;
              if (addressError) setAddressError(null);
            }}
          />
          {addressError ? (
            <p
              id={errorId}
              role="alert"
              className="mt-2 text-sm font-medium text-destructive-text"
            >
              {addressError}
              <span className="block font-normal text-muted-foreground">
                or{" "}
                <Link href="/analyze?sample=1" prefetch={false} className="tc-link font-medium">
                  try the sample deal
                </Link>
              </span>
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          aria-busy={opening || undefined}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 text-base font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-deep"
        >
          {opening ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {opening ? "Opening the analyzer…" : "Analyze a deal free"}
        </button>
      </form>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {opening ? "Opening the analyzer with your property." : ""}
      </p>

      {/* The one secondary action: a real link, so it works before hydration
          and for crawlers. /analyze?sample=1 runs the sample deal in the
          analyzer (the memo page stays linked from the footer). */}
      {isHero ? (
        <p className="mt-1 text-base">
          <Link
            href="/analyze?sample=1"
            prefetch={false}
            data-hero-sample-link=""
            onClick={() => {
              trackEvent("hero_sample_clicked");
              trackEvent("hero_sample_opened");
              track("sample_viewed", { source: "hero" });
            }}
            className="tc-link inline-flex min-h-11 items-center font-medium"
          >
            See the sample deal
          </Link>
        </p>
      ) : null}
    </div>
  );
}
