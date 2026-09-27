/**
 * /admin/seo's organic sign-ups: seo_conversions_daily rows written by
 * seo/scripts/signups.ts (event_name 'signup_completed', topic_cluster
 * 'organic', page_type = landing section), folded into the last four rolling
 * 7-day weeks by section. Pure, so the folding is unit-tested without a DB.
 */

export const ORGANIC_SIGNUP_WEEKS = 4;
const DAY_MS = 86_400_000;

export type OrganicSignupWeek = { start: string; end: string };
export type OrganicSignupSection = { section: string; counts: number[]; total: number };
export type OrganicSignupSummary = {
  /** Oldest first; the last week ends today (UTC). */
  weeks: OrganicSignupWeek[];
  /** Sections with at least one sign-up, largest total first. */
  sections: OrganicSignupSection[];
  /** Per week, across sections. */
  weekTotals: number[];
  total: number;
};

const utcDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** First UTC date the dashboard reads (four weeks, today included). */
export function organicSignupWindowStart(nowMs: number): string {
  return utcDate(nowMs - (ORGANIC_SIGNUP_WEEKS * 7 - 1) * DAY_MS);
}

export function organicSignupWeeks(nowMs: number): OrganicSignupWeek[] {
  const weeks: OrganicSignupWeek[] = [];
  for (let index = ORGANIC_SIGNUP_WEEKS - 1; index >= 0; index -= 1) {
    const endMs = nowMs - index * 7 * DAY_MS;
    weeks.push({ start: utcDate(endMs - 6 * DAY_MS), end: utcDate(endMs) });
  }
  return weeks;
}

/**
 * Fold rows into weeks × sections. Returns null when nothing in the window
 * counts, so the page renders no section at all (invisible until useful).
 */
export function summarizeOrganicSignups(
  rows: ReadonlyArray<Record<string, unknown>>,
  nowMs: number,
): OrganicSignupSummary | null {
  const weeks = organicSignupWeeks(nowMs);
  const bySection = new Map<string, number[]>();
  for (const row of rows) {
    const date = typeof row.date === "string" ? row.date.slice(0, 10) : "";
    const section = typeof row.page_type === "string" && row.page_type ? row.page_type : "other";
    const conversions = typeof row.conversions === "number" ? row.conversions : Number(row.conversions);
    if (!Number.isFinite(conversions) || conversions <= 0) continue;
    const week = weeks.findIndex((w) => date >= w.start && date <= w.end);
    if (week === -1) continue;
    const counts = bySection.get(section) ?? weeks.map(() => 0);
    counts[week] += conversions;
    bySection.set(section, counts);
  }
  if (!bySection.size) return null;
  const sections = [...bySection.entries()]
    .map(([section, counts]) => ({ section, counts, total: counts.reduce((sum, n) => sum + n, 0) }))
    .sort((a, b) => b.total - a.total || a.section.localeCompare(b.section));
  const weekTotals = weeks.map((_, index) => sections.reduce((sum, row) => sum + row.counts[index], 0));
  return { weeks, sections, weekTotals, total: weekTotals.reduce((sum, n) => sum + n, 0) };
}
