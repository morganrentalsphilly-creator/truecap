/**
 * Effective property tax rates by state, as a percent of owner-occupied
 * home value. Source: Tax Foundation 2023 published data — directionally
 * accurate; effective rate at the parcel level varies by county, school
 * district, and assessment ratio.
 *
 * Used to pre-fill the Property Tax % field on a fresh analysis. Always
 * editable by the user.
 */

export const STATE_EFFECTIVE_PROPERTY_TAX_PCT: Record<string, number> = {
  AL: 0.41,
  AK: 1.04,
  AZ: 0.62,
  AR: 0.64,
  CA: 0.71,
  CO: 0.55,
  CT: 1.79,
  DE: 0.61,
  DC: 0.62,
  FL: 0.89,
  GA: 0.92,
  HI: 0.32,
  ID: 0.67,
  IL: 2.08,
  IN: 0.84,
  IA: 1.52,
  KS: 1.34,
  KY: 0.83,
  LA: 0.56,
  ME: 1.24,
  MD: 1.05,
  MA: 1.14,
  MI: 1.38,
  MN: 1.11,
  MS: 0.75,
  MO: 0.98,
  MT: 0.74,
  NE: 1.63,
  NV: 0.59,
  NH: 1.93,
  NJ: 2.23,
  NM: 0.67,
  NY: 1.40,
  NC: 0.82,
  ND: 0.98,
  OH: 1.59,
  OK: 0.89,
  OR: 0.93,
  PA: 1.49,
  RI: 1.40,
  SC: 0.57,
  SD: 1.17,
  TN: 0.67,
  TX: 1.68,
  UT: 0.57,
  VT: 1.83,
  VA: 0.82,
  WA: 0.87,
  WV: 0.55,
  WI: 1.61,
  WY: 0.58,
};

export function getStatePropertyTaxPct(stateCode: string): number | undefined {
  if (!stateCode) return undefined;
  return STATE_EFFECTIVE_PROPERTY_TAX_PCT[stateCode.toUpperCase()];
}
