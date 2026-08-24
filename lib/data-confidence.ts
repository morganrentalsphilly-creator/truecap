/**
 * Data confidence — per-input provenance + an overall High/Medium/Low
 * level for an analysis. Pure module (no IO, client-safe).
 *
 * The analyzer captures which fields enrich-property filled (HUD FMR /
 * FRED / state tax) and whether the user later overrode them; this module
 * turns that into the object we persist (saved_analyses.data_confidence)
 * and render in the confidence badge. It's also used live on the result
 * screen before a deal is saved.
 *
 * Level rule (from the product spec):
 *   - Low    = a key input is missing (no rent or no price).
 *   - Medium = key inputs present but not live-sourced/verified (defaults
 *              or plain manual entry we can't attribute).
 *   - High   = the two biggest value drivers (rent + rate) are explicitly
 *              verified. A benchmark or hand-entered estimate alone is not
 *              verification. New surfaces use Input Confidence v1.0; this
 *              object remains as a backward-compatible three-field summary.
 */

export type DataConfidenceSource = "hud-fmr" | "hud-safmr" | "rentcast-estimate" | "fred" | "state-static" | "manual";
export type ConfidenceLevel = "high" | "medium" | "low";
export type DataConfidenceField = "monthlyRent" | "interestRate" | "propertyTaxPct";

export type FieldProvenance = {
  source: DataConfidenceSource;
  /** ISO date / FRED asOf / HUD year — when the sourced value was fetched. */
  fetchedAt?: string | null;
  /** True when the user typed/overrode the value themselves. */
  verified: boolean;
  /** Human detail, e.g. "Philadelphia County" or "30-yr avg". */
  detail?: string;
};

export type DataConfidence = {
  fields: Partial<Record<DataConfidenceField, FieldProvenance>>;
  level: ConfidenceLevel;
  computedAt: string;
};

/** Client→server payload: what enrich-property filled + whether overridden. */
export type EnrichmentProvenanceInput = Partial<
  Record<
    DataConfidenceField,
    {
      source: DataConfidenceSource;
      fetchedAt?: string | null;
      detail?: string;
      /** User changed the value after auto-fill → becomes an unverified manual estimate. */
      overridden?: boolean;
    }
  >
>;

export type ConfidenceCompleteness = {
  hasRent: boolean;
  hasPrice: boolean;
  hasBeds?: boolean;
};

const FIELD_LABELS: Record<DataConfidenceField, string> = {
  monthlyRent: "Rent",
  interestRate: "Interest rate",
  propertyTaxPct: "Property tax",
};

const SOURCE_LABELS: Record<DataConfidenceSource, string> = {
  "hud-fmr": "HUD rent benchmark (county)",
  "hud-safmr": "HUD rent benchmark (ZIP)",
  "rentcast-estimate": "RentCast market-rent estimate",
  fred: "FRED owner-occupied rate benchmark",
  "state-static": "State tax benchmark",
  manual: "You entered it",
};

export function dataConfidenceFieldLabel(f: DataConfidenceField): string {
  return FIELD_LABELS[f];
}

export function dataConfidenceSourceLabel(s: DataConfidenceSource): string {
  return SOURCE_LABELS[s] ?? s;
}

/** A tracked field is trusted only after explicit verification. */
function isTrusted(f: FieldProvenance | undefined): boolean {
  return f?.verified === true;
}

export function computeConfidenceLevel(
  fields: DataConfidence["fields"],
  completeness: ConfidenceCompleteness
): ConfidenceLevel {
  if (!completeness.hasRent || !completeness.hasPrice) return "low";
  if (isTrusted(fields.monthlyRent) && isTrusted(fields.interestRate)) return "high";
  return "medium";
}

export function buildDataConfidence(
  input: EnrichmentProvenanceInput | null | undefined,
  completeness: ConfidenceCompleteness,
  now: Date = new Date()
): DataConfidence {
  const fields: DataConfidence["fields"] = {};
  if (input) {
    for (const key of Object.keys(input) as DataConfidenceField[]) {
      const entry = input[key];
      if (!entry) continue;
      fields[key] = entry.overridden
        ? { source: "manual", verified: false, detail: "You changed it after auto-fill; not yet verified" }
        : {
            source: entry.source,
            fetchedAt: entry.fetchedAt ?? null,
            verified: false,
            detail: entry.detail,
          };
    }
  }
  return {
    fields,
    level: computeConfidenceLevel(fields, completeness),
    computedAt: now.toISOString(),
  };
}

