import { describe, expect, it } from "vitest";

import {
  STRATEGY_REVERTABLE_FIELDS,
  alignUnitsToPropertyType,
  planPropertyTypeSwitch,
  planStrategyRevert,
  planStrategySnapshot,
  type PropertyTypeStash,
  type SingleFamilyFacts,
} from "../investcalc-form-preservation";
import type { UnitValues } from "../investcalc-schema";

const NO_SF: SingleFamilyFacts = {};

/** A keyed rent roll the way a user would key one. */
const rentRoll: UnitValues[] = [
  { bedrooms: 2, bathrooms: 1, sqft: 800, monthlyRent: 1400, isOwnerOccupied: false },
  { bedrooms: 2, bathrooms: 1, sqft: 800, monthlyRent: 1350, isOwnerOccupied: false },
  { bedrooms: 3, bathrooms: 2, sqft: 1100, monthlyRent: 1500, isOwnerOccupied: false },
];

describe("planPropertyTypeSwitch — multi-unit ↔ multi-unit", () => {
  it("keeps every unit's rent, beds, baths, sq ft AND the unit count across a Multi-Family → Owner Occupant → Multi-Family round trip", () => {
    const toOwner = planPropertyTypeSwitch({
      prevType: "multi-family",
      nextType: "owner-occupant",
      units: rentRoll,
      singleFamily: NO_SF,
      stash: {},
    });
    expect(toOwner.units).toHaveLength(3);
    expect(toOwner.units.map((u) => u.monthlyRent)).toEqual([1400, 1350, 1500]);
    // Exactly one owner unit, and it's the first — nothing else changed.
    expect(toOwner.units.map((u) => u.isOwnerOccupied)).toEqual([true, false, false]);

    const backToMulti = planPropertyTypeSwitch({
      prevType: "owner-occupant",
      nextType: "multi-family",
      units: toOwner.units,
      singleFamily: NO_SF,
      stash: toOwner.stash,
    });
    expect(backToMulti.units).toEqual(rentRoll);
  });

  it("keeps the user's owner-unit pick instead of forcing unit 1", () => {
    const picked = rentRoll.map((u, i) => ({ ...u, isOwnerOccupied: i === 1 }));
    const plan = planPropertyTypeSwitch({
      prevType: "multi-family",
      nextType: "owner-occupant",
      units: picked,
      singleFamily: NO_SF,
      stash: {},
    });
    expect(plan.units.map((u) => u.isOwnerOccupied)).toEqual([false, true, false]);
  });

  it("fills only the empty slots from the incoming type's defaults, so a house hack still opens seeded", () => {
    const plan = planPropertyTypeSwitch({
      prevType: "multi-family",
      nextType: "owner-occupant",
      // One half-typed unit: the user got as far as the rent.
      units: [{ bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: 1400, isOwnerOccupied: false }],
      singleFamily: NO_SF,
      stash: {},
    });
    // Grown to the owner-occupant shape (owner unit + rental unit)…
    expect(plan.units).toHaveLength(2);
    // …the typed rent survives, the untyped facts take the seeds.
    expect(plan.units[0]).toMatchObject({ bedrooms: 2, bathrooms: 1, sqft: 900, monthlyRent: 1400 });
    expect(plan.units[1]).toMatchObject({ monthlyRent: undefined, isOwnerOccupied: false });
  });

  it("releases the owner unit's seeded rent of 0 when it becomes a rental again", () => {
    const plan = planPropertyTypeSwitch({
      prevType: "owner-occupant",
      nextType: "multi-family",
      units: [
        { bedrooms: 2, bathrooms: 1, sqft: 900, monthlyRent: 0, isOwnerOccupied: true },
        { bedrooms: 2, bathrooms: 1, sqft: 900, monthlyRent: 1250, isOwnerOccupied: false },
      ],
      singleFamily: NO_SF,
      stash: {},
    });
    // 0 meant "I live here", not a rent — leaving it would fail
    // "Rent must be greater than 0" on a row the user never typed.
    expect(plan.units[0]).toMatchObject({ monthlyRent: undefined, bedrooms: 2, sqft: 900 });
    expect(plan.units[1].monthlyRent).toBe(1250);
    expect(plan.units.every((u) => !u.isOwnerOccupied)).toBe(true);
  });
});

