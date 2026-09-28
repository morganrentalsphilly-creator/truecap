/**
 * Market-page cross-links (F9): the state guide a city page links to and the
 * up-to-five nearby markets it lists. Both render paths (app/markets/[city]
 * and the bespoke wrappers around components/marketing/safe-market-page.tsx)
 * read these, so they cannot drift.
 *
 * There are no coordinates in the repo, so "nearby" is built from what the
 * datasets do say, in this order:
 *   1. same state first: markets in the city's state that share its county
 *      (lib/markets/city-geo.ts) or its HUD FMR area
 *      (lib/markets/hud-fmr-areas.ts), then the state's other markets in
 *      alphabetical order after this one, wrapping around, so each market in
 *      a state is listed by the markets just before it and link equity
 *      spreads across the state instead of pooling on its first few names;
 *   2. then the county bridge across a state line: markets in another state
 *      whose HUD FMR area (the metro HUD resolved through the county bridge)
 *      is this city's, e.g. Portland, OR and Vancouver, WA. A county NAME
 *      shared across states (Hamilton, OH and Hamilton, TN) is not a bridge.
 * Every candidate passes lib/seo/link-policy.ts: no noindexed or unindexable
 * market, and the state guide only when that state page is indexable.
 *
 * Pure: reads checked-in registries only.
 */

import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import { CITY_GEO } from "@/lib/markets/city-geo";
import { HUD_FMR_AREAS } from "@/lib/markets/hud-fmr-areas";
import { isLinkablePath } from "@/lib/seo/link-policy";
import { isNoindexPath } from "@/lib/seo/noindex";
import { STATES } from "@/lib/states";

export const NEARBY_MARKET_LIMIT = 5;

export type MarketLink = { slug: string; name: string; stateCode: string; stateName: string };

type Listed = (path: string) => boolean;

/** Every market page (bespoke first, as the /markets hub lists them), one row per slug. */
function allMarkets(): MarketLink[] {
  const seen = new Set<string>();
  const out: MarketLink[] = [];
  for (const m of [...BESPOKE_MARKETS, ...MARKET_CITIES]) {
    if (seen.has(m.slug)) continue;
    seen.add(m.slug);
    out.push({ slug: m.slug, name: m.name, stateCode: m.stateCode, stateName: m.stateName });
  }
  return out;
}

const countyOf = (slug: string): string | null => CITY_GEO[slug]?.county ?? null;
const hudAreaOf = (slug: string): string | null =>
  Object.prototype.hasOwnProperty.call(HUD_FMR_AREAS, slug) ? HUD_FMR_AREAS[slug].areaName : null;

const byName = (a: MarketLink, b: MarketLink) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug);

/** The /states slug a city page links to, or null when its state has no indexable guide. */
export function stateGuideSlugFor(stateName: string, isListed: Listed = isNoindexPath): string | null {
  const state = Object.values(STATES).find((candidate) => candidate.name === stateName);
  if (!state) return null;
  return isLinkablePath(`/states/${state.slug}`, isListed) ? state.slug : null;
}

/** Up to `limit` markets to list on `slug`'s page (see the header for the order). */
export function nearbyMarkets(
  slug: string,
  { limit = NEARBY_MARKET_LIMIT, isListed = isNoindexPath }: { limit?: number; isListed?: Listed } = {},
): MarketLink[] {
  const markets = allMarkets();
  const self = markets.find((m) => m.slug === slug);
  if (!self) return [];
  const linkable = (m: MarketLink) => m.slug !== slug && isLinkablePath(`/markets/${m.slug}`, isListed);
  const county = countyOf(slug);
  const area = hudAreaOf(slug);
  const sharesGeo = (m: MarketLink) =>
    (county !== null && countyOf(m.slug) === county) || (area !== null && hudAreaOf(m.slug) === area);

  const state = markets.filter((m) => m.stateName === self.stateName && (m.slug === slug || linkable(m))).sort(byName);
  const at = state.findIndex((m) => m.slug === slug);
  const after = [...state.slice(at + 1), ...state.slice(0, at)];
  const close = after.filter(sharesGeo);
  const bridge = markets
    .filter((m) => m.stateName !== self.stateName && area !== null && hudAreaOf(m.slug) === area && linkable(m))
    .sort(byName);

  const out: MarketLink[] = [];
  for (const m of [...close, ...after, ...bridge]) {
    if (out.length >= limit) break;
    if (!out.some((picked) => picked.slug === m.slug)) out.push(m);
  }
  return out;
}
