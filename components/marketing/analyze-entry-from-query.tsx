"use client";

/**
 * /analyze entry island — turns a crawlable, JS-free URL into the same
 * handoff the homepage hero produces:
 *
 *   /analyze?sample=1   → runs the sample deal (the "See the sample" link)
 *   /analyze?url=<listing link> → parses the listing and hands the address
 *                                 to the analyzer exactly like the hero does
 *
 * `?address=` is consumed earlier by the pre-analytics bootstrap in the root
 * layout (lib/analyzer-handoff.ts) and prefills the address field — nothing
 * to do here. Sensitive params are scrubbed from the URL after reading so
 * vendor scripts and history never see a listing link.
 */

import { useEffect } from "react";
import { track } from "@/lib/analytics/site-events";
import {
  dispatchHeroAnalyzeWithFallback,
  HERO_ANALYZE_EVENT,
  type HeroAnalyzeDetail,
} from "@/lib/hero-handoff";
import { parseListingUrl } from "@/lib/listing-url";
import { trackEvent } from "@/lib/analytics";

function dispatch(detail: HeroAnalyzeDetail) {
  dispatchHeroAnalyzeWithFallback(detail, {
    storage: window.sessionStorage,
    dispatch: (payload) => {
      window.dispatchEvent(
        new CustomEvent<HeroAnalyzeDetail>(HERO_ANALYZE_EVENT, { detail: payload }),
      );
    },
    schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
  });
}

function scrub(params: URLSearchParams, keys: string[]) {
  let changed = false;
  for (const key of keys) {
    if (params.has(key)) {
      params.delete(key);
      changed = true;
    }
  }
  if (!changed) return;
  const search = params.toString();
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`,
  );
}

export function AnalyzeEntryFromQuery() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (params.get("sample") === "1") {
      trackEvent("hero_sample_opened");
      track("sample_viewed", { source: "link" });
      dispatch({ token, address: "", sample: true });
      scrub(params, ["sample"]);
      return;
    }

    const url = params.get("url");
    if (url) {
      const parsed = parseListingUrl(url);
      scrub(params, ["url"]);
      if (!parsed) return;
      trackEvent("address_submitted", {
        has_components: Boolean(parsed.state),
        entry_kind: "listing_url",
      });
      dispatch({
        token: `listing:${token}`,
        address: parsed.address,
        state: parsed.state,
        zip: parsed.zip,
      });
    }
  }, []);

  return null;
}