describe("planPropertyTypeSwitch — single-family ↔ multi-unit", () => {
  const sfFacts: SingleFamilyFacts = { bedrooms: 3, bathrooms: 2, sqft: 1500, monthlyRent: 1750 };

  it("carries the single monthly rent onto the unit the user will actually rent out", () => {
    const houseHack = planPropertyTypeSwitch({
      prevType: "single-family",
      nextType: "owner-occupant",
      units: [{ bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: false }],
      singleFamily: sfFacts,
      stash: {},
    });
    // Unit 1 is the one they live in; the rent belongs to unit 2.
    expect(houseHack.units[0]).toMatchObject({ isOwnerOccupied: true, monthlyRent: 0 });
    expect(houseHack.units[1]).toMatchObject({ isOwnerOccupied: false, monthlyRent: 1750 });

    const multi = planPropertyTypeSwitch({
      prevType: "single-family",
      nextType: "multi-family",
      units: [{ bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: false }],
      singleFamily: sfFacts,
      stash: {},
    });
    expect(multi.units[0].monthlyRent).toBe(1750);
    // Beds/baths/sq ft describe the WHOLE house, not unit 1 — projecting
    // them onto a unit row would invent a fact (and skew the per-bedroom
    // HUD rent check). They're parked for the return trip instead.
    expect(multi.units[0]).toMatchObject({ bedrooms: undefined, bathrooms: undefined, sqft: undefined });
    expect(multi.stash["single-family"]?.singleFamily).toEqual(sfFacts);
  });

  it("blanks the single-family scalars on the way out (stale-NaN guard) but parks them for the return trip", () => {
    const out = planPropertyTypeSwitch({
      prevType: "single-family",
      nextType: "owner-occupant",
      units: [],
      singleFamily: sfFacts,
      stash: {},
    });
    expect(out.singleFamily).toEqual({});
    expect(out.stash["single-family"]?.singleFamily).toEqual(sfFacts);

    const back = planPropertyTypeSwitch({
      prevType: "owner-occupant",
      nextType: "single-family",
      units: out.units,
      singleFamily: {},
      stash: out.stash,
    });
    expect(back.singleFamily).toEqual(sfFacts);
    // Single-family reads the scalars, not the roll — its placeholder row
    // stays empty while the parked roll waits in the stash.
    expect(back.units).toHaveLength(1);
    expect(back.units[0].monthlyRent).toBeUndefined();
    expect(back.stash["owner-occupant"]?.units).toEqual(out.units);
  });

  it("never lets the single-family rent overwrite a restored unit's own rent", () => {
    const parked = planPropertyTypeSwitch({
      prevType: "multi-family",
      nextType: "single-family",
      units: rentRoll,
      singleFamily: {},
      stash: {},
    });
    const backToMulti = planPropertyTypeSwitch({
      prevType: "single-family",
      nextType: "multi-family",
      units: parked.units,
      singleFamily: { monthlyRent: 9999 },
      stash: parked.stash,
    });
    // Unit 1's own $1,400 stands — the scalar only fills an empty slot.
    expect(backToMulti.units.map((u) => u.monthlyRent)).toEqual([1400, 1350, 1500]);
  });

  it("restores the parked rent roll when the user returns via single-family", () => {
    const toSingle = planPropertyTypeSwitch({
      prevType: "multi-family",
      nextType: "single-family",
      units: rentRoll,
      singleFamily: {},
      stash: {},
    });
    // The first rental unit's rent is the closest thing to one monthly rent.
    expect(toSingle.singleFamily.monthlyRent).toBe(1400);

    const backToMulti = planPropertyTypeSwitch({
      prevType: "single-family",
      nextType: "multi-family",
      units: toSingle.units,
      singleFamily: toSingle.singleFamily,
      stash: toSingle.stash,
    });
    expect(backToMulti.units).toEqual(rentRoll);
  });

  it("prefers the live roll over a stale stashed one when both are multi-unit", () => {
    const stash: PropertyTypeStash = {
      "owner-occupant": {
        units: [
          { bedrooms: 1, bathrooms: 1, sqft: 500, monthlyRent: 0, isOwnerOccupied: true },
          { bedrooms: 1, bathrooms: 1, sqft: 500, monthlyRent: 999, isOwnerOccupied: false },
        ],
        singleFamily: {},
      },
    };
    const plan = planPropertyTypeSwitch({
      prevType: "multi-family",
      nextType: "owner-occupant",
      units: rentRoll,
      singleFamily: NO_SF,
      stash,
    });
    // Same rent roll under a different label: every edit made since carries.
    expect(plan.units.map((u) => u.monthlyRent)).toEqual([1400, 1350, 1500]);
  });

  it("never returns a plan that drops data the outgoing type held", () => {
    const plan = planPropertyTypeSwitch({
      prevType: "multi-family",
      nextType: "single-family",
      units: rentRoll,
      singleFamily: {},
      stash: {},
    });
    expect(plan.stash["multi-family"]?.units).toEqual(rentRoll);
    // Parked by value — a later edit to the live array can't mutate it.
    expect(plan.stash["multi-family"]?.units).not.toBe(rentRoll);
  });
});

