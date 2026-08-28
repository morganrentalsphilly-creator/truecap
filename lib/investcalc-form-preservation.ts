/**
 * Analyzer input preservation — pure planners for the two moments the
 * calculator swaps one income model for another.
 *
 * The rule both planners enforce: a control that changes the SHAPE of the
 * form (the Property Type radios, a "What's your play?" chip) may overwrite
 * ASSUMPTIONS — that's what a play is for — but it must never delete the
 * income and physical facts the user typed or that address auto-fill
 * produced. Those are the user's data, not the play's.
 *
 * 1. `planPropertyTypeSwitch` parks the outgoing type's rent roll +
 *    single-family facts in a per-type stash and restores whatever the
 *    incoming type had last time, so a Multi-Family → Owner Occupant →
 *    Multi-Family round trip returns every unit's rent, beds, baths and
 *    sq ft (TYPE-SWITCH-PRESERVES-INPUT).
 * 2. `planStrategyRevert` turns the strategy lens's "Clear" into a real
 *    undo: it puts back the pre-play value of every field the play wrote
 *    and the user has NOT edited since (STRATEGY-CLEAR-RESTORES).
 * 3. `planStrategySnapshot` maintains the bookkeeping planStrategyRevert
 *    reads, across a SEQUENCE of plays. Switching plays must not re-claim
 *    a field the user typed into between them — that's how an undo turns
 *    into data loss (STRATEGY-SWITCH-KEEPS-USER-EDITS).
 *
 * Pure: no React, no form library. Tested in
 * lib/__tests__/investcalc-form-preservation.test.ts.
 */

import {
  MAX_UNITS,
  getDefaultUnitsForPropertyType,
  type InvestmentFormValues,
  type UnitValues,
} from "@/lib/investcalc-schema";

type PropertyType = InvestmentFormValues["propertyType"];

/** The single-family-only scalars: the facts that have no unit row to live
 *  in while a multi-unit section is on screen. */
export type SingleFamilyFacts = {
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  monthlyRent?: number;
};

/** Per-property-type parking lot: what the form held the last time this
 *  type was on screen. Keyed by type so MF → OO → MF and SF → MF → SF both
 *  come back intact. */
export type PropertyTypeStash = Partial<
  Record<PropertyType, { units: UnitValues[]; singleFamily: SingleFamilyFacts }>
>;

export type PropertyTypeSwitchPlan = {
  /** The `units` array to write for the incoming type. */
  units: UnitValues[];
  /** The single-family scalars to write. Always empty for a multi-unit
   *  type — the values live in the stash until the user comes back, so a
   *  stale NaN from an unmounted input can't fail validation. */
  singleFamily: SingleFamilyFacts;
  /** The stash to keep, with the outgoing type's state parked in it. */
  stash: PropertyTypeStash;
};

const isMultiUnit = (type: PropertyType): boolean => type !== "single-family";

const EMPTY_UNIT: UnitValues = {
  bedrooms: undefined,
  bathrooms: undefined,
  sqft: undefined,
  monthlyRent: undefined,
  stabilizedMonthlyRent: undefined,
  isOwnerOccupied: false,
};

/** First unit the owner is NOT living in — the slot a single "Monthly rent"
 *  maps onto. Falls back to 0 for an all-owner (invalid) array. */
function firstRentalIndex(units: ReadonlyArray<UnitValues | undefined>): number {
  const index = units.findIndex((unit) => !unit?.isOwnerOccupied);
  return index >= 0 ? index : 0;
}

/** Carried value wins wherever it exists (`??`, so a typed 0 survives); the
 *  incoming type's default fills the gaps — that's what keeps the
 *  house-hack seeds (2 bed / 1 bath / 900 sq ft) from being replaced by a
 *  wall of empty rows. */
function mergeUnit(carried: UnitValues | undefined, fallback: UnitValues | undefined): UnitValues {
  const base = fallback ?? EMPTY_UNIT;
  return {
    bedrooms: carried?.bedrooms ?? base.bedrooms,
    bathrooms: carried?.bathrooms ?? base.bathrooms,
    sqft: carried?.sqft ?? base.sqft,
    monthlyRent: carried?.monthlyRent ?? base.monthlyRent,
    stabilizedMonthlyRent:
      carried?.stabilizedMonthlyRent ?? base.stabilizedMonthlyRent,
    isOwnerOccupied: carried?.isOwnerOccupied ?? base.isOwnerOccupied ?? false,
  };
}

/**
 * Make an owner-occupancy layout legal for the incoming type: exactly one
 * owner unit for a house hack (keeping the user's pick when there is one),
 * none for a plain rental. A unit that was the owner unit carries the
 * seeded rent of 0 — that 0 means "I live here", not a rent the user typed,
 * so it goes back to empty rather than failing "Rent must be greater than 0".
 */
