import { describe, expect, it } from "vitest";

import { checkCompRange } from "../comp-range-check";

describe("checkCompRange", () => {
  const range = { low: 1500, high: 1850 };

  it("classifies a value inside the range as within", () => {
    expect(checkCompRange(1700, range).status).toBe("within");
    expect(checkCompRange(1700, range).pctOutside).toBe(0);
  });

  it("classifies above the high bound with a % magnitude", () => {
    const r = checkCompRange(2035, range); // 10% above 1850
    expect(r.status).toBe("above");
    expect(r.pctOutside).toBe(10);
  });

  it("classifies below the low bound with a % magnitude", () => {
    const r = checkCompRange(1350, range); // 10% below 1500
    expect(r.status).toBe("below");
    expect(r.pctOutside).toBe(10);
  });

  it("treats the boundary values as within", () => {
    expect(checkCompRange(1500, range).status).toBe("within");
    expect(checkCompRange(1850, range).status).toBe("within");
  });

  it("returns unknown when the value or range is missing", () => {
    expect(checkCompRange(null, range).status).toBe("unknown");
    expect(checkCompRange(1700, null).status).toBe("unknown");
    expect(checkCompRange(1700, { low: null, high: null }).status).toBe("unknown");
    expect(checkCompRange(Number.NaN, range).status).toBe("unknown");
  });

  it("handles a one-sided range (only a high bound)", () => {
    expect(checkCompRange(2000, { low: null, high: 1850 }).status).toBe("above");
    expect(checkCompRange(1000, { low: null, high: 1850 }).status).toBe("within");
  });
});
