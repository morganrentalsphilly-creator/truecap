"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Landmark, RotateCcw } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { listFinancingProfilesAction } from "@/app/actions/financing-profiles";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import {
  financingProfileAgeBand,
  financingProfileAnalysisPatch,
  financingProfileMatchesAnalysis,
  financingProfileUnmodeledTerms,
  snapshotFinancingProfile,
  type FinancingProfile,
  type FinancingProfileSnapshot,
} from "@/lib/financing-profiles";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

type FinancingProfileSelectorProps = {
  form: UseFormReturn<InvestmentFormValues>;
  appliedProfile: FinancingProfileSnapshot | null;
  onAppliedProfileChange: (profile: FinancingProfileSnapshot | null) => void;
};

function formatVerified(value: string | null): string {
  if (!value) return "Terms have not been verified yet";
  return `Last verified ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))}`;
}

function profileSummary(profile: FinancingProfile | FinancingProfileSnapshot): string {
  const parts: string[] = [];
  if (profile.interestRatePct != null) parts.push(`${profile.interestRatePct.toFixed(2)}%`);
  if (profile.downPaymentPct != null) parts.push(`${profile.downPaymentPct}% down`);
  else if (profile.ltvPct != null) parts.push(`${profile.ltvPct}% LTV`);
  const amortization = profile.amortizationYears ?? profile.loanTermYears;
  if (amortization != null) parts.push(`${amortization}-year amortization`);
  return parts.join(" · ") || "No modeled terms entered";
}

export function FinancingProfileSelector({
  form,
  appliedProfile,
  onAppliedProfileChange,
}: FinancingProfileSelectorProps) {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<FinancingProfile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  const currentInterestRate = form.watch("interestRate");
  const currentDownPaymentPct = form.watch("downPaymentPct");
  const currentLoanTermYears = form.watch("loanTermYears");
  const currentClosingCostsPct = form.watch("closingCostsPct");
  const currentPmiAnnualRatePct = form.watch("pmiAnnualRatePct");
  const currentPmiNoCancel = form.watch("pmiNoCancel");

  useEffect(() => {
    let cancelled = false;
    void listFinancingProfilesAction()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          const active = result.profiles.filter((profile) => profile.isActive);
          setProfiles(active);
          const preferred =
            active.find((profile) => profile.isDefault) ??
            active[0];
          setSelectedId(preferred?.id ?? "");
        } else if (
          result.code !== "FEATURE_DISABLED" &&
          result.code !== "SIGN_IN_REQUIRED" &&
          result.code !== "MIGRATION_PENDING"
        ) {
          // The selector is optional, so expected absence stays quiet. A real
          // server failure must not masquerade as "you have no profiles."
          toast({
            title: "Couldn't load financing profiles",
            description: result.message,
            variant: "destructive",
          });
        }
        setLoading(false);
      })
      .catch((error) => {
        if (!cancelled) {
          Sentry.captureException(error, { tags: { feature: "financing-profiles" } });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Once any engine-applied term diverges, detach the reusable profile. The
  // edited values remain in the form, but a later save must not claim they
  // still equal the lender profile's frozen revision.
  useEffect(() => {
    if (!appliedProfile) return;
    if (
      financingProfileMatchesAnalysis(appliedProfile, {
        interestRate: currentInterestRate,
        downPaymentPct: currentDownPaymentPct,
        loanTermYears: currentLoanTermYears,
        closingCostsPct: currentClosingCostsPct,
        pmiAnnualRatePct: currentPmiAnnualRatePct,
        pmiNoCancel: currentPmiNoCancel,
      })
    ) return;
    onAppliedProfileChange(null);
    toast({
      title: "Financing profile detached",
      description: "Your edited financing assumptions remain in the deal, but no longer match that saved profile.",
    });
    // Each primitive field is intentional: object identity would fire this
    // effect on every render and could detach a just-applied profile.
  }, [
    appliedProfile,
    currentInterestRate,
    currentDownPaymentPct,
    currentLoanTermYears,
    currentClosingCostsPct,
    currentPmiAnnualRatePct,
    currentPmiNoCancel,
    onAppliedProfileChange,
    toast,
  ]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) ?? null,
    [profiles, selectedId]
  );

  function applySelectedProfile() {
    if (!selectedProfile) return;
    const patch = financingProfileAnalysisPatch(selectedProfile);
    for (const [field, value] of Object.entries(patch)) {
      form.setValue(field as keyof InvestmentFormValues, value as never, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
    const snapshot = snapshotFinancingProfile(selectedProfile);
    onAppliedProfileChange(snapshot);
    trackEvent("financing_profile_applied", {
      loan_type: selectedProfile.loanType,
      age_band: financingProfileAgeBand(selectedProfile.lastVerifiedAt),
    });
    toast({
      title: `${selectedProfile.name} applied`,
      description: "The live financing assumptions now use this frozen profile revision.",
    });
  }

  if (loading) return null;
  if (profiles.length === 0 && !appliedProfile) return null;

  const unmodeled = appliedProfile ? financingProfileUnmodeledTerms(appliedProfile) : [];

  return (
    <div className="mb-5 rounded-xl border border-[var(--brand-green)]/25 bg-[var(--brand-green)]/[0.04] p-4">
      {appliedProfile ? (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BadgeCheck aria-hidden className="size-4 text-[var(--brand-green)]" />
                Using your {appliedProfile.name} Financing Profile
              </div>
              <p className="mt-1 text-sm text-foreground/80">{profileSummary(appliedProfile)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatVerified(appliedProfile.lastVerifiedAt)} · frozen profile v{appliedProfile.termsVersion}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => onAppliedProfileChange(null)}
            >
              <RotateCcw aria-hidden /> Use custom terms
            </Button>
          </div>
          {unmodeled.length > 0 ? (
            <p className="mt-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              Recorded but not included in current return calculations: {unmodeled.join(", ")}.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="financing-profile-selector" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--brand-green)]">
              <Landmark aria-hidden className="size-4" /> Financing Profile
            </label>
            <select
              id="financing-profile-selector"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              aria-describedby={selectedProfile ? "financing-profile-selector-summary" : undefined}
              className="mt-1.5 h-11 w-full rounded-md border border-[var(--brand-green)] bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}{profile.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
            {selectedProfile ? (
              <p id="financing-profile-selector-summary" className="mt-1 text-[11px] text-muted-foreground">
                {profileSummary(selectedProfile)} · {formatVerified(selectedProfile.lastVerifiedAt)}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            onClick={applySelectedProfile}
            disabled={!selectedProfile}
          >
            Apply profile
          </Button>
        </div>
      )}
      <div className="mt-2 text-right">
        <Link
          href="/settings#financing-profiles"
          className="inline-flex min-h-11 items-center text-[11px] font-medium text-muted-foreground underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Manage financing profiles
        </Link>
      </div>
    </div>
  );
}
