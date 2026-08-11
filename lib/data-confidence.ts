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
 *   - High   = the two biggest value drivers (rent + rate) are each either
 *              live-sourced or user-verified.
 */

export type DataConfidenceSource = "hud-fmr" | "hud-safmr" | "fred" | "state-static" | "manual";
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
      /** User changed the value after auto-fill → becomes a verified manual entry. */
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
  "hud-fmr": "HUD FMR (county)",
  "hud-safmr": "HUD FMR (ZIP)",
  fred: "FRED 30-yr avg",
  "state-static": "State effective rate",
  manual: "You entered it",
};

export function dataConfidenceFieldLabel(f: DataConfidenceField): string {
  return FIELD_LABELS[f];
}

export function dataConfidenceSourceLabel(s: DataConfidenceSource): string {
  return SOURCE_LABELS[s] ?? s;
}

/** A tracked field is trusted: either live-sourced or user-verified. */
function isTrusted(f: FieldProvenance | undefined): boolean {
  return f != null;
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
        ? { source: "manual", verified: true, detail: "You changed it after auto-fill" }
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
export function describeConfidenceGap(confidence: DataConfidence): string | null {
  if (confidence.level === "high") return null;

  const hasRentSource = confidence.fields.monthlyRent != null;
  const hasRateSource = confidence.fields.interestRate != null;

  if (!hasRentSource && !hasRateSource) {
    return "Pick your address from the suggestions to pull live HUD market rent and FRED mortgage rates.";
  }
  if (!hasRentSource) {
    return "Pick your address from the suggestions to pull live HUD market rent for this area.";
  }
  if (!hasRateSource) {
    return "Pick your address from the suggestions to pull the current FRED mortgage rate.";
  }
  return "Add a monthly rent and a purchase price to complete this analysis.";
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