/**
 * Backward-compatible update policy for the legacy Data Confidence summary.
 * Older clients cannot resend persisted enrichment context, so an absent
 * payload must keep the stored summary. Context-aware clients explicitly say
 * they revalidated the context; for them, an empty payload is meaningful and
 * must clear sources whose value binding no longer matches.
 */
export function shouldPreserveStoredDataConfidence(args: {
  sourceContextProvided: boolean;
  provenanceProvided: boolean;
  hasStoredDataConfidence: boolean;
}): boolean {
  return (
    args.hasStoredDataConfidence &&
    !args.sourceContextProvided &&
    !args.provenanceProvided
  );
}

export function confidenceLabel(level: ConfidenceLevel): string {
  return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
}

/**
 * The concrete next step that would raise this deal's confidence — or null when
 * it is already High and there is nothing to do.
 *
 * The badge could always say WHERE a number came from, but never what to do
 * about a Medium/Low rating, which left the most actionable part of the feature
 * unspoken. This closes that loop.
 *
 * Derived from the SAME rule as computeConfidenceLevel above, so the advice can
 * never contradict the rating it explains. In particular: that rule returns
 * "high" whenever rent and rate both carry provenance, so a deal that is NOT
 * high while both are sourced can only have failed the completeness check —
 * which is why that case advises filling in rent/price rather than re-fetching.
 */
export function describeConfidenceGap(
  confidence: DataConfidence,
  opts?: { propertyType?: string | null }
): string | null {
  if (confidence.level === "high") return null;

  const hasRentSource = confidence.fields.monthlyRent != null;
  const hasRateSource = confidence.fields.interestRate != null;

  /**
   * HUD rent auto-fill runs ONLY on the single-family branch
   * (investcalc-page.tsx gates it on isSingleFamily), because multi-unit rent
   * lives per-unit and a single county FMR figure can't stand in for it. So on
   * a multi-family / owner-occupant deal, rent provenance is unobtainable — and
   * telling those users to pick their address again would be advice that can
   * never work, repeated on every deal they own.
   */
  const rentSourceAttainable =
    opts?.propertyType == null || opts.propertyType === "single-family";

  if (!hasRentSource && !hasRateSource) {
    return rentSourceAttainable
      ? "Pick your address from the suggestions to pull HUD and FRED planning benchmarks."
      : "Pick your address from the suggestions to pull the latest FRED rate benchmark.";
  }
  if (!hasRentSource) {
    // Nothing actionable for a multi-unit deal: the rate is already sourced and
    // rent never can be. Stay silent rather than nag.
    return rentSourceAttainable
      ? "Pick your address from the suggestions to pull the HUD rent benchmark for this area."
      : null;
  }
  if (!hasRateSource) {
    return "Pick your address from the suggestions to pull the latest FRED rate benchmark.";
  }
  return "Verify rent with recent local comps and replace the rate benchmark with a current lender quote.";
}

/** Tolerant parse of a persisted data_confidence jsonb. Returns null if unusable. */
export function normalizeDataConfidence(raw: unknown): DataConfidence | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const level = obj.level;
  if (level !== "high" && level !== "medium" && level !== "low") return null;

  const fieldsRaw = (obj.fields ?? {}) as Record<string, unknown>;
  const fields: DataConfidence["fields"] = {};
  for (const key of ["monthlyRent", "interestRate", "propertyTaxPct"] as DataConfidenceField[]) {
    const f = fieldsRaw[key];
    if (f && typeof f === "object") {
      const fo = f as Record<string, unknown>;
      const source = fo.source;
      if (
        source === "hud-fmr" ||
        source === "hud-safmr" ||
        source === "rentcast-estimate" ||
        source === "fred" ||
        source === "state-static" ||
        source === "manual"
      ) {
        fields[key] = {
          source,
          fetchedAt: typeof fo.fetchedAt === "string" ? fo.fetchedAt : null,
          verified: Boolean(fo.verified),
          detail: typeof fo.detail === "string" ? fo.detail : undefined,
        };
      }
    }
  }

  return {
    fields,
    level,
    computedAt: typeof obj.computedAt === "string" ? obj.computedAt : new Date(0).toISOString(),
  };
}
