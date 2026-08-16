export const MIN_REPORT_COHORT = 50;

export type AggregateObservation = { cohortSize: number; metric: string; value: number };

export function privacySafeObservations(
  rows: AggregateObservation[],
  minimumCohort = MIN_REPORT_COHORT,
): AggregateObservation[] {
  return rows.filter(
    (row) => Number.isFinite(row.value) && Number.isInteger(row.cohortSize) && row.cohortSize >= minimumCohort,
  );
}

export function suggestedCitation(input: {
  title: string;
  updatedAt: string;
  canonical: string;
}): string {
  const year = new Date(input.updatedAt).getUTCFullYear();
  return `TrueCap. “${input.title}.” Updated ${input.updatedAt}. ${input.canonical} (accessed ${year}).`;
}
