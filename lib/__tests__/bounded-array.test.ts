import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { boundedArray } from "@/lib/bounded-array";
import { investmentFormSchema, MAX_UNITS } from "@/lib/investcalc-schema";
import { dealQaBuyBoxContextSchema, dealQaCompsContextSchema } from "@/lib/deal-qa-context";
import { reportDataSchema } from "@/lib/report-payload-schema";
import { clientDealScreenSchema } from "@/lib/client-deal-match-schema";

function unreadableArray(length: number): unknown[] {
  const values = new Array(length).fill(null);
  Object.defineProperty(values, 0, {
    get() { throw new Error("Oversized array elements must not be read"); },
  });
  return values;
}

describe("boundedArray on Zod 3", () => {
  it("stops before any element parser or later refinement runs", () => {
    const element = vi.fn((value: unknown) => value);
    const later = vi.fn(() => true);
    const schema = boundedArray(z.array(z.preprocess(element, z.string())), 2)
      .refine(later);
    const parsed = schema.safeParse([0, 0, 0]);
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("Expected rejection");
    expect(parsed.error.issues).toEqual([{
      code: "too_big", maximum: 2, type: "array", inclusive: true,
      exact: false, fatal: true, path: [],
      message: "Array must contain at most 2 element(s)",
    }]);
    expect(element).not.toHaveBeenCalled();
    expect(later).not.toHaveBeenCalled();
  });

  it("also rejects before reading elements through safeParseAsync", async () => {
    const schema = boundedArray(z.array(z.string()), 2);
    const parsed = await schema.safeParseAsync(unreadableArray(3));
    expect(parsed.success).toBe(false);
  });

  it("preserves input/output types, transforms, and acceptance at the limit", () => {
    const schema = boundedArray(z.array(z.string().trim().transform(Number)).min(1), 2);
    expectTypeOf<z.input<typeof schema>>().toEqualTypeOf<string[]>();
    expectTypeOf<z.output<typeof schema>>().toEqualTypeOf<number[]>();
    expect(schema.parse([" 1 ", "2"])).toEqual([1, 2]);
  });

  it.each([undefined, null, {}, [], [1], ["too long"]])(
    "preserves ordinary validation errors for %j", (value) => {
      const array = z.array(z.string().max(3)).min(1);
      const before = array.max(2).safeParse(value);
      const after = boundedArray(array, 2).safeParse(value);
      expect(after.success).toBe(before.success);
      if (!before.success && !after.success) expect(after.error.issues).toEqual(before.error.issues);
    },
  );

  it("preserves nested paths, custom messages, optional/default/catch behavior", () => {
    const array = boundedArray(z.array(z.string()), 2, "Only two values");
    const schema = z.object({ values: array });
    const parsed = schema.safeParse({ values: unreadableArray(3) });
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("Expected rejection");
    expect(parsed.error.issues[0]).toMatchObject({ path: ["values"], message: "Only two values" });
    expect(array.optional().parse(undefined)).toBeUndefined();
    expect(array.default([]).parse(undefined)).toEqual([]);
    expect(array.optional().catch(undefined).parse(unreadableArray(3))).toBeUndefined();
  });
});

const confidence = reportDataSchema.shape.inputConfidence.unwrap().unwrap();
const comps = reportDataSchema.shape.comps.unwrap().unwrap();
const operating = reportDataSchema.shape.operatingStatement.unwrap().unwrap();

describe("public payload array boundaries", () => {
  it.each([
    ["underwriting units", investmentFormSchema.innerType().shape.units, MAX_UNITS],
    ["Q&A checks", dealQaBuyBoxContextSchema.shape.checks, 10],
    ["Q&A sale comps", dealQaCompsContextSchema.shape.saleComps, 8],
    ["Q&A rent comps", dealQaCompsContextSchema.shape.rentComps, 8],
    ["report units", reportDataSchema.shape.units, 60],
    ["report verified assumptions", confidence.shape.verifiedAssumptions, 60],
    ["report unverified assumptions", confidence.shape.unverifiedAssumptions, 60],
    ["report operating expenses", operating.shape.operatingExpenses, 20],
    ["report projections", reportDataSchema.shape.projection10y.shape.rows, 120],
    ["report tax rows", reportDataSchema.shape.taxStrategy.shape.rows, 120],
    ["report exit rows", reportDataSchema.shape.exitScenarios.shape.rows, 120],
    ["report sale comps", comps.shape.saleComps, 50],
    ["report rent comps", comps.shape.rentComps, 50],
    ["client report checks", clientDealScreenSchema.shape.checks, 20],
  ] as const)("rejects oversized %s without touching an element", (_name, schema, maximum) => {
    const parsed = schema.safeParse(unreadableArray(maximum + 1));
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("Expected rejection");
    expect(parsed.error.issues).toHaveLength(1);
    expect(parsed.error.issues[0]).toMatchObject({ code: "too_big", maximum, type: "array" });
  });
});
