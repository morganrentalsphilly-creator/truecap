export type FactClaim = {
  factKey: string;
  value: string | number | boolean;
  location: string;
  authoritative: boolean;
};

export type Contradiction = {
  factKey: string;
  authoritativeValue: string | number | boolean | null;
  claims: FactClaim[];
  severity: "critical" | "high";
};

/**
 * Detects cross-site factual disagreement. A canonical/authoritative claim
 * wins; disagreement on high-risk facts is critical. Multiple competing
 * authoritative values are always critical and require human resolution.
 */
export function detectContradictions(
  claims: FactClaim[],
  criticalFactKeys: ReadonlySet<string> = new Set(),
): Contradiction[] {
  const grouped = new Map<string, FactClaim[]>();
  for (const claim of claims) {
    const rows = grouped.get(claim.factKey) ?? [];
    rows.push(claim);
    grouped.set(claim.factKey, rows);
  }

  const out: Contradiction[] = [];
  for (const [factKey, rows] of grouped) {
    const values = new Set(rows.map((claim) => JSON.stringify(claim.value)));
    if (values.size < 2) continue;
    const authorities = rows.filter((claim) => claim.authoritative);
    const authorityValues = new Set(authorities.map((claim) => JSON.stringify(claim.value)));
    const authoritativeValue = authorityValues.size === 1 ? authorities[0].value : null;
    out.push({
      factKey,
      authoritativeValue,
      claims: rows,
      severity: criticalFactKeys.has(factKey) || authorityValues.size > 1 ? "critical" : "high",
    });
  }
  return out.sort((a, b) => a.factKey.localeCompare(b.factKey));
}
