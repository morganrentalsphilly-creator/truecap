/**
 * The result's price track domain: where asking and the Offer Ceiling sit on
 * the line. Shared by the live what-if track (components/investcalc/
 * result-price-scrubber.tsx) and the sample's server-rendered card
 * (components/investcalc/sample-decision-prerender.tsx), so the two draw the
 * same line and the swap between them moves nothing (audit A2).
 */
export function priceTrackDomain(asking: number, ceiling: number) {
  const lo = Math.min(asking, ceiling);
  const hi = Math.max(asking, ceiling);
  const margin = Math.max(5_000, Math.round((hi - lo) * 0.25));
  const low = Math.max(1_000, Math.floor((lo - margin) / 1_000) * 1_000);
  const high = Math.ceil((hi + margin) / 1_000) * 1_000;
  const pct = (p: number) => ((p - low) / (high - low)) * 100;
  return { low, high, pct };
}

/**
 * Whether each dimension label can sit on its own tick (DESIGN.md "Price
 * track"). Fifty percentage points apart, two compact six-figure labels
 * clear each other on the narrowest phone track (238px at a 320px screen,
 * where their centres need 112px); with the domain's margins that is a gap
 * of about $10,000 or more. Closer than that, the labels keep to the two ends
 * of the row. (Forty points was sized for a 316px track: a $7,500 gap set
 * the two labels over each other at 320px.)
 */
export function trackLabelsAnchored(askingPct: number, ceilingPct: number): boolean {
  return Math.abs(askingPct - ceilingPct) >= 50;
}

/**
 * The `left` of a label centred on its tick and held inside the track. Geist
 * Mono is fixed width, so half the label's character count in `ch` is half
 * its width; the label itself must be set in the mono face (`tc-meta`) for
 * `ch` to measure it.
 */
export function trackLabelLeft(pct: number, chars: number): string {
  return `clamp(${chars / 2}ch, ${pct}%, calc(100% - ${chars / 2}ch))`;
}

/**
 * Whether two anchored labels clear each other on the narrowest phone: a
 * 320px screen leaves the card's track 238px, 33 characters of 12px Geist
 * Mono. Two six-figure prices take 31; a seven-figure pair takes 35, and
 * below 360px that pair goes back to the two ends of the row
 * (PRICE_TRACK_LABEL_CLASS.narrowRow).
 */
export function trackLabelsFitNarrow(ceilingChars: number, askingChars: number): boolean {
  return ceilingChars + askingChars <= 32;
}

/**
 * The label classes both renderers of the track use, so the server-rendered
 * sample and the live card cannot drift apart.
 */
export const PRICE_TRACK_LABEL_CLASS = {
  /** Not anchored: the two labels at the ends of one row, the gap between. */
  edgeRow: "flex items-baseline justify-between gap-3 font-mono text-xs",
  /** Anchored: a 16px row, each label centred on its own tick. */
  anchoredRow: "relative h-4 tc-meta",
  anchoredLabel: "absolute top-0 -translate-x-1/2 whitespace-nowrap",
  /** A pair too long for a 320px track: below 360px, the ends of the row. */
  narrowRow:
    "max-[360px]:flex max-[360px]:h-auto max-[360px]:items-baseline max-[360px]:justify-between max-[360px]:gap-3",
  narrowLabel: "max-[360px]:static max-[360px]:translate-x-0 max-[360px]:whitespace-normal",
  /**
   * The gap as the measure of the dashed segment, on its own line under the
   * track from 640px (a phone states it beside the "Offer Ceiling" label).
   * `UntilLg`: the card states the gap beside the ceiling from 1024px, so
   * the track stops repeating it there. The root's padding is the line the
   * what-if help text takes when the handle moves (its 8px margin and 20px
   * row), so the card is the same height in both states. The label sits
   * inside the slider's 44px pointer band, so it takes no pointer itself.
   */
  gap: "pointer-events-none absolute top-10 hidden -translate-x-1/2 whitespace-nowrap tc-meta text-highlight-text sm:block",
  gapUntilLg:
    "pointer-events-none absolute top-10 hidden -translate-x-1/2 whitespace-nowrap tc-meta text-highlight-text sm:max-lg:block",
  gapRoom: "sm:pb-7",
  gapRoomUntilLg: "sm:max-lg:pb-7",
  /** The not-anchored row's middle gap label, from 640px. */
  edgeGap: "hidden text-muted-foreground sm:inline",
  edgeGapUntilLg: "hidden text-muted-foreground sm:max-lg:inline",
} as const;