describe("alignUnitsToPropertyType", () => {
  it("leaves at most one owner unit for a house hack and none for a rental", () => {
    const twoOwners: UnitValues[] = [
      { bedrooms: 1, bathrooms: 1, sqft: 500, monthlyRent: 900, isOwnerOccupied: true },
      { bedrooms: 1, bathrooms: 1, sqft: 500, monthlyRent: 950, isOwnerOccupied: true },
    ];
    expect(alignUnitsToPropertyType(twoOwners, "owner-occupant").map((u) => u.isOwnerOccupied)).toEqual([
      true,
      false,
    ]);
    expect(alignUnitsToPropertyType(twoOwners, "multi-family").map((u) => u.isOwnerOccupied)).toEqual([
      false,
      false,
    ]);
    // A rent the user typed on the owner unit is data, not a seed — it stays.
    expect(alignUnitsToPropertyType(twoOwners, "multi-family").map((u) => u.monthlyRent)).toEqual([900, 950]);
  });
});

describe("planStrategyRevert", () => {
  const snapshot = {
    before: { propertyType: "single-family", interestRate: 6.66, downPaymentPct: 20, propertyTaxPct: 1.49 },
    after: { propertyType: "owner-occupant", interestRate: 6.5, downPaymentPct: 5, propertyTaxPct: 1.5 },
  };

  it("puts back every field the play wrote and the user left alone", () => {
    expect(planStrategyRevert(snapshot, { ...snapshot.after })).toEqual([
      { field: "propertyType", value: "single-family" },
      { field: "interestRate", value: 6.66 },
      { field: "downPaymentPct", value: 20 },
      { field: "propertyTaxPct", value: 1.49 },
    ]);
  });

  it("leaves a field the user edited since — that number is theirs now", () => {
    const plan = planStrategyRevert(snapshot, { ...snapshot.after, downPaymentPct: 12 });
    expect(plan.map((entry) => entry.field)).toEqual(["propertyType", "interestRate", "propertyTaxPct"]);
  });

  it("treats an input's string value as the number it shows", () => {
    const plan = planStrategyRevert(snapshot, { ...snapshot.after, interestRate: "6.5" });
    expect(plan).toContainEqual({ field: "interestRate", value: 6.66 });
  });

  it("skips fields the play never actually changed, and no-ops without a snapshot", () => {
    const unchanged = {
      before: { vacancyPct: 5, mgmtPct: 8 },
      after: { vacancyPct: 5, mgmtPct: 4 },
    };
    expect(planStrategyRevert(unchanged, { vacancyPct: 5, mgmtPct: 4 })).toEqual([
      { field: "mgmtPct", value: 8 },
    ]);
    expect(planStrategyRevert(null, { vacancyPct: 5 })).toEqual([]);
  });

  it("covers the property type and template link, not just the assumption numbers", () => {
    expect(STRATEGY_REVERTABLE_FIELDS).toContain("propertyType");
    expect(STRATEGY_REVERTABLE_FIELDS).toContain("templateId");
    // The STR income fields stay out: Clear wipes them unconditionally so a
    // derived ADR×occupancy income can't leak into the monthly-rent flow.
    expect(STRATEGY_REVERTABLE_FIELDS).not.toContain("avgDailyRate");
    expect(STRATEGY_REVERTABLE_FIELDS).not.toContain("occupancyPct");
  });
});

