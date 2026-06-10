/**
 * Small Area FMR (SAFMR) helpers — pure functions, unit-tested in
 * lib/__tests__/hud-safmr.test.ts.
 *
 * Context: HUD's /fmr/data/{entityid} endpoint returns ZIP-code-level
 * rents for metros designated as Small Area FMR regions
 * (smallarea_status === "1"). For those, `data.basicdata` is an ARRAY
 * of rows like:
 *
 *   { "zip_code": "19140", "Efficiency": 1010, "One-Bedroom": 1130,
 *     "Two-Bedroom": 1360, "Three-Bedroom": 1660, "Four-Bedroom": 1850 }
 *
 * plus one synthetic row with zip_code "MSA level" carrying the
 * metro-wide figure. For non-SAFMR entities, basicdata is a single
 * object (no zip_code) — these helpers return null for that shape and
 * the caller falls back to the county-level figure it already has.
 *
 * Why this matters: county/metro FMR can be 30-40%+ off for a specific
 * ZIP (Philadelphia county vs 19140 is a big spread). ZIP-level rent is
 * the single largest accuracy upgrade available for the auto-fill, and
 * it's free on the same HUD API key.
 */

export type SafmrZipRow = { zip_code?: unknown } & Record<string, unknown>;

/**
 * Find the rent for `zip` + `fmrField` (e.g. "Three-Bedroom") in a
 * SAFMR basicdata array. Returns null when:
 *  - rows isn't an array (non-SAFMR entity / unexpected shape)
 *  - the ZIP isn't listed
 *  - the value is missing, non-numeric, or <= 0
 *
 * Deliberately ignores the "MSA level" row — if the specific ZIP isn't
 * present, the caller's existing county/metro figure is the better
 * fallback (it's the same number HUD would put in that row anyway).
 */
export function pickZipSafmrRent(
  rows: unknown,
  zip: string,
  fmrField: string
): number | null {
  if (!Array.isArray(rows)) return null;
  const target = zip.trim();
  if (!/^\d{5}$/.test(target)) return null;

  const row = (rows as SafmrZipRow[]).find(
    (r) =>
      r &&
      typeof r === "object" &&
      typeof r.zip_code === "string" &&
      r.zip_code.trim() === target
  );
  if (!row) return null;

  const raw = row[fmrField];
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

/**
 * True when a statedata county/metro record is flagged as a Small Area
 * FMR entity. HUD is inconsistent about the type — the docs show both
 * `"smallarea_status": "1"` (string) and `"smallarea_status": 0`
 * (number) — so compare loosely via String().
 */
export function isSmallAreaEntity(record: { smallarea_status?: unknown }): boolean {
  return String(record.smallarea_status ?? "0") === "1";
}
