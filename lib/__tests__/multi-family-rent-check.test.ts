import { describe, expect, it } from "vitest";

import {
  FAR_OFF_PCT,
  RENT_BAND_PCT,
  checkUnitRentsAgainstFmr,
  unitRentHint,
  type UnitRentVerdict,
} from "../multi-family-rent-check";

// Philly-ish figures: 1-bed $1,100, 2-bed $1,300, 3-bed $1,600.
const FMR = { 1: 1100, 2: 1300, 3: 1600 };

describe("checkUnitRentsAgainstFmr", () => {
  it("mirrors the single-family band: <4% off is within, at/beyond it is above/below", () => {
    expect(RENT_BAND_PCT).toBe(4);
    const { verdicts } = checkUnitRentsAgainstFmr(
      [
        { bedrooms: 2, monthlyRent: 1300 }, // exactly FMR → 0%
        { bedrooms: 2, monthlyRent: 1345 }, // +3.46% → rounds to 3 → within
        { bedrooms: 2, monthlyRent: 1352 }, // +4% → above
        { bedrooms: 2, monthlyRent: 1248 }, // -4% → below
      ],
      FMR
    );
    expect(verdicts.map((v) => v.verdict)).toEqual(["within", "within", "above", "below"]);
    expect(verdicts.map((v) => v.diffPct)).toEqual([0, 3, 4, -4]);
  });

  it("flags the duplex-at-$2,400-in-a-$1,300-market case as far off", () => {
    const { verdicts, rollup } = checkUnitRentsAgainstFmr(
      [
        { bedrooms: 2, monthlyRent: 2400 },
        { bedrooms: 2, monthlyRent: 2400 },
      ],
      FMR
    );
    expect(verdicts).toHaveLength(2);
    for (const v of verdicts) {
      expect(v.verdict).toBe("above");
      expect(v.diffPct).toBe(85);
      expect(v.farOff).toBe(true);
    }
    expect(rollup).toBe(
      "2 of 2 units are modeled ≥25% above HUD fair-market rent for their bedroom count — make sure you can actually get those rents, or the deal softens fast."
    );
  });

  it("marks farOff at exactly ±FAR_OFF_PCT", () => {
    expect(FAR_OFF_PCT).toBe(25);
    const { verdicts } = checkUnitRentsAgainstFmr(
      [
        { bedrooms: 2, monthlyRent: 1625 }, // +25%
        { bedrooms: 2, monthlyRent: 975 }, // -25%
        { bedrooms: 2, monthlyRent: 1612 }, // +24%
      ],
      FMR
    );
    expect(verdicts.map((v) => v.farOff)).toEqual([true, true, false]);
  });

  it("looks up each unit's FMR by its own bedroom count", () => {
    const { verdicts } = checkUnitRentsAgainstFmr(
      [
        { bedrooms: 1, monthlyRent: 1100 },
        { bedrooms: 3, monthlyRent: 2000 },
      ],
      FMR
    );
    expect(verdicts[0]).toMatchObject({ unitIndex: 0, bedrooms: 1, fmr: 1100, verdict: "within" });
    expect(verdicts[1]).toMatchObject({ unitIndex: 1, bedrooms: 3, fmr: 1600, verdict: "above", diffPct: 25 });
  });

  it("skips owner-occupied, incomplete, zero-rent, and no-FMR units (never a blocker)", () => {
    const { verdicts } = checkUnitRentsAgainstFmr(
      [
        { bedrooms: 2, monthlyRent: 1300, isOwnerOccupied: true }, // owner unit
        { bedrooms: undefined, monthlyRent: 1300 }, // no beds
        { bedrooms: 2, monthlyRent: undefined }, // no rent
        { bedrooms: 2, monthlyRent: 0 }, // zero rent
        { bedrooms: 2, monthlyRent: NaN }, // RHF empty input
        { bedrooms: 4, monthlyRent: 1800 }, // bedroom count not in the map
        null, // sparse row
        { bedrooms: 2, monthlyRent: 1300 }, // the one usable unit
      ],
      FMR
    );
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]).toMatchObject({ unitIndex: 7, verdict: "within" });
  });

  it("returns empty verdicts and a null rollup with no units or no FMR data", () => {
    expect(checkUnitRentsAgainstFmr([], FMR)).toEqual({ verdicts: [], rollup: null });
    expect(checkUnitRentsAgainstFmr(undefined, FMR)).toEqual({ verdicts: [], rollup: null });
    expect(checkUnitRentsAgainstFmr([{ bedrooms: 2, monthlyRent: 1300 }], null)).toEqual({
      verdicts: [],
      rollup: null,
    });
    expect(checkUnitRentsAgainstFmr([{ bedrooms: 2, monthlyRent: 1300 }], {})).toEqual({
      verdicts: [],
      rollup: null,
    });
  });

  it("rounds fractional bedroom counts to the nearest FMR bucket", () => {
    const { verdicts } = checkUnitRentsAgainstFmr([{ bedrooms: 2.4, monthlyRent: 1300 }], FMR);
    expect(verdicts[0]?.bedrooms).toBe(2);
    expect(verdicts[0]?.fmr).toBe(1300);
  });

  describe("rollup line", () => {
    it("uses singular phrasing for one far-off unit", () => {
      const { rollup } = checkUnitRentsAgainstFmr(
        [
          { bedrooms: 2, monthlyRent: 2400 },
          { bedrooms: 2, monthlyRent: 1300 },
          { bedrooms: 2, monthlyRent: 1300 },
        ],
        FMR
      );
      expect(rollup).toBe(
        "1 of 3 units is modeled ≥25% above HUD fair-market rent for their bedroom count — make sure you can actually get those rents, or the deal softens fast."
      );
    });

    it("softens to a comps nudge when units are above but not far off", () => {
      const { rollup } = checkUnitRentsAgainstFmr(
        [
          { bedrooms: 2, monthlyRent: 1430 }, // +10%
          { bedrooms: 2, monthlyRent: 1300 },
        ],
        FMR
      );
      expect(rollup).toBe(
        "1 of 2 units is modeled above HUD fair-market rent for their bedroom count — confirm against local comps."
      );
    });

    it("mentions upside when units only sit below market", () => {
      const { rollup } = checkUnitRentsAgainstFmr(
        [
          { bedrooms: 2, monthlyRent: 1100 }, // -15%
          { bedrooms: 2, monthlyRent: 1040 }, // -20%
        ],
        FMR
      );
      expect(rollup).toBe(
        "2 of 2 units are modeled below HUD fair-market rent for their bedroom count — you may be leaving upside on the table."
      );
    });

    it("confirms in-line rents, with a single-unit variant", () => {
      expect(
        checkUnitRentsAgainstFmr(
          [
            { bedrooms: 2, monthlyRent: 1300 },
            { bedrooms: 1, monthlyRent: 1100 },
          ],
          FMR
        ).rollup
      ).toBe(
        "All 2 checked units are in line with HUD fair-market rent for their bedroom counts — a good sign the rents are achievable."
      );
      expect(checkUnitRentsAgainstFmr([{ bedrooms: 2, monthlyRent: 1300 }], FMR).rollup).toBe(
        "Your unit's rent is in line with HUD fair-market rent for its bedroom count — a good sign it's achievable."
      );
    });

    it("notes skipped rental units so the rollup never speaks for the whole building", () => {
      // Triplex with only 1 comparable unit: 2 rentals lack rent/beds.
      const r = checkUnitRentsAgainstFmr(
        [
          { bedrooms: 2, monthlyRent: 1300 },
          { bedrooms: 2, monthlyRent: undefined },
          { bedrooms: undefined, monthlyRent: 1200 },
        ],
        FMR
      );
      expect(r.rollup).toContain("(2 units not checked yet)");
      // Owner-occupied units are not rentals — never counted as skipped.
      const hh = checkUnitRentsAgainstFmr(
        [
          { bedrooms: 2, monthlyRent: 1300 },
          { bedrooms: 2, monthlyRent: undefined, isOwnerOccupied: true },
        ],
        FMR
      );
      expect(hh.rollup).not.toContain("not checked");
    });

    it("prioritizes the far-above wording over mild-above and below", () => {
      const { rollup } = checkUnitRentsAgainstFmr(
        [
          { bedrooms: 2, monthlyRent: 2400 }, // far above
          { bedrooms: 2, monthlyRent: 1430 }, // mildly above
          { bedrooms: 2, monthlyRent: 1100 }, // below
        ],
        FMR
      );
      expect(rollup).toContain("1 of 3 units is modeled ≥25% above");
    });
  });
});

