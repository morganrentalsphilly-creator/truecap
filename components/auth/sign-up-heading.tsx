"use client";

/**
 * The sign-up page's headline, by what the visitor was doing (2026-11 ads
 * pass, B2). The page renders the headline for its URL (a plan from pricing,
 * or the plain one); this swaps in the save headline once the browser shows a
 * pending analysis: the visitor pressed Save on a result, so the page says
 * which deal the account will hold instead of promising to "unlock" a number
 * they have just read.
 *
 * The address is read from this browser's own analyzer draft and never
 * leaves it: it is not in the URL and is not sent anywhere from here.
 */

import { useEffect, useState } from "react";
import { CALC_FORM_DRAFT_KEY } from "@/lib/calc-draft-key";
import { isTrueCapSyntheticSampleAddress } from "@/lib/sample-deal";
import { hasPendingSaveIntent } from "@/lib/save-intent";

/** The street line of a full address, short enough for a headline. */
export function streetLineForHeadline(address: unknown): string | null {
  if (typeof address !== "string") return null;
  // The sample deal carries an internal placeholder address, never shown.
  if (isTrueCapSyntheticSampleAddress(address)) return null;
  const street = address.split(",")[0]?.trim().slice(0, 48).trim() ?? "";
  return street.length > 0 ? street : null;
}

/** The headline for a visitor who arrived with an analysis to save. */
export function pendingAnalysisHeadline(address: unknown): string {
  const street = streetLineForHeadline(address);
  return street
    ? `Save ${street} to a free account`
    : "Save your analysis to a free account";
}

export function SignUpHeading({ fallback }: { fallback: string }) {
  const [headline, setHeadline] = useState<string | null>(null);
  useEffect(() => {
    if (!hasPendingSaveIntent()) return;
    let address: unknown = null;
    try {
      const raw = window.localStorage.getItem(CALC_FORM_DRAFT_KEY);
      address = raw ? (JSON.parse(raw) as { address?: unknown }).address : null;
    } catch {
      address = null;
    }
    setHeadline(pendingAnalysisHeadline(address));
  }, []);
  return <>{headline ?? fallback}</>;
}
