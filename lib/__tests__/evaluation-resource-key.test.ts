import { describe, expect, it } from "vitest";
import {
  buildEvaluationComparisonResourceKey,
  buildEvaluationDealResourceKey,
  buildEvaluationResourceKey,
} from "@/lib/evaluation-resource-key";
import { UNDERWRITING_V1_GOLDEN_CORPUS } from "@/lib/__tests__/fixtures/underwriting-v1-golden-corpus";

describe("evaluation resource keys", () => {
  it("is deterministic and accepted by the database resource-key contract", () => {
    const first = buildEvaluationResourceKey("deal", '{"price":250000,"rent":2400}');
    const second = buildEvaluationResourceKey("deal", '{"price":250000,"rent":2400}');
    expect(first).toBe(second);
    expect(first).toMatch(/^deal:[a-f0-9]{64}$/);
  });

  it("binds a deal key to the released normalized form snapshot", () => {
    const values = UNDERWRITING_V1_GOLDEN_CORPUS[0]!.values;
    const key = buildEvaluationDealResourceKey(values);
    expect(key).toMatch(/^deal:[a-f0-9]{64}$/);
    expect(
      buildEvaluationDealResourceKey({ ...values, purchasePrice: values.purchasePrice + 500 }),
    ).not.toBe(key);
  });

  it("separates usage kinds and payloads", () => {
    const payload = '{"ids":["a","b"]}';
    expect(buildEvaluationResourceKey("deal", payload)).not.toBe(
      buildEvaluationResourceKey("comparison", payload)
    );
    expect(buildEvaluationResourceKey("deal", payload)).not.toBe(
      buildEvaluationResourceKey("deal", `${payload}x`)
    );
  });

  it("canonicalizes a comparison set without copying deal IDs into the ledger key", () => {
    const dealA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const dealB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const key = buildEvaluationComparisonResourceKey([dealB, dealA]);
    expect(key).toBe(
      buildEvaluationComparisonResourceKey([dealA, dealB, dealA]),
    );
    expect(key).toMatch(/^comparison:[a-f0-9]{64}$/);
    expect(key).not.toContain(dealA);
    expect(buildEvaluationComparisonResourceKey([dealA])).toBeNull();
  });
});
