"use client";

/**
 * "Save these as my defaults" — a quiet chip in the advanced expense area.
 *
 * A power user who hand-tunes vacancy / mgmt / maintenance / financing on
 * every deal can bank the current values once; every NEW analysis then
 * starts from them (buildNewAnalysisDefaults overlays user_analysis_defaults).
 *
 * Invisible until useful: renders nothing unless the user is signed in AND
 * at least one overlay-covered field has been changed from the values the
 * form was seeded with AND the current values differ from what's already
 * saved. Reuses the existing saveUserAnalysisDefaultsAction (no new fields).
 */

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { saveUserAnalysisDefaultsAction } from "@/app/actions/user-defaults";
import { useToast } from "@/hooks/use-toast";
import { useExpectedAccountUserId } from "@/components/auth/account-session-boundary";

/** Form field → user_analysis_defaults key (the only rename is interestRate). */
const FIELD_TO_DEFAULT: Array<[keyof InvestmentFormValues, string]> = [
  ["downPaymentPct", "downPaymentPct"],
  ["loanTermYears", "loanTermYears"],
  ["interestRate", "interestRatePct"],
  ["closingCostsPct", "closingCostsPct"],
  ["vacancyPct", "vacancyPct"],
  ["mgmtPct", "mgmtPct"],
  ["maintenancePct", "maintenancePct"],
  ["capexPct", "capexPct"],
  ["taxRatePct", "taxRatePct"],
  ["rentGrowthPct", "rentGrowthPct"],
  ["expenseGrowthPct", "expenseGrowthPct"],
  ["appreciationRatePct", "appreciationRatePct"],
  ["sellingCostPct", "sellingCostPct"],
];
const OVERLAY_FIELDS = FIELD_TO_DEFAULT.map(([f]) => f);

/** The 13 overlay fields of the current form as a defaults-schema payload. */
function buildDefaultsPayload(form: UseFormReturn<InvestmentFormValues>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [field, key] of FIELD_TO_DEFAULT) {
    const v = form.getValues(field);
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
  }
  return out;
}

/** Restrict `saved` to the keys in `live`, then deep-equal on those keys. */
function payloadMatchesSaved(live: Record<string, number>, saved: Record<string, number> | null): boolean {
  const s = saved ?? {};
  const keys = Object.keys(live);
  if (keys.length !== Object.keys(s).length) return false;
  return keys.every((k) => s[k] === live[k]);
}

export function SaveAsDefaultsChip({
  form,
  enabled,
  currentDefaults,
}: {
  form: UseFormReturn<InvestmentFormValues>;
  /** Signed-in — the save action's real gate (no separate entitlement). */
  enabled: boolean;
  /** The user's currently-saved defaults (defaults-schema keyed), or null. */
  currentDefaults?: Record<string, number> | null;
}) {
  const { toast } = useToast();
  const expectedUserId = useExpectedAccountUserId();
  const [saving, setSaving] = useState(false);
  // What's persisted right now — starts at the prop, advances on each save so
  // the chip hides the instant the values match what's saved. State, not a
  // ref: it's read during render (React 19 forbids render-time ref reads),
  // and the post-save setState is exactly the re-render that hides the chip.
  const [saved, setSaved] = useState<Record<string, number> | null>(currentDefaults ?? null);

  // Subscribe to form changes + dirty state so this recomputes on edits.
  // (No-arg watch keeps this isolated component in sync; it only re-renders
  // the chip, not the form.)
  form.watch();
  const dirty = form.formState.dirtyFields as Record<string, unknown>;

  if (!enabled) return null;
  // Require a real change from the seeded defaults (RHF dirty = differs from
  // the values the form was initialized with) so an untouched form never nags.
  const touchedAny = OVERLAY_FIELDS.some((f) => dirty[f as string]);
  if (!touchedAny) return null;

  const live = buildDefaultsPayload(form);
  if (payloadMatchesSaved(live, saved)) return null;

  const onSave = async () => {
    setSaving(true);
    try {
      const result = await saveUserAnalysisDefaultsAction(
        live,
        expectedUserId,
      );
      if (result.ok) {
        setSaved(live);
        toast({
          title: "Saved as your defaults",
          description: "New analyses will start from these assumptions.",
          variant: "success",
        });
      } else if (result.code === "MIGRATION_PENDING") {
        toast({ title: "Rolling out", description: "Saving defaults isn't enabled yet." });
      } else {
        toast({ title: "Couldn't save defaults", description: result.message, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onSave()}
      disabled={saving}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-70"
    >
      {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
      Save these as my defaults
    </button>
  );
}
