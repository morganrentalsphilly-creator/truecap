import { describe, expect, it } from "vitest";
import {
  DEAL_LABEL_MAX_LENGTH,
  normalizeDealLabelsPatch,
} from "../deal-labels";

describe("deal label mutation payload", () => {
  it("normalizes only explicitly supplied optional labels", () => {
    expect(
      normalizeDealLabelsPatch({
        nickname: "  The blue duplex  ",
        market: "   ",
      }),
    ).toEqual({
      ok: true,
      patch: { nickname: "The blue duplex", market: null },
    });
  });

  it("retains the existing server-side length cap", () => {
    const result = normalizeDealLabelsPatch({
      neighborhood: "x".repeat(DEAL_LABEL_MAX_LENGTH + 10),
    });
    expect(result).toEqual({
      ok: true,
      patch: { neighborhood: "x".repeat(DEAL_LABEL_MAX_LENGTH) },
    });
  });

  it.each([
    null,
    [],
    { nickname: 123 },
    { market: undefined },
    { nickname: "valid", user_id: "foreign" },
  ])("rejects malformed or over-broad runtime input: %j", (input) => {
    expect(normalizeDealLabelsPatch(input)).toEqual({ ok: false });
  });
});
