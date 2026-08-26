import type { InvestmentFormValues } from "@/lib/investcalc-schema";

export type HouseHackUnit = NonNullable<InvestmentFormValues["units"]>[number];

/** null records that the unit had no rent before it became the owner unit. */
export type HouseHackOwnerRentStash = Record<string, number | null>;

interface ApplyHouseHackOwnerUnitSelectionInput {
  units: HouseHackUnit[];
  unitKeys: string[];
  selectedIndex: number;
  checked: boolean;
  stashedRents: HouseHackOwnerRentStash;
}

/**
 * Keep the house-hack editor aligned with the calculation contract: the one
 * owner-occupied unit always contributes $0 rental income. A prior rental
 * value is parked by the field-array's stable key so moving or unchecking the
 * owner selection can restore that user's input without counting it while the
 * unit is owner occupied.
 */
export function applyHouseHackOwnerUnitSelection({
  units,
  unitKeys,
  selectedIndex,
  checked,
  stashedRents,
}: ApplyHouseHackOwnerUnitSelectionInput): {
  units: HouseHackUnit[];
  stashedRents: HouseHackOwnerRentStash;
} {
  if (selectedIndex < 0 || selectedIndex >= units.length) {
    return { units, stashedRents };
  }

  const nextStashedRents = { ...stashedRents };
  const keyForIndex = (index: number) => unitKeys[index] ?? `index-${index}`;
  const selected = units[selectedIndex];

  if (checked && !selected?.isOwnerOccupied) {
    const previousRent = selected?.monthlyRent;
    nextStashedRents[keyForIndex(selectedIndex)] =
      typeof previousRent === "number" && Number.isFinite(previousRent)
        ? previousRent
        : null;
  }

  const nextUnits = units.map((unit, index) => {
    const unitKey = keyForIndex(index);

    if (index === selectedIndex) {
      if (checked) {
        return { ...unit, isOwnerOccupied: true, monthlyRent: 0 };
      }

      const restoredRent = Object.prototype.hasOwnProperty.call(
        nextStashedRents,
        unitKey,
      )
        ? (nextStashedRents[unitKey] ?? undefined)
        : unit.monthlyRent === 0
          ? undefined
          : unit.monthlyRent;
      return {
        ...unit,
        isOwnerOccupied: false,
        monthlyRent: restoredRent,
      };
    }

    if (checked && unit.isOwnerOccupied) {
      const restoredRent = Object.prototype.hasOwnProperty.call(
        nextStashedRents,
        unitKey,
      )
        ? (nextStashedRents[unitKey] ?? undefined)
        : unit.monthlyRent === 0
          ? undefined
          : unit.monthlyRent;
      return {
        ...unit,
        isOwnerOccupied: false,
        monthlyRent: restoredRent,
      };
    }

    return unit;
  });

  return { units: nextUnits, stashedRents: nextStashedRents };
}
