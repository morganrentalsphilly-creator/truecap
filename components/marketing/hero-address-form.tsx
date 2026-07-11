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

import { useRef, useState } from "react";
import Link from "next/link";
import { useForm, type DefaultValues } from "react-hook-form";
import { ArrowRight, Calculator, Sparkles } from "lucide-react";
import { AddressAutocomplete, type SelectedAddress } from "@/components/investcalc/address-autocomplete";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  HERO_ANALYZE_EVENT,
  HERO_ANALYZE_STORAGE_KEY,
  type HeroAnalyzeDetail,
} from "@/lib/hero-handoff";
import { trackEvent } from "@/lib/analytics";

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
  window.scrollTo({ top, behavior: "smooth" });
}

function dispatchHeroAnalyze(detail: HeroAnalyzeDetail) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HERO_ANALYZE_STORAGE_KEY, JSON.stringify(detail));
  } catch {
    /* private mode / quota — the live event below still delivers it */
  }
  window.dispatchEvent(new CustomEvent<HeroAnalyzeDetail>(HERO_ANALYZE_EVENT, { detail }));
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
  const [submitting, setSubmitting] = useState(false);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const address = (form.getValues("address") ?? "").trim();
    if (!address) {
      // Nothing typed — send them to the full calculator to start there.
      form.setFocus("address");
      scrollToCalculator();
      return;
    }
    setSubmitting(true);
    const picked = selectedRef.current;
    const sameAsPicked = picked && picked.formattedAddress.trim() === address;
    // Funnel: top of the hero-start path. No address string sent (PII).
    trackEvent("hero_address_submit", { has_components: Boolean(sameAsPicked) });
    dispatchHeroAnalyze({
      token: newToken(),
      address,
      state: sameAsPicked ? picked.state : undefined,
      county: sameAsPicked ? picked.county : undefined,
      zip: sameAsPicked ? picked.zip : undefined,
    });
    scrollToCalculator();
    // The calculator takes over from here; drop the spinner shortly so the
    // button doesn't look stuck if the user scrolls back up.
    window.setTimeout(() => setSubmitting(false), 1200);
  };

  const handleTrySample = () => {
    trackEvent("hero_sample_clicked");
    dispatchHeroAnalyze({ token: newToken(), address: "", sample: true });
    scrollToCalculator();
  };

  return (
    <div className="mt-7 w-full max-w-xl">
      <form
        onSubmit={handleAnalyze}
        className="flex flex-col items-stretch gap-2.5 sm:flex-row"
      >
        <div className="min-w-0 flex-1">
          <AddressAutocomplete
            form={form}
            placeholder="Enter a property address"
            inputClassName="h-12 rounded-xl px-4 text-base shadow-sm sm:h-14"
            onPlaceSelected={(place) => {
              // Capture the picked suggestion's parsed components so
              // "Analyze free" can hand them to the calculator for the
              // same HUD/FRED/state auto-fill an in-form selection gets.
              selectedRef.current = place;
            }}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-70 sm:h-14"
        >
          <Calculator className="size-4" />
          Analyze this property
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>

      {/* Secondary actions. The sample report is elevated from a quiet
          text link to a clear outline button because a large share of
          cold/paid traffic lands WITHOUT a specific property to type — for
          them the address input is a dead end, and the one-click sample
          verdict is the fastest path to the product's value. So we name the
          objection directly ("no address yet?"). It stays visually
          secondary to the primary "Analyze this property" action, and
          pricing remains the quietest link so the emphasis is on
          experiencing a deal, not evaluating cost. */}
      <div className="mt-3 flex flex-wrap items-center justify-start gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          onClick={handleTrySample}
          className="group inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-card px-4 py-2 font-semibold text-primary shadow-sm transition-colors hover:border-primary/60 hover:bg-[var(--brand-blue-light)]"
        >
          <Sparkles className="size-4" />
          No address yet? See a sample report
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </button>
        <Link
          href="/pricing"
          className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          See Pro features
        </Link>
      </div>
    </div>
  );
}
