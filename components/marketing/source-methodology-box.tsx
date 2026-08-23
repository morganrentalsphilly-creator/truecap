import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Small, reusable "where these numbers come from" box for market + state pages.
 * Carries linked data sources, a visible last-updated date, a reviewer, a
 * confidence/precision note, and a not-advice / verify-locally line — so it
 * satisfies both the source/methodology requirement (E-E-A-T) and the legal
 * guardrail for the landlord-law, tax-rate, and "good place to buy" claims
 * these pages make.
 *
 * Backward-compatible: callers still pass `sources: string[]` + `updated`;
 * recognized sources auto-link to their authoritative page (no call-site
 * churn). `reviewer` + `confidence` are optional with sensible defaults.
 */

/** Authoritative URLs for the data we cite. Matched by substring so the
 *  existing plain-string `sources` auto-link without touching every call site.
 *  URLs verified June 2026. */
const SOURCE_LINKS: { match: RegExp; href: string }[] = [
  { match: /HUD|Fair Market Rent|FMR|SAFMR/i, href: "https://www.huduser.gov/portal/datasets/fmr.html" },
  { match: /FRED|mortgage rate/i, href: "https://fred.stlouisfed.org/series/MORTGAGE30US" },
  { match: /Tax Foundation|property tax/i, href: "https://taxfoundation.org/data/all/state/property-taxes-by-state-county/" },
  { match: /Census|ACS/i, href: "https://www.census.gov/programs-surveys/acs" },
];

function sourceHref(label: string): string | null {
  return SOURCE_LINKS.find((s) => s.match.test(label))?.href ?? null;
}

export function SourceMethodologyBox({
  sources,
  updated,
  reviewer = "the TrueCap team",
  note,
  confidence,
  className,
}: {
  sources: string[];
  /** Human-friendly date, e.g. "June 2026". */
  updated: string;
  /** Who reviewed the page's claims. Defaults to "the TrueCap team". */
  reviewer?: string;
  note?: string;
  /** Confidence/precision caveat. Sensible market-page default if omitted. */
  confidence?: string;
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
          "These are screening defaults and market estimates — not an appraisal, and not financial, tax, or legal advice. Verify rents, taxes, insurance, and local landlord/tenant law against the county assessor and your state's landlord-tenant statute before relying on them."}
      </p>
      <p className="mt-1">
        Data:{" "}
        {sources.map((s, i) => {
          const href = sourceHref(s);
          return (
            <span key={s}>
              {i > 0 ? " · " : ""}
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline decoration-dotted underline-offset-2 hover:text-foreground"
                >
                  {s}
                </a>
              ) : (
                s
              )}
            </span>
          );
        })}{" "}
        · <span className="font-medium text-foreground">Updated {updated}</span>
      </p>
      <p className="mt-1">
        {confidence ??
          "Metro-level estimates — precision is lower at the neighborhood and parcel level; pull a specific address for editable property-screening estimates."}{" "}
        Reviewed by {reviewer}.{" "}
        <Link
          href="/methodology"
          className="underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          See our full methodology
        </Link>
        .
      </p>
    </div>
  );
}