export function alignUnitsToPropertyType(
  units: ReadonlyArray<UnitValues>,
  propertyType: PropertyType
): UnitValues[] {
  if (propertyType === "owner-occupant") {
    const picked = units.findIndex((unit) => unit?.isOwnerOccupied);
    const ownerIndex = picked >= 0 ? picked : 0;
    return units.map((unit, index) => ({ ...unit, isOwnerOccupied: index === ownerIndex }));
  }
  return units.map((unit) =>
    unit?.isOwnerOccupied && unit.monthlyRent === 0
      ? { ...unit, isOwnerOccupied: false, monthlyRent: undefined }
      : { ...unit, isOwnerOccupied: false }
  );
}

function buildUnits(
  prevType: PropertyType,
  nextType: PropertyType,
  currentUnits: ReadonlyArray<UnitValues>,
  currentSingleFamily: SingleFamilyFacts,
  stashedUnits: ReadonlyArray<UnitValues> | undefined
): UnitValues[] {
  const defaults = getDefaultUnitsForPropertyType(nextType);
  // Single-family reads the scalars, never the roll — keep its one-row
  // placeholder exactly as before. The multi-unit roll waits in the stash.
  if (!isMultiUnit(nextType)) return defaults;

  // Multi-unit → multi-unit (MF ↔ OO) is the SAME rent roll under a
  // different label, so the live array wins over anything stashed: it
  // carries every edit the user made since. Coming from single-family
  // there is no live roll, so the stash is the source.
  const source = isMultiUnit(prevType) ? currentUnits : (stashedUnits ?? []);
  const length = Math.min(Math.max(defaults.length, source.length), MAX_UNITS);
  const merged = Array.from({ length }, (_, index) => mergeUnit(source[index], defaults[index]));
  const aligned = alignUnitsToPropertyType(merged, nextType);

  // Single-family → multi-unit: the one rent the user typed belongs to the
  // first unit they'll actually rent out (unit 2 of a house hack — they
  // live in unit 1). Only into an EMPTY slot: a restored rent roll is
  // per-unit data, and overwriting one of its rents with a single-family
  // scalar would trade one kind of loss for another.
  if (!isMultiUnit(prevType) && currentSingleFamily.monthlyRent != null) {
    const index = firstRentalIndex(aligned);
    if (aligned[index]?.monthlyRent == null) {
      aligned[index] = { ...aligned[index], monthlyRent: currentSingleFamily.monthlyRent };
    }
  }
  return aligned;
}

function buildSingleFamilyFacts(
  nextType: PropertyType,
  currentUnits: ReadonlyArray<UnitValues>,
  stashed: SingleFamilyFacts | undefined
): SingleFamilyFacts {
  // Multi-unit sections own the income: the scalars must land as undefined
  // so a stale value from an unmounted input can't fail validation.
  if (isMultiUnit(nextType)) return {};
  const facts: SingleFamilyFacts = { ...(stashed ?? {}) };
  // …and the reverse carry: the first rental unit's rent is the closest
  // thing this deal has to a single monthly rent, and it's the number the
  // user last had on screen, so it wins over the stashed one.
  const carriedRent = currentUnits.find(
    (unit) => !unit?.isOwnerOccupied && unit?.monthlyRent != null
  )?.monthlyRent;
  if (carriedRent != null) facts.monthlyRent = carriedRent;
  return facts;
}

/**
 * Plan a Property Type transition. Never returns a plan that drops a rent,
 * bedroom count, bathroom count or sq ft the user could still get back:
 * everything the outgoing type held is parked in the returned stash first.
 */
export function planPropertyTypeSwitch(input: {
  prevType: PropertyType;
  nextType: PropertyType;
  units: ReadonlyArray<UnitValues> | undefined;
  singleFamily: SingleFamilyFacts;
  stash: PropertyTypeStash;
}): PropertyTypeSwitchPlan {
  const currentUnits = input.units ?? [];
  const restored = input.stash[input.nextType];
  return {
    units: buildUnits(
      input.prevType,
      input.nextType,
      currentUnits,
      input.singleFamily,
      restored?.units
    ),
    singleFamily: buildSingleFamilyFacts(input.nextType, currentUnits, restored?.singleFamily),
    stash: {
      ...input.stash,
      [input.prevType]: {
        units: currentUnits.map((unit) => ({ ...unit })),
        singleFamily: { ...input.singleFamily },
      },
    },
  };
}

/**
 * Every field a "What's your play?" pick can overwrite: the property type
 * (which is what relocates the income), the template link the starter set
 * unhitches, the monthly rent an STR play drops, and the full starter
 * assumption set applyStarterAssumptions writes.
 *
 * The STR income fields (avgDailyRate / occupancyPct / strFurnishingCost)
 * are deliberately NOT here: Clear already wipes them unconditionally so a
 * derived ADR×occupancy income can't leak into the monthly-rent flow, and
 * that safety rule outranks restoring a pre-play nightly rate.
 */
