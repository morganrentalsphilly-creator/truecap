import { describe, expect, it } from "vitest";

import {
  applyHouseHackOwnerUnitSelection,
  type HouseHackUnit,
} from "@/lib/house-hack-owner-unit";

const units: HouseHackUnit[] = [
  { bedrooms: 2, monthlyRent: 1_500, isOwnerOccupied: false },
  { bedrooms: 2, monthlyRent: 1_650, isOwnerOccupied: false },
];

describe("house-hack owner-unit income state", () => {
  it("forces the selected owner unit to $0 income", () => {
    const selected = applyHouseHackOwnerUnitSelection({
      units,
      unitKeys: ["unit-a", "unit-b"],
      selectedIndex: 0,
      checked: true,
      stashedRents: {},
    });

    expect(selected.units).toEqual([
      { bedrooms: 2, monthlyRent: 0, isOwnerOccupied: true },
      { bedrooms: 2, monthlyRent: 1_650, isOwnerOccupied: false },
    ]);
    expect(selected.stashedRents).toEqual({ "unit-a": 1_500 });
  });

  it("restores the prior rental input when owner occupancy moves", () => {
    const first = applyHouseHackOwnerUnitSelection({
      units,
      unitKeys: ["unit-a", "unit-b"],
      selectedIndex: 0,
      checked: true,
      stashedRents: {},
    });
    const moved = applyHouseHackOwnerUnitSelection({
      units: first.units,
      unitKeys: ["unit-a", "unit-b"],
      selectedIndex: 1,
      checked: true,
      stashedRents: first.stashedRents,
    });

    expect(moved.units).toEqual([
      { bedrooms: 2, monthlyRent: 1_500, isOwnerOccupied: false },
      { bedrooms: 2, monthlyRent: 0, isOwnerOccupied: true },
    ]);
    expect(moved.stashedRents).toEqual({
      "unit-a": 1_500,
      "unit-b": 1_650,
    });
  });

  it("requires a fresh rental rent when an old owner row had no parked input", () => {
    const moved = applyHouseHackOwnerUnitSelection({
      units: [
        { bedrooms: 2, monthlyRent: 0, isOwnerOccupied: true },
        { bedrooms: 2, monthlyRent: 1_650, isOwnerOccupied: false },
      ],
      unitKeys: ["restored-owner", "unit-b"],
      selectedIndex: 1,
      checked: true,
      stashedRents: {},
    });

    expect(moved.units[0]).toMatchObject({
      monthlyRent: undefined,
      isOwnerOccupied: false,
    });
    expect(moved.units[1]).toMatchObject({
      monthlyRent: 0,
      isOwnerOccupied: true,
    });
  });
});
