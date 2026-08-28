"use client";

/**
 * Hero address input — the homepage's primary action, lifted ABOVE the
 * fold so cold visitors can start the core flow ("type an address") the
 * instant they land, instead of scrolling past How-It-Works + social
 * proof to reach the calculator. This is the #1 conversion lever: the
 * product promise is speed, so the first action can't be a scroll.
 *
 * It deliberately reuses the SAME <AddressAutocomplete> the calculator
 * uses, so the Google Places script (already loaded on this page by the
 * calculator below) is shared — no extra script cost — and a selection
 * here carries the parsed state/county/zip needed for HUD/FRED/state
 * auto-fill.
 *
 * Handshake: the hero and calculator live on the SAME page, so a plain
 * sessionStorage-on-mount handoff would miss a click that happens after
 * the calculator already mounted. Instead we dispatch a window
 * CustomEvent ("truecap:hero-analyze") that the calculator listens for
 * live, and ALSO stash the payload in sessionStorage as a race/refresh
 * fallback. The calculator dedupes on the payload token so it never
 * double-handles. This component owns ZERO analysis logic — it only
 * captures the address and tells the calculator to take over.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm, type DefaultValues } from "react-hook-form";
import {
  ArrowRight,
  Calculator,
  Link2,
  Loader2,
  MapPin,
} from "lucide-react";
import {
  AddressAutocomplete,
  type SelectedAddress,
} from "@/components/investcalc/address-autocomplete";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  dispatchHeroAnalyzeWithFallback,
  HERO_ANALYZE_EVENT,
  HERO_ANALYZE_STATUS_EVENT,
  type HeroAnalyzeDetail,
  type HeroAnalyzeStatusDetail,
} from "@/lib/hero-handoff";
import { trackEvent } from "@/lib/analytics";
import { parseListingUrl } from "@/lib/listing-url";
import { scrollBehavior } from "@/lib/utils";

function scrollToCalculator() {
  if (typeof window === "undefined") return;
  const el = document.getElementById("main");
  if (!el) return;
  // Document-absolute position, NOT el.offsetTop: offsetTop is measured
  // from the nearest positioned ancestor (#main has one — the homepage's
  // relative overflow-clip wrapper), so it's only correct while that
  // ancestor happens to sit at the document top. getBoundingClientRect +
  // scrollY is correct regardless of what layout wraps #main next.
  const top = el.getBoundingClientRect().top + window.scrollY - 64;
  window.scrollTo({ top, behavior: scrollBehavior() });
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
  // Throwaway form instance purely to satisfy <AddressAutocomplete>'s
  // react-hook-form API. We never submit it — we read the address value
  // and the last selection's components on click.
  const form = useForm<InvestmentFormValues>({
    defaultValues: { address: "" } as DefaultValues<InvestmentFormValues>,
  });
  // Last suggestion the user actually picked (carries state/county/zip).
  const selectedRef = useRef<SelectedAddress | null>(null);
  const addressStartedRef = useRef(false);
  const activeHandoffTokenRef = useRef<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [handoffStatus, setHandoffStatus] = useState<
    "sending" | HeroAnalyzeStatusDetail["status"] | null
  >(null);
  const [hydrated, setHydrated] = useState(false);
  const [entryMode, setEntryMode] = useState<"address" | "listing">("address");
  const [listingUrl, setListingUrl] = useState("");
  const [listingError, setListingError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const listingInputRef = useRef<HTMLInputElement | null>(null);

  // A native button can be clicked before this client boundary hydrates on a
  // slow device, but no React handler exists yet. Keep action buttons disabled
  // for that brief window so an early tap is never silently lost.
  useEffect(() => setHydrated(true), []);

  // The calculator acknowledges the actual async handoff. This keeps the CTA
  // tied to real work instead of a cosmetic timer that could stop while the
  // lookup was still running (or spin after the calculator was already ready).
  useEffect(() => {
    const onStatus = (event: Event) => {
      const detail = (event as CustomEvent<HeroAnalyzeStatusDetail>).detail;
      if (!detail || detail.token !== activeHandoffTokenRef.current) return;
      setHandoffStatus(detail.status);
      setSubmitting(detail.status === "received");
    };
    window.addEventListener(
      HERO_ANALYZE_STATUS_EVENT,
      onStatus as EventListener,
    );
    return () =>
      window.removeEventListener(
        HERO_ANALYZE_STATUS_EVENT,
        onStatus as EventListener,
      );
  }, []);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();

    if (handoffStatus === "needs-input" || handoffStatus === "ready") {
      scrollToCalculator();
      return;
    }

    if (entryMode === "listing") {
      const parsed = parseListingUrl(listingUrl);
      if (!parsed) {
        setListingError(
          "Paste a supported Zillow, Redfin, Realtor.com, Homes.com, or Trulia property link.",
        );
        listingInputRef.current?.focus();
        return;
      }

      setListingError(null);
      setSubmitting(true);
      setHandoffStatus("sending");
      const token = `listing:${newToken()}`;
      activeHandoffTokenRef.current = token;
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
        token,
        address: parsed.address,
        state: parsed.state,
        zip: parsed.zip,
      });
      scrollToCalculator();
      return;
    }

    const address = (form.getValues("address") ?? "").trim();
    if (!address) {
      setAddressError("Enter a property address to analyze this deal.");
      form.setFocus("address");
      return;
    }
    setAddressError(null);
    setSubmitting(true);
    setHandoffStatus("sending");
    const picked = selectedRef.current;
    const sameAsPicked = picked && picked.formattedAddress.trim() === address;
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
    const token = newToken();
    activeHandoffTokenRef.current = token;
    dispatchHeroAnalyze({
      token,
      address,
      state: sameAsPicked ? picked.state : undefined,
      county: sameAsPicked ? picked.county : undefined,
      zip: sameAsPicked ? picked.zip : undefined,
    });
    scrollToCalculator();
  };

  return (
    <div className="mt-7 w-full max-w-xl">
      <div
        className="mb-2.5 inline-flex rounded-xl border border-border bg-muted/60 p-1"
        role="group"
        aria-label="Property entry method"
      >
        <button
          type="button"
          aria-pressed={entryMode === "address"}
          onClick={() => {
            setEntryMode("address");
            setListingError(null);
            setAddressError(null);
            setSubmitting(false);
            setHandoffStatus(null);
            activeHandoffTokenRef.current = null;
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
        >
          <MapPin className="size-4" aria-hidden="true" />
          Street address
        </button>
        <button
          type="button"
          aria-pressed={entryMode === "listing"}
          onClick={() => {
            setEntryMode("listing");
            setAddressError(null);
            selectedRef.current = null;
            setSubmitting(false);
            setHandoffStatus(null);
            activeHandoffTokenRef.current = null;
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
        >
          <Link2 className="size-4" aria-hidden="true" />
          Listing link
        </button>
      </div>
      <form
        data-hero-address-form=""
        noValidate
        onSubmit={handleAnalyze}
        onChangeCapture={(event) => {
          if (!(event.target instanceof HTMLInputElement)) return;
          const target = event.target;
          if (entryMode === "address" && target.name === "address" && addressError) {
            setAddressError(null);
          }
          if (
            entryMode !== "address" ||
            target.name !== "address" ||
            !handoffStatus
          ) {
            return;
          }
          activeHandoffTokenRef.current = null;
          setSubmitting(false);
          setHandoffStatus(null);
        }}
        onFocusCapture={() => {
          if (addressStartedRef.current) return;
          addressStartedRef.current = true;
          trackEvent("hero_address_started");
        }}
        className="flex flex-col items-stretch gap-2.5 sm:flex-row"
      >
        <div className="min-w-0 flex-1">
          {entryMode === "address" ? (
            <>
              <AddressAutocomplete
                form={form}
                placeholder="Enter a property address"
                ariaLabel="Property address"
                hasError={Boolean(addressError)}
                errorId="hero-address-error"
                required
                inputClassName="h-12 rounded-xl px-4 text-base shadow-sm sm:h-14"
                onPlaceSelected={(place) => {
                  // Capture the picked suggestion's parsed components so
                  // "Analyze free" can hand them to the calculator for the
                  // same HUD/FRED/state auto-fill an in-form selection gets.
                  selectedRef.current = place;
                  setAddressError(null);
                  activeHandoffTokenRef.current = null;
                  setSubmitting(false);
                  setHandoffStatus(null);
                }}
              />
              {addressError ? (
                <p
                  id="hero-address-error"
                  role="alert"
                  className="mt-1.5 px-1 text-xs font-medium text-destructive"
                >
                  {addressError}
                </p>
              ) : null}
            </>
          ) : (
            <div>
              <label htmlFor="hero-listing-url" className="sr-only">
                Property listing link
              </label>
              <input
                id="hero-listing-url"
                ref={listingInputRef}
                name="listingUrl"
                type="url"
                inputMode="url"
                autoComplete="url"
                value={listingUrl}
                onChange={(event) => {
                  setListingUrl(event.target.value);
                  if (listingError) setListingError(null);
                  if (handoffStatus) {
                    activeHandoffTokenRef.current = null;
                    setSubmitting(false);
                    setHandoffStatus(null);
                  }
                }}
                placeholder="Paste a Zillow, Redfin, or Realtor.com link"
                aria-invalid={Boolean(listingError)}
                aria-required="true"
                aria-describedby={
                  listingError
                    ? "hero-listing-url-error"
                    : "hero-listing-url-help"
                }
                className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:h-14"
              />
              <p
                id={
                  listingError
                    ? "hero-listing-url-error"
                    : "hero-listing-url-help"
                }
                role={listingError ? "alert" : undefined}
                className={`mt-1.5 px-1 text-xs ${
                  listingError
                    ? "font-medium text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {listingError ??
                  "We extract the address from the link. You’ll confirm the asking price and rent below; signed-in lookup may find additional property facts."}
              </p>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={submitting || !hydrated}
          aria-busy={submitting || undefined}
          className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-70 sm:h-14"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Calculator className="size-4" aria-hidden="true" />
          )}
          {handoffStatus === "sending"
            ? entryMode === "listing"
              ? "Extracting address…"
              : "Sending address…"
            : handoffStatus === "received"
              ? "Looking up starting assumptions…"
              : handoffStatus === "needs-input"
                ? "Continue in calculator"
                : handoffStatus === "ready"
                  ? "Ready below"
                  : handoffStatus === "cancelled"
                    ? "Use this address instead"
                    : entryMode === "listing"
                      ? "Analyze listing free"
                      : "Analyze a deal free"}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {handoffStatus === "sending"
          ? entryMode === "listing"
            ? "Extracting the listing address."
            : "Sending the address to the calculator."
          : handoffStatus === "received"
            ? "Address received. Looking up available starting assumptions."
            : handoffStatus === "needs-input"
              ? "Address added. Continue in the calculator with the missing deal inputs."
              : handoffStatus === "ready"
                ? "The calculator is ready below."
                : handoffStatus === "cancelled"
                  ? "The previous property was kept. Submit again to replace it."
                  : ""}
      </p>

      <Link
        href="/sample-decision-memo"
        className="mt-2 inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        View a sample decision →
      </Link>
    </div>
  );
}
