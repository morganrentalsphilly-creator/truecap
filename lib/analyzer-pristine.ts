/**
 * "Has the visitor actually changed anything?" for the analyzer form.
 *
 * React Hook Form's `isDirty` answers a different question: whether the
 * current values deep-equal the default values. A number input registered
 * with `valueAsNumber` reports NaN the first time it is blurred while empty,
 * and NaN is not the `undefined` it started as, so tabbing through an empty
 * form made it "dirty". The analyzer keyed its empty state off that flag: the
 * same blank form showed "Try a sample deal" on one visit and "Add address to
 * run full analysis" on the next, and asked for confirmation before clearing
 * work that did not exist (2026-11 audit, A9 and C5).
 *
 * These helpers compare what the fields hold, with every flavour of "empty"
 * (undefined, null, "", NaN) treated as the same value.
 */

type Plain = Record<string, unknown>;

function isPlainObject(value: unknown): value is Plain {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** One representation for every empty value; trimmed strings; plain numbers. */
function normalize(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isNaN(value) ? undefined : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return value;
}

function sameValue(a: unknown, b: unknown): boolean {
  const left = normalize(a);
  const right = normalize(b);
  if (Array.isArray(left) || Array.isArray(right)) {
    const l = Array.isArray(left) ? left : [];
    const r = Array.isArray(right) ? right : [];
    const length = Math.max(l.length, r.length);
    for (let i = 0; i < length; i++) {
      if (!sameValue(l[i], r[i])) return false;
    }
    return true;
  }
  if (isPlainObject(left) || isPlainObject(right)) {
    const l = isPlainObject(left) ? left : {};
    const r = isPlainObject(right) ? right : {};
    for (const key of new Set([...Object.keys(l), ...Object.keys(r)])) {
      if (!sameValue(l[key], r[key])) return false;
    }
    return true;
  }
  return left === right;
}

/**
 * True when at least one field React Hook Form marks dirty holds a value
 * that differs from the form's starting value. Programmatic fills (a default
 * template, an address lookup) are written non-dirty and so never count; a
 * dirty flag on a field that is back at, or never left, its starting value
 * does not count either.
 */
export function hasEditedStartingValue(
  dirtyFields: unknown,
  values: unknown,
  startingValues: unknown,
): boolean {
  if (dirtyFields === true) return !sameValue(values, startingValues);
  if (Array.isArray(dirtyFields)) {
    const v = Array.isArray(values) ? values : [];
    const s = Array.isArray(startingValues) ? startingValues : [];
    return dirtyFields.some((entry, index) =>
      hasEditedStartingValue(entry, v[index], s[index]),
    );
  }
  if (isPlainObject(dirtyFields)) {
    const v = isPlainObject(values) ? values : {};
    const s = isPlainObject(startingValues) ? startingValues : {};
    return Object.keys(dirtyFields).some((key) =>
      hasEditedStartingValue(dirtyFields[key], v[key], s[key]),
    );
  }
  return false;
}

/**
 * True when every value the fixture defines is still in the form unchanged:
 * the sample deal exactly as it was loaded. Fields the fixture does not
 * define are ignored (they hold the form's own defaults).
 */
export function matchesFixtureValues(
  values: unknown,
  fixtureValues: Record<string, unknown>,
): boolean {
  const v = isPlainObject(values) ? values : {};
  return Object.keys(fixtureValues).every((key) =>
    sameValue(v[key], fixtureValues[key]),
  );
}