/**
 * A faithful stand-in for handleSelectStrategy's write sequence
 * (components/investcalc/investcalc-page.tsx): snapshot the revertable
 * fields BEFORE any write, apply the play (property type → starter
 * assumptions → template unlink → STR income swap) while recording exactly
 * which fields were written, then roll the revert bookkeeping forward.
 * "Clear" replays planStrategyRevert against the live form the same way.
 */
type FormBag = Record<string, unknown>;

type Play = {
  propertyType: string;
  /** What applyStarterAssumptions writes for this play. */
  starter: FormBag;
  incomeMode?: "str" | "monthly";
};

function makeLens(initial: FormBag) {
  const form: FormBag = { ...initial };
  let snapshot: ReturnType<typeof planStrategySnapshot> | null = null;
  const pick = (): FormBag => {
    const out: FormBag = {};
    for (const field of STRATEGY_REVERTABLE_FIELDS) out[field] = form[field];
    return out;
  };
  return {
    form,
    /** The user keying a value into a field. */
    type(field: string, value: unknown) {
      form[field] = value;
    },
    /** A "What's your play?" chip click. */
    play(play: Play) {
      const preWrite = pick();
      const written = new Set<string>();
      if (form.propertyType !== play.propertyType) {
        form.propertyType = play.propertyType;
        written.add("propertyType");
      }
      for (const [field, value] of Object.entries(play.starter)) {
        form[field] = value;
        written.add(field);
      }
      if (form.templateId) {
        form.templateId = undefined;
        written.add("templateId");
      }
      if (play.incomeMode === "str") {
        form.monthlyRent = undefined;
        written.add("monthlyRent");
      }
      snapshot = planStrategySnapshot({ previous: snapshot, preWrite, postWrite: pick(), written });
    },
    /** The "Clear" button next to "Analyzing as: <play>". */
    clear() {
      for (const { field, value } of planStrategyRevert(snapshot, pick())) {
        form[field as string] = value;
      }
      snapshot = null;
    },
  };
}

const BUY_HOLD: Play = {
  propertyType: "single-family",
  starter: { interestRate: 6.5, downPaymentPct: 20, vacancyPct: 5, propertyTaxPct: 1.2 },
};
const BRRRR: Play = {
  propertyType: "single-family",
  starter: { interestRate: 7.5, downPaymentPct: 25, vacancyPct: 6, propertyTaxPct: 1.2 },
};
const SHORT_TERM: Play = {
  propertyType: "single-family",
  incomeMode: "str",
  starter: { interestRate: 7, downPaymentPct: 20, vacancyPct: 10, propertyTaxPct: 1.2 },
};

