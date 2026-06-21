import { cn } from "@/lib/utils";

/**
 * Small, reusable "where these numbers come from" box for market + state pages.
 * Carries the data sources, a visible last-updated date (previously only in
 * JSON-LD), and a not-advice / verify-locally line — so it satisfies both the
 * source/methodology requirement and the legal guardrail for the landlord-law,
 * tax-rate, and "good place to buy" claims these pages make.
 */
export function SourceMethodologyBox({
  sources,
  updated,
  note,
  className,
}: {
  sources: string[];
  /** Human-friendly date, e.g. "June 2026". */
  updated: string;
  note?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/20 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground",
        className
      )}
    >
      <p>
        <span className="font-semibold text-foreground">Sources &amp; methodology.</span>{" "}
        {note ??
          "These are screening defaults and market estimates — not an appraisal, and not financial, tax, or legal advice. Verify rents, taxes, insurance, and local landlord/tenant law against authoritative local sources before relying on them."}
      </p>
      <p className="mt-1">
        Data: {sources.join(" · ")} ·{" "}
        <span className="font-medium text-foreground">Updated {updated}</span>
      </p>
    </div>
  );
}
