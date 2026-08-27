export type KnownMetricSummary = {
  total: number;
  knownCount: number;
  totalCount: number;
};

/**
 * Sum only finite, recorded values while retaining the coverage denominator.
 * A missing metric is unknown, never an implicit zero.
 */
export function summarizeKnownMetric(
  values: ReadonlyArray<number | null | undefined>,
): KnownMetricSummary {
  let total = 0;
  let knownCount = 0;

  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    total += value;
    knownCount += 1;
  }

  return { total, knownCount, totalCount: values.length };
}

export function hasCompleteMetricCoverage({
  knownCount,
  totalCount,
}: Pick<KnownMetricSummary, "knownCount" | "totalCount">): boolean {
  return knownCount === totalCount;
}
