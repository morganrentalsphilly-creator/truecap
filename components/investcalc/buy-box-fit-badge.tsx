import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BuyBoxFitSummary } from "@/lib/buy-box";

/** Per-row "fit vs your buy box(es)" pill. Renders nothing unless ≥1 active
 *  box applied to this deal — keeps every consuming surface clean for
 *  box-less users (invisible until useful). Extracted from
 *  saved-analyses-page-v2.tsx so My Deals, the home Deal Decision List, and
 *  Compare all render the identical pill. Pure presentational (no hooks), so
 *  it is safe in both server and client components. */
export function BuyBoxFitBadge({ fit }: { fit: BuyBoxFitSummary | undefined }) {
  if (!fit || fit.activeCount === 0) return null;
  const label = fit.anyPass
    ? fit.activeCount > 1
      ? `Buy box ${fit.passingCount}/${fit.activeCount}`
      : "Meets buy box"
    : "Misses buy box";
  return (
    <Badge
      className={cn(
        "gap-1 rounded-full border text-xs font-semibold",
        fit.anyPass
          ? "border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] text-[var(--brand-green)]"
          : "border-amber-300 bg-amber-50 text-amber-700"
      )}
    >
      <Target className="size-3" />
      {label}
    </Badge>
  );
}
