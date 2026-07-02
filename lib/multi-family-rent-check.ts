/**
 * Multi-family HUD rent reality-check — pure comparison logic.
 *
 * The single-family analyzer already whispers when the entered rent is off
 * the HUD Fair Market Rent benchmark (see DealDriverInsight: <4% = "in
 * line", otherwise above/below with a plain-English nudge). Multi-family
 * rents live per-unit in values.units[], each with its own bedroom count,
 * so the same check needs per-unit verdicts against per-bedroom FMRs plus
 * a one-line rollup for the section.
 *
 * Pure: takes units + a bedrooms→FMR map and classifies. No React, no
 * fetch. Tested in lib/__tests__/multi-family-rent-check.test.ts. This is
 * a NUDGE, never a blocker — callers render nothing when there's no data.
 */

/**
 * "In line" band, in percent — mirrors the single-family whisper
 * (DealDriverInsight treats |diff| < 4% as in line with the HUD estimate).
 */
export const RENT_BAND_PCT = 4;

/**
 * "Far off market" threshold, in percent — drives the per-unit inline
 * hint and the rollup's "≥25% above" phrasing. A duplex modeled at
 * $2,400/unit in a $1,300-FMR market is the case this exists to catch.
 */
export const FAR_OFF_PCT = 25;

/** The slice of the form's unitSchema this check reads. */
export type UnitRentCheckInput = {
  bedrooms?: number | null;
  monthlyRent?: number | null;
  /** House-hack owner unit — generates no rent, so it's never checked. */
  isOwnerOccupied?: boolean;
};

export type UnitRentVerdictStatus = "within" | "above" | "below";

export type UnitRentVerdict = {
  /** Index into the units[] array this verdict belongs to. */
  unitIndex: number;
  bedrooms: number;
  rent: number;
  fmr: number;
  /** Rounded % the rent sits above (+) / below (−) the FMR. */
  diffPct: number;
  verdict: UnitRentVerdictStatus;
  /** |diffPct| >= FAR_OFF_PCT — warrants an inline per-unit hint. */
  farOff: boolean;
};

export type MultiFamilyRentCheck = {
  /** Only units with a usable bedrooms + rent + matching FMR appear. */
  verdicts: UnitRentVerdict[];
  /** One-line summary for the section, or null when nothing was comparable. */
  rollup: string | null;
};

function finitePositive(n: unknown): number | null {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Compare each rental unit's modeled rent to the HUD FMR for its bedroom
 * count. `fmrByBedrooms` is keyed by the unit's (rounded) bedroom count —
 * the fetch side is responsible for populating whatever counts it looked
 * up; units whose count has no entry are silently skipped (never a blocker).
 */
export function checkUnitRentsAgainstFmr(
  units: ReadonlyArray<UnitRentCheckInput | undefined | null> | null | undefined,
  fmrByBedrooms: Record<number, number> | null | undefined
): MultiFamilyRentCheck {
  const verdicts: UnitRentVerdict[] = [];
  if (!units || !fmrByBedrooms) return { verdicts, rollup: null };

  units.forEach((unit, unitIndex) => {
    if (!unit || unit.isOwnerOccupied) return;
    const bedsRaw = typeof unit.bedrooms === "number" ? unit.bedrooms : Number(unit.bedrooms);
    if (!Number.isFinite(bedsRaw) || bedsRaw < 0) return;
    const bedrooms = Math.round(bedsRaw);
    const rent = finitePositive(unit.monthlyRent);
    if (rent == null) return;
    const fmr = finitePositive(fmrByBedrooms[bedrooms]);
    if (fmr == null) return;

    const diffPct = Math.round(((rent - fmr) / fmr) * 100);
    // Mirror the single-family whisper's band exactly: |diff| < 4% is
    // "in line"; at or beyond it, the direction gets named.
    const verdict: UnitRentVerdictStatus =
      Math.abs(diffPct) < RENT_BAND_PCT ? "within" : diffPct > 0 ? "above" : "below";
    verdicts.push({
      unitIndex,
      bedrooms,
      rent,
      fmr,
      diffPct,
      verdict,
      farOff: Math.abs(diffPct) >= FAR_OFF_PCT,
    });
  });

  // Truthful denominator: count the RENTAL units the check skipped (no
  // beds/rent entered yet, or no FMR for that bedroom count) so the rollup
  // never implies the whole building was checked when it wasn't.
  const rentalUnits = units.filter((u) => u && !u.isOwnerOccupied).length;
  return { verdicts, rollup: buildRollup(verdicts, rentalUnits - verdicts.length) };
}

/** "2 of 3 units are…" / "1 of 3 units is…" subject fragment. */
function countPhrase(count: number, total: number): string {
  return `${count} of ${total} units ${count === 1 ? "is" : "are"}`;
}

function buildRollup(verdicts: UnitRentVerdict[], skipped = 0): string | null {
  const total = verdicts.length;
  if (total === 0) return null;

  // Scope note when some rental units couldn't be checked — "all in line"
  // must never speak for a unit the check silently skipped.
  const scopeNote =
    skipped > 0 ? ` (${skipped} ${skipped === 1 ? "unit" : "units"} not checked yet)` : "";

  const farAbove = verdicts.filter((v) => v.verdict === "above" && v.farOff).length;
  const above = verdicts.filter((v) => v.verdict === "above").length;
  const below = verdicts.filter((v) => v.verdict === "below").length;

  if (farAbove > 0) {
    return `${countPhrase(farAbove, total)} modeled ≥${FAR_OFF_PCT}% above HUD fair-market rent for their bedroom count — make sure you can actually get those rents, or the deal softens fast.${scopeNote}`;
  }
  if (above > 0) {
    return `${countPhrase(above, total)} modeled above HUD fair-market rent for their bedroom count — confirm against local comps.${scopeNote}`;
  }
  if (below > 0) {
    return `${countPhrase(below, total)} modeled below HUD fair-market rent for their bedroom count — you may be leaving upside on the table.${scopeNote}`;
  }
  return total === 1
    ? `Your unit's rent is in line with HUD fair-market rent for its bedroom count — a good sign it's achievable.${scopeNote}`
    : `All ${total} checked units are in line with HUD fair-market rent for their bedroom counts — a good sign the rents are achievable.${scopeNote}`;
}

/**
 * Per-unit inline hint, mirroring the single-family whisper's voice.
 * Returns null unless the unit is far off market (≥ FAR_OFF_PCT) — the
 * mild cases are covered by the rollup line, so the inline hint stays
 * reserved for the rents that genuinely change the verdict.
 */
export function unitRentHint(v: UnitRentVerdict): string | null {
  if (!v.farOff || v.verdict === "within") return null;
  const rent = `$${Math.round(v.rent).toLocaleString()}`;
  const fmr = `$${Math.round(v.fmr).toLocaleString()}`;
  const beds = v.bedrooms === 0 ? "a studio" : `a ${v.bedrooms}-bed`;
  if (v.verdict === "above") {
    return `${rent}/mo is ${v.diffPct}% above the ${fmr} HUD area estimate for ${beds} — make sure you can actually get it.`;
  }
  return `${rent}/mo is ${Math.abs(v.diffPct)}% below the ${fmr} HUD area estimate for ${beds} — you may be leaving upside on the table.`;
}
