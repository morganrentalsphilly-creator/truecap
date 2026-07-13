import { describe, expect, it } from "vitest";
import {
  parseStoredTriageBatch,
  serializeTriageBatch,
  type StoredTriageBatch,
} from "@/lib/batch-triage-storage";

const validResult: NonNullable<StoredTriageBatch["result"]> = {
  ok: true,
  rows: [
    {
      input: { address: "1700 W Erie Ave, Philadelphia, PA 19140", purchasePrice: 265000, monthlyRent: 2100, bedrooms: 3 },
      ok: true,
      score: 62,
      recommendation: "Buy",
      netCashFlowMonthly: 310,
      cocReturnPct: 7.2,
      capRatePct: 6.8,
      dscr: 1.31,
      isCashPurchase: false,
      buyBoxFit: null,
    },
  ] as NonNullable<StoredTriageBatch["result"]>["rows"],
  parseErrors: [],
  sort: "score",
  buyBoxActive: false,
  screenedCount: 1,
  truncated: false,
};

describe("parseStoredTriageBatch", () => {
  it("round-trips a serialized batch", () => {
    const batch: StoredTriageBatch = { text: "some pasted lines", result: validResult };
    expect(parseStoredTriageBatch(serializeTriageBatch(batch))).toEqual(batch);
  });

  it("round-trips a text-only batch (result null)", () => {
    const batch: StoredTriageBatch = { text: "half-typed paste", result: null };
    expect(parseStoredTriageBatch(serializeTriageBatch(batch))).toEqual(batch);
  });

  it("returns null for an absent key", () => {
    expect(parseStoredTriageBatch(null)).toBeNull();
    expect(parseStoredTriageBatch("")).toBeNull();
  });

  it("fails safe on malformed JSON", () => {
    expect(parseStoredTriageBatch("{not json")).toBeNull();
    expect(parseStoredTriageBatch('"just a string"')).toBeNull();
    expect(parseStoredTriageBatch("42")).toBeNull();
  });

  it("fails safe when text is missing or not a string", () => {
    expect(parseStoredTriageBatch(JSON.stringify({ result: null }))).toBeNull();
    expect(parseStoredTriageBatch(JSON.stringify({ text: 7, result: null }))).toBeNull();
  });

  it("fails safe when the result shape drifted", () => {
    const base = { text: "x", result: { ...validResult } };
    // ok:false payloads must never be restored as a screened batch.
    expect(
      parseStoredTriageBatch(JSON.stringify({ text: "x", result: { ok: false, code: "EMPTY", message: "" } }))
    ).toBeNull();
    // rows must be an array…
    expect(
      parseStoredTriageBatch(JSON.stringify({ ...base, result: { ...validResult, rows: "nope" } }))
    ).toBeNull();
    // …of objects that carry an input.address the table renders from.
    expect(
      parseStoredTriageBatch(JSON.stringify({ ...base, result: { ...validResult, rows: [{ ok: true }] } }))
    ).toBeNull();
    expect(
      parseStoredTriageBatch(
        JSON.stringify({ ...base, result: { ...validResult, rows: [{ input: { address: 5 } }] } })
      )
    ).toBeNull();
    // unknown sort keys would break the ranking toggle.
    expect(
      parseStoredTriageBatch(JSON.stringify({ ...base, result: { ...validResult, sort: "chaos" } }))
    ).toBeNull();
    // scalar bookkeeping fields must keep their types.
    expect(
      parseStoredTriageBatch(JSON.stringify({ ...base, result: { ...validResult, screenedCount: "1" } }))
    ).toBeNull();
    expect(
      parseStoredTriageBatch(JSON.stringify({ ...base, result: { ...validResult, parseErrors: null } }))
    ).toBeNull();
  });
});
