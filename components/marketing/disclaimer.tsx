import Link from "next/link";

/**
 * The ONE disclaimer. Rendered once per marketing page (near the bottom, via
 * the site footer, so on every blog post too) and once in the results view.
 * Every per-element hedge that used to repeat some version of this sentence
 * was removed in the 2026-09 voice pass (docs/voice.md) — do not add them
 * back; add nothing to this text without a legal reason.
 *
 * F3 (2026-09-27) added the general-information sentence: the blog makes tax
 * and legal statements, and the text said only "not ... investment advice".
 * The rendered copy and DISCLAIMER_TEXT are built from the same strings, so
 * the two cannot drift.
 */
const DISCLAIMER_LEAD =
  "TrueCap models a deal from the assumptions you see and can edit. It is not an appraisal, a lender decision, or investment advice. Our articles and guides are general information, not tax, legal or investment advice; confirm the specifics with a qualified professional.";

export const DISCLAIMER_TEXT = `${DISCLAIMER_LEAD} The math is published in our Methodology.`;

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
      {DISCLAIMER_LEAD} The math is published in our{" "}
      <Link
        href="/methodology"
        className="inline-flex min-h-11 items-center font-semibold text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        Methodology
      </Link>
      .
    </p>
  );
}
