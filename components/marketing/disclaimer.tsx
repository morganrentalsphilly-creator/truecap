import Link from "next/link";

/**
 * The ONE disclaimer. Rendered once per marketing page (near the bottom, via
 * the site footer) and once in the results view. Every per-element hedge
 * that used to repeat some version of this sentence was removed in the
 * 2026-09 voice pass (docs/voice.md) — do not add them back; add nothing to
 * this text without a legal reason.
 */
export const DISCLAIMER_TEXT =
  "TrueCap models a deal from the assumptions you see and can edit. It is not an appraisal, a lender decision, or investment advice. The math is published in our Methodology.";

export function Disclaimer({
  className = "",
  tone = "muted",
}: {
  className?: string;
  /** `muted` for footers; `card` inside the results view. */
  tone?: "muted" | "card";
}) {
  const base =
    tone === "card"
      ? "rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground"
      : "text-xs leading-relaxed text-muted-foreground";
  return (
    <p data-disclaimer="" className={`${base} ${className}`.trim()}>
      TrueCap models a deal from the assumptions you see and can edit. It is
      not an appraisal, a lender decision, or investment advice. The math is
      published in our{" "}
      <Link
        href="/methodology"
        className="inline-flex min-h-11 items-center font-semibold text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Methodology
      </Link>
      .
    </p>
  );
}
