import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { formatIsoDate, type SourceLink } from "@/lib/markets/data-copy";
import { cn } from "@/lib/utils";

/**
 * "Where these numbers come from" block for the market and state pages (F8).
 *
 * Carries the page's one dating line ("Data as of HUD FY2026 (retrieved
 * July 13, 2026)." — the data vintage, never the build date and never the
 * page's lastmod), every source the page cites as a link with the day it was
 * retrieved, and one closing line. Sources are passed in by the page from its
 * data (lib/markets/market-page-data.ts, lib/markets/indexability.ts), so the
 * box can never name a source the page does not use. The page's one
 * <Disclaimer /> (in SiteFooter) carries the not-advice statement; this box
 * does not repeat it (docs/voice.md rule 3).
 *
 * Set on a rule, not in a tinted box (DESIGN.md: the sources block uses rules
 * and space; Note's grammar in components/marketing/page-parts.tsx): the 1px
 * rule, the heading at 16px and 600, the lines at 14px in Ink 2, links in the
 * site's link style.
 *
 * The closing line states only what a reader can do with the box: check a
 * sourced figure against the listed page. It does not say the figures were
 * retrieved from those pages on the listed dates, because most market pages'
 * HUD rents were fetched from the HUD FMR API on the day the dating line
 * gives, and the listed HUD documentation page (same figures) was read later.
 * It used to read "Reviewed by the TrueCap team", which named no reviewer, no
 * review and no date, on a site that says elsewhere that one person builds
 * TrueCap. Do not bring back a reviewer or a team claim here;
 * lib/__tests__/markets-states-data-first renders every market and state
 * page and fails on one.
 */
export function SourceMethodologyBox({
  dataAsOf,
  sources,
  note,
  className,
}: {
  /** The visible dating line, e.g. "Data as of HUD FY2026 (retrieved July 13, 2026)." */
  dataAsOf: string | null;
  sources: readonly SourceLink[];
  /** One plain sentence on how the page uses the data. */
  note?: string;
  className?: string;
}) {
  return (
    <section
      data-sources-box=""
      aria-labelledby="sources-heading"
      className={cn(
        "border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <h2 id="sources-heading" className="text-base font-semibold text-foreground">
        Sources &amp; methodology
      </h2>
      {dataAsOf ? (
        <p data-market-data-as-of="" className="mt-2 font-semibold text-foreground">
          {dataAsOf}
        </p>
      ) : null}
      {note ? <p className="mt-2">{note}</p> : null}
      {sources.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {sources.map((source) => (
            <li key={source.href}>
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="tc-link"
              >
                {source.label}
              </a>
              {source.retrievedAt ? `, retrieved ${formatIsoDate(source.retrievedAt)}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2">
        {sources.length > 0
          ? "Figures with a source can be checked against the pages listed here. "
          : null}
        <IntentPrefetchLink
          href="/methodology"
          className="tc-link"
        >
          See our full methodology
        </IntentPrefetchLink>
        .
      </p>
    </section>
  );
}
