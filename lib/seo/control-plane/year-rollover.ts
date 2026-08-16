export type YearReference = { year: number; index: number; context: string };

export function findYearReferences(content: string, minimumYear = 2020): YearReference[] {
  const out: YearReference[] = [];
  for (const match of content.matchAll(/\b(20\d{2})\b/g)) {
    const year = Number(match[1]);
    if (year < minimumYear) continue;
    const index = match.index ?? 0;
    out.push({ year, index, context: content.slice(Math.max(0, index - 60), index + 64) });
  }
  return out;
}

export function needsYearRolloverReview(
  content: string,
  now = new Date(),
): { due: boolean; currentYearReferences: YearReference[]; reason: string | null } {
  const currentYear = now.getUTCFullYear();
  const refs = findYearReferences(content).filter((item) => item.year === currentYear);
  const due = refs.length > 0 && now.getUTCMonth() >= 10;
  return {
    due,
    currentYearReferences: refs,
    reason: due ? "Current-year claims require evidence review before rollover; automated number replacement is forbidden." : null,
  };
}