describe("strategy lens — a play the user typed between chips", () => {
  it("keeps a value typed BETWEEN two plays when the second play never writes it", () => {
    // The exact live repro: rent 1750 → Buy & Hold → user types 2000 →
    // BRRRR (its starter never touches monthlyRent) → Clear.
    const lens = makeLens({ propertyType: "single-family", monthlyRent: 1750, interestRate: 6.9 });
    lens.play(BUY_HOLD);
    lens.type("monthlyRent", 2000);
    lens.play(BRRRR);
    lens.clear();
    // The $2,000 is the user's, not the play's. Clear must not take it.
    expect(lens.form.monthlyRent).toBe(2000);
    // …and Clear still means clear for what the plays DID write.
    expect(lens.form.interestRate).toBe(6.9);
  });

  it("still restores across a chain of plays for the fields the user left alone", () => {
    const lens = makeLens({
      propertyType: "single-family",
      monthlyRent: 1750,
      interestRate: 6.66,
      downPaymentPct: 20,
      propertyTaxPct: 1.49,
      vacancyPct: 4,
    });
    lens.play(BUY_HOLD);
    lens.play(BRRRR);
    lens.clear();
    // One lens entry, one undo point: back to the pre-lens form, not to
    // whatever the first play happened to leave.
    expect(lens.form).toMatchObject({
      interestRate: 6.66,
      downPaymentPct: 20,
      propertyTaxPct: 1.49,
      vacancyPct: 4,
      monthlyRent: 1750,
    });
  });

  it("hands back the USER's value — not the pre-lens one — when the second play overwrites their edit", () => {
    const lens = makeLens({ propertyType: "single-family", interestRate: 6.66 });
    lens.play(BUY_HOLD); // → 6.5
    lens.type("interestRate", 7.25); // the user's own rate
    lens.play(BRRRR); // → 7.5, stomping it
    lens.clear();
    expect(lens.form.interestRate).toBe(7.25);
  });

  it("leaves the field alone forever once it is the user's, across a third play", () => {
    const lens = makeLens({ propertyType: "single-family", monthlyRent: 1750 });
    lens.play(BUY_HOLD);
    lens.type("monthlyRent", 2000);
    lens.play(BRRRR);
    lens.play(BUY_HOLD);
    lens.clear();
    expect(lens.form.monthlyRent).toBe(2000);
  });

  it("restores a rent an STR play dropped, even when it is the second chip", () => {
    const lens = makeLens({ propertyType: "single-family", monthlyRent: 1750 });
    lens.play(BUY_HOLD);
    lens.play(SHORT_TERM); // swaps to ADR × occupancy, clearing monthlyRent
    expect(lens.form.monthlyRent).toBeUndefined();
    lens.clear();
    expect(lens.form.monthlyRent).toBe(1750);
  });

  it("does not resurrect a rent the user replaced before the STR chip dropped it", () => {
    const lens = makeLens({ propertyType: "single-family", monthlyRent: 1750 });
    lens.play(BUY_HOLD);
    lens.type("monthlyRent", 2000);
    lens.play(SHORT_TERM);
    lens.clear();
    // The STR play wrote it, so Clear owes an undo — of THEIR number.
    expect(lens.form.monthlyRent).toBe(2000);
  });

  it("keeps the single-play undo intact (rent survives, the play's rate reverts)", () => {
    // The behavior the second-chip fix must not regress.
    const lens = makeLens({ propertyType: "single-family", monthlyRent: 2000, interestRate: 7.25 });
    lens.play(BUY_HOLD);
    expect(lens.form.interestRate).toBe(6.5);
    lens.clear();
    expect(lens.form.monthlyRent).toBe(2000);
    expect(lens.form.interestRate).toBe(7.25);
  });

  it("leaves a property type the user re-picked between plays untouched by Clear", () => {
    const lens = makeLens({ propertyType: "multi-family" });
    lens.play({ ...BUY_HOLD, propertyType: "owner-occupant" });
    lens.type("propertyType", "single-family"); // the user's own pick, via the radios
    lens.play(BRRRR); // also single-family → nothing to write
    lens.clear();
    expect(lens.form.propertyType).toBe("single-family");
  });
});

describe("planStrategySnapshot", () => {
  it("captures a straight before/after on the first play", () => {
    const snap = planStrategySnapshot({
      previous: null,
      preWrite: { interestRate: 6.66, vacancyPct: 4 },
      postWrite: { interestRate: 6.5, vacancyPct: 4 },
      written: ["interestRate"],
      fields: ["interestRate", "vacancyPct"],
    });
    expect(snap).toEqual({
      before: { interestRate: 6.66, vacancyPct: 4 },
      after: { interestRate: 6.5, vacancyPct: 4 },
    });
  });

  it("never emits an `after` key without a matching `before` key", () => {
    const snap = planStrategySnapshot({
      previous: { before: { a: 1, b: 2 }, after: { a: 9, b: 2 } },
      preWrite: { a: 9, b: 77 },
      postWrite: { a: 5, b: 77 },
      written: ["a"],
      fields: ["a", "b"] as never,
    });
    // b diverged from the last play's `after` and this play didn't write
    // it → gone from BOTH halves, so planStrategyRevert can't blank it.
    expect(Object.keys(snap.after).sort()).toEqual(Object.keys(snap.before).sort());
    expect(snap.after).not.toHaveProperty("b");
    expect(snap.before).toEqual({ a: 1 });
  });

  it("compares numerically, so an input's string value is not mistaken for a user edit", () => {
    const snap = planStrategySnapshot({
      previous: { before: { interestRate: 6.66 }, after: { interestRate: 6.5 } },
      preWrite: { interestRate: "6.5" }, // same number, straight off the input
      postWrite: { interestRate: 7.5 },
      written: ["interestRate"],
      fields: ["interestRate"],
    });
    expect(snap.before.interestRate).toBe(6.66);
    expect(snap.after.interestRate).toBe(7.5);
  });
});
