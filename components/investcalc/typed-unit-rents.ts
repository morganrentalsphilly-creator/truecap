import type { UnitRentCheckInput } from "@/lib/multi-family-rent-check";

/**
 * Leave units whose rent IS the HUD figure out of the HUD rent check.
 *
 * On a multi-family address the analyzer fills each empty unit rent with the
 * HUD Fair Market Rent for its bedroom count. The reality-check below the
 * units then compared that figure with itself and reported the rents as "in
 * line with HUD fair-market rent ... a good sign the rents are achievable":
 * a second opinion that could only ever agree, on a number the fill's own
 * notice tells the visitor to replace.
 *
 * A rent equal to the HUD figure for the unit's bedroom count carries no
 * information against that benchmark, whether the fill wrote it or the
 * visitor happened to type it, so it is blanked for the check (the array
 * keeps its length, so unit indexes still line up). The check then counts
 * the unit as "not checked yet", and says nothing at all when every unit is
 * still on the HUD figure. Form values are never changed.
 */
export function withoutHudFilledRents<T extends UnitRentCheckInput>(
  units: ReadonlyArray<T | undefined | null>,
  fmrByBedrooms: Record<number, number> | null | undefined,
): Array<T | undefined | null> {
  if (!fmrByBedrooms) return [...units];
  return units.map((unit) => {
    if (!unit) return unit;
    const beds = Math.round(Number(unit.bedrooms));
    const rent = Number(unit.monthlyRent);
    const fmr = Number(fmrByBedrooms[beds]);
    if (!Number.isFinite(rent) || !Number.isFinite(fmr) || fmr <= 0) {
      return unit;
    }
    return Math.round(rent) === Math.round(fmr)
      ? { ...unit, monthlyRent: undefined }
      : unit;
  });
}
