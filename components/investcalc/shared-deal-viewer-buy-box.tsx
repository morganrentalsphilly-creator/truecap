"use client";

/**
 * The VIEWER's own Buy Box on the public /d/[encoded] share page.
 *
 * A shared deal is the growth loop's front door — when the recipient is a
 * signed-in TrueCap user with their own active buy box, show them THEIR
 * personal verdict on the shared deal ("Misses on cash-on-cash — 0.8pp
 * short") right in the read-only view. Strongest personalization demo we
 * can run on borrowed traffic, and it strengthens the "Make this mine" CTA
 * directly below it (import it and adjust).
 *
 * §8-safe by construction: ZERO share-payload changes. The evaluation runs
 * entirely client-side against the analysis the /d page already recomputes
 * from the decoded values; the viewer's boxes load via listBuyBoxesAction
 * (RLS-scoped, inside BuyBoxVerdictCard). Anonymous viewers and viewers
 * without an active box see the page exactly as before — the card gates its
 * fetch on `enabled` and renders nothing without boxes.
 */

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BuyBoxVerdictCard } from "@/components/investcalc/buy-box-verdict-card";
import { deriveStateFromAddress, type BuyBoxDealMetrics } from "@/lib/buy-box";
import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

export function SharedDealViewerBuyBox({
  values,
  result,
}: {
  values: InvestmentFormValues;
  result: AnalysisResult;
}) {
  // Local session check (cookie read, no server round-trip) so anonymous
  // viewers never even fire the buy-box action. The action re-verifies the
  // user server-side regardless, so this is a fetch gate, not security.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void createBrowserSupabaseClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (!cancelled) setSignedIn(Boolean(session));
      })
      .catch(() => {
        /* auth unavailable — treat as anonymous, card stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Same metrics mapping as the BuyBoxVerdictCard mount in
  // analysis-dashboard.tsx — incl. the cash-purchase DSCR N/A rule.
  const metrics = useMemo<BuyBoxDealMetrics>(
    () => ({
      capRatePct: result.capRate ?? null,
      cocPct: result.cocReturn ?? null,
      dscr: result.dscr ?? null,
      cashFlowMonthly: result.netCashFlow ?? null,
      purchasePrice: values.purchasePrice ?? null,
      propertyType: values.propertyType,
      state: deriveStateFromAddress(values.address),
      isCashPurchase: result.monthlyPayment <= 0,
    }),
    [values, result]
  );

  return <BuyBoxVerdictCard enabled={signedIn} metrics={metrics} />;
}