export const STRATEGY_REVERTABLE_FIELDS: ReadonlyArray<keyof InvestmentFormValues> = [
  "propertyType",
  "templateId",
  "monthlyRent",
  "propertyTaxPct",
  "insuranceInputMode",
  "insurancePct",
  "insuranceMonthly",
  "maintenancePct",
  "vacancyPct",
  "mgmtPct",
  "capexPct",
  "closingCostsPct",
  "interestRate",
  "downPaymentPct",
  "pmiAnnualRatePct",
  "pmiNoCancel",
  "expenseGrowthPct",
  "rentGrowthPct",
  "appreciationRatePct",
  "sellingCostPct",
  "buildingValuePct",
  "depreciationYears",
  "includeInterestDeduction",
  "taxRatePct",
];

export type StrategyRevertSnapshot = {
  /** Field → value as the form stood BEFORE the first play was applied. */
  before: Record<string, unknown>;
  /** Field → value the play LEFT in the form, captured right after it was
   *  applied. A current value that no longer matches this is a user edit. */
  after: Record<string, unknown>;
};

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : v == null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Same numeric-tolerant compare computeStrategyOwnedFields uses to decide
 *  whether a field is still the play's ("6.5" from an input === 6.5). */
function sameValue(a: unknown, b: unknown): boolean {
  const x = num(a);
  const y = num(b);
  if (x != null && y != null) return Math.abs(x - y) < 1e-9;
  return a === b;
}

/**
 * Plan the writes that make "Clear" on the strategy lens mean it: put back
 * the pre-play value of every field the play wrote.
 *
 * Two fields are skipped, both on purpose:
 * - one the user edited since (current value diverged from what the play
 *   left) — that number is theirs now, an undo must not take it;
 * - one already sitting at its pre-play value — nothing to undo.
 */
export function planStrategyRevert(
  snapshot: StrategyRevertSnapshot | null | undefined,
  current: Record<string, unknown>
): Array<{ field: keyof InvestmentFormValues; value: unknown }> {
  if (!snapshot) return [];
  const plan: Array<{ field: keyof InvestmentFormValues; value: unknown }> = [];
  for (const [field, appliedValue] of Object.entries(snapshot.after)) {
    const currentValue = current[field];
    if (!sameValue(currentValue, appliedValue)) continue;
    const beforeValue = snapshot.before[field];
    if (sameValue(currentValue, beforeValue)) continue;
    plan.push({ field: field as keyof InvestmentFormValues, value: beforeValue });
  }
  return plan;
}

/**
 * Roll the revert bookkeeping forward for ONE application of a play.
 *
 * The trap this exists to close: re-capturing the whole `after` snapshot on
 * every play makes the NEXT Clear believe the play owns fields it never
 * wrote. Type a rent between two plays and the second play adopts it into
 * `after`; Clear then reads "still the play's" and reverts the user's number
 * to the pre-lens one. That is silent data loss wearing an undo's clothes.
 *
 * So each field lands in exactly one of three buckets, decided by comparing
 * the form as it stood at the TOP of this invocation (`preWrite`) against
 * what the previous play left (`previous.after`):
 *
 * - **User edit this play did NOT overwrite** → dropped from the snapshot
 *   entirely. Clear must never touch it again; it isn't the lens's value.
 * - **User edit this play DID overwrite** → `before` becomes the USER's
 *   value, not the pre-lens one, so Clear hands back what they typed.
 * - **Untouched by the user** → `before` stays the original pre-lens value
 *   (one lens entry, one undo point) and `after` only refreshes for the
 *   fields this invocation actually wrote; everything else carries the
 *   previous play's `after` forward unchanged.
 *
 * The first application (`previous == null`) is a straight
 * before/after capture — nothing has been claimed yet.
 *
 * `before` and `after` always carry the same key set, so
 * planStrategyRevert can never read a missing `before` as `undefined` and
 * blank a field.
 */
export function planStrategySnapshot(input: {
  /** The snapshot the previous play left, or null on the first play. */
  previous: StrategyRevertSnapshot | null | undefined;
  /** Field → value BEFORE any of this invocation's writes. */
  preWrite: Record<string, unknown>;
  /** Field → value once this invocation's writes have landed. */
  postWrite: Record<string, unknown>;
  /** The fields this invocation actually wrote (starter set + the ones the
   *  handler sets directly). Anything outside it is not the play's. */
  written: Iterable<string>;
  /** Override for tests; defaults to STRATEGY_REVERTABLE_FIELDS. */
  fields?: ReadonlyArray<keyof InvestmentFormValues>;
}): StrategyRevertSnapshot {
  const fields = input.fields ?? STRATEGY_REVERTABLE_FIELDS;
  const written = new Set<string>(input.written);
  const previous = input.previous;
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  for (const key of fields) {
    const field = key as string;
    if (!previous) {
      before[field] = input.preWrite[field];
      after[field] = input.postWrite[field];
      continue;
    }
    // Diverged from what the last play left → the user (or address
    // enrichment) put that value there between the two chips.
    if (!sameValue(input.preWrite[field], previous.after[field])) {
      if (!written.has(field)) continue; // theirs, untouched — leave it alone forever
      before[field] = input.preWrite[field]; // undo owes them THEIR value back
      after[field] = input.postWrite[field];
      continue;
    }
    before[field] = previous.before[field];
    after[field] = written.has(field) ? input.postWrite[field] : previous.after[field];
  }
  return { before, after };
}