describe("unitRentHint", () => {
  const base: UnitRentVerdict = {
    unitIndex: 0,
    bedrooms: 2,
    rent: 2400,
    fmr: 1300,
    diffPct: 85,
    verdict: "above",
    farOff: true,
  };

  it("names the gap in the single-family whisper's voice when far above", () => {
    expect(unitRentHint(base)).toBe(
      "$2,400/mo is 85% above the $1,300 HUD area estimate for a 2-bed — make sure you can actually get it."
    );
  });

  it("mentions upside when far below", () => {
    expect(
      unitRentHint({ ...base, rent: 900, diffPct: -31, verdict: "below" })
    ).toBe("$900/mo is 31% below the $1,300 HUD area estimate for a 2-bed — you may be leaving upside on the table.");
  });

  it("labels 0-bedroom units as studios", () => {
    expect(
      unitRentHint({ ...base, bedrooms: 0, fmr: 1000, rent: 1400, diffPct: 40 })
    ).toContain("HUD area estimate for a studio");
  });

  it("stays quiet unless the unit is far off market", () => {
    expect(unitRentHint({ ...base, diffPct: 10, farOff: false })).toBeNull();
    expect(unitRentHint({ ...base, diffPct: 2, verdict: "within", farOff: false })).toBeNull();
  });
});
