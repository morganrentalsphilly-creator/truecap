"use client";

import { useEffect, useState } from "react";

import {
  TRIAL_USAGE_EVENT,
  applyTrialUsage,
  formatPricingEvaluationAllowance,
  type PricingEvaluationSummary,
  type TrialUsageDetail,
} from "@/lib/pricing-evaluation";

/**
 * The remaining-allowance text of the trial strip. The server renders the
 * count the page loaded with; each newly metered run on this page announces
 * its new count (lib/pricing-evaluation.ts announceTrialUsage) and the text
 * follows it. It listens only: it never calls the metering action or refetches.
 */
export function TrialAllowanceCount({
  initial,
  suffix,
}: {
  initial: PricingEvaluationSummary;
  /** " · ends Sep 10", already formatted by the server. */
  suffix: string;
}) {
  const [summary, setSummary] = useState(initial);

  useEffect(() => {
    const onUsage = (event: Event) => {
      const detail = (event as CustomEvent<TrialUsageDetail>).detail;
      setSummary((current) => applyTrialUsage(current, detail));
    };
    window.addEventListener(TRIAL_USAGE_EVENT, onUsage);
    return () => window.removeEventListener(TRIAL_USAGE_EVENT, onUsage);
  }, []);

  return (
    <span data-trial-allowance="">
      {formatPricingEvaluationAllowance(summary) ?? "Pro allowance used"}
      {suffix}
    </span>
  );
}
