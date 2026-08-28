/**
 * "<City> strategy guides" link block — the crawl path from a city
 * market page down to its /markets/<city>/<strategy> combo pages.
 *
 * Why this is a shared component and not inline JSX: the block used to
 * live only inside the dynamic /markets/[city] route. The 12 bespoke
 * city pages (app/markets/philadelphia/page.tsx et al) SHADOW that
 * dynamic route — Next resolves the static segment first — so those
 * cities rendered no combo links at all, orphaning 19 of the 26 entries
 * in lib/city-strategy-combos.ts. Those combo pages are the richest
 * hand-authored content in the repo and nothing on the site linked to
 * them. Extracting the block means a new bespoke city page picks up the
 * links by importing one component, and the markup can't drift between
 * the two rendering paths.
 *
 * Renders nothing when a city has no combos, so it's safe to drop into
 * every city page unconditionally.
 */

import Link from "next/link";
import { getCombosForCity } from "@/lib/city-strategy-combos";

export function CityStrategyGuides({
  citySlug,
  cityName,
}: {
  /** Slug as it appears in CITY_STRATEGY_COMBOS (e.g. "kansas-city"). */
  citySlug: string;
  /** Display name for the section heading (e.g. "Kansas City"). */
  cityName: string;
}) {
  // The registry helper filters unreleased specialist models before this
  // navigation block can create an internal crawl path to them.
  const combos = getCombosForCity(citySlug);
  if (combos.length === 0) return null;

  return (
    <section className="mt-12 border-t border-border pt-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
        {cityName} strategy guides
      </p>
      <div className="flex flex-wrap gap-2 text-sm">
        {combos.map((c) => (
          <Link
            key={c.strategy}
            href={`/markets/${c.citySlug}/${c.strategy}`}
            className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
          >
            {c.strategyLabel} in {c.cityName}
          </Link>
        ))}
      </div>
    </section>
  );
}
