/**
 * Shared contract for the homepage hero → calculator address handoff.
 *
 * The hero (components/marketing/hero-address-form.tsx) dispatches a
 * window CustomEvent AND stashes a sessionStorage fallback; the calculator
 * (components/investcalc/investcalc-page.tsx) listens live and dedupes on
 * `token`. This lives in its own module so neither side has to import the
 * other's component just to share these few strings/types.
 *
 * Both surfaces are on the SAME page, so the live event is the primary
 * channel — the calculator is already mounted when the hero is clicked,
 * which a plain sessionStorage-on-mount handoff would miss. sessionStorage
 * is only a race/refresh fallback.
 */

export const HERO_ANALYZE_EVENT = "truecap:hero-analyze";
export const HERO_ANALYZE_STORAGE_KEY = "truecap_pending_hero_analyze";

export type HeroAnalyzeDetail = {
  /** Idempotency token — the calculator skips a payload it already handled. */
  token: string;
  address: string;
  state?: string;
  county?: string;
  zip?: string;
  /** True for "Try a sample deal" — calculator runs the full sample flow. */
  sample?: boolean;
};
