/**
 * Static Tailwind classes keep the comparison readable when fewer than four
 * deals are present. Do not interpolate `grid-cols-${count}`: Tailwind cannot
 * discover that class at build time.
 */
export function comparisonGridColumns(dealCount: number): string {
  if (dealCount <= 1) return "grid-cols-1";
  if (dealCount === 2) return "grid-cols-2";
  // At phone widths, three or four side-by-side cells leave less than 90px
  // apiece after page/card padding. That is narrower than two adjacent 44px
  // action targets and clips the controls inside DashboardShell. Keep dense
  // comparisons at two columns until `sm`; every numbered deal and metric row
  // uses this same helper, so their alignment remains deterministic.
  if (dealCount === 3) return "grid-cols-2 sm:grid-cols-3";
  return "grid-cols-2 sm:grid-cols-4";
}
